'use client';

import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import React, { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Search, Coffee, UserPlus, CheckCircle, XCircle, Clock, Phone, Calendar, AlertCircle } from 'lucide-react';
import { useBranch } from '@/hooks/useBranch';
import { useLoyaltyConfig } from '@/hooks/useLoyaltyConfig';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TermoMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  isActive: boolean;
  membershipType: 'puntos' | 'termo';
  membershipExpiresAt: string | null;
  createdAt: string;
  dailyBenefitUsedAt: string | null;
  dailyBenefitUsedBranchId: string | null;
}

interface NewMemberForm {
  name: string;
  phone: string;
  email: string;
  birthday: string;
}

const EMPTY_FORM: NewMemberForm = { name: '', phone: '', email: '', birthday: '' };

// ── Helpers ───────────────────────────────────────────────────────────────────
function isBenefitAvailableToday(usedAt: string | null): boolean {
  if (!usedAt) return true;
  const usedDate = new Date(usedAt);
  const today = new Date();
  // Comparar por fecha en CDMX (UTC-6)
  const toMexDate = (d: Date) => {
    const offset = -6 * 60; // CDMX UTC-6 (simplificado, sin horario de verano)
    const local = new Date(d.getTime() + offset * 60000);
    return local.toISOString().slice(0, 10);
  };
  return toMexDate(usedDate) < toMexDate(today);
}

