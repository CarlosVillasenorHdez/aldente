-- =============================================================================
-- Migration: Combos/Promos + Cortesía payment method
-- =============================================================================

-- 1. Combos table
CREATE TABLE IF NOT EXISTS public.combos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT NOT NULL,
  name         TEXT NOT NULL DEFAULT '',
  description  TEXT DEFAULT '',
  emoji        TEXT DEFAULT '🎁',
  -- items: [{dish_id, name, emoji, qty, original_price, discount_pct, final_price}]
  items        JSONB NOT NULL DEFAULT '[]',
  total_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  savings      NUMERIC(10,2) NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_combos" ON public.combos;
CREATE POLICY "tenant_combos" ON public.combos
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_combos_tenant ON public.combos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_combos_active  ON public.combos(tenant_id, active);

-- 2. Add 'cortesia' to payment_method enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.payment_method'::regtype
    AND enumlabel = 'cortesia'
  ) THEN
    ALTER TYPE public.payment_method ADD VALUE 'cortesia';
  END IF;
END $$;

-- 3. Add is_cortesia flag to orders for easy filtering
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_cortesia BOOLEAN NOT NULL DEFAULT false;
