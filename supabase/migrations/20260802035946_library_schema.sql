/*
# Library Management System - Complete Database Schema

## Overview
Full schema for a library management system with AI integration. Supports book management,
reader management, borrow/return tracking, reservations, overdue fines, and library statistics.

## Tables
1. **profiles** - User accounts extending auth.users with role-based access (admin, librarian, reader).
   Also serves as the reader record (reader_type, card_status for reader accounts).
2. **books** - Library books with title, author, category, publisher, quantity, and available count.
3. **loans** - Borrow records linking readers to books with due dates, return dates, and renewal tracking.
4. **reservations** - Book reservations when copies are unavailable.
5. **fines** - Overdue fine records with payment tracking.
6. **settings** - Library configuration (loan period, fine rates, renewal limits).

## Security
- RLS enabled on ALL tables.
- Role-based access via is_staff() and is_admin() SECURITY DEFINER functions.
- Staff (admin + librarian) can manage all library data.
- Readers can view the catalog and their own loans/reservations/fines.
- Readers can create reservations for unavailable books.
- Auto-create profile on signup via trigger (handle_new_user).

## Notes
1. New users default to 'reader' role. Role can be set at signup via metadata.
2. Book available count is maintained in application logic (decrement on borrow, increment on return).
3. Fine amounts are computed dynamically based on overdue days × fine_per_day from settings.
4. The handle_new_user trigger is SECURITY DEFINER to bypass RLS during profile creation.
*/

-- ============ PROFILES TABLE ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  role text NOT NULL DEFAULT 'reader',
  reader_type text DEFAULT 'student',
  card_status text NOT NULL DEFAULT 'active',
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ BOOKS TABLE ============
CREATE TABLE IF NOT EXISTS public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_code text UNIQUE NOT NULL,
  title text NOT NULL,
  author text NOT NULL,
  category text NOT NULL,
  publisher text,
  publish_year int,
  isbn text,
  quantity int NOT NULL DEFAULT 1,
  available int NOT NULL DEFAULT 1,
  description text,
  cover_color text DEFAULT 'blue',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_books_title ON public.books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON public.books(author);
CREATE INDEX IF NOT EXISTS idx_books_category ON public.books(category);

-- ============ LOANS TABLE ============
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  reader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  borrow_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL,
  return_date date,
  status text NOT NULL DEFAULT 'borrowing',
  renewed_count int NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_loans_book ON public.loans(book_id);
CREATE INDEX IF NOT EXISTS idx_loans_reader ON public.loans(reader_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);

-- ============ RESERVATIONS TABLE ============
CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  reader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reserved_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reservations_book ON public.reservations(book_id);
CREATE INDEX IF NOT EXISTS idx_reservations_reader ON public.reservations(reader_id);

-- ============ FINES TABLE ============
CREATE TABLE IF NOT EXISTS public.fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE RESTRICT,
  reader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount numeric NOT NULL DEFAULT 0,
  days_overdue int NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_fines_reader ON public.fines(reader_id);
CREATE INDEX IF NOT EXISTS idx_fines_loan ON public.fines(loan_id);

-- ============ SETTINGS TABLE ============
CREATE TABLE IF NOT EXISTS public.settings (
  id int PRIMARY KEY DEFAULT 1,
  library_name text NOT NULL DEFAULT 'Thư viện trường học',
  loan_period_days int NOT NULL DEFAULT 14,
  max_renewals int NOT NULL DEFAULT 2,
  fine_per_day numeric NOT NULL DEFAULT 5000,
  renewal_days int NOT NULL DEFAULT 7
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'librarian')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, reader_type, card_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Người dùng mới'),
    NEW.email,
    'reader',
    COALESCE(NEW.raw_user_meta_data->>'reader_type', 'student'),
    'active'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- PROFILES: readers see own, staff see all; readers update own, staff update all
DROP POLICY IF EXISTS "select_profiles" ON public.profiles;
CREATE POLICY "select_profiles" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_staff());

DROP POLICY IF EXISTS "insert_profile" ON public.profiles;
CREATE POLICY "insert_profile" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_profiles" ON public.profiles;
CREATE POLICY "update_profiles" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id OR public.is_staff())
  WITH CHECK (auth.uid() = id OR public.is_staff());

DROP POLICY IF EXISTS "delete_profiles" ON public.profiles;
CREATE POLICY "delete_profiles" ON public.profiles FOR DELETE
  TO authenticated USING (public.is_staff());

-- BOOKS: all authenticated can view catalog; staff manage
DROP POLICY IF EXISTS "select_books" ON public.books;
CREATE POLICY "select_books" ON public.books FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_books" ON public.books;
CREATE POLICY "staff_insert_books" ON public.books FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "staff_update_books" ON public.books;
CREATE POLICY "staff_update_books" ON public.books FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "staff_delete_books" ON public.books;
CREATE POLICY "staff_delete_books" ON public.books FOR DELETE
  TO authenticated USING (public.is_staff());

