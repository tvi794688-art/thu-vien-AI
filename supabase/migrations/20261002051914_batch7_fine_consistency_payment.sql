-- Batch 7: Fine consistency and payment
-- Uses configured fine rate consistently, protects fine integrity,
-- fixes return_book(), and adds a trusted payment operation.

-- =========================================================
-- 1. Protect fine -> loan relationship
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fines_loan_id_fkey'
      AND conrelid = 'public.fines'::regclass
  ) THEN
    ALTER TABLE public.fines
    ADD CONSTRAINT fines_loan_id_fkey
    FOREIGN KEY (loan_id)
    REFERENCES public.loans(id)
    ON DELETE RESTRICT;
  END IF;
END;
$$;


-- One loan may create at most one fine.
CREATE UNIQUE INDEX IF NOT EXISTS
  fines_one_per_loan
ON public.fines (loan_id);


-- =========================================================
-- 2. Fix trusted return operation
-- =========================================================

CREATE OR REPLACE FUNCTION public.return_book(
  p_loan_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_loan public.loans%ROWTYPE;
  v_today date;
  v_days_overdue integer;
  v_fine_per_day numeric;
BEGIN
  -- Only library staff may confirm returns.
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION
      'Chỉ nhân viên thư viện mới có quyền xác nhận trả sách.';
  END IF;

  v_today :=
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;

  -- Lock the loan so return processing cannot run concurrently.
  SELECT *
  INTO v_loan
  FROM public.loans
  WHERE id = p_loan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy phiếu mượn.';
  END IF;

  IF v_loan.status = 'returned' THEN
    RAISE EXCEPTION
      'Phiếu mượn này đã được trả trước đó.';
  END IF;

  IF v_loan.book_id IS NULL THEN
    RAISE EXCEPTION
      'Phiếu mượn không có thông tin sách hợp lệ.';
  END IF;

  IF v_loan.user_id IS NULL THEN
    RAISE EXCEPTION
      'Phiếu mượn không có thông tin độc giả hợp lệ.';
  END IF;

  -- If overdue, settings must exist and supply the fine rate.
  IF v_today > v_loan.due_date THEN
    SELECT fine_per_day
    INTO v_fine_per_day
    FROM public.settings
    WHERE id = 1;

    IF NOT FOUND OR v_fine_per_day IS NULL THEN
      RAISE EXCEPTION
        'Không tìm thấy cấu hình mức phạt của thư viện.';
    END IF;

    v_days_overdue := v_today - v_loan.due_date;

    -- Guard against duplicate/inconsistent fine creation.
    IF EXISTS (
      SELECT 1
      FROM public.fines
      WHERE loan_id = p_loan_id
    ) THEN
      RAISE EXCEPTION
        'Phiếu mượn này đã có bản ghi tiền phạt.';
    END IF;
  END IF;

  -- Mark loan returned.
  UPDATE public.loans
  SET
    status = 'returned',
    return_date = v_today,
    updated_at = now()
  WHERE id = p_loan_id;

  -- Restore one available copy.
  UPDATE public.books
  SET available = available + 1
  WHERE id = v_loan.book_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Không tìm thấy sách của phiếu mượn.';
  END IF;

  -- Create the fine only for a late return.
  IF v_today > v_loan.due_date THEN
    INSERT INTO public.fines (
      loan_id,
      reader_id,
      amount,
      days_overdue,
      paid
    )
    VALUES (
      p_loan_id,
      v_loan.user_id,
      v_days_overdue * v_fine_per_day,
      v_days_overdue,
      false
    );
  END IF;

  RETURN true;
END;
$function$;


-- =========================================================
-- 3. Trusted fine payment operation
-- =========================================================

CREATE OR REPLACE FUNCTION public.mark_fine_paid(
  p_fine_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_paid boolean;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION
      'Chỉ nhân viên thư viện mới có quyền xác nhận thanh toán tiền phạt.';
  END IF;

  SELECT paid
  INTO v_paid
  FROM public.fines
  WHERE id = p_fine_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Không tìm thấy khoản phạt.';
  END IF;

  IF v_paid THEN
    RAISE EXCEPTION
      'Khoản phạt này đã được thanh toán trước đó.';
  END IF;

  UPDATE public.fines
  SET paid = true
  WHERE id = p_fine_id;

  RETURN true;
END;
$function$;


-- =========================================================
-- 4. Remove direct fine write paths
-- =========================================================

DROP POLICY IF EXISTS staff_insert_fines
ON public.fines;

DROP POLICY IF EXISTS staff_update_fines
ON public.fines;

DROP POLICY IF EXISTS staff_delete_fines
ON public.fines;

-- Keep select_fines:
-- Reader sees only own fines, staff sees all.

REVOKE INSERT, UPDATE, DELETE
ON TABLE public.fines
FROM anon, authenticated;

GRANT SELECT
ON TABLE public.fines
TO authenticated;


-- =========================================================
-- 5. Restrict payment RPC execution
-- =========================================================

REVOKE ALL
ON FUNCTION public.mark_fine_paid(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.mark_fine_paid(uuid)
TO authenticated, service_role;