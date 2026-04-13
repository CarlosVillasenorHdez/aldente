'use client';
/**
 * SuperAdmin — Tenant Detail
 * Herramientas proactivas para apoyar el éxito del cliente.
 * Herramientas proactivas para apoyar el éxito del cliente.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const PLANS = ['operacion', 'negocio', 'empresa'];
const PLAN_LABEL: Record<string, string> = { operacion: 'Operación', negocio: 'Negocio', empresa: 'Empresa' };
const PLAN_COLOR: Record<string, string> = { operacion: '#4a9eff', negocio: '#c9963a', empresa: '#a78bfa' };
const PLAN_MXN: Record<string, number> = { operacion: 699, negocio: 1299, empresa: 2199 };
const PLAN_ETAPA: Record<string, string> = { operacion: 'Etapa 1 — Orden y control', negocio: 'Etapa 2 — Rentabilidad visible', empresa: 'Etapa 3 — Escala con control' };

interface TenantDetail {
  id: string; name: string; slug: string; plan: string; is_active: boolean;
  trial_ends_at: string | null; plan_valid_until: string | null;
  owner_email: string | null; country: string | null; city: string | null;
  state_region: string | null; colonia: string | null; postal_code: string | null;
  address: string | null; lat: number | null; lng: number | null; created_at: string;
  phone: string | null;
}
interface BranchDetail {
  id: string; name: string; address: string; phone: string;
  email: string; manager_name: string; is_active: boolean;
}
interface AppUser {
  id: string; full_name: string; app_role: string; is_active: boolean; pin: string;
}
interface UsageStats {
  ordersThisMonth: number; ordersTotal: number; activeDaysLast14: number;
  lastOrderAt: string | null; tablesCount: number; dishesCount: number;
  employeesCount: number; branchesCount: number;
}
interface HealthSignal {
  label: string; status: 'ok' | 'warn' | 'risk'; detail: string;
}

const card: React.CSSProperties = { background: '#1a2535', border: '1px solid #1e2d3d', borderRadius: 14, padding: '20px 22px', marginBottom: 16 };
const label: React.CSSProperties = { fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6, display: 'block' };
const val: React.CSSProperties = { fontSize: 14, color: '#f1f5f9' };

function daysFrom(d: string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [tenant, setTenant]       = useState<TenantDetail | null>(null);
  const [users, setUsers]         = useState<AppUser[]>([]);
  const [draft, setDraft]         = useState<Partial<TenantDetail>>({});
  const [usage, setUsage]         = useState<UsageStats | null>(null);
  const [health, setHealth]       = useState<HealthSignal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [pinModal, setPinModal]   = useState<AppUser | null>(null);
  const [newPin, setNewPin]       = useState('');
  const [showPins, setShowPins]   = useState<Record<string,boolean>>({});
  const [activeTab, setActiveTab] = useState<'overview'|'sucursales'|'users'|'health'|'notes'>('overview');
  const [newUser, setNewUser]     = useState({ full_name: '', app_role: 'mesero', pin: '' });
  const [adminNote, setAdminNote] = useState('');
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    const [{ data: t }, { data: u }, { data: br }] = await Promise.all([
      supabase.from('tenants').select('*').eq('id', id).single(),
      supabase.from('app_users').select('id,full_name,app_role,is_active,pin').eq('tenant_id', id).order('app_role'),
      supabase.from('branches').select('id,name,address,phone,email,manager_name,is_active').eq('tenant_id', id).order('name'),
    ]);
    if (!t) { setLoading(false); return; }

    // Normalize legacy plan name
    const LEGACY: Record<string,string> = { basico:'operacion', starter:'operacion', estandar:'negocio', profesional:'negocio', premium:'empresa', enterprise:'empresa' };
    t.plan = LEGACY[t.plan] ?? t.plan;

    setTenant(t as TenantDetail);
    setDraft({ plan: t.plan, plan_valid_until: t.plan_valid_until, is_active: t.is_active });
    setUsers((u || []) as AppUser[]);
    setBranches((br || []) as BranchDetail[]);

    // Load usage stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();

    const [
      { count: ordersMonth },
      { count: ordersTotal },
      { data: recentOrders },
      { count: tables },
      { count: dishes },
      { count: employees },
      { count: branches },
      { data: noteData },
    ] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('tenant_id', id).eq('is_comanda', false).gte('created_at', monthStart),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('tenant_id', id).eq('is_comanda', false),
      supabase.from('orders').select('created_at').eq('tenant_id', id).eq('is_comanda', false).gte('created_at', twoWeeksAgo).order('created_at', { ascending: false }),
      supabase.from('restaurant_tables').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
      supabase.from('dishes').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
      supabase.from('branches').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
      supabase.from('system_config').select('config_value').eq('tenant_id', id).eq('config_key', 'admin_note').maybeSingle(),
    ]);

    // Count active days (distinct dates with orders)
    const activeDays = new Set((recentOrders || []).map((o: any) => o.created_at.slice(0, 10))).size;
    const lastOrder = recentOrders?.[0]?.created_at ?? null;

    const stats: UsageStats = {
      ordersThisMonth: ordersMonth ?? 0,
      ordersTotal: ordersTotal ?? 0,
      activeDaysLast14: activeDays,
      lastOrderAt: lastOrder,
      tablesCount: tables ?? 0,
      dishesCount: dishes ?? 0,
      employeesCount: employees ?? 0,
      branchesCount: branches ?? 0,
    };
    setUsage(stats);
    if (noteData?.config_value) setAdminNote(noteData.config_value);

    // Health signals
    const signals: HealthSignal[] = [];
    const daysSinceOrder = lastOrder ? Math.floor((Date.now() - new Date(lastOrder).getTime()) / 86400000) : null;

    if (daysSinceOrder === null || daysSinceOrder > 7)
      signals.push({ label: 'Actividad', status: 'risk', detail: daysSinceOrder === null ? 'Sin órdenes registradas' : `Última orden hace ${daysSinceOrder} días — riesgo de churn` });
    else if (daysSinceOrder > 3)
      signals.push({ label: 'Actividad', status: 'warn', detail: `Última orden hace ${daysSinceOrder} días` });
    else
      signals.push({ label: 'Actividad', status: 'ok', detail: `Activo recientemente · ${activeDays}/14 días con órdenes` });

    if ((dishes ?? 0) === 0)
      signals.push({ label: 'Menú', status: 'risk', detail: 'Sin platillos — no puede usar el POS' });
    else if ((dishes ?? 0) < 5)
      signals.push({ label: 'Menú', status: 'warn', detail: `Solo ${dishes} platillos — menú incompleto` });
    else
      signals.push({ label: 'Menú', status: 'ok', detail: `${dishes} platillos cargados` });

    if ((tables ?? 0) === 0)
      signals.push({ label: 'Mesas', status: 'warn', detail: 'Sin mesas configuradas — solo para llevar' });
    else
      signals.push({ label: 'Mesas', status: 'ok', detail: `${tables} mesas configuradas` });

    if ((employees ?? 0) === 0)
      signals.push({ label: 'Equipo', status: 'warn', detail: 'Sin empleados registrados' });
    else
      signals.push({ label: 'Equipo', status: 'ok', detail: `${employees} empleados registrados` });

    const trialDays = daysFrom(t.trial_ends_at);
    const paidDays = daysFrom(t.plan_valid_until);
    if (trialDays !== null && trialDays <= 3 && trialDays >= 0)
      signals.push({ label: 'Trial', status: 'warn', detail: `Vence en ${trialDays} días — momento de convertir` });
    else if (paidDays !== null && paidDays <= 5 && paidDays >= 0)
      signals.push({ label: 'Suscripción', status: 'warn', detail: `Pago vence en ${paidDays} días` });

    setHealth(signals);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function hashPin(pin: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  async function handlePinChange() {
    if (!pinModal || newPin.length < 4) return;
    const hashed = await hashPin(newPin);
    const { error } = await supabase.from('app_users').update({ pin: hashed }).eq('id', pinModal.id);
    if (error) toast.error('Error: ' + error.message);
    else { toast.success('PIN actualizado'); setPinModal(null); setNewPin(''); }
  }

  async function handleToggleUser(user: AppUser) {
    const { error } = await supabase.from('app_users').update({ is_active: !user.is_active }).eq('id', user.id);
    if (error) toast.error(error.message);
    else { toast.success(user.is_active ? 'Usuario suspendido' : 'Usuario activado'); load(); }
  }

  async function handleAddUser() {
    if (!newUser.full_name.trim() || newUser.pin.length < 4) { toast.error('Nombre y PIN de 4+ dígitos requeridos'); return; }
    const hashed = await hashPin(newUser.pin);
    const { error } = await supabase.from('app_users').insert({
      tenant_id: id, full_name: newUser.full_name, app_role: newUser.pin ? newUser.app_role : 'mesero',
      pin: hashed, is_active: true,
    });
    if (error) toast.error(error.message);
    else { toast.success('Usuario creado'); setNewUser({ full_name: '', app_role: 'mesero', pin: '' }); load(); }
  }

  async function handleSave() {
    if (!tenant) return;
    setSaving(true);
    const { error } = await supabase.from('tenants').update({
      plan: draft.plan,
      is_active: draft.is_active,
      plan_valid_until: draft.plan_valid_until || null,
    }).eq('id', id);
    if (error) toast.error('Error al guardar: ' + error.message);
    else { toast.success('Cambios guardados'); load(); }
    setSaving(false);
  }

  async function handleExtendTrial(days: number) {
    if (!tenant) return;
    const base = tenant.trial_ends_at && new Date(tenant.trial_ends_at) > new Date()
      ? new Date(tenant.trial_ends_at) : new Date();
    base.setDate(base.getDate() + days);
    const { error } = await supabase.from('tenants').update({ trial_ends_at: base.toISOString() }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(`+${days} días de trial`); load(); }
  }

  async function handleSaveNote() {
    setSavingNote(true);
    await supabase.from('system_config').upsert(
      { tenant_id: id, config_key: 'admin_note', config_value: adminNote },
      { onConflict: 'tenant_id,config_key' }
    );
    toast.success('Nota guardada');
    setSavingNote(false);
  }

  async function toggleActive() {
    if (!tenant) return;
    const { error } = await supabase.from('tenants').update({ is_active: !tenant.is_active }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(tenant.is_active ? 'Cuenta suspendida' : 'Cuenta activada'); load(); }
  }

  if (loading) return <div style={{ color: 'rgba(255,255,255,0.4)', padding: 40 }}>Cargando…</div>;
  if (!tenant) return <div style={{ color: '#f87171', padding: 40 }}>Tenant no encontrado.</div>;

  const now = new Date();
  const trialActive = tenant.trial_ends_at && new Date(tenant.trial_ends_at) > now;
  const paidActive  = tenant.plan_valid_until && new Date(tenant.plan_valid_until) > now;
  const planColor   = PLAN_COLOR[tenant.plan] ?? '#6b7280';
  const riskCount   = health.filter(h => h.status === 'risk').length;
  const warnCount   = health.filter(h => h.status === 'warn').length;

  const statusColor = riskCount > 0 ? '#ef4444' : warnCount > 0 ? '#f59e0b' : '#22c55e';
  const statusLabel = riskCount > 0 ? `${riskCount} riesgo${riskCount>1?'s':''}` : warnCount > 0 ? `${warnCount} alerta${warnCount>1?'s':''}` : 'Saludable';

  const TAB_STYLE = (t: string): React.CSSProperties => ({
    padding: '8px 16px', fontSize: 13, fontWeight: activeTab === t ? 600 : 400,
    color: activeTab === t ? '#c9963a' : 'rgba(255,255,255,0.4)',
    background: 'none', border: 'none',
    borderBottom: activeTab === t ? '2px solid #c9963a' : '2px solid transparent',
    cursor: 'pointer', transition: 'all .15s',
  });

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Link href="/admin/tenants" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>← Restaurantes</Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: '6px 0 4px' }}>{tenant.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{tenant.slug}</span>
            <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: tenant.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: tenant.is_active ? '#4ade80' : '#f87171' }}>
              {tenant.is_active ? 'activo' : 'suspendido'}
            </span>
            <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: `${planColor}20`, color: planColor }}>
              {PLAN_LABEL[tenant.plan] ?? tenant.plan}
            </span>
            <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: `${statusColor}15`, color: statusColor }}>
              {statusLabel}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={toggleActive} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {tenant.is_active ? 'Suspender' : 'Activar'}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      {usage && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Órdenes/mes', value: usage.ordersThisMonth, color: '#f59e0b' },
            { label: 'Total histór.', value: usage.ordersTotal, color: '#60a5fa' },
            { label: 'Días activos/14', value: `${usage.activeDaysLast14}/14`, color: usage.activeDaysLast14 >= 5 ? '#4ade80' : usage.activeDaysLast14 >= 2 ? '#f59e0b' : '#f87171' },
            { label: 'Platillos', value: usage.dishesCount, color: usage.dishesCount > 0 ? '#a78bfa' : '#f87171' },
            { label: 'Empleados', value: usage.employeesCount, color: 'rgba(255,255,255,0.4)' },
          ].map(k => (
            <div key={k.label} style={{ background: '#1a2535', border: '1px solid #1e2d3d', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: 'monospace' }}>{loading ? '…' : k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #1e2d3d', marginBottom: 20, display: 'flex', gap: 0 }}>
        {(['overview','sucursales','users','health','notes'] as const).map(t => (
          <button key={t} style={TAB_STYLE(t)} onClick={() => setActiveTab(t)}>
            {t === 'overview' ? 'Suscripción' : t === 'sucursales' ? `Sucursales (${branches.length})` : t === 'users' ? 'Usuarios' : t === 'health' ? `Salud${riskCount+warnCount>0?' ('+( riskCount+warnCount)+')':''}` : 'Notas'}
          </button>
        ))}
      </div>

      {/* TAB: Suscripción */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Info */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Información</div>
            {[
              ['ID', tenant.id.slice(0,8)+'…'],
              ['Email dueño', tenant.owner_email ?? '—'],
              ['Teléfono', (tenant as any).phone ?? '—'],
              ['País / Ciudad', [tenant.country, tenant.city].filter(Boolean).join(' / ') || '—'],
              ['Dirección', tenant.address ?? '—'],
              ['Colonia', (tenant as any).colonia ?? '—'],
              ['C.P.', (tenant as any).postal_code ?? '—'],
              ['Estado / Región', (tenant as any).state_region ?? '—'],
              ['Registrado', new Date(tenant.created_at).toLocaleDateString('es-MX')],
              ['Trial vence', tenant.trial_ends_at ? new Date(tenant.trial_ends_at).toLocaleDateString('es-MX') : '—'],
              ['Pago válido hasta', tenant.plan_valid_until ? new Date(tenant.plan_valid_until).toLocaleDateString('es-MX') : '—'],
              ['Mesas', usage?.tablesCount ?? '—'],
              ['Sucursales', usage?.branchesCount ?? '—'],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{k}</span>
                <span style={{ fontSize: 12, color: '#f1f5f9' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Suscripción & acciones */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Suscripción & Acciones</div>

            <span style={label}>Plan</span>
            <select value={draft.plan ?? ''} onChange={e => setDraft(d => ({ ...d, plan: e.target.value }))}
              style={{ width: '100%', background: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>
              {PLANS.map(p => (
                <option key={p} value={p}>{PLAN_LABEL[p]} — ${PLAN_MXN[p].toLocaleString('es-MX')}/mes · {PLAN_ETAPA[p]}</option>
              ))}
            </select>

            <span style={label}>Pago válido hasta</span>
            <input type="date" value={draft.plan_valid_until ? draft.plan_valid_until.split('T')[0] : ''}
              onChange={e => setDraft(d => ({ ...d, plan_valid_until: e.target.value || null }))}
              style={{ width: '100%', background: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 16, boxSizing: 'border-box' }} />

            <button onClick={handleSave} disabled={saving}
              style={{ width: '100%', padding: '11px', borderRadius: 10, background: '#c9963a', border: 'none', color: '#000', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', marginBottom: 10 }}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {[7, 14, 30].map(d => (
                <button key={d} onClick={() => handleExtendTrial(d)}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  +{d}d trial
                </button>
              ))}
            </div>

            {/* MRR impact */}
            <div style={{ background: 'rgba(201,150,58,0.08)', border: '1px solid rgba(201,150,58,0.2)', borderRadius: 10, padding: '12px 14px', marginTop: 8 }}>
              <div style={{ fontSize: 11, color: 'rgba(201,150,58,0.7)', marginBottom: 4 }}>IMPACTO MRR</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#c9963a', fontFamily: 'monospace' }}>
                ${(PLAN_MXN[draft.plan ?? tenant.plan] ?? 0).toLocaleString('es-MX')}<span style={{ fontSize: 12, fontWeight: 400 }}>/mes</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Sucursales */}
      {activeTab === 'sucursales' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#f1f5f9' }}>Sucursales — {branches.length}</span>
          </div>
          {/* Sucursal principal = el tenant mismo */}
          <div style={{ padding:'16px 18px', borderRadius:12, background:'rgba(201,150,58,.05)', border:'1px solid rgba(201,150,58,.2)', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'#f1f5f9', marginBottom:2 }}>{tenant?.name ?? '—'} <span style={{ fontSize:10, color:'#c9963a', fontWeight:700, marginLeft:6 }}>PRINCIPAL</span></div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>Sucursal principal · slug: {tenant?.slug}</div>
              </div>
              <span style={{ fontSize:10, fontWeight:700, color:'#34d399', background:'rgba(52,211,153,.1)', padding:'2px 8px', borderRadius:5 }}>Activa</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {tenant?.address && <div><div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginBottom:2 }}>Dirección</div><div style={{ fontSize:12, color:'rgba(255,255,255,.65)' }}>{tenant.address}</div></div>}
              {(tenant as any)?.city && <div><div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginBottom:2 }}>Ciudad</div><div style={{ fontSize:12, color:'rgba(255,255,255,.65)' }}>{(tenant as any).city}</div></div>}
              {tenant?.owner_email && <div><div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginBottom:2 }}>Email dueño</div><div style={{ fontSize:12, color:'#60a5fa' }}>{tenant.owner_email}</div></div>}
            </div>
          </div>

          {branches.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0', color:'rgba(255,255,255,.3)', fontSize:12 }}>
              Sin sucursales adicionales. Si este restaurante abre otra ubicación, aparecerá aquí.
            </div>
          ) : <div style={{ marginTop:4, fontSize:11, fontWeight:700, color:'rgba(255,255,255,.35)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:8 }}>Sucursales adicionales</div>}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {branches.map(br => (
              <div key={br.id} style={{ padding:'16px 18px', borderRadius:12, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#f1f5f9', marginBottom:2 }}>{br.name}</div>
                    {br.manager_name && <div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>Gerente: {br.manager_name}</div>}
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, color:br.is_active?'#34d399':'#f87171', background:br.is_active?'rgba(52,211,153,.1)':'rgba(248,113,113,.1)', padding:'2px 8px', borderRadius:5 }}>
                    {br.is_active?'Activa':'Inactiva'}
                  </span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {br.address && (
                    <div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginBottom:2 }}>Dirección</div>
                      <div style={{ fontSize:12, color:'rgba(255,255,255,.65)' }}>{br.address}</div>
                    </div>
                  )}
                  {br.phone && (
                    <div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginBottom:2 }}>Teléfono</div>
                      <div style={{ fontSize:12, color:'rgba(255,255,255,.65)' }}>{br.phone}</div>
                    </div>
                  )}
                  {br.email && (
                    <div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginBottom:2 }}>Email</div>
                      <div style={{ fontSize:12, color:'#60a5fa' }}>{br.email}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Usuarios */}
      {activeTab === 'users' && (
        <div>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Usuarios registrados — {users.length}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Nombre','Rol','PIN','Estado','Acciones'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 8px', fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{u.full_name}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: u.app_role === 'admin' ? 'rgba(201,150,58,0.15)' : 'rgba(255,255,255,0.06)', color: u.app_role === 'admin' ? '#c9963a' : 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                        {u.app_role}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                      {showPins[u.id] ? u.pin.slice(0,8)+'…' : '••••'}
                      <button onClick={() => setShowPins(s => ({ ...s, [u.id]: !s[u.id] }))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 11, marginLeft: 4 }}>
                        {showPins[u.id] ? 'ocultar' : 'ver'}
                      </button>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: u.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: u.is_active ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                        {u.is_active ? 'activo' : 'inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', display: 'flex', gap: 6 }}>
                      <button onClick={() => { setPinModal(u); setNewPin(''); }} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'rgba(201,150,58,0.1)', border: '1px solid rgba(201,150,58,0.25)', color: '#c9963a', cursor: 'pointer' }}>
                        🔑 PIN
                      </button>
                      <button onClick={() => handleToggleUser(u)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer' }}>
                        {u.is_active ? 'Suspender' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add user */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>+ Nuevo usuario</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newUser.full_name} onChange={e => setNewUser(u => ({ ...u, full_name: e.target.value }))} placeholder="Nombre completo"
                  style={{ flex: 2, background: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', borderRadius: 8, padding: '8px 12px', fontSize: 13 }} />
                <select value={newUser.app_role} onChange={e => setNewUser(u => ({ ...u, app_role: e.target.value }))}
                  style={{ flex: 1, background: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
                  {['admin','gerente','cajero','mesero','cocinero','ayudante_cocina','repartidor'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input value={newUser.pin} onChange={e => setNewUser(u => ({ ...u, pin: e.target.value }))} placeholder="PIN (4+ dígitos)" maxLength={6}
                  style={{ flex: 1, background: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', borderRadius: 8, padding: '8px 12px', fontSize: 13 }} />
                <button onClick={handleAddUser} style={{ padding: '8px 16px', borderRadius: 8, background: '#c9963a', border: 'none', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Salud del cliente */}
      {activeTab === 'health' && (
        <div>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>Señales de salud</div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20, lineHeight: 1.6 }}>
              Indicadores proactivos para anticipar problemas y oportunidades antes de que el cliente lo pida.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {health.map((h, i) => {
                const c = h.status === 'ok' ? '#22c55e' : h.status === 'warn' ? '#f59e0b' : '#ef4444';
                const icon = h.status === 'ok' ? '✓' : h.status === 'warn' ? '⚠' : '✗';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10, background: `${c}08`, border: `1px solid ${c}25` }}>
                    <span style={{ fontSize: 18, color: c, flexShrink: 0 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{h.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{h.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick actions based on health */}
            {riskCount + warnCount > 0 && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>ACCIONES RECOMENDADAS</div>
                {health.some(h => h.status === 'risk' && h.label === 'Actividad') && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: '#f87171', fontWeight: 600, marginBottom: 4 }}>📞 Contactar al cliente</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Sin actividad reciente. Llamar para identificar bloqueos. Puede necesitar capacitación o tiene problemas técnicos.</div>
                  </div>
                )}
                {health.some(h => h.label === 'Trial' && h.status === 'warn') && (
                  <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, marginBottom: 4 }}>💰 Momento de conversión</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Trial próximo a vencer. Si está activo, es el momento ideal para ofrecer el plan. Si está inactivo, extender trial y re-enganchar primero.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Usage timeline */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Métricas de uso</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
              {[
                { label: 'Órdenes este mes', value: usage?.ordersThisMonth ?? '—', note: 'billing orders, excluye comandas' },
                { label: 'Órdenes total histórico', value: usage?.ordersTotal ?? '—', note: 'toda la vida del tenant' },
                { label: 'Días activos (últimos 14)', value: `${usage?.activeDaysLast14 ?? 0}/14`, note: 'días con al menos 1 orden' },
                { label: 'Última orden', value: usage?.lastOrderAt ? new Date(usage.lastOrderAt).toLocaleDateString('es-MX', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}) : 'Nunca', note: '' },
                { label: 'Sucursales', value: usage?.branchesCount ?? '—', note: '' },
                { label: 'Mesas configuradas', value: usage?.tablesCount ?? '—', note: '' },
              ].map(m => (
                <div key={m.label} style={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>{usage ? m.value : '—'}</div>
                  {m.note && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>{m.note}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Notas */}
      {activeTab === 'notes' && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>Notas internas del equipo Aldente</div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>Visible solo en SuperAdmin. Úsalo para documentar conversaciones, compromisos, contexto del cliente.</p>
          <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={12} placeholder="Ej: 2026-04-11 — Llamé a Carlos, está teniendo problemas para cargar el menú. Le mandé el tutorial. Trial extendido 7 días.&#10;&#10;2026-04-08 — Restaurante de alta rotación. Chef exige KDS sin delay. Monitorear latencia."
            style={{ width: '100%', background: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box', outline: 'none', marginBottom: 12 }} />
          <button onClick={handleSaveNote} disabled={savingNote}
            style={{ padding: '10px 24px', borderRadius: 8, background: '#c9963a', border: 'none', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {savingNote ? 'Guardando…' : 'Guardar nota'}
          </button>
        </div>
      )}

      {/* PIN Modal */}
      {pinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1a2535', border: '1px solid #2a3f5f', borderRadius: 16, padding: 28, width: 320 }}>
            <h3 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Cambiar PIN</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 16 }}>{pinModal.full_name}</p>
            <input value={newPin} onChange={e => setNewPin(e.target.value)} type="password" placeholder="Nuevo PIN (mín. 4 dígitos)"
              onKeyDown={e => e.key === 'Enter' && handlePinChange()}
              style={{ width: '100%', background: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', borderRadius: 8, padding: '10px 12px', fontSize: 15, marginBottom: 14, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setPinModal(null); setNewPin(''); }} style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handlePinChange} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#c9963a', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Guardar PIN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
