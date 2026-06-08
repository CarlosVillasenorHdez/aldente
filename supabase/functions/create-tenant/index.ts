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
      { config_key: 'years_operating',           config_value: yearsOperating || '', tenant_id: tid },
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

    // ── Email de bienvenida (no bloqueante — si falla, el registro igual procede) ──
    try {
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://aldente-erp.com';
      if (RESEND_API_KEY && email?.trim()) {
        const firstName = (adminName?.trim() || 'Bienvenido').split(' ')[0];
        const loginUrl = `${SITE_URL}/r/${slug.trim()}`;
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Aldente <noreply@aldenteerp.com>',
            to: email.trim(),
            subject: `¡${restaurantName} ya está en Aldente! 🎉`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0f1e38;padding:0;border-radius:12px;overflow:hidden;">
                <div style="background:#1B3A6B;padding:32px;text-align:center;">
                  <h1 style="color:#f59e0b;margin:0;font-size:26px;">🍽️ Aldente</h1>
                </div>
                <div style="padding:32px;">
                  <h2 style="color:#f0ede8;margin:0 0 16px;font-size:20px;">Bienvenido, ${firstName}.</h2>
                  <p style="color:rgba(240,237,232,.75);font-size:15px;line-height:1.6;margin:0 0 16px;">
                    <strong style="color:#f0ede8;">${restaurantName}</strong> ya tiene su sistema listo.
                    Tienes <strong style="color:#d4922a;">14 días de prueba gratuita</strong> para explorarlo sin límites.
                  </p>
                  <div style="background:rgba(245,158,11,.1);border-left:3px solid #f59e0b;padding:14px 16px;border-radius:4px;margin:20px 0;">
                    <p style="color:#f0ede8;font-size:14px;margin:0;font-style:italic;">
                      Tu restaurante en números reales — para que dirijas el negocio, no el caos.
                    </p>
                  </div>
                  <a href="${loginUrl}" style="display:inline-block;background:#f59e0b;color:#1B3A6B;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;margin:8px 0 24px;">
                    Entrar a mi restaurante →
                  </a>
                  <p style="color:rgba(240,237,232,.75);font-size:14px;margin:0 0 8px;font-weight:600;">¿Qué puedes hacer hoy?</p>
                  <ul style="font-size:14px;color:rgba(240,237,232,.6);line-height:2;padding-left:20px;margin:0 0 16px;">
                    <li>Configura tu menú con precios (prueba el Asistente IA)</li>
                    <li>Crea las mesas de tu restaurante</li>
                    <li>Agrega a tu equipo con sus PINs</li>
                    <li>Haz tu primera orden de prueba en el POS</li>
                  </ul>
                  <hr style="border:none;border-top:1px solid rgba(255,255,255,.1);margin:24px 0;">
                  <p style="color:rgba(240,237,232,.5);font-size:13px;margin:0;">
                    ¿Alguna duda? Responde a este correo y te ayudamos personalmente.
                  </p>
                </div>
              </div>
            `,
          }),
        });
      }
    } catch (emailErr) {
      console.error('[create-tenant] email de bienvenida falló (no crítico):', emailErr);
    }

    return json({ ok: true, tenantId: tid, slug: slug.trim() });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[create-tenant] error:', msg);
    return json({ error: msg }, 500);
  }
});
