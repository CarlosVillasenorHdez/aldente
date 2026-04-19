-- ─── Propinas ────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tip_amount numeric(10,2) DEFAULT 0;

COMMENT ON COLUMN orders.tip_amount IS 'Propina capturada en el momento del pago. No afecta el total ni el COGS.';

-- ─── Índice para reportes de propinas por mesero ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_tip ON orders (tenant_id, mesero, tip_amount)
  WHERE tip_amount > 0;
