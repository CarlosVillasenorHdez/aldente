-- =============================================================================
-- Migration: ingredient locking + order margin tracking
-- =============================================================================

-- 1. Mark ingredients as required (cannot be removed by customer)
ALTER TABLE public.dish_recipes
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT false;

-- 2. Track extra ingredients requested per order item
--    extras: JSON array of {ingredient_id, name, quantity} added by customer
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS extras JSONB;

-- 3. Track actual cost and margin per order (calculated at payment time)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cost_actual    NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_actual  NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_pct     NUMERIC(5,2)  DEFAULT 0;

-- Index for margin reports
CREATE INDEX IF NOT EXISTS idx_orders_margin ON public.orders(tenant_id, margin_actual);
