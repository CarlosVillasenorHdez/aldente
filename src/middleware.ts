import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// ── CORS helpers ──────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://aldenteerp.com',
  'https://www.aldenteerp.com',
  'https://rocket.new',
];
const ALLOWED_SUFFIXES = ['.builtwithrocket.new', '.vercel.app'];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return ALLOWED_SUFFIXES.some(suffix => origin.endsWith(suffix));
}

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// ── Admin email whitelist ──────────────────────────────────────────────────────
// Only these emails can access /admin/* routes
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'carlos@aldenteerp.com').split(',').map(e => e.trim());

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');
  const isApi = pathname.startsWith('/api/');

  // ── CORS for API routes ──────────────────────────────────────────────────
  if (isApi) {
    if (request.method === 'OPTIONS') {
      const res = new NextResponse(null, { status: 200 });
      Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
      if (isAllowedOrigin(origin)) {
        res.headers.set('Access-Control-Allow-Origin', origin!);
        res.headers.set('Vary', 'Origin');
      }
      return res;
    }
    const res = NextResponse.next();
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    if (isAllowedOrigin(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin!);
      res.headers.set('Vary', 'Origin');
    }
    return res;
  }

  // ── Admin route protection ────────────────────────────────────────────────
  const isAdminRoute = pathname.startsWith('/admin');
  const isAdminLogin = pathname === '/admin/login';

  if (isAdminRoute && !isAdminLogin) {
    let response = NextResponse.next({ request });

    // Read Supabase session from cookies (server-side safe)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options as any)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // No session → redirect to admin login
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Session but not whitelisted email → 403
    const email = user.email ?? '';
    if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) {
      return new NextResponse('Acceso denegado', { status: 403 });
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*'],
};
