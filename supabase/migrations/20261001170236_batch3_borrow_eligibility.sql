-- Batch 3: Borrow eligibility + trusted due date
-- Fixes DB-003

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
  v_due_date date;
BEGIN
  -- Only library staff can create loans
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Chỉ nhân viên thư viện mới có quyền tạo phiếu mượn.';
  END IF;

  -- Validate borrower at the trusted database boundary
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

  -- Read the approved loan period from settings
  SELECT loan_period_days
  INTO v_loan_period_days
  FROM public.settings
  WHERE id = 1;

  IF v_loan_period_days IS NULL OR v_loan_period_days < 1 THEN
    RAISE EXCEPTION 'Cấu hình số ngày mượn không hợp lệ.';
  END IF;

  -- Do not trust p_due_date supplied by the client.
  -- Compute the due date from trusted configuration instead.
  v_due_date := CURRENT_DATE + v_loan_period_days;

  -- Lock the selected book row to prevent concurrent over-borrowing
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

  -- Decrease available inventory
  UPDATE public.books
  SET available = available - 1
  WHERE id = p_book_id;

  -- Create the loan using the trusted due date
  INSERT INTO public.loans (
    book_id,
    reader_id,
    due_date,
    status,
    note
  )
  VALUES (
    p_book_id,
    p_reader_id,
    v_due_date,
    'borrowing',
    p_note
  )
  RETURNING id INTO v_loan_id;

  RETURN v_loan_id;
END;
$$;