-- ============================================================================
-- Labor cost por platillo basado en tiempo de preparación
--
-- 1. Asegura que preparation_time_min exista en dishes
-- 2. Agrega kitchen_hourly_rate en system_config (costo/hora de cocina)
-- 3. Reemplaza v_dish_cost_summary con cálculo real de labor
--
-- APLICAR EN: Supabase Dashboard → SQL Editor
-- ============================================================================

-- ── 1. Columna preparation_time_min en dishes (si no existe) ─────────────────
ALTER TABLE public.dishes
  ADD COLUMN IF NOT EXISTS preparation_time_min INTEGER NOT NULL DEFAULT 15;

-- ── 2. Vista actualizada con labor cost real por platillo ─────────────────────
-- Labor cost = (preparation_time_min / 60) × kitchen_hourly_rate del tenant
-- kitchen_hourly_rate se guarda en system_config por tenant
-- Si no está configurado, usa 0 (sin labor cost = comportamiento anterior)

DROP VIEW IF EXISTS public.v_dish_cost_summary;

CREATE OR REPLACE VIEW public.v_dish_cost_summary AS
SELECT
  d.id                                            AS dish_id,
  d.name                                          AS dish_name,
  d.tenant_id,
  d.price,
  d.preparation_time_min,

  -- Costo de ingredientes
  COALESCE(SUM(dr.quantity * COALESCE(i.cost, 0)), 0)
                                                  AS ingredient_cost,

  -- Costo de mano de obra directa por tiempo de preparación
  -- kitchen_hourly_rate en system_config → pesos por hora
  ROUND(
    (d.preparation_time_min::numeric / 60.0)
    * COALESCE(
        (SELECT config_value::numeric
         FROM public.system_config sc
         WHERE sc.tenant_id = d.tenant_id
           AND sc.config_key = 'kitchen_hourly_rate'
         LIMIT 1),
        0
      ),
    2
  )                                               AS labor_cost,

  -- Overhead % (configurable, default 35%)
  COALESCE(
    (SELECT config_value::numeric
     FROM public.system_config sc
     WHERE sc.tenant_id = d.tenant_id
       AND sc.config_key = 'overhead_pct'
     LIMIT 1),
    35
  )                                               AS overhead_pct,

  -- Costo total (ingredientes + mano de obra)
  COALESCE(SUM(dr.quantity * COALESCE(i.cost, 0)), 0)
  + ROUND(
      (d.preparation_time_min::numeric / 60.0)
      * COALESCE(
          (SELECT config_value::numeric
           FROM public.system_config sc
           WHERE sc.tenant_id = d.tenant_id
             AND sc.config_key = 'kitchen_hourly_rate'
           LIMIT 1),
          0
        ),
      2
    )                                             AS total_cost,

  -- Margen % sobre precio de venta (considerando solo ingredient + labor)
  CASE
    WHEN d.price > 0 THEN ROUND((
      (d.price
        - COALESCE(SUM(dr.quantity * COALESCE(i.cost, 0)), 0)
        - ROUND(
            (d.preparation_time_min::numeric / 60.0)
            * COALESCE(
                (SELECT config_value::numeric
                 FROM public.system_config sc
                 WHERE sc.tenant_id = d.tenant_id
                   AND sc.config_key = 'kitchen_hourly_rate'
                 LIMIT 1),
                0
              ),
            2
          )
      ) / d.price * 100
    )::numeric, 2)
    ELSE 0
  END                                             AS margin_pct

FROM public.dishes d
LEFT JOIN public.dish_recipes dr ON dr.dish_id = d.id
LEFT JOIN public.ingredients i   ON i.id = dr.ingredient_id
GROUP BY d.id, d.name, d.tenant_id, d.price, d.preparation_time_min;

