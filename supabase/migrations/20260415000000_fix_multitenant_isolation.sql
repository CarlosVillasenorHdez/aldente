-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Fix multi-tenant isolation
-- Problems fixed:
--   1. restaurant_tables.number UNIQUE is global — breaks multi-tenant
--   2. RLS policies use USING(true) — no actual data isolation
--   3. Several composite UNIQUEs need tenant scope
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Fix restaurant_tables.number UNIQUE constraint ──────────────────────
-- Remove global UNIQUE on number, replace with (number, tenant_id, branch_id)
-- This allows Mesa 1 to exist in Restaurant A AND Restaurant B AND each branch

ALTER TABLE public.restaurant_tables
  DROP CONSTRAINT IF EXISTS restaurant_tables_number_key;

-- New composite unique: same number can exist in different tenants/branches
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_tables_number_tenant_branch
  ON public.restaurant_tables (number, tenant_id, branch_id)
  WHERE branch_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_tables_number_tenant_nobranch
  ON public.restaurant_tables (number, tenant_id)
  WHERE branch_id IS NULL;

-- ─── 1b. Fix system_config config_key UNIQUE constraint ─────────────────────
-- Remove global UNIQUE on config_key, replace with (tenant_id, config_key)
-- This allows each tenant to have their own restaurant_name, currency, etc.

ALTER TABLE public.system_config
  DROP CONSTRAINT IF EXISTS system_config_config_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_system_config_tenant_config_key
  ON public.system_config (tenant_id, config_key);

-- ─── 1c. Fix app_users username UNIQUE constraint ────────────────────────────
-- Remove global UNIQUE on username, replace with (tenant_id, username)
-- This allows each tenant to have their own 'admin', 'mesero', etc. usernames

ALTER TABLE public.app_users
  DROP CONSTRAINT IF EXISTS app_users_username_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_tenant_username
  ON public.app_users (tenant_id, username);

-- ─── 2. Fix RLS policies — real tenant isolation ─────────────────────────────
-- The auth_tenant_id() function already exists and returns the tenant for the
-- current user. We just need to activate it in every USING clause.

-- Helper: make sure auth_tenant_id() handles anonymous/service role gracefully
CREATE OR REPLACE FUNCTION public.auth_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM public.app_users WHERE auth_user_id = auth.uid() LIMIT 1),
    '00000000-0000-0000-0000-000000000001'::uuid
  );
$$;

-- ─── Drop all existing open policies and replace with tenant-scoped ones ─────

-- dishes
DROP POLICY IF EXISTS "tenant_isolation_dishes" ON public.dishes;
CREATE POLICY "tenant_isolation_dishes" ON public.dishes
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- ingredients
DROP POLICY IF EXISTS "tenant_isolation_ingredients" ON public.ingredients;
CREATE POLICY "tenant_isolation_ingredients" ON public.ingredients
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- employees
DROP POLICY IF EXISTS "tenant_isolation_employees" ON public.employees;
CREATE POLICY "tenant_isolation_employees" ON public.employees
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- restaurant_tables
DROP POLICY IF EXISTS "tenant_isolation_restaurant_tables" ON public.restaurant_tables;
CREATE POLICY "tenant_isolation_restaurant_tables" ON public.restaurant_tables
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- orders
DROP POLICY IF EXISTS "tenant_isolation_orders" ON public.orders;
CREATE POLICY "tenant_isolation_orders" ON public.orders
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- order_items
DROP POLICY IF EXISTS "tenant_isolation_order_items" ON public.order_items;
CREATE POLICY "tenant_isolation_order_items" ON public.order_items
  FOR ALL TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE tenant_id = public.auth_tenant_id()
    )
  );

-- stock_movements
DROP POLICY IF EXISTS "tenant_isolation_stock_movements" ON public.stock_movements;
CREATE POLICY "tenant_isolation_stock_movements" ON public.stock_movements
  FOR ALL TO authenticated
  USING (
    ingredient_id IN (
      SELECT id FROM public.ingredients WHERE tenant_id = public.auth_tenant_id()
    )
  );

-- dish_recipes
DROP POLICY IF EXISTS "tenant_isolation_dish_recipes" ON public.dish_recipes;
CREATE POLICY "tenant_isolation_dish_recipes" ON public.dish_recipes
  FOR ALL TO authenticated
  USING (
    dish_id IN (
      SELECT id FROM public.dishes WHERE tenant_id = public.auth_tenant_id()
    )
  );

-- unit_equivalences
DROP POLICY IF EXISTS "open_access_unit_equivalences" ON public.unit_equivalences;
DROP POLICY IF EXISTS "tenant_isolation_unit_equivalences" ON public.unit_equivalences;
CREATE POLICY "tenant_isolation_unit_equivalences" ON public.unit_equivalences
  FOR ALL TO authenticated
  USING (
    ingredient_id IN (
      SELECT id FROM public.ingredients WHERE tenant_id = public.auth_tenant_id()
    )
  );

