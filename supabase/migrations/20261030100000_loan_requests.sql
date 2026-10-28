-- Reader loan requests are separate from reservations and from issued loans.
CREATE TABLE public.loan_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code text NOT NULL UNIQUE DEFAULT (
    'LR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  reader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  expected_borrow_date date,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  rejection_reason text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  loan_id uuid UNIQUE REFERENCES public.loans(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'rejected' OR NULLIF(BTRIM(rejection_reason), '') IS NOT NULL)
);

CREATE INDEX loan_requests_reader_created_idx
  ON public.loan_requests(reader_id, created_at DESC);
CREATE INDEX loan_requests_book_status_idx
  ON public.loan_requests(book_id, status, created_at);
CREATE UNIQUE INDEX loan_requests_one_pending_per_reader_book
  ON public.loan_requests(reader_id, book_id) WHERE status = 'pending';

ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY active_accounts_read_loan_requests ON public.loan_requests
  FOR SELECT TO authenticated USING (
    public.is_account_active() AND (reader_id = auth.uid() OR public.is_staff())
  );
REVOKE ALL ON public.loan_requests FROM anon, authenticated;
GRANT SELECT ON public.loan_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_loan_request(
  p_book_id uuid,
  p_expected_borrow_date date DEFAULT NULL
)
RETURNS public.loan_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_card_status text;
  v_available integer;
  v_holds integer;
  v_request public.loan_requests%ROWTYPE;
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_account_active() THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập bằng tài khoản đang hoạt động.';
  END IF;

  SELECT role, card_status INTO v_role, v_card_status
  FROM public.profiles WHERE id = v_user_id FOR SHARE;
  IF v_role IS DISTINCT FROM 'reader' THEN
    RAISE EXCEPTION 'Chỉ độc giả mới được gửi yêu cầu mượn sách.';
  END IF;
  IF v_card_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Thẻ độc giả chưa hoạt động nên chưa thể đăng ký mượn.';
  END IF;
  IF p_expected_borrow_date IS NOT NULL AND p_expected_borrow_date < v_today THEN
    RAISE EXCEPTION 'Ngày dự kiến mượn không thể ở trong quá khứ.';
  END IF;

  SELECT available INTO v_available
  FROM public.books WHERE id = p_book_id AND status <> 'archived' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy sách hoặc sách đã được lưu trữ.';
  END IF;

  SELECT count(*) INTO v_holds FROM public.loan_requests
  WHERE book_id = p_book_id AND status = 'approved' AND loan_id IS NULL;
  IF COALESCE(v_available, 0) - v_holds <= 0 THEN
    RAISE EXCEPTION 'Sách hiện không còn bản khả dụng để đăng ký mượn.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.loan_requests
    WHERE reader_id = v_user_id AND book_id = p_book_id
      AND (status = 'pending' OR (status = 'approved' AND loan_id IS NULL))
  ) THEN
    RAISE EXCEPTION 'Bạn đã có yêu cầu đang chờ hoặc đã được duyệt cho cuốn sách này.';
  END IF;

  INSERT INTO public.loan_requests(reader_id, book_id, expected_borrow_date)
  VALUES (v_user_id, p_book_id, p_expected_borrow_date)
  RETURNING * INTO v_request;
  RETURN v_request;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Bạn đã có yêu cầu đang chờ cho cuốn sách này.';
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_loan_request(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.loan_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_account_active() THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập bằng tài khoản đang hoạt động.';
  END IF;
  SELECT * INTO v_request FROM public.loan_requests
  WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy yêu cầu mượn.'; END IF;
  IF v_request.reader_id <> auth.uid() THEN
    RAISE EXCEPTION 'Bạn chỉ được hủy yêu cầu của chính mình.';
  END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Chỉ yêu cầu đang chờ phê duyệt mới có thể hủy.';
  END IF;

  UPDATE public.loan_requests SET status = 'cancelled', reviewed_by = auth.uid(),
    reviewed_at = now(), updated_at = now() WHERE id = p_request_id;
  RETURN true;
END;
$$;

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
  v_holds integer;
  v_pending_reservations integer;
  v_first_reservation_reader uuid;
  v_reader_role text;
  v_card_status text;
  v_account_status text;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Chỉ Thủ thư hoặc Admin đang hoạt động mới được duyệt yêu cầu.';
  END IF;
  SELECT * INTO v_initial FROM public.loan_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy yêu cầu mượn.'; END IF;

  -- All approvals and checkouts lock the book before request rows. This
  -- serializes holds and prevents two reviewers allocating the final copy.
  SELECT available INTO v_available FROM public.books
  WHERE id = v_initial.book_id AND status <> 'archived' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sách không còn khả dụng.'; END IF;

  SELECT * INTO v_request FROM public.loan_requests WHERE id = p_request_id FOR UPDATE;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Yêu cầu này đã được xử lý trước đó.';
  END IF;

  SELECT role, card_status, account_status
  INTO v_reader_role, v_card_status, v_account_status
  FROM public.profiles WHERE id = v_request.reader_id FOR SHARE;
  IF v_reader_role IS DISTINCT FROM 'reader' OR v_card_status IS DISTINCT FROM 'active'
     OR v_account_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Tài khoản hoặc thẻ độc giả hiện không đủ điều kiện mượn.';
  END IF;

  SELECT count(*) INTO v_holds FROM public.loan_requests
  WHERE book_id = v_request.book_id AND status = 'approved' AND loan_id IS NULL;
  IF COALESCE(v_available, 0) - v_holds <= 0 THEN
    RAISE EXCEPTION 'Không còn bản sách chưa được cấp giữ chỗ để duyệt yêu cầu.';
  END IF;

  SELECT count(*), (array_agg(reader_id ORDER BY created_at, id))[1]
  INTO v_pending_reservations, v_first_reservation_reader
  FROM public.reservations WHERE book_id = v_request.book_id AND status = 'pending';
  IF v_pending_reservations > 0
     AND v_available - v_holds <= v_pending_reservations
     AND v_first_reservation_reader IS DISTINCT FROM v_request.reader_id THEN
    RAISE EXCEPTION 'Sách đang có độc giả đặt trước theo thứ tự FIFO; chưa thể duyệt yêu cầu này.';
  END IF;

  UPDATE public.loan_requests SET status = 'approved', rejection_reason = NULL,
    reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = p_request_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_loan_request(p_request_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.loan_requests%ROWTYPE;
  v_reason text := NULLIF(BTRIM(p_reason), '');
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Chỉ Thủ thư hoặc Admin đang hoạt động mới được xử lý yêu cầu.';
  END IF;
  IF v_reason IS NULL THEN RAISE EXCEPTION 'Vui lòng nhập lý do từ chối.'; END IF;
  SELECT * INTO v_request FROM public.loan_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy yêu cầu mượn.'; END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Yêu cầu này đã được xử lý trước đó.';
  END IF;
  UPDATE public.loan_requests SET status = 'rejected', rejection_reason = v_reason,
    reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = p_request_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_loan_request(uuid, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_loan_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_loan_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_loan_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_loan_request(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_loan_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_loan_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_loan_request(uuid, text) TO authenticated;

-- Borrowing is still the physical hand-off. Once an approved reader receives
-- the book through the existing borrow RPC, link that issued loan to the request.
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
  v_account_status text;
  v_loan_period_days int;
  v_borrow_date date;
  v_due_date date;
  v_first_pending_reader uuid;
  v_first_pending_res_id uuid;
  v_pending_count int;
  v_approved_holds int;
  v_request_id uuid;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Chỉ nhân viên thư viện mới có quyền tạo phiếu mượn.';
  END IF;

  SELECT role, card_status, account_status INTO v_reader_role, v_card_status, v_account_status
  FROM public.profiles WHERE id = p_reader_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy độc giả.'; END IF;
  IF v_reader_role <> 'reader' OR v_account_status <> 'active' THEN
    RAISE EXCEPTION 'Tài khoản được chọn không phải độc giả đang hoạt động.';
  END IF;
  IF v_card_status <> 'active' THEN RAISE EXCEPTION 'Thẻ độc giả không hoạt động.'; END IF;

  SELECT loan_period_days INTO v_loan_period_days FROM public.settings WHERE id = 1;
  IF v_loan_period_days IS NULL OR v_loan_period_days < 1 THEN
    RAISE EXCEPTION 'Cấu hình số ngày mượn không hợp lệ.';
  END IF;
  v_borrow_date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_due_date := v_borrow_date + v_loan_period_days;

  SELECT available INTO v_available FROM public.books
  WHERE id = p_book_id AND status <> 'archived' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy sách hoặc sách đã lưu trữ.'; END IF;
  IF COALESCE(v_available, 0) < 1 THEN RAISE EXCEPTION 'Sách hiện đã hết.'; END IF;

  SELECT id INTO v_request_id FROM public.loan_requests
  WHERE book_id = p_book_id AND reader_id = p_reader_id
    AND status = 'pending' ORDER BY created_at, id LIMIT 1;
  IF v_request_id IS NOT NULL THEN
    RAISE EXCEPTION 'Độc giả đã có yêu cầu mượn đang chờ; hãy phê duyệt hoặc từ chối yêu cầu trước.';
  END IF;

  SELECT id INTO v_request_id FROM public.loan_requests
  WHERE book_id = p_book_id AND reader_id = p_reader_id
    AND status = 'approved' AND loan_id IS NULL
  ORDER BY reviewed_at, id LIMIT 1 FOR UPDATE;
  SELECT count(*) INTO v_approved_holds FROM public.loan_requests
  WHERE book_id = p_book_id AND status = 'approved' AND loan_id IS NULL;
  IF v_request_id IS NULL AND v_available <= v_approved_holds THEN
    RAISE EXCEPTION 'Số sách còn lại đã được giữ cho các yêu cầu đã duyệt.';
  END IF;

  SELECT id, reader_id INTO v_first_pending_res_id, v_first_pending_reader
  FROM public.reservations WHERE book_id = p_book_id AND status = 'pending'
  ORDER BY created_at, id LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    SELECT count(*) INTO v_pending_count FROM public.reservations
    WHERE book_id = p_book_id AND status = 'pending';
    IF v_request_id IS NULL AND v_available - v_approved_holds <= v_pending_count
       AND v_first_pending_reader IS DISTINCT FROM p_reader_id THEN
      RAISE EXCEPTION 'Sách đang có độc giả đặt trước theo thứ tự FIFO.';
    END IF;
    IF v_first_pending_reader = p_reader_id THEN
      UPDATE public.reservations SET status = 'fulfilled' WHERE id = v_first_pending_res_id;
    END IF;
  END IF;

  UPDATE public.books SET available = available - 1 WHERE id = p_book_id;
  INSERT INTO public.loans(user_id, book_id, borrow_date, due_date, status)
  VALUES (p_reader_id, p_book_id, v_borrow_date, v_due_date, 'active')
  RETURNING id INTO v_loan_id;

  IF v_request_id IS NOT NULL THEN
    UPDATE public.loan_requests SET loan_id = v_loan_id, updated_at = now()
    WHERE id = v_request_id AND status = 'approved' AND loan_id IS NULL;
  END IF;
  RETURN v_loan_id;
END;
$$;

