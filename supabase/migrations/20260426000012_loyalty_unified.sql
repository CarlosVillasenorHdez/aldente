-- Programa de lealtad unificado
-- Agrega soporte para modo 'visitas' y unifica la configuración

INSERT INTO public.system_config (tenant_id, config_key, config_value)
SELECT t.id, v.key, v.val
FROM public.tenants t
CROSS JOIN (VALUES
  ('loyalty_mode',           'puntos'),   -- 'puntos' | 'visitas' | 'membresia'
  ('loyalty_visits_goal',    '10'),       -- meta de visitas para recompensa
  ('loyalty_visits_reward',  'Producto gratis') -- etiqueta de la recompensa
) AS v(key, val)
ON CONFLICT (tenant_id, config_key) DO NOTHING;
