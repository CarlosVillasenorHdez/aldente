import { NextRequest, NextResponse } from 'next/server';

// ── CORS helpers ──────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://aldenteerp.com',
  'https://www.aldenteerp.com',
];
const ALLOWED_SUFFIXES = ['.vercel.app'];

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

  // Solo interceptar API routes para CORS
  // Las rutas /admin/* las protege useAdminAuth() en el cliente
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

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

export const config = {
  matcher: ['/api/:path*'],
};
