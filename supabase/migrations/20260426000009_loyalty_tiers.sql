-- Niveles (tiers) de membresía
-- Un tenant puede tener un solo nivel (sin nombre) o múltiples (Plata, Gold, Platino)
-- Cada nivel tiene su propio trigger y sus propios beneficios

-- 1. Agregar tier_id a loyalty_customers
ALTER TABLE public.loyalty_customers
  ADD COLUMN IF NOT EXISTS tier_id text DEFAULT NULL;

COMMENT ON COLUMN public.loyalty_customers.tier_id IS
  'ID del nivel de membresía del socio. NULL = membresía sin niveles.
   Referencia al campo id dentro del JSON loyalty_membership_tiers.';

-- 2. Config key para los tiers (JSON array, vacío por defecto)
INSERT INTO public.system_config (tenant_id, config_key, config_value)
SELECT t.id, 'loyalty_membership_tiers', '[]'
FROM public.tenants t
ON CONFLICT (tenant_id, config_key) DO NOTHING;
