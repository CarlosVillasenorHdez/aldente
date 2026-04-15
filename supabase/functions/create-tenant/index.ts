import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { restaurantName, slug, adminName, pinHash, email, phone, establishmentType } = await req.json();

    if (!restaurantName?.trim() || !slug?.trim() || !adminName?.trim() || !pinHash) {
      return json({ error: 'Campos requeridos faltantes' }, 400);
    }

    // ── 1. Tenant ─────────────────────────────────────────────────────────────
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .insert({
        name: restaurantName.trim(),
        slug: slug.trim(),
        plan: 'operacion',
        is_active: true,
        trial_ends_at: trialEnd.toISOString(),
        owner_email: email?.trim() || null,
      })
      .select('id').single();

    if (tenantErr || !tenant) {
      const isDup = tenantErr?.message?.includes('unique') || tenantErr?.message?.includes('duplicate');
      return json({ error: isDup ? 'Ya existe un restaurante con ese nombre o URL.' : 'Error al crear restaurante: ' + tenantErr?.message }, 400);
    }
    const tid = tenant.id;

    // ── 2. Admin user ─────────────────────────────────────────────────────────
    const { error: adminErr } = await supabase.from('app_users').insert({
      username:  slug.trim() + '-admin',
      full_name: adminName.trim(),
      app_role:  'admin',
      pin:       pinHash,
      tenant_id: tid,
      is_active: true,
    });
    if (adminErr) {
      await supabase.from('tenants').delete().eq('id', tid);
      return json({ error: 'Error al crear usuario admin: ' + adminErr.message }, 500);
    }

    // ── 3. system_config ──────────────────────────────────────────────────────
    await supabase.from('system_config').upsert([
      { config_key: 'initialized',              config_value: 'false',               tenant_id: tid },
      { config_key: 'restaurant_name',          config_value: restaurantName.trim(),  tenant_id: tid },
      { config_key: 'branch_name',              config_value: restaurantName.trim(),  tenant_id: tid },
      { config_key: 'iva_percent',              config_value: '16',                  tenant_id: tid },
      { config_key: 'currency_symbol',          config_value: '$',                   tenant_id: tid },
      { config_key: 'currency_code',            config_value: 'MXN',                 tenant_id: tid },
      { config_key: 'currency_locale',          config_value: 'es-MX',               tenant_id: tid },
      { config_key: 'establishment_type',       config_value: establishmentType?.trim() || 'restaurante', tenant_id: tid },
      { config_key: 'iva_included_in_price',     config_value: 'true',                tenant_id: tid }, // México: precios incluyen IVA
      { config_key: 'feature_mesero_movil',     config_value: 'false',               tenant_id: tid },
      { config_key: 'feature_lealtad',          config_value: 'false',               tenant_id: tid },
      { config_key: 'feature_reservaciones',    config_value: 'false',               tenant_id: tid },
      { config_key: 'feature_delivery',         config_value: 'false',               tenant_id: tid },
      { config_key: 'feature_inventario',       config_value: 'false',               tenant_id: tid },
      { config_key: 'feature_gastos',           config_value: 'false',               tenant_id: tid },
      { config_key: 'feature_recursos_humanos', config_value: 'false',               tenant_id: tid },
      { config_key: 'feature_reportes',         config_value: 'false',               tenant_id: tid },
      { config_key: 'feature_alarmas',          config_value: 'false',               tenant_id: tid },
    ], { onConflict: 'tenant_id,config_key' });

    // ── 4. Demo dishes ────────────────────────────────────────────────────────
    await supabase.from('dishes').insert([
      { name: 'Ensalada César',      price: 95,  category: 'Entradas',       description: 'Lechuga romana, crutones y aderezo César', emoji: '🥗', available: true, popular: false, preparation_time_min: 8,  tenant_id: tid },
      { name: 'Sopa del día',        price: 75,  category: 'Entradas',       description: 'Sopa casera según temporada',              emoji: '🍲', available: true, popular: false, preparation_time_min: 10, tenant_id: tid },
      { name: 'Filete a la plancha', price: 210, category: 'Platos Fuertes', description: 'Filete de res con guarnición',            emoji: '🥩', available: true, popular: true,  preparation_time_min: 20, tenant_id: tid },
      { name: 'Pollo en salsa',      price: 165, category: 'Platos Fuertes', description: 'Pechuga con salsa de la casa',           emoji: '🍗', available: true, popular: false, preparation_time_min: 18, tenant_id: tid },
      { name: 'Pasta Alfredo',       price: 145, category: 'Platos Fuertes', description: 'Fetuccini con salsa Alfredo',            emoji: '🍝', available: true, popular: true,  preparation_time_min: 15, tenant_id: tid },
      { name: 'Hamburguesa clásica', price: 135, category: 'Platos Fuertes', description: 'Con papas fritas',                      emoji: '🍔', available: true, popular: true,  preparation_time_min: 12, tenant_id: tid },
      { name: 'Agua fresca',         price: 35,  category: 'Bebidas',        description: 'Jamaica, horchata o limón',              emoji: '🥤', available: true, popular: false, preparation_time_min: 2,  tenant_id: tid },
      { name: 'Refresco',            price: 30,  category: 'Bebidas',        description: 'Lata 355ml',                            emoji: '🥤', available: true, popular: false, preparation_time_min: 1,  tenant_id: tid },
      { name: 'Café americano',      price: 45,  category: 'Bebidas',        description: 'Café de olla o americano',              emoji: '☕', available: true, popular: false, preparation_time_min: 3,  tenant_id: tid },
      { name: 'Flan napolitano',     price: 65,  category: 'Postres',        description: 'Con cajeta y crema',                   emoji: '🍮', available: true, popular: false, preparation_time_min: 2,  tenant_id: tid },
      { name: 'Pay de queso',        price: 70,  category: 'Postres',        description: 'Con frutos rojos',                     emoji: '🍰', available: true, popular: false, preparation_time_min: 2,  tenant_id: tid },
    ]);

    // ── 5. Default tables en restaurant_tables Y restaurant_layout ────────────
    const DEFAULT_TABLE_COUNT = 8;

    // 5a. restaurant_tables (operativo — POS)
    await supabase.from('restaurant_tables').insert(
      Array.from({ length: DEFAULT_TABLE_COUNT }, (_, i) => ({
        number: i + 1, name: `Mesa ${i + 1}`,
        capacity: i < 5 ? 4 : 6, status: 'libre', tenant_id: tid,
      }))
    );

    // 5b. restaurant_layout (visual — ConfigLayout)
    // Grid 4x2, mesas distribuidas uniformemente
    const tablesLayout = Array.from({ length: DEFAULT_TABLE_COUNT }, (_, i) => ({
      id:       `mesa-${i + 1}`,
      number:   i + 1,
      name:     `Mesa ${i + 1}`,
      x:        (i % 4) * 3,
      y:        Math.floor(i / 4) * 3,
      w:        2,
      h:        2,
      capacity: i < 5 ? 4 : 6,
      elementType: 'mesa',
    }));

    await supabase.from('restaurant_layout').insert({
      name:          'Planta Principal',
      width:         12,
      height:        8,
      tables_layout: tablesLayout,
      tenant_id:     tid,
      is_active:     true,
    });

    // ── 6. Empleado demo en employees + app_users ─────────────────────────────
    // employees usa role enum: 'Mesero' (capital M)
    const { data: empRow } = await supabase.from('employees').insert({
      name:      'Mesero Demo',
      role:      'Mesero',
      status:    'activo',
      tenant_id: tid,
    }).select('id').single();

    await supabase.from('app_users').insert({
      username:    slug.trim() + '-mesero',
      full_name:   'Mesero Demo',
      app_role:    'mesero',
      pin:         pinHash,
      tenant_id:   tid,
      is_active:   true,
      employee_id: empRow?.id ?? null,
    });

    return json({ ok: true, tenantId: tid, slug: slug.trim() });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[create-tenant] error:', msg);
    return json({ error: msg }, 500);
  }
});
