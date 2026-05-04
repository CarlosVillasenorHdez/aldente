import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { rateLimit } from '@/lib/rateLimit';
import {
  emailBienvenida,
  emailTrialDia7,
  emailTrialDia11,
  emailPagoConfirmado,
} from '@/lib/emails/templates';

const FROM = 'Aldente <noreply@aldenteerp.com>';

type EmailType = 'bienvenida' | 'trial_dia7' | 'trial_dia11' | 'pago_confirmado';

/**
 * POST /api/emails/send
 * Body: { type: EmailType, to: string, data: object }
 *
 * Usado internamente: desde webhook de Stripe, desde Edge Function de registro,
 * y desde el cron job de trial reminders.
 *
 * Protegido con CRON_SECRET para llamadas internas.
 */
export async function POST(req: NextRequest) {
  // Rate limit por IP — 10 emails por hora
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const limit = rateLimit(ip, 10, 60 * 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // Verificar secret para llamadas server-to-server (opcional si viene del webhook de Stripe)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isInternal = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isStripeWebhook = req.headers.get('x-aldente-source') === 'stripe-webhook';

  if (!isInternal && !isStripeWebhook) {
    // En producción, solo llamadas internas pueden enviar emails directamente
    // Las llamadas externas pueden hacer trigger a través de la Edge Function
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  let body: { type: EmailType; to: string; data: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, to, data } = body;
  if (!type || !to || !data) {
    return NextResponse.json({ error: 'type, to y data son requeridos' }, { status: 400 });
  }

  // Validar email básico
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  let template: { subject: string; html: string };

  try {
    switch (type) {
      case 'bienvenida':
        template = emailBienvenida(data as Parameters<typeof emailBienvenida>[0]);
        break;
      case 'trial_dia7':
        template = emailTrialDia7(data as Parameters<typeof emailTrialDia7>[0]);
        break;
      case 'trial_dia11':
        template = emailTrialDia11(data as Parameters<typeof emailTrialDia11>[0]);
        break;
      case 'pago_confirmado':
        template = emailPagoConfirmado(data as Parameters<typeof emailPagoConfirmado>[0]);
        break;
      default:
        return NextResponse.json({ error: `Tipo de email desconocido: ${type}` }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error generando template';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to,
      subject: template.subject,
      html:    template.html,
    });

    if (result.error) {
      console.error('[emails/send] Resend error:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: result.data?.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error enviando email';
    console.error('[emails/send]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
