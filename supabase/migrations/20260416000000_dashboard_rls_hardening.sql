-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Dashboard RLS Hardening — prevent data leakage across tenants
-- Adds tenant-scoped RLS policies to tables not covered by the previous migration.
-- Tables covered: cortes_caja, cost_config, audit_log, restaurant_layout,
--                 employee_shifts, rh_incapacidades, onboarding_progress
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Ensure auth_tenant_id() helper exists (idempotent) ──────────────────────
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

-- ─── Enable RLS on tables that may not have it yet ───────────────────────────
ALTER TABLE public.cortes_caja        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_layout  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_shifts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_incapacidades   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- ─── cortes_caja ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_isolation_cortes_caja" ON public.cortes_caja;
CREATE POLICY "tenant_isolation_cortes_caja" ON public.cortes_caja
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- ─── cost_config ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_isolation_cost_config" ON public.cost_config;
CREATE POLICY "tenant_isolation_cost_config" ON public.cost_config
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- ─── audit_log ───────────────────────────────────────────────────────────────
-- Audit log: tenants can read their own log entries but cannot modify them
DROP POLICY IF EXISTS "tenant_isolation_audit_log_select" ON public.audit_log;
CREATE POLICY "tenant_isolation_audit_log_select" ON public.audit_log
  FOR SELECT TO authenticated
  USING (tenant_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_audit_log_insert" ON public.audit_log;
CREATE POLICY "tenant_isolation_audit_log_insert" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- ─── restaurant_layout ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_isolation_restaurant_layout" ON public.restaurant_layout;
CREATE POLICY "tenant_isolation_restaurant_layout" ON public.restaurant_layout
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- ─── employee_shifts ─────────────────────────────────────────────────────────
-- employee_shifts has tenant_id directly; use it for isolation
DROP POLICY IF EXISTS "tenant_isolation_employee_shifts" ON public.employee_shifts;
CREATE POLICY "tenant_isolation_employee_shifts" ON public.employee_shifts
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- ─── rh_incapacidades ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_isolation_rh_incapacidades" ON public.rh_incapacidades;
CREATE POLICY "tenant_isolation_rh_incapacidades" ON public.rh_incapacidades
  FOR ALL TO authenticated
  USING (tenant_id = public.auth_tenant_id())
  WITH CHECK (tenant_id = public.auth_tenant_id());

-- ─── onboarding_progress ─────────────────────────────────────────────────────
-- onboarding_progress is scoped to auth.uid() (no tenant_id column)
-- Users can only see/modify their own onboarding progress
DROP POLICY IF EXISTS "user_isolation_onboarding_progress" ON public.onboarding_progress;
CREATE POLICY "user_isolation_onboarding_progress" ON public.onboarding_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Performance indexes for tenant-scoped dashboard queries ─────────────────
-- These indexes speed up the WHERE tenant_id = ... filters used by dashboard components

CREATE INDEX IF NOT EXISTS idx_orders_tenant_status_created
  ON public.orders (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_is_comanda
  ON public.orders (tenant_id, is_comanda, status);

CREATE INDEX IF NOT EXISTS idx_order_items_tenant_created
  ON public.order_items (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingredients_tenant_stock
  ON public.ingredients (tenant_id, stock, min_stock);

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_tenant_status
  ON public.restaurant_tables (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_gastos_recurrentes_tenant_estado
  ON public.gastos_recurrentes (tenant_id, estado, activo, proximo_pago);

CREATE INDEX IF NOT EXISTS idx_cortes_caja_tenant_status
  ON public.cortes_caja (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created
  ON public.audit_log (tenant_id, created_at DESC);
