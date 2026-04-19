import { imageHosts } from './image-hosts.config.mjs';
import withPWA from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
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
      `script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://unpkg.com https://static.rocket.new`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: blob: https://${supabaseHost} https://*.cartocdn.com https://*.openstreetmap.org https://unpkg.com`,
      `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://nominatim.openstreetmap.org https://*.builtwithrocket.new wss://*.builtwithrocket.new https://rocket.new https://www.rocket.new`,
      `worker-src 'self' blob:`,
      `frame-src 'none'`,
      `frame-ancestors 'self' https://*.builtwithrocket.new https://rocket.new https://www.rocket.new`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
    ].join('; ');

    const securityHeaders = [
      // X-Frame-Options omitted — CSP frame-ancestors governs this (more flexible)
      { key: 'X-Content-Type-Options',       value: 'nosniff' },
      { key: 'Referrer-Policy',              value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security',    value: 'max-age=31536000; includeSubDomains' },
      { key: 'Permissions-Policy',           value: 'usb=*, bluetooth=*, serial=*, camera=()' },
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

export default withPWA({
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
