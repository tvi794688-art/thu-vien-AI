-- Add protected account management without changing the existing role values.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_account_status_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_status_check
      CHECK (account_status IN ('active', 'locked'));
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.account_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  operation text NOT NULL CHECK (operation IN ('role_changed', 'account_locked', 'account_unlocked', 'account_created')),
  old_role text NOT NULL,
  new_role text NOT NULL,
  old_account_status text NOT NULL,
  new_account_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_admin_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS account_admin_audit_admin_read ON public.account_admin_audit;
CREATE POLICY account_admin_audit_admin_read ON public.account_admin_audit
  FOR SELECT TO authenticated USING (public.is_admin());
REVOKE ALL ON public.account_admin_audit FROM anon, authenticated;
GRANT SELECT ON public.account_admin_audit TO authenticated;

CREATE OR REPLACE FUNCTION public.is_account_active()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND account_status = 'active'
  );
$$;

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
      AND account_status = 'active'
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
    WHERE id = auth.uid() AND account_status = 'active' AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS insert_profile ON public.profiles;
CREATE POLICY insert_profile ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = id AND role = 'reader' AND card_status = 'active' AND account_status = 'active'
  );

DROP POLICY IF EXISTS update_profiles ON public.profiles;
CREATE POLICY update_profiles ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_account_active() AND (auth.uid() = id OR public.is_staff()))
  WITH CHECK (public.is_account_active() AND (auth.uid() = id OR public.is_staff()));

-- Keep profile reads available to the locked account owner so the app can
-- explain the restriction. Every other catalog/data read requires active status.
DROP POLICY IF EXISTS select_books ON public.books;
DROP POLICY IF EXISTS "Allow public read books" ON public.books;
CREATE POLICY active_accounts_read_books ON public.books
  FOR SELECT TO authenticated USING (public.is_account_active());

DROP POLICY IF EXISTS "Authenticated users can view loans" ON public.loans;
DROP POLICY IF EXISTS select_loans ON public.loans;
CREATE POLICY active_accounts_read_loans ON public.loans
  FOR SELECT TO authenticated USING (
    public.is_account_active() AND (user_id = auth.uid() OR public.is_staff())
  );

DROP POLICY IF EXISTS select_reservations ON public.reservations;
CREATE POLICY active_accounts_read_reservations ON public.reservations
  FOR SELECT TO authenticated USING (
    public.is_account_active() AND (reader_id = auth.uid() OR public.is_staff())
  );

DROP POLICY IF EXISTS select_fines ON public.fines;
CREATE POLICY active_accounts_read_fines ON public.fines
  FOR SELECT TO authenticated USING (
    public.is_account_active() AND (reader_id = auth.uid() OR public.is_staff())
  );

DROP POLICY IF EXISTS select_settings ON public.settings;
CREATE POLICY active_accounts_read_settings ON public.settings
  FOR SELECT TO authenticated USING (public.is_account_active());

-- These SECURITY DEFINER read RPCs bypass table RLS, so they must check the
-- account state themselves as well.
CREATE OR REPLACE FUNCTION public.match_books(
  query_embedding extensions.vector(768),
  match_count integer DEFAULT 10,
  match_threshold double precision DEFAULT 0.50
)
RETURNS TABLE (
  id uuid, book_code text, title text, author text, category text,
  publisher text, publish_year integer, available integer, quantity integer,
  description text, similarity double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.book_code, b.title, b.author, b.category, b.publisher,
         b.publish_year, b.available, b.quantity, b.description,
         1 - (b.embedding OPERATOR(extensions.<=>) query_embedding) AS similarity
  FROM public.books b
  WHERE public.is_account_active()
    AND b.status <> 'archived'
    AND b.embedding IS NOT NULL
    AND 1 - (b.embedding OPERATOR(extensions.<=>) query_embedding) >= match_threshold
  ORDER BY b.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT greatest(match_count, 1);
$$;

CREATE OR REPLACE FUNCTION public.get_popular_books(limit_count integer DEFAULT 10)
RETURNS TABLE (book_id uuid, borrow_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.book_id, count(*) AS borrow_count
  FROM public.loans l
  JOIN public.books b ON b.id = l.book_id
  WHERE public.is_account_active() AND b.status <> 'archived'
  GROUP BY l.book_id
  ORDER BY borrow_count DESC, l.book_id
  LIMIT greatest(limit_count, 1);
$$;

-- Prevent direct profile updates from changing authorization state. The only
-- authenticated path is the admin-only RPC below; service-side maintenance
-- without an end-user JWT remains available to trusted server processes.
CREATE OR REPLACE FUNCTION public.enforce_profile_update_boundary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role text;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF current_setting('app.admin_account_management', true) = 'on' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only an active Admin may manage account roles and status';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    RAISE EXCEPTION 'Role and account status changes must use the Admin account-management operation';
  END IF;

  SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Email identity changes must use a synchronized authentication flow';
  END IF;

  IF v_actor_id = OLD.id THEN
    IF (to_jsonb(NEW) - ARRAY['full_name', 'phone', 'address'])
       IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['full_name', 'phone', 'address']) THEN
      RAISE EXCEPTION 'Only full_name, phone, and address may be changed through self-service';
    END IF;
    RETURN NEW;
  END IF;

  IF v_actor_role = 'admin' THEN
    IF OLD.role NOT IN ('reader', 'librarian') THEN
      RAISE EXCEPTION 'Admin may manage Reader and Librarian profile details only';
    END IF;
    IF (to_jsonb(NEW) - ARRAY['full_name', 'phone', 'address', 'reader_type', 'card_status'])
       IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['full_name', 'phone', 'address', 'reader_type', 'card_status']) THEN
      RAISE EXCEPTION 'Admin cannot change email identity or system-managed profile fields';
    END IF;
    RETURN NEW;
  END IF;

  IF v_actor_role = 'librarian' THEN
    IF OLD.role <> 'reader' THEN
      RAISE EXCEPTION 'Librarians may manage Reader accounts only';
    END IF;
    IF (to_jsonb(NEW) - ARRAY['full_name', 'phone', 'address', 'reader_type', 'card_status'])
       IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['full_name', 'phone', 'address', 'reader_type', 'card_status']) THEN
      RAISE EXCEPTION 'Librarian cannot change email identity or system-managed profile fields';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Profile update is not permitted';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_account(
  p_target_id uuid,
  p_role text,
  p_account_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_old_role text;
  v_old_status text;
  v_active_admin_count bigint;
  v_operation text;
