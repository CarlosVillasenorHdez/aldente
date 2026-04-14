import { NextRequest, NextResponse } from 'next/server';

// Allowed origins for CORS on /api/* routes
const ALLOWED_ORIGINS = [
  'https://aldenteerp.com',
  'https://www.aldenteerp.com',
  'https://rocket.new',
];

// Wildcard suffixes — any subdomain of these is allowed
const ALLOWED_SUFFIXES = [
  '.builtwithrocket.new',
  '.vercel.app',          // Vercel preview deployments
];

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
  const origin = request.headers.get('origin');
  const isApi = request.nextUrl.pathname.startsWith('/api/');

  if (!isApi) return NextResponse.next();

  // OPTIONS preflight — respond immediately
  if (request.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 200 });
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    if (isAllowedOrigin(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin!);
      res.headers.set('Vary', 'Origin');
    }
    return res;
  }

  // Regular request — add CORS headers to response
  const res = NextResponse.next();
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  if (isAllowedOrigin(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin!);
    res.headers.set('Vary', 'Origin');
  }
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
