-- Beneficios múltiples de membresía — reemplaza el sistema de tipo único
-- Cada beneficio es independiente y se puede combinar con otros.

INSERT INTO public.system_config (tenant_id, config_key, config_value)
SELECT t.id, v.key, v.val
FROM public.tenants t
CROSS JOIN (VALUES
  -- Producto gratis
  ('loyalty_benefit_free_product_enabled',  'false'),
  ('loyalty_benefit_free_product_id',       ''),
  ('loyalty_benefit_free_product_daily',    'true'),
  ('loyalty_benefit_free_product_label',    'Bebida del día'),
  -- Descuento en cada visita
  ('loyalty_benefit_discount_enabled',      'false'),
  ('loyalty_benefit_discount_pct',          '0'),
  -- Precio de socio (aviso visual para el cajero)
  ('loyalty_benefit_price_tag_enabled',     'false'),
  ('loyalty_benefit_price_tag_label',       'Precio de socio'),
  -- Puntos extra
  ('loyalty_benefit_points_enabled',        'false'),
  ('loyalty_benefit_points_multiplier',     '2')
) AS v(key, val)
ON CONFLICT (tenant_id, config_key) DO NOTHING;
