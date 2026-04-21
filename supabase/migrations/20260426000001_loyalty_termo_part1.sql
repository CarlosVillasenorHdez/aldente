-- Membresía Termo — Parte 1: columnas, tabla de log e índices
-- Corre este script PRIMERO, luego corre el script _part2

-- ── 1. Nuevas columnas en loyalty_customers ───────────────────────────────────
ALTER TABLE public.loyalty_customers
  ADD COLUMN IF NOT EXISTS membership_type text NOT NULL DEFAULT 'puntos'
    CHECK (membership_type IN ('puntos', 'termo')),
  ADD COLUMN IF NOT EXISTS daily_benefit_used_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS daily_benefit_used_branch_id uuid DEFAULT NULL;

-- ── 2. Índices ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_loyalty_customers_phone_tenant
  ON public.loyalty_customers (tenant_id, phone);

CREATE INDEX IF NOT EXISTS idx_loyalty_customers_type
  ON public.loyalty_customers (tenant_id, membership_type);

-- ── 3. Tabla de log de uso del beneficio diario ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_daily_benefit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  customer_id     uuid NOT NULL REFERENCES public.loyalty_customers(id) ON DELETE CASCADE,
  branch_id       uuid,
  benefit_type    text NOT NULL DEFAULT 'cafe_gratis',
  used_at         timestamptz NOT NULL DEFAULT now(),
  registered_by   text DEFAULT '',
  notes           text DEFAULT ''
);

ALTER TABLE public.loyalty_daily_benefit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'loyalty_daily_benefit_log'
    AND policyname = 'loyalty_daily_benefit_log_tenant'
  ) THEN
    CREATE POLICY loyalty_daily_benefit_log_tenant
      ON public.loyalty_daily_benefit_log
      FOR ALL TO authenticated
      USING (tenant_id = public.auth_tenant_id())
      WITH CHECK (tenant_id = public.auth_tenant_id());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_loyalty_benefit_log_tenant_date
  ON public.loyalty_daily_benefit_log (tenant_id, used_at);

CREATE INDEX IF NOT EXISTS idx_loyalty_benefit_log_customer
  ON public.loyalty_daily_benefit_log (customer_id, used_at);

-- ── 4. Comentarios ────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.loyalty_customers.membership_type IS
  'puntos = programa de puntos | termo = membresía física con beneficio diario';
COMMENT ON COLUMN public.loyalty_customers.daily_benefit_used_at IS
  'Última vez que se usó el beneficio diario. Se resetea por fecha en CDMX.';
COMMENT ON COLUMN public.loyalty_customers.daily_benefit_used_branch_id IS
  'Sucursal donde se usó el beneficio hoy. Cross-sucursal.';
