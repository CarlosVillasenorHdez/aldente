-- ============================================================================
-- Recetas Dragon Wok — versión final
-- Usa INSERT WHERE NOT EXISTS en lugar de ON CONFLICT (no hay unique constraint)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================================

DO $$
DECLARE
  v_tid UUID;
  ing   RECORD;
BEGIN
  SELECT id INTO v_tid FROM public.tenants WHERE slug = 'dragon-wok' LIMIT 1;
  IF v_tid IS NULL THEN
    RAISE EXCEPTION 'Tenant dragon-wok no encontrado';
  END IF;

  -- Insertar ingredientes solo si no existen
  FOR ing IN SELECT * FROM (VALUES
    ('Camarón fresco',    'Mariscos',        'g',  0.22, 2000, 500),
    ('Calamar',           'Mariscos',        'g',  0.15, 1500, 300),
    ('Pulpo',             'Mariscos',        'g',  0.20, 1000, 200),
    ('Cerdo molido',      'Carnes',          'g',  0.08, 3000, 500),
    ('Res filete',        'Carnes',          'g',  0.18, 2000, 400),
    ('Pollo pechuga',     'Carnes y Aves',   'g',  0.07, 3000, 500),
    ('Col china',         'Verduras',        'g',  0.02, 2000, 300),
    ('Zanahoria',         'Verduras',        'g',  0.01, 2000, 300),
    ('Cebolla cambray',   'Verduras',        'g',  0.02, 1000, 200),
    ('Pimiento rojo',     'Verduras',        'g',  0.03, 1000, 200),
    ('Pimiento verde',    'Verduras',        'g',  0.03, 1000, 200),
    ('Brócoli',           'Verduras',        'g',  0.02, 1500, 200),
    ('Bok choy',          'Verduras',        'g',  0.03, 1000, 150),
    ('Champiñones',       'Verduras',        'g',  0.04, 1000, 150),
    ('Germinado de soya', 'Verduras',        'g',  0.02,  500, 100),
    ('Jengibre fresco',   'Especias',        'g',  0.04,  300,  50),
    ('Ajo',               'Especias',        'g',  0.03,  500,  50),
    ('Salsa de soya',     'Aceites y Salsas','ml', 0.02, 2000, 300),
    ('Aceite de ajonjolí','Aceites y Salsas','ml', 0.08,  500, 100),
    ('Salsa ostión',      'Aceites y Salsas','ml', 0.05,  500, 100),
    ('Vinagre de arroz',  'Aceites y Salsas','ml', 0.02,  500, 100),
    ('Aceite vegetal',    'Aceites y Salsas','ml', 0.01, 3000, 500),
    ('Arroz jazmín',      'Pastas y Granos', 'g',  0.02, 5000,1000),
    ('Fideos de arroz',   'Pastas y Granos', 'g',  0.03, 2000, 300),
    ('Fécula de maíz',    'Abarrotes',       'g',  0.01, 1000, 100),
    ('Wonton wrappers',   'Panadería',       'pz', 0.60,  200,  40),
    ('Caldo de res',      'Abarrotes',       'ml', 0.01, 5000, 500),
    ('Caldo de pollo',    'Abarrotes',       'ml', 0.01, 5000, 500),
    ('Té verde',          'Bebidas',         'g',  0.15,  500, 100),
    ('Leche',             'Lácteos',         'ml', 0.01, 2000, 300),
    ('Azúcar',            'Abarrotes',       'g',  0.01, 2000, 200)
  ) AS x(iname, icat, iunit, icost, istock, imin)
  LOOP
    INSERT INTO public.ingredients (name, category, unit, cost, stock, min_stock, tenant_id)
    SELECT ing.iname, ing.icat::public.ingredient_category, ing.iunit::public.ingredient_unit,
           ing.icost::numeric, ing.istock::numeric, ing.imin::numeric, v_tid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.ingredients
      WHERE name = ing.iname AND tenant_id = v_tid
    );
  END LOOP;

  RAISE NOTICE 'Ingredientes listos para dragon-wok (tid: %)', v_tid;
END;
$$;

-- ── Recetas ──────────────────────────────────────────────────────────────────
INSERT INTO public.dish_recipes (dish_id, ingredient_id, quantity, unit, tenant_id)
SELECT d.id, i.id, r.qty::numeric, r.unit,
       (SELECT id FROM public.tenants WHERE slug = 'dragon-wok' LIMIT 1)
