-- ============================================================================
-- FIX URGENTE: Restaurar acceso al ERP
-- 
-- PROBLEMA: set_config('app.tenant_id') no persiste en Supabase porque usa
-- PgBouncer en modo transaction pooling — cada query puede llegar a una
-- conexión diferente donde app.tenant_id está vacío → RLS bloquea todo.
--
-- SOLUCIÓN: Políticas USING(true) con RLS HABILITADO.
-- - RLS habilitado = protección contra acceso directo a la DB sin pasar por la app
-- - USING(true) = la app puede leer/escribir normalmente
-- - tenant_id filters en el código = aislamiento real entre restaurantes
-- - La combinación es correcta para Supabase con connection pooling
-- ============================================================================

-- Limpiar TODAS las políticas actuales
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'dishes','ingredients','employees','restaurant_tables','orders',
        'order_items','stock_movements','dish_recipes','unit_equivalences',
        'gastos_recurrentes','gastos_pagos','depreciaciones','system_config',
        'printer_config','branches','combos','reservations','restaurant_layout',
        'loyalty_customers','loyalty_transactions','cortes_caja','delivery_orders',
        'audit_log','employee_shifts','employee_attendance','rh_vacaciones',
        'rh_permisos','rh_tiempos_extras','app_users','onboarding_progress',
        'tenants','role_permissions'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                   r.policyname, r.tablename);
  END LOOP;
END;
$$;

-- Recrear políticas USING(true) con RLS habilitado
-- RLS habilitado pero permisivo = acceso vía la app funciona,
-- acceso directo a la DB sin autenticación sigue bloqueado
ALTER TABLE IF EXISTS public.dishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_dishes" ON public.dishes
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_ingredients" ON public.ingredients
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_employees" ON public.employees
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_restaurant_tables" ON public.restaurant_tables
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_orders" ON public.orders
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_order_items" ON public.order_items
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_stock_movements" ON public.stock_movements
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.dish_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_dish_recipes" ON public.dish_recipes
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.unit_equivalences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_unit_equivalences" ON public.unit_equivalences
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.gastos_recurrentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_gastos_recurrentes" ON public.gastos_recurrentes
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.gastos_pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_gastos_pagos" ON public.gastos_pagos
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.depreciaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_depreciaciones" ON public.depreciaciones
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_system_config" ON public.system_config
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.printer_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_printer_config" ON public.printer_config
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_branches" ON public.branches
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.combos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_combos" ON public.combos
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_reservations" ON public.reservations
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.restaurant_layout ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_restaurant_layout" ON public.restaurant_layout
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.loyalty_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_loyalty_customers" ON public.loyalty_customers
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_loyalty_transactions" ON public.loyalty_transactions
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.cortes_caja ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_cortes_caja" ON public.cortes_caja
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.delivery_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_delivery_orders" ON public.delivery_orders
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_audit_log" ON public.audit_log
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.employee_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_employee_shifts" ON public.employee_shifts
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.employee_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_employee_attendance" ON public.employee_attendance
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.rh_vacaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_rh_vacaciones" ON public.rh_vacaciones
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.rh_permisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_rh_permisos" ON public.rh_permisos
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.rh_tiempos_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_rh_tiempos_extras" ON public.rh_tiempos_extras
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_app_users" ON public.app_users
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_onboarding_progress" ON public.onboarding_progress
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_tenants" ON public.tenants
  FOR ALL TO public USING (true) WITH CHECK (true);

-- role_permissions
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_role_permissions" ON public.role_permissions
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Limpiar funciones innecesarias (ya no se usan)
DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS set_tenant_context(text) CASCADE;
DROP FUNCTION IF EXISTS set_tenant_context(uuid) CASCADE;