function memberStatus(m: TermoMember): 'activo' | 'vencido' | 'inactivo' {
  if (!m.isActive) return 'inactivo';
  if (m.membershipExpiresAt && new Date(m.membershipExpiresAt) < new Date()) return 'vencido';
  return 'activo';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function TermoMembership() {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const { config } = useLoyaltyConfig();   // leer duración y tier desde la config

  const [phoneSearch, setPhoneSearch] = useState('');
  const [searching, setSearching]     = useState(false);
  const [member, setMember]           = useState<TermoMember | null>(null);
  const [notFound, setNotFound]       = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm]         = useState<NewMemberForm>(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [usingBenefit, setUsingBenefit] = useState(false);

  // ── Buscar por teléfono ─────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const phone = phoneSearch.trim().replace(/\D/g, '');
    if (phone.length < 10) { toast.error('Ingresa un número de 10 dígitos'); return; }

    setSearching(true);
    setMember(null);
    setNotFound(false);

    const { data, error } = await supabase
      .from('loyalty_customers')
      .select('*')
      .eq('tenant_id', getTenantId())
      .in('membership_type', ['termo', 'membresia'])   // cualquier tipo de membresía
      .ilike('phone', `%${phone}%`)
      .limit(1)
      .single();

    setSearching(false);

    if (error || !data) {
      setNotFound(true);
      return;
    }

    setMember({
      id:                         data.id,
      name:                       data.name,
      phone:                      data.phone,
      email:                      data.email ?? '',
      isActive:                   data.is_active,
      membershipType:             data.membership_type,
      membershipExpiresAt:        data.membership_expires_at ?? null,
      createdAt:                  data.created_at,
      dailyBenefitUsedAt:         data.daily_benefit_used_at ?? null,
      dailyBenefitUsedBranchId:   data.daily_benefit_used_branch_id ?? null,
    });
  }, [phoneSearch, supabase]);

  // ── Registrar nuevo socio ───────────────────────────────────────────────────
  const handleRegister = useCallback(async () => {
    if (!newForm.name.trim()) { toast.error('El nombre es requerido'); return; }
    if (newForm.phone.replace(/\D/g,'').length < 10) { toast.error('Teléfono de 10 dígitos requerido'); return; }

    setSaving(true);

    // Calcular fecha de vencimiento desde la configuración
    const months = config.membership.durationMonths || 12;
    const expires = new Date();
    if (months > 0) expires.setMonth(expires.getMonth() + months);

    const { error } = await supabase.from('loyalty_customers').insert({
      tenant_id:             getTenantId(),
      name:                  newForm.name.trim(),
      phone:                 newForm.phone.replace(/\D/g,''),
      email:                 newForm.email.trim(),
      membership_type:       'membresia',
      is_active:             true,
      membership_expires_at: months > 0 ? expires.toISOString() : null,
      birthday:              newForm.birthday || null,
      points:                0,
      total_spent:           0,
      total_visits:          0,
    });

    setSaving(false);

    if (error) { toast.error('Error al registrar: ' + error.message); return; }

    toast.success(`¡${newForm.name} registrado como socio Termo!`);
    setShowNewForm(false);
    setNewForm(EMPTY_FORM);
    // Buscar automáticamente al nuevo socio
    setPhoneSearch(newForm.phone.replace(/\D/g,''));
    setTimeout(handleSearch, 300);
  }, [newForm, supabase, handleSearch]);

  // ── Marcar café del día como usado ─────────────────────────────────────────
  const handleUseBenefit = useCallback(async () => {
    if (!member) return;
    setUsingBenefit(true);

    const { data, error } = await supabase.rpc('loyalty_use_daily_benefit', {
      p_customer_id:    member.id,
      p_branch_id:      activeBranchId ?? null,
      p_registered_by:  'Caja',
      p_benefit_type:   'cafe_gratis',
    });

    setUsingBenefit(false);

    if (error) { toast.error('Error: ' + error.message); return; }

    if (!data.ok) {
      toast.error(data.error);
      return;
    }

    toast.success('☕ Café del día registrado');
    // Actualizar estado local
    setMember(prev => prev ? {
      ...prev,
      dailyBenefitUsedAt: new Date().toISOString(),
      dailyBenefitUsedBranchId: activeBranchId ?? null,
    } : null);
  }, [member, supabase, activeBranchId]);

  // ── Renovar membresía ───────────────────────────────────────────────────────
  const handleRenew = useCallback(async (months: number) => {
    if (!member) return;

    const base = member.membershipExpiresAt && new Date(member.membershipExpiresAt) > new Date()
      ? new Date(member.membershipExpiresAt)
      : new Date();
    base.setMonth(base.getMonth() + months);

    const { error } = await supabase.from('loyalty_customers').update({
      is_active:             true,
      membership_expires_at: base.toISOString(),
      updated_at:            new Date().toISOString(),
    }).eq('id', member.id);

    if (error) { toast.error('Error al renovar'); return; }

    toast.success(`Membresía renovada por ${months} meses`);
    setMember(prev => prev ? { ...prev, isActive: true, membershipExpiresAt: base.toISOString() } : null);
  }, [member, supabase]);

  const status = member ? memberStatus(member) : null;
  const benefitAvailable = member ? isBenefitAvailableToday(member.dailyBenefitUsedAt) : false;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Coffee size={22} className="text-amber-600" />
            Membresía Termo
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Precio preferencial + un café gratis por día en cualquier sucursal
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <UserPlus size={16} />
          Nuevo socio
        </button>
      </div>

      {/* Formulario de nuevo socio */}
      {showNewForm && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
          <h3 className="font-semibold text-amber-800 font-bold mb-4">Registrar nuevo socio Termo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-800 dark:text-gray-200 font-semibold block mb-1">Nombre completo *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Ana García López"
                value={newForm.name}
                onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-800 dark:text-gray-200 font-semibold block mb-1">Teléfono (10 dígitos) *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="5512345678"
                value={newForm.phone}
                onChange={e => setNewForm(f => ({ ...f, phone: e.target.value.replace(/\D/g,'').slice(0,10) }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-800 dark:text-gray-200 font-semibold block mb-1">Email (opcional)</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="ana@correo.com"
                value={newForm.email}
                onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-800 dark:text-gray-200 font-semibold block mb-1">Fecha de nacimiento (opcional)</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={newForm.birthday}
                onChange={e => setNewForm(f => ({ ...f, birthday: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">Para el beneficio de cumpleaños — el sistema avisa al cajero ese día</p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleRegister}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? 'Registrando...' : 'Registrar socio'}
            </button>
            <button
              onClick={() => { setShowNewForm(false); setNewForm(EMPTY_FORM); }}
              className="border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Búsqueda por teléfono */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5">
        <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Phone size={16} />
          Verificar socio por teléfono
        </h3>
        <div className="flex gap-3">
          <input
            className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-gray-800"
            placeholder="Número de celular (10 dígitos)"
            value={phoneSearch}
            onChange={e => setPhoneSearch(e.target.value.replace(/\D/g,'').slice(0,10))}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={searching || phoneSearch.length < 10}
            className="flex items-center gap-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors hover:bg-gray-700 dark:hover:bg-gray-100"
          >
            <Search size={16} />
            {searching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* No encontrado */}
        {notFound && (
          <div className="mt-4 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Socio no encontrado</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                El número {phoneSearch} no está registrado como socio Termo.
              </p>
            </div>
            <button
              onClick={() => { setShowNewForm(true); setNewForm(f => ({ ...f, phone: phoneSearch })); }}
              className="ml-auto text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
            >
              Registrarlo
            </button>
          </div>
        )}
      </div>

      {/* Tarjeta del socio encontrado */}
      {member && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">

          {/* Header con estado */}
          <div className={`px-5 py-4 flex items-center justify-between ${
            status === 'activo'   ? 'bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800' :
            status === 'vencido'  ? 'bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800' :
                                    'bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white text-base ${
                status === 'activo' ? 'bg-green-600' : status === 'vencido' ? 'bg-red-500' : 'bg-gray-400'
              }`}>
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{member.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{member.phone}</p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
              status === 'activo'  ? 'bg-green-600 text-white' :
              status === 'vencido' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                     'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {status === 'activo'  && <CheckCircle size={14} />}
              {status === 'vencido' && <XCircle size={14} />}
              {status === 'inactivo'&& <XCircle size={14} />}
              {status === 'activo' ? 'Activo' : status === 'vencido' ? 'Vencido' : 'Inactivo'}
            </div>
          </div>

          {/* Info del socio */}
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Miembro desde</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                {formatDate(member.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Vence el</p>
              <p className={`text-sm font-medium mt-0.5 ${
                status === 'vencido' ? 'text-red-600' :
                (member.membershipExpiresAt && Math.ceil((new Date(member.membershipExpiresAt).getTime() - Date.now()) / 86400000) <= 30)
                  ? 'text-amber-600' : 'text-gray-900 dark:text-white'
              }`}>
                {formatDate(member.membershipExpiresAt)}
                {member.membershipExpiresAt && (() => {
                  const days = Math.ceil((new Date(member.membershipExpiresAt).getTime() - Date.now()) / 86400000);
                  if (days > 0 && days <= 30) return ` ⚠️ (${days} días)`;
                  return null;
                })()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Email</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                {member.email || '—'}
              </p>
            </div>
          </div>

          {/* BENEFICIO DEL DÍA — el más importante */}
          <div className="px-5 py-5">
            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
              Café gratis del día
            </h4>

            {status !== 'activo' ? (
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <XCircle size={24} className="text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No disponible</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">La membresía no está activa.</p>
                </div>
              </div>
            ) : benefitAvailable ? (
              <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Coffee size={24} className="text-amber-700 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">¡Disponible hoy!</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    {member.dailyBenefitUsedAt
                      ? `Último uso: ${formatDate(member.dailyBenefitUsedAt)}`
                      : 'Nunca ha usado el beneficio del día'}
                  </p>
                </div>
                <button
                  onClick={handleUseBenefit}
                  disabled={usingBenefit}
                  className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
                >
                  {usingBenefit ? 'Registrando...' : 'Marcar café'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock size={24} className="text-gray-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-300">Ya utilizado hoy</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Usado a las {member.dailyBenefitUsedAt
                      ? new Date(member.dailyBenefitUsedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                    {' '}· Disponible mañana
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Acciones — renovar membresía */}
          {status !== 'activo' && (
            <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Renovar membresía:</p>
              <div className="flex gap-2 flex-wrap">
                {[3, 6, 12].map(m => (
                  <button
                    key={m}
                    onClick={() => handleRenew(m)}
                    className="border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    +{m} meses
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
