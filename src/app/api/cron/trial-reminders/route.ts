import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/cron/trial-reminders
 * Corre diariamente a las 8am CDMX (14:00 UTC).
 * Vercel Cron llama este endpoint automáticamente.
 *
 * Lógica:
 * - Busca tenants en trial cuyo trial_ends_at esté en 7 días → email trial_dia7
 * - Busca tenants en trial cuyo trial_ends_at esté en 3 días → email trial_dia11
 */
export async function GET(req: NextRequest) {
  // Verificar que viene de Vercel Cron (o de un llamado manual autorizado)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aldenteerp.com';

  const now = new Date();

  // Ventana de ±12h alrededor del objetivo para no perder tenants por timing
  function dayWindow(daysFromNow: number) {
    const target = new Date(now);
    target.setDate(target.getDate() + daysFromNow);
    const from = new Date(target); from.setHours(0, 0, 0, 0);
    const to   = new Date(target); to.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  const results: { tenantId: string; type: string; ok: boolean }[] = [];

  async function sendReminder(
    tenantId: string,
    ownerEmail: string,
    restaurantName: string,
    type: 'trial_dia7' | 'trial_dia11',
    daysLeft: number
  ) {
    const res = await fetch(`${APP_URL}/api/emails/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        type,
        to: ownerEmail,
        data: {
          restaurantName,
          adminName: restaurantName, // fallback si no tenemos nombre del admin
          daysLeft,
          loginUrl:   `${APP_URL}/r/${tenantId}`,
          upgradeUrl: `${APP_URL}/r/${tenantId}?section=plan`,
        },
      }),
    });
    return res.ok;
  }

  // ── Día 7: quedan 7 días ───────────────────────────────────────────────────
  const w7 = dayWindow(7);
  const { data: tenants7 } = await supabase
    .from('tenants')
    .select('id, name, owner_email, trial_ends_at, plan_valid_until')
    .gte('trial_ends_at', w7.from)
    .lte('trial_ends_at', w7.to)
    .is('plan_valid_until', null)
    .eq('is_active', true);

  for (const t of tenants7 ?? []) {
    if (!t.owner_email) continue;
    const ok = await sendReminder(t.id, t.owner_email, t.name, 'trial_dia7', 7);
    results.push({ tenantId: t.id, type: 'trial_dia7', ok });
  }

  // ── Día 11: quedan 3 días ──────────────────────────────────────────────────
  const w3 = dayWindow(3);
  const { data: tenants3 } = await supabase
    .from('tenants')
    .select('id, name, owner_email, trial_ends_at, plan_valid_until')
    .gte('trial_ends_at', w3.from)
    .lte('trial_ends_at', w3.to)
    .is('plan_valid_until', null)
    .eq('is_active', true);

  for (const t of tenants3 ?? []) {
    if (!t.owner_email) continue;
    const ok = await sendReminder(t.id, t.owner_email, t.name, 'trial_dia11', 3);
    results.push({ tenantId: t.id, type: 'trial_dia11', ok });
  }

  console.log('[cron/trial-reminders]', JSON.stringify(results));

  return NextResponse.json({
    processed: results.length,
    results,
    timestamp: now.toISOString(),
  });
}
