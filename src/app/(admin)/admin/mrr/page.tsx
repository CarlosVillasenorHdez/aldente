'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface TenantRow {
  id: string; name: string; plan: string; is_active: boolean;
  plan_valid_until: string | null; trial_ends_at: string | null; created_at: string;
}

const PLAN_MXN: Record<string, number> = { operacion: 799, negocio: 1499, empresa: 2499 };
const PLAN_COLOR: Record<string, string> = { operacion: '#4a9eff', negocio: '#c9963a', empresa: '#a78bfa' };

export default function MRRPage() {
  const supabase = createClient();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('tenants')
      .select('id, name, plan, is_active, plan_valid_until, trial_ends_at, created_at')
      .order('plan_valid_until', { ascending: false })
      .then(({ data }) => { setTenants((data ?? []) as TenantRow[]); setLoading(false); });
  }, []);

  const now = new Date();
  const paid = tenants.filter(t => t.is_active && t.plan_valid_until && new Date(t.plan_valid_until) > now);
  const mrr = paid.reduce((sum, t) => sum + (PLAN_MXN[t.plan] ?? 0), 0);
  const arr = mrr * 12;

  const byPlan = ['operacion', 'negocio', 'empresa'].map(plan => ({
    plan,
    count: paid.filter(t => t.plan === plan).length,
    revenue: paid.filter(t => t.plan === plan).reduce((s, t) => s + (PLAN_MXN[t.plan] ?? 0), 0),
  }));

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <Link href="/admin" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>← Dashboard</Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>MRR & Ingresos</h1>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'MRR', value: `$${mrr.toLocaleString('es-MX')}`, sub: 'ingresos este mes', color: '#f59e0b' },
          { label: 'ARR proyectado', value: `$${arr.toLocaleString('es-MX')}`, sub: 'si no cambia nada', color: '#a78bfa' },
          { label: 'Pagando ahora', value: paid.length, sub: 'tenants activos de pago', color: '#34d399' },
        ].map(k => (
          <div key={k.label} style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{k.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: k.color, fontFamily: 'monospace' }}>{loading ? '…' : k.value}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Por plan */}
      <div style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', margin: '0 0 16px' }}>Desglose por plan</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {byPlan.map(p => (
            <div key={p.plan} style={{ backgroundColor: '#0f1923', borderRadius: '10px', padding: '16px', border: `1px solid ${PLAN_COLOR[p.plan]}30` }}>
              <div style={{ fontWeight: 700, color: PLAN_COLOR[p.plan], fontSize: '14px', marginBottom: '8px', textTransform: 'capitalize' }}>{p.plan}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>{p.count}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>tenants</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: PLAN_COLOR[p.plan], fontFamily: 'monospace' }}>
                ${p.revenue.toLocaleString('es-MX')}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>MXN/mes</div>
            </div>
          ))}
        </div>
        {mrr > 0 && (
          <div style={{ marginTop: '16px', height: '8px', borderRadius: '4px', backgroundColor: '#0f1923', overflow: 'hidden', display: 'flex' }}>
            {byPlan.filter(p => p.revenue > 0).map(p => (
              <div key={p.plan} style={{ height: '100%', width: `${(p.revenue / mrr) * 100}%`, backgroundColor: PLAN_COLOR[p.plan], transition: 'width .3s' }} />
            ))}
          </div>
        )}
      </div>

      {/* Lista de tenants pagando */}
      <div style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e2d3d' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>Tenants pagando ahora</h2>
        </div>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Cargando...</div>
        ) : paid.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Ningún tenant con pago activo todavía</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0d1720' }}>
                {['Restaurante', 'Plan', 'MRR', 'Válido hasta'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paid.map((t, i) => (
                <tr key={t.id} style={{ backgroundColor: i % 2 === 0 ? '#0f1923' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <Link href={`/admin/tenants/${t.id}`} style={{ color: '#f1f5f9', textDecoration: 'none', fontWeight: 500 }}>{t.name}</Link>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: PLAN_COLOR[t.plan], fontSize: '12px', fontWeight: 600 }}>{t.plan}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#f59e0b', fontFamily: 'monospace', fontWeight: 600 }}>
                    ${(PLAN_MXN[t.plan] ?? 0).toLocaleString('es-MX')}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)' }}>
                    {t.plan_valid_until ? new Date(t.plan_valid_until).toLocaleDateString('es-MX') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
