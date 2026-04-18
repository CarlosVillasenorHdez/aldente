/**
 * loyalty-whatsapp
 *
 * Supabase Edge Function — envía notificaciones WhatsApp de lealtad.
 *
 * Soporta dos proveedores (configurable via env var WHATSAPP_PROVIDER):
 *   - 'twilio'   → Twilio WhatsApp Sandbox / Business API
 *   - 'meta'     → Meta WhatsApp Business Cloud API (recomendado para producción)
 *
 * Eventos soportados:
 *   - purchase           → "Hiciste una compra, tienes X puntos"
 *   - points_balance     → "Tu saldo es X puntos = $Y"
 *   - membership_expired → "Tu membresía expiró, renuévala"
 *   - membership_expiring_soon → "Tu membresía vence en N días"
 *   - promo              → Mensaje promocional libre
 *
 * Variables de entorno necesarias:
 *
 *   Para Twilio:
 *     WHATSAPP_PROVIDER=twilio
 *     TWILIO_ACCOUNT_SID
 *     TWILIO_AUTH_TOKEN
 *     TWILIO_WHATSAPP_FROM   (ej: whatsapp:+14155238886)
 *
 *   Para Meta:
 *     WHATSAPP_PROVIDER=meta
 *     META_WA_PHONE_NUMBER_ID   (de Meta Business Suite)
 *     META_WA_ACCESS_TOKEN      (token permanente de sistema)
 *     META_WA_TEMPLATE_NAMESPACE (optional, para templates aprobados)
 *
 * Formato del body:
 * {
 *   tenantId: string,
 *   event: 'purchase' | 'points_balance' | 'membership_expired' | 'membership_expiring_soon' | 'promo',
 *   customer: { id: string, name: string, phone: string },
 *   points?: number,          // para purchase / points_balance
 *   pointsValue?: number,     // valor en pesos de los puntos
 *   daysLeft?: number,        // para membership_expiring_soon
 *   promoMessage?: string,    // para promo
 *   programName?: string,
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// ── Normalizar teléfono a formato E.164 ────────────────────────────────────────
function normalizePhone(phone: string): string {
  // Quitar todo excepto dígitos y +
  let clean = phone.replace(/[^\d+]/g, '');
  // Si empieza con 0, quitar
  if (clean.startsWith('0')) clean = clean.slice(1);
  // Si no tiene código de país, asumir México (+52)
  if (!clean.startsWith('+')) {
    if (clean.length === 10) clean = '+52' + clean;
    else if (clean.length === 12 && clean.startsWith('52')) clean = '+' + clean;
    else clean = '+' + clean;
  }
  return clean;
}

// ── Construir mensaje según evento ────────────────────────────────────────────
function buildMessage(event: string, params: Record<string, any>): string {
  const name = params.customer?.name?.split(' ')[0] ?? 'Cliente';
  const program = params.programName ?? 'Club de Puntos';

  switch (event) {
    case 'purchase':
      return (
        `¡Hola ${name}! 🎉\n` +
        `Tu compra fue registrada en *${program}*.\n\n` +
        `⭐ Puntos ganados: *${params.points ?? 0}*\n` +
        `💰 Saldo total: *${params.totalPoints ?? params.points ?? 0} puntos*` +
        (params.pointsValue ? ` (= $${params.pointsValue} de descuento)` : '') +
        `\n\n¡Gracias por tu preferencia! 🙌`
      );

    case 'points_balance':
      return (
        `¡Hola ${name}! 📊\n\n` +
        `Tu saldo en *${program}*:\n` +
        `⭐ *${params.points ?? 0} puntos*` +
        (params.pointsValue ? ` = *$${params.pointsValue}* de descuento` : '') +
        `\n\n¡Úsalos en tu próxima visita!`
      );

    case 'membership_expired':
      return (
        `Hola ${name} 😔\n\n` +
        `Tu membresía de *${program}* ha expirado.\n\n` +
        `Renuévala para seguir disfrutando de todos tus beneficios.\n` +
        `¡Te esperamos! ☕`
      );

    case 'membership_expiring_soon':
      return (
        `¡Hola ${name}! ⏰\n\n` +
        `Tu membresía de *${program}* vence en *${params.daysLeft ?? '?'} días*.\n\n` +
        `Renuévala a tiempo para no perder tus beneficios. 🌟`
      );

    case 'promo':
      return params.promoMessage ?? `¡Hola ${name}! Tenemos una promoción especial para ti en *${program}*. 🎁`;

    default:
      return `¡Hola ${name}! Mensaje de ${program}.`;
  }
}

// ── Enviar via Twilio ─────────────────────────────────────────────────────────
async function sendViaTwilio(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? 'whatsapp:+14155238886';

  if (!accountSid || !authToken) return { ok: false, error: 'Twilio credentials not configured' };

  const toWa = `whatsapp:${to}`;
  const credentials = btoa(`${accountSid}:${authToken}`);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: toWa, Body: body }),
    }
  );

  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.message ?? res.statusText };
  return { ok: true };
}

// ── Enviar via Meta Cloud API ─────────────────────────────────────────────────
async function sendViaMeta(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const phoneNumberId = Deno.env.get('META_WA_PHONE_NUMBER_ID');
  const accessToken = Deno.env.get('META_WA_ACCESS_TOKEN');

  if (!phoneNumberId || !accessToken) return { ok: false, error: 'Meta WA credentials not configured' };

  // Usar mensaje de texto libre (solo funciona si la conversación está abierta en 24h)
  // Para mensajes fuera de ventana, usar template aprobado
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace('+', ''),
        type: 'text',
        text: { preview_url: false, body },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) return { ok: false, error: JSON.stringify(data.error) };
  return { ok: true };
}

// ── Handler principal ─────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const { tenantId, event, customer, ...params } = body;

    if (!tenantId || !event || !customer?.phone) {
      return json({ error: 'tenantId, event y customer.phone son requeridos' }, 400);
    }

    // Verificar que el tenant tiene WhatsApp activo
    const { data: cfgRow } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('tenant_id', tenantId)
      .eq('config_key', 'loyalty_whatsapp_notifications')
      .single();

    if (cfgRow?.config_value !== 'true') {
      return json({ ok: false, reason: 'WhatsApp notifications disabled for this tenant' });
    }

    // Obtener nombre del programa
    const { data: nameRow } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('tenant_id', tenantId)
      .eq('config_key', 'loyalty_program_name')
      .single();

    const programName = nameRow?.config_value ?? 'Club de Puntos';
    const phone = normalizePhone(customer.phone);
    const message = buildMessage(event, { ...params, customer, programName });

    // Seleccionar proveedor
    const provider = Deno.env.get('WHATSAPP_PROVIDER') ?? 'twilio';
    let result: { ok: boolean; error?: string };

    if (provider === 'meta') {
      result = await sendViaMeta(phone, message);
    } else {
      result = await sendViaTwilio(phone, message);
    }

    // Registrar intento en DB
    await supabase.from('loyalty_whatsapp_log').insert({
      tenant_id: tenantId,
      customer_id: customer.id ?? null,
      event,
      phone,
      message,
      status: result.ok ? 'sent' : 'error',
      error_msg: result.error ?? null,
      created_at: new Date().toISOString(),
    }).catch(() => {/* tabla opcional */});

    if (!result.ok) {
      return json({ ok: false, error: result.error }, 500);
    }

    return json({ ok: true, provider, to: phone, event });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
