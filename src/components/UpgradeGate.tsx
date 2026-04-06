'use client';

/**
 * UpgradeGate — shows a blurred teaser with upgrade prompt
 * when the current plan doesn't include a feature.
 *
 * Strategy: never show empty widgets. Always show what they're missing.
 * The blur + lock creates desire, not frustration.
 */

import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UpgradeGateProps {
  feature: string;                    // feature key (e.g. 'inventario', 'reportes')
  requiredPlan: 'estandar' | 'premium';
  title: string;                      // what is being unlocked
  description: string;                // benefit, not feature name
  children: React.ReactNode;          // the actual widget (will be blurred)
  blurAmount?: number;                // 0 = no blur (just lock overlay)
}

const PLAN_LABELS: Record<string, string> = {
  estandar: 'Estándar',
  premium: 'Premium',
};

const PLAN_PRICES: Record<string, string> = {
  estandar: '$1,500',
  premium: '$2,500',
};

export default function UpgradeGate({
  feature,
  requiredPlan,
  title,
  description,
  children,
  blurAmount = 6,
}: UpgradeGateProps) {
  const { appUser } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appUser?.tenantId) { setLoading(false); return; }
    const supabase = createClient();
    supabase
      .from('tenants')
      .select('plan')
      .eq('id', appUser.tenantId)
      .single()
      .then(({ data }) => {
        setCurrentPlan(data?.plan ?? 'basico');
        setLoading(false);
      });
  }, [appUser?.tenantId]);

  // Determine if feature is available
  const planOrder = ['basico', 'estandar', 'premium'];
  const currentIndex = planOrder.indexOf(currentPlan ?? 'basico');
  const requiredIndex = planOrder.indexOf(requiredPlan);
  const hasAccess = currentIndex >= requiredIndex;

  // While loading, render children normally (no flash)
  if (loading || hasAccess) return <>{children}</>;

  return (
    <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden' }}>
      {/* Blurred children underneath */}
      <div style={{
        filter: blurAmount > 0 ? `blur(${blurAmount}px)` : 'none',
        opacity: 0.4,
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        {children}
      </div>

      {/* Upgrade overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10, 12, 15, 0.75)',
        backdropFilter: 'blur(2px)',
        padding: '24px',
        textAlign: 'center',
      }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          background: 'rgba(200,134,31,0.12)', border: '1px solid rgba(200,134,31,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '14px',
        }}>
          <Lock size={18} style={{ color: '#c8861f' }} />
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '4px 12px', borderRadius: '100px',
          background: 'rgba(200,134,31,0.12)', border: '1px solid rgba(200,134,31,0.22)',
          fontSize: '11px', color: '#dfa03a', fontWeight: 600,
          marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <Sparkles size={10} />
          Plan {PLAN_LABELS[requiredPlan]}
        </div>

        <h3 style={{
          fontSize: '16px', fontWeight: 600, color: '#f4f1ec',
          marginBottom: '8px', lineHeight: 1.3,
        }}>
          {title}
        </h3>

        <p style={{
          fontSize: '13px', color: 'rgba(244,241,236,0.5)',
          lineHeight: 1.6, marginBottom: '20px',
          maxWidth: '260px', fontWeight: 300,
        }}>
          {description}
        </p>

        <a
          href="/configuracion"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '9px 18px', borderRadius: '9px',
            background: '#c8861f', color: '#09090b',
            fontSize: '13px', fontWeight: 600,
            textDecoration: 'none',
            transition: 'background .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#dfa03a')}
          onMouseLeave={e => (e.currentTarget.style.background = '#c8861f')}
        >
          Ver plan {PLAN_LABELS[requiredPlan]} — {PLAN_PRICES[requiredPlan]}/mes
          <ArrowRight size={13} />
        </a>
      </div>
    </div>
  );
}
