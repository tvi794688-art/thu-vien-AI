-- Batch 3 fix: use Vietnam local date for borrow and due date

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

  -- Dùng ngày địa phương Việt Nam thay vì CURRENT_DATE theo UTC
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

  UPDATE public.books
  SET available = available - 1
  WHERE id = p_book_id;

  INSERT INTO public.loans (
    user_id,
    book_id,
    borrow_date,
    due_date
  )
  VALUES (
    p_reader_id,
    p_book_id,
    v_borrow_date,
    v_due_date
  )
  RETURNING id INTO v_loan_id;

  RETURN v_loan_id;
END;
$$;