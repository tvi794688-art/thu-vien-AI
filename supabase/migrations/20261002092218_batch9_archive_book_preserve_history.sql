-- Batch 9
-- Preserve circulation history when "removing" a book.
-- Removal means archive, not physical DELETE.

-- =========================================================
-- 1. Protect loan history from cascading deletion
-- =========================================================

ALTER TABLE public.loans
DROP CONSTRAINT IF EXISTS loans_book_id_fkey;

ALTER TABLE public.loans
ADD CONSTRAINT loans_book_id_fkey
FOREIGN KEY (book_id)
REFERENCES public.books(id)
ON DELETE RESTRICT;


-- =========================================================
-- 2. Tighten direct books writes
-- =========================================================

DROP POLICY IF EXISTS
  "Allow all actions for authenticated on books"
ON public.books;

-- Public/Reader can continue reading books.
-- Existing "Allow public read books" policy is kept.

DROP POLICY IF EXISTS
  "staff_insert_books"
ON public.books;

CREATE POLICY "staff_insert_books"
ON public.books
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff());


DROP POLICY IF EXISTS
  "staff_update_books"
ON public.books;

CREATE POLICY "staff_update_books"
ON public.books
FOR UPDATE
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());


-- Do not create a DELETE policy.
-- Physical deletion must not be available through the app.

REVOKE DELETE
ON TABLE public.books
FROM anon, authenticated;


-- =========================================================
-- 3. Controlled archive RPC
-- =========================================================

CREATE OR REPLACE FUNCTION public.remove_book(
  p_book_id uuid
)
RETURNS public.books
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_book public.books%ROWTYPE;
  v_result public.books%ROWTYPE;
BEGIN
  -- Only Admin/Librarian.
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION
      'Bạn không có quyền loại bỏ sách.';
  END IF;

  -- Lock the book row.
  SELECT *
  INTO v_book
  FROM public.books
  WHERE id = p_book_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Không tìm thấy sách.';
  END IF;

  IF v_book.status = 'archived' THEN
    RAISE EXCEPTION
      'Sách đã được lưu trữ trước đó.';
  END IF;

  -- Block if there is an outstanding loan.
  IF EXISTS (
    SELECT 1
    FROM public.loans
    WHERE book_id = p_book_id
      AND status IN ('active', 'overdue')
  ) THEN
    RAISE EXCEPTION
      'Không thể loại bỏ sách vì đang có phiếu mượn chưa hoàn tất.';
  END IF;

  -- Block if there is a pending reservation.
  IF EXISTS (
    SELECT 1
    FROM public.reservations
    WHERE book_id = p_book_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION
      'Không thể loại bỏ sách vì đang có yêu cầu đặt trước.';
  END IF;

  -- Archive instead of physical DELETE.
  UPDATE public.books
  SET
    status = 'archived',
    updated_at = now()
  WHERE id = p_book_id
  RETURNING *
  INTO v_result;

  RETURN v_result;
END;
$function$;


-- =========================================================
-- 4. RPC permissions
-- =========================================================

REVOKE ALL
ON FUNCTION public.remove_book(uuid)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.remove_book(uuid)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.remove_book(uuid)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.remove_book(uuid)
TO service_role;