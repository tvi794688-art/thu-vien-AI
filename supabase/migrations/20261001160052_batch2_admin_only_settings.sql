-- Batch 2: Admin-only Settings

DROP POLICY IF EXISTS "staff_update_settings" ON public.settings;
CREATE POLICY "admin_update_settings"
ON public.settings
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "staff_insert_settings" ON public.settings;
CREATE POLICY "admin_insert_settings"
ON public.settings
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());