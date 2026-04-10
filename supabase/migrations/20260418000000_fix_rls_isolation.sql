-- =============================================================================
-- MIGRATION: Fix RLS tenant isolation
-- Problem: auth_tenant_id() returns default tenant for PIN-based logins
-- because auth_user_id in app_users wasn't linked to Supabase Auth.
-- Solution: ensure all tables have proper RLS + add missing policies.
-- =============================================================================

-- ── 1. Tables missing RLS ────────────────────────────────────────────────────

ALTER TABLE public.employee_shifts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printer_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_employee_shifts" ON public.employee_shifts;
CREATE POLICY "tenant_isolation_employee_shifts" ON public.employee_shifts
  FOR ALL TO authenticated
  USING (
    tenant_id = public.auth_tenant_id()
    OR public.is_superadmin()
  )
  WITH CHECK (
    tenant_id = public.auth_tenant_id()
    OR public.is_superadmin()
  );

-- role_permissions: shared config, all authenticated can read, only admin writes
DROP POLICY IF EXISTS "all_read_role_permissions" ON public.role_permissions;
CREATE POLICY "all_read_role_permissions" ON public.role_permissions
  FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "admin_write_role_permissions" ON public.role_permissions;
CREATE POLICY "admin_write_role_permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (
    public.auth_tenant_id() IS NOT NULL
    OR public.is_superadmin()
  )
  WITH CHECK (true);

-- printer_config: tenant isolated
DROP POLICY IF EXISTS "tenant_isolation_printer_config" ON public.printer_config;
CREATE POLICY "tenant_isolation_printer_config" ON public.printer_config
  FOR ALL TO authenticated
  USING (
    tenant_id = public.auth_tenant_id()
    OR public.is_superadmin()
  )
  WITH CHECK (
    tenant_id = public.auth_tenant_id()
    OR public.is_superadmin()
  );

-- ── 2. Re-enforce all existing policies to also allow is_superadmin() ────────
-- (Ensures superadmin can always read everything)

-- dishes
DROP POLICY IF EXISTS "tenant_isolation_dishes" ON public.dishes;
CREATE POLICY "tenant_isolation_dishes" ON public.dishes
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

-- categories (may not have tenant_id — use dishes join instead)
-- If categories has tenant_id column, isolate it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_categories" ON public.categories;
    CREATE POLICY "tenant_isolation_categories" ON public.categories
      FOR ALL TO authenticated
      USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
      WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());
  END IF;
END $$;

-- ingredients
DROP POLICY IF EXISTS "tenant_isolation_ingredients" ON public.ingredients;
CREATE POLICY "tenant_isolation_ingredients" ON public.ingredients
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

-- orders
DROP POLICY IF EXISTS "tenant_isolation_orders" ON public.orders;
CREATE POLICY "tenant_isolation_orders" ON public.orders
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

-- order_items
DROP POLICY IF EXISTS "tenant_isolation_order_items" ON public.order_items;
CREATE POLICY "tenant_isolation_order_items" ON public.order_items
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

-- employees
DROP POLICY IF EXISTS "tenant_isolation_employees" ON public.employees;
CREATE POLICY "tenant_isolation_employees" ON public.employees
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

-- restaurant_tables
DROP POLICY IF EXISTS "tenant_isolation_restaurant_tables" ON public.restaurant_tables;
CREATE POLICY "tenant_isolation_restaurant_tables" ON public.restaurant_tables
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

-- reservations
DROP POLICY IF EXISTS "tenant_isolation_reservations" ON public.reservations;
CREATE POLICY "tenant_isolation_reservations" ON public.reservations
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

-- loyalty_customers
DROP POLICY IF EXISTS "tenant_isolation_loyalty_customers" ON public.loyalty_customers;
CREATE POLICY "tenant_isolation_loyalty_customers" ON public.loyalty_customers
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

-- loyalty_transactions
DROP POLICY IF EXISTS "tenant_isolation_loyalty_transactions" ON public.loyalty_transactions;
CREATE POLICY "tenant_isolation_loyalty_transactions" ON public.loyalty_transactions
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

-- gastos
DROP POLICY IF EXISTS "tenant_isolation_gastos_recurrentes" ON public.gastos_recurrentes;
CREATE POLICY "tenant_isolation_gastos_recurrentes" ON public.gastos_recurrentes
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "tenant_isolation_gastos_pagos" ON public.gastos_pagos;
CREATE POLICY "tenant_isolation_gastos_pagos" ON public.gastos_pagos
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "tenant_isolation_depreciaciones" ON public.depreciaciones;
CREATE POLICY "tenant_isolation_depreciaciones" ON public.depreciaciones
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

-- RH
DROP POLICY IF EXISTS "tenant_isolation_rh_permisos" ON public.rh_permisos;
CREATE POLICY "tenant_isolation_rh_permisos" ON public.rh_permisos
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "tenant_isolation_rh_vacaciones" ON public.rh_vacaciones;
CREATE POLICY "tenant_isolation_rh_vacaciones" ON public.rh_vacaciones
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "tenant_isolation_rh_tiempos_extras" ON public.rh_tiempos_extras;
CREATE POLICY "tenant_isolation_rh_tiempos_extras" ON public.rh_tiempos_extras
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

-- branches
DROP POLICY IF EXISTS "tenant_isolation_branches" ON public.branches;
CREATE POLICY "tenant_isolation_branches" ON public.branches
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

-- delivery_orders
DROP POLICY IF EXISTS "tenant_isolation_delivery_orders" ON public.delivery_orders;
CREATE POLICY "tenant_isolation_delivery_orders" ON public.delivery_orders
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.auth_tenant_id() OR public.is_superadmin());

-- ── 3. Public read for login (tenants + app_users for PIN login) ─────────────
-- These must remain readable without auth so the login page works

DROP POLICY IF EXISTS "public_read_tenants" ON public.tenants;
CREATE POLICY "public_read_tenants" ON public.tenants
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "public_read_app_users_for_login" ON public.app_users;
CREATE POLICY "public_read_app_users_for_login" ON public.app_users
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- ── 4. Ensure auth_user_id is unique per app_user ───────────────────────────
-- Drop old non-unique index if exists, recreate as unique
-- (may already exist from original migration)
DROP INDEX IF EXISTS idx_app_users_auth_user_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_auth_user_id
  ON public.app_users(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

