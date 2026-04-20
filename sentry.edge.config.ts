import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
  || 'https://c484992d71784b7a0f6fd00c75d2078a@o4511253102788608.ingest.us.sentry.io/4511254691512320';

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: true,
  tracesSampleRate: 0.1,
});