BEGIN
  IF v_actor_id IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an authenticated Admin may manage accounts';
  END IF;
  IF p_role NOT IN ('admin', 'librarian', 'reader') THEN
    RAISE EXCEPTION 'Invalid account role';
  END IF;
  IF p_account_status NOT IN ('active', 'locked') THEN
    RAISE EXCEPTION 'Invalid account status';
  END IF;
  IF p_target_id = v_actor_id THEN
    RAISE EXCEPTION 'You cannot change your own role or account status';
  END IF;

  -- Serialize administrator changes so concurrent requests cannot remove the
  -- final active Admin.
  PERFORM pg_advisory_xact_lock(hashtextextended('public.profiles.admin_account_management', 0));

  SELECT role, account_status INTO v_old_role, v_old_status
  FROM public.profiles WHERE id = p_target_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  IF v_old_role = 'admin' AND v_old_status = 'active'
     AND (p_role <> 'admin' OR p_account_status <> 'active') THEN
    SELECT count(*) INTO v_active_admin_count
    FROM public.profiles WHERE role = 'admin' AND account_status = 'active';
    IF v_active_admin_count <= 1 THEN
      RAISE EXCEPTION 'The last active Admin cannot be demoted or locked';
    END IF;
  END IF;

  IF p_role = v_old_role AND p_account_status = v_old_status THEN
    RETURN;
  END IF;

  PERFORM set_config('app.admin_account_management', 'on', true);
  UPDATE public.profiles
  SET role = p_role, account_status = p_account_status
  WHERE id = p_target_id;

  v_operation := CASE
    WHEN p_account_status <> v_old_status AND p_account_status = 'locked' THEN 'account_locked'
    WHEN p_account_status <> v_old_status AND p_account_status = 'active' THEN 'account_unlocked'
    ELSE 'role_changed'
  END;

  INSERT INTO public.account_admin_audit (
    actor_id, target_id, operation, old_role, new_role, old_account_status, new_account_status
  ) VALUES (
    v_actor_id, p_target_id, v_operation, v_old_role, p_role, v_old_status, p_account_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_account(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_account(uuid, text, text) TO authenticated;

-- Policies protect direct REST access; these triggers also cover security-
-- definer circulation RPCs whose table writes bypass RLS.
CREATE OR REPLACE FUNCTION public.reject_locked_account_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_account_active() THEN
    RAISE EXCEPTION 'This account is locked';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS active_account_loans_write ON public.loans;
CREATE TRIGGER active_account_loans_write BEFORE INSERT OR UPDATE OR DELETE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.reject_locked_account_writes();
DROP TRIGGER IF EXISTS active_account_reservations_write ON public.reservations;
CREATE TRIGGER active_account_reservations_write BEFORE INSERT OR UPDATE OR DELETE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.reject_locked_account_writes();
DROP TRIGGER IF EXISTS active_account_fines_write ON public.fines;
CREATE TRIGGER active_account_fines_write BEFORE INSERT OR UPDATE OR DELETE ON public.fines
  FOR EACH ROW EXECUTE FUNCTION public.reject_locked_account_writes();
DROP TRIGGER IF EXISTS active_account_books_write ON public.books;
CREATE TRIGGER active_account_books_write BEFORE INSERT OR UPDATE OR DELETE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.reject_locked_account_writes();
DROP TRIGGER IF EXISTS active_account_settings_write ON public.settings;
CREATE TRIGGER active_account_settings_write BEFORE INSERT OR UPDATE OR DELETE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.reject_locked_account_writes();

