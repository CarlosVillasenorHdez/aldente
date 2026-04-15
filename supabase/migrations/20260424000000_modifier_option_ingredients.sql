-- ============================================================================
-- Modificadores multi-ingrediente
-- Permite que una opción de modificador afecte múltiples ingredientes
-- Ejemplo: "Con guarnición completa" → -100g papas, -80g ensalada, -50g champiñones
-- ============================================================================

-- Nueva tabla: ingredientes vinculados a una opción de modificador
CREATE TABLE IF NOT EXISTS public.modifier_option_ingredients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id       UUID NOT NULL REFERENCES public.modifier_options(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ingredient_id   UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  qty_delta       NUMERIC(10,4) NOT NULL DEFAULT 0,  -- cantidad a descontar del inventario
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.modifier_option_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_access_modifier_option_ingredients"
  ON public.modifier_option_ingredients FOR ALL TO public USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_modifier_option_ingredients_option
  ON public.modifier_option_ingredients (option_id);

-- Mantener ingredient_id y qty_delta en modifier_options para compatibilidad
-- (opción simple de un solo ingrediente — no requiere la tabla junction)
-- Para múltiples ingredientes usar modifier_option_ingredients
