'use client';
/**
 * AhaMomentTour — Tour de 3 pasos que lleva al dueño al momento
 * donde entiende el valor real de Aldente:
 *   "Hago una venta → la veo en el P&L en tiempo real."
 *
 * Se muestra una sola vez, solo si:
 *   1. El usuario acaba de completar el onboarding (onboarding_completed = true)
 *   2. Aún no ha cerrado ninguna orden real (orders = 0)
 *   3. No lo ha descartado previamente
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { X, ArrowRight, ShoppingCart, TrendingUp, BarChart2 } from 'lucide-react';

const DISMISS_KEY = 'aldente_aha_dismissed';

const STEPS = [
  {
    icon: ShoppingCart,
    color: '#f59e0b',
    number: '01',
    title: 'Haz tu primera venta',
    desc: 'Abre el Punto de Venta, selecciona una mesa, agrega un platillo y cobra. Tarda menos de 2 minutos.',
    cta: 'Abrir el POS →',
    path: '/pos-punto-de-venta',
  },
  {
    icon: TrendingUp,
    color: '#22c55e',
    number: '02',
    title: 'Regresa al Dashboard',
    desc: 'Verás tus ventas del día actualizadas en tiempo real. El punto de equilibrio también cambia.',
    cta: 'Ver el Dashboard →',
    path: '/dashboard',
  },
  {
    icon: BarChart2,
    color: '#8b5cf6',
    number: '03',
    title: 'Abre tu P&L',
    desc: 'En Reportes → Análisis Financiero verás tu primer número real: ventas, COGS y utilidad bruta.',
    cta: 'Ver mi P&L →',
    path: '/reportes',
  },
];

export default function AhaMomentTour() {
  const { appUser } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const check = useCallback(async () => {
    if (!appUser?.tenantId) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    const tid = getTenantId();

    // Solo mostrar si: onboarding completado + sin ventas reales aún
    const [{ data: config }, { count: orders }] = await Promise.all([
      supabase.from('system_config')
        .select('config_value')
        .eq('tenant_id', tid)
        .eq('config_key', 'onboarding_completed')
        .maybeSingle(),
      supabase.from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tid)
        .eq('status', 'cerrada')
        .eq('is_comanda', false),
    ]);

    if (config?.config_value === 'true' && (orders ?? 0) === 0) {
      setShow(true);
    }
  }, [appUser?.tenantId, supabase]);

  useEffect(() => { check(); }, [check]);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  };

  const goToStep = (path: string) => {
    const nextStep = activeStep + 1;
    if (nextStep < STEPS.length) {
      setActiveStep(nextStep);
    }
    router.push(path);
  };

  if (!show) return null;

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'linear-gradient(135deg, #1B3A6B 0%, #0f2444 100%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#f59e0b', letterSpacing: '0.15em' }}>
            ✦ Tu primera vez con Aldente
          </p>
          <p className="text-sm font-semibold text-white mt-0.5">
            3 pasos para ver tu negocio en números reales
          </p>
        </div>
        <button onClick={dismiss} className="text-white/30 hover:text-white/70 transition-colors p-1">
          <X size={16} />
        </button>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isDone = i < activeStep;
          const isActive = i === activeStep;
          const isFuture = i > activeStep;

          return (
            <div key={step.number}
              className="relative px-6 py-5 transition-all"
              style={{ background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent' }}>

              {/* Step indicator */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isDone ? '#22c55e' : isActive ? step.color : 'rgba(255,255,255,0.08)',
                    transition: 'all 0.3s',
                  }}>
                  {isDone
                    ? <span className="text-white text-sm font-bold">✓</span>
                    : <Icon size={15} color={isActive ? '#fff' : 'rgba(255,255,255,0.3)'} />}
                </div>
                <span className="text-xs font-mono font-bold"
                  style={{ color: isDone ? '#22c55e' : isActive ? step.color : 'rgba(255,255,255,0.25)' }}>
                  {step.number}
                </span>
                {isActive && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: `${step.color}20`, color: step.color }}>
                    Ahora
                  </span>
                )}
              </div>

              {/* Content */}
              <p className="text-sm font-bold mb-1.5"
                style={{ color: isFuture ? 'rgba(255,255,255,0.3)' : 'white' }}>
                {step.title}
              </p>
              <p className="text-xs leading-relaxed mb-4"
                style={{ color: isFuture ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.55)' }}>
                {step.desc}
              </p>

              {/* CTA */}
              {isActive && (
                <button
                  onClick={() => goToStep(step.path)}
                  className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all hover:opacity-90 active:scale-95"
                  style={{ background: step.color, color: i === 0 ? '#1B3A6B' : '#fff' }}>
                  {step.cta}
                  <ArrowRight size={13} />
                </button>
              )}
              {isDone && (
                <p className="text-xs font-semibold" style={{ color: '#22c55e' }}>✓ Completado</p>
              )}
              {isFuture && (
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Siguiente →</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          "Tu restaurante en números reales — para que dirijas el negocio, no el caos."
        </p>
        <button onClick={dismiss} className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Omitir
        </button>
      </div>
    </div>
  );
}
