-- ─── SuperAdmin RLS bypass ─────────────────────────────────────────────────
-- The superadmin has no tenant_id, so tenant_isolation policies block them
-- from reading any tenant data. We add PERMISSIVE policies that grant
-- superadmin full access to all tenant data.

-- Helper function: is the current user a superadmin?
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE auth_user_id = auth.uid()
      AND app_role = 'superadmin'
      AND is_active = true
  );
$$;

-- tenants — superadmin can read/write all
DROP POLICY IF EXISTS "superadmin_all_tenants" ON public.tenants;
CREATE POLICY "superadmin_all_tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- app_users — superadmin can read/write all
DROP POLICY IF EXISTS "superadmin_all_app_users" ON public.app_users;
CREATE POLICY "superadmin_all_app_users" ON public.app_users
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- orders — superadmin can read all (for health score / analytics)
DROP POLICY IF EXISTS "superadmin_all_orders" ON public.orders;
CREATE POLICY "superadmin_all_orders" ON public.orders
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- dishes — superadmin can read all
DROP POLICY IF EXISTS "superadmin_all_dishes" ON public.dishes;
CREATE POLICY "superadmin_all_dishes" ON public.dishes
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- branches — superadmin can read all
DROP POLICY IF EXISTS "superadmin_all_branches" ON public.branches;
CREATE POLICY "superadmin_all_branches" ON public.branches
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- system_config — superadmin can read all
DROP POLICY IF EXISTS "superadmin_all_system_config" ON public.system_config;
CREATE POLICY "superadmin_all_system_config" ON public.system_config
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