-- LOANS: readers see own, staff see all; staff manage
DROP POLICY IF EXISTS "select_loans" ON public.loans;
CREATE POLICY "select_loans" ON public.loans FOR SELECT
  TO authenticated USING (reader_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "staff_insert_loans" ON public.loans;
CREATE POLICY "staff_insert_loans" ON public.loans FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "staff_update_loans" ON public.loans;
CREATE POLICY "staff_update_loans" ON public.loans FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "staff_delete_loans" ON public.loans;
CREATE POLICY "staff_delete_loans" ON public.loans FOR DELETE
  TO authenticated USING (public.is_staff());

-- RESERVATIONS: readers see own and create; staff see all and manage
DROP POLICY IF EXISTS "select_reservations" ON public.reservations;
CREATE POLICY "select_reservations" ON public.reservations FOR SELECT
  TO authenticated USING (reader_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "insert_reservations" ON public.reservations;
CREATE POLICY "insert_reservations" ON public.reservations FOR INSERT
  TO authenticated WITH CHECK (reader_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "staff_update_reservations" ON public.reservations;
CREATE POLICY "staff_update_reservations" ON public.reservations FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "staff_delete_reservations" ON public.reservations;
CREATE POLICY "staff_delete_reservations" ON public.reservations FOR DELETE
  TO authenticated USING (public.is_staff());

-- FINES: readers see own; staff manage
DROP POLICY IF EXISTS "select_fines" ON public.fines;
CREATE POLICY "select_fines" ON public.fines FOR SELECT
  TO authenticated USING (reader_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "staff_insert_fines" ON public.fines;
CREATE POLICY "staff_insert_fines" ON public.fines FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "staff_update_fines" ON public.fines;
CREATE POLICY "staff_update_fines" ON public.fines FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "staff_delete_fines" ON public.fines;
CREATE POLICY "staff_delete_fines" ON public.fines FOR DELETE
  TO authenticated USING (public.is_staff());

-- SETTINGS: all authenticated can view; staff can update
DROP POLICY IF EXISTS "select_settings" ON public.settings;
CREATE POLICY "select_settings" ON public.settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_update_settings" ON public.settings;
CREATE POLICY "staff_update_settings" ON public.settings FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Cho phép staff thêm cấu hình mới nếu bảng settings chưa có dữ liệu
DROP POLICY IF EXISTS "staff_insert_settings" ON public.settings;
CREATE POLICY "staff_insert_settings" ON public.settings FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

-- Khởi tạo cấu hình mặc định (id = 1) để frontend luôn đọc được dữ liệu
INSERT INTO public.settings (id, library_name, loan_period_days, max_renewals, fine_per_day, renewal_days)
VALUES (1, 'Thư viện trường học', 14, 2, 5000, 7)
ON CONFLICT (id) DO NOTHING;

-- ============ ATOMIC LOAN OPERATIONS (RPC) ============

-- 1. Hàm mượn sách nguyên tử, chống race condition
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
BEGIN
  -- Kiểm tra quyền staff
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Chỉ nhân viên thư viện mới có quyền tạo phiếu mượn.';
  END IF;

  -- Khóa dòng sách để kiểm tra và trừ tồn kho (chống race condition)
  SELECT available INTO v_available
  FROM public.books
  WHERE id = p_book_id
  FOR UPDATE;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy sách.';
  END IF;

  IF v_available < 1 THEN
    RAISE EXCEPTION 'Sách hiện đã hết, không còn bản nào khả dụng để mượn.';
  END IF;

  -- Trừ số lượng sẵn có
  UPDATE public.books
  SET available = available - 1
  WHERE id = p_book_id;

  -- Tạo phiếu mượn
  INSERT INTO public.loans (book_id, reader_id, due_date, status, note)
  VALUES (p_book_id, p_reader_id, p_due_date, 'borrowing', p_note)
  RETURNING id INTO v_loan_id;

  RETURN v_loan_id;
END;
$$;

-- 2. Hàm trả sách nguyên tử
CREATE OR REPLACE FUNCTION public.return_book(
  p_loan_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan record;
  v_days_overdue int;
  v_fine_per_day numeric;
BEGIN
  -- Kiểm tra quyền staff
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Chỉ nhân viên thư viện mới có quyền xác nhận trả sách.';
  END IF;

  -- Khóa phiếu mượn
  SELECT * INTO v_loan
  FROM public.loans
  WHERE id = p_loan_id
  FOR UPDATE;

  IF v_loan IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy phiếu mượn.';
  END IF;

  IF v_loan.status = 'returned' THEN
    RAISE EXCEPTION 'Phiếu mượn này đã được trả trước đó.';
  END IF;

  -- Cập nhật phiếu mượn sang returned
  UPDATE public.loans
  SET status = 'returned',
      return_date = CURRENT_DATE
  WHERE id = p_loan_id;

  -- Hoàn lại số lượng sách sẵn có
  UPDATE public.books
  SET available = available + 1
  WHERE id = v_loan.book_id;

  -- Kiểm tra và tạo phạt nếu quá hạn
  IF CURRENT_DATE > v_loan.due_date THEN
    v_days_overdue := CURRENT_DATE - v_loan.due_date;
    
    SELECT fine_per_day INTO v_fine_per_day FROM public.settings WHERE id = 1;
    IF v_fine_per_day IS NULL THEN
      v_fine_per_day := 5000;
    END IF;

    INSERT INTO public.fines (loan_id, reader_id, amount, days_overdue, paid)
    VALUES (p_loan_id, v_loan.reader_id, v_days_overdue * v_fine_per_day, v_days_overdue, false);
  END IF;

  RETURN true;
END;
$$;