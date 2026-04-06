import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { restaurantName, slug, adminName, phone, pinHash } = await req.json();

    if (!restaurantName || !slug || !adminName || !pinHash) {
      return new Response(JSON.stringify({ error: 'Campos requeridos faltantes' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Step 1: Create tenant ────────────────────────────────────────────────
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({ name: restaurantName, slug, plan: 'basico', is_active: true, trial_ends_at: trialEnd.toISOString() })
      .select('id')
      .single();

    if (tenantError || !tenant) {
      const isDuplicate = tenantError?.message?.includes('unique');
      return new Response(JSON.stringify({
        error: isDuplicate ? 'Ya existe un restaurante con ese nombre. Elige otro.' : 'Error al crear el restaurante: ' + tenantError?.message,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const tenantId = tenant.id;

    // ── Step 2: Create admin user ────────────────────────────────────────────
    const { error: userError } = await supabaseAdmin.from('app_users').insert({
      username: slug + '-admin',
      full_name: adminName,
      app_role: 'admin',
      pin: pinHash,
      tenant_id: tenantId,
      is_active: true,
      ...(phone ? { phone } : {}),
    });

    if (userError) {
      await supabaseAdmin.from('tenants').delete().eq('id', tenantId);
      return new Response(JSON.stringify({ error: 'Error al crear usuario: ' + userError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Step 3: Seed system_config ───────────────────────────────────────────
    await supabaseAdmin.from('system_config').insert([
      { config_key: 'initialized',               config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_mesero_movil',     config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_lealtad',          config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_reservaciones',    config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_delivery',         config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_inventario',       config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_gastos',           config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_recursos_humanos', config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_reportes',         config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_alarmas',          config_value: 'false', tenant_id: tenantId },
      { config_key: 'iva_percent',              config_value: '16',    tenant_id: tenantId },
      { config_key: 'currency_symbol',          config_value: '$',     tenant_id: tenantId },
      { config_key: 'currency_code',            config_value: 'MXN',   tenant_id: tenantId },
      { config_key: 'currency_locale',          config_value: 'es-MX', tenant_id: tenantId },
      { config_key: 'branch_name',              config_value: restaurantName, tenant_id: tenantId },
      { config_key: 'restaurant_name',          config_value: restaurantName, tenant_id: tenantId },
    ]);

    // ── Step 4: Seed demo menu ───────────────────────────────────────────────
    const demoCategories = ['Entradas', 'Platos Fuertes', 'Bebidas', 'Postres'];
    const { data: cats } = await supabaseAdmin.from('categories')
      .insert(demoCategories.map((name, i) => ({ name, tenant_id: tenantId, sort_order: i })))
      .select('id, name');

    const catMap: Record<string, string> = {};
    (cats ?? []).forEach((c: { id: string; name: string }) => { catMap[c.name] = c.id; });

    const demoDishes = [
      { name: 'Ensalada César',      price: 95,  category: 'Entradas',      description: 'Lechuga romana, crutones y aderezo César' },
      { name: 'Sopa del día',        price: 75,  category: 'Entradas',      description: 'Sopa casera según temporada' },
      { name: 'Filete a la plancha', price: 210, category: 'Platos Fuertes',description: 'Filete de res con guarnición' },
      { name: 'Pollo en salsa',      price: 165, category: 'Platos Fuertes',description: 'Pechuga de pollo con salsa de la casa' },
      { name: 'Pasta Alfredo',       price: 145, category: 'Platos Fuertes',description: 'Fetuccini con salsa Alfredo' },
      { name: 'Hamburguesa clásica', price: 135, category: 'Platos Fuertes',description: 'Con papas fritas' },
      { name: 'Agua fresca',         price: 35,  category: 'Bebidas',       description: 'Jamaica, horchata o limón' },
      { name: 'Refresco',            price: 30,  category: 'Bebidas',       description: 'Lata 355ml' },
      { name: 'Café americano',      price: 40,  category: 'Bebidas',       description: 'Café de olla o americano' },
      { name: 'Flan napolitano',     price: 65,  category: 'Postres',       description: 'Con cajeta y crema' },
      { name: 'Pay de queso',        price: 70,  category: 'Postres',       description: 'Con frutos rojos' },
    ];

    await supabaseAdmin.from('dishes').insert(
      demoDishes.filter(d => catMap[d.category]).map(d => ({
        name: d.name,
        price: d.price,
        description: d.description,
        category_id: catMap[d.category],
        tenant_id: tenantId,
        is_available: true,
      }))
    );

    // ── Step 5: Seed demo tables ─────────────────────────────────────────────
    const tables = Array.from({ length: 10 }, (_, i) => ({
      name: `Mesa ${i + 1}`,
      capacity: i < 6 ? 4 : 6,
      tenant_id: tenantId,
      status: 'libre',
    }));
    await supabaseAdmin.from('tables').insert(tables);

    // ── Step 6: Seed a demo waiter so login works immediately ────────────────
    await supabaseAdmin.from('app_users').insert({
      username: slug + '-mesero',
      full_name: 'Mesero Demo',
      app_role: 'mesero',
      pin: pinHash,
      tenant_id: tenantId,
      is_active: true,
    });

    return new Response(JSON.stringify({ ok: true, tenantId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
