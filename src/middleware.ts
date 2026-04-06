import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ADMIN = ['/admin/login'];

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only intercept /admin/* routes
  if (!pathname.startsWith('/admin')) return NextResponse.next();

  // Login page is always public
  if (PUBLIC_ADMIN.includes(pathname)) return NextResponse.next();

  // Extract session token from cookies — no network call needed
  const cookieHeader = req.headers.get('cookie') ?? '';
  const tokenMatch = cookieHeader.match(/aldente_auth[^=]*=([^;]+)/);
  const rawToken = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;

  let accessToken: string | null = null;
  if (rawToken) {
    try {
      const parsed = JSON.parse(rawToken);
      accessToken = parsed?.access_token ?? parsed?.session?.access_token ?? null;
    } catch { /* not JSON */ }
  }

  if (!accessToken) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  // Verify JWT locally — no round trip to Supabase
  const payload = decodeJwtPayload(accessToken);
  if (!payload) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  // Check token expiry
  const exp = typeof payload.exp === 'number' ? payload.exp : 0;
  if (exp < Math.floor(Date.now() / 1000)) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  // Valid token — let through
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
