'use client';

/**
 * FirstStepsChecklist — visible during the first 14 days of trial.
 * Shows 4 key activation milestones. Disappears when all are complete.
 * Based on the "5 shifts in 14 days" North Star metric.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, Circle, X } from 'lucide-react';
import Link from 'next/link';

interface Step {
  key: string;
  label: string;
  desc: string;
  href?: string;
  cta?: string;
  done: boolean;
}

const DISMISS_KEY = 'aldente_checklist_dismissed';

export default function FirstStepsChecklist() {
  const { appUser } = useAuth();
  const supabase = createClient();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    const d = sessionStorage.getItem(DISMISS_KEY);
    if (d) setDismissed(true);
  }, []);

  useEffect(() => {
    if (!appUser?.tenantId || dismissed) return;

    const tenantId = appUser.tenantId;

    Promise.all([
      // 1. First order sent
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).limit(1),
      // 2. First cash register close
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).eq('status', 'cerrada').limit(1),
      // 3. Team member (non-admin) active
      supabase.from('app_users').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).neq('app_role', 'admin').eq('is_active', true).limit(1),
      // 4. 5 distinct days with orders (North Star)
      supabase.from('orders').select('created_at')
        .eq('tenant_id', tenantId).eq('status', 'cerrada'),
      // Trial info
      supabase.from('tenants').select('trial_ends_at, plan_valid_until, plan')
        .eq('id', tenantId).single(),
    ]).then(([orders, closed, team, allOrders, tenant]) => {

      // Calculate distinct days with activity
      const dates = new Set(
        (allOrders.data ?? []).map((o: Record<string, string>) =>
          new Date(o.created_at).toDateString()
        )
      );
      const activeDays = dates.size;

      // Trial days left
      if (tenant.data) {
        const t = tenant.data;
        const until = t.trial_ends_at || t.plan_valid_until;
        if (until && t.plan === 'trial') {
          const left = Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 86400000));
          setTrialDaysLeft(left);
        }
      }

      const newSteps: Step[] = [
        {
          key: 'first_order',
          label: 'Haz tu primera orden',
          desc: 'Abre el POS, selecciona una mesa y manda algo a cocina.',
          href: '/pos-punto-de-venta', cta: 'Abrir POS →',
          done: (orders.count ?? 0) > 0,
        },
        {
          key: 'first_close',
          label: 'Cierra tu primer corte de caja',
          desc: 'Cobra una orden y haz el corte para ver cómo funciona el flujo completo.',
          href: '/corte-caja', cta: 'Ir a corte →',
          done: (closed.count ?? 0) > 0,
        },
        {
          key: 'team_member',
          label: 'Agrega a un miembro de tu equipo',
          desc: 'Crea el usuario de tu cajero o mesero para que entren con su propio PIN.',
          href: '/configuracion', cta: 'Ir a usuarios →',
          done: (team.count ?? 0) > 0,
        },
        {
          key: 'five_shifts',
          label: `Usa el sistema en 5 turnos distintos (${activeDays}/5)`,
          desc: 'Los restaurantes que usan Aldente en 5 turnos durante el trial no lo dejan. Es la prueba real.',
          done: activeDays >= 5,
        },
      ];

      setSteps(newSteps);
      setLoading(false);
    });
  }, [appUser?.tenantId, dismissed]);

  const completed = steps.filter(s => s.done).length;
  const allDone = completed === steps.length;

  if (dismissed || loading || allDone || !appUser) return null;

  return (
    <div style={{ background: '#1a2535', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '16px', padding: '20px 22px', marginBottom: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
              Primeros pasos — {completed} de {steps.length} completados
            </span>
            {trialDaysLeft !== null && (
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: trialDaysLeft <= 3 ? 'rgba(248,113,113,0.15)' : 'rgba(245,158,11,0.1)', color: trialDaysLeft <= 3 ? '#f87171' : '#f59e0b', fontWeight: 500 }}>
                {trialDaysLeft} días de prueba
              </span>
            )}
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', maxWidth: '320px' }}>
            <div style={{ height: '100%', background: '#f59e0b', borderRadius: '4px', width: `${(completed / steps.length) * 100}%`, transition: 'width .4s ease' }} />
          </div>
        </div>
        <button
          onClick={() => { setDismissed(true); sessionStorage.setItem(DISMISS_KEY, '1'); }}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {steps.map(step => (
          <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 12px', borderRadius: '10px', background: step.done ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${step.done ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)'}` }}>
            {step.done
              ? <CheckCircle size={18} style={{ color: '#34d399', flexShrink: 0, marginTop: '1px' }} />
              : <Circle size={18} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0, marginTop: '1px' }} />
            }
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: step.done ? 'rgba(255,255,255,0.45)' : '#f1f5f9', textDecoration: step.done ? 'line-through' : 'none', marginBottom: '2px' }}>
                {step.label}
              </div>
              {!step.done && (
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{step.desc}</div>
              )}
            </div>
            {!step.done && step.href && step.cta && (
              <Link href={step.href} style={{ padding: '5px 12px', borderRadius: '7px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: '12px', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {step.cta}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
