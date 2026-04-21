-- Lealtad flexible — configuración y transacciones financieras
-- Agrega los config_keys del nuevo sistema de membresía configurable
-- y extiende loyalty_transactions para impacto en P&L

-- ── 1. Nuevos config_keys en system_config (defaults seguros) ────────────────
INSERT INTO public.system_config (tenant_id, config_key, config_value)
SELECT t.id, v.key, v.val
FROM public.tenants t
CROSS JOIN (VALUES
  -- Membresía
  ('loyalty_membership_enabled',              'false'),
  ('loyalty_membership_trigger',              'manual'),
  ('loyalty_membership_trigger_product_id',   ''),
  ('loyalty_membership_price',                '0'),
  ('loyalty_membership_duration_months',      '12'),
  -- Beneficio de la membresía
  ('loyalty_membership_benefit_enabled',      'false'),
  ('loyalty_membership_benefit_daily',        'true'),
  ('loyalty_membership_benefit_cross_branch', 'true'),
  ('loyalty_membership_benefit_type',         'producto_gratis'),
  ('loyalty_membership_benefit_product_id',   ''),
  ('loyalty_membership_benefit_discount',     '0'),
  ('loyalty_membership_benefit_multiplier',   '1'),
  ('loyalty_membership_benefit_label',        'Beneficio del día'),
  -- Puntos (extender los existentes)
  ('loyalty_points_enabled',                  'true')
) AS v(key, val)
ON CONFLICT (tenant_id, config_key) DO NOTHING;

-- ── 2. Extender loyalty_transactions para P&L ─────────────────────────────────
ALTER TABLE public.loyalty_transactions
  ADD COLUMN IF NOT EXISTS financial_impact_type text
    CHECK (financial_impact_type IN (
      'ingreso_membresia',   -- vendieron una membresía de pago
      'costo_beneficio',     -- producto gratis (costo WACC)
      'descuento_lealtad',   -- descuento aplicado
      'canje_puntos',        -- canje (reduce ingreso)
      'ninguno'              -- acumulación de puntos (sin impacto inmediato)
    )),
  ADD COLUMN IF NOT EXISTS financial_amount   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_id         uuid    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS branch_id          uuid    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS membership_months  int     DEFAULT NULL;

-- Backfill de registros existentes
UPDATE public.loyalty_transactions
SET financial_impact_type = CASE
  WHEN type = 'acumulacion' THEN 'ninguno'
  WHEN type = 'canje'       THEN 'canje_puntos'
  ELSE 'ninguno'
END
WHERE financial_impact_type IS NULL;

-- ── 3. Extender CHECK de loyalty_transactions.type ───────────────────────────
-- Agregar nuevos tipos sin romper los existentes
ALTER TABLE public.loyalty_transactions
  DROP CONSTRAINT IF EXISTS loyalty_transactions_type_check;

ALTER TABLE public.loyalty_transactions
  ADD CONSTRAINT loyalty_transactions_type_check
  CHECK (type IN (
    'acumulacion',
    'canje',
    'membresia_activada',
    'beneficio_usado',
    'expiracion'
  ));

-- ── 4. Vista: resumen de lealtad para P&L ────────────────────────────────────
CREATE OR REPLACE VIEW public.v_loyalty_pl_summary AS
SELECT
  lt.tenant_id,
  lt.branch_id,
  date_trunc('month', lt.created_at) AS mes,
  SUM(CASE WHEN lt.financial_impact_type = 'ingreso_membresia'
           THEN lt.financial_amount ELSE 0 END) AS ingresos_membresias,
  SUM(CASE WHEN lt.financial_impact_type = 'costo_beneficio'
           THEN lt.financial_amount ELSE 0 END) AS costo_beneficios,
  SUM(CASE WHEN lt.financial_impact_type = 'descuento_lealtad'
           THEN lt.financial_amount ELSE 0 END) AS descuentos_lealtad,
  SUM(CASE WHEN lt.financial_impact_type = 'canje_puntos'
           THEN lt.financial_amount ELSE 0 END) AS canjes_puntos,
  COUNT(CASE WHEN lt.type = 'membresia_activada' THEN 1 END) AS membresias_nuevas,
  COUNT(CASE WHEN lt.type = 'beneficio_usado'    THEN 1 END) AS beneficios_usados,
  COUNT(CASE WHEN lt.type = 'acumulacion'        THEN 1 END) AS acumulaciones,
  COUNT(CASE WHEN lt.type = 'canje'              THEN 1 END) AS canjes
FROM public.loyalty_transactions lt
GROUP BY lt.tenant_id, lt.branch_id, date_trunc('month', lt.created_at);
