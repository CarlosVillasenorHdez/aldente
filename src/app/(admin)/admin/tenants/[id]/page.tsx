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

interface AppUser {
  id: string;
  full_name: string;
  app_role: string;
  is_active: boolean;
  pin: string;      // hashed SHA-256 or plain (legacy)
  employee_id: string | null;
}

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
  const [pinModal, setPinModal] = useState<AppUser | null>(null);
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState<Record<string, boolean>>({});
  const [savingPin, setSavingPin] = useState(false);
  const [addUserModal, setAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', app_role: 'mesero', pin: '' });
  const [savingUser, setSavingUser] = useState(false);

  const [usageStats, setUsageStats] = useState<{
    ordersThisMonth: number;
    totalOrders: number;
    activeDays: number;       // distinct days with orders in last 14 days
    lastOrderAt: string | null;
    healthScore: 'green' | 'yellow' | 'red';
    healthLabel: string;
  } | null>(null);

  useEffect(() => {
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0,0,0,0);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    Promise.all([
      supabase.from('tenants').select('*').eq('id', id).single(),
      supabase.from('app_users').select('id, full_name, app_role, is_active, pin, employee_id').eq('tenant_id', id).order('app_role'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', id).gte('created_at', monthStart.toISOString()),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
      supabase.from('orders').select('created_at').eq('tenant_id', id).gte('created_at', fourteenDaysAgo.toISOString()).order('created_at', { ascending: false }),
    ]).then(([{ data: t }, { data: u }, { count: monthly }, { count: total }, { data: recent }]) => {
      if (t) { setTenant(t as TenantDetail); setDraft(t as TenantDetail); }
      setUsers((u ?? []) as AppUser[]);

      // Calculate health score
      const dates = new Set((recent ?? []).map((o: Record<string, string>) => new Date(o.created_at).toDateString()));
      const activeDays = dates.size;
      const lastOrderAt = recent && recent.length > 0 ? (recent[0] as Record<string, string>).created_at : null;
      const daysSinceLastOrder = lastOrderAt
        ? Math.floor((Date.now() - new Date(lastOrderAt).getTime()) / 86400000)
        : 999;

      let healthScore: 'green' | 'yellow' | 'red' = 'red';
      let healthLabel = 'Sin actividad — contactar hoy';
      if (activeDays >= 5) { healthScore = 'green'; healthLabel = 'Activo — adoptando bien'; }
      else if (activeDays >= 2 && daysSinceLastOrder <= 3) { healthScore = 'yellow'; healthLabel = 'En proceso — guiar hacia más uso'; }
      else if (daysSinceLastOrder > 3) { healthScore = 'red'; healthLabel = 'Inactivo +3 días — riesgo de churn'; }

      setUsageStats({ ordersThisMonth: monthly ?? 0, totalOrders: total ?? 0, activeDays, lastOrderAt, healthScore, healthLabel });
      setLoading(false);
    });
  }, [id]);

  // Hash PIN (same algorithm as AuthContext)
  async function hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'aldente_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function handlePinChange() {
    if (!pinModal || !newPin || newPin.length < 4) return;
    setSavingPin(true);
    const hashed = await hashPin(newPin);
    const { error } = await supabase.from('app_users').update({ pin: hashed }).eq('id', pinModal.id);
    if (error) { alert('Error: ' + error.message); }
    else {
      setUsers(prev => prev.map(u => u.id === pinModal.id ? { ...u, pin: hashed } : u));
      setPinModal(null);
      setNewPin('');
      setMsg({ text: `PIN de ${pinModal.full_name} actualizado`, ok: true });
    }
    setSavingPin(false);
  }

  async function handleToggleUser(user: AppUser) {
    const { error } = await supabase.from('app_users').update({ is_active: !user.is_active }).eq('id', user.id);
    if (!error) setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
  }

  async function handleAddUser() {
    if (!newUser.full_name.trim() || !newUser.pin || newUser.pin.length < 4) return;
    setSavingUser(true);
    const hashed = await hashPin(newUser.pin);
    const { error } = await supabase.from('app_users').insert({
      full_name: newUser.full_name.trim(),
      app_role: newUser.app_role,
      pin: hashed,
      tenant_id: id,
      is_active: true,
    });
    if (error) { alert('Error: ' + error.message); }
    else {
      // Reload users
      const { data } = await supabase.from('app_users').select('id, full_name, app_role, is_active, pin, employee_id').eq('tenant_id', id).order('app_role');
      setUsers((data ?? []) as AppUser[]);
      setAddUserModal(false);
      setNewUser({ full_name: '', app_role: 'mesero', pin: '' });
      setMsg({ text: `Usuario ${newUser.full_name} creado`, ok: true });
    }
    setSavingUser(false);
  }

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

      {/* Health Score */}
      {usageStats && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 16px', borderRadius: '12px', marginBottom: '10px',
            background: usageStats.healthScore === 'green' ? 'rgba(52,211,153,0.07)' : usageStats.healthScore === 'yellow' ? 'rgba(251,191,36,0.07)' : 'rgba(248,113,113,0.07)',
            border: `1px solid ${usageStats.healthScore === 'green' ? 'rgba(52,211,153,0.2)' : usageStats.healthScore === 'yellow' ? 'rgba(251,191,36,0.2)' : 'rgba(248,113,113,0.2)'}`,
          }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, background: usageStats.healthScore === 'green' ? '#34d399' : usageStats.healthScore === 'yellow' ? '#fbbf24' : '#f87171' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{usageStats.healthLabel}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                {usageStats.activeDays} días activos en últimas 2 semanas · Meta: 5 turnos
                {usageStats.lastOrderAt && ` · Última orden: ${new Date(usageStats.lastOrderAt).toLocaleDateString('es-MX')}`}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              { label: 'Días activos / 14d', value: `${usageStats.activeDays}/14`, color: usageStats.activeDays >= 5 ? '#34d399' : usageStats.activeDays >= 2 ? '#fbbf24' : '#f87171' },
              { label: 'Órdenes este mes', value: String(usageStats.ordersThisMonth), color: '#f1f5f9' },
              { label: 'Total histórico', value: String(usageStats.totalOrders), color: '#f1f5f9' },
            ].map(m => (
              <div key={m.label} style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{m.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: m.color, fontFamily: 'monospace' }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
            Usuarios y acceso — {users.length} registrado{users.length !== 1 ? 's' : ''}
          </h3>
          <button onClick={() => setAddUserModal(true)}
            style={{ padding: '6px 14px', borderRadius: '7px', border: 'none', backgroundColor: '#f59e0b', color: '#1B3A6B', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
            + Nuevo usuario
          </button>
        </div>
        {users.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Sin usuarios registrados</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0d1720' }}>
                {['Nombre', 'Rol', 'PIN de acceso', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ backgroundColor: i % 2 === 0 ? '#0f1923' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 16px', color: '#f1f5f9', fontWeight: 500 }}>{u.full_name}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '5px', backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', textTransform: 'capitalize' }}>
                      {u.app_role === 'ayudante_cocina' ? 'Ayudante cocina' : u.app_role.charAt(0).toUpperCase() + u.app_role.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', color: showPin[u.id] ? '#f1f5f9' : 'rgba(255,255,255,0.3)', letterSpacing: showPin[u.id] ? '0' : '2px' }}>
                        {showPin[u.id] ? (u.pin.length > 10 ? '🔐 Encriptado' : u.pin) : '••••'}
                      </span>
                      <button onClick={() => setShowPin(p => ({ ...p, [u.id]: !p[u.id] }))}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '12px', padding: '2px 4px' }}
                        title={showPin[u.id] ? 'Ocultar' : 'Ver'}>
                        {showPin[u.id] ? '🙈' : '👁'}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', color: u.is_active ? '#34d399' : '#f87171', backgroundColor: u.is_active ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)' }}>
                      {u.is_active ? 'activo' : 'inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => { setPinModal(u); setNewPin(''); }}
                        style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                        🔑 Cambiar PIN
                      </button>
                      <button onClick={() => handleToggleUser(u)}
                        style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${u.is_active ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.3)'}`, backgroundColor: u.is_active ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)', color: u.is_active ? '#f87171' : '#34d399', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                        {u.is_active ? 'Suspender' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── MODAL: Cambiar PIN ── */}
      {pinModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f', borderRadius: '16px', padding: '28px', width: '360px', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: '#f1f5f9', fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>🔑 Cambiar PIN</h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginBottom: '20px' }}>
              Usuario: <strong style={{ color: '#f59e0b' }}>{pinModal.full_name}</strong> ({pinModal.app_role})
            </p>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nuevo PIN (mínimo 4 dígitos)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              placeholder="Ej: 1234"
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
              autoFocus
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #2a3f5f', backgroundColor: '#0f1923', color: '#f1f5f9', fontSize: '24px', fontFamily: 'monospace', textAlign: 'center', letterSpacing: '8px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
            />
            {newPin.length > 0 && newPin.length < 4 && (
              <p style={{ color: '#f87171', fontSize: '12px', marginBottom: '10px' }}>El PIN debe tener al menos 4 dígitos</p>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setPinModal(null); setNewPin(''); }}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handlePinChange} disabled={savingPin || newPin.length < 4}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: newPin.length >= 4 ? '#f59e0b' : 'rgba(255,255,255,0.1)', color: newPin.length >= 4 ? '#1B3A6B' : 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: 700, cursor: newPin.length >= 4 ? 'pointer' : 'not-allowed' }}>
                {savingPin ? 'Guardando...' : 'Cambiar PIN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Nuevo usuario ── */}
      {addUserModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f', borderRadius: '16px', padding: '28px', width: '380px', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: '#f1f5f9', fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>+ Nuevo usuario</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre completo</label>
                <input type="text" placeholder="Ej: María García" value={newUser.full_name}
                  onChange={e => setNewUser(u => ({ ...u, full_name: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #2a3f5f', backgroundColor: '#0f1923', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rol</label>
                <select value={newUser.app_role} onChange={e => setNewUser(u => ({ ...u, app_role: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #2a3f5f', backgroundColor: '#0f1923', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}>
                  {['admin','gerente','cajero','mesero','cocinero','ayudante_cocina','repartidor'].map(r => (
                    <option key={r} value={r}>{r === 'ayudante_cocina' ? 'Ayudante de cocina' : r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PIN de acceso</label>
                <input type="text" inputMode="numeric" maxLength={8} placeholder="••••" value={newUser.pin}
                  onChange={e => setNewUser(u => ({ ...u, pin: e.target.value.replace(/\D/g, '') }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #2a3f5f', backgroundColor: '#0f1923', color: '#f1f5f9', fontSize: '20px', fontFamily: 'monospace', textAlign: 'center', letterSpacing: '6px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setAddUserModal(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleAddUser} disabled={savingUser || !newUser.full_name.trim() || newUser.pin.length < 4}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#f59e0b', color: '#1B3A6B', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                {savingUser ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
