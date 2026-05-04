'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PLAN_NAMES, PLAN_PRICES, PLAN_FEATURES as PLAN_FEATURE_KEYS } from '@/hooks/useFeatures';

interface SubscriptionWallProps {
  reason: 'inactive' | 'expired' | 'trial_ended';
  plan?: string;
  tenantId?: string;
}

const MESSAGES = {
  inactive: {
    icon: '🔒',
    title: 'Cuenta suspendida',
    body: 'Tu cuenta ha sido desactivada. Contacta a soporte para reactivarla.',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.08)',
    border: 'rgba(248,113,113,0.25)',
  },
  expired: {
    icon: '⏰',
    title: 'Tu suscripción ha vencido',
    body: 'El período de pago de tu plan ha expirado. Renueva para seguir operando.',
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.08)',
    border: 'rgba(251,146,60,0.25)',
  },
  trial_ended: {
    icon: '🎯',
    title: 'Tu período de prueba terminó',
    body: 'Gracias por probar Aldente. Elige un plan para continuar.',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.25)',
  },
};

const PLAN_DISPLAY_FEATURES: Record<string, string[]> = {
  operacion: ['POS con mapa de mesas', 'Cocina KDS', 'Mesero móvil (PWA)', 'Corte de caja', 'Roles por PIN', 'Reservaciones'],
  negocio:   ['Todo lo de Operación', 'Inventario vivo', 'P&L y reportes', 'Gastos y depreciaciones', 'Lealtad', 'Alarmas inteligentes', 'RRHH y nómina'],
  empresa:   ['Todo lo de Negocio', 'Multi-sucursal consolidado', 'Delivery integrado', 'Analytics comparativo'],
};

export default function SubscriptionWall({ reason, plan = 'operacion', tenantId }: SubscriptionWallProps) {
  const msg = MESSAGES[reason];
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleUpgrade(selectedPlan: string) {
    if (!tenantId) {
      setError('No se pudo identificar tu cuenta. Contacta soporte.');
      return;
    }
    setLoading(selectedPlan);
    setError('');
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, plan: selectedPlan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'No se pudo iniciar el pago. Intenta de nuevo.');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1923', fontFamily: 'DM Sans, system-ui, sans-serif', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>{msg.icon}</div>
          <h1 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, margin: '0 0 12px' }}>{msg.title}</h1>
          <div style={{ padding: '14px 20px', borderRadius: '12px', backgroundColor: msg.bg, border: `1px solid ${msg.border}` }}>
            <p style={{ color: msg.color, fontSize: '14px', margin: 0, fontWeight: 600 }}>{msg.body}</p>
          </div>
        </div>

        {reason !== 'inactive' && (
          <>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', textAlign: 'center', marginBottom: '16px' }}>
              Elige el plan que mejor se adapte a tu restaurante:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {(['operacion', 'negocio', 'empresa'] as const).map(key => {
                const label = PLAN_NAMES[key];
                const price = PLAN_PRICES[key];
                const features = PLAN_DISPLAY_FEATURES[key] ?? [];
                const isCurrentPlan = key === plan;
                const isLoading = loading === key;
                return (
                  <div key={key} style={{ borderRadius: '12px', backgroundColor: '#1a2535', border: isCurrentPlan ? '1px solid #f59e0b' : '1px solid #1e2d3d', padding: '16px 12px', display: 'flex', flexDirection: 'column' }}>
                    {isCurrentPlan && (
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Plan actual</div>
                    )}
                    <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '14px', marginBottom: '2px' }}>{label}</div>
                    <div style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: 700, fontFamily: 'monospace', marginBottom: '2px' }}>${price.toLocaleString('es-MX')}</div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginBottom: '12px' }}>/mes MXN</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', flex: 1 }}>
                      {features.map(f => (
                        <li key={f} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', padding: '2px 0', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                          <span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleUpgrade(key)}
                      disabled={!!loading}
                      style={{ width: '100%', padding: '9px', borderRadius: '8px', border: 'none', backgroundColor: isLoading ? 'rgba(245,158,11,0.5)' : '#f59e0b', color: '#1B3A6B', fontWeight: 700, fontSize: '12px', cursor: loading ? 'wait' : 'pointer', transition: 'opacity .15s' }}
                    >
                      {isLoading ? '...' : `Contratar ${label}`}
                    </button>
                  </div>
                );
              })}
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: '13px', textAlign: 'center', marginBottom: '16px' }}>
                {error}
              </div>
            )}
          </>
        )}

        <div style={{ textAlign: 'center' }}>
          <a href="mailto:soporte@aldente.mx?subject=Soporte%20de%20suscripción" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', textDecoration: 'none' }}>
            ¿Necesitas ayuda? soporte@aldente.mx
          </a>
        </div>
      </div>
    </div>
  );
}
