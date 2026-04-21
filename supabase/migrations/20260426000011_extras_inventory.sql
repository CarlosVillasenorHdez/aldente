-- Inventario de extras (termos, merch, membresías físicas, etc.)
-- Misma lógica que ingredients pero para productos físicos de la tienda

ALTER TABLE public.extras_catalog
  ADD COLUMN IF NOT EXISTS stock_actual     numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_minimo     numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS punto_reorden    numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_unitario   numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proveedor_id     uuid          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sku              text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unidad           text          DEFAULT 'pieza',
  ADD COLUMN IF NOT EXISTS tracks_inventory boolean       DEFAULT false;
  -- tracks_inventory: false = no descuenta stock (ej: membresías digitales)
  --                   true  = descuenta stock al vender (ej: termos)

COMMENT ON COLUMN public.extras_catalog.costo_unitario IS
  'Costo de adquisición por unidad. Alimenta el P&L como COGS de extras.';
COMMENT ON COLUMN public.extras_catalog.tracks_inventory IS
  'Si true, al vender se descuenta stock_actual y se genera alerta si baja del punto_reorden.';

-- extras_sales: registrar el costo al momento de la venta (igual que orders.cost_actual)
ALTER TABLE public.extras_sales
  ADD COLUMN IF NOT EXISTS unit_cost   numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_delta numeric(10,2) DEFAULT -1;
  -- unit_cost: snapshot del costo_unitario al momento de la venta
  -- stock_delta: cuántas unidades se descontaron (-1 por defecto)

-- Vista: alertas de stock bajo en extras
CREATE OR REPLACE VIEW public.v_extras_stock_alerts AS
SELECT
  ec.id,
  ec.tenant_id,
  ec.name,
  ec.type,
  ec.stock_actual,
  ec.stock_minimo,
  ec.punto_reorden,
  ec.costo_unitario,
  ec.price,
  ec.sku,
  CASE
    WHEN ec.stock_actual <= 0           THEN 'agotado'
    WHEN ec.stock_actual <= ec.stock_minimo THEN 'critico'
    WHEN ec.stock_actual <= ec.punto_reorden THEN 'reorden'
    ELSE 'ok'
  END AS stock_status
FROM public.extras_catalog ec
WHERE ec.is_active = true
  AND ec.tracks_inventory = true;
