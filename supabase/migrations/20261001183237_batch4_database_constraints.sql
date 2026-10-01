-- Batch 4: Database domain constraints
-- Adds trusted invariants for application-used columns.

-- BOOKS
ALTER TABLE public.books
  ADD CONSTRAINT books_available_nonnegative
  CHECK (available IS NULL OR available >= 0),

  ADD CONSTRAINT books_quantity_nonnegative
  CHECK (quantity IS NULL OR quantity >= 0),

  ADD CONSTRAINT books_available_not_exceed_quantity
  CHECK (
    available IS NULL
    OR quantity IS NULL
    OR available <= quantity
  );

-- PROFILES
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'librarian', 'reader')),

  ADD CONSTRAINT profiles_reader_type_check
  CHECK (
    reader_type IS NULL
    OR reader_type IN ('student', 'teacher', 'staff', 'guest')
  ),

  ADD CONSTRAINT profiles_card_status_check
  CHECK (card_status IN ('active', 'suspended', 'expired'));

-- RESERVATIONS
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('pending', 'fulfilled', 'cancelled'));

-- FINES
ALTER TABLE public.fines
  ADD CONSTRAINT fines_amount_nonnegative
  CHECK (amount >= 0),

  ADD CONSTRAINT fines_days_overdue_nonnegative
  CHECK (days_overdue >= 0);

-- LOANS
ALTER TABLE public.loans
  ADD CONSTRAINT loans_fine_amount_nonnegative
  CHECK (fine_amount IS NULL OR fine_amount >= 0),

  ADD CONSTRAINT loans_due_date_not_before_borrow_date
  CHECK (
    borrow_date IS NULL
    OR due_date >= borrow_date
  );

-- SETTINGS
ALTER TABLE public.settings
  ADD CONSTRAINT settings_loan_period_positive
  CHECK (loan_period_days >= 1),

  ADD CONSTRAINT settings_max_renewals_nonnegative
  CHECK (max_renewals >= 0),

  ADD CONSTRAINT settings_fine_per_day_nonnegative
  CHECK (fine_per_day >= 0),

  ADD CONSTRAINT settings_renewal_days_positive
  CHECK (renewal_days >= 1);