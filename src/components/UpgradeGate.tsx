'use client';
/**
 * UpgradeGate — muestra contenido bloqueado con CTA de upgrade.
 *
 * Para el plan "medida": no hay candado — el módulo simplemente
 * no aparece en el sidebar si no está activo. Este componente
 * solo se activa para planes bundle donde el módulo no está incluido.
 *
 * Filosofía: nunca mostrar una pantalla vacía. Siempre mostrar
 * lo que se está perdiendo, con un CTA claro.
 */

import React, { useState, useEffect } from 'react';
import { Zap, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  PLAN_NAMES, PLAN_PRICES, PLAN_ORDER, PLAN_COLORS,
  invalidateFeaturesCache,
} from '@/hooks/useFeatures';

interface UpgradeGateProps {
  feature: string;
  requiredPlan: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  blurAmount?: number;
}

export default function UpgradeGate({
  feature,
  requiredPlan,
  title,
  description,
  children,
  blurAmount = 6,
}: UpgradeGateProps) {
  const { appUser } = useAuth();
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appUser?.tenantId) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from('tenants').select('plan').eq('id', appUser.tenantId).single()
      .then(({ data }) => {
        setCurrentPlan(data?.plan ?? 'operacion');
        setLoading(false);
      });
  }, [appUser?.tenantId]);

  if (loading) return null;

  // "medida" plan: never show upgrade gate — module shouldn't be visible at all
  // but if somehow reached, show content freely
  if (currentPlan === 'medida') return <>{children}</>;

  const planIdx = PLAN_ORDER.indexOf(currentPlan ?? 'operacion');
  const reqIdx  = PLAN_ORDER.indexOf(requiredPlan);
  const hasAccess = planIdx >= reqIdx;

  if (hasAccess) return <>{children}</>;

  const reqColor = PLAN_COLORS[requiredPlan] ?? '#f59e0b';

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
      {/* Blurred content preview */}
      <div style={{ filter: `blur(${blurAmount}px)`, pointerEvents: 'none',
        userSelect: 'none', opacity: 0.4, maxHeight: 320, overflow: 'hidden' }}>
        {children}
      </div>

      {/* Overlay */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10,14,20,0.7)', backdropFilter: 'blur(2px)' }}>
        <div style={{ textAlign: 'center', padding: '28px 32px', maxWidth: 380 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, margin: '0 auto 16px',
            background: `${reqColor}18`, border: `1px solid ${reqColor}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={22} color={reqColor} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>
            {title}
          </h3>
          <p style={{ fontSize: 13, color: 'rgba(241,245,249,0.5)', margin: '0 0 20px', lineHeight: 1.6 }}>
            {description}
          </p>
          <button
            onClick={() => router.push('/configuracion?section=plan')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: reqColor, color: '#080b10', fontSize: 13,
              fontWeight: 700, cursor: 'pointer' }}>
            Ver Plan {PLAN_NAMES[requiredPlan]}
            <span style={{ fontSize: 11, opacity: 0.7 }}>
              ${(PLAN_PRICES[requiredPlan] ?? 0).toLocaleString('es-MX')}/mes
            </span>
            <ArrowRight size={14} />
          </button>
          <p style={{ fontSize: 11, color: 'rgba(241,245,249,0.25)', marginTop: 12 }}>
            O activa solo este módulo desde{' '}
            <button onClick={() => router.push('/configuracion?section=plan')}
              style={{ background: 'none', border: 'none', color: `${reqColor}99`,
                fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
              Plan → A tu medida
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
