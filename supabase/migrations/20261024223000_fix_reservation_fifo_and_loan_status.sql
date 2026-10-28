-- Migration: fix reservation FIFO protection and loan status compatibility
-- Addresses Issue 2 (prevent walk-in bypass of pending reservations)
-- Addresses Issue 4 (support both 'active' and 'borrowing' status transparently)

-- 1. Update borrow_book with FIFO pending reservation protection
CREATE OR REPLACE FUNCTION public.borrow_book(
  p_book_id uuid,
  p_reader_id uuid,
  p_due_date date,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available int;
  v_loan_id uuid;
  v_reader_role text;
  v_card_status text;
  v_loan_period_days int;
  v_borrow_date date;
  v_due_date date;
  v_first_pending_reader uuid;
  v_first_pending_res_id uuid;
  v_pending_count int;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Chỉ nhân viên thư viện mới có quyền tạo phiếu mượn.';
  END IF;

  SELECT role, card_status
  INTO v_reader_role, v_card_status
  FROM public.profiles
  WHERE id = p_reader_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy độc giả.';
  END IF;

  IF v_reader_role <> 'reader' THEN
    RAISE EXCEPTION 'Tài khoản được chọn không phải là độc giả.';
  END IF;

  IF v_card_status <> 'active' THEN
    RAISE EXCEPTION 'Thẻ độc giả không hoạt động nên không thể mượn sách.';
  END IF;

  SELECT loan_period_days
  INTO v_loan_period_days
  FROM public.settings
  WHERE id = 1;

  IF v_loan_period_days IS NULL OR v_loan_period_days < 1 THEN
    RAISE EXCEPTION 'Cấu hình số ngày mượn không hợp lệ.';
  END IF;

  -- Dùng ngày địa phương Việt Nam
  v_borrow_date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_due_date := v_borrow_date + v_loan_period_days;

  SELECT available
  INTO v_available
  FROM public.books
  WHERE id = p_book_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy sách.';
  END IF;

  IF v_available < 1 THEN
    RAISE EXCEPTION 'Sách hiện đã hết, không còn bản nào khả dụng để mượn.';
  END IF;

  -- Bảo vệ hàng đợi Đặt trước (FIFO Queue Protection)
  SELECT id, reader_id
  INTO v_first_pending_res_id, v_first_pending_reader
  FROM public.reservations
  WHERE book_id = p_book_id
    AND status = 'pending'
  ORDER BY created_at ASC, id ASC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    SELECT count(*)
    INTO v_pending_count
    FROM public.reservations
    WHERE book_id = p_book_id
      AND status = 'pending';

    -- Nếu số lượng khả dụng không đủ vượt qua số người đang chờ đặt trước:
    -- Không cho phép độc giả khác mượn trước người xếp hàng
    IF v_available <= v_pending_count AND v_first_pending_reader IS DISTINCT FROM p_reader_id THEN
      RAISE EXCEPTION 'Sách này đang có độc giả khác xếp hàng đặt trước. Vui lòng xử lý đặt trước theo thứ tự.';
    END IF;

    -- Nếu chính độc giả đặt trước nhận sách thì chuyển trạng thái đặt trước thành fulfilled
    IF v_first_pending_reader = p_reader_id THEN
      UPDATE public.reservations
      SET status = 'fulfilled'
      WHERE id = v_first_pending_res_id;
    END IF;
  END IF;

  UPDATE public.books
  SET available = available - 1
  WHERE id = p_book_id;

  INSERT INTO public.loans (
    user_id,
    book_id,
    borrow_date,
    due_date,
    status
  )
  VALUES (
    p_reader_id,
    p_book_id,
    v_borrow_date,
    v_due_date,
    'active'
  )
  RETURNING id INTO v_loan_id;

  RETURN v_loan_id;
END;
$$;


-- 2. Update renew_loan to accept both 'active' and 'borrowing'
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
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Chỉ nhân viên thư viện mới có quyền gia hạn sách.';
  END IF;

  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;

  SELECT *
  INTO v_loan
  FROM public.loans
  WHERE id = p_loan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy phiếu mượn.';
  END IF;

  IF v_loan.status = 'returned' THEN
    RAISE EXCEPTION 'Phiếu mượn đã được trả và không thể gia hạn.';
  END IF;

  IF v_loan.status = 'overdue' THEN
    RAISE EXCEPTION 'Phiếu mượn đang quá hạn và không thể gia hạn.';
  END IF;

  IF v_loan.due_date < v_today THEN
    RAISE EXCEPTION 'Phiếu mượn đã quá hạn và không thể gia hạn.';
  END IF;

  -- Hỗ trợ cả 'active' và 'borrowing'
  IF v_loan.status NOT IN ('active', 'borrowing') THEN
    RAISE EXCEPTION 'Trạng thái phiếu mượn không cho phép gia hạn.';
  END IF;

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

  IF EXISTS (
    SELECT 1
    FROM public.reservations r
    WHERE r.book_id = v_loan.book_id
      AND r.status = 'pending'
  ) THEN
    RAISE EXCEPTION
      'Sách đang có yêu cầu đặt trước nên không thể gia hạn.';
  END IF;

  UPDATE public.loans
  SET
    due_date = v_loan.due_date + v_renewal_days,
    renewal_count = v_loan.renewal_count + 1,
    updated_at = now()
  WHERE id = p_loan_id;

  RETURN true;
END;
$function$;


-- 3. Update remove_book to recognize both 'active' and 'borrowing'
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
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Bạn không có quyền loại bỏ sách.';
  END IF;

  SELECT *
  INTO v_book
  FROM public.books
  WHERE id = p_book_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy sách.';
  END IF;

  IF v_book.status = 'archived' THEN
    RAISE EXCEPTION 'Sách đã được lưu trữ trước đó.';
  END IF;

  -- Chặn xóa nếu sách đang có loan chưa trả
  IF EXISTS (
    SELECT 1
    FROM public.loans
    WHERE book_id = p_book_id
      AND status IN ('active', 'borrowing', 'overdue')
  ) THEN
    RAISE EXCEPTION
      'Không thể loại bỏ sách đang có phiếu mượn chưa trả.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.reservations
    WHERE book_id = p_book_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION
      'Không thể loại bỏ sách đang có yêu cầu đặt trước.';
  END IF;

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
