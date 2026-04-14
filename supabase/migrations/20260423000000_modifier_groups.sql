-- ============================================================================
-- Modificadores de platillos — estándar industria restaurantera
-- Cubre: obligatorio/opcional, elige uno/varios, precio delta, inventario
-- ============================================================================

-- ── 1. Grupos de modificadores ────────────────────────────────────────────────
-- Un grupo = una pregunta: "¿Término de cocción?", "¿Acompañamiento?"
CREATE TABLE IF NOT EXISTS public.modifier_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id     UUID NOT NULL REFERENCES public.dishes(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,              -- "Acompañamiento", "Término", "Extras"
  min_select  INTEGER NOT NULL DEFAULT 0, -- 0=opcional, 1=requerido
  max_select  INTEGER NOT NULL DEFAULT 1, -- 1=radio (elige uno), N=checkboxes
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 2. Opciones dentro de cada grupo ────────────────────────────────────────
-- Una opción = una respuesta: "Con papas +$15", "Bien cocido $0"
CREATE TABLE IF NOT EXISTS public.modifier_options (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,              -- "Con papas", "Mediano", "Extra queso"
  price_delta     NUMERIC(10,2) NOT NULL DEFAULT 0, -- +15, 0, -5
  is_default      BOOLEAN NOT NULL DEFAULT false,   -- pre-seleccionada en el POS
  ingredient_id   UUID REFERENCES public.ingredients(id) ON DELETE SET NULL,
  qty_delta       NUMERIC(10,4) DEFAULT 0,          -- kg/lt/pz a descontar del inventario
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 3. Opciones elegidas por el cliente en cada línea de orden ───────────────
-- Snapshot al momento de la orden — inmutable aunque cambien los precios
CREATE TABLE IF NOT EXISTS public.order_item_modifiers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id  UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  option_id      UUID REFERENCES public.modifier_options(id) ON DELETE SET NULL,
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,           -- snapshot del nombre
  price_delta    NUMERIC(10,2) NOT NULL DEFAULT 0, -- snapshot del precio
  ingredient_id  UUID REFERENCES public.ingredients(id) ON DELETE SET NULL,
  qty_delta      NUMERIC(10,4) DEFAULT 0, -- snapshot de qty para inventario
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ── 4. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.modifier_groups      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_options     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_modifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_access_modifier_groups"
  ON public.modifier_groups FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "app_access_modifier_options"
  ON public.modifier_options FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "app_access_order_item_modifiers"
  ON public.order_item_modifiers FOR ALL TO public USING (true) WITH CHECK (true);

-- ── 5. Índices ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_modifier_groups_dish
  ON public.modifier_groups (dish_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_modifier_options_group
  ON public.modifier_options (group_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_order_item_modifiers_item
  ON public.order_item_modifiers (order_item_id);

-- ── 6. modifier_count en dishes (cache para mostrar badge en el menú) ────────
ALTER TABLE public.dishes
  ADD COLUMN IF NOT EXISTS has_modifiers BOOLEAN NOT NULL DEFAULT false;

-- ── 7. Trigger: mantener has_modifiers sincronizado ──────────────────────────
CREATE OR REPLACE FUNCTION sync_dish_has_modifiers()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.dishes
  SET has_modifiers = EXISTS (
    SELECT 1 FROM public.modifier_groups WHERE dish_id = COALESCE(NEW.dish_id, OLD.dish_id)
  )
  WHERE id = COALESCE(NEW.dish_id, OLD.dish_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_has_modifiers ON public.modifier_groups;
CREATE TRIGGER trg_sync_has_modifiers
  AFTER INSERT OR UPDATE OR DELETE ON public.modifier_groups
  FOR EACH ROW EXECUTE FUNCTION sync_dish_has_modifiers();
