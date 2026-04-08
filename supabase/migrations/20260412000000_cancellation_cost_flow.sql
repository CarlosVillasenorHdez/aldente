-- =============================================================================
-- Migration: cancellation cost tracking
-- cancel_type: 'sin_costo' (pendiente) | 'con_costo' (preparacion/lista)
-- cancel_reason: free text description
-- waste_cost: calculated cost at time of cancellation (from dish_recipes)
-- =============================================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancel_type   TEXT,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS waste_cost    NUMERIC(10,2) DEFAULT 0;

-- Index for merma reports
CREATE INDEX IF NOT EXISTS idx_orders_cancel_type ON public.orders(tenant_id, cancel_type);
