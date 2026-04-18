/**
 * expire-memberships
 *
 * Supabase Edge Function — se ejecuta como cron diario (o via HTTP con secret).
 *
 * Lógica:
 * 1. Para cada tenant que tenga loyalty_auto_expire_memberships = 'true' en system_config:
 *    a. Busca loyalty_customers activos con membership_expires_at < now()
 *    b. Los marca is_active = false
 *    c. Registra en loyalty_transactions tipo 'expiracion'
 * 2. Para cada tenant con loyalty_whatsapp_notifications = 'true':
 *    a. Busca miembros cuya membresía vence en 7 días (reminder)
 *    b. Llama a la función loyalty-whatsapp para enviar recordatorio
 *
 * Invocación cron desde Supabase (SQL):
 *   select cron.schedule(
 *     'expire-memberships-daily',
 *     '0 9 * * *',   -- cada día a las 9am UTC
 *     $$
 *       select net.http_post(
 *         url := 'https://<PROJECT_REF>.supabase.co/functions/v1/expire-memberships',
 *         headers := '{"Authorization": "Bearer <ANON_KEY>", "x-cron-secret": "<CRON_SECRET>"}'::jsonb,
 *         body := '{}'::jsonb
 *       ) as request_id;
 *     $$
 *   );
 *
 * Variables de entorno necesarias:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Verificar secret de cron (evitar invocaciones no autorizadas)
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret) {
    const reqSecret = req.headers.get('x-cron-secret');
    if (reqSecret !== cronSecret) {
      return json({ error: 'Unauthorized' }, 401);
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const now = new Date().toISOString();
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString();

  const results = {
    expired: 0,
    reminded: 0,
    errors: [] as string[],
  };

  try {
    // ── 1. Obtener todos los tenants con auto-expiración activa ────────────────
    const { data: autoExpireCfg } = await supabase
      .from('system_config')
      .select('tenant_id, config_value')
      .eq('config_key', 'loyalty_auto_expire_memberships')
      .eq('config_value', 'true');

    const autoExpireTenants = new Set((autoExpireCfg || []).map((r: any) => r.tenant_id));

    // ── 2. Obtener tenants con WhatsApp activo ─────────────────────────────────
    const { data: waCfg } = await supabase
      .from('system_config')
      .select('tenant_id, config_value')
      .eq('config_key', 'loyalty_whatsapp_notifications')
      .eq('config_value', 'true');

    const waTenants = new Set((waCfg || []).map((r: any) => r.tenant_id));

    // ── 3. Expirar membresías vencidas ─────────────────────────────────────────
    if (autoExpireTenants.size > 0) {
      const { data: expiredMembers, error: expErr } = await supabase
        .from('loyalty_customers')
        .select('id, tenant_id, name, phone, points')
        .eq('is_active', true)
        .lt('membership_expires_at', now)
        .not('membership_expires_at', 'is', null)
        .in('tenant_id', [...autoExpireTenants]);

      if (expErr) {
        results.errors.push('fetch_expired: ' + expErr.message);
      } else if (expiredMembers && expiredMembers.length > 0) {
        const ids = expiredMembers.map((m: any) => m.id);

        // Desactivar
        const { error: deactivateErr } = await supabase
          .from('loyalty_customers')
          .update({ is_active: false, updated_at: now })
          .in('id', ids);

        if (deactivateErr) {
          results.errors.push('deactivate: ' + deactivateErr.message);
        } else {
          results.expired = expiredMembers.length;

          // Registrar evento en loyalty_transactions
          const txRows = expiredMembers.map((m: any) => ({
            tenant_id: m.tenant_id,
            customer_id: m.id,
            type: 'expiracion',
            points: 0,
            amount: 0,
            notes: 'Membresía expirada automáticamente',
            created_at: now,
          }));

          await supabase.from('loyalty_transactions').insert(txRows);

          // WhatsApp: notificar expiración si el tenant lo tiene activo
          for (const member of expiredMembers as any[]) {
            if (waTenants.has(member.tenant_id) && member.phone) {
              try {
                await fetch(
                  `${Deno.env.get('SUPABASE_URL')}/functions/v1/loyalty-whatsapp`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    },
                    body: JSON.stringify({
                      tenantId: member.tenant_id,
                      event: 'membership_expired',
                      customer: { id: member.id, name: member.name, phone: member.phone },
                    }),
                  }
                );
              } catch (e: any) {
                results.errors.push(`wa_expire_${member.id}: ${e.message}`);
              }
            }
          }
        }
      }
    }

    // ── 4. Recordatorio 7 días antes de vencer ─────────────────────────────────
    if (waTenants.size > 0) {
      const tomorrow = new Date(Date.now() + 1 * 86400000).toISOString();

      const { data: soonMembers, error: soonErr } = await supabase
        .from('loyalty_customers')
        .select('id, tenant_id, name, phone, membership_expires_at')
        .eq('is_active', true)
        .gte('membership_expires_at', tomorrow)   // aún no vencida
        .lte('membership_expires_at', in7Days)     // vence en ≤7 días
        .not('membership_expires_at', 'is', null)
        .in('tenant_id', [...waTenants]);

      if (soonErr) {
        results.errors.push('fetch_soon: ' + soonErr.message);
      } else if (soonMembers && soonMembers.length > 0) {
        for (const member of soonMembers as any[]) {
          if (!member.phone) continue;
          try {
            const daysLeft = Math.ceil(
              (new Date(member.membership_expires_at).getTime() - Date.now()) / 86400000
            );
            await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/loyalty-whatsapp`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  tenantId: member.tenant_id,
                  event: 'membership_expiring_soon',
                  customer: { id: member.id, name: member.name, phone: member.phone },
                  daysLeft,
                }),
              }
            );
            results.reminded++;
          } catch (e: any) {
            results.errors.push(`wa_remind_${member.id}: ${e.message}`);
          }
        }
      }
    }

    return json({ ok: true, ...results, processedAt: now });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
