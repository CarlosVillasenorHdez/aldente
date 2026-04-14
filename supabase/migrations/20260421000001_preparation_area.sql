-- ============================================================================
-- preparation_area en dishes + view actualizada con rate por área
-- Aplica DESPUÉS de 20260421000000_labor_cost_per_dish.sql
-- ============================================================================

-- Columna preparation_area: 'cocina' (default) o 'barra'
ALTER TABLE public.dishes
  ADD COLUMN IF NOT EXISTS preparation_area TEXT NOT NULL DEFAULT 'cocina'
  CHECK (preparation_area IN ('cocina', 'barra'));

-- Reconstruir view con rate dinámico según área del platillo
DROP VIEW IF EXISTS public.v_dish_cost_summary;

CREATE OR REPLACE VIEW public.v_dish_cost_summary AS
SELECT
  d.id                                              AS dish_id,
  d.name                                            AS dish_name,
  d.tenant_id,
  d.price,
  d.preparation_time_min,
  d.preparation_area,

  -- Costo de ingredientes
  COALESCE(SUM(dr.quantity * COALESCE(i.cost, 0)), 0)
                                                    AS ingredient_cost,

  -- Labor cost según área de preparación:
  --   preparation_area = 'barra' → usa bar_hourly_rate
  --   preparation_area = 'cocina' (default) → usa kitchen_hourly_rate
  ROUND(
    (d.preparation_time_min::numeric / 60.0) *
    CASE d.preparation_area
      WHEN 'barra' THEN COALESCE(
        (SELECT config_value::numeric FROM public.system_config
         WHERE tenant_id = d.tenant_id AND config_key = 'bar_hourly_rate' LIMIT 1), 0)
      ELSE COALESCE(
        (SELECT config_value::numeric FROM public.system_config
         WHERE tenant_id = d.tenant_id AND config_key = 'kitchen_hourly_rate' LIMIT 1), 0)
    END,
    2
  )                                                 AS labor_cost,

  -- Overhead %
  COALESCE(
    (SELECT config_value::numeric FROM public.system_config
     WHERE tenant_id = d.tenant_id AND config_key = 'overhead_pct' LIMIT 1),
    35
  )                                                 AS overhead_pct,

  -- Total cost
  COALESCE(SUM(dr.quantity * COALESCE(i.cost, 0)), 0)
  + ROUND(
      (d.preparation_time_min::numeric / 60.0) *
      CASE d.preparation_area
        WHEN 'barra' THEN COALESCE(
          (SELECT config_value::numeric FROM public.system_config
           WHERE tenant_id = d.tenant_id AND config_key = 'bar_hourly_rate' LIMIT 1), 0)
        ELSE COALESCE(
          (SELECT config_value::numeric FROM public.system_config
           WHERE tenant_id = d.tenant_id AND config_key = 'kitchen_hourly_rate' LIMIT 1), 0)
      END,
      2
    )                                               AS total_cost,

  -- Margin %
  CASE WHEN d.price > 0 THEN ROUND((
    (d.price
      - COALESCE(SUM(dr.quantity * COALESCE(i.cost, 0)), 0)
      - ROUND(
          (d.preparation_time_min::numeric / 60.0) *
          CASE d.preparation_area
            WHEN 'barra' THEN COALESCE(
              (SELECT config_value::numeric FROM public.system_config
               WHERE tenant_id = d.tenant_id AND config_key = 'bar_hourly_rate' LIMIT 1), 0)
            ELSE COALESCE(
              (SELECT config_value::numeric FROM public.system_config
               WHERE tenant_id = d.tenant_id AND config_key = 'kitchen_hourly_rate' LIMIT 1), 0)
          END,
          2
        )
    ) / d.price * 100
  )::numeric, 2)
  ELSE 0 END                                        AS margin_pct

FROM public.dishes d
LEFT JOIN public.dish_recipes dr ON dr.dish_id = d.id
LEFT JOIN public.ingredients i   ON i.id = dr.ingredient_id
GROUP BY d.id, d.name, d.tenant_id, d.price, d.preparation_time_min, d.preparation_area;
