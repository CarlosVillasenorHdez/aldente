-- =============================================================================
-- RESEED MENU PER RESTAURANT
-- Wipes all existing dishes, ingredients, and recipes for the 3 demo restaurants
-- then re-inserts them separately so each restaurant has its own unique data.
-- Restaurants: Dummy Demo (tid 00000000-0000-0000-0000-000000000001), Dragon Wok, Barista
-- =============================================================================

DO $$
DECLARE
  tid_demo   UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  tid_wok    UUID;
  tid_bar    UUID;
  bid_demo   UUID;
  bid_wok    UUID;
  bid_bar    UUID;

  -- ══════════════════════════════════════════════════════════════════════════
  -- DUMMY DEMO — Ingredient UUIDs
  -- ══════════════════════════════════════════════════════════════════════════
  d_ing_res       UUID := gen_random_uuid();
  d_ing_pol       UUID := gen_random_uuid();
  d_ing_cerdo     UUID := gen_random_uuid();
  d_ing_cam       UUID := gen_random_uuid();
  d_ing_agu       UUID := gen_random_uuid();
  d_ing_jit       UUID := gen_random_uuid();
  d_ing_ceb       UUID := gen_random_uuid();
  d_ing_chi_ser   UUID := gen_random_uuid();
  d_ing_chi_anc   UUID := gen_random_uuid();
  d_ing_chi_gua   UUID := gen_random_uuid();
  d_ing_cil       UUID := gen_random_uuid();
  d_ing_lim       UUID := gen_random_uuid();
  d_ing_ajo       UUID := gen_random_uuid();
  d_ing_flo_cal   UUID := gen_random_uuid();
  d_ing_elo       UUID := gen_random_uuid();
  d_ing_que_oax   UUID := gen_random_uuid();
  d_ing_que_cot   UUID := gen_random_uuid();
  d_ing_cre       UUID := gen_random_uuid();
  d_ing_man       UUID := gen_random_uuid();
  d_ing_lec       UUID := gen_random_uuid();
  d_ing_hue       UUID := gen_random_uuid();
  d_ing_caj       UUID := gen_random_uuid();
  d_ing_tor       UUID := gen_random_uuid();
  d_ing_tot       UUID := gen_random_uuid();
  d_ing_arr       UUID := gen_random_uuid();
  d_ing_fri       UUID := gen_random_uuid();
  d_ing_ace       UUID := gen_random_uuid();
  d_ing_azu       UUID := gen_random_uuid();
  d_ing_mai       UUID := gen_random_uuid();
  d_ing_may       UUID := gen_random_uuid();
  d_ing_jama      UUID := gen_random_uuid();
  d_ing_arr_beb   UUID := gen_random_uuid();
  d_ing_cafe      UUID := gen_random_uuid();
  d_ing_pil       UUID := gen_random_uuid();
  d_ing_fre       UUID := gen_random_uuid();
  d_ing_chi_hab   UUID := gen_random_uuid();
  d_ing_can       UUID := gen_random_uuid();
  d_ing_vai       UUID := gen_random_uuid();
  d_ing_com       UUID := gen_random_uuid();
  d_ing_ore       UUID := gen_random_uuid();
  d_ing_sal       UUID := gen_random_uuid();
  d_ing_epa       UUID := gen_random_uuid();
  d_ing_tec       UUID := gen_random_uuid();
  d_ing_tri       UUID := gen_random_uuid();
  d_ing_agu_min   UUID := gen_random_uuid();
  d_ing_ref       UUID := gen_random_uuid();
  d_ing_cer_cla   UUID := gen_random_uuid();

  -- DUMMY DEMO — Dish UUIDs
  d_dish_guac     UUID := gen_random_uuid();
  d_dish_sopa     UUID := gen_random_uuid();
  d_dish_elo      UUID := gen_random_uuid();
  d_dish_quesad   UUID := gen_random_uuid();
  d_dish_tacos    UUID := gen_random_uuid();
  d_dish_mole     UUID := gen_random_uuid();
  d_dish_birria   UUID := gen_random_uuid();
  d_dish_pozole   UUID := gen_random_uuid();
  d_dish_ench     UUID := gen_random_uuid();
  d_dish_cam      UUID := gen_random_uuid();
  d_dish_flan     UUID := gen_random_uuid();
  d_dish_chur     UUID := gen_random_uuid();
  d_dish_tres     UUID := gen_random_uuid();
  d_dish_jama     UUID := gen_random_uuid();
  d_dish_hor      UUID := gen_random_uuid();
  d_dish_marg     UUID := gen_random_uuid();
  d_dish_cerv     UUID := gen_random_uuid();
  d_dish_cafe     UUID := gen_random_uuid();
  d_dish_sal      UUID := gen_random_uuid();
  d_dish_tor      UUID := gen_random_uuid();
  d_dish_arr      UUID := gen_random_uuid();

  -- ══════════════════════════════════════════════════════════════════════════
  -- DRAGON WOK — Ingredient UUIDs
  -- ══════════════════════════════════════════════════════════════════════════
  w_ing_cerdo     UUID := gen_random_uuid();
  w_ing_pol       UUID := gen_random_uuid();
  w_ing_cam       UUID := gen_random_uuid();
  w_ing_tofu      UUID := gen_random_uuid();
  w_ing_res       UUID := gen_random_uuid();
  w_ing_ceb_ch    UUID := gen_random_uuid();
  w_ing_ajo       UUID := gen_random_uuid();
  w_ing_jen       UUID := gen_random_uuid();
  w_ing_bro       UUID := gen_random_uuid();
  w_ing_zan       UUID := gen_random_uuid();
  w_ing_pim_roj   UUID := gen_random_uuid();
  w_ing_pim_ver   UUID := gen_random_uuid();
  w_ing_col_chi   UUID := gen_random_uuid();
  w_ing_bok_cho   UUID := gen_random_uuid();
  w_ing_hon_shi   UUID := gen_random_uuid();
  w_ing_arr_jas   UUID := gen_random_uuid();
  w_ing_fid_arr   UUID := gen_random_uuid();
  w_ing_fid_tri   UUID := gen_random_uuid();
  w_ing_sal_soy   UUID := gen_random_uuid();
  w_ing_sal_ost   UUID := gen_random_uuid();
  w_ing_sal_hoi   UUID := gen_random_uuid();
  w_ing_ace_ses   UUID := gen_random_uuid();
  w_ing_ace_veg   UUID := gen_random_uuid();
  w_ing_vin_arr   UUID := gen_random_uuid();
  w_ing_azu       UUID := gen_random_uuid();
  w_ing_mai_fec   UUID := gen_random_uuid();
  w_ing_coc_lec   UUID := gen_random_uuid();
  w_ing_lim       UUID := gen_random_uuid();
  w_ing_cil       UUID := gen_random_uuid();
  w_ing_chi_pic   UUID := gen_random_uuid();
  w_ing_man_cac   UUID := gen_random_uuid();
  w_ing_ceb_ver   UUID := gen_random_uuid();
  w_ing_te_ver    UUID := gen_random_uuid();
  w_ing_te_jas    UUID := gen_random_uuid();
  w_ing_cer_asi   UUID := gen_random_uuid();
  w_ing_agu_min   UUID := gen_random_uuid();

  -- DRAGON WOK — Dish UUIDs
  w_dish_rol_pri  UUID := gen_random_uuid();
  w_dish_sopa_wa  UUID := gen_random_uuid();
  w_dish_dim_sum  UUID := gen_random_uuid();
  w_dish_ens_alg  UUID := gen_random_uuid();
  w_dish_pol_dul  UUID := gen_random_uuid();
  w_dish_res_bro  UUID := gen_random_uuid();
  w_dish_cam_wok  UUID := gen_random_uuid();
  w_dish_cerdo_h  UUID := gen_random_uuid();
  w_dish_tofu_pi  UUID := gen_random_uuid();
  w_dish_arr_fri  UUID := gen_random_uuid();
  w_dish_fid_sal  UUID := gen_random_uuid();
  w_dish_fid_coc  UUID := gen_random_uuid();
  w_dish_mochi    UUID := gen_random_uuid();
  w_dish_flan_ma  UUID := gen_random_uuid();
  w_dish_te_ver   UUID := gen_random_uuid();
  w_dish_te_jas   UUID := gen_random_uuid();
  w_dish_cer_asi  UUID := gen_random_uuid();
  w_dish_limon    UUID := gen_random_uuid();
  w_dish_arr_bla  UUID := gen_random_uuid();
  w_dish_sal_agr  UUID := gen_random_uuid();

  -- ══════════════════════════════════════════════════════════════════════════
  -- BARISTA — Ingredient UUIDs
  -- ══════════════════════════════════════════════════════════════════════════
  b_ing_cafe_esp  UUID := gen_random_uuid();
  b_ing_cafe_fil  UUID := gen_random_uuid();
  b_ing_lec_ent   UUID := gen_random_uuid();
  b_ing_lec_des   UUID := gen_random_uuid();
  b_ing_lec_avo   UUID := gen_random_uuid();
  b_ing_lec_alm   UUID := gen_random_uuid();
  b_ing_cre_bat   UUID := gen_random_uuid();
  b_ing_azu       UUID := gen_random_uuid();
  b_ing_vai       UUID := gen_random_uuid();
  b_ing_can       UUID := gen_random_uuid();
  b_ing_cho_pol   UUID := gen_random_uuid();
  b_ing_cho_neg   UUID := gen_random_uuid();
  b_ing_car_cho   UUID := gen_random_uuid();
  b_ing_te_neg    UUID := gen_random_uuid();
  b_ing_te_ver    UUID := gen_random_uuid();
  b_ing_te_man    UUID := gen_random_uuid();
  b_ing_mat       UUID := gen_random_uuid();
  b_ing_agu_min   UUID := gen_random_uuid();
  b_ing_jug_nar   UUID := gen_random_uuid();
  b_ing_jug_man   UUID := gen_random_uuid();
  b_ing_man_cac   UUID := gen_random_uuid();
  b_ing_fre       UUID := gen_random_uuid();
  b_ing_pla       UUID := gen_random_uuid();
  b_ing_blu       UUID := gen_random_uuid();
  b_ing_avo       UUID := gen_random_uuid();
  b_ing_pan_int   UUID := gen_random_uuid();
  b_ing_pan_cro   UUID := gen_random_uuid();
  b_ing_hue       UUID := gen_random_uuid();
  b_ing_que_cre   UUID := gen_random_uuid();
  b_ing_man_sal   UUID := gen_random_uuid();
  b_ing_sal_mar   UUID := gen_random_uuid();
  b_ing_azu_mor   UUID := gen_random_uuid();
  b_ing_jar_agu   UUID := gen_random_uuid();
  b_ing_lim       UUID := gen_random_uuid();
  b_ing_men       UUID := gen_random_uuid();
  b_ing_jen       UUID := gen_random_uuid();

  -- BARISTA — Dish UUIDs
  b_dish_esp      UUID := gen_random_uuid();
  b_dish_cap      UUID := gen_random_uuid();
  b_dish_lat      UUID := gen_random_uuid();
  b_dish_ame      UUID := gen_random_uuid();
  b_dish_mac      UUID := gen_random_uuid();
  b_dish_fla      UUID := gen_random_uuid();
  b_dish_mat      UUID := gen_random_uuid();
  b_dish_cho_cal  UUID := gen_random_uuid();
  b_dish_te_neg   UUID := gen_random_uuid();
  b_dish_te_ver   UUID := gen_random_uuid();
  b_dish_cha_lat  UUID := gen_random_uuid();
  b_dish_agu_min  UUID := gen_random_uuid();
  b_dish_jug_nar  UUID := gen_random_uuid();
  b_dish_smo_fre  UUID := gen_random_uuid();
  b_dish_cro      UUID := gen_random_uuid();
  b_dish_avo_tos  UUID := gen_random_uuid();
  b_dish_pan_ban  UUID := gen_random_uuid();
  b_dish_che_cak  UUID := gen_random_uuid();
  b_dish_bro_cho  UUID := gen_random_uuid();
  b_dish_gra_avo  UUID := gen_random_uuid();

