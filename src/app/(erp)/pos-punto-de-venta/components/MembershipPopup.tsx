'use client';

/**
 * MembershipPopup — popup que aparece en el POS cuando se vende
 * el producto configurado como trigger de membresía.
 *
 * Maneja 5 escenarios sin asumir nada sobre el producto:
 * A — Cliente nuevo quiere membresía
 * B — Cliente ya tiene membresía (activa o vencida)
 * C — Cliente no quiere membresía
 * D/E — Gestionados desde el módulo de Lealtad directamente
 */
import { useState, useCallback } from 'react';
import { Users, Phone, Search, CheckCircle, XCircle, X, ChevronRight } from 'lucide-react';
import type { ExistingMember, TriggerScenario, MembershipCandidate } from '@/hooks/useMembershipTrigger';

interface Props {
  benefitLabel:    string;
  durationMonths:  number;
  existingMember:  ExistingMember | null;
  scenario:        TriggerScenario;
  searching:       boolean;
  registering:     boolean;
  onPhoneSearch:   (phone: string) => Promise<void>;
  onRegisterNew:   (candidate: MembershipCandidate) => Promise<void>;
  onRenewExisting: (id: string) => Promise<void>;
  onSkip:          () => void;
  onDismiss:       () => void;
}

export default function MembershipPopup({
  benefitLabel, durationMonths,
  existingMember, scenario, searching, registering,
  onPhoneSearch, onRegisterNew, onRenewExisting, onSkip, onDismiss,
}: Props) {
  const [phone, setPhone] = useState('');
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');

  const handlePhoneChange = useCallback((v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 10);
    setPhone(clean);
    if (clean.length === 10) onPhoneSearch(clean);
  }, [onPhoneSearch]);

  const handleRegister = () => {
    onRegisterNew({ phone, name, email });
  };

  const inp = "w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onDismiss(); }}>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-amber-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-white" />
            <div>
              <p className="font-semibold text-white text-sm">Este producto incluye membresía</p>
              <p className="text-amber-200 text-xs mt-0.5">
                Beneficio: {benefitLabel}
                {durationMonths > 0 ? ` · ${durationMonths} meses` : ''}
              </p>
            </div>
          </div>
          <button onClick={onDismiss} className="text-amber-200 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Paso 1 — Buscar por teléfono (siempre visible hasta confirmar) */}
          {!scenario && (
            <>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                ¿El cliente quiere registrar su membresía?
              </p>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
                  <Phone size={11} className="inline mr-1" /> Teléfono del cliente
                </label>
                <div className="flex gap-2">
                  <input
                    className={inp}
                    placeholder="10 dígitos — busca automáticamente"
                    value={phone}
                    maxLength={10}
                    onChange={e => handlePhoneChange(e.target.value)}
                    autoFocus
                  />
                  {searching && (
                    <div className="flex items-center px-3 text-xs text-gray-500 dark:text-gray-400">
                      Buscando...
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Se busca automáticamente al ingresar 10 dígitos
                </p>
              </div>

              <button
                onClick={onSkip}
                className="w-full py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                No registrar membresía — continuar con la venta
              </button>
            </>
          )}

          {/* Escenario A — Cliente nuevo */}
          {scenario === 'new_member' && (
            <>
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <CheckCircle size={16} className="text-green-600" />
                <p className="text-sm text-green-800 dark:text-green-300">
                  Número no registrado — completar datos para activar la membresía
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">Nombre completo *</label>
                  <input className={inp} placeholder="Ana García" value={name}
                    onChange={e => setName(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">Teléfono</label>
                  <input className={inp} value={phone} readOnly />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">Email (opcional)</label>
                  <input className={inp} placeholder="ana@correo.com" value={email}
                    onChange={e => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={onSkip}
                  className="flex-1 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition-colors">
                  Omitir
                </button>
                <button onClick={handleRegister} disabled={!name.trim() || registering}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors">
                  {registering ? 'Registrando...' : 'Activar membresía'}
                </button>
              </div>
            </>
          )}

          {/* Escenario B — Ya tiene membresía */}
          {scenario === 'existing_active' && existingMember && (
            <>
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {existingMember.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm">{existingMember.name}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                    {existingMember.isActive && existingMember.membershipExpiresAt
                      ? `Membresía activa hasta ${new Date(existingMember.membershipExpiresAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`
                      : existingMember.isActive
                      ? 'Membresía activa sin vencimiento'
                      : 'Membresía vencida'}
                  </p>
                </div>
                {existingMember.isActive
                  ? <CheckCircle size={18} className="text-blue-600 flex-shrink-0 ml-auto" />
                  : <XCircle size={18} className="text-red-500 flex-shrink-0 ml-auto" />}
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300">¿Qué deseas hacer?</p>

              <div className="space-y-2">
                <button onClick={() => onRenewExisting(existingMember.id)} disabled={registering}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50">
                  <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    {registering ? 'Renovando...' : `Renovar membresía +${durationMonths || 12} meses`}
                  </span>
                  <ChevronRight size={16} className="text-amber-600" />
                </button>

                <button onClick={onSkip}
                  className="w-full py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Solo vender el producto — no modificar membresía
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
