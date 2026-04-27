-- Campos de facturación en órdenes
-- Permiten capturar el RFC del cliente en el POS para que el contador
-- pueda generar el CFDI correspondiente en su PAC (Proveedor Autorizado de Certificación)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cliente_rfc          text DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_razon_social text DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_uso_cfdi     text DEFAULT 'G03';

-- XAXX010101000 = RFC para facturas de público en general
-- G03 = Gastos en general (uso de CFDI más común en restaurantes)

COMMENT ON COLUMN public.orders.cliente_rfc          IS 'RFC del cliente para emisión de CFDI. XAXX010101000 = público en general.';
COMMENT ON COLUMN public.orders.cliente_razon_social IS 'Razón social del cliente para el CFDI.';
COMMENT ON COLUMN public.orders.cliente_uso_cfdi     IS 'Clave de uso del CFDI según catálogo SAT. G03 = Gastos en general.';

-- Índice para consultas de órdenes que requieren factura
CREATE INDEX IF NOT EXISTS idx_orders_rfc
  ON public.orders (tenant_id, cliente_rfc)
  WHERE cliente_rfc != '';
