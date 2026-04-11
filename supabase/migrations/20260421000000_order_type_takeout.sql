-- =============================================================================
-- ORDER TYPE — Para Llevar / Para Mesa
-- Agrega order_type a orders para distinguir órdenes de mesa vs para llevar
-- Para llevar tiene: customer_name (nombre del cliente) en lugar de mesa
-- =============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'mesa'
    CHECK (order_type IN ('mesa', 'para_llevar'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name text;

-- Index para filtrar por tipo de orden
CREATE INDEX IF NOT EXISTS idx_orders_order_type 
  ON public.orders (tenant_id, order_type, status);

-- Comment
COMMENT ON COLUMN public.orders.order_type IS 
  'mesa = orden en mesa del restaurante | para_llevar = orden para llevar sin mesa asignada';
COMMENT ON COLUMN public.orders.customer_name IS
  'Nombre del cliente para órdenes para llevar (opcional en mesa)';
