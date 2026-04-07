-- =============================================================================
-- Migration: Order item modifiers support
-- Each order item line can have its own note/modifier.
-- Allows "4x Pozole" to be represented as 4 separate lines, each with its own
-- modifier (sin cebolla, maciza sin rábano, etc.) for kitchen clarity and
-- accurate inventory deduction.
-- =============================================================================

-- line_id: groups multiple lines of the same dish. If null, legacy single line.
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS line_id UUID DEFAULT gen_random_uuid();

-- modifier: the specific customization for this line (e.g. "sin cebolla")
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS modifier TEXT;

-- dish_id already exists from migration 20260326220000
-- notes already exists from migration 20260326220000
