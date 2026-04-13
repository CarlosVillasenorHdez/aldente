import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripePlan } from '@/lib/stripe';

/**
 * POST /api/stripe/create-checkout
 * Body: { tenantId: string, plan: 'operacion'|'negocio'|'empresa', customerEmail?: string }
 *
 * Creates a Stripe Checkout session and returns the URL.
 * Tenant ID and plan are stored in metadata so the webhook can update Supabase.
 */
export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
  });

  try {
    const { tenantId, plan, customerEmail } = await req.json() as {
      tenantId: string;
      plan: string;
      customerEmail?: string;
    };

    if (!tenantId || !plan) {
      return NextResponse.json({ error: 'tenantId y plan son requeridos' }, { status: 400 });
    }

    const planConfig = getStripePlan(plan);
    if (!planConfig) {
      return NextResponse.json({ error: `Plan inválido: ${plan}` }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aldente.vercel.app';

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: planConfig.currency,
          product_data: { name: planConfig.name },
          recurring: { interval: planConfig.interval },
          unit_amount: planConfig.amount,
        },
        quantity: 1,
      }],
      subscription_data: {
        metadata: { tenant_id: tenantId, plan },
        trial_period_days: 14,  // 14 días de trial incluidos
      },
      metadata: { tenant_id: tenantId, plan },
      success_url: `${baseUrl}/dashboard?checkout=success&plan=${plan}`,
      cancel_url:  `${baseUrl}/dashboard?checkout=cancelled`,
    };

    // Pre-fill email if available
    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      return NextResponse.json({ error: 'No se pudo generar el link de pago' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor';
    console.error('[stripe/create-checkout]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
