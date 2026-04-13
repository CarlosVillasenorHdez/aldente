-- ============================================================================
-- MIGRACIÓN: RLS real por tenant_id en todas las tablas críticas
-- 
-- ANTES: USING (true) → cualquier anon key accede a todos los datos
-- DESPUÉS: USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
--          → cada sesión solo ve sus propios datos
--
-- ESTRATEGIA:
--   1. Para tablas con tenant_id: filtro directo por tenant_id
--   2. Para tablas sin tenant_id (app_users, role_permissions): filtro por
--      unión con tenants o por auth.uid()
--   3. SuperAdmin (service_role key) bypasea RLS automáticamente → sin cambios
--
-- APLICAR EN: Supabase Dashboard → SQL Editor → Run
-- ============================================================================

-- Helper function: devuelve el tenant_id de la sesión actual
-- Se establece al inicio de cada request del ERP
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

-- ── TABLAS CON tenant_id DIRECTO ─────────────────────────────────────────────

-- dishes
DROP POLICY IF EXISTS "open_access_dishes" ON public.dishes;
CREATE POLICY "tenant_isolation_dishes" ON public.dishes
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ingredients
DROP POLICY IF EXISTS "open_access_ingredients" ON public.ingredients;
CREATE POLICY "tenant_isolation_ingredients" ON public.ingredients
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- employees
DROP POLICY IF EXISTS "open_access_employees" ON public.employees;
CREATE POLICY "tenant_isolation_employees" ON public.employees
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- restaurant_tables
DROP POLICY IF EXISTS "open_access_restaurant_tables" ON public.restaurant_tables;
CREATE POLICY "tenant_isolation_restaurant_tables" ON public.restaurant_tables
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- orders
DROP POLICY IF EXISTS "open_access_orders" ON public.orders;
CREATE POLICY "tenant_isolation_orders" ON public.orders
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- order_items
DROP POLICY IF EXISTS "open_access_order_items" ON public.order_items;
CREATE POLICY "tenant_isolation_order_items" ON public.order_items
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- stock_movements
DROP POLICY IF EXISTS "open_access_stock_movements" ON public.stock_movements;
CREATE POLICY "tenant_isolation_stock_movements" ON public.stock_movements
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- dish_recipes
DROP POLICY IF EXISTS "open_access_dish_recipes" ON public.dish_recipes;
CREATE POLICY "tenant_isolation_dish_recipes" ON public.dish_recipes
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- unit_equivalences
DROP POLICY IF EXISTS "open_access_unit_equivalences" ON public.unit_equivalences;
CREATE POLICY "tenant_isolation_unit_equivalences" ON public.unit_equivalences
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- gastos_recurrentes
DROP POLICY IF EXISTS "authenticated_gastos_recurrentes" ON public.gastos_recurrentes;
CREATE POLICY "tenant_isolation_gastos_recurrentes" ON public.gastos_recurrentes
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- gastos_pagos
DROP POLICY IF EXISTS "authenticated_gastos_pagos" ON public.gastos_pagos;
CREATE POLICY "tenant_isolation_gastos_pagos" ON public.gastos_pagos
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- depreciaciones
DROP POLICY IF EXISTS "authenticated_depreciaciones" ON public.depreciaciones;
CREATE POLICY "tenant_isolation_depreciaciones" ON public.depreciaciones
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- system_config
DROP POLICY IF EXISTS "open_access_system_config" ON public.system_config;
CREATE POLICY "tenant_isolation_system_config" ON public.system_config
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- branches
DROP POLICY IF EXISTS "open_access_branches" ON public.branches;
CREATE POLICY "tenant_isolation_branches" ON public.branches
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- combos
DROP POLICY IF EXISTS "open_access_combos" ON public.combos;
ALTER TABLE IF EXISTS public.combos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_combos" ON public.combos
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- reservations
DROP POLICY IF EXISTS "open_access_reservations" ON public.reservations;
ALTER TABLE IF EXISTS public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_reservations" ON public.reservations
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- restaurant_layout
DROP POLICY IF EXISTS "open_access_restaurant_layout" ON public.restaurant_layout;
ALTER TABLE IF EXISTS public.restaurant_layout ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_restaurant_layout" ON public.restaurant_layout
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- printer_config
DROP POLICY IF EXISTS "open_access_printer_config" ON public.printer_config;
ALTER TABLE IF EXISTS public.printer_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_printer_config" ON public.printer_config
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- loyalty_customers
DROP POLICY IF EXISTS "open_access_loyalty_customers" ON public.loyalty_customers;
ALTER TABLE IF EXISTS public.loyalty_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_loyalty_customers" ON public.loyalty_customers
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- loyalty_transactions
DROP POLICY IF EXISTS "open_access_loyalty_transactions" ON public.loyalty_transactions;
ALTER TABLE IF EXISTS public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_loyalty_transactions" ON public.loyalty_transactions
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- cortes_caja
DROP POLICY IF EXISTS "open_access_cortes_caja" ON public.cortes_caja;
ALTER TABLE IF EXISTS public.cortes_caja ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_cortes_caja" ON public.cortes_caja
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- delivery_orders
DROP POLICY IF EXISTS "open_access_delivery_orders" ON public.delivery_orders;
ALTER TABLE IF EXISTS public.delivery_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_delivery_orders" ON public.delivery_orders
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- audit_log
DROP POLICY IF EXISTS "open_access_audit_log" ON public.audit_log;
ALTER TABLE IF EXISTS public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_audit_log" ON public.audit_log
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- employee_shifts
DROP POLICY IF EXISTS "open_access_employee_shifts" ON public.employee_shifts;
ALTER TABLE IF EXISTS public.employee_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_employee_shifts" ON public.employee_shifts
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- employee_attendance
DROP POLICY IF EXISTS "open_access_employee_attendance" ON public.employee_attendance;
ALTER TABLE IF EXISTS public.employee_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_employee_attendance" ON public.employee_attendance
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- rh_vacaciones / permisos / tiempos_extras / incapacidades
ALTER TABLE IF EXISTS public.rh_vacaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access_rh_vacaciones" ON public.rh_vacaciones;
CREATE POLICY "tenant_isolation_rh_vacaciones" ON public.rh_vacaciones
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE IF EXISTS public.rh_permisos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access_rh_permisos" ON public.rh_permisos;
CREATE POLICY "tenant_isolation_rh_permisos" ON public.rh_permisos
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE IF EXISTS public.rh_tiempos_extras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access_rh_tiempos_extras" ON public.rh_tiempos_extras;
CREATE POLICY "tenant_isolation_rh_tiempos_extras" ON public.rh_tiempos_extras
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE IF EXISTS public.rh_incapacidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access_rh_incapacidades" ON public.rh_incapacidades;
CREATE POLICY "tenant_isolation_rh_incapacidades" ON public.rh_incapacidades
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- app_users: aislados por tenant_id también
DROP POLICY IF EXISTS "Users can read own profile" ON public.app_users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.app_users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.app_users;
DROP POLICY IF EXISTS "Admins can update users" ON public.app_users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.app_users;
CREATE POLICY "tenant_isolation_app_users" ON public.app_users
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- role_permissions: leídas por cualquier tenant autenticado (son configuración global)
DROP POLICY IF EXISTS "open_access_role_permissions" ON public.role_permissions;
CREATE POLICY "read_role_permissions" ON public.role_permissions
  FOR SELECT TO public
  USING (current_tenant_id() IS NOT NULL);

-- onboarding_progress
DROP POLICY IF EXISTS "open_access_onboarding_progress" ON public.onboarding_progress;
ALTER TABLE IF EXISTS public.onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_onboarding_progress" ON public.onboarding_progress
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- tenants: cada tenant solo lee su propio registro
DROP POLICY IF EXISTS "open_access_tenants" ON public.tenants;
CREATE POLICY "tenant_reads_own" ON public.tenants
  FOR SELECT TO public
  USING (id = current_tenant_id());

CREATE POLICY "tenant_updates_own" ON public.tenants
  FOR UPDATE TO public
  USING (id = current_tenant_id())
  WITH CHECK (id = current_tenant_id());

-- demo_requests: escritura pública (formulario de registro), sin tenant
-- Sin cambios — es intencional que sea pública


-- ============================================================================
-- RPC: set_tenant_context
-- Llamada desde el cliente después del login para activar RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
END;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION set_tenant_context(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION current_tenant_id() TO anon, authenticated;
