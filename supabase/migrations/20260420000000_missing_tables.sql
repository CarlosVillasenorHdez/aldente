-- =============================================================================
-- MISSING TABLES — Schema tracking for tables created directly in Supabase
-- cortes_caja, employee_attendance, audit_log, v_dish_cost_summary
-- =============================================================================

-- ── cortes_caja ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cortes_caja (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id          uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  apertura_at        timestamptz NOT NULL DEFAULT now(),
  cierre_at          timestamptz,
  fondo_inicial      numeric NOT NULL DEFAULT 0,
  apertura_por       text NOT NULL DEFAULT '',
  cierre_por         text,
  ventas_efectivo    numeric,
  ventas_tarjeta     numeric,
  ventas_total       numeric,
  ordenes_count      integer,
  descuentos_total   numeric,
  iva_total          numeric,
  efectivo_contado   numeric,
  diferencia         numeric,
  denominaciones     jsonb,
  notas              text,
  status             text NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto','cerrado')),
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

ALTER TABLE public.cortes_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_cortes_caja" ON public.cortes_caja;
CREATE POLICY "authenticated_cortes_caja" ON public.cortes_caja
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── employee_attendance ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_attendance (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id  uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  date         date NOT NULL,
  check_in     text,        -- 'HH:MM' format
  check_out    text,        -- 'HH:MM' format
  hours_worked numeric,
  notes        text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_employee_attendance" ON public.employee_attendance;
CREATE POLICY "authenticated_employee_attendance" ON public.employee_attendance
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── audit_log ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     uuid,            -- app_users.id
  user_name   text,
  action      text NOT NULL,   -- 'created', 'updated', 'deleted', etc.
  entity      text NOT NULL,   -- table name: 'dishes', 'orders', etc.
  entity_id   uuid,
  entity_name text,
  old_value   jsonb,
  new_value   jsonb,
  details     text,
  ip_address  text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_audit_log" ON public.audit_log;
CREATE POLICY "authenticated_audit_log" ON public.audit_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index for fast tenant queries
CREATE INDEX IF NOT EXISTS audit_log_tenant_created 
  ON public.audit_log (tenant_id, created_at DESC);

-- ── v_dish_cost_summary ───────────────────────────────────────────────────────
-- View that pre-calculates ingredient cost, labor cost, and overhead per dish
DROP VIEW IF EXISTS public.v_dish_cost_summary;
CREATE OR REPLACE VIEW public.v_dish_cost_summary AS
SELECT
  d.id AS dish_id,
  d.name AS dish_name,
  d.tenant_id,
  d.price,
  COALESCE(SUM(dr.quantity * COALESCE(i.cost, 0)), 0) AS ingredient_cost,
  0::numeric AS labor_cost,     -- placeholder: override via system_config
  35::numeric AS overhead_pct,  -- placeholder: override via system_config
  COALESCE(SUM(dr.quantity * COALESCE(i.cost, 0)), 0) AS total_cost,
  CASE 
    WHEN d.price > 0 
    THEN ROUND(((d.price - COALESCE(SUM(dr.quantity * COALESCE(i.cost, 0)), 0)) / d.price * 100)::numeric, 2)
    ELSE 0
  END AS margin_pct
FROM public.dishes d
LEFT JOIN public.dish_recipes dr ON dr.dish_id = d.id
LEFT JOIN public.ingredients i ON i.id = dr.ingredient_id
GROUP BY d.id, d.name, d.tenant_id, d.price;

-- ── Indexes for performance ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS cortes_caja_tenant_status 
  ON public.cortes_caja (tenant_id, status);

CREATE INDEX IF NOT EXISTS employee_attendance_tenant_date 
  ON public.employee_attendance (tenant_id, date);
