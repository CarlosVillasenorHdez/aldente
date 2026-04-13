-- ============================================================================
-- RLS TENANT ISOLATION — versión definitiva
-- NOTA: Ejecutar DESPUÉS de 20260420000001_add_tenant_id_missing_tables.sql
-- ============================================================================

-- DROP con CASCADE elimina funciones anteriores y sus dependencias
DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS set_tenant_context(uuid) CASCADE;
DROP FUNCTION IF EXISTS set_tenant_context(text) CASCADE;

-- Función que lee el tenant activo de la sesión (devuelve TEXT)
CREATE FUNCTION current_tenant_id()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')
$$;

-- RPC: el cliente llama esto justo después del login
CREATE FUNCTION set_tenant_context(p_tenant_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id, false);
END;
$$;

GRANT EXECUTE ON FUNCTION set_tenant_context(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION current_tenant_id()       TO anon, authenticated;

-- ── Eliminar TODAS las políticas existentes en estas tablas ──────────────────
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

-- ── Una política por tabla: tenant_id::text = current_tenant_id() ─────────────
ALTER TABLE IF EXISTS public.dishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_dishes" ON public.dishes
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_ingredients" ON public.ingredients
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_employees" ON public.employees
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_restaurant_tables" ON public.restaurant_tables
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_orders" ON public.orders
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_order_items" ON public.order_items
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_stock_movements" ON public.stock_movements
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.dish_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_dish_recipes" ON public.dish_recipes
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.unit_equivalences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_unit_equivalences" ON public.unit_equivalences
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.gastos_recurrentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_gastos_recurrentes" ON public.gastos_recurrentes
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.gastos_pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_gastos_pagos" ON public.gastos_pagos
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.depreciaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_depreciaciones" ON public.depreciaciones
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_system_config" ON public.system_config
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.printer_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_printer_config" ON public.printer_config
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_branches" ON public.branches
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.combos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_combos" ON public.combos
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_reservations" ON public.reservations
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.restaurant_layout ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_restaurant_layout" ON public.restaurant_layout
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.loyalty_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_loyalty_customers" ON public.loyalty_customers
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_loyalty_transactions" ON public.loyalty_transactions
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.cortes_caja ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_cortes_caja" ON public.cortes_caja
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.delivery_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_delivery_orders" ON public.delivery_orders
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_audit_log" ON public.audit_log
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.employee_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_employee_shifts" ON public.employee_shifts
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.employee_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_employee_attendance" ON public.employee_attendance
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.rh_vacaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_rh_vacaciones" ON public.rh_vacaciones
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.rh_permisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_rh_permisos" ON public.rh_permisos
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.rh_tiempos_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_rh_tiempos_extras" ON public.rh_tiempos_extras
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_app_users" ON public.app_users
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

ALTER TABLE IF EXISTS public.onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_onboarding_progress" ON public.onboarding_progress
  FOR ALL TO public
  USING  (tenant_id::text = current_tenant_id())
  WITH CHECK (tenant_id::text = current_tenant_id());

-- tenants: filtrado por id (es la PK, no hay tenant_id)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_tenants_select" ON public.tenants
  FOR SELECT TO public
  USING (id::text = current_tenant_id());
CREATE POLICY "rls_tenants_update" ON public.tenants
  FOR UPDATE TO public
  USING  (id::text = current_tenant_id())
  WITH CHECK (id::text = current_tenant_id());

-- role_permissions: tabla global de configuración de roles,
-- cualquier sesión con tenant activo puede leerla
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_role_permissions_read" ON public.role_permissions
  FOR SELECT TO public
  USING (current_tenant_id() IS NOT NULL);
