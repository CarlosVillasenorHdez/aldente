-- ============================================================================
-- Suppliers linking — conectar proveedores con ingredientes y pagos
-- ============================================================================

-- 1. Link ingredients to supplier entity
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- 2. Payments table — registro de pagos a proveedores
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_id   UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  amount        NUMERIC(12,2) NOT NULL,
  payment_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  method        TEXT NOT NULL DEFAULT 'transferencia',  -- efectivo|transferencia|cheque|tarjeta
  reference     TEXT,    -- número de cheque, folio de transferencia, etc.
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_supplier_payments"
  ON public.supplier_payments FOR ALL TO public USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier
  ON public.supplier_payments (supplier_id, tenant_id);

-- 3. Drop and recreate v_supplier_balance with payments factored in
DROP VIEW IF EXISTS public.v_supplier_balance;
CREATE OR REPLACE VIEW public.v_supplier_balance AS
SELECT
  s.id AS supplier_id,
  s.tenant_id,
  s.name AS supplier_name,
  s.payment_terms,
  s.credit_limit,
  -- Total purchased on credit (unpaid gastos)
  COALESCE(SUM(
    CASE WHEN g.metodo_pago = 'credito' THEN g.monto ELSE 0 END
  ), 0) AS total_credito,
  -- Total paid
  COALESCE((
    SELECT SUM(p.amount) FROM public.supplier_payments p
    WHERE p.supplier_id = s.id AND p.tenant_id = s.tenant_id
  ), 0) AS total_pagado,
  -- Balance = purchased on credit - paid
  COALESCE(SUM(
    CASE WHEN g.metodo_pago = 'credito' THEN g.monto ELSE 0 END
  ), 0) - COALESCE((
    SELECT SUM(p.amount) FROM public.supplier_payments p
    WHERE p.supplier_id = s.id AND p.tenant_id = s.tenant_id
  ), 0) AS balance_pendiente,
  -- Total all purchases
  COALESCE(SUM(g.monto), 0) AS total_compras,
  -- Count of ingredients supplied
  (SELECT COUNT(*) FROM public.ingredients i
   WHERE i.supplier_id = s.id AND i.tenant_id = s.tenant_id) AS ingredients_count
FROM public.suppliers s
LEFT JOIN public.gastos_recurrentes g
  ON g.supplier_id = s.id AND g.tenant_id = s.tenant_id
WHERE s.active = true
GROUP BY s.id, s.tenant_id, s.name, s.payment_terms, s.credit_limit;
