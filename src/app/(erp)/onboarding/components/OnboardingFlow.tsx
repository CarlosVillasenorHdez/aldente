'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Rocket, ChevronRight, LayoutGrid, UtensilsCrossed, Users, BarChart2 } from 'lucide-react';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';

const QUICK_LINKS = [
  { icon: UtensilsCrossed, label: 'Agregar platillos',    path: '/menu',           color: '#f59e0b' },
  { icon: LayoutGrid,      label: 'Configurar mesas',     path: '/configuracion',  color: '#3b82f6' },
  { icon: Users,           label: 'Agregar empleados',    path: '/personal',       color: '#10b981' },
  { icon: BarChart2,       label: 'Ver el dashboard',     path: '/dashboard',      color: '#8b5cf6' },
];

export default function OnboardingFlow() {
  const { appUser } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const restaurantName = appUser?.branchId
    ? undefined
    : undefined; // Will come from system_config via AppLayout

  async function goTo(path: string) {
    setLoading(true);
    try {
      const tid = appUser?.tenantId ?? getTenantId();
      // Mark as initialized so AppLayout doesn't redirect back here
      await supabase.from('system_config').upsert(
        { config_key: 'initialized', config_value: 'true', tenant_id: tid },
        { onConflict: 'tenant_id,config_key' }
      );
      await new Promise(r => setTimeout(r, 400));
      router.push(path);
    } catch {
      router.push(path);
    }
  }

  const C = { blue: '#1B3A6B', gold: '#f59e0b' };

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '0 16px' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
          background: 'linear-gradient(135deg, #1B3A6B, #2563eb)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Rocket size={32} color="white" />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1f2937', margin: '0 0 10px' }}>
          ¡Tu restaurante está listo!
        </h1>
        <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.65, margin: 0 }}>
          Ya tienes mesas, un menú de ejemplo y acceso configurado.
          ¿Por dónde quieres empezar?
        </p>
      </div>

      {/* Quick links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {QUICK_LINKS.map(({ icon: Icon, label, path, color }) => (
          <button key={path} onClick={() => goTo(path)} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
              borderRadius: 14, border: '1.5px solid #e5e7eb', background: 'white',
              cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left',
              transition: 'all .15s', opacity: loading ? 0.6 : 1 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.background = '#f9fafb'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLElement).style.background = 'white'; }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} color={color} />
            </div>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#1f2937' }}>{label}</span>
            <ChevronRight size={16} color="#d1d5db" />
          </button>
        ))}
      </div>

      {/* Note */}
      <div style={{ padding: '14px 18px', borderRadius: 12, background: '#fffbeb',
        border: '1px solid #fde68a', fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
        <strong>Tip:</strong> Empieza por agregar tus platillos reales y configura las mesas
        según tu local. El menú de ejemplo se puede editar o borrar desde el módulo de Menú.
      </div>
    </div>
  );
}
