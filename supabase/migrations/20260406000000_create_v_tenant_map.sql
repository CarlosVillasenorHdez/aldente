-- =============================================================================
-- Migration: Create v_tenant_map view
-- Used by the superadmin panel for tenant KPIs, heatmap and churn analysis.
-- =============================================================================

CREATE OR REPLACE VIEW public.v_tenant_map AS
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
  -- Location fields (may not exist on all installs — safe defaults)
  COALESCE(t.country, '')         AS country,
  COALESCE(t.city, '')            AS city,
  COALESCE(t.state_region, '')    AS state_region,
  COALESCE(t.address, '')         AS address,
  COALESCE(t.timezone, 'America/Mexico_City') AS timezone,
  t.lat,
  t.lng,
  -- Aggregated stats
  (SELECT COUNT(*) FROM public.app_users u
    WHERE u.tenant_id = t.id AND u.is_active = true)::integer  AS active_users,
  (SELECT COUNT(*) FROM public.branches b
    WHERE b.tenant_id = t.id AND b.is_active = true)::integer  AS active_branches
FROM public.tenants t;

-- Grant read access to authenticated users (RLS on tenants already restricts rows)
GRANT SELECT ON public.v_tenant_map TO authenticated;
GRANT SELECT ON public.v_tenant_map TO service_role;

-- Add location columns to tenants if they don't exist yet
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='lat') THEN
    ALTER TABLE public.tenants ADD COLUMN lat NUMERIC(9,6);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='lng') THEN
    ALTER TABLE public.tenants ADD COLUMN lng NUMERIC(9,6);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='country') THEN
    ALTER TABLE public.tenants ADD COLUMN country TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='city') THEN
    ALTER TABLE public.tenants ADD COLUMN city TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='state_region') THEN
    ALTER TABLE public.tenants ADD COLUMN state_region TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='address') THEN
    ALTER TABLE public.tenants ADD COLUMN address TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='timezone') THEN
    ALTER TABLE public.tenants ADD COLUMN timezone TEXT DEFAULT 'America/Mexico_City';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='trial_ends_at') THEN
    ALTER TABLE public.tenants ADD COLUMN trial_ends_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='plan_valid_until') THEN
    ALTER TABLE public.tenants ADD COLUMN plan_valid_until TIMESTAMPTZ;
  END IF;
END $$;
