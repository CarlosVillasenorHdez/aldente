-- ═══════════════════════════════════════════════════════════════════════════
-- Coordenadas para sucursales — para que aparezcan en el mapa del admin
--
-- Las sucursales (branches) tenían dirección pero no lat/lng, así que no
-- podían pinearse en el mapa. Agregamos las columnas. El llenado se hace
-- desde el panel admin con el botón "Geocodificar" (convierte dirección →
-- coordenadas con OpenStreetMap).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  -- Campos de dirección más finos para mejor geocodificación (opcionales)
  ADD COLUMN IF NOT EXISTS colonia text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state_region text,
  ADD COLUMN IF NOT EXISTS postal_code text;

CREATE INDEX IF NOT EXISTS idx_branches_coords ON public.branches (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

SELECT 'branches' AS tabla,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='branches' AND column_name='lat')
  THEN '✅ lat/lng agregados' ELSE '❌ falló' END AS estado;