BEGIN

  -- ── Resolve tenant IDs ────────────────────────────────────────────────────
  SELECT id INTO tid_wok FROM public.tenants
    WHERE name ILIKE '%dragon%wok%' OR slug ILIKE '%dragon%wok%'
    LIMIT 1;

  SELECT id INTO tid_bar FROM public.tenants
    WHERE name ILIKE '%barista%' OR slug ILIKE '%barista%'
    LIMIT 1;

  -- ── Resolve branch IDs ────────────────────────────────────────────────────
  SELECT id INTO bid_demo FROM public.branches WHERE tenant_id = tid_demo LIMIT 1;
  IF tid_wok IS NOT NULL THEN
    SELECT id INTO bid_wok FROM public.branches WHERE tenant_id = tid_wok LIMIT 1;
  END IF;
  IF tid_bar IS NOT NULL THEN
    SELECT id INTO bid_bar FROM public.branches WHERE tenant_id = tid_bar LIMIT 1;
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- STEP 1: WIPE existing data for all 3 restaurants
  -- Delete in dependency order: recipes → dishes → ingredients
  -- ════════════════════════════════════════════════════════════════════════

  -- Wipe Dummy Demo
  DELETE FROM public.dish_recipes WHERE tenant_id = tid_demo;
  DELETE FROM public.dishes        WHERE tenant_id = tid_demo;
  DELETE FROM public.ingredients   WHERE tenant_id = tid_demo;

  -- Wipe Dragon Wok (only if tenant exists)
  IF tid_wok IS NOT NULL THEN
    DELETE FROM public.dish_recipes WHERE tenant_id = tid_wok;
    DELETE FROM public.dishes        WHERE tenant_id = tid_wok;
    DELETE FROM public.ingredients   WHERE tenant_id = tid_wok;
  END IF;

  -- Wipe Barista (only if tenant exists)
  IF tid_bar IS NOT NULL THEN
    DELETE FROM public.dish_recipes WHERE tenant_id = tid_bar;
    DELETE FROM public.dishes        WHERE tenant_id = tid_bar;
    DELETE FROM public.ingredients   WHERE tenant_id = tid_bar;
  END IF;

  RAISE NOTICE 'Wipe complete. Re-seeding per restaurant...';

  -- ════════════════════════════════════════════════════════════════════════
  -- STEP 2: DUMMY DEMO — Restaurante de Comida Mexicana
  -- ════════════════════════════════════════════════════════════════════════

  -- Ingredientes
  INSERT INTO public.ingredients (id, name, category, stock, unit, min_stock, cost, supplier, reorder_point, supplier_phone, tenant_id, branch_id) VALUES
    (d_ing_res,     'Carne de Res',           'Carnes',           15,   'kg',  8,    185, 'Carnicería El Toro',    10,  '55 1111 2222', tid_demo, bid_demo),
    (d_ing_pol,     'Pechuga de Pollo',       'Carnes',           20,   'kg',  8,    90,  'Avícola San Juan',      10,  '55 3333 4444', tid_demo, bid_demo),
    (d_ing_cerdo,   'Carne de Cerdo',         'Carnes',           12,   'kg',  5,    110, 'Carnicería El Toro',    6,   '55 1111 2222', tid_demo, bid_demo),
    (d_ing_cam,     'Camarón Mediano',        'Mariscos',         8,    'kg',  4,    280, 'Mariscos del Golfo',    5,   '55 5555 6666', tid_demo, bid_demo),
    (d_ing_agu,     'Aguacate',               'Verduras',         40,   'pz',  20,   13,  'Mercado Central',       25,  '55 7777 8888', tid_demo, bid_demo),
    (d_ing_jit,     'Jitomate',               'Verduras',         10,   'kg',  5,    28,  'Mercado Central',       6,   '55 7777 8888', tid_demo, bid_demo),
    (d_ing_ceb,     'Cebolla Blanca',         'Verduras',         12,   'kg',  5,    18,  'Mercado Central',       6,   '55 7777 8888', tid_demo, bid_demo),
    (d_ing_chi_ser, 'Chile Serrano',          'Verduras',         3,    'kg',  2,    45,  'Mercado Central',       2,   '55 7777 8888', tid_demo, bid_demo),
    (d_ing_chi_anc, 'Chile Ancho Seco',       'Especias',         1.5,  'kg',  0.5,  220, 'Especias del Sur',      0.6, '55 3434 5656', tid_demo, bid_demo),
    (d_ing_chi_gua, 'Chile Guajillo',         'Especias',         1.2,  'kg',  0.5,  200, 'Especias del Sur',      0.6, '55 3434 5656', tid_demo, bid_demo),
    (d_ing_chi_hab, 'Chile Habanero',         'Verduras',         0.8,  'kg',  0.3,  80,  'Mercado Central',       0.4, '55 7777 8888', tid_demo, bid_demo),
    (d_ing_cil,     'Cilantro',               'Verduras',         2,    'kg',  1,    35,  'Mercado Central',       1.5, '55 7777 8888', tid_demo, bid_demo),
    (d_ing_lim,     'Limón',                  'Verduras',         5,    'kg',  2,    22,  'Mercado Central',       3,   '55 7777 8888', tid_demo, bid_demo),
    (d_ing_ajo,     'Ajo',                    'Verduras',         2,    'kg',  0.5,  60,  'Mercado Central',       1,   '55 7777 8888', tid_demo, bid_demo),
    (d_ing_epa,     'Epazote',                'Verduras',         0.5,  'kg',  0.2,  40,  'Mercado Central',       0.3, '55 7777 8888', tid_demo, bid_demo),
    (d_ing_flo_cal, 'Flor de Calabaza',       'Verduras',         1.5,  'kg',  0.5,  90,  'Mercado Central',       0.8, '55 7777 8888', tid_demo, bid_demo),
    (d_ing_elo,     'Elote',                  'Verduras',         20,   'pz',  10,   8,   'Mercado Central',       12,  '55 7777 8888', tid_demo, bid_demo),
    (d_ing_que_oax, 'Queso Oaxaca',           'Lácteos',          8,    'kg',  4,    145, 'Lácteos La Vaca',       5,   '55 9999 0000', tid_demo, bid_demo),
    (d_ing_que_cot, 'Queso Cotija',           'Lácteos',          3,    'kg',  1,    130, 'Lácteos La Vaca',       2,   '55 9999 0000', tid_demo, bid_demo),
    (d_ing_cre,     'Crema Ácida',            'Lácteos',          10,   'lt',  4,    55,  'Lácteos La Vaca',       5,   '55 9999 0000', tid_demo, bid_demo),
    (d_ing_man,     'Mantequilla',            'Lácteos',          3,    'kg',  1,    95,  'Lácteos La Vaca',       2,   '55 9999 0000', tid_demo, bid_demo),
    (d_ing_lec,     'Leche Entera',           'Lácteos',          15,   'lt',  8,    22,  'Lácteos La Vaca',       10,  '55 9999 0000', tid_demo, bid_demo),
    (d_ing_hue,     'Huevo',                  'Lácteos',          60,   'pz',  24,   3,   'Lácteos La Vaca',       30,  '55 9999 0000', tid_demo, bid_demo),
    (d_ing_caj,     'Cajeta de Cabra',        'Lácteos',          2,    'lt',  0.5,  95,  'Lácteos La Vaca',       1,   '55 9999 0000', tid_demo, bid_demo),
    (d_ing_tor,     'Tortillas de Maíz',      'Abarrotes',        8,    'kg',  5,    20,  'Tortillería Lupita',    10,  '55 5656 7878', tid_demo, bid_demo),
    (d_ing_tot,     'Totopos',                'Abarrotes',        5,    'kg',  2,    55,  'Abarrotes Don Pepe',    3,   '55 9090 1212', tid_demo, bid_demo),
    (d_ing_arr,     'Arroz Blanco',           'Abarrotes',        15,   'kg',  5,    22,  'Abarrotes Don Pepe',    6,   '55 9090 1212', tid_demo, bid_demo),
    (d_ing_fri,     'Frijol Negro',           'Abarrotes',        10,   'kg',  4,    30,  'Abarrotes Don Pepe',    5,   '55 9090 1212', tid_demo, bid_demo),
    (d_ing_ace,     'Aceite Vegetal',         'Aceites y Salsas', 6,    'lt',  3,    48,  'Abarrotes Don Pepe',    4,   '55 9090 1212', tid_demo, bid_demo),
    (d_ing_azu,     'Azúcar',                 'Abarrotes',        8,    'kg',  3,    25,  'Abarrotes Don Pepe',    4,   '55 9090 1212', tid_demo, bid_demo),
    (d_ing_mai,     'Maíz Cacahuazintle',     'Abarrotes',        10,   'kg',  4,    35,  'Abarrotes Don Pepe',    5,   '55 9090 1212', tid_demo, bid_demo),
    (d_ing_may,     'Mayonesa',               'Aceites y Salsas', 3,    'kg',  1,    65,  'Abarrotes Don Pepe',    2,   '55 9090 1212', tid_demo, bid_demo),
    (d_ing_jama,    'Flor de Jamaica',        'Abarrotes',        2,    'kg',  0.5,  85,  'Abarrotes Don Pepe',    1,   '55 9090 1212', tid_demo, bid_demo),
    (d_ing_arr_beb, 'Arroz para Horchata',    'Abarrotes',        3,    'kg',  1,    22,  'Abarrotes Don Pepe',    2,   '55 9090 1212', tid_demo, bid_demo),
    (d_ing_cafe,    'Café Molido',            'Abarrotes',        2,    'kg',  0.5,  180, 'Abarrotes Don Pepe',    1,   '55 9090 1212', tid_demo, bid_demo),
    (d_ing_pil,     'Piloncillo',             'Abarrotes',        3,    'kg',  1,    40,  'Abarrotes Don Pepe',    2,   '55 9090 1212', tid_demo, bid_demo),
    (d_ing_fre,     'Fresas',                 'Frutas',           3,    'kg',  1,    55,  'Mercado Central',       2,   '55 7777 8888', tid_demo, bid_demo),
    (d_ing_can,     'Canela en Rama',         'Especias',         0.5,  'kg',  0.2,  160, 'Especias del Sur',      0.3, '55 3434 5656', tid_demo, bid_demo),
    (d_ing_vai,     'Vainilla Líquida',       'Especias',         0.5,  'lt',  0.2,  220, 'Especias del Sur',      0.3, '55 3434 5656', tid_demo, bid_demo),
    (d_ing_com,     'Comino Molido',          'Especias',         0.6,  'kg',  0.3,  180, 'Especias del Sur',      0.4, '55 3434 5656', tid_demo, bid_demo),
    (d_ing_ore,     'Orégano Seco',           'Especias',         0.4,  'kg',  0.2,  150, 'Especias del Sur',      0.3, '55 3434 5656', tid_demo, bid_demo),
    (d_ing_sal,     'Sal de Mar',             'Especias',         2,    'kg',  0.5,  30,  'Abarrotes Don Pepe',    1,   '55 9090 1212', tid_demo, bid_demo),
    (d_ing_tec,     'Tequila Blanco',         'Bebidas',          6,    'lt',  2,    180, 'Distribuidora Norte',   3,   '55 1212 3434', tid_demo, bid_demo),
    (d_ing_tri,     'Triple Sec',             'Bebidas',          3,    'lt',  1,    120, 'Distribuidora Norte',   2,   '55 1212 3434', tid_demo, bid_demo),
    (d_ing_agu_min, 'Agua Mineral 600ml',     'Bebidas',          72,   'pz',  24,   8,   'Distribuidora Norte',   30,  '55 1212 3434', tid_demo, bid_demo),
    (d_ing_ref,     'Refresco 355ml',         'Bebidas',          48,   'pz',  24,   12,  'Distribuidora Norte',   30,  '55 1212 3434', tid_demo, bid_demo),
    (d_ing_cer_cla, 'Cerveza Clara',          'Bebidas',          48,   'pz',  24,   18,  'Distribuidora Norte',   30,  '55 1212 3434', tid_demo, bid_demo)
  ON CONFLICT (id) DO NOTHING;

  -- Platillos
  INSERT INTO public.dishes (id, name, description, price, category, available, emoji, popular, tenant_id, branch_id) VALUES
    (d_dish_guac,   'Guacamole con Totopos',          'Aguacate fresco con jitomate, cebolla, cilantro y chile serrano. Acompañado de totopos artesanales.',                         89,  'Entradas',       true, '🥑', true,  tid_demo, bid_demo),
    (d_dish_sopa,   'Sopa de Lima',                   'Caldo de pollo con tiras de tortilla, lima, pollo deshebrado y chile habanero.',                                              75,  'Entradas',       true, '🍲', false, tid_demo, bid_demo),
    (d_dish_elo,    'Elotes Asados',                  'Elote a la parrilla con mayonesa, queso cotija, chile piquín y limón.',                                                       65,  'Entradas',       true, '🌽', false, tid_demo, bid_demo),
    (d_dish_quesad, 'Quesadilla de Flor de Calabaza', 'Flor de calabaza, quesillo y epazote en tortilla de maíz.',                                                                  95,  'Entradas',       true, '🧀', false, tid_demo, bid_demo),
    (d_dish_tacos,  'Tacos de Res (3 pzas)',           'Tortillas de maíz con carne de res al pastor, cebolla, cilantro y salsa verde.',                                            145, 'Platos Fuertes', true, '🌮', true,  tid_demo, bid_demo),
    (d_dish_mole,   'Mole Negro con Pollo',            'Pollo en salsa de mole negro oaxaqueño. Servido con arroz y frijoles.',                                                     175, 'Platos Fuertes', true, '🍗', false, tid_demo, bid_demo),
    (d_dish_birria, 'Birria de Res',                   'Caldo de res con chile guajillo, ancho y especias. Servido con consomé, cebolla y cilantro.',                               165, 'Platos Fuertes', true, '🥣', true,  tid_demo, bid_demo),
    (d_dish_pozole, 'Pozole Rojo',                     'Caldo de maíz cacahuazintle con carne de cerdo, chile guajillo y tostadas.',                                                155, 'Platos Fuertes', true, '🍜', true,  tid_demo, bid_demo),
    (d_dish_ench,   'Enchiladas Verdes',               'Pollo deshebrado, salsa verde, crema y queso.',                                                                             135, 'Platos Fuertes', true, '🫔', false, tid_demo, bid_demo),
    (d_dish_cam,    'Camarones al Ajillo',             'Camarones salteados en mantequilla, ajo, limón y chile serrano. Servidos con arroz.',                                       195, 'Platos Fuertes', true, '🦐', true,  tid_demo, bid_demo),
    (d_dish_flan,   'Flan Napolitano',                 'Flan cremoso de vainilla con caramelo dorado y crema batida.',                                                               70,  'Postres',        true, '🍮', false, tid_demo, bid_demo),
    (d_dish_chur,   'Churros con Cajeta',              'Churros crujientes espolvoreados con azúcar y canela, acompañados de cajeta de cabra.',                                      75,  'Postres',        true, '🍩', false, tid_demo, bid_demo),
    (d_dish_tres,   'Pastel de Tres Leches',           'Bizcocho esponjoso empapado en tres tipos de leche, cubierto con crema batida y fresas.',                                   85,  'Postres',        true, '🍰', true,  tid_demo, bid_demo),
    (d_dish_jama,   'Agua de Jamaica',                 'Agua fresca de flor de jamaica con azúcar de caña. Servida en jarra de 500 ml.',                                            35,  'Bebidas',        true, '🫙', false, tid_demo, bid_demo),
    (d_dish_hor,    'Horchata',                        'Agua de arroz con canela, vainilla y leche condensada. Servida fría.',                                                       35,  'Bebidas',        true, '🥛', false, tid_demo, bid_demo),
    (d_dish_marg,   'Margarita Clásica',               'Tequila blanco, triple sec, jugo de limón y sal en el borde. Servida en copa escarachada.',                                 95,  'Bebidas',        true, '🍹', true,  tid_demo, bid_demo),
    (d_dish_cerv,   'Cerveza Artesanal',               'Cerveza artesanal local de temporada.',                                                                                      75,  'Bebidas',        true, '🍺', false, tid_demo, bid_demo),
    (d_dish_cafe,   'Café de Olla',                    'Café negro con canela y piloncillo.',                                                                                        45,  'Bebidas',        true, '☕', false, tid_demo, bid_demo),
    (d_dish_sal,    'Salsa Roja Extra',                'Porción extra de salsa roja de chile de árbol tatemado.',                                                                    15,  'Extras',         true, '🌶️', false, tid_demo, bid_demo),
    (d_dish_tor,    'Tortillas de Maíz (5 pzas)',      'Tortillas de maíz azul hechas a mano, recién salidas del comal.',                                                           20,  'Extras',         true, '🫓', false, tid_demo, bid_demo),
    (d_dish_arr,    'Arroz y Frijoles',                'Guarnición de arroz blanco y frijoles negros.',                                                                              40,  'Extras',         true, '🍚', false, tid_demo, bid_demo)
  ON CONFLICT (id) DO NOTHING;

  -- Recetas
  INSERT INTO public.dish_recipes (dish_id, ingredient_id, quantity, unit, notes, tenant_id) VALUES
    (d_dish_guac,   d_ing_agu,      3,     'pz',  '3 aguacates medianos',       tid_demo),
    (d_dish_guac,   d_ing_jit,      0.1,   'kg',  '1 jitomate mediano',         tid_demo),
    (d_dish_guac,   d_ing_ceb,      0.05,  'kg',  'Media cebolla',              tid_demo),
    (d_dish_guac,   d_ing_chi_ser,  0.01,  'kg',  '1 chile serrano',            tid_demo),
    (d_dish_guac,   d_ing_cil,      0.02,  'kg',  'Manojo pequeño',             tid_demo),
    (d_dish_guac,   d_ing_lim,      0.05,  'kg',  '1 limón',                    tid_demo),
    (d_dish_guac,   d_ing_sal,      0.005, 'kg',  'Al gusto',                   tid_demo),
    (d_dish_guac,   d_ing_tot,      0.08,  'kg',  'Porción de totopos',         tid_demo),
    (d_dish_sopa,   d_ing_pol,      0.15,  'kg',  'Pechuga deshebrada',         tid_demo),
    (d_dish_sopa,   d_ing_ceb,      0.05,  'kg',  'Media cebolla',              tid_demo),
    (d_dish_sopa,   d_ing_ajo,      0.01,  'kg',  '2 dientes de ajo',           tid_demo),
    (d_dish_sopa,   d_ing_chi_hab,  0.005, 'kg',  'Chile habanero al gusto',    tid_demo),
    (d_dish_sopa,   d_ing_lim,      0.08,  'kg',  '2 limas',                    tid_demo),
    (d_dish_sopa,   d_ing_tor,      0.05,  'kg',  'Tiras de tortilla',          tid_demo),
    (d_dish_elo,    d_ing_elo,      2,     'pz',  '2 elotes',                   tid_demo),
    (d_dish_elo,    d_ing_may,      0.03,  'kg',  'Mayonesa al gusto',          tid_demo),
    (d_dish_elo,    d_ing_que_cot,  0.03,  'kg',  'Queso cotija rallado',       tid_demo),
    (d_dish_elo,    d_ing_lim,      0.04,  'kg',  '1 limón',                    tid_demo),
    (d_dish_quesad, d_ing_flo_cal,  0.08,  'kg',  'Flor de calabaza',           tid_demo),
    (d_dish_quesad, d_ing_que_oax,  0.1,   'kg',  'Quesillo',                   tid_demo),
    (d_dish_quesad, d_ing_epa,      0.01,  'kg',  'Epazote fresco',             tid_demo),
    (d_dish_quesad, d_ing_tor,      0.1,   'kg',  '2 tortillas grandes',        tid_demo),
    (d_dish_tacos,  d_ing_res,      0.18,  'kg',  'Carne de res al pastor',     tid_demo),
    (d_dish_tacos,  d_ing_tor,      0.09,  'kg',  '3 tortillas',                tid_demo),
    (d_dish_tacos,  d_ing_ceb,      0.04,  'kg',  'Cebolla picada',             tid_demo),
    (d_dish_tacos,  d_ing_cil,      0.02,  'kg',  'Cilantro fresco',            tid_demo),
    (d_dish_tacos,  d_ing_lim,      0.03,  'kg',  'Limón al gusto',             tid_demo),
    (d_dish_mole,   d_ing_pol,      0.25,  'kg',  'Pechuga de pollo',           tid_demo),
    (d_dish_mole,   d_ing_chi_anc,  0.04,  'kg',  'Chile ancho seco',           tid_demo),
    (d_dish_mole,   d_ing_chi_gua,  0.03,  'kg',  'Chile guajillo',             tid_demo),
    (d_dish_mole,   d_ing_ajo,      0.01,  'kg',  'Ajo',                        tid_demo),
    (d_dish_mole,   d_ing_ceb,      0.06,  'kg',  'Cebolla',                    tid_demo),
    (d_dish_mole,   d_ing_arr,      0.08,  'kg',  'Arroz blanco',               tid_demo),
    (d_dish_mole,   d_ing_fri,      0.08,  'kg',  'Frijoles negros',            tid_demo),
    (d_dish_birria, d_ing_res,      0.3,   'kg',  'Carne de res',               tid_demo),
    (d_dish_birria, d_ing_chi_gua,  0.04,  'kg',  'Chile guajillo',             tid_demo),
    (d_dish_birria, d_ing_chi_anc,  0.03,  'kg',  'Chile ancho',                tid_demo),
    (d_dish_birria, d_ing_com,      0.005, 'kg',  'Comino molido',              tid_demo),
    (d_dish_birria, d_ing_ore,      0.005, 'kg',  'Orégano',                    tid_demo),
    (d_dish_birria, d_ing_ceb,      0.06,  'kg',  'Cebolla',                    tid_demo),
    (d_dish_birria, d_ing_cil,      0.02,  'kg',  'Cilantro',                   tid_demo),
    (d_dish_pozole, d_ing_cerdo,    0.25,  'kg',  'Carne de cerdo',             tid_demo),
    (d_dish_pozole, d_ing_mai,      0.15,  'kg',  'Maíz cacahuazintle',         tid_demo),
    (d_dish_pozole, d_ing_chi_gua,  0.04,  'kg',  'Chile guajillo',             tid_demo),
    (d_dish_pozole, d_ing_ceb,      0.06,  'kg',  'Cebolla',                    tid_demo),
    (d_dish_pozole, d_ing_ore,      0.005, 'kg',  'Orégano',                    tid_demo),
    (d_dish_ench,   d_ing_pol,      0.2,   'kg',  'Pollo deshebrado',           tid_demo),
    (d_dish_ench,   d_ing_tor,      0.12,  'kg',  '3 tortillas',                tid_demo),
    (d_dish_ench,   d_ing_cre,      0.05,  'lt',  'Crema ácida',                tid_demo),
    (d_dish_ench,   d_ing_que_oax,  0.06,  'kg',  'Queso Oaxaca',               tid_demo),
    (d_dish_cam,    d_ing_cam,      0.2,   'kg',  'Camarones medianos',         tid_demo),
    (d_dish_cam,    d_ing_man,      0.03,  'kg',  'Mantequilla',                tid_demo),
    (d_dish_cam,    d_ing_ajo,      0.02,  'kg',  'Ajo picado',                 tid_demo),
    (d_dish_cam,    d_ing_lim,      0.04,  'kg',  'Limón',                      tid_demo),
    (d_dish_cam,    d_ing_chi_ser,  0.01,  'kg',  'Chile serrano',              tid_demo),
    (d_dish_cam,    d_ing_arr,      0.08,  'kg',  'Arroz blanco',               tid_demo),
    (d_dish_flan,   d_ing_hue,      3,     'pz',  'Huevos',                     tid_demo),
    (d_dish_flan,   d_ing_lec,      0.25,  'lt',  'Leche entera',               tid_demo),
    (d_dish_flan,   d_ing_azu,      0.08,  'kg',  'Azúcar',                     tid_demo),
    (d_dish_flan,   d_ing_vai,      0.01,  'lt',  'Vainilla',                   tid_demo),
    (d_dish_chur,   d_ing_azu,      0.05,  'kg',  'Azúcar',                     tid_demo),
    (d_dish_chur,   d_ing_can,      0.005, 'kg',  'Canela molida',              tid_demo),
    (d_dish_chur,   d_ing_caj,      0.06,  'lt',  'Cajeta de cabra',            tid_demo),
    (d_dish_chur,   d_ing_ace,      0.1,   'lt',  'Aceite para freír',          tid_demo),
    (d_dish_tres,   d_ing_hue,      4,     'pz',  'Huevos',                     tid_demo),
    (d_dish_tres,   d_ing_lec,      0.3,   'lt',  'Leche entera',               tid_demo),
    (d_dish_tres,   d_ing_cre,      0.15,  'lt',  'Crema para batir',           tid_demo),
    (d_dish_tres,   d_ing_azu,      0.12,  'kg',  'Azúcar',                     tid_demo),
    (d_dish_tres,   d_ing_fre,      0.1,   'kg',  'Fresas frescas',             tid_demo),
    (d_dish_jama,   d_ing_jama,     0.03,  'kg',  'Flor de jamaica',            tid_demo),
    (d_dish_jama,   d_ing_azu,      0.04,  'kg',  'Azúcar',                     tid_demo),
    (d_dish_hor,    d_ing_arr_beb,  0.05,  'kg',  'Arroz para horchata',        tid_demo),
    (d_dish_hor,    d_ing_can,      0.005, 'kg',  'Canela',                     tid_demo),
    (d_dish_hor,    d_ing_azu,      0.04,  'kg',  'Azúcar',                     tid_demo),
    (d_dish_marg,   d_ing_tec,      0.06,  'lt',  'Tequila blanco',             tid_demo),
    (d_dish_marg,   d_ing_tri,      0.03,  'lt',  'Triple sec',                 tid_demo),
    (d_dish_marg,   d_ing_lim,      0.04,  'kg',  'Jugo de limón',              tid_demo),
    (d_dish_marg,   d_ing_sal,      0.005, 'kg',  'Sal en el borde',            tid_demo),
    (d_dish_cerv,   d_ing_cer_cla,  1,     'pz',  'Botella de cerveza',         tid_demo),
    (d_dish_cafe,   d_ing_cafe,     0.015, 'kg',  'Café molido',                tid_demo),
    (d_dish_cafe,   d_ing_can,      0.005, 'kg',  'Canela en rama',             tid_demo),
    (d_dish_cafe,   d_ing_pil,      0.02,  'kg',  'Piloncillo',                 tid_demo),
    (d_dish_arr,    d_ing_arr,      0.1,   'kg',  'Arroz blanco',               tid_demo),
    (d_dish_arr,    d_ing_fri,      0.1,   'kg',  'Frijoles negros',            tid_demo)
  ON CONFLICT DO NOTHING;

  -- ════════════════════════════════════════════════════════════════════════
  -- STEP 3: DRAGON WOK — Cocina Asiática
  -- ════════════════════════════════════════════════════════════════════════
  IF tid_wok IS NOT NULL THEN

    INSERT INTO public.ingredients (id, name, category, stock, unit, min_stock, cost, supplier, reorder_point, supplier_phone, tenant_id, branch_id) VALUES
      (w_ing_cerdo,   'Cerdo Lomo',              'Carnes',           10,   'kg',  4,    120, 'Carnicería Asia',       5,   '55 2200 3300', tid_wok, bid_wok),
      (w_ing_pol,     'Pechuga de Pollo',        'Carnes',           15,   'kg',  6,    90,  'Avícola San Juan',      8,   '55 3333 4444', tid_wok, bid_wok),
      (w_ing_cam,     'Camarón Jumbo',           'Mariscos',         6,    'kg',  3,    320, 'Mariscos del Golfo',    4,   '55 5555 6666', tid_wok, bid_wok),
      (w_ing_tofu,    'Tofu Firme',              'Otros',            8,    'kg',  3,    55,  'Distribuidora Asia',    4,   '55 4400 5500', tid_wok, bid_wok),
      (w_ing_res,     'Res Sirloin',             'Carnes',           8,    'kg',  3,    210, 'Carnicería Asia',       4,   '55 2200 3300', tid_wok, bid_wok),
      (w_ing_ceb_ch,  'Cebolla China',           'Verduras',         5,    'kg',  2,    30,  'Mercado Oriental',      3,   '55 6600 7700', tid_wok, bid_wok),
      (w_ing_ajo,     'Ajo',                     'Verduras',         2,    'kg',  0.5,  60,  'Mercado Oriental',      1,   '55 6600 7700', tid_wok, bid_wok),
      (w_ing_jen,     'Jengibre Fresco',         'Verduras',         2,    'kg',  0.5,  80,  'Mercado Oriental',      1,   '55 6600 7700', tid_wok, bid_wok),
      (w_ing_bro,     'Brócoli',                 'Verduras',         8,    'kg',  3,    35,  'Mercado Oriental',      4,   '55 6600 7700', tid_wok, bid_wok),
      (w_ing_zan,     'Zanahoria',               'Verduras',         6,    'kg',  2,    20,  'Mercado Oriental',      3,   '55 6600 7700', tid_wok, bid_wok),
      (w_ing_pim_roj, 'Pimiento Rojo',           'Verduras',         5,    'kg',  2,    45,  'Mercado Oriental',      3,   '55 6600 7700', tid_wok, bid_wok),
      (w_ing_pim_ver, 'Pimiento Verde',          'Verduras',         5,    'kg',  2,    40,  'Mercado Oriental',      3,   '55 6600 7700', tid_wok, bid_wok),
      (w_ing_col_chi, 'Col China',               'Verduras',         6,    'kg',  2,    28,  'Mercado Oriental',      3,   '55 6600 7700', tid_wok, bid_wok),
      (w_ing_bok_cho, 'Bok Choy',                'Verduras',         4,    'kg',  1.5,  50,  'Mercado Oriental',      2,   '55 6600 7700', tid_wok, bid_wok),
      (w_ing_hon_shi, 'Hongos Shiitake',         'Verduras',         3,    'kg',  1,    180, 'Distribuidora Asia',    2,   '55 4400 5500', tid_wok, bid_wok),
      (w_ing_arr_jas, 'Arroz Jazmín',            'Pastas y Granos',  20,   'kg',  8,    28,  'Distribuidora Asia',    10,  '55 4400 5500', tid_wok, bid_wok),
      (w_ing_fid_arr, 'Fideos de Arroz',         'Pastas y Granos',  10,   'kg',  4,    45,  'Distribuidora Asia',    5,   '55 4400 5500', tid_wok, bid_wok),
      (w_ing_fid_tri, 'Fideos de Trigo (Ramen)', 'Pastas y Granos',  8,    'kg',  3,    55,  'Distribuidora Asia',    4,   '55 4400 5500', tid_wok, bid_wok),
      (w_ing_sal_soy, 'Salsa de Soya',           'Aceites y Salsas', 10,   'lt',  4,    65,  'Distribuidora Asia',    5,   '55 4400 5500', tid_wok, bid_wok),
      (w_ing_sal_ost, 'Salsa de Ostión',         'Aceites y Salsas', 5,    'lt',  2,    95,  'Distribuidora Asia',    3,   '55 4400 5500', tid_wok, bid_wok),
      (w_ing_sal_hoi, 'Salsa Hoisin',            'Aceites y Salsas', 4,    'lt',  1.5,  110, 'Distribuidora Asia',    2,   '55 4400 5500', tid_wok, bid_wok),
      (w_ing_ace_ses, 'Aceite de Sésamo',        'Aceites y Salsas', 3,    'lt',  1,    180, 'Distribuidora Asia',    2,   '55 4400 5500', tid_wok, bid_wok),
      (w_ing_ace_veg, 'Aceite Vegetal',          'Aceites y Salsas', 8,    'lt',  3,    48,  'Distribuidora Asia',    4,   '55 4400 5500', tid_wok, bid_wok),
      (w_ing_vin_arr, 'Vinagre de Arroz',        'Aceites y Salsas', 3,    'lt',  1,    70,  'Distribuidora Asia',    2,   '55 4400 5500', tid_wok, bid_wok),
      (w_ing_azu,     'Azúcar',                  'Abarrotes',        5,    'kg',  2,    25,  'Distribuidora Asia',    3,   '55 4400 5500', tid_wok, bid_wok),
      (w_ing_mai_fec, 'Fécula de Maíz',          'Abarrotes',        3,    'kg',  1,    40,  'Distribuidora Asia',    2,   '55 4400 5500', tid_wok, bid_wok),
      (w_ing_coc_lec, 'Leche de Coco',           'Lácteos',          12,   'pz',  4,    35,  'Distribuidora Asia',    6,   '55 4400 5500', tid_wok, bid_wok),
      (w_ing_lim,     'Limón',                   'Frutas',           4,    'kg',  1.5,  22,  'Mercado Oriental',      2,   '55 6600 7700', tid_wok, bid_wok),
      (w_ing_cil,     'Cilantro',                'Verduras',         1.5,  'kg',  0.5,  35,  'Mercado Oriental',      1,   '55 6600 7700', tid_wok, bid_wok),
      (w_ing_chi_pic, 'Chile Piquín',            'Especias',         0.5,  'kg',  0.2,  120, 'Distribuidora Asia',    0.3, '55 4400 5500', tid_wok, bid_wok),
      (w_ing_man_cac, 'Mantequilla de Cacahuate','Abarrotes',        3,    'kg',  1,    95,  'Distribuidora Asia',    2,   '55 4400 5500', tid_wok, bid_wok),
      (w_ing_ceb_ver, 'Cebollín',                'Verduras',         2,    'kg',  0.5,  45,  'Mercado Oriental',      1,   '55 6600 7700', tid_wok, bid_wok),
      (w_ing_te_ver,  'Té Verde (bolsas)',        'Bebidas',          100,  'pz',  30,   4,   'Distribuidora Asia',    50,  '55 4400 5500', tid_wok, bid_wok),
      (w_ing_te_jas,  'Té de Jazmín (bolsas)',   'Bebidas',          80,   'pz',  30,   5,   'Distribuidora Asia',    40,  '55 4400 5500', tid_wok, bid_wok),
      (w_ing_cer_asi, 'Cerveza Asiática',        'Bebidas',          48,   'pz',  24,   28,  'Distribuidora Norte',   30,  '55 1212 3434', tid_wok, bid_wok),
      (w_ing_agu_min, 'Agua Mineral 600ml',      'Bebidas',          60,   'pz',  24,   8,   'Distribuidora Norte',   30,  '55 1212 3434', tid_wok, bid_wok)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.dishes (id, name, description, price, category, available, emoji, popular, tenant_id, branch_id) VALUES
      (w_dish_rol_pri, 'Rollos Primavera (4 pzas)',   'Rollos crujientes rellenos de verduras salteadas, fideos de arroz y cerdo. Servidos con salsa agridulce.',              95,  'Entradas',       true, '🥢', true,  tid_wok, bid_wok),
      (w_dish_sopa_wa, 'Sopa Wonton',                 'Caldo de pollo con wontons rellenos de cerdo y camarón, cebollín y jengibre.',                                         85,  'Entradas',       true, '🍜', false, tid_wok, bid_wok),
      (w_dish_dim_sum, 'Dim Sum Mixto (6 pzas)',      'Selección de gyozas de cerdo, siu mai de camarón y har gow al vapor.',                                                 120, 'Entradas',       true, '🥟', true,  tid_wok, bid_wok),
      (w_dish_ens_alg, 'Ensalada de Algas',           'Algas wakame marinadas con vinagre de arroz, aceite de sésamo y semillas de ajonjolí.',                               75,  'Entradas',       true, '🥗', false, tid_wok, bid_wok),
      (w_dish_pol_dul, 'Pollo Agridulce',             'Trozos de pollo empanizado en salsa agridulce con pimiento, piña y cebolla. Servido con arroz jazmín.',               175, 'Platos Fuertes', true, '🍗', true,  tid_wok, bid_wok),
      (w_dish_res_bro, 'Res con Brócoli',             'Tiras de res sirloin salteadas con brócoli, zanahoria y salsa de ostión. Servido con arroz jazmín.',                  195, 'Platos Fuertes', true, '🥩', true,  tid_wok, bid_wok),
      (w_dish_cam_wok, 'Camarones al Wok',            'Camarones jumbo salteados con bok choy, hongos shiitake, ajo y jengibre en salsa de soya.',                           215, 'Platos Fuertes', true, '🦐', true,  tid_wok, bid_wok),
      (w_dish_cerdo_h, 'Cerdo Hoisin',                'Lomo de cerdo glaseado con salsa hoisin, ajo y jengibre. Servido con arroz jazmín y bok choy.',                       185, 'Platos Fuertes', true, '🐷', false, tid_wok, bid_wok),
      (w_dish_tofu_pi, 'Tofu Picante',                'Tofu firme salteado con col china, pimiento rojo, salsa de soya y chile piquín.',                                     155, 'Platos Fuertes', true, '🌶️', false, tid_wok, bid_wok),
      (w_dish_arr_fri, 'Arroz Frito Especial',        'Arroz jazmín salteado con huevo, camarón, cerdo, verduras y salsa de soya.',                                          145, 'Platos Fuertes', true, '🍚', false, tid_wok, bid_wok),
      (w_dish_fid_sal, 'Fideos Salteados (Pad Thai)', 'Fideos de arroz salteados con camarón, tofu, huevo, brotes de soya y salsa de tamarindo.',                            165, 'Platos Fuertes', true, '🍝', true,  tid_wok, bid_wok),
      (w_dish_fid_coc, 'Ramen de Pollo',              'Fideos de trigo en caldo de pollo con bok choy, hongos shiitake, huevo y cebollín.',                                  155, 'Platos Fuertes', true, '🍜', false, tid_wok, bid_wok),
      (w_dish_mochi,   'Mochi de Helado (3 pzas)',    'Mochi japonés relleno de helado: matcha, fresa y vainilla.',                                                           95,  'Postres',        true, '🍡', true,  tid_wok, bid_wok),
      (w_dish_flan_ma, 'Flan de Matcha',              'Flan suave de té matcha con caramelo de miel y semillas de sésamo.',                                                   85,  'Postres',        true, '🍮', false, tid_wok, bid_wok),
      (w_dish_te_ver,  'Té Verde',                    'Té verde japonés servido caliente o frío.',                                                                             45,  'Bebidas',        true, '🍵', false, tid_wok, bid_wok),
      (w_dish_te_jas,  'Té de Jazmín',                'Té de jazmín aromático servido caliente.',                                                                              45,  'Bebidas',        true, '🍵', false, tid_wok, bid_wok),
      (w_dish_cer_asi, 'Cerveza Asiática',            'Cerveza importada de Asia, ligera y refrescante.',                                                                      75,  'Bebidas',        true, '🍺', false, tid_wok, bid_wok),
      (w_dish_limon,   'Limonada de Jengibre',        'Limonada fresca con jengibre, miel y menta.',                                                                           55,  'Bebidas',        true, '🍋', true,  tid_wok, bid_wok),
      (w_dish_arr_bla, 'Arroz Jazmín Extra',          'Porción extra de arroz jazmín al vapor.',                                                                               30,  'Extras',         true, '🍚', false, tid_wok, bid_wok),
      (w_dish_sal_agr, 'Salsa Agridulce Extra',       'Porción extra de salsa agridulce casera.',                                                                              20,  'Extras',         true, '🥫', false, tid_wok, bid_wok)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.dish_recipes (dish_id, ingredient_id, quantity, unit, notes, tenant_id) VALUES
      (w_dish_rol_pri, w_ing_cerdo,   0.08, 'kg', 'Cerdo picado',              tid_wok),
      (w_dish_rol_pri, w_ing_col_chi, 0.06, 'kg', 'Col china rallada',         tid_wok),
      (w_dish_rol_pri, w_ing_zan,     0.04, 'kg', 'Zanahoria rallada',         tid_wok),
      (w_dish_rol_pri, w_ing_fid_arr, 0.03, 'kg', 'Fideos de arroz',           tid_wok),
      (w_dish_rol_pri, w_ing_sal_soy, 0.02, 'lt', 'Salsa de soya',             tid_wok),
      (w_dish_rol_pri, w_ing_ace_veg, 0.05, 'lt', 'Aceite para freír',         tid_wok),
      (w_dish_sopa_wa, w_ing_cerdo,   0.06, 'kg', 'Cerdo para wontons',        tid_wok),
      (w_dish_sopa_wa, w_ing_cam,     0.04, 'kg', 'Camarón picado',            tid_wok),
      (w_dish_sopa_wa, w_ing_jen,     0.01, 'kg', 'Jengibre',                  tid_wok),
      (w_dish_sopa_wa, w_ing_ceb_ver, 0.02, 'kg', 'Cebollín',                  tid_wok),
      (w_dish_sopa_wa, w_ing_sal_soy, 0.02, 'lt', 'Salsa de soya',             tid_wok),
      (w_dish_dim_sum, w_ing_cerdo,   0.1,  'kg', 'Cerdo para relleno',        tid_wok),
      (w_dish_dim_sum, w_ing_cam,     0.06, 'kg', 'Camarón',                   tid_wok),
      (w_dish_dim_sum, w_ing_jen,     0.01, 'kg', 'Jengibre',                  tid_wok),
      (w_dish_dim_sum, w_ing_sal_soy, 0.02, 'lt', 'Salsa de soya',             tid_wok),
      (w_dish_pol_dul, w_ing_pol,     0.25, 'kg', 'Pechuga de pollo',          tid_wok),
      (w_dish_pol_dul, w_ing_pim_roj, 0.08, 'kg', 'Pimiento rojo',             tid_wok),
      (w_dish_pol_dul, w_ing_pim_ver, 0.08, 'kg', 'Pimiento verde',            tid_wok),
      (w_dish_pol_dul, w_ing_sal_hoi, 0.04, 'lt', 'Salsa hoisin',              tid_wok),
      (w_dish_pol_dul, w_ing_azu,     0.02, 'kg', 'Azúcar',                    tid_wok),
      (w_dish_pol_dul, w_ing_vin_arr, 0.02, 'lt', 'Vinagre de arroz',          tid_wok),
      (w_dish_pol_dul, w_ing_arr_jas, 0.1,  'kg', 'Arroz jazmín',              tid_wok),
      (w_dish_res_bro, w_ing_res,     0.2,  'kg', 'Res sirloin',               tid_wok),
      (w_dish_res_bro, w_ing_bro,     0.15, 'kg', 'Brócoli',                   tid_wok),
      (w_dish_res_bro, w_ing_zan,     0.06, 'kg', 'Zanahoria',                 tid_wok),
      (w_dish_res_bro, w_ing_sal_ost, 0.04, 'lt', 'Salsa de ostión',           tid_wok),
      (w_dish_res_bro, w_ing_ajo,     0.01, 'kg', 'Ajo',                       tid_wok),
      (w_dish_res_bro, w_ing_arr_jas, 0.1,  'kg', 'Arroz jazmín',              tid_wok),
      (w_dish_cam_wok, w_ing_cam,     0.22, 'kg', 'Camarones jumbo',           tid_wok),
      (w_dish_cam_wok, w_ing_bok_cho, 0.1,  'kg', 'Bok choy',                  tid_wok),
      (w_dish_cam_wok, w_ing_hon_shi, 0.06, 'kg', 'Hongos shiitake',           tid_wok),
      (w_dish_cam_wok, w_ing_ajo,     0.01, 'kg', 'Ajo',                       tid_wok),
      (w_dish_cam_wok, w_ing_jen,     0.01, 'kg', 'Jengibre',                  tid_wok),
      (w_dish_cam_wok, w_ing_sal_soy, 0.03, 'lt', 'Salsa de soya',             tid_wok),
      (w_dish_cam_wok, w_ing_ace_ses, 0.01, 'lt', 'Aceite de sésamo',          tid_wok),
      (w_dish_cerdo_h, w_ing_cerdo,   0.25, 'kg', 'Lomo de cerdo',             tid_wok),
      (w_dish_cerdo_h, w_ing_sal_hoi, 0.05, 'lt', 'Salsa hoisin',              tid_wok),
      (w_dish_cerdo_h, w_ing_ajo,     0.01, 'kg', 'Ajo',                       tid_wok),
      (w_dish_cerdo_h, w_ing_jen,     0.01, 'kg', 'Jengibre',                  tid_wok),
      (w_dish_cerdo_h, w_ing_arr_jas, 0.1,  'kg', 'Arroz jazmín',              tid_wok),
      (w_dish_cerdo_h, w_ing_bok_cho, 0.1,  'kg', 'Bok choy',                  tid_wok),
      (w_dish_tofu_pi, w_ing_tofu,    0.2,  'kg', 'Tofu firme',                tid_wok),
      (w_dish_tofu_pi, w_ing_col_chi, 0.1,  'kg', 'Col china',                 tid_wok),
      (w_dish_tofu_pi, w_ing_pim_roj, 0.08, 'kg', 'Pimiento rojo',             tid_wok),
      (w_dish_tofu_pi, w_ing_sal_soy, 0.03, 'lt', 'Salsa de soya',             tid_wok),
      (w_dish_tofu_pi, w_ing_chi_pic, 0.005,'kg', 'Chile piquín',              tid_wok),
      (w_dish_arr_fri, w_ing_arr_jas, 0.15, 'kg', 'Arroz jazmín',              tid_wok),
      (w_dish_arr_fri, w_ing_cam,     0.08, 'kg', 'Camarón',                   tid_wok),
      (w_dish_arr_fri, w_ing_cerdo,   0.06, 'kg', 'Cerdo',                     tid_wok),
      (w_dish_arr_fri, w_ing_sal_soy, 0.03, 'lt', 'Salsa de soya',             tid_wok),
      (w_dish_arr_fri, w_ing_ace_veg, 0.03, 'lt', 'Aceite vegetal',            tid_wok),
      (w_dish_fid_sal, w_ing_fid_arr, 0.12, 'kg', 'Fideos de arroz',           tid_wok),
      (w_dish_fid_sal, w_ing_cam,     0.1,  'kg', 'Camarón',                   tid_wok),
      (w_dish_fid_sal, w_ing_tofu,    0.08, 'kg', 'Tofu',                      tid_wok),
      (w_dish_fid_sal, w_ing_man_cac, 0.04, 'kg', 'Mantequilla de cacahuate',  tid_wok),
      (w_dish_fid_sal, w_ing_sal_soy, 0.03, 'lt', 'Salsa de soya',             tid_wok),
      (w_dish_fid_sal, w_ing_lim,     0.03, 'kg', 'Limón',                     tid_wok),
      (w_dish_fid_coc, w_ing_fid_tri, 0.12, 'kg', 'Fideos de trigo',           tid_wok),
      (w_dish_fid_coc, w_ing_pol,     0.15, 'kg', 'Pechuga de pollo',          tid_wok),
      (w_dish_fid_coc, w_ing_bok_cho, 0.08, 'kg', 'Bok choy',                  tid_wok),
      (w_dish_fid_coc, w_ing_hon_shi, 0.05, 'kg', 'Hongos shiitake',           tid_wok),
      (w_dish_fid_coc, w_ing_sal_soy, 0.02, 'lt', 'Salsa de soya',             tid_wok),
      (w_dish_fid_coc, w_ing_ceb_ver, 0.02, 'kg', 'Cebollín',                  tid_wok),
      (w_dish_te_ver,  w_ing_te_ver,  1,    'pz', 'Bolsa de té verde',         tid_wok),
      (w_dish_te_jas,  w_ing_te_jas,  1,    'pz', 'Bolsa de té de jazmín',     tid_wok),
      (w_dish_cer_asi, w_ing_cer_asi, 1,    'pz', 'Botella de cerveza',        tid_wok),
      (w_dish_limon,   w_ing_lim,     0.06, 'kg', 'Limón',                     tid_wok),
      (w_dish_limon,   w_ing_jen,     0.01, 'kg', 'Jengibre fresco',           tid_wok),
      (w_dish_limon,   w_ing_azu,     0.03, 'kg', 'Azúcar',                    tid_wok)
    ON CONFLICT DO NOTHING;

  END IF; -- END Dragon Wok

  -- ════════════════════════════════════════════════════════════════════════
  -- STEP 4: BARISTA — Cafetería Artesanal
  -- ════════════════════════════════════════════════════════════════════════
  IF tid_bar IS NOT NULL THEN

    INSERT INTO public.ingredients (id, name, category, stock, unit, min_stock, cost, supplier, reorder_point, supplier_phone, tenant_id, branch_id) VALUES
      (b_ing_cafe_esp, 'Café Espresso (grano)',     'Abarrotes',   5,    'kg',  2,    380, 'Tostadores Artesanales',  3,   '55 8800 9900', tid_bar, bid_bar),
      (b_ing_cafe_fil, 'Café Filtro (grano)',       'Abarrotes',   4,    'kg',  1.5,  320, 'Tostadores Artesanales',  2,   '55 8800 9900', tid_bar, bid_bar),
      (b_ing_lec_ent,  'Leche Entera',              'Lácteos',     30,   'lt',  10,   22,  'Lácteos La Vaca',         15,  '55 9999 0000', tid_bar, bid_bar),
      (b_ing_lec_des,  'Leche Descremada',          'Lácteos',     15,   'lt',  5,    24,  'Lácteos La Vaca',         8,   '55 9999 0000', tid_bar, bid_bar),
      (b_ing_lec_avo,  'Leche de Avena',            'Lácteos',     20,   'lt',  6,    55,  'Distribuidora Orgánica',  10,  '55 7700 8800', tid_bar, bid_bar),
      (b_ing_lec_alm,  'Leche de Almendra',         'Lácteos',     15,   'lt',  5,    65,  'Distribuidora Orgánica',  8,   '55 7700 8800', tid_bar, bid_bar),
      (b_ing_cre_bat,  'Crema para Batir',          'Lácteos',     10,   'lt',  3,    75,  'Lácteos La Vaca',         5,   '55 9999 0000', tid_bar, bid_bar),
      (b_ing_azu,      'Azúcar Blanca',             'Abarrotes',   10,   'kg',  3,    25,  'Abarrotes Don Pepe',      5,   '55 9090 1212', tid_bar, bid_bar),
      (b_ing_vai,      'Jarabe de Vainilla',        'Abarrotes',   5,    'lt',  2,    180, 'Distribuidora Barista',   3,   '55 5500 6600', tid_bar, bid_bar),
      (b_ing_can,      'Canela Molida',             'Especias',    1,    'kg',  0.3,  160, 'Especias del Sur',        0.5, '55 3434 5656', tid_bar, bid_bar),
      (b_ing_cho_pol,  'Cacao en Polvo',            'Abarrotes',   3,    'kg',  1,    220, 'Distribuidora Barista',   2,   '55 5500 6600', tid_bar, bid_bar),
      (b_ing_cho_neg,  'Chocolate Negro 70%',       'Abarrotes',   2,    'kg',  0.5,  350, 'Distribuidora Barista',   1,   '55 5500 6600', tid_bar, bid_bar),
      (b_ing_car_cho,  'Jarabe de Caramelo',        'Abarrotes',   4,    'lt',  1.5,  150, 'Distribuidora Barista',   2,   '55 5500 6600', tid_bar, bid_bar),
      (b_ing_te_neg,   'Té Negro (bolsas)',         'Bebidas',     100,  'pz',  30,   3,   'Distribuidora Barista',   50,  '55 5500 6600', tid_bar, bid_bar),
      (b_ing_te_ver,   'Té Verde (bolsas)',         'Bebidas',     80,   'pz',  30,   4,   'Distribuidora Barista',   40,  '55 5500 6600', tid_bar, bid_bar),
      (b_ing_te_man,   'Té de Manzanilla',         'Bebidas',     60,   'pz',  20,   3,   'Distribuidora Barista',   30,  '55 5500 6600', tid_bar, bid_bar),
      (b_ing_mat,      'Matcha en Polvo',           'Abarrotes',   1,    'kg',  0.3,  850, 'Distribuidora Barista',   0.5, '55 5500 6600', tid_bar, bid_bar),
      (b_ing_agu_min,  'Agua Mineral 600ml',        'Bebidas',     72,   'pz',  24,   8,   'Distribuidora Norte',     30,  '55 1212 3434', tid_bar, bid_bar),
      (b_ing_jug_nar,  'Naranja (para jugo)',       'Frutas',      30,   'kg',  10,   18,  'Mercado Central',         15,  '55 7777 8888', tid_bar, bid_bar),
      (b_ing_jug_man,  'Mango',                    'Frutas',      10,   'kg',  4,    35,  'Mercado Central',         5,   '55 7777 8888', tid_bar, bid_bar),
      (b_ing_man_cac,  'Mantequilla de Cacahuate', 'Abarrotes',   3,    'kg',  1,    95,  'Abarrotes Don Pepe',      2,   '55 9090 1212', tid_bar, bid_bar),
      (b_ing_fre,      'Fresas',                   'Frutas',      5,    'kg',  2,    55,  'Mercado Central',         3,   '55 7777 8888', tid_bar, bid_bar),
      (b_ing_pla,      'Plátano',                  'Frutas',      20,   'pz',  8,    5,   'Mercado Central',         10,  '55 7777 8888', tid_bar, bid_bar),
      (b_ing_blu,      'Blueberries',              'Frutas',      3,    'kg',  1,    120, 'Mercado Central',         2,   '55 7777 8888', tid_bar, bid_bar),
      (b_ing_avo,      'Aguacate',                 'Verduras',    20,   'pz',  8,    13,  'Mercado Central',         10,  '55 7777 8888', tid_bar, bid_bar),
      (b_ing_pan_int,  'Pan Integral (rebanadas)', 'Panadería',   40,   'pz',  12,   8,   'Panadería Artesanal',     20,  '55 1100 2200', tid_bar, bid_bar),
      (b_ing_pan_cro,  'Croissant',                'Panadería',   20,   'pz',  6,    18,  'Panadería Artesanal',     10,  '55 1100 2200', tid_bar, bid_bar),
      (b_ing_hue,      'Huevo',                    'Lácteos',     60,   'pz',  24,   3,   'Lácteos La Vaca',         30,  '55 9999 0000', tid_bar, bid_bar),
      (b_ing_que_cre,  'Queso Crema',              'Lácteos',     5,    'kg',  2,    110, 'Lácteos La Vaca',         3,   '55 9999 0000', tid_bar, bid_bar),
      (b_ing_man_sal,  'Mantequilla',              'Lácteos',     3,    'kg',  1,    95,  'Lácteos La Vaca',         2,   '55 9999 0000', tid_bar, bid_bar),
      (b_ing_sal_mar,  'Sal de Mar',               'Especias',    1,    'kg',  0.3,  30,  'Abarrotes Don Pepe',      0.5, '55 9090 1212', tid_bar, bid_bar),
      (b_ing_azu_mor,  'Azúcar Morena',            'Abarrotes',   5,    'kg',  2,    30,  'Abarrotes Don Pepe',      3,   '55 9090 1212', tid_bar, bid_bar),
      (b_ing_jar_agu,  'Jarabe de Agave',          'Abarrotes',   4,    'lt',  1.5,  120, 'Distribuidora Orgánica',  2,   '55 7700 8800', tid_bar, bid_bar),
      (b_ing_lim,      'Limón',                    'Frutas',      5,    'kg',  2,    22,  'Mercado Central',         3,   '55 7777 8888', tid_bar, bid_bar),
      (b_ing_men,      'Menta Fresca',             'Verduras',    1,    'kg',  0.3,  60,  'Mercado Central',         0.5, '55 7777 8888', tid_bar, bid_bar),
      (b_ing_jen,      'Jengibre Fresco',          'Verduras',    1.5,  'kg',  0.5,  80,  'Mercado Central',         1,   '55 7777 8888', tid_bar, bid_bar)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.dishes (id, name, description, price, category, available, emoji, popular, tenant_id, branch_id) VALUES
      (b_dish_esp,     'Espresso',                 'Shot doble de espresso de origen único. Intenso y aromático.',                                                              45,  'Bebidas',  true, '☕', false, tid_bar, bid_bar),
      (b_dish_cap,     'Cappuccino',               'Espresso con leche vaporizada y espuma cremosa. Disponible en leche de avena o almendra.',                                  65,  'Bebidas',  true, '☕', true,  tid_bar, bid_bar),
      (b_dish_lat,     'Latte',                    'Espresso suave con abundante leche vaporizada. Disponible en leche de avena o almendra.',                                   70,  'Bebidas',  true, '🥛', true,  tid_bar, bid_bar),
      (b_dish_ame,     'Americano',                'Espresso diluido en agua caliente. Suave y equilibrado.',                                                                   50,  'Bebidas',  true, '☕', false, tid_bar, bid_bar),
      (b_dish_mac,     'Macchiato de Caramelo',    'Espresso con leche vaporizada y jarabe de caramelo artesanal.',                                                             75,  'Bebidas',  true, '☕', true,  tid_bar, bid_bar),
      (b_dish_fla,     'Flat White',               'Espresso doble con microespuma de leche. Más concentrado que el latte.',                                                    70,  'Bebidas',  true, '☕', false, tid_bar, bid_bar),
      (b_dish_mat,     'Matcha Latte',             'Té matcha japonés premium con leche vaporizada. Disponible frío o caliente.',                                               80,  'Bebidas',  true, '🍵', true,  tid_bar, bid_bar),
      (b_dish_cho_cal, 'Chocolate Caliente',       'Chocolate negro 70% fundido con leche entera y crema batida.',                                                              70,  'Bebidas',  true, '🍫', false, tid_bar, bid_bar),
      (b_dish_te_neg,  'Té Negro',                 'Té negro de origen selecto. Servido con miel y limón.',                                                                     45,  'Bebidas',  true, '🍵', false, tid_bar, bid_bar),
      (b_dish_te_ver,  'Té Verde',                 'Té verde japonés. Servido caliente o frío.',                                                                                45,  'Bebidas',  true, '🍵', false, tid_bar, bid_bar),
      (b_dish_cha_lat, 'Chai Latte',               'Mezcla de especias chai con leche vaporizada y jarabe de vainilla.',                                                        75,  'Bebidas',  true, '🍵', false, tid_bar, bid_bar),
      (b_dish_agu_min, 'Agua Mineral',             'Agua mineral natural 600ml.',                                                                                               30,  'Bebidas',  true, '💧', false, tid_bar, bid_bar),
      (b_dish_jug_nar, 'Jugo de Naranja Natural',  'Jugo de naranja recién exprimido. Sin azúcar añadida.',                                                                     65,  'Bebidas',  true, '🍊', true,  tid_bar, bid_bar),
      (b_dish_smo_fre, 'Smoothie de Fresa',        'Smoothie de fresa, plátano, leche de avena y miel de agave.',                                                              85,  'Bebidas',  true, '🍓', true,  tid_bar, bid_bar),
      (b_dish_cro,     'Croissant de Mantequilla', 'Croissant artesanal de mantequilla, crujiente por fuera y suave por dentro.',                                               55,  'Entradas', true, '🥐', true,  tid_bar, bid_bar),
      (b_dish_avo_tos, 'Tostada de Aguacate',      'Pan integral tostado con aguacate, sal de mar, limón y hojuelas de chile.',                                                95,  'Entradas', true, '🥑', true,  tid_bar, bid_bar),
      (b_dish_pan_ban, 'Pan de Plátano',           'Pan de plátano casero con nueces y canela. Servido tibio.',                                                                 65,  'Postres',  true, '🍌', false, tid_bar, bid_bar),
      (b_dish_che_cak, 'Cheesecake de Blueberry',  'Cheesecake cremoso con base de galleta y coulis de blueberry.',                                                             95,  'Postres',  true, '🫐', true,  tid_bar, bid_bar),
      (b_dish_bro_cho, 'Brownie de Chocolate',     'Brownie denso de chocolate negro 70% con nueces. Servido tibio.',                                                           75,  'Postres',  true, '🍫', true,  tid_bar, bid_bar),
      (b_dish_gra_avo, 'Granola con Yogurt',       'Granola artesanal con yogurt natural, miel de agave y frutas frescas de temporada.',                                       85,  'Entradas', true, '🥣', false, tid_bar, bid_bar)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.dish_recipes (dish_id, ingredient_id, quantity, unit, notes, tenant_id) VALUES
      (b_dish_esp,     b_ing_cafe_esp, 0.018, 'kg', 'Shot doble 18g',            tid_bar),
      (b_dish_cap,     b_ing_cafe_esp, 0.018, 'kg', 'Shot doble',                tid_bar),
      (b_dish_cap,     b_ing_lec_ent,  0.15,  'lt', 'Leche vaporizada',          tid_bar),
      (b_dish_lat,     b_ing_cafe_esp, 0.018, 'kg', 'Shot doble',                tid_bar),
      (b_dish_lat,     b_ing_lec_ent,  0.22,  'lt', 'Leche vaporizada',          tid_bar),
      (b_dish_ame,     b_ing_cafe_esp, 0.018, 'kg', 'Shot doble',                tid_bar),
      (b_dish_mac,     b_ing_cafe_esp, 0.018, 'kg', 'Shot doble',                tid_bar),
      (b_dish_mac,     b_ing_lec_ent,  0.18,  'lt', 'Leche vaporizada',          tid_bar),
      (b_dish_mac,     b_ing_car_cho,  0.02,  'lt', 'Jarabe de caramelo',        tid_bar),
      (b_dish_fla,     b_ing_cafe_esp, 0.018, 'kg', 'Shot doble',                tid_bar),
      (b_dish_fla,     b_ing_lec_ent,  0.16,  'lt', 'Microespuma',               tid_bar),
      (b_dish_mat,     b_ing_mat,      0.005, 'kg', 'Matcha premium',            tid_bar),
      (b_dish_mat,     b_ing_lec_avo,  0.22,  'lt', 'Leche de avena',            tid_bar),
      (b_dish_mat,     b_ing_jar_agu,  0.01,  'lt', 'Jarabe de agave',           tid_bar),
      (b_dish_cho_cal, b_ing_cho_neg,  0.03,  'kg', 'Chocolate negro 70%',       tid_bar),
      (b_dish_cho_cal, b_ing_lec_ent,  0.2,   'lt', 'Leche entera',              tid_bar),
      (b_dish_cho_cal, b_ing_cre_bat,  0.03,  'lt', 'Crema batida',              tid_bar),
      (b_dish_te_neg,  b_ing_te_neg,   1,     'pz', 'Bolsa de té negro',         tid_bar),
      (b_dish_te_ver,  b_ing_te_ver,   1,     'pz', 'Bolsa de té verde',         tid_bar),
      (b_dish_cha_lat, b_ing_te_neg,   1,     'pz', 'Té negro base',             tid_bar),
      (b_dish_cha_lat, b_ing_lec_ent,  0.18,  'lt', 'Leche vaporizada',          tid_bar),
      (b_dish_cha_lat, b_ing_vai,      0.015, 'lt', 'Jarabe de vainilla',        tid_bar),
      (b_dish_cha_lat, b_ing_can,      0.002, 'kg', 'Canela molida',             tid_bar),
      (b_dish_agu_min, b_ing_agu_min,  1,     'pz', 'Botella 600ml',             tid_bar),
      (b_dish_jug_nar, b_ing_jug_nar,  0.4,   'kg', 'Naranjas para exprimir',    tid_bar),
      (b_dish_smo_fre, b_ing_fre,      0.1,   'kg', 'Fresas frescas',            tid_bar),
      (b_dish_smo_fre, b_ing_pla,      1,     'pz', 'Plátano',                   tid_bar),
      (b_dish_smo_fre, b_ing_lec_avo,  0.15,  'lt', 'Leche de avena',            tid_bar),
      (b_dish_smo_fre, b_ing_jar_agu,  0.01,  'lt', 'Jarabe de agave',           tid_bar),
      (b_dish_cro,     b_ing_pan_cro,  1,     'pz', 'Croissant artesanal',       tid_bar),
      (b_dish_avo_tos, b_ing_avo,      1,     'pz', 'Aguacate maduro',           tid_bar),
      (b_dish_avo_tos, b_ing_pan_int,  2,     'pz', 'Rebanadas de pan integral', tid_bar),
      (b_dish_avo_tos, b_ing_sal_mar,  0.003, 'kg', 'Sal de mar',                tid_bar),
      (b_dish_avo_tos, b_ing_lim,      0.03,  'kg', 'Limón',                     tid_bar),
      (b_dish_pan_ban, b_ing_pla,      3,     'pz', 'Plátanos maduros',          tid_bar),
      (b_dish_pan_ban, b_ing_hue,      2,     'pz', 'Huevos',                    tid_bar),
      (b_dish_pan_ban, b_ing_azu_mor,  0.08,  'kg', 'Azúcar morena',             tid_bar),
      (b_dish_pan_ban, b_ing_can,      0.003, 'kg', 'Canela',                    tid_bar),
      (b_dish_che_cak, b_ing_que_cre,  0.12,  'kg', 'Queso crema',               tid_bar),
      (b_dish_che_cak, b_ing_blu,      0.05,  'kg', 'Blueberries',               tid_bar),
      (b_dish_che_cak, b_ing_azu,      0.06,  'kg', 'Azúcar',                    tid_bar),
      (b_dish_che_cak, b_ing_cre_bat,  0.08,  'lt', 'Crema para batir',          tid_bar),
      (b_dish_bro_cho, b_ing_cho_neg,  0.08,  'kg', 'Chocolate negro 70%',       tid_bar),
      (b_dish_bro_cho, b_ing_man_sal,  0.04,  'kg', 'Mantequilla',               tid_bar),
      (b_dish_bro_cho, b_ing_hue,      2,     'pz', 'Huevos',                    tid_bar),
      (b_dish_bro_cho, b_ing_azu,      0.07,  'kg', 'Azúcar',                    tid_bar),
      (b_dish_gra_avo, b_ing_fre,      0.05,  'kg', 'Fresas frescas',            tid_bar),
      (b_dish_gra_avo, b_ing_blu,      0.03,  'kg', 'Blueberries',               tid_bar),
      (b_dish_gra_avo, b_ing_jar_agu,  0.01,  'lt', 'Miel de agave',             tid_bar),
      (b_dish_gra_avo, b_ing_lec_ent,  0.1,   'lt', 'Yogurt natural',            tid_bar)
    ON CONFLICT DO NOTHING;

  END IF; -- END Barista

  RAISE NOTICE 'Reseed complete. Dummy Demo: 21 platillos, 47 ingredientes. Dragon Wok: % platillos. Barista: % platillos.',
    CASE WHEN tid_wok IS NOT NULL THEN '20' ELSE '0 (tenant no encontrado)' END,
    CASE WHEN tid_bar IS NOT NULL THEN '20' ELSE '0 (tenant no encontrado)' END;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error en reseed: %', SQLERRM;
    RAISE;
END $$;
