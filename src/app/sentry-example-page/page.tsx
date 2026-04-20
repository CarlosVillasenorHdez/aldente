'use client';

import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';

export default function SentryTestPage() {
  const [sent, setSent] = useState(false);

  const triggerError = () => {
    try {
      // Error intencionado para probar Sentry
      throw new Error('Test error de Aldente ERP — Sentry funcionando correctamente');
    } catch (e) {
      Sentry.captureException(e);
      setSent(true);
    }
  };

  const triggerUnhandled = () => {
    // Error no capturado — Sentry lo atrapa automáticamente
    (undefined as any).nonExistentFunction();
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#060d18', flexDirection: 'column', gap: 16, padding: 32,
    }}>
      <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Sentry — Prueba de integración
      </h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
        Aldente ERP · {process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development'}
      </p>

      <button onClick={triggerError} style={{
        padding: '12px 24px', borderRadius: 10, background: '#2563eb',
        color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
      }}>
        {sent ? '✅ Error enviado a Sentry — revisa sentry.io' : 'Enviar error de prueba (capturado)'}
      </button>

      <button onClick={triggerUnhandled} style={{
        padding: '12px 24px', borderRadius: 10, background: '#dc2626',
        color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
      }}>
        Lanzar error no capturado
      </button>

      <p style={{ color: '#475569', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
        Después de hacer clic, ve a sentry.io → tu proyecto → Issues<br />
        Si ves el error ahí, Sentry está funcionando correctamente.
      </p>

      {sent && (
        <div style={{
          marginTop: 16, padding: '12px 20px', borderRadius: 10,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
          color: '#4ade80', fontSize: 13,
        }}>
          Error enviado. Revisa sentry.io → Issues en unos segundos.
        </div>
      )}
    </div>
  );
}
