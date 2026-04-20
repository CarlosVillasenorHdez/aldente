import * as Sentry from '@sentry/nextjs';

// DSN es una URL pública — no es un secret, puede estar en el código
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
  || 'https://c484992d71784b7a0f6fd00c75d2078a@o4511253102788608.ingest.us.sentry.io/4511254691512320';

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: true,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    /^Network Error$/,
    /^Loading chunk \d+ failed/,
  ],

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? 'production',
});
