import { NextRequest, NextResponse } from 'next/server';

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

export function middleware(request: NextRequest) {
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
  // La protección real la hace useAdminAuth() en el cliente (más confiable
  // que @supabase/ssr en middleware que puede causar race conditions con cookies).
  // El middleware solo redirige si definitivamente no hay cookie de sesión.
  const isAdminRoute = pathname.startsWith('/admin');
  const isAdminLogin = pathname === '/admin/login';

  if (isAdminRoute && !isAdminLogin) {
    // Verificar si hay alguna cookie de sesión de Supabase
    const hasSbCookie = request.cookies.getAll().some(c =>
      c.name.startsWith('sb-') && c.name.includes('-auth-token')
    );
    if (!hasSbCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    // Si hay cookie, dejar pasar — useAdminAuth() en el cliente hace la
    // verificación completa de email whitelist
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*'],
};
