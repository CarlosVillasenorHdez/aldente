-- ─── Expand ingredient_category enum with restaurant-relevant categories ─────
-- Old: Carnes, Verduras, Lácteos, Bebidas, Abarrotes, Especias
-- New: full restaurant-ready category set

ALTER TYPE public.ingredient_category ADD VALUE IF NOT EXISTS 'Carnes y Aves';
ALTER TYPE public.ingredient_category ADD VALUE IF NOT EXISTS 'Mariscos';
ALTER TYPE public.ingredient_category ADD VALUE IF NOT EXISTS 'Frutas';
ALTER TYPE public.ingredient_category ADD VALUE IF NOT EXISTS 'Panadería';
ALTER TYPE public.ingredient_category ADD VALUE IF NOT EXISTS 'Pastas y Granos';
ALTER TYPE public.ingredient_category ADD VALUE IF NOT EXISTS 'Aceites y Salsas';
ALTER TYPE public.ingredient_category ADD VALUE IF NOT EXISTS 'Congelados';
ALTER TYPE public.ingredient_category ADD VALUE IF NOT EXISTS 'Empaques';
ALTER TYPE public.ingredient_category ADD VALUE IF NOT EXISTS 'Limpieza';
ALTER TYPE public.ingredient_category ADD VALUE IF NOT EXISTS 'Otros';
