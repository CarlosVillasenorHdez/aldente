// sentry.client.config.ts
// Runs in the browser — captures client-side errors and performance
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Solo en producción para no llenar el dashboard con errores de dev
  enabled: process.env.NODE_ENV === 'production',

  // Performance monitoring — 10% de las transacciones
  tracesSampleRate: 0.1,

  // Session replay — 5% de sesiones normales, 100% con errores
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // No capturar texto ni imágenes — privacidad del restaurantero
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Ignorar errores conocidos no accionables
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    /^Network Error$/,
    /^Loading chunk \d+ failed/,
  ],

  // Etiquetar por ambiente
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
});
