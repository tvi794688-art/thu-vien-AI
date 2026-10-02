-- Batch 5: Protected renewal operation
-- Adds trusted renewal state, protected RPC, and prevents direct loan writes.

-- =========================================================
-- 1. Add renewal counter
-- =========================================================

ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS renewal_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.loans
DROP CONSTRAINT IF EXISTS loans_renewal_count_nonnegative;

ALTER TABLE public.loans
ADD CONSTRAINT loans_renewal_count_nonnegative
CHECK (renewal_count >= 0);


-- =========================================================
-- 2. Trusted renewal RPC
-- =========================================================

CREATE OR REPLACE FUNCTION public.renew_loan(
  p_loan_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_loan public.loans%ROWTYPE;
  v_max_renewals integer;
  v_renewal_days integer;
  v_today date;
BEGIN
  -- Only library staff may renew loans.
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Chỉ nhân viên thư viện mới có quyền gia hạn sách.';
  END IF;

  -- Use Vietnam-local calendar date consistently with borrowing.
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;

  -- Lock the loan so concurrent renewal attempts cannot both succeed.
  SELECT *
  INTO v_loan
  FROM public.loans
  WHERE id = p_loan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy phiếu mượn.';
  END IF;

  -- Returned loans cannot be renewed.
  IF v_loan.status = 'returned' THEN
    RAISE EXCEPTION 'Phiếu mượn đã được trả và không thể gia hạn.';
  END IF;

  -- Explicit overdue status cannot be renewed.
  IF v_loan.status = 'overdue' THEN
    RAISE EXCEPTION 'Phiếu mượn đang quá hạn và không thể gia hạn.';
  END IF;

  -- Protect against stale status values:
  -- an active loan whose due date has already passed is still overdue.
  IF v_loan.due_date < v_today THEN
    RAISE EXCEPTION 'Phiếu mượn đã quá hạn và không thể gia hạn.';
  END IF;

  IF v_loan.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Trạng thái phiếu mượn không cho phép gia hạn.';
  END IF;

  -- Read trusted renewal rules from settings.
  SELECT max_renewals, renewal_days
  INTO v_max_renewals, v_renewal_days
  FROM public.settings
  WHERE id = 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy cấu hình thư viện.';
  END IF;

  IF v_loan.renewal_count >= v_max_renewals THEN
    RAISE EXCEPTION
      'Phiếu mượn đã đạt số lần gia hạn tối đa (%).',
      v_max_renewals;
  END IF;

  -- Do not extend a loan while another reader is waiting for this book.
  IF EXISTS (
    SELECT 1
    FROM public.reservations r
    WHERE r.book_id = v_loan.book_id
      AND r.status = 'pending'
  ) THEN
    RAISE EXCEPTION
      'Sách đang có yêu cầu đặt trước nên không thể gia hạn.';
  END IF;

  -- Due date and renewal counter change atomically.
  UPDATE public.loans
  SET
    due_date = v_loan.due_date + v_renewal_days,
    renewal_count = v_loan.renewal_count + 1,
    updated_at = now()
  WHERE id = p_loan_id;

  RETURN true;
END;
$function$;


-- =========================================================
-- 3. Prevent direct frontend writes to loans
-- =========================================================

DROP POLICY IF EXISTS "Allow all actions for authenticated on loans"
ON public.loans;

DROP POLICY IF EXISTS "Authenticated users can view loans"
ON public.loans;

CREATE POLICY "Authenticated users can view loans"
ON public.loans
FOR SELECT
TO authenticated
USING (true);

-- Direct INSERT / UPDATE / DELETE are not application write paths.
-- Borrow, return and renewal must go through trusted RPCs.
REVOKE INSERT, UPDATE, DELETE
ON TABLE public.loans
FROM anon, authenticated;

GRANT SELECT
ON TABLE public.loans
TO authenticated;


-- =========================================================
-- 4. Restrict RPC execution
-- =========================================================

REVOKE ALL
ON FUNCTION public.borrow_book(uuid, uuid, date, text)
FROM PUBLIC, anon;

REVOKE ALL
ON FUNCTION public.return_book(uuid)
FROM PUBLIC, anon;

REVOKE ALL
ON FUNCTION public.renew_loan(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.borrow_book(uuid, uuid, date, text)
TO authenticated, service_role;

GRANT EXECUTE
ON FUNCTION public.return_book(uuid)
TO authenticated, service_role;

GRANT EXECUTE
ON FUNCTION public.renew_loan(uuid)
TO authenticated, service_role;