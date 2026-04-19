import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rateLimit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  // Rate limit: 5 requests per IP per 10 minutos
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const limit = rateLimit(ip, 5, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en unos minutos.' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(limit.resetIn / 1000)) },
    });
  }

  try {
    const body = await req.json();

    const { error } = await supabase.from('demo_requests').insert({
      restaurant_name: body.restaurantName,
      contact_name: body.contactName,
      email: body.email,
      phone: body.phone || '',
      plan: body.plan || 'profesional',
      message: body.message || '',
    });

    if (error) throw error;

    // Send email notification via edge function
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'demo_request',
          to: process.env.ADMIN_NOTIFICATION_EMAIL ?? 'cvillasenorhdez@gmail.com',
          data: {
            restaurantName: body.restaurantName,
            contactName: body.contactName,
            email: body.email,
            phone: body.phone,
            plan: body.plan,
            message: body.message,
          },
        },
      });
    } catch {
      // Email failure is non-blocking
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
