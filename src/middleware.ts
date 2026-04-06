import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_PATHS = ['/admin'];
const PUBLIC_ADMIN = ['/admin/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only intercept /admin/* routes
  const isAdminPath = ADMIN_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (!isAdminPath) return NextResponse.next();

  // Login page is always public
  if (PUBLIC_ADMIN.includes(pathname)) return NextResponse.next();

  // Check Supabase Auth session via cookie
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Extract the session token from cookies
  const cookieHeader = req.headers.get('cookie') ?? '';
  const tokenMatch   = cookieHeader.match(/aldente_auth[^=]*=([^;]+)/);
  const rawToken     = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;

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

  // Verify token with Supabase
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
