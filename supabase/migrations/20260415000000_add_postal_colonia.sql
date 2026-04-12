-- =============================================================================
-- Migration: Add postal_code and colonia to tenants + update v_tenant_map
-- =============================================================================

-- 1. Add new columns to tenants (safe, idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='tenants' AND column_name='postal_code') THEN
    ALTER TABLE public.tenants ADD COLUMN postal_code TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='tenants' AND column_name='colonia') THEN
    ALTER TABLE public.tenants ADD COLUMN colonia TEXT DEFAULT '';
  END IF;
END $$;

-- 2. Recreate v_tenant_map (DROP + CREATE to allow column reordering)
DROP VIEW IF EXISTS public.v_tenant_map;

CREATE VIEW public.v_tenant_map AS
SELECT
  t.id,
  t.name,
  t.slug,
  t.plan,
  t.is_active,
  t.owner_email,
  t.created_at,
  t.updated_at,
  t.trial_ends_at,
  t.plan_valid_until,
  t.max_branches,
  t.max_users,
  COALESCE(t.country, '')         AS country,
  COALESCE(t.colonia, '')         AS colonia,
  COALESCE(t.city, '')            AS city,
  COALESCE(t.state_region, '')    AS state_region,
  COALESCE(t.address, '')         AS address,
  COALESCE(t.postal_code, '')     AS postal_code,
  COALESCE(t.timezone, 'America/Mexico_City') AS timezone,
  t.lat,
  t.lng,
  (SELECT COUNT(*) FROM public.app_users u
    WHERE u.tenant_id = t.id AND u.is_active = true)::integer  AS active_users,
  (SELECT COUNT(*) FROM public.branches b
    WHERE b.tenant_id = t.id AND b.is_active = true)::integer  AS active_branches
FROM public.tenants t;

GRANT SELECT ON public.v_tenant_map TO authenticated;
GRANT SELECT ON public.v_tenant_map TO service_role;

-- 3. Add 'unico' to gasto_frecuencia enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'public.gasto_frecuencia'::regtype 
    AND enumlabel = 'unico'
  ) THEN
    ALTER TYPE public.gasto_frecuencia ADD VALUE 'unico';
  END IF;
END $$;
