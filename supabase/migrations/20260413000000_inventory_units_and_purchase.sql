-- ─── MIGRATION: Inventory units expansion + purchase unit tracking ──────────────
-- Allows storing items in minimum unit (pz, g, ml) while purchasing in bulk (bolsa, caja, kg)
-- The system converts on stock entry: 50 bolsas × 8 pz = 400 pz stored

-- 1. Expand ingredient_unit enum to include common purchase units
ALTER TYPE public.ingredient_unit ADD VALUE IF NOT EXISTS 'bolsa';
ALTER TYPE public.ingredient_unit ADD VALUE IF NOT EXISTS 'paquete';
ALTER TYPE public.ingredient_unit ADD VALUE IF NOT EXISTS 'bandeja';
ALTER TYPE public.ingredient_unit ADD VALUE IF NOT EXISTS 'lata';
ALTER TYPE public.ingredient_unit ADD VALUE IF NOT EXISTS 'botella';
ALTER TYPE public.ingredient_unit ADD VALUE IF NOT EXISTS 'costal';
ALTER TYPE public.ingredient_unit ADD VALUE IF NOT EXISTS 'sobre';
ALTER TYPE public.ingredient_unit ADD VALUE IF NOT EXISTS 'pieza';
ALTER TYPE public.ingredient_unit ADD VALUE IF NOT EXISTS 'par';

-- 2. Add purchase tracking columns to ingredients
-- purchase_unit: the unit in which you BUY (e.g. "bolsa")
-- purchase_qty_per_unit: how many stock-units per purchase unit (e.g. 8 pz per bolsa)
-- purchase_price: last purchase price per purchase unit (for cost auto-calc)
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS purchase_unit TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS purchase_qty_per_unit NUMERIC(10,4) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10,2) DEFAULT NULL;

-- 3. Add recipe_unit to dish_recipes so a recipe line can say "1 bolsa" instead of "8 pz"
-- recipe_unit_qty: how many stock-units this recipe_unit represents (from equivalence)
ALTER TABLE public.dish_recipes
  ADD COLUMN IF NOT EXISTS recipe_unit TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recipe_unit_qty NUMERIC(10,4) DEFAULT NULL;

-- Multi-tenant: apply tenant_id to new columns if needed (they inherit from table RLS)
