'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { CheckCircle, Circle, ChevronRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ActivationStep {
  key: string;
  label: string;
  desc: string;
  cta: string;
  path: string;
  done: boolean;
}

const DISMISS_KEY = 'aldente_firstSteps_v2_dismissed';

export default function FirstStepsChecklist() {
  const { appUser } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [steps, setSteps] = useState<ActivationStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) setDismissed(true);
  }, []);

  const load = useCallback(async () => {
    if (!appUser?.tenantId || dismissed) { setLoading(false); return; }
    const tid = getTenantId();

    const [dishes, tables, employees, orders] = await Promise.all([
      supabase.from('dishes').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
      supabase.from('restaurant_tables').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
      supabase.from('app_users').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).neq('app_role', 'admin'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('is_comanda', false).eq('status', 'cerrada'),
    ]);

    // "Demo dishes" = more than 3 dishes not created by user — check if they edited any
    const { count: realDishCount } = await supabase.from('dishes').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tid).gt('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const newSteps: ActivationStep[] = [
      {
        key: 'menu',
        label: 'Carga tu menú real',
        desc: 'Los platillos de ejemplo son solo un punto de partida. Agrega los tuyos y configura los precios.',
        cta: 'Ir al menú',
        path: '/menu',
        done: (realDishCount ?? 0) > 0,
      },
      {
        key: 'tables',
        label: 'Configura tus mesas',
        desc: 'Diseña el mapa de tu local para que el POS refleje tu espacio real.',
        cta: 'Configurar layout',
        path: '/configuracion',
        done: (tables.count ?? 0) > 0,
      },
      {
        key: 'team',
        label: 'Registra a tu equipo',
        desc: 'Dale acceso con PIN propio a tus meseros, cajeros y cocineros.',
        cta: 'Agregar personal',
        path: '/personal',
        done: (employees.count ?? 0) > 1,
      },
      {
        key: 'first_order',
        label: 'Procesa tu primera orden real',
        desc: 'Cuando hagas tu primera venta, el sistema cobra vida. Todo lo anterior fue para este momento.',
        cta: 'Abrir el POS',
        path: '/pos-punto-de-venta',
        done: (orders.count ?? 0) > 0,
      },
    ];

    setSteps(newSteps);
    setLoading(false);
  }, [appUser?.tenantId, dismissed, supabase]);

  useEffect(() => { load(); }, [load]);

  const completed = steps.filter(s => s.done).length;
  const allDone = completed === steps.length && steps.length > 0;

  if (dismissed || loading || allDone || appUser?.appRole !== 'admin') return null;

  return (
    <div style={{ background: 'linear-gradient(135deg, #0f1923 0%, #1a2535 100%)', border: '1px solid rgba(212,146,42,0.2)', borderRadius: 16, padding: '20px 22px', marginBottom: 4 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
              Tu checklist de apertura
            </span>
            <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: completed === 4 ? 'rgba(52,211,153,0.15)' : 'rgba(212,146,42,0.12)', color: completed === 4 ? '#34d399' : '#d4922a', fontWeight: 600 }}>
              {completed} de {steps.length}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden', maxWidth: 280 }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #d4922a, #e8ac4a)', borderRadius: 4, width: `${(completed / steps.length) * 100}%`, transition: 'width .5s ease' }} />
          </div>
        </div>
        <button onClick={() => { setDismissed(true); sessionStorage.setItem(DISMISS_KEY, '1'); }}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
          <X size={14} />
        </button>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step, idx) => {
          const isNext = !step.done && steps.slice(0, idx).every(s => s.done);
          return (
            <div key={step.key}
              onClick={() => !step.done && router.push(step.path)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: step.done ? 'rgba(52,211,153,0.05)' : isNext ? 'rgba(212,146,42,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${step.done ? 'rgba(52,211,153,0.12)' : isNext ? 'rgba(212,146,42,0.2)' : 'rgba(255,255,255,0.05)'}`, cursor: step.done ? 'default' : 'pointer', transition: 'all .15s' }}>
              {/* Icon */}
              {step.done
                ? <CheckCircle size={18} color="#34d399" style={{ flexShrink: 0 }} />
                : <Circle size={18} color={isNext ? '#d4922a' : 'rgba(255,255,255,0.15)'} style={{ flexShrink: 0 }} />}

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: step.done ? 'rgba(255,255,255,0.35)' : isNext ? '#f1f5f9' : 'rgba(255,255,255,0.5)', textDecoration: step.done ? 'line-through' : 'none', margin: 0, marginBottom: step.done ? 0 : 2 }}>
                  {step.label}
                </p>
                {!step.done && (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0, lineHeight: 1.5 }}>
                    {step.desc}
                  </p>
                )}
              </div>

              {/* CTA */}
              {!step.done && isNext && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, background: 'rgba(212,146,42,0.15)', border: '1px solid rgba(212,146,42,0.3)', color: '#d4922a', fontSize: 12, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {step.cta} <ChevronRight size={12} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {completed >= 3 && completed < 4 && (
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 14, lineHeight: 1.5 }}>
          Un paso más — cuando hagas tu primera venta real, Aldente cobra vida.
        </p>
      )}
    </div>
  );
}
