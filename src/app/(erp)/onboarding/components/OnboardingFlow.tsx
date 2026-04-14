'use client';
import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import {
  UtensilsCrossed, LayoutGrid, Users, BarChart2,
  ChevronRight, Sparkles, Clock, Shield
} from 'lucide-react';

const MODULES = [
  {
    icon: UtensilsCrossed, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',
    title: 'Menú y platillos',
    desc: 'Ya tienes 11 platillos de ejemplo. Edítalos o agrega los tuyos.',
    path: '/menu', cta: 'Ir al menú',
  },
  {
    icon: LayoutGrid, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',
    title: 'Layout de mesas',
    desc: '8 mesas configuradas. Ajusta el número y la disposición a tu local.',
    path: '/configuracion', cta: 'Configurar mesas',
  },
  {
    icon: Users, color: '#10b981', bg: 'rgba(16,185,129,0.12)',
    title: 'Tu equipo',
    desc: 'Agrega a tus meseros, cajeros y cocineros con su propio PIN.',
    path: '/personal', cta: 'Agregar empleados',
  },
  {
    icon: BarChart2, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',
    title: 'Dashboard',
    desc: 'Ve las ventas, el P&L del día y el estado de tu operación en tiempo real.',
    path: '/dashboard', cta: 'Ver el dashboard',
  },
];

const HIGHLIGHTS = [
  { icon: Clock,    text: '14 días de prueba gratis, sin tarjeta' },
  { icon: Shield,   text: 'Tus datos son solo tuyos — aislados y seguros' },
  { icon: Sparkles, text: 'Soporte directo por WhatsApp en español' },
];

export default function OnboardingFlow() {
  const { appUser } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function goTo(path: string) {
    setLoading(path);
    try {
      const tid = appUser?.tenantId ?? getTenantId();
      await supabase.from('system_config').upsert(
        { config_key: 'initialized', config_value: 'true', tenant_id: tid },
        { onConflict: 'tenant_id,config_key' }
      );
      await new Promise(r => setTimeout(r, 350));
      router.push(path);
    } catch {
      router.push(path);
    }
  }

  const name = appUser?.fullName?.split(' ')[0] ?? 'ahí';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 40px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24, margin: '0 auto 24px',
          background: 'linear-gradient(135deg, #1B3A6B 0%, #2563eb 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(37,99,235,0.3)',
        }}>
          <span style={{ fontSize: 36 }}>🍽️</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1f2937', margin: '0 0 10px', lineHeight: 1.2 }}>
          Bienvenido, {name}
        </h1>
        <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.7, margin: 0, maxWidth: 420, marginInline: 'auto' }}>
          Tu restaurante está configurado y listo para operar.
          Elige por dónde quieres empezar.
        </p>
      </div>

      {/* Module cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 32 }}>
        {MODULES.map(({ icon: Icon, color, bg, title, desc, path, cta }) => {
          const isLoading = loading === path;
          return (
            <button key={path} onClick={() => goTo(path)} disabled={!!loading}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                gap: 14, padding: '20px 20px 16px', borderRadius: 16, textAlign: 'left',
                border: '1.5px solid #e5e7eb', background: isLoading ? '#f9fafb' : 'white',
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading && !isLoading ? 0.5 : 1,
                transition: 'all .15s',
              }}
              onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${color}22`; }}}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isLoading
                  ? <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${color}40`, borderTopColor: color, animation: 'spin 0.6s linear infinite' }} />
                  : <Icon size={20} color={color} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.55 }}>{desc}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color }}>
                {isLoading ? 'Abriendo…' : cta}
                {!isLoading && <ChevronRight size={13} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Highlights */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {HIGHLIGHTS.map(({ icon: Icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7,
            padding: '7px 14px', borderRadius: 20, background: '#f9fafb',
            border: '1px solid #f3f4f6', fontSize: 12, color: '#6b7280' }}>
            <Icon size={13} color="#9ca3af" />
            {text}
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
