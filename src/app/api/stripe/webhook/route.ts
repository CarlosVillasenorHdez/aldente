import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const PLAN_FEATURES: Record<string, Record<string, string>> = {
  basico: {
    feature_mesero_movil: 'false', feature_lealtad: 'false', feature_reservaciones: 'false',
    feature_delivery: 'false', feature_inventario: 'false', feature_gastos: 'false',
    feature_recursos_humanos: 'false', feature_reportes: 'false', feature_alarmas: 'false',
  },
  estandar: {
    feature_mesero_movil: 'true',  feature_lealtad: 'true',  feature_reservaciones: 'true',
    feature_delivery: 'false',     feature_inventario: 'true', feature_gastos: 'false',
    feature_recursos_humanos: 'false', feature_reportes: 'true', feature_alarmas: 'false',
  },
  premium: {
    feature_mesero_movil: 'true',  feature_lealtad: 'true',  feature_reservaciones: 'true',
    feature_delivery: 'true',      feature_inventario: 'true', feature_gastos: 'true',
    feature_recursos_humanos: 'true', feature_reportes: 'true', feature_alarmas: 'true',
  },
};

async function syncPlanFeatures(supabase: ReturnType<typeof getAdminClient>, tenantId: string, plan: string) {
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.basico;
  const updates = Object.entries(features).map(([config_key, config_value]) =>
    supabase.from('system_config')
      .upsert({ config_key, config_value, tenant_id: tenantId }, { onConflict: 'config_key,tenant_id' })
  );
  await Promise.all(updates);
}

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook signature failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = getAdminClient();

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.CheckoutSession;
        const tenantId = session.metadata?.tenant_id ?? session.subscription_data?.metadata?.tenant_id;
        const plan = session.metadata?.plan ?? session.subscription_data?.metadata?.plan;
        if (tenantId && plan) {
          await syncPlanFeatures(supabase, tenantId, plan);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        let tenantId: string | undefined;
        let plan: string | undefined;
        if (typeof invoice.subscription === 'string') {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          tenantId = sub.metadata?.tenant_id;
          plan = sub.metadata?.plan;
        }
        if (tenantId) {
          const validUntil = new Date();
          validUntil.setDate(validUntil.getDate() + 30);
          await supabase.from('tenants').update({
            plan_valid_until: validUntil.toISOString(),
            is_active: true,
            ...(plan ? { plan } : {}),
            updated_at: new Date().toISOString(),
          }).eq('id', tenantId);
          if (plan) await syncPlanFeatures(supabase, tenantId, plan);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata?.tenant_id;
        const plan = sub.metadata?.plan;
        if (tenantId && plan) {
          await supabase.from('tenants').update({ plan, updated_at: new Date().toISOString() }).eq('id', tenantId);
          await syncPlanFeatures(supabase, tenantId, plan);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata?.tenant_id;
        if (tenantId) {
          await supabase.from('tenants').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', tenantId);
        }
        break;
      }

      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
