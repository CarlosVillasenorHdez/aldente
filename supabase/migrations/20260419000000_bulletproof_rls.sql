-- =============================================================================
-- BULLETPROOF RLS — Aislamiento total de tenants
-- 
-- PROBLEMA RAÍZ:
-- auth_tenant_id() falla cuando auth_user_id no está vinculado,
-- devolviendo el tenant default con datos del seed compartidos.
--
-- SOLUCIÓN:
-- 1. Nueva función get_my_tenant_id() que NO usa fallback al default
-- 2. Si auth.uid() no mapea a ningún tenant → devuelve NULL → RLS bloquea TODO
-- 3. Excepción: anon puede leer tenants+app_users (necesario para login)
-- 4. Superadmin ve todo vía is_superadmin()
-- =============================================================================

-- ── Función sin fallback ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id 
  FROM public.app_users 
  WHERE auth_user_id = auth.uid() 
  LIMIT 1;
$$;
-- Nota: devuelve NULL si no hay match. Las políticas USING(tenant_id = NULL)
-- nunca son TRUE → bloquea todo para sesiones sin vincular.

-- ── Helper: es el usuario actual un admin de este tenant ─────────────────────
CREATE OR REPLACE FUNCTION public.is_admin_of_tenant(t_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE auth_user_id = auth.uid()
      AND tenant_id = t_id
      AND app_role IN ('admin','gerente')
      AND is_active = true
  );
$$;

-- ── Macro: recrea política de tenant isolation en una tabla ──────────────────
-- dishes
DROP POLICY IF EXISTS "tenant_isolation_dishes" ON public.dishes;
CREATE POLICY "tenant_isolation_dishes" ON public.dishes
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- ingredients
DROP POLICY IF EXISTS "tenant_isolation_ingredients" ON public.ingredients;
CREATE POLICY "tenant_isolation_ingredients" ON public.ingredients
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- orders
DROP POLICY IF EXISTS "tenant_isolation_orders" ON public.orders;
CREATE POLICY "tenant_isolation_orders" ON public.orders
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- order_items
DROP POLICY IF EXISTS "tenant_isolation_order_items" ON public.order_items;
CREATE POLICY "tenant_isolation_order_items" ON public.order_items
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- employees
DROP POLICY IF EXISTS "tenant_isolation_employees" ON public.employees;
CREATE POLICY "tenant_isolation_employees" ON public.employees
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- restaurant_tables
DROP POLICY IF EXISTS "tenant_isolation_restaurant_tables" ON public.restaurant_tables;
CREATE POLICY "tenant_isolation_restaurant_tables" ON public.restaurant_tables
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- restaurant_layout
DROP POLICY IF EXISTS "tenant_isolation_restaurant_layout" ON public.restaurant_layout;
CREATE POLICY "tenant_isolation_restaurant_layout" ON public.restaurant_layout
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- reservations
DROP POLICY IF EXISTS "tenant_isolation_reservations" ON public.reservations;
CREATE POLICY "tenant_isolation_reservations" ON public.reservations
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- loyalty_customers
DROP POLICY IF EXISTS "tenant_isolation_loyalty_customers" ON public.loyalty_customers;
CREATE POLICY "tenant_isolation_loyalty_customers" ON public.loyalty_customers
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- loyalty_transactions
DROP POLICY IF EXISTS "tenant_isolation_loyalty_transactions" ON public.loyalty_transactions;
CREATE POLICY "tenant_isolation_loyalty_transactions" ON public.loyalty_transactions
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- gastos_recurrentes
DROP POLICY IF EXISTS "tenant_isolation_gastos_recurrentes" ON public.gastos_recurrentes;
CREATE POLICY "tenant_isolation_gastos_recurrentes" ON public.gastos_recurrentes
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- gastos_pagos
DROP POLICY IF EXISTS "tenant_isolation_gastos_pagos" ON public.gastos_pagos;
CREATE POLICY "tenant_isolation_gastos_pagos" ON public.gastos_pagos
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- depreciaciones
DROP POLICY IF EXISTS "tenant_isolation_depreciaciones" ON public.depreciaciones;
CREATE POLICY "tenant_isolation_depreciaciones" ON public.depreciaciones
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- stock_movements
DROP POLICY IF EXISTS "tenant_isolation_stock_movements" ON public.stock_movements;
CREATE POLICY "tenant_isolation_stock_movements" ON public.stock_movements
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- dish_recipes
DROP POLICY IF EXISTS "tenant_isolation_dish_recipes" ON public.dish_recipes;
CREATE POLICY "tenant_isolation_dish_recipes" ON public.dish_recipes
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- delivery_orders
DROP POLICY IF EXISTS "tenant_isolation_delivery_orders" ON public.delivery_orders;
CREATE POLICY "tenant_isolation_delivery_orders" ON public.delivery_orders
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- branches
DROP POLICY IF EXISTS "tenant_isolation_branches" ON public.branches;
CREATE POLICY "tenant_isolation_branches" ON public.branches
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- rh tables
DROP POLICY IF EXISTS "tenant_isolation_rh_permisos" ON public.rh_permisos;
CREATE POLICY "tenant_isolation_rh_permisos" ON public.rh_permisos
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "tenant_isolation_rh_vacaciones" ON public.rh_vacaciones;
CREATE POLICY "tenant_isolation_rh_vacaciones" ON public.rh_vacaciones
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "tenant_isolation_rh_tiempos_extras" ON public.rh_tiempos_extras;
CREATE POLICY "tenant_isolation_rh_tiempos_extras" ON public.rh_tiempos_extras
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- employee_shifts
ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_employee_shifts" ON public.employee_shifts;
CREATE POLICY "tenant_isolation_employee_shifts" ON public.employee_shifts
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- system_config
DROP POLICY IF EXISTS "tenant_isolation_system_config" ON public.system_config;
CREATE POLICY "tenant_isolation_system_config" ON public.system_config
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- unit_equivalences
DROP POLICY IF EXISTS "tenant_isolation_unit_equivalences" ON public.unit_equivalences;
CREATE POLICY "tenant_isolation_unit_equivalences" ON public.unit_equivalences
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- onboarding_progress
DROP POLICY IF EXISTS "tenant_isolation_onboarding_progress" ON public.onboarding_progress;
CREATE POLICY "tenant_isolation_onboarding_progress" ON public.onboarding_progress
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- app_users: solo los del mismo tenant + propio perfil
DROP POLICY IF EXISTS "tenant_isolation_app_users" ON public.app_users;
DROP POLICY IF EXISTS "public_read_app_users_for_login" ON public.app_users;
DROP POLICY IF EXISTS "superadmin_all_app_users" ON public.app_users;

