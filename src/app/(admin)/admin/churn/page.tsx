'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface TenantRow {
  id: string; name: string; plan: string; is_active: boolean;
  trial_ends_at: string | null; plan_valid_until: string | null; created_at: string;
}

function daysUntil(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000); }

export default function ChurnPage() {
  const supabase = createClient();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'trial' | 'expiring' | 'churned'>('trial');

  useEffect(() => {
    supabase.from('tenants')
      .select('id, name, plan, is_active, trial_ends_at, plan_valid_until, created_at')
      .then(({ data }) => { setTenants((data ?? []) as TenantRow[]); setLoading(false); });
  }, []);

  const now = new Date();

  const trialing = tenants.filter(t => t.is_active && t.trial_ends_at && new Date(t.trial_ends_at) > now && !t.plan_valid_until)
    .sort((a, b) => a.trial_ends_at!.localeCompare(b.trial_ends_at!));

  const expiring = tenants.filter(t => t.is_active && t.plan_valid_until && new Date(t.plan_valid_until) > now)
    .sort((a, b) => a.plan_valid_until!.localeCompare(b.plan_valid_until!));

  const churned = tenants.filter(t =>
    !t.is_active ||
    (t.trial_ends_at && new Date(t.trial_ends_at) <= now && !t.plan_valid_until) ||
    (t.plan_valid_until && new Date(t.plan_valid_until) <= now)
  ).sort((a, b) => b.created_at.localeCompare(a.created_at));

  const tabData: Record<string, TenantRow[]> = { trial: trialing, expiring, churned };
  const tabLabels = [
    { key: 'trial',    label: `Trials activos (${trialing.length})` },
    { key: 'expiring', label: `Vencen pronto (${expiring.length})` },
    { key: 'churned',  label: `Churn / Inactivos (${churned.length})` },
  ];

  function statusFor(t: TenantRow) {
    if (!t.is_active) return { label: 'inactivo', color: '#f87171' };
    const expDate = t.trial_ends_at ?? t.plan_valid_until;
    if (!expDate) return { label: 'sin fecha', color: '#6b7280' };
    const days = daysUntil(expDate);
    if (days < 0) return { label: 'vencido', color: '#f87171' };
    if (days === 0) return { label: 'vence hoy', color: '#f87171' };
    if (days <= 3) return { label: `${days}d`, color: '#fb923c' };
    if (days <= 7) return { label: `${days}d`, color: '#fbbf24' };
    return { label: `${days}d`, color: '#34d399' };
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <Link href="/admin" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>← Dashboard</Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Churn & Trials</h1>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Trials activos', value: trialing.length, color: '#60a5fa' },
          { label: 'Vencen en 7 días', value: [...trialing, ...expiring].filter(t => { const d = t.trial_ends_at ?? t.plan_valid_until; return d && daysUntil(d) <= 7; }).length, color: '#fb923c' },
          { label: 'Churned / inactivos', value: churned.length, color: '#f87171' },
        ].map(k => (
          <div key={k.label} style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{k.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: k.color, fontFamily: 'monospace' }}>{loading ? '…' : k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', backgroundColor: '#1a2535', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {tabLabels.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)} style={{
            padding: '7px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            backgroundColor: tab === t.key ? '#0f1923' : 'transparent',
            color: tab === t.key ? '#f59e0b' : 'rgba(255,255,255,0.45)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Cargando...</div>
        ) : tabData[tab].length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Sin resultados en esta categoría</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0d1720' }}>
                {['Restaurante', 'Plan', 'Registrado', tab === 'trial' ? 'Trial vence' : tab === 'expiring' ? 'Suscripción vence' : 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabData[tab].map((t, i) => {
                const st = statusFor(t);
                const expDate = t.trial_ends_at ?? t.plan_valid_until;
                return (
                  <tr key={t.id} style={{ backgroundColor: i % 2 === 0 ? '#0f1923' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/tenants/${t.id}`} style={{ color: '#f1f5f9', textDecoration: 'none', fontWeight: 500 }}>{t.name}</Link>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{t.plan}</td>
                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                      {new Date(t.created_at).toLocaleDateString('es-MX')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: st.color, backgroundColor: `${st.color}15`, padding: '3px 9px', borderRadius: '6px' }}>
                        {tab === 'churned' ? st.label : expDate ? new Date(expDate).toLocaleDateString('es-MX') : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/tenants/${t.id}`} style={{ fontSize: '12px', color: '#f59e0b', textDecoration: 'none' }}>Gestionar →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