-- gastos_recurrentes
DROP POLICY IF EXISTS "tenant_isolation_gastos_recurrentes" ON public.gastos_recurrentes;
CREATE POLICY "tenant_isolation_gastos_recurrentes" ON public.gastos_recurrentes
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- gastos_pagos (linked through gastos_recurrentes)
DROP POLICY IF EXISTS "tenant_isolation_gastos_pagos" ON public.gastos_pagos;
CREATE POLICY "tenant_isolation_gastos_pagos" ON public.gastos_pagos
  FOR ALL TO authenticated
  USING (
    gasto_id IN (
      SELECT id FROM public.gastos_recurrentes WHERE tenant_id = public.auth_tenant_id()
    )
  );

-- depreciaciones
DROP POLICY IF EXISTS "tenant_isolation_depreciaciones" ON public.depreciaciones;
CREATE POLICY "tenant_isolation_depreciaciones" ON public.depreciaciones
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- loyalty_customers
DROP POLICY IF EXISTS "tenant_isolation_loyalty_customers" ON public.loyalty_customers;
CREATE POLICY "tenant_isolation_loyalty_customers" ON public.loyalty_customers
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- loyalty_transactions
DROP POLICY IF EXISTS "tenant_isolation_loyalty_transactions" ON public.loyalty_transactions;
CREATE POLICY "tenant_isolation_loyalty_transactions" ON public.loyalty_transactions
  FOR ALL TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM public.loyalty_customers WHERE tenant_id = public.auth_tenant_id()
    )
  );

-- reservations
DROP POLICY IF EXISTS "tenant_isolation_reservations" ON public.reservations;
CREATE POLICY "tenant_isolation_reservations" ON public.reservations
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- delivery_orders
DROP POLICY IF EXISTS "tenant_isolation_delivery_orders" ON public.delivery_orders;
CREATE POLICY "tenant_isolation_delivery_orders" ON public.delivery_orders
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- rh tables
DROP POLICY IF EXISTS "rh_vacaciones_all" ON public.rh_vacaciones;
DROP POLICY IF EXISTS "tenant_isolation_rh_vacaciones" ON public.rh_vacaciones;
CREATE POLICY "tenant_isolation_rh_vacaciones" ON public.rh_vacaciones
  FOR ALL TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE tenant_id = public.auth_tenant_id()
    )
  );

DROP POLICY IF EXISTS "rh_permisos_all" ON public.rh_permisos;
DROP POLICY IF EXISTS "tenant_isolation_rh_permisos" ON public.rh_permisos;
CREATE POLICY "tenant_isolation_rh_permisos" ON public.rh_permisos
  FOR ALL TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE tenant_id = public.auth_tenant_id()
    )
  );

DROP POLICY IF EXISTS "rh_tiempos_extras_all" ON public.rh_tiempos_extras;
DROP POLICY IF EXISTS "tenant_isolation_rh_tiempos_extras" ON public.rh_tiempos_extras;
CREATE POLICY "tenant_isolation_rh_tiempos_extras" ON public.rh_tiempos_extras
  FOR ALL TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE tenant_id = public.auth_tenant_id()
    )
  );

-- branches (tenant can see their own branches)
DROP POLICY IF EXISTS "tenant_isolation_branches" ON public.branches;
CREATE POLICY "tenant_isolation_branches" ON public.branches
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- system_config (per tenant)
DROP POLICY IF EXISTS "tenant_isolation_system_config" ON public.system_config;
CREATE POLICY "tenant_isolation_system_config" ON public.system_config
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- app_users: users see only users of their tenant
DROP POLICY IF EXISTS "tenant_isolation_app_users" ON public.app_users;
CREATE POLICY "tenant_isolation_app_users" ON public.app_users
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- ─── 3. Also allow service_role to bypass RLS (for Edge Functions) ───────────
-- Service role already bypasses RLS by default in Supabase, no change needed.

-- ─── 4. Verify: ensure all tenant_id columns are NOT NULL where appropriate ──
-- (soft enforcement — existing NULLs won't break, new rows get tenant via trigger)
COMMENT ON COLUMN public.restaurant_tables.tenant_id IS 'Required. Set automatically by trigger on INSERT.';
COMMENT ON COLUMN public.dishes.tenant_id IS 'Required. Set automatically by trigger on INSERT.';
COMMENT ON COLUMN public.orders.tenant_id IS 'Required. Set automatically by trigger on INSERT.';
COMMENT ON COLUMN public.employees.tenant_id IS 'Required. Set automatically by trigger on INSERT.';
COMMENT ON COLUMN public.ingredients.tenant_id IS 'Required. Set automatically by trigger on INSERT.';

