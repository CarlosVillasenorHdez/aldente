-- =============================================================================
-- Migration: Comanda support — additional orders as independent KDS tickets
-- A comanda is a new order linked to a parent order via parent_order_id.
-- It appears as its own card in the KDS (FIFO queue) and is summed into
-- the parent ticket at payment time.
-- =============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_comanda     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_parent ON public.orders(parent_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_is_comanda ON public.orders(tenant_id, is_comanda);
