'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { AlertTriangle, X, Zap } from 'lucide-react';

export default function TrialBanner() {
  const { appUser } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [plan, setPlan] = useState<string>('');

  useEffect(() => {
    if (!appUser?.tenantId) return;
    supabase
      .from('tenants')
      .select('trial_ends_at, plan_valid_until, plan')
      .eq('id', appUser.tenantId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setPlan(data.plan ?? '');
        // Show banner if in trial (no plan_valid_until, or plan is 'operacion'/'trial' with trial_ends_at)
        const trialEnd = data.trial_ends_at;
        const hasActivePlan = data.plan_valid_until && new Date(data.plan_valid_until) > new Date();
        if (hasActivePlan) return; // Paid — no banner
        if (!trialEnd) return;
        const left = Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400000);
        if (left < 0) { setDaysLeft(0); return; } // Expired
        setDaysLeft(left);
      });
  }, [appUser?.tenantId]); // eslint-disable-line

  if (dismissed || daysLeft === null || appUser?.appRole !== 'admin') return null;

  const expired  = daysLeft === 0;
  const urgent   = daysLeft <= 3;
  const warning  = daysLeft <= 7;

  const bg     = expired ? '#450a0a' : urgent ? '#2d1007' : warning ? '#1c1a07' : '#0f1a2e';
  const border = expired ? 'rgba(239,68,68,.35)' : urgent ? 'rgba(251,146,60,.35)' : warning ? 'rgba(234,179,8,.25)' : 'rgba(59,130,246,.2)';
  const accent = expired ? '#f87171' : urgent ? '#fb923c' : warning ? '#facc15' : '#60a5fa';
  const Icon   = urgent || expired ? AlertTriangle : Zap;

  return (
    <div style={{ position:'fixed', bottom:16, right:16, zIndex:9000, maxWidth:380,
      background:bg, border:`1px solid ${border}`, borderRadius:14,
      padding:'12px 16px', display:'flex', alignItems:'flex-start', gap:12,
      boxShadow:'0 8px 32px rgba(0,0,0,.5)' }}>
      <div style={{ width:32, height:32, borderRadius:8, flexShrink:0,
        background:`${accent}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={15} color={accent} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:13, fontWeight:600, color:'#f1f5f9', margin:'0 0 3px', lineHeight:1.3 }}>
          {expired
            ? 'Tu período de prueba terminó'
            : `${daysLeft} día${daysLeft !== 1 ? 's' : ''} de prueba restante${daysLeft !== 1 ? 's' : ''}`}
        </p>
        <p style={{ fontSize:12, color:'rgba(241,245,249,.45)', margin:'0 0 10px', lineHeight:1.5 }}>
          {expired
            ? 'Activa tu plan para seguir usando Aldente sin interrupciones.'
            : urgent
              ? 'Activa tu plan hoy para no perder acceso a tus datos.'
              : 'Activa tu suscripción para continuar después del trial.'}
        </p>
        <button
          onClick={() => router.push('/configuracion?section=plan')}
          style={{ padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer',
            background:accent, color: expired || urgent ? '#0a0c0f' : '#0f172a',
            fontSize:12, fontWeight:700, letterSpacing:'.01em' }}>
          {expired ? 'Activar ahora' : 'Ver planes →'}
        </button>
      </div>
      {!expired && (
        <button onClick={() => setDismissed(true)}
          style={{ background:'none', border:'none', color:'rgba(255,255,255,.2)',
            cursor:'pointer', padding:2, flexShrink:0, marginTop:2 }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}
