-- Niveles (tiers) de membresía
-- Cada restaurante define sus propios niveles en un JSON array en system_config.
-- loyalty_customers.tier_id referencia el id del nivel del socio.

ALTER TABLE public.loyalty_customers
  ADD COLUMN IF NOT EXISTS tier_id text DEFAULT 'default';

COMMENT ON COLUMN public.loyalty_customers.tier_id IS
  'ID del nivel de membresía del socio. Referencia el campo id dentro del JSON '
  'loyalty_membership_tiers en system_config. Default = nivel único si solo hay uno.';

-- Config key que guarda el JSON de niveles
-- Estructura de cada tier:
-- {
--   id: string,          -- "tier_1", "tier_2", etc.
--   name: string,        -- "Básico", "Plata", "Gold"
--   color: string,       -- hex o nombre: "amber", "slate", "yellow"
--   trigger: string,     -- "manual" | "venta_producto" | "pago_directo"
--   triggerProductId: string,
--   price: number,
--   durationMonths: number,
--   benefits: {
--     freeProduct:  { enabled, productId, freq, label },
--     discount:     { enabled, pct, scope, auto },
--     priceTag:     { enabled, label },
--     points:       { enabled, multiplier },
--     birthday:     { enabled, type, discountPct, productId, label }
--   }
-- }
INSERT INTO public.system_config (tenant_id, config_key, config_value)
SELECT t.id,
       'loyalty_membership_tiers',
       '[]'   -- vacío por defecto; el wizard lo rellena
FROM public.tenants t
ON CONFLICT (tenant_id, config_key) DO NOTHING;
