-- Batch 6: Reservation lifecycle
-- Enforces reservation creation, cancellation, FIFO fulfillment,
-- duplicate-pending protection, and trusted write boundaries.

-- =========================================================
-- 1. Ensure reservations.book_id has a foreign key
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reservations_book_id_fkey'
      AND conrelid = 'public.reservations'::regclass
  ) THEN
    ALTER TABLE public.reservations
    ADD CONSTRAINT reservations_book_id_fkey
    FOREIGN KEY (book_id)
    REFERENCES public.books(id)
    ON DELETE RESTRICT;
  END IF;
END;
$$;


-- =========================================================
-- 2. Prevent duplicate pending reservations safely
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS
  reservations_one_pending_per_reader_book
ON public.reservations (reader_id, book_id)
WHERE status = 'pending';


-- Index used for FIFO queue lookup
CREATE INDEX IF NOT EXISTS
  idx_reservations_pending_fifo
ON public.reservations (book_id, created_at, id)
WHERE status = 'pending';


-- =========================================================
-- 3. Trusted reservation creation
-- =========================================================

CREATE OR REPLACE FUNCTION public.create_reservation(
  p_book_id uuid,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_role text;
  v_available integer;
  v_reservation_id uuid;
  v_today date;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Bạn phải đăng nhập để đặt trước sách.';
  END IF;

  SELECT role
  INTO v_role
  FROM public.profiles
  WHERE id = v_user_id;

  IF NOT FOUND OR v_role IS DISTINCT FROM 'reader' THEN
    RAISE EXCEPTION 'Chỉ độc giả mới có thể đặt trước sách.';
  END IF;

  -- Lock the book so availability cannot change during validation.
  SELECT available
  INTO v_available
  FROM public.books
  WHERE id = p_book_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy sách.';
  END IF;

  -- Reservation is allowed only when no copy is currently available.
  IF COALESCE(v_available, 0) > 0 THEN
    RAISE EXCEPTION
      'Sách hiện vẫn còn bản khả dụng nên không thể đặt trước.';
  END IF;

  -- Friendly pre-check. The unique partial index below is still
  -- the final concurrency-safe protection.
  IF EXISTS (
    SELECT 1
    FROM public.reservations
    WHERE reader_id = v_user_id
      AND book_id = p_book_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION
      'Bạn đã có một yêu cầu đặt trước đang chờ cho sách này.';
  END IF;

  v_today :=
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;

  INSERT INTO public.reservations (
    book_id,
    reader_id,
    reserved_date,
    status,
    note
  )
  VALUES (
    p_book_id,
    v_user_id,
    v_today,
    'pending',
    NULLIF(BTRIM(p_note), '')
  )
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION
      'Bạn đã có một yêu cầu đặt trước đang chờ cho sách này.';
END;
$function$;


-- =========================================================
-- 4. Trusted reservation cancellation
-- =========================================================

CREATE OR REPLACE FUNCTION public.cancel_reservation(
  p_reservation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reader_id uuid;
  v_status text;
BEGIN
  SELECT reader_id, status
  INTO v_reader_id, v_status
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy yêu cầu đặt trước.';
  END IF;

  -- Owner or library staff may cancel.
  IF v_reader_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_staff() THEN
    RAISE EXCEPTION
      'Bạn không có quyền hủy yêu cầu đặt trước này.';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION
      'Chỉ yêu cầu đang chờ mới có thể hủy.';
  END IF;

  UPDATE public.reservations
  SET status = 'cancelled'
  WHERE id = p_reservation_id;

  RETURN true;
END;
$function$;


-- =========================================================
-- 5. Trusted FIFO fulfillment + loan creation
-- =========================================================

CREATE OR REPLACE FUNCTION public.fulfill_reservation(
  p_reservation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_book_id uuid;
  v_reader_id uuid;
  v_status text;
  v_available integer;
  v_first_pending_id uuid;
  v_today date;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION
      'Chỉ nhân viên thư viện mới có quyền xử lý đặt trước.';
  END IF;

  -- Read the book id first so all fulfillment operations
  -- lock resources in a consistent order.
  SELECT book_id
  INTO v_book_id
  FROM public.reservations
  WHERE id = p_reservation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy yêu cầu đặt trước.';
  END IF;

  -- Serialize fulfillment and inventory changes for this book.
  SELECT available
  INTO v_available
  FROM public.books
  WHERE id = v_book_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy sách.';
  END IF;

  -- Lock and re-read the target reservation.
  SELECT reader_id, status
  INTO v_reader_id, v_status
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy yêu cầu đặt trước.';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION
      'Chỉ yêu cầu đang chờ mới có thể được xử lý.';
  END IF;

  -- Enforce FIFO for this book.
  SELECT id
  INTO v_first_pending_id
  FROM public.reservations
  WHERE book_id = v_book_id
    AND status = 'pending'
  ORDER BY created_at ASC, id ASC
  LIMIT 1
  FOR UPDATE;

  IF v_first_pending_id IS DISTINCT FROM p_reservation_id THEN
    RAISE EXCEPTION
      'Yêu cầu này chưa đến lượt trong hàng đợi đặt trước.';
  END IF;

  -- A copy must have become available before fulfillment.
  IF COALESCE(v_available, 0) <= 0 THEN
    RAISE EXCEPTION
      'Sách chưa có bản khả dụng để xử lý đặt trước.';
  END IF;

  v_today :=
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;

  -- Reuse the trusted borrowing operation.
  -- borrow_book derives the real due date from settings,
  -- validates the reader/card, locks inventory, creates the loan,
  -- and decrements available copies transactionally.
  PERFORM public.borrow_book(
    v_book_id,
    v_reader_id,
    v_today,
    NULL
  );

  UPDATE public.reservations
  SET status = 'fulfilled'
  WHERE id = p_reservation_id;

  RETURN true;
END;
$function$;


-- =========================================================
-- 6. Remove direct reservation write paths
-- =========================================================

DROP POLICY IF EXISTS insert_reservations
ON public.reservations;

DROP POLICY IF EXISTS staff_update_reservations
ON public.reservations;

DROP POLICY IF EXISTS staff_delete_reservations
ON public.reservations;

-- Keep the existing SELECT policy:
-- Reader sees own reservations, staff sees all.

REVOKE INSERT, UPDATE, DELETE
ON TABLE public.reservations
FROM anon, authenticated;

GRANT SELECT
ON TABLE public.reservations
TO authenticated;


-- =========================================================
-- 7. Restrict RPC execution
-- =========================================================

REVOKE ALL
ON FUNCTION public.create_reservation(uuid, text)
FROM PUBLIC, anon;

REVOKE ALL
ON FUNCTION public.cancel_reservation(uuid)
FROM PUBLIC, anon;

REVOKE ALL
ON FUNCTION public.fulfill_reservation(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.create_reservation(uuid, text)
TO authenticated, service_role;

GRANT EXECUTE
ON FUNCTION public.cancel_reservation(uuid)
TO authenticated, service_role;

GRANT EXECUTE
ON FUNCTION public.fulfill_reservation(uuid)
TO authenticated, service_role;