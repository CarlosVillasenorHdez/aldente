-- ============================================================================
-- MIGRACIÓN: RLS real por tenant_id — versión corregida
-- Hace DROP IF EXISTS de TODOS los nombres de política posibles antes de crear.
-- APLICAR EN: Supabase Dashboard → SQL Editor → Run
-- ============================================================================

-- Helper: devuelve el tenant_id activo en esta sesión
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

-- RPC que llama el cliente después del login para activar RLS
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
END;
$$;

GRANT EXECUTE ON FUNCTION set_tenant_context(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION current_tenant_id() TO anon, authenticated;

-- ── dishes ──
ALTER TABLE IF EXISTS public.dishes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access_dishes" ON public.dishes;
DROP POLICY IF EXISTS "superadmin_all_dishes" ON public.dishes;
DROP POLICY IF EXISTS "tenant_isolation_dishes" ON public.dishes;
CREATE POLICY "tenant_isolation_dishes" ON public.dishes
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── ingredients ──
ALTER TABLE IF EXISTS public.ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access_ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "tenant_isolation_ingredients" ON public.ingredients;
CREATE POLICY "tenant_isolation_ingredients" ON public.ingredients
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── employees ──
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access_employees" ON public.employees;
DROP POLICY IF EXISTS "tenant_isolation_employees" ON public.employees;
CREATE POLICY "tenant_isolation_employees" ON public.employees
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── restaurant_tables ──
ALTER TABLE IF EXISTS public.restaurant_tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access_restaurant_tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "tenant_isolation_restaurant_tables" ON public.restaurant_tables;
CREATE POLICY "tenant_isolation_restaurant_tables" ON public.restaurant_tables
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── orders ──
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access_orders" ON public.orders;
DROP POLICY IF EXISTS "superadmin_all_orders" ON public.orders;
DROP POLICY IF EXISTS "tenant_isolation_orders" ON public.orders;
CREATE POLICY "tenant_isolation_orders" ON public.orders
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── order_items ──
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access_order_items" ON public.order_items;
DROP POLICY IF EXISTS "tenant_isolation_order_items" ON public.order_items;
CREATE POLICY "tenant_isolation_order_items" ON public.order_items
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── stock_movements ──
ALTER TABLE IF EXISTS public.stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access_stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "tenant_isolation_stock_movements" ON public.stock_movements;
CREATE POLICY "tenant_isolation_stock_movements" ON public.stock_movements
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── dish_recipes ──
ALTER TABLE IF EXISTS public.dish_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access_dish_recipes" ON public.dish_recipes;
DROP POLICY IF EXISTS "tenant_isolation_dish_recipes" ON public.dish_recipes;
CREATE POLICY "tenant_isolation_dish_recipes" ON public.dish_recipes
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── unit_equivalences ──
ALTER TABLE IF EXISTS public.unit_equivalences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access_unit_equivalences" ON public.unit_equivalences;
DROP POLICY IF EXISTS "tenant_isolation_unit_equivalences" ON public.unit_equivalences;
CREATE POLICY "tenant_isolation_unit_equivalences" ON public.unit_equivalences
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── gastos_recurrentes ──
ALTER TABLE IF EXISTS public.gastos_recurrentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_gastos_recurrentes" ON public.gastos_recurrentes;
DROP POLICY IF EXISTS "tenant_isolation_gastos_recurrentes" ON public.gastos_recurrentes;
CREATE POLICY "tenant_isolation_gastos_recurrentes" ON public.gastos_recurrentes
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── gastos_pagos ──
ALTER TABLE IF EXISTS public.gastos_pagos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_gastos_pagos" ON public.gastos_pagos;
DROP POLICY IF EXISTS "tenant_isolation_gastos_pagos" ON public.gastos_pagos;
CREATE POLICY "tenant_isolation_gastos_pagos" ON public.gastos_pagos
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── depreciaciones ──
ALTER TABLE IF EXISTS public.depreciaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_depreciaciones" ON public.depreciaciones;
DROP POLICY IF EXISTS "tenant_isolation_depreciaciones" ON public.depreciaciones;
CREATE POLICY "tenant_isolation_depreciaciones" ON public.depreciaciones
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── system_config ──
ALTER TABLE IF EXISTS public.system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_manage_system_config" ON public.system_config;
DROP POLICY IF EXISTS "superadmin_all_system_config" ON public.system_config;
DROP POLICY IF EXISTS "tenant_isolation_system_config" ON public.system_config;
CREATE POLICY "tenant_isolation_system_config" ON public.system_config
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── branches ──
ALTER TABLE IF EXISTS public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branches_auth" ON public.branches;
DROP POLICY IF EXISTS "superadmin_all_branches" ON public.branches;
DROP POLICY IF EXISTS "tenant_isolation_branches" ON public.branches;
CREATE POLICY "tenant_isolation_branches" ON public.branches
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── combos ──
ALTER TABLE IF EXISTS public.combos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_combos" ON public.combos;
DROP POLICY IF EXISTS "tenant_isolation_combos" ON public.combos;
CREATE POLICY "tenant_isolation_combos" ON public.combos
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── reservations ──
ALTER TABLE IF EXISTS public.reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reservations_auth" ON public.reservations;
DROP POLICY IF EXISTS "tenant_isolation_reservations" ON public.reservations;
CREATE POLICY "tenant_isolation_reservations" ON public.reservations
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── restaurant_layout ──
ALTER TABLE IF EXISTS public.restaurant_layout ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "restaurant_layout_all" ON public.restaurant_layout;
DROP POLICY IF EXISTS "tenant_isolation_restaurant_layout" ON public.restaurant_layout;
CREATE POLICY "tenant_isolation_restaurant_layout" ON public.restaurant_layout
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── printer_config ──
ALTER TABLE IF EXISTS public.printer_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_manage_printer_config" ON public.printer_config;
DROP POLICY IF EXISTS "tenant_isolation_printer_config" ON public.printer_config;
CREATE POLICY "tenant_isolation_printer_config" ON public.printer_config
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── loyalty_customers ──
ALTER TABLE IF EXISTS public.loyalty_customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loyalty_customers_auth" ON public.loyalty_customers;
DROP POLICY IF EXISTS "tenant_isolation_loyalty_customers" ON public.loyalty_customers;
CREATE POLICY "tenant_isolation_loyalty_customers" ON public.loyalty_customers
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── loyalty_transactions ──
ALTER TABLE IF EXISTS public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loyalty_transactions_auth" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "tenant_isolation_loyalty_transactions" ON public.loyalty_transactions;
CREATE POLICY "tenant_isolation_loyalty_transactions" ON public.loyalty_transactions
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── cortes_caja ──
ALTER TABLE IF EXISTS public.cortes_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_cortes_caja" ON public.cortes_caja;
DROP POLICY IF EXISTS "tenant_isolation_cortes_caja" ON public.cortes_caja;
CREATE POLICY "tenant_isolation_cortes_caja" ON public.cortes_caja
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── delivery_orders ──
ALTER TABLE IF EXISTS public.delivery_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "delivery_orders_auth" ON public.delivery_orders;
DROP POLICY IF EXISTS "tenant_isolation_delivery_orders" ON public.delivery_orders;
CREATE POLICY "tenant_isolation_delivery_orders" ON public.delivery_orders
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── audit_log ──
ALTER TABLE IF EXISTS public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "tenant_isolation_audit_log" ON public.audit_log;
CREATE POLICY "tenant_isolation_audit_log" ON public.audit_log
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── employee_shifts ──
ALTER TABLE IF EXISTS public.employee_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read employee_shifts" ON public.employee_shifts;
DROP POLICY IF EXISTS "Allow authenticated write employee_shifts" ON public.employee_shifts;
DROP POLICY IF EXISTS "tenant_isolation_employee_shifts" ON public.employee_shifts;
CREATE POLICY "tenant_isolation_employee_shifts" ON public.employee_shifts
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── employee_attendance ──
ALTER TABLE IF EXISTS public.employee_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_employee_attendance" ON public.employee_attendance;
DROP POLICY IF EXISTS "tenant_isolation_employee_attendance" ON public.employee_attendance;
CREATE POLICY "tenant_isolation_employee_attendance" ON public.employee_attendance
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── rh_vacaciones ──
ALTER TABLE IF EXISTS public.rh_vacaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rh_vacaciones_all" ON public.rh_vacaciones;
DROP POLICY IF EXISTS "tenant_isolation_rh_vacaciones" ON public.rh_vacaciones;
CREATE POLICY "tenant_isolation_rh_vacaciones" ON public.rh_vacaciones
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── rh_permisos ──
ALTER TABLE IF EXISTS public.rh_permisos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rh_permisos_all" ON public.rh_permisos;
DROP POLICY IF EXISTS "tenant_isolation_rh_permisos" ON public.rh_permisos;
CREATE POLICY "tenant_isolation_rh_permisos" ON public.rh_permisos
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── rh_tiempos_extras ──
ALTER TABLE IF EXISTS public.rh_tiempos_extras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rh_tiempos_extras_all" ON public.rh_tiempos_extras;
DROP POLICY IF EXISTS "tenant_isolation_rh_tiempos_extras" ON public.rh_tiempos_extras;
CREATE POLICY "tenant_isolation_rh_tiempos_extras" ON public.rh_tiempos_extras
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── rh_incapacidades ──
ALTER TABLE IF EXISTS public.rh_incapacidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_rh_incapacidades" ON public.rh_incapacidades;
CREATE POLICY "tenant_isolation_rh_incapacidades" ON public.rh_incapacidades
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── app_users ──
ALTER TABLE IF EXISTS public.app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON public.app_users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.app_users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.app_users;
DROP POLICY IF EXISTS "Admins can update users" ON public.app_users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.app_users;
DROP POLICY IF EXISTS "admin_write_app_users" ON public.app_users;
DROP POLICY IF EXISTS "anon_read_app_users_login" ON public.app_users;
DROP POLICY IF EXISTS "public_read_app_users_for_login" ON public.app_users;
DROP POLICY IF EXISTS "Public can read active workers for login" ON public.app_users;
DROP POLICY IF EXISTS "superadmin_all_app_users" ON public.app_users;
DROP POLICY IF EXISTS "tenant_isolation_app_users" ON public.app_users;
CREATE POLICY "tenant_isolation_app_users" ON public.app_users
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── onboarding_progress ──
ALTER TABLE IF EXISTS public.onboarding_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "onboarding_progress_auth" ON public.onboarding_progress;
DROP POLICY IF EXISTS "tenant_isolation_onboarding_progress" ON public.onboarding_progress;
CREATE POLICY "tenant_isolation_onboarding_progress" ON public.onboarding_progress
  FOR ALL TO public
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ── tenants (cada tenant solo ve su propio registro) ──
DROP POLICY IF EXISTS "open_access_tenants" ON public.tenants;
DROP POLICY IF EXISTS "anon_read_active_tenants" ON public.tenants;
DROP POLICY IF EXISTS "public_read_tenants" ON public.tenants;
DROP POLICY IF EXISTS "superadmin_all_tenants" ON public.tenants;
DROP POLICY IF EXISTS "superadmin_write_tenants" ON public.tenants;
DROP POLICY IF EXISTS "tenant_reads_own" ON public.tenants;
DROP POLICY IF EXISTS "tenant_updates_own" ON public.tenants;

CREATE POLICY "tenant_reads_own" ON public.tenants
  FOR SELECT TO public
  USING (id = current_tenant_id());

CREATE POLICY "tenant_updates_own" ON public.tenants
  FOR UPDATE TO public
  USING (id = current_tenant_id())
  WITH CHECK (id = current_tenant_id());

-- ── role_permissions (lectura para cualquier tenant autenticado) ──
DROP POLICY IF EXISTS "read_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "all_read_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "admin_write_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "authenticated_manage_role_permissions" ON public.role_permissions;

CREATE POLICY "read_role_permissions" ON public.role_permissions
  FOR SELECT TO public
  USING (current_tenant_id() IS NOT NULL);

-- ── demo_requests (escritura pública, sin tenant) ──
-- Sin cambios — intencional

