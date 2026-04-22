'use client';

/**
 * LoyaltyHub — Programa de lealtad unificado
 *
 * Un solo flujo para el cajero:
 *   1. Busca al cliente por teléfono
 *   2. Ve su estado (puntos / visitas / membresía activa)
 *   3. Registra la visita o usa el beneficio
 *
 * El dueño configura en /configuracion qué modo usa el programa:
 *   - Puntos: acumula puntos por compras, los canjea
 *   - Visitas: cada visita cuenta, a X visitas gana recompensa
 *   - Membresía: beneficios fijos por visita (café, descuento, etc.)
 */

import React, { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useAuth } from '@/contexts/AuthContext';
import { useLoyaltyConfig } from '@/hooks/useLoyaltyConfig';
import { toast } from 'sonner';
import {
  Search, Phone, CheckCircle, XCircle, Clock,
  Star, UserPlus, Trash2, RotateCcw, X, Calendar,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  membershipType: string;
  isActive: boolean;
  points: number;
  totalVisits: number;
  totalSpent: number;
  membershipExpiresAt: string | null;
  dailyBenefitUsedAt: string | null;
  birthday: string | null;
  tierId: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isBenefitAvailableToday(usedAt: string | null): boolean {
  if (!usedAt) return true;
  const toMex = (d: Date) => new Date(d.getTime() - 6 * 3600000).toISOString().slice(0, 10);
  return toMex(new Date(usedAt)) < toMex(new Date());
}
function isBirthdayToday(bday: string | null): boolean {
  if (!bday) return false;
  const b = new Date(bday), t = new Date();
  return b.getMonth() === t.getMonth() && b.getDate() === t.getDate();
}
function isExpired(expiresAt: string | null): boolean {
  return !!expiresAt && new Date(expiresAt) < new Date();
}
function daysUntil(iso: string | null): number {
  if (!iso) return 9999;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function LoyaltyHub() {
  const supabase = createClient();
  const { appUser } = useAuth();
  const { config } = useLoyaltyConfig(appUser?.tenantId);
  const canDelete = ['admin', 'gerente', 'superadmin'].includes(appUser?.appRole ?? '');

  const [phone, setPhone]           = useState('');
  const [searching, setSearching]   = useState(false);
  const [customer, setCustomer]     = useState<Customer | null>(null);
  const [notFound, setNotFound]     = useState(false);

  // Registro de nuevo cliente
  const [showNewForm, setShowNewForm]     = useState(false);
  const [newName, setNewName]             = useState('');
  const [newEmail, setNewEmail]           = useState('');
  const [newBirthday, setNewBirthday]     = useState('');
  const [saving, setSaving]               = useState(false);

  // Eliminación
  const [showDelete, setShowDelete]       = useState(false);
  const [deleteReason, setDeleteReason]   = useState('');
  const [deleting, setDeleting]           = useState(false);

  const phoneRef = useRef<HTMLInputElement>(null);

  // mode: en el futuro vendrá de config.mode; por ahora inferido
  const mode: 'puntos' | 'membresia' | 'visitas' =
    config.membership.enabled ? 'membresia' : 'puntos';
  const visitsGoal = 10; // configurable en /configuracion → Programa de lealtad
  const mem         = config.membership;

  // ── Buscar cliente ──────────────────────────────────────────────────────────
  const search = useCallback(async (tel: string) => {
    const q = tel.replace(/\D/g, '');
    if (q.length < 10) return;
    setSearching(true);
    setCustomer(null);
    setNotFound(false);
    setShowNewForm(false);

    const { data } = await supabase
      .from('loyalty_customers')
      .select('id,name,phone,email,membership_type,is_active,points,total_visits,total_spent,membership_expires_at,daily_benefit_used_at,birthday,tier_id')
      .eq('tenant_id', getTenantId())
      .ilike('phone', `%${q}%`)
      .limit(1)
      .single();

    setSearching(false);

    if (!data) {
      setNotFound(true);
      setShowNewForm(true);
      setNewName(''); setNewEmail(''); setNewBirthday('');
      return;
    }

    setCustomer({
      id: data.id, name: data.name, phone: data.phone ?? '',
      email: data.email ?? '', membershipType: data.membership_type,
      isActive: data.is_active,
      points: Number(data.points ?? 0),
      totalVisits: Number(data.total_visits ?? 0),
      totalSpent: Number(data.total_spent ?? 0),
      membershipExpiresAt: data.membership_expires_at ?? null,
      dailyBenefitUsedAt: data.daily_benefit_used_at ?? null,
      birthday: (data as any).birthday ?? null,
      tierId: (data as any).tier_id ?? null,
    });
  }, [supabase]);

  const handlePhoneChange = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 10);
    setPhone(clean);
    if (clean.length < 10) { setCustomer(null); setNotFound(false); setShowNewForm(false); }
    if (clean.length === 10) search(clean);
  };

  const reset = () => {
    setPhone(''); setCustomer(null); setNotFound(false);
    setShowNewForm(false); setShowDelete(false); setDeleteReason('');
    phoneRef.current?.focus();
  };

  // ── Registrar nuevo cliente ─────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!newName.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    const months = mem.durationMonths || 12;
    const expires = mem.enabled && months > 0
      ? (() => { const d = new Date(); d.setMonth(d.getMonth() + months); return d.toISOString(); })()
      : null;

    const { data, error } = await supabase.from('loyalty_customers').insert({
      tenant_id: getTenantId(),
      name: newName.trim(),
      phone: phone.replace(/\D/g, ''),
      email: newEmail.trim() || null,
      birthday: newBirthday || null,
      membership_type: mem.enabled ? 'membresia' : 'puntos',
      is_active: true,
      membership_expires_at: expires,
      points: 0, total_visits: 0, total_spent: 0,
    }).select().single();

    setSaving(false);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success(`⭐ ${newName.trim()} registrado`);
    setShowNewForm(false);
    search(phone);
  };

  // ── Registrar visita ────────────────────────────────────────────────────────
  const handleVisit = async () => {
    if (!customer) return;
    setSaving(true);
    await supabase.from('loyalty_customers').update({
      total_visits: customer.totalVisits + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', customer.id);
    setSaving(false);
    toast.success(`Visita registrada — ${customer.totalVisits + 1} en total`);
    setCustomer(c => c ? { ...c, totalVisits: c.totalVisits + 1 } : null);
  };

  // ── Marcar beneficio diario ─────────────────────────────────────────────────
  const handleBenefit = async () => {
    if (!customer) return;
    setSaving(true);
    const { data } = await supabase.rpc('loyalty_use_daily_benefit', {
      p_customer_id: customer.id,
      p_branch_id: appUser?.branchId ?? null,
      p_registered_by: appUser?.fullName ?? 'Admin',
      p_benefit_type: 'beneficio_diario',
    });
    setSaving(false);
    if (!data?.ok) { toast.error(data?.error ?? 'Error al marcar el beneficio'); return; }
    toast.success(`✅ Beneficio marcado — ${mem.freeProductLabel || 'Beneficio del día'}`);
    setCustomer(c => c ? { ...c, dailyBenefitUsedAt: new Date().toISOString() } : null);
  };

  // ── Eliminar cliente ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!customer || !deleteReason.trim()) return;
    setDeleting(true);
    await supabase.from('audit_log').insert({
      tenant_id: getTenantId(),
      user_id: appUser?.id ?? null,
      user_name: appUser?.fullName ?? 'Admin',
      action: 'deleted', entity: 'loyalty_customers',
      entity_id: customer.id, entity_name: customer.name,
      old_value: { phone: customer.phone, points: customer.points, visits: customer.totalVisits },
      details: `Razón: ${deleteReason} | Por: ${appUser?.fullName} (${appUser?.appRole})`,
    });
    const { error } = await supabase.from('loyalty_customers').delete().eq('id', customer.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${customer.name} eliminado del programa`);
    reset();
  };

  // ── Estado derivado ─────────────────────────────────────────────────────────
  const active   = customer?.isActive && !isExpired(customer.membershipExpiresAt ?? null);
  const benefitOk = customer ? isBenefitAvailableToday(customer.dailyBenefitUsedAt) : false;
  const isBday   = customer ? isBirthdayToday(customer.birthday) : false;
  const expDays  = customer ? daysUntil(customer.membershipExpiresAt) : 9999;
  const visitsLeft = customer ? Math.max(0, visitsGoal - customer.totalVisits) : visitsGoal;

  // ── Estilos ─────────────────────────────────────────────────────────────────
  const card  = 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl';
  const inp   = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400';
  const btnPrimary = 'flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-[#1B3A6B] transition-colors disabled:opacity-50';
  const btnGhost   = 'flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors';

  return (
    <div className="max-w-lg mx-auto space-y-4 p-4">

      {/* ── Buscador ── */}
      <div className={`${card} p-5`}>
        <div className="flex items-center gap-2 mb-1">
          <Phone size={15} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Buscar por teléfono</span>
        </div>
        <div className="relative">
          <input
            ref={phoneRef}
            type="tel" inputMode="numeric"
            className={inp + ' pr-10'}
            placeholder="10 dígitos — busca automáticamente"
            value={phone} maxLength={10}
            onChange={e => handlePhoneChange(e.target.value)}
            autoFocus
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">buscando...</span>
          )}
          {(customer || notFound) && !searching && (
            <button onClick={reset} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── No encontrado + formulario de registro ── */}
      {notFound && showNewForm && (
        <div className={`${card} p-5 space-y-4`}>
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-amber-500" />
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Número nuevo — ¿registrar al cliente?</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Nombre completo *</label>
              <input className={inp} placeholder="Ana García López" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Email (opcional)</label>
                <input className={inp} type="email" placeholder="ana@correo.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  <Calendar size={10} className="inline mr-1" />
                  Cumpleaños (opcional)
                </label>
                <input className={inp} type="date" value={newBirthday} onChange={e => setNewBirthday(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setShowNewForm(false); setNotFound(false); reset(); }} className={btnGhost}>
              Cancelar
            </button>
            <button onClick={handleRegister} disabled={saving || !newName.trim()} className={btnPrimary}>
              {saving ? 'Registrando...' : '⭐ Registrar cliente'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tarjeta del cliente encontrado ── */}
      {customer && (
        <div className={`${card} overflow-hidden`}>

          {/* Header */}
          <div className={`px-5 py-4 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800 ${isBday ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}>
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 ${active ? 'bg-amber-500' : 'bg-gray-400'}`}>
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{customer.name}</p>
                {isBday && <span className="text-xs bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 px-2 py-0.5 rounded-full font-semibold">🎂 ¡Hoy es su cumpleaños!</span>}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{customer.phone}</p>
            </div>
            <div className="flex-shrink-0">
              {active
                ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-2.5 py-1 rounded-full"><CheckCircle size={11} /> Activo</span>
                : <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-2.5 py-1 rounded-full"><XCircle size={11} /> Inactivo</span>}
            </div>
          </div>

          {/* Estado del programa */}
          <div className="px-5 py-4 space-y-3">

            {/* MODO PUNTOS */}
            {(mode === 'puntos' || config.points.enabled) && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <Star size={16} className="text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {customer.points.toLocaleString()} puntos
                  </p>
                  <p className="text-xs text-gray-500">
                    Vale ${(customer.points * config.points.pointValue).toFixed(2)} · {customer.totalVisits} visitas
                  </p>
                </div>
              </div>
            )}

            {/* MODO VISITAS — pendiente de implementar */}
            {(mode as string) === 'visitas' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    🎯 {customer.totalVisits} de {visitsGoal} visitas
                  </p>
                  {visitsLeft === 0
                    ? <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">¡Premio disponible!</span>
                    : <span className="text-xs text-gray-500">Faltan {visitsLeft}</span>}
                </div>
                {/* Barra de progreso */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (customer.totalVisits / visitsGoal) * 100)}%` }} />
                </div>
              </div>
            )}

            {/* MODO MEMBRESÍA — beneficios */}
            {mem.enabled && active && (
              <div className="space-y-2">
                {mem.freeProductEnabled && (
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${benefitOk ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                    <span className="text-lg">{benefitOk ? '☕' : '⏱'}</span>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${benefitOk ? 'text-green-700 dark:text-green-400' : 'text-gray-500'}`}>
                        {mem.freeProductLabel || 'Beneficio del día'}
                      </p>
                      <p className="text-xs text-gray-400">{benefitOk ? 'Disponible hoy' : 'Ya usado hoy'}</p>
                    </div>
                    {benefitOk && (
                      <button onClick={handleBenefit} disabled={saving}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors">
                        Marcar
                      </button>
                    )}
                  </div>
                )}
                {mem.discountEnabled && mem.discountPct > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <span className="text-lg">💚</span>
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">{mem.discountPct}% descuento {mem.discountAuto ? '(automático)' : ''}</p>
                  </div>
                )}
                {mem.priceTagEnabled && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <span className="text-lg">🏷️</span>
                    <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">{mem.priceTagLabel || 'Precio especial de socio'}</p>
                  </div>
                )}
              </div>
            )}

            {/* Vencimiento */}
            {customer.membershipExpiresAt && (
              <div className={`flex items-center gap-2 text-xs ${expDays <= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'}`}>
                <Clock size={12} />
                {isExpired(customer.membershipExpiresAt)
                  ? 'Membresía vencida'
                  : `Vence: ${new Date(customer.membershipExpiresAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}${expDays <= 30 ? ` ⚠️ (${expDays} días)` : ''}`}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="px-5 pb-5 flex flex-wrap gap-2">
            <button onClick={handleVisit} disabled={saving} className={btnPrimary}>
              <RotateCcw size={14} /> Registrar visita
            </button>
            {canDelete && (
              <button onClick={() => setShowDelete(true)} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto">
                <Trash2 size={13} /> Eliminar
              </button>
            )}
          </div>

          {/* Modal eliminación */}
          {showDelete && (
            <div className="mx-5 mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl space-y-3">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">¿Eliminar a {customer.name}?</p>
              <p className="text-xs text-red-600 dark:text-red-400">Acción permanente. Queda registrado en la auditoría.</p>
              <div>
                <label className="text-xs font-semibold text-red-700 dark:text-red-400 block mb-1">Razón *</label>
                <input className="w-full border border-red-300 dark:border-red-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-red-900/10 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-red-400"
                  placeholder="Ej: Registro duplicado, solicitud del cliente..."
                  value={deleteReason} onChange={e => setDeleteReason(e.target.value)} autoFocus />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowDelete(false); setDeleteReason(''); }} className={btnGhost + ' flex-1 text-xs py-2'}>Cancelar</button>
                <button onClick={handleDelete} disabled={deleting || !deleteReason.trim()}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-40">
                  {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
