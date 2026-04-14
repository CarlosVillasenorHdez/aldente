import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ok  = (data: unknown) => new Response(JSON.stringify(data),   { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const err = (msg: string, status = 400) => new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { restaurantName, slug, adminName, phone, pinHash } = await req.json();

    if (!restaurantName?.trim() || !slug?.trim() || !adminName?.trim() || !pinHash) {
      return err('Campos requeridos faltantes');
    }

    // ── 1. Tenant ────────────────────────────────────────────────────────────
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .insert({ name: restaurantName.trim(), slug: slug.trim(), plan: 'operacion', is_active: true, trial_ends_at: trialEnd.toISOString() })
      .select('id').single();

    if (tenantErr || !tenant) {
      const isDup = tenantErr?.message?.includes('unique') || tenantErr?.message?.includes('duplicate');
      return err(isDup ? 'Ya existe un restaurante con ese nombre. Elige otro.' : 'Error al crear restaurante: ' + tenantErr?.message);
    }
    const tenantId = tenant.id;

    // ── 2. Admin user ────────────────────────────────────────────────────────
    const { error: adminErr } = await supabase.from('app_users').insert({
      username: slug + '-admin',
      full_name: adminName.trim(),
      app_role: 'admin',
      pin: pinHash,
      tenant_id: tenantId,
      is_active: true,
      ...(phone?.trim() ? { phone: phone.trim() } : {}),
    });

    if (adminErr) {
      await supabase.from('tenants').delete().eq('id', tenantId);
      return err('Error al crear usuario admin: ' + adminErr.message, 500);
    }

    // ── 3. Demo waiter ───────────────────────────────────────────────────────
    await supabase.from('app_users').insert({
      username: slug + '-mesero',
      full_name: 'Mesero Demo',
      app_role: 'mesero',
      pin: pinHash,
      tenant_id: tenantId,
      is_active: true,
    });

    // ── 4. system_config ─────────────────────────────────────────────────────
    await supabase.from('system_config').insert([
      { config_key: 'initialized',               config_value: 'false',         tenant_id: tenantId },
      { config_key: 'restaurant_name',           config_value: restaurantName,  tenant_id: tenantId },
      { config_key: 'branch_name',               config_value: restaurantName,  tenant_id: tenantId },
      { config_key: 'iva_percent',               config_value: '16',            tenant_id: tenantId },
      { config_key: 'currency_symbol',           config_value: '$',             tenant_id: tenantId },
      { config_key: 'currency_code',             config_value: 'MXN',           tenant_id: tenantId },
      { config_key: 'currency_locale',           config_value: 'es-MX',         tenant_id: tenantId },
      { config_key: 'establishment_type',        config_value: 'restaurante',   tenant_id: tenantId },
      { config_key: 'feature_mesero_movil',      config_value: 'false',         tenant_id: tenantId },
      { config_key: 'feature_lealtad',           config_value: 'false',         tenant_id: tenantId },
      { config_key: 'feature_reservaciones',     config_value: 'false',         tenant_id: tenantId },
      { config_key: 'feature_delivery',          config_value: 'false',         tenant_id: tenantId },
      { config_key: 'feature_inventario',        config_value: 'false',         tenant_id: tenantId },
      { config_key: 'feature_gastos',            config_value: 'false',         tenant_id: tenantId },
      { config_key: 'feature_recursos_humanos',  config_value: 'false',         tenant_id: tenantId },
      { config_key: 'feature_reportes',          config_value: 'false',         tenant_id: tenantId },
      { config_key: 'feature_alarmas',           config_value: 'false',         tenant_id: tenantId },
    ]);

    // ── 5. Demo dishes — usa enum dish_category real ──────────────────────────
    await supabase.from('dishes').insert([
      { name: 'Ensalada César',      price: 95,  category: 'Entradas',       description: 'Lechuga romana, crutones y aderezo César',  emoji: '🥗', available: true, popular: false, tenant_id: tenantId, preparation_time_min: 8  },
      { name: 'Sopa del día',        price: 75,  category: 'Entradas',       description: 'Sopa casera según temporada',               emoji: '🍲', available: true, popular: false, tenant_id: tenantId, preparation_time_min: 10 },
      { name: 'Filete a la plancha', price: 210, category: 'Platos Fuertes', description: 'Filete de res con guarnición',             emoji: '🥩', available: true, popular: true,  tenant_id: tenantId, preparation_time_min: 20 },
      { name: 'Pollo en salsa',      price: 165, category: 'Platos Fuertes', description: 'Pechuga de pollo con salsa de la casa',    emoji: '🍗', available: true, popular: false, tenant_id: tenantId, preparation_time_min: 18 },
      { name: 'Pasta Alfredo',       price: 145, category: 'Platos Fuertes', description: 'Fetuccini con salsa Alfredo',             emoji: '🍝', available: true, popular: true,  tenant_id: tenantId, preparation_time_min: 15 },
      { name: 'Hamburguesa clásica', price: 135, category: 'Platos Fuertes', description: 'Con papas fritas',                       emoji: '🍔', available: true, popular: true,  tenant_id: tenantId, preparation_time_min: 12 },
      { name: 'Agua fresca',         price: 35,  category: 'Bebidas',        description: 'Jamaica, horchata o limón',               emoji: '🥤', available: true, popular: false, tenant_id: tenantId, preparation_time_min: 2  },
      { name: 'Refresco',            price: 30,  category: 'Bebidas',        description: 'Lata 355ml',                             emoji: '🥤', available: true, popular: false, tenant_id: tenantId, preparation_time_min: 1  },
      { name: 'Café americano',      price: 45,  category: 'Bebidas',        description: 'Café de olla o americano',               emoji: '☕', available: true, popular: false, tenant_id: tenantId, preparation_time_min: 3  },
      { name: 'Flan napolitano',     price: 65,  category: 'Postres',        description: 'Con cajeta y crema',                    emoji: '🍮', available: true, popular: false, tenant_id: tenantId, preparation_time_min: 2  },
      { name: 'Pay de queso',        price: 70,  category: 'Postres',        description: 'Con frutos rojos',                      emoji: '🍰', available: true, popular: false, tenant_id: tenantId, preparation_time_min: 2  },
    ]);

    // ── 6. Demo tables — restaurant_tables con number requerido ──────────────
    await supabase.from('restaurant_tables').insert(
      Array.from({ length: 10 }, (_, i) => ({
        number: i + 1,
        name: `Mesa ${i + 1}`,
        capacity: i < 6 ? 4 : 6,
        status: 'libre',
        tenant_id: tenantId,
      }))
    );

    return ok({ ok: true, tenantId, slug });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error interno del servidor';
    return err(message, 500);
  }
});
