import { NextRequest, NextResponse } from 'next/server';

// Handles CORS preflight (OPTIONS) for /api/* routes.
// The actual CORS headers are set in next.config.mjs headers().
// This middleware only needs to short-circuit OPTIONS requests
// so they return 200 without hitting route handlers.

export function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS' && request.nextUrl.pathname.startsWith('/api/')) {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin':  'https://aldenteerp.com',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age':       '86400',
      },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
