-- Batch 1: protect profile identity and authorization fields.

DROP POLICY IF EXISTS "select_profiles" ON public.profiles;
CREATE POLICY "select_profiles" ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
    OR (role = 'reader' AND public.is_staff())
  );

DROP POLICY IF EXISTS "insert_profile" ON public.profiles;
CREATE POLICY "insert_profile" ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND role = 'reader' AND card_status = 'active');

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
  -- Trusted service-side maintenance has no authenticated end-user identity.
  IF v_actor_id IS NULL THEN
    RETURN NEW;
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
      RAISE EXCEPTION 'Admin may manage Reader and Librarian accounts only';
    END IF;
    IF (to_jsonb(NEW) - ARRAY['full_name', 'phone', 'address', 'reader_type', 'card_status', 'role'])
       IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['full_name', 'phone', 'address', 'reader_type', 'card_status', 'role']) THEN
      RAISE EXCEPTION 'Admin cannot change email identity or system-managed profile fields';
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role NOT IN ('reader', 'librarian') THEN
      RAISE EXCEPTION 'Invalid account role';
    END IF;
    RETURN NEW;
  END IF;

  IF v_actor_role = 'librarian' THEN
    IF OLD.role <> 'reader' OR NEW.role IS DISTINCT FROM OLD.role THEN
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

DROP TRIGGER IF EXISTS enforce_profile_update_boundary ON public.profiles;
CREATE TRIGGER enforce_profile_update_boundary
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_update_boundary();
