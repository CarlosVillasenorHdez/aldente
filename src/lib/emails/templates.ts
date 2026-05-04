/**
 * src/lib/emails/templates.ts
 * Templates HTML para emails transaccionales de Aldente.
 * Todos son strings HTML inline-styled (compatible con todos los clientes de email).
 */

const BASE = (content: string) => `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aldente</title></head>
<body style="margin:0;padding:0;background:#080b10;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#080b10">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#c9963a;letter-spacing:.04em;">Aldente</span>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#111827;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:36px 40px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td align="center" style="padding-top:24px;">
          <p style="font-size:11px;color:rgba(255,255,255,.2);margin:0;line-height:1.8;">
            Aldente · México<br/>
            <a href="https://aldenteerp.com/privacidad" style="color:rgba(212,146,42,.4);text-decoration:none;">Aviso de Privacidad</a>
            &nbsp;·&nbsp;
            <a href="https://aldenteerp.com/terminos" style="color:rgba(212,146,42,.4);text-decoration:none;">Términos</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const TITLE = (t: string) =>
  `<h1 style="font-family:Georgia,serif;font-size:26px;color:#f0ede8;margin:0 0 16px;letter-spacing:-.3px;font-weight:400;">${t}</h1>`;

const P = (t: string) =>
  `<p style="font-size:15px;color:rgba(240,237,232,.65);line-height:1.7;margin:0 0 16px;">${t}</p>`;

const BTN = (label: string, url: string) =>
  `<table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr><td align="center" style="background:#d4922a;border-radius:10px;padding:14px 32px;">
      <a href="${url}" style="font-size:15px;font-weight:700;color:#080b10;text-decoration:none;display:block;">${label}</a>
    </td></tr>
  </table>`;

const DIVIDER = `<hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:24px 0;" />`;

const HIGHLIGHT = (text: string) =>
  `<div style="background:rgba(212,146,42,.08);border:1px solid rgba(212,146,42,.2);border-radius:10px;padding:16px 20px;margin:20px 0;">
    <p style="font-size:14px;color:rgba(240,237,232,.75);margin:0;line-height:1.6;">${text}</p>
  </div>`;

// ── Email 1: Bienvenida ───────────────────────────────────────────────────────
export function emailBienvenida({
  restaurantName,
  adminName,
  loginUrl,
}: {
  restaurantName: string;
  adminName: string;
  loginUrl: string;
}) {
  return {
    subject: `¡${restaurantName} ya está en Aldente! 🎉`,
    html: BASE(`
      ${TITLE(`Bienvenido a Aldente, ${adminName.split(' ')[0]}.`)}
      ${P(`<strong style="color:#f0ede8;">${restaurantName}</strong> ya tiene su sistema listo. Tienes <strong style="color:#d4922a;">14 días de prueba gratuita</strong> para explorarlo sin límites.`)}
      ${HIGHLIGHT(`Tu restaurante en números reales — para que dirijas el negocio, no el caos.`)}
      ${BTN('Entrar a mi restaurante →', loginUrl)}
      ${P('¿Qué puedes hacer hoy?')}
      <ul style="font-size:14px;color:rgba(240,237,232,.6);line-height:2;padding-left:20px;margin:0 0 16px;">
        <li>Configura tu menú con precios y fotos</li>
        <li>Crea las mesas de tu restaurante</li>
        <li>Agrega a tu equipo con sus PINs</li>
        <li>Haz tu primera orden de prueba</li>
      </ul>
      ${DIVIDER}
      ${P('Si tienes alguna duda, responde a este correo y te ayudamos.')}
    `),
  };
}

// ── Email 2: Recordatorio día 7 ───────────────────────────────────────────────
export function emailTrialDia7({
  restaurantName,
  adminName,
  daysLeft,
  loginUrl,
  upgradeUrl,
}: {
  restaurantName: string;
  adminName: string;
  daysLeft: number;
  loginUrl: string;
  upgradeUrl: string;
}) {
  return {
    subject: `${daysLeft} días de prueba restantes — ${restaurantName}`,
    html: BASE(`
      ${TITLE(`¿Cómo va ${restaurantName.split(' ')[0]}?`)}
      ${P(`Hola ${adminName.split(' ')[0]}, te quedan <strong style="color:#d4922a;">${daysLeft} días de prueba</strong>. Queremos asegurarnos de que estés sacándole el máximo partido.`)}
      ${HIGHLIGHT(`<strong style="color:#f0ede8;">Tip del día:</strong> Ve a Reportes → P&L para ver cuánto ganaste esta semana. Es el número que cambia todo.`)}
      ${BTN('Entrar a Aldente →', loginUrl)}
      ${DIVIDER}
      <p style="font-size:13px;color:rgba(240,237,232,.4);margin:0 0 12px;">Cuando estés listo para continuar:</p>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:8px 0;">
          <a href="${upgradeUrl}" style="font-size:13px;color:#d4922a;text-decoration:none;">Ver planes y precios →</a>
        </td></tr>
      </table>
    `),
  };
}

// ── Email 3: Alerta día 11 (urgente) ──────────────────────────────────────────
export function emailTrialDia11({
  restaurantName,
  adminName,
  upgradeUrl,
}: {
  restaurantName: string;
  adminName: string;
  upgradeUrl: string;
}) {
  return {
    subject: `3 días para que tu prueba termine — no pierdas tus datos`,
    html: BASE(`
      ${TITLE(`Tu prueba termina en 3 días.`)}
      ${P(`Hola ${adminName.split(' ')[0]}, el período de prueba de <strong style="color:#f0ede8;">${restaurantName}</strong> vence en 3 días.`)}
      ${P(`Si no activas un plan, tu acceso se suspenderá. <strong style="color:#f0ede8;">Tus datos se conservan por 30 días adicionales</strong> — puedes reactivar cuando quieras.`)}
      ${BTN('Activar mi plan ahora →', upgradeUrl)}
      ${DIVIDER}
      ${P(`El plan Operación cuesta <strong style="color:#d4922a;">$699/mes</strong> — menos que una hora de merma evitada.`)}
      <p style="font-size:12px;color:rgba(240,237,232,.3);margin:8px 0 0;">¿Tienes preguntas? Responde este correo.</p>
    `),
  };
}

// ── Email 4: Confirmación de pago ─────────────────────────────────────────────
export function emailPagoConfirmado({
  restaurantName,
  adminName,
  plan,
  amount,
  nextBillingDate,
  loginUrl,
}: {
  restaurantName: string;
  adminName: string;
  plan: string;
  amount: string;
  nextBillingDate: string;
  loginUrl: string;
}) {
  return {
    subject: `Pago confirmado — Plan ${plan} activado`,
    html: BASE(`
      ${TITLE(`Plan ${plan} activado. 🎉`)}
      ${P(`Hola ${adminName.split(' ')[0]}, tu pago fue procesado correctamente. <strong style="color:#f0ede8;">${restaurantName}</strong> ya tiene acceso completo a Aldente.`)}
      ${HIGHLIGHT(`<strong style="color:#f0ede8;">Plan:</strong> ${plan}<br/>
      <strong style="color:#f0ede8;">Monto:</strong> ${amount} MXN/mes<br/>
      <strong style="color:#f0ede8;">Próximo cobro:</strong> ${nextBillingDate}`)}
      ${BTN('Ir a mi restaurante →', loginUrl)}
      ${DIVIDER}
      ${P('Para cancelar o cambiar de plan en cualquier momento, entra a <strong style="color:#f0ede8;">Configuración → Plan</strong> dentro del sistema.')}
    `),
  };
}
