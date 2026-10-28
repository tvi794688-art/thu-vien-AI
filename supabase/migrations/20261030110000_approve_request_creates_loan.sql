-- Approving a reader request now creates the official loan atomically.
-- The request remains approved and points to that loan; repeated approvals
-- return successfully without changing inventory or creating another loan.
CREATE OR REPLACE FUNCTION public.approve_loan_request(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_initial public.loan_requests%ROWTYPE;
  v_request public.loan_requests%ROWTYPE;
  v_available integer;
  v_held_count integer;
  v_pending_reservation_count integer;
  v_first_reservation_reader uuid;
  v_reader_role text;
  v_card_status text;
  v_account_status text;
  v_loan_period_days integer;
  v_borrow_date date;
  v_due_date date;
  v_reservation_id uuid;
  v_loan_id uuid;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Chỉ Thủ thư hoặc Admin đang hoạt động mới được duyệt yêu cầu.';
  END IF;

  SELECT * INTO v_initial FROM public.loan_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy yêu cầu mượn.'; END IF;

  -- Match borrow_book lock ordering: book first, request second.
  SELECT available INTO v_available FROM public.books
  WHERE id = v_initial.book_id AND status <> 'archived' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sách không còn khả dụng.'; END IF;

  SELECT * INTO v_request FROM public.loan_requests
  WHERE id = p_request_id FOR UPDATE;

  -- Idempotency: an already issued request is a successful no-op.
  IF v_request.status = 'approved' AND v_request.loan_id IS NOT NULL THEN
    RETURN true;
  END IF;
  IF v_request.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Yêu cầu này đã được xử lý trước đó.';
  END IF;

  SELECT role, card_status, account_status
  INTO v_reader_role, v_card_status, v_account_status
  FROM public.profiles WHERE id = v_request.reader_id FOR SHARE;
  IF v_reader_role IS DISTINCT FROM 'reader' OR v_card_status IS DISTINCT FROM 'active'
     OR v_account_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Tài khoản hoặc thẻ độc giả hiện không đủ điều kiện mượn.';
  END IF;

  SELECT count(*) INTO v_held_count FROM public.loan_requests
  WHERE book_id = v_request.book_id AND status = 'approved'
    AND loan_id IS NULL AND id <> v_request.id;
  IF COALESCE(v_available, 0) - v_held_count <= 0 THEN
    RAISE EXCEPTION 'Không còn bản sách chưa được cấp giữ chỗ để duyệt yêu cầu.';
  END IF;

  SELECT count(*), (array_agg(reader_id ORDER BY created_at, id))[1]
  INTO v_pending_reservation_count, v_first_reservation_reader
  FROM public.reservations WHERE book_id = v_request.book_id AND status = 'pending';
  IF v_pending_reservation_count > 0
     AND v_available - v_held_count <= v_pending_reservation_count
     AND v_first_reservation_reader IS DISTINCT FROM v_request.reader_id THEN
    RAISE EXCEPTION 'Sách đang có độc giả đặt trước theo thứ tự FIFO; chưa thể duyệt yêu cầu này.';
  END IF;

  SELECT loan_period_days INTO v_loan_period_days FROM public.settings WHERE id = 1;
  IF v_loan_period_days IS NULL OR v_loan_period_days < 1 THEN
    RAISE EXCEPTION 'Cấu hình số ngày mượn không hợp lệ.';
  END IF;
  v_borrow_date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_due_date := v_borrow_date + v_loan_period_days;

  -- Fulfill the reader's reservation if it is first in the existing FIFO queue.
  SELECT id INTO v_reservation_id FROM public.reservations
  WHERE book_id = v_request.book_id AND status = 'pending'
    AND reader_id = v_request.reader_id
  ORDER BY created_at, id LIMIT 1 FOR UPDATE;
  IF v_reservation_id IS NOT NULL AND v_first_reservation_reader = v_request.reader_id THEN
    UPDATE public.reservations SET status = 'fulfilled' WHERE id = v_reservation_id;
  END IF;

  UPDATE public.books SET available = available - 1 WHERE id = v_request.book_id;
  INSERT INTO public.loans(user_id, book_id, borrow_date, due_date, status)
  VALUES (v_request.reader_id, v_request.book_id, v_borrow_date, v_due_date, 'active')
  RETURNING id INTO v_loan_id;

  UPDATE public.loan_requests SET status = 'approved', loan_id = v_loan_id,
    rejection_reason = NULL, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = v_request.id AND loan_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không thể liên kết phiếu mượn với yêu cầu; thao tác đã được hoàn tác.';
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_loan_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_loan_request(uuid) TO authenticated;
