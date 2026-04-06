'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface TenantDetail {
  id: string; name: string; slug: string; plan: string; is_active: boolean;
  owner_email: string | null; country: string; city: string; address: string;
  lat: number | null; lng: number | null; created_at: string;
  trial_ends_at: string | null; plan_valid_until: string | null;
  max_branches: number; max_users: number;
}

interface AppUser { id: string; full_name: string; app_role: string; is_active: boolean; }

const PLANS = ['basico', 'estandar', 'premium'];
const PLAN_COLOR: Record<string, string> = { basico: '#6b7280', estandar: '#f59e0b', premium: '#a78bfa' };
const PLAN_MXN: Record<string, number> = { basico: 800, estandar: 1500, premium: 2500 };

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [draft, setDraft] = useState<Partial<TenantDetail>>({});

  const [usageStats, setUsageStats] = useState<{ ordersThisMonth: number; totalOrders: number } | null>(null);

  useEffect(() => {
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0,0,0,0);

    Promise.all([
      supabase.from('tenants').select('*').eq('id', id).single(),
      supabase.from('app_users').select('id, full_name, app_role, is_active').eq('tenant_id', id).order('app_role'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', id).gte('created_at', monthStart.toISOString()),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    ]).then(([{ data: t }, { data: u }, { count: monthly }, { count: total }]) => {
      if (t) { setTenant(t as TenantDetail); setDraft(t as TenantDetail); }
      setUsers((u ?? []) as AppUser[]);
      setUsageStats({ ordersThisMonth: monthly ?? 0, totalOrders: total ?? 0 });
      setLoading(false);
    });
  }, [id]);

  async function handleSave() {
    if (!tenant) return;
    setSaving(true); setMsg(null);
    const { error } = await supabase.from('tenants').update({
      plan: draft.plan,
      is_active: draft.is_active,
      plan_valid_until: draft.plan_valid_until || null,
    }).eq('id', id);
    setSaving(false);
    setMsg(error ? { text: 'Error al guardar: ' + error.message, ok: false } : { text: '✓ Cambios guardados', ok: true });
    setTimeout(() => setMsg(null), 3000);
  }

  async function handleExtendTrial(days: number) {
    if (!tenant) return;
    const newDate = new Date(tenant.trial_ends_at ? Math.max(new Date(tenant.trial_ends_at).getTime(), Date.now()) : Date.now());
    newDate.setDate(newDate.getDate() + days);
    await supabase.from('tenants').update({ trial_ends_at: newDate.toISOString() }).eq('id', id);
    setTenant(t => t ? { ...t, trial_ends_at: newDate.toISOString() } : t);
    setDraft(d => ({ ...d, trial_ends_at: newDate.toISOString() }));
    setMsg({ text: `✓ Trial extendido ${days} días`, ok: true });
    setTimeout(() => setMsg(null), 3000);
  }

  async function toggleActive() {
    if (!tenant) return;
    const newVal = !tenant.is_active;
    await supabase.from('tenants').update({ is_active: newVal }).eq('id', id);
    setTenant(t => t ? { ...t, is_active: newVal } : t);
    setDraft(d => ({ ...d, is_active: newVal }));
    setMsg({ text: `✓ Tenant ${newVal ? 'activado' : 'desactivado'}`, ok: newVal });
    setTimeout(() => setMsg(null), 3000);
  }

  if (loading) return <p style={{ color: 'rgba(255,255,255,0.4)', padding: '32px' }}>Cargando...</p>;
  if (!tenant) return <p style={{ color: '#f87171', padding: '32px' }}>Tenant no encontrado.</p>;

  const now = new Date();
  const trialActive = tenant.trial_ends_at && new Date(tenant.trial_ends_at) > now;
  const paidActive = tenant.plan_valid_until && new Date(tenant.plan_valid_until) > now;

  return (
    <div style={{ maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link href="/admin/tenants" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>← Restaurantes</Link>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{tenant.name}</h1>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{tenant.slug}</span>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', color: tenant.is_active ? '#34d399' : '#f87171', backgroundColor: tenant.is_active ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)' }}>
            {tenant.is_active ? 'activo' : 'inactivo'}
          </span>
        </div>
        {msg && (
          <span style={{ fontSize: '13px', fontWeight: 600, color: msg.ok ? '#34d399' : '#f87171', backgroundColor: msg.ok ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', padding: '6px 14px', borderRadius: '8px' }}>
            {msg.text}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Info */}
        <div style={{ backgroundColor: '#1a2535', borderRadius: '12px', padding: '18px', border: '1px solid #1e2d3d' }}>
          <h3 style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 14px' }}>Información</h3>
          {[
            ['ID', tenant.id.slice(0, 8) + '...'],
            ['Email dueño', tenant.owner_email ?? '—'],
            ['País / Ciudad', [tenant.country, tenant.city].filter(Boolean).join(' · ') || '—'],
            ['Dirección', tenant.address || '—'],
            ['Registrado', new Date(tenant.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })],
            ['Trial vence', tenant.trial_ends_at ? new Date(tenant.trial_ends_at).toLocaleDateString('es-MX') : '—'],
            ['Pago válido hasta', tenant.plan_valid_until ? new Date(tenant.plan_valid_until).toLocaleDateString('es-MX') : '—'],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{l}</span>
              <span style={{ fontSize: '12px', color: '#f1f5f9', textAlign: 'right', wordBreak: 'break-all' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Acciones */}
        <div style={{ backgroundColor: '#1a2535', borderRadius: '12px', padding: '18px', border: '1px solid #1e2d3d' }}>
          <h3 style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 14px' }}>Suscripción & Acciones</h3>

          <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '5px' }}>Plan</label>
          <select value={draft.plan ?? ''} onChange={e => setDraft(d => ({ ...d, plan: e.target.value }))}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #2a3f5f', backgroundColor: '#0f1923', color: '#f1f5f9', fontSize: '13px', marginBottom: '12px' }}>
            {PLANS.map(p => <option key={p} value={p}>{p} — ${PLAN_MXN[p].toLocaleString('es-MX')}/mes</option>)}
          </select>

          <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '5px' }}>Pago válido hasta</label>
          <input type="date" value={draft.plan_valid_until ? draft.plan_valid_until.split('T')[0] : ''}
            onChange={e => setDraft(d => ({ ...d, plan_valid_until: e.target.value || null }))}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #2a3f5f', backgroundColor: '#0f1923', color: '#f1f5f9', fontSize: '13px', marginBottom: '14px', boxSizing: 'border-box' }} />

          <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: 'none', backgroundColor: '#f59e0b', color: '#1B3A6B', fontWeight: 700, fontSize: '13px', cursor: 'pointer', marginBottom: '10px' }}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => handleExtendTrial(d)} style={{ flex: 1, padding: '7px', borderRadius: '7px', border: '1px solid #2a3f5f', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: '12px', cursor: 'pointer' }}>
                +{d}d trial
              </button>
            ))}
          </div>

          <button onClick={toggleActive} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: `1px solid ${tenant.is_active ? 'rgba(248,113,113,0.4)' : 'rgba(52,211,153,0.4)'}`, backgroundColor: 'transparent', color: tenant.is_active ? '#f87171' : '#34d399', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            {tenant.is_active ? 'Suspender cuenta' : 'Reactivar cuenta'}
          </button>
        </div>

      </div>

      {/* Usuarios del tenant */}
      <div style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e2d3d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>Usuarios ({users.length})</h3>
        </div>
        {users.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Sin usuarios registrados</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0d1720' }}>
                {['Nombre', 'Rol', 'Estado'].map(h => <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ backgroundColor: i % 2 === 0 ? '#0f1923' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 16px', color: '#f1f5f9', fontWeight: 500 }}>{u.full_name}</td>
                  <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{u.app_role}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', color: u.is_active ? '#34d399' : '#f87171', backgroundColor: u.is_active ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)' }}>
                      {u.is_active ? 'activo' : 'inactivo'}
                    </span>
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