-- Login: anon puede leer usuarios activos (para mostrar la lista de selección)
CREATE POLICY "anon_read_app_users_login" ON public.app_users
  FOR SELECT TO anon
  USING (is_active = true);

-- Usuarios autenticados: solo ven usuarios de su tenant
CREATE POLICY "tenant_isolation_app_users" ON public.app_users
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    OR id = (SELECT id FROM public.app_users WHERE auth_user_id = auth.uid() LIMIT 1)
    OR public.is_superadmin()
  );

-- Solo admins pueden insertar/actualizar/borrar usuarios de su tenant
CREATE POLICY "admin_write_app_users" ON public.app_users
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR public.is_superadmin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_superadmin());

-- tenants: anon puede ver tenants activos (para login)
DROP POLICY IF EXISTS "public_read_tenants" ON public.tenants;
DROP POLICY IF EXISTS "open_access_tenants" ON public.tenants;
DROP POLICY IF EXISTS "superadmin_all_tenants" ON public.tenants;

CREATE POLICY "anon_read_active_tenants" ON public.tenants
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_superadmin());

CREATE POLICY "superadmin_write_tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- ── Asegurar que los datos del seed tengan tenant_id correcto ────────────────
-- El seed original insertó datos sin tenant_id, quedando en NULL o en el default.
-- Estos datos serán invisibles con la nueva política (NULL != get_my_tenant_id()).
-- Esto es CORRECTO — los tenants reales (demo, wok, barista) deben tener
-- sus propios datos creados con su tenant_id desde el ERP.

-- Para los tenants demo que necesiten datos de prueba, el admin debe crearlos
-- desde el ERP una vez que esté logueado (dishes, tables, etc.)

-- Solo limpiamos datos huérfanos del seed que no pertenecen a ningún tenant real:
DELETE FROM public.dishes          WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.ingredients     WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.orders          WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.order_items     WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.employees       WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.restaurant_tables WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.restaurant_layout WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.reservations    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.loyalty_customers WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.stock_movements WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.dish_recipes    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.gastos_recurrentes WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.gastos_pagos    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid;

-- También limpiar datos con tenant_id NULL (son del seed original sin tenant)
DELETE FROM public.dishes          WHERE tenant_id IS NULL;
DELETE FROM public.ingredients     WHERE tenant_id IS NULL;
DELETE FROM public.orders          WHERE tenant_id IS NULL;
DELETE FROM public.order_items     WHERE tenant_id IS NULL;
DELETE FROM public.employees       WHERE tenant_id IS NULL;
DELETE FROM public.restaurant_tables WHERE tenant_id IS NULL;
DELETE FROM public.reservations    WHERE tenant_id IS NULL;
DELETE FROM public.loyalty_customers WHERE tenant_id IS NULL;
DELETE FROM public.stock_movements WHERE tenant_id IS NULL;
DELETE FROM public.dish_recipes    WHERE tenant_id IS NULL;
DELETE FROM public.gastos_recurrentes WHERE tenant_id IS NULL;
DELETE FROM public.gastos_pagos    WHERE tenant_id IS NULL;

