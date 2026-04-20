import { imageHosts } from './image-hosts.config.mjs';
import withPWA from '@ducanh2912/next-pwa';
import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  productionBrowserSourceMaps: true,

  eslint: {
    ignoreDuringBuilds: true,
  },

  distDir: process.env.DIST_DIR || '.next',

  images: {
    remotePatterns: imageHosts,
    minimumCacheTTL: 60,
  },

  async headers() {
    const supabaseHost = 'ocrfaojxnpbxbljskkmz.supabase.co';

    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://unpkg.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: blob: https://${supabaseHost} https://*.cartocdn.com https://*.openstreetmap.org https://unpkg.com`,
      `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://nominatim.openstreetmap.org https://*.ingest.sentry.io https://*.ingest.us.sentry.io`,
      `worker-src 'self' blob:`,
      `frame-src 'none'`,
      `frame-ancestors 'self'`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
    ].join('; ');

    const securityHeaders = [
      { key: 'X-Content-Type-Options',       value: 'nosniff' },
      { key: 'X-Frame-Options',              value: 'SAMEORIGIN' },
      { key: 'X-XSS-Protection',             value: '1; mode=block' },
      { key: 'Referrer-Policy',              value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security',    value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Permissions-Policy',           value: 'camera=(), microphone=(), geolocation=(), usb=*, bluetooth=*, serial=*' },
      { key: 'Content-Security-Policy',      value: csp },
    ];

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // CORS handled dynamically in src/middleware.ts
    ];
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.(jsx|tsx)$/,
      exclude: [/node_modules/],
      use: [{ loader: '@dhiwise/component-tagger/nextLoader' }],
    });
    return config;
  }
};

const pwaConfig = withPWA({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // Cache the critical app routes (shell)
      {
        urlPattern: /^https?:\/\/.*\/(login|pos-punto-de-venta|cocina|mesero)(\/.*)?$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'aldente-pages',
          expiration: { maxEntries: 16, maxAgeSeconds: 24 * 60 * 60 },
          networkTimeoutSeconds: 10,
        },
      },
      // Cache Next.js static JS/CSS chunks
      {
        urlPattern: /^\/_next\/static\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static',
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      // Cache images
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'aldente-images',
          expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      // Network-only for Supabase API (never cache auth/data)
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
        handler: 'NetworkOnly',
      },
    ],
  },
})(nextConfig);

// Envolver con Sentry solo cuando el DSN está configurado
// Sin DSN, el build es idéntico — no hay overhead ni errores
const hasSentry = !!process.env.NEXT_PUBLIC_SENTRY_DSN ||
                  !!process.env.SENTRY_DSN;

export default hasSentry
  ? withSentryConfig(pwaConfig, {
      org: 'aldente-u7',
      project: 'javascript-nextjs',
      silent: true,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
      automaticVercelMonitors: false,
    })
  : pwaConfig;
