-- Programa de lealtad unificado — soporte para programa por visitas

INSERT INTO public.system_config (tenant_id, config_key, config_value)
SELECT t.id, v.key, v.val
FROM public.tenants t
CROSS JOIN (VALUES
  ('loyalty_program_type',          'membresia'),
  ('loyalty_visits_goal',           '10'),
  ('loyalty_visits_reward_type',    'producto'),
  ('loyalty_visits_reward_product', ''),
  ('loyalty_visits_reward_pct',     '0')
) AS v(key, val)
ON CONFLICT (tenant_id, config_key) DO NOTHING;