FROM
  (VALUES
    ('Gyozas al vapor (6 pzs)',      'Cerdo molido',        60,  'g'),
    ('Gyozas al vapor (6 pzs)',      'Col china',           30,  'g'),
    ('Gyozas al vapor (6 pzs)',      'Cebolla cambray',     10,  'g'),
    ('Gyozas al vapor (6 pzs)',      'Jengibre fresco',      5,  'g'),
    ('Gyozas al vapor (6 pzs)',      'Salsa de soya',       20,  'ml'),
    ('Gyozas al vapor (6 pzs)',      'Aceite de ajonjolí',   5,  'ml'),
    ('Gyozas al vapor (6 pzs)',      'Wonton wrappers',      6,  'pz'),
    ('Rollos primavera (4 pzs)',     'Cerdo molido',        50,  'g'),
    ('Rollos primavera (4 pzs)',     'Col china',           40,  'g'),
    ('Rollos primavera (4 pzs)',     'Zanahoria',           20,  'g'),
    ('Rollos primavera (4 pzs)',     'Germinado de soya',   20,  'g'),
    ('Rollos primavera (4 pzs)',     'Salsa de soya',       10,  'ml'),
    ('Rollos primavera (4 pzs)',     'Fécula de maíz',       5,  'g'),
    ('Rollos primavera (4 pzs)',     'Aceite vegetal',      30,  'ml'),
    ('Sopa won ton',                 'Caldo de pollo',     300,  'ml'),
    ('Sopa won ton',                 'Cerdo molido',        40,  'g'),
    ('Sopa won ton',                 'Camarón fresco',      30,  'g'),
    ('Sopa won ton',                 'Wonton wrappers',      4,  'pz'),
    ('Sopa won ton',                 'Cebolla cambray',     10,  'g'),
    ('Sopa won ton',                 'Salsa de soya',       15,  'ml'),
    ('Sopa won ton',                 'Jengibre fresco',      3,  'g'),
    ('Ensalada de pepino',           'Salsa de soya',       20,  'ml'),
    ('Ensalada de pepino',           'Aceite de ajonjolí',  10,  'ml'),
    ('Ensalada de pepino',           'Vinagre de arroz',    15,  'ml'),
    ('Ensalada de pepino',           'Ajo',                  5,  'g'),
    ('Ensalada de pepino',           'Jengibre fresco',      3,  'g'),
    ('Arroz frito yangchow',         'Arroz jazmín',       180,  'g'),
    ('Arroz frito yangchow',         'Camarón fresco',      60,  'g'),
    ('Arroz frito yangchow',         'Cerdo molido',        40,  'g'),
    ('Arroz frito yangchow',         'Zanahoria',           20,  'g'),
    ('Arroz frito yangchow',         'Cebolla cambray',     15,  'g'),
    ('Arroz frito yangchow',         'Pimiento rojo',       20,  'g'),
    ('Arroz frito yangchow',         'Salsa de soya',       20,  'ml'),
    ('Arroz frito yangchow',         'Aceite vegetal',      15,  'ml'),
    ('Pollo en salsa negra',         'Pollo pechuga',      180,  'g'),
    ('Pollo en salsa negra',         'Salsa ostión',        30,  'ml'),
    ('Pollo en salsa negra',         'Salsa de soya',       20,  'ml'),
    ('Pollo en salsa negra',         'Pimiento rojo',       30,  'g'),
    ('Pollo en salsa negra',         'Pimiento verde',      30,  'g'),
    ('Pollo en salsa negra',         'Cebolla cambray',     15,  'g'),
    ('Pollo en salsa negra',         'Jengibre fresco',      5,  'g'),
    ('Pollo en salsa negra',         'Ajo',                  5,  'g'),
    ('Pollo en salsa negra',         'Fécula de maíz',       8,  'g'),
    ('Pollo en salsa negra',         'Aceite vegetal',      15,  'ml'),
    ('Res en salsa teriyaki',        'Res filete',         160,  'g'),
    ('Res en salsa teriyaki',        'Salsa de soya',       30,  'ml'),
    ('Res en salsa teriyaki',        'Azúcar',              10,  'g'),
    ('Res en salsa teriyaki',        'Jengibre fresco',      5,  'g'),
    ('Res en salsa teriyaki',        'Ajo',                  5,  'g'),
    ('Res en salsa teriyaki',        'Aceite de ajonjolí',   5,  'ml'),
    ('Res en salsa teriyaki',        'Fécula de maíz',       6,  'g'),
    ('Res en salsa teriyaki',        'Brócoli',             60,  'g'),
    ('Res en salsa teriyaki',        'Zanahoria',           30,  'g'),
    ('Camarones al ajo mantequilla', 'Camarón fresco',     200,  'g'),
    ('Camarones al ajo mantequilla', 'Ajo',                 10,  'g'),
    ('Camarones al ajo mantequilla', 'Salsa de soya',       15,  'ml'),
    ('Camarones al ajo mantequilla', 'Aceite vegetal',      15,  'ml'),
    ('Camarones al ajo mantequilla', 'Cebolla cambray',     10,  'g'),
    ('Chow mein de pollo',           'Fideos de arroz',    120,  'g'),
    ('Chow mein de pollo',           'Pollo pechuga',      120,  'g'),
    ('Chow mein de pollo',           'Col china',           40,  'g'),
    ('Chow mein de pollo',           'Zanahoria',           25,  'g'),
    ('Chow mein de pollo',           'Germinado de soya',   20,  'g'),
    ('Chow mein de pollo',           'Salsa de soya',       25,  'ml'),
    ('Chow mein de pollo',           'Salsa ostión',        15,  'ml'),
    ('Chow mein de pollo',           'Aceite vegetal',      15,  'ml'),
    ('Chow mein de pollo',           'Ajo',                  5,  'g'),
    ('Pad thai de camarón',          'Fideos de arroz',    130,  'g'),
    ('Pad thai de camarón',          'Camarón fresco',     100,  'g'),
    ('Pad thai de camarón',          'Germinado de soya',   25,  'g'),
    ('Pad thai de camarón',          'Cebolla cambray',     15,  'g'),
    ('Pad thai de camarón',          'Salsa de soya',       20,  'ml'),
    ('Pad thai de camarón',          'Vinagre de arroz',    10,  'ml'),
    ('Pad thai de camarón',          'Azúcar',               8,  'g'),
    ('Pad thai de camarón',          'Aceite vegetal',      15,  'ml'),
    ('Pato laqueado',                'Salsa de soya',       40,  'ml'),
    ('Pato laqueado',                'Salsa ostión',        20,  'ml'),
    ('Pato laqueado',                'Azúcar',              15,  'g'),
    ('Pato laqueado',                'Jengibre fresco',     10,  'g'),
    ('Pato laqueado',                'Ajo',                  8,  'g'),
    ('Mariscos al vapor',            'Camarón fresco',     100,  'g'),
    ('Mariscos al vapor',            'Calamar',             80,  'g'),
    ('Mariscos al vapor',            'Caldo de pollo',     100,  'ml'),
    ('Mariscos al vapor',            'Jengibre fresco',      8,  'g'),
    ('Mariscos al vapor',            'Cebolla cambray',     10,  'g'),
    ('Mariscos al vapor',            'Salsa de soya',       20,  'ml'),
    ('Mariscos al vapor',            'Aceite de ajonjolí',   8,  'ml'),
    ('Hot pot individual',           'Caldo de res',       400,  'ml'),
    ('Hot pot individual',           'Res filete',          80,  'g'),
    ('Hot pot individual',           'Camarón fresco',      60,  'g'),
    ('Hot pot individual',           'Bok choy',            50,  'g'),
    ('Hot pot individual',           'Champiñones',         40,  'g'),
    ('Hot pot individual',           'Fideos de arroz',     60,  'g'),
    ('Hot pot individual',           'Salsa de soya',       20,  'ml'),
    ('Hot pot individual',           'Jengibre fresco',      5,  'g'),
    ('Pulmón de mar',                'Vinagre de arroz',    20,  'ml'),
    ('Pulmón de mar',                'Aceite de ajonjolí',  10,  'ml'),
    ('Pulmón de mar',                'Salsa de soya',       15,  'ml'),
    ('Pulmón de mar',                'Jengibre fresco',      5,  'g'),
    ('Pulmón de mar',                'Ajo',                  3,  'g'),
    ('Té de jazmín',                 'Té verde',             4,  'g'),
    ('Agua de horchata',             'Leche',              100,  'ml'),
    ('Agua de horchata',             'Azúcar',              20,  'g'),
    ('Granola con yogurt',           'Leche',               80,  'ml'),
    ('Granola con yogurt',           'Azúcar',              10,  'g')
  ) AS r(dish_name, ingredient_name, qty, unit)
  JOIN public.dishes d
    ON d.name = r.dish_name
    AND d.tenant_id = (SELECT id FROM public.tenants WHERE slug = 'dragon-wok' LIMIT 1)
  JOIN public.ingredients i
    ON i.name = r.ingredient_name
    AND i.tenant_id = (SELECT id FROM public.tenants WHERE slug = 'dragon-wok' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM public.dish_recipes dr
  WHERE dr.dish_id = d.id AND dr.ingredient_id = i.id
);

-- Verificación
SELECT d.name AS platillo, COUNT(dr.id) AS ingredientes
FROM public.dishes d
LEFT JOIN public.dish_recipes dr ON dr.dish_id = d.id
WHERE d.tenant_id = (SELECT id FROM public.tenants WHERE slug = 'dragon-wok' LIMIT 1)
GROUP BY d.name
ORDER BY ingredientes DESC, d.name;
