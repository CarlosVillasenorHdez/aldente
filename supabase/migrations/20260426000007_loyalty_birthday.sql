-- Cumpleaños y beneficios extendidos

-- 1. Campo birthday en loyalty_customers
ALTER TABLE public.loyalty_customers
  ADD COLUMN IF NOT EXISTS birthday date DEFAULT NULL;

COMMENT ON COLUMN public.loyalty_customers.birthday IS
  'Fecha de nacimiento del socio. Se usa para el beneficio de cumpleaños. '
  'Solo día y mes importan — el año es opcional (se puede guardar 1900 como placeholder).';

-- 2. Nuevos config keys para beneficios extendidos
INSERT INTO public.system_config (tenant_id, config_key, config_value)
SELECT t.id, v.key, v.val
FROM public.tenants t
CROSS JOIN (VALUES
  -- Descuento: sobre qué aplica y si es automático
  ('loyalty_benefit_discount_scope',        'orden'),     -- 'orden' | 'platillos'
  ('loyalty_benefit_discount_auto',         'true'),      -- true=automático, false=cajero lo activa
  -- Frecuencia del producto gratis (ampliar más allá de diario)
  ('loyalty_benefit_free_product_freq',     'diario'),    -- 'diario' | 'visita' | 'semanal'
  -- Cumpleaños
  ('loyalty_benefit_birthday_enabled',      'false'),
  ('loyalty_benefit_birthday_type',         'descuento'), -- 'descuento' | 'producto_gratis'
  ('loyalty_benefit_birthday_discount_pct', '0'),
  ('loyalty_benefit_birthday_product_id',   ''),
  ('loyalty_benefit_birthday_label',        'Feliz cumpleaños')
) AS v(key, val)
ON CONFLICT (tenant_id, config_key) DO NOTHING;
