'use client';

/**
 * TermoWidget — verificador de membresía Termo para usar en el POS
 *
 * El cajero lo abre al cobrar, teclea el teléfono del cliente,
 * y ve al instante si tiene café gratis disponible hoy.
 * Un click en "Marcar café" registra el uso cross-sucursal.
 */
import React, { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';
import { toast } from 'sonner';
import { Coffee, Phone, Search, CheckCircle, XCircle, Clock, X } from 'lucide-react';

interface TermoMember {
  id: string;
  name: string;
  isActive: boolean;
  membershipExpiresAt: string | null;
  dailyBenefitUsedAt: string | null;
}

function isBenefitAvailableToday(usedAt: string | null): boolean {
  if (!usedAt) return true;
  const toMexDate = (d: Date) => {
    const local = new Date(d.getTime() + (-6 * 60) * 60000);
    return local.toISOString().slice(0, 10);
  };
  return toMexDate(new Date(usedAt)) < toMexDate(new Date());
}

function isExpired(expiresAt: string | null): boolean {
  return !!expiresAt && new Date(expiresAt) < new Date();
}

interface Props {
  onClose?: () => void;
}

export default function TermoWidget({ onClose }: Props) {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const inputRef = useRef<HTMLInputElement>(null);

  const [phone, setPhone]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [member, setMember]       = useState<TermoMember | null>(null);
  const [notFound, setNotFound]   = useState(false);
  const [marking, setMarking]     = useState(false);
  const [done, setDone]           = useState(false);

  const handleSearch = useCallback(async (tel?: string) => {
    const q = (tel ?? phone).replace(/\D/g, '');
    if (q.length < 10) return;
    setLoading(true);
    setMember(null);
    setNotFound(false);
    setDone(false);

    const { data } = await supabase
      .from('loyalty_customers')
      .select('id,name,is_active,membership_expires_at,daily_benefit_used_at')
      .eq('tenant_id', getTenantId())
      .in('membership_type', ['termo', 'membresia'])
      .ilike('phone', `%${q}%`)
      .limit(1)
      .single();

    setLoading(false);

    if (!data) { setNotFound(true); return; }
    setMember({
      id: data.id, name: data.name, isActive: data.is_active,
      membershipExpiresAt: data.membership_expires_at ?? null,
      dailyBenefitUsedAt: data.daily_benefit_used_at ?? null,
    });
  }, [phone, supabase]);

  const handleMark = useCallback(async () => {
    if (!member) return;
    setMarking(true);

    const { data } = await supabase.rpc('loyalty_use_daily_benefit', {
      p_customer_id:   member.id,
      p_branch_id:     activeBranchId ?? null,
      p_registered_by: 'POS',
      p_benefit_type:  'cafe_gratis',
    });

    setMarking(false);

    if (!data?.ok) {
      toast.error(data?.error ?? 'Error al registrar');
      return;
    }

    setDone(true);
    setMember(prev => prev ? { ...prev, dailyBenefitUsedAt: new Date().toISOString() } : null);
    toast.success('☕ Café gratis registrado');
  }, [member, supabase, activeBranchId]);

  const active  = member?.isActive && !isExpired(member.membershipExpiresAt);
  const avail   = member ? isBenefitAvailableToday(member.dailyBenefitUsedAt) : false;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden w-full max-w-sm">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-amber-600">
        <div className="flex items-center gap-2">
          <Coffee size={18} className="text-white" />
          <span className="font-semibold text-white text-sm">Verificar socio Termo</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-amber-200 hover:text-white transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">

        {/* Búsqueda */}
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1.5 flex items-center gap-1">
            <Phone size={12} /> Número de celular
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="5512345678"
              value={phone}
              maxLength={10}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPhone(v);
                setMember(null);
                setNotFound(false);
                setDone(false);
                if (v.length === 10) handleSearch(v);
              }}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              autoFocus
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || phone.length < 10}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg transition-colors"
            >
              <Search size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Se busca automáticamente al ingresar 10 dígitos</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-4 text-sm text-gray-400">Buscando...</div>
        )}

        {/* No encontrado */}
        {notFound && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
            <XCircle size={18} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">Número no registrado como socio Termo</p>
          </div>
        )}

        {/* Resultado */}
        {member && (
          <div className="space-y-3">

            {/* Nombre y estado */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm ${active ? 'bg-green-600' : 'bg-gray-400'}`}>
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{member.name}</p>
                  <p className="text-xs text-gray-400">
                    {member.membershipExpiresAt
                      ? `Vence ${new Date(member.membershipExpiresAt).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}`
                      : 'Sin fecha de vencimiento'}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                       : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              }`}>
                {active ? 'Activo' : isExpired(member.membershipExpiresAt) ? 'Vencido' : 'Inactivo'}
              </span>
            </div>

            {/* Beneficio del día */}
            {!active ? (
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <XCircle size={16} className="text-gray-400" />
                <p className="text-sm text-gray-500">Membresía no activa — sin beneficio</p>
              </div>
            ) : done ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <CheckCircle size={22} className="text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-green-800 dark:text-green-300">¡Café registrado!</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Beneficio del día utilizado</p>
                </div>
              </div>
            ) : avail ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Coffee size={18} className="text-amber-700 dark:text-amber-400" />
                  <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">Café gratis disponible hoy</p>
                </div>
                <button
                  onClick={handleMark}
                  disabled={marking}
                  className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  {marking ? 'Registrando...' : 'Marcar café como entregado'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <Clock size={20} className="text-gray-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">Ya usó su café hoy</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    A las {new Date(member.dailyBenefitUsedAt!).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}
                    {' '}· Disponible mañana
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
