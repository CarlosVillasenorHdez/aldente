-- ============================================================================
-- Módulo de Proveedores
-- Entidad proveedor con cuenta corriente y vinculación a gastos
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  rfc             TEXT,
  contact_name    TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  payment_terms   TEXT DEFAULT 'contado',   -- contado | 15_dias | 30_dias | 60_dias
  credit_limit    NUMERIC(12,2) DEFAULT 0,
  notes           TEXT,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_suppliers" ON public.suppliers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers (tenant_id);

-- Vincular gastos existentes a proveedor
ALTER TABLE public.gastos_recurrentes
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Vista: cuenta corriente por proveedor (cuánto se debe y qué vence)
CREATE OR REPLACE VIEW public.v_supplier_balance AS
SELECT
  s.id AS supplier_id,
  s.tenant_id,
  s.name AS supplier_name,
  s.payment_terms,
  s.credit_limit,
  COALESCE(SUM(CASE WHEN g.metodo_pago = 'credito' AND g.estado != 'pagado' THEN g.monto ELSE 0 END), 0) AS balance_pendiente,
  COALESCE(SUM(g.monto), 0) AS total_compras,
  COUNT(g.id) FILTER (WHERE g.metodo_pago = 'credito' AND g.estado != 'pagado') AS facturas_pendientes
FROM public.suppliers s
LEFT JOIN public.gastos_recurrentes g ON g.supplier_id = s.id AND g.tenant_id = s.tenant_id
WHERE s.active = true
GROUP BY s.id, s.tenant_id, s.name, s.payment_terms, s.credit_limit;
