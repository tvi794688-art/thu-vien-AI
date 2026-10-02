CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reader_type text;
BEGIN
  v_reader_type := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'reader_type'), ''),
    'student'
  );

  IF v_reader_type NOT IN (
    'student',
    'teacher',
    'staff',
    'guest'
  ) THEN
    RAISE EXCEPTION 'Loại độc giả không hợp lệ.';
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    reader_type,
    card_status
  )
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(BTRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      'Người dùng mới'
    ),
    NEW.email,
    'reader',
    v_reader_type,
    'active'
  );

  RETURN NEW;
END;
$function$;