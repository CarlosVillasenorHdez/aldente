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

    const body = await req.json();
    const { restaurantName, slug, adminName, pinHash } = body;

    if (!restaurantName?.trim() || !slug?.trim() || !adminName?.trim() || !pinHash) {
      return json({ error: 'Campos requeridos faltantes' }, 400);
    }

    // ── 1. Tenant ────────────────────────────────────────────────────────────
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .insert({
        name: restaurantName.trim(),
        slug: slug.trim(),
        plan: 'operacion',
        is_active: true,
        trial_ends_at: trialEnd.toISOString(), // column added in migration 20260406
      })
      .select('id')
      .single();

    if (tenantErr || !tenant) {
      const isDup = tenantErr?.message?.includes('unique') || tenantErr?.message?.includes('duplicate');
      return json({
        error: isDup
          ? 'Ya existe un restaurante con ese nombre o URL. Elige otro.'
          : 'Error al crear restaurante: ' + tenantErr?.message,
      }, 400);
    }

    const tenantId = tenant.id;

    // ── 2. Admin user ─────────────────────────────────────────────────────────
    // app_users columns: id, auth_user_id, username, full_name, app_role,
    //                    employee_id, is_active, tenant_id, pin, created_at, updated_at
    // NOTE: no 'phone' column exists in app_users
    const { error: adminErr } = await supabase.from('app_users').insert({
      username:  slug.trim() + '-admin',
      full_name: adminName.trim(),
      app_role:  'admin',
      pin:       pinHash,
      tenant_id: tenantId,
      is_active: true,
    });

    if (adminErr) {
      await supabase.from('tenants').delete().eq('id', tenantId);
      return json({ error: 'Error al crear usuario admin: ' + adminErr.message }, 500);
    }

    // ── 3. Demo mesero ────────────────────────────────────────────────────────
    await supabase.from('app_users').insert({
      username:  slug.trim() + '-mesero',
      full_name: 'Mesero Demo',
      app_role:  'mesero',
      pin:       pinHash,
      tenant_id: tenantId,
      is_active: true,
    });

    // ── 4. system_config — upsert para evitar conflictos ────────────────────
    const configs = [
      ['initialized',              'false'],
      ['restaurant_name',          restaurantName.trim()],
      ['branch_name',              restaurantName.trim()],
      ['iva_percent',              '16'],
      ['currency_symbol',          '$'],
      ['currency_code',            'MXN'],
      ['currency_locale',          'es-MX'],
      ['establishment_type',       'restaurante'],
      ['feature_mesero_movil',     'false'],
      ['feature_lealtad',          'false'],
      ['feature_reservaciones',    'false'],
      ['feature_delivery',         'false'],
      ['feature_inventario',       'false'],
      ['feature_gastos',           'false'],
      ['feature_recursos_humanos', 'false'],
      ['feature_reportes',         'false'],
      ['feature_alarmas',          'false'],
    ];

    await supabase.from('system_config').upsert(
      configs.map(([config_key, config_value]) => ({ config_key, config_value, tenant_id: tenantId })),
      { onConflict: 'tenant_id,config_key' }
    );

    // ── 5. Demo dishes — category usa enum dish_category ────────────────────
    // Enum values: 'Entradas', 'Platos Fuertes', 'Postres', 'Bebidas', 'Extras'
    await supabase.from('dishes').insert([
      { name: 'Ensalada César',      price: 95,  category: 'Entradas',       description: 'Lechuga romana, crutones y aderezo César', emoji: '🥗', available: true, popular: false, preparation_time_min: 8,  tenant_id: tenantId },
      { name: 'Sopa del día',        price: 75,  category: 'Entradas',       description: 'Sopa casera según temporada',              emoji: '🍲', available: true, popular: false, preparation_time_min: 10, tenant_id: tenantId },
      { name: 'Filete a la plancha', price: 210, category: 'Platos Fuertes', description: 'Filete de res con guarnición',            emoji: '🥩', available: true, popular: true,  preparation_time_min: 20, tenant_id: tenantId },
      { name: 'Pollo en salsa',      price: 165, category: 'Platos Fuertes', description: 'Pechuga con salsa de la casa',           emoji: '🍗', available: true, popular: false, preparation_time_min: 18, tenant_id: tenantId },
      { name: 'Pasta Alfredo',       price: 145, category: 'Platos Fuertes', description: 'Fetuccini con salsa Alfredo',            emoji: '🍝', available: true, popular: true,  preparation_time_min: 15, tenant_id: tenantId },
      { name: 'Hamburguesa clásica', price: 135, category: 'Platos Fuertes', description: 'Con papas fritas',                      emoji: '🍔', available: true, popular: true,  preparation_time_min: 12, tenant_id: tenantId },
      { name: 'Agua fresca',         price: 35,  category: 'Bebidas',        description: 'Jamaica, horchata o limón',              emoji: '🥤', available: true, popular: false, preparation_time_min: 2,  tenant_id: tenantId },
      { name: 'Refresco',            price: 30,  category: 'Bebidas',        description: 'Lata 355ml',                            emoji: '🥤', available: true, popular: false, preparation_time_min: 1,  tenant_id: tenantId },
      { name: 'Café americano',      price: 45,  category: 'Bebidas',        description: 'Café de olla o americano',              emoji: '☕', available: true, popular: false, preparation_time_min: 3,  tenant_id: tenantId },
      { name: 'Flan napolitano',     price: 65,  category: 'Postres',        description: 'Con cajeta y crema',                   emoji: '🍮', available: true, popular: false, preparation_time_min: 2,  tenant_id: tenantId },
      { name: 'Pay de queso',        price: 70,  category: 'Postres',        description: 'Con frutos rojos',                     emoji: '🍰', available: true, popular: false, preparation_time_min: 2,  tenant_id: tenantId },
    ]);

    // ── 6. Demo tables — restaurant_tables (number es UNIQUE NOT NULL) ───────
    await supabase.from('restaurant_tables').insert(
      Array.from({ length: 10 }, (_, i) => ({
        number:    i + 1,
        name:      `Mesa ${i + 1}`,
        capacity:  i < 6 ? 4 : 6,
        status:    'libre',
        tenant_id: tenantId,
      }))
    );

    return json({ ok: true, tenantId, slug: slug.trim() });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[create-tenant] unhandled error:', msg);
    return json({ error: msg }, 500);
  }
});
