'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Star, Users, Gift, ChevronRight, ChevronLeft, Check, Info } from 'lucide-react';
import {
  useLoyaltyConfig, FullLoyaltyConfig,
  MembershipTrigger,
  describeTrigger,
} from '@/hooks/useLoyaltyConfig';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ── Componentes auxiliares ────────────────────────────────────────────────────

const Toggle = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <div
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-amber-600' : 'bg-gray-200 dark:bg-gray-700'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </div>
    <span className="text-sm text-gray-300">{label}</span>
  </label>
);

const Tip = ({ text }: { text: string }) => (
  <div className="flex gap-2 p-3 bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg mt-3">
    <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
    <p className="text-xs text-blue-300">{text}</p>
  </div>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

// ── Componente principal ──────────────────────────────────────────────────────

export default function LoyaltyConfig() {
  const { appUser } = useAuth();
  const { config, loading, saving, save } = useLoyaltyConfig(appUser?.tenantId);
  const [draft, setDraft] = useState<FullLoyaltyConfig | null>(null);
  const [dishes, setDishes] = useState<Array<{ id: string; name: string; price: number; group: string }>>([]);
  const [step, setStep] = useState<'overview' | 'points' | 'membership' | 'benefit'>('overview');

  const supabase = createClient();

  useEffect(() => {
    if (!loading && !draft) setDraft(config);
  }, [loading, config, draft]);

  // Cargar platillos Y extras usando el tenantId del usuario autenticado
  useEffect(() => {
    const tid = appUser?.tenantId;
    if (!tid) return;
    Promise.all([
      supabase.from('dishes').select('id,name,price')
        .eq('tenant_id', tid).eq('available', true).order('name'),
      supabase.from('extras_catalog').select('id,name,price')
        .eq('tenant_id', tid).eq('is_active', true).order('name'),
    ]).then(([dishRes, extraRes]) => {
      const all = [
        ...(dishRes.data ?? []).map(d => ({ id: d.id, name: d.name, price: Number(d.price), group: 'Platillos del menú' })),
        ...(extraRes.data ?? []).map(e => ({ id: e.id, name: e.name, price: Number(e.price), group: 'Tienda de extras' })),
      ];
      setDishes(all);
    });
  }, [supabase, appUser?.tenantId]);

  if (loading || !draft) return (
    <div className="text-center py-12 text-sm text-gray-400">Cargando configuración...</div>
  );

  const setPoints = (p: Partial<typeof draft.points>) =>
    setDraft(d => d ? { ...d, points: { ...d.points, ...p } } : d);
  const setMem = (m: Partial<typeof draft.membership>) =>
    setDraft(d => d ? { ...d, membership: { ...d.membership, ...m } } : d);

  const handleSave = async () => {
    await save(draft);
    toast.success('Configuración guardada');
  };

  const inputCls = "w-full border border-[#2a3f5f] rounded-lg px-3 py-2 text-sm bg-[#0f1923] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400";
  const selectCls = inputCls;

  // ── Vista general ───────────────────────────────────────────────────────────
  if (step === 'overview') return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold text-gray-100">Configuración de lealtad</h2>
        <p className="text-sm text-gray-400 mt-1">
          Activa y ajusta los programas de lealtad de tu restaurante. Cada uno es independiente.
        </p>
      </div>

      {/* Tarjeta: Programa de puntos */}
      <div
        className={`border rounded-xl p-5 cursor-pointer transition-all hover:shadow-md ${draft.points.enabled ? 'border-amber-300 dark:border-amber-700 bg-amber-900/20' : 'border-[#2a3f5f] bg-[#1a2535]'}`}
        onClick={() => setStep('points')}
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${draft.points.enabled ? 'bg-amber-600' : 'bg-[#0d1720]'}`}>
              <Star size={20} className={draft.points.enabled ? 'text-white' : 'text-gray-400'} />
            </div>
            <div>
              <p className="font-semibold text-gray-100">Programa de puntos</p>
              <p className="text-sm text-gray-400 mt-0.5">
                {draft.points.enabled
                  ? `${draft.points.pesosPerPoint} pesos = 1 punto · Mínimo canje: ${draft.points.minRedeemPoints} pts`
                  : 'Acumula puntos por visita y canjéalos por descuentos'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${draft.points.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
              {draft.points.enabled ? 'Activo' : 'Inactivo'}
            </span>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
        </div>
      </div>

      {/* Tarjeta: Membresía */}
      <div
        className={`border rounded-xl p-5 cursor-pointer transition-all hover:shadow-md ${draft.membership.enabled ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/10' : 'border-[#2a3f5f] bg-[#1a2535]'}`}
        onClick={() => setStep('membership')}
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${draft.membership.enabled ? 'bg-purple-600' : 'bg-[#0d1720]'}`}>
              <Users size={20} className={draft.membership.enabled ? 'text-white' : 'text-gray-400'} />
            </div>
            <div>
              <p className="font-semibold text-gray-100">Membresía</p>
              <p className="text-sm text-gray-400 mt-0.5">
                {draft.membership.enabled
                  ? `${describeTrigger(draft.membership.trigger)} · ${draft.membership.durationMonths} meses`
                  : 'Clientes VIP con beneficio exclusivo'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${draft.membership.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
              {draft.membership.enabled ? 'Activa' : 'Inactiva'}
            </span>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
        </div>
      </div>

      {/* Nota sobre P&L */}
      {(draft.points.enabled || draft.membership.enabled) && (
        <div className="flex gap-2 p-3 bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg">
          <Check size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-300">
            Las transacciones de lealtad aparecen automáticamente en los reportes P&L:
            ingresos por membresías, costo de beneficios otorgados y descuentos aplicados.
          </p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
      >
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  );

  // ── Configuración de puntos ─────────────────────────────────────────────────
  if (step === 'points') return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('overview')} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
            <Star size={18} className="text-amber-600" /> Programa de puntos
          </h2>
        </div>
      </div>

      <Toggle on={draft.points.enabled} onChange={v => setPoints({ enabled: v })} label="Activar programa de puntos" />

      {draft.points.enabled && (<>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Pesos por punto" hint="Cada $X gastados = 1 punto">
            <input type="number" min={1} className={inputCls} value={draft.points.pesosPerPoint}
              onChange={e => setPoints({ pesosPerPoint: Number(e.target.value) })} />
          </Field>
          <Field label="Valor del punto" hint="$X de descuento por punto canjeado">
            <input type="number" min={0.1} step={0.1} className={inputCls} value={draft.points.pointValue}
              onChange={e => setPoints({ pointValue: Number(e.target.value) })} />
          </Field>
          <Field label="Mínimo para canjear" hint="Puntos mínimos antes de poder canjear">
            <input type="number" min={1} className={inputCls} value={draft.points.minRedeemPoints}
              onChange={e => setPoints({ minRedeemPoints: Number(e.target.value) })} />
          </Field>
          <Field label="Expiración" hint="Dejar vacío = los puntos no vencen">
            <select className={selectCls} value={draft.points.expireDays ?? ''}
              onChange={e => setPoints({ expireDays: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Sin vencimiento</option>
              <option value="90">90 días</option>
              <option value="180">6 meses</option>
              <option value="365">1 año</option>
            </select>
          </Field>
        </div>

        <Toggle on={draft.points.levelsEnabled} onChange={v => setPoints({ levelsEnabled: v })} label="Activar niveles (Bronce, Plata, Oro...)" />

        <Tip text="Ejemplo: si pesos_por_punto=10 y valor_punto=0.50, cada $100 gastados acumula 10 puntos = $5 de descuento. El ROI del programa es 5% sobre ventas." />
      </>)}

      <div className="flex gap-3">
        <button onClick={() => setStep('overview')} className="border border-[#2a3f5f] px-5 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-[#243f72]/20 transition-colors">
          Atrás
        </button>
        <button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );

  // ── Configuración de membresía ──────────────────────────────────────────────
  if (step === 'membership') return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('overview')} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
          <Users size={18} className="text-purple-600" /> Membresía
        </h2>
      </div>

      <Toggle on={draft.membership.enabled} onChange={v => setMem({ enabled: v })} label="Activar membresía" />

      {draft.membership.enabled && (<>

        <Field label="¿Cómo se activa la membresía?">
          <div className="space-y-2 mt-1">
            {(['manual', 'venta_producto', 'pago_directo'] as MembershipTrigger[]).map(t => (
              <label key={t} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${draft.membership.trigger === t ? 'border-purple-400 bg-purple-900/20' : 'border-[#2a3f5f] hover:border-gray-200'}`}>
                <input type="radio" className="mt-0.5" checked={draft.membership.trigger === t}
                  onChange={() => setMem({ trigger: t })} />
                <div>
                  <p className="text-sm font-medium text-gray-100">{describeTrigger(t)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t === 'manual'         && 'El cajero registra al cliente cuando corresponda. Útil cuando el trigger es físico (un objeto, un evento).'}
                    {t === 'venta_producto' && 'Se activa automáticamente al vender un producto específico. Ej: vender un termo activa la membresía.'}
                    {t === 'pago_directo'   && 'El cliente paga una cuota por la membresía. Se cobra como un producto más del menú.'}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </Field>

        {draft.membership.trigger === 'venta_producto' && (
          <Field label="¿Qué producto activa la membresía?" hint="Puede ser un platillo, un combo o un producto de la tienda de extras">
            <select className={selectCls} value={draft.membership.triggerProductId}
              onChange={e => setMem({ triggerProductId: e.target.value })}>
              <option value="">Selecciona un producto...</option>
              {['Platillos del menú','Tienda de extras'].map(group => {
                const items = dishes.filter(d => d.group === group);
                if (!items.length) return null;
                return (
                  <optgroup key={group} label={group}>
                    {items.map(d => <option key={d.id} value={d.id}>{d.name} — ${d.price}</option>)}
                  </optgroup>
                );
              })}
            </select>
          </Field>
        )}

        {draft.membership.trigger === 'pago_directo' && (
          <Field label="Precio de la membresía (MXN)" hint="0 = gratis, >0 = el cliente paga este monto">
            <input type="number" min={0} className={inputCls} value={draft.membership.price}
              onChange={e => setMem({ price: Number(e.target.value) })} />
          </Field>
        )}

        <Field label="Duración de la membresía">
          <select className={selectCls} value={draft.membership.durationMonths}
            onChange={e => setMem({ durationMonths: Number(e.target.value) })}>
            <option value={0}>Sin vencimiento</option>
            <option value={1}>1 mes</option>
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
            <option value={24}>24 meses</option>
          </select>
        </Field>

        <div className="border-t border-[#2a3f5f] pt-5">
          <button
            onClick={() => setStep('benefit')}
            className="flex items-center gap-2 text-sm font-medium text-purple-400 hover:underline"
          >
            <Gift size={16} />
            Configurar beneficios de la membresía
            <ChevronRight size={14} />
          </button>
          {(draft.membership.freeProductEnabled || draft.membership.discountEnabled || draft.membership.priceTagEnabled || draft.membership.pointsEnabled || draft.membership.birthdayEnabled) && (
            <div className="mt-2 space-y-0.5">
              {draft.membership.freeProductEnabled && <p className="text-xs text-amber-400">☕ {draft.membership.freeProductLabel}{draft.membership.freeProductDaily ? ' (diario)' : ''}</p>}
              {draft.membership.discountEnabled && <p className="text-xs text-green-400">💚 {draft.membership.discountPct}% descuento</p>}
              {draft.membership.priceTagEnabled && <p className="text-xs text-blue-400">🏷️ {draft.membership.priceTagLabel}</p>}
              {draft.membership.pointsEnabled && <p className="text-xs text-purple-400">⭐ Puntos {draft.membership.pointsMultiplier}x</p>}
            </div>
          )}
        </div>
      </>)}

      <div className="flex gap-3">
        <button onClick={() => setStep('overview')} className="border border-[#2a3f5f] px-5 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-50 transition-colors">
          Atrás
        </button>
        <button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );

  // ── Configuración del beneficio ─────────────────────────────────────────────
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('membership')} className="text-gray-400 hover:text-gray-300">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
          <Gift size={18} className="text-purple-400" /> ¿Qué recibe el socio?
        </h2>
      </div>

      <p className="text-sm text-gray-400">Activa uno o más beneficios. Se pueden combinar.</p>

      {/* BENEFICIO 1 — Producto gratis */}
      <div className={`border rounded-xl p-4 transition-all ${draft.membership.freeProductEnabled ? 'border-amber-500/50 bg-amber-900/10' : 'border-[#2a3f5f]'}`}>
        <Toggle on={draft.membership.freeProductEnabled} onChange={v => setMem({ freeProductEnabled: v })} label="Bebida o platillo gratis" />
        {draft.membership.freeProductEnabled && (
          <div className="mt-4 space-y-3 pl-14">
            <Field label="¿Qué producto se regala?" hint="El costo WACC se registra en el P&L como gasto del programa">
              <select className={selectCls} value={draft.membership.freeProductId} onChange={e => setMem({ freeProductId: e.target.value })}>
                <option value="">Selecciona un producto...</option>
                {['Platillos del menú','Tienda de extras'].map(group => {
                  const items = dishes.filter(d => d.group === group);
                  if (!items.length) return null;
                  return (
                    <optgroup key={group} label={group}>
                      {items.map(d => <option key={d.id} value={d.id}>{d.name} — ${d.price}</option>)}
                    </optgroup>
                  );
                })}
              </select>
            </Field>
            <Field label="¿Con qué frecuencia puede usarlo?">
              <select className={selectCls} value={draft.membership.freeProductFreq} onChange={e => setMem({ freeProductFreq: e.target.value as any })}>
                <option value="diario">Una vez al día — se resetea a medianoche</option>
                <option value="visita">Una vez por visita — ilimitado</option>
                <option value="semanal">Una vez por semana</option>
              </select>
            </Field>
            {draft.membership.freeProductFreq !== 'visita' && <Tip text="Cross-sucursal activo: el contador es compartido en todas las sucursales del restaurante." />}
            <Field label="¿Cómo lo ve el cajero en el POS?">
              <input className={inputCls} placeholder="Ej: Café del día, Postre de bienvenida" value={draft.membership.freeProductLabel} onChange={e => setMem({ freeProductLabel: e.target.value })} />
            </Field>
          </div>
        )}
      </div>

      {/* BENEFICIO 2 — Descuento */}
      <div className={`border rounded-xl p-4 transition-all ${draft.membership.discountEnabled ? 'border-green-500/50 bg-green-900/10' : 'border-[#2a3f5f]'}`}>
        <Toggle on={draft.membership.discountEnabled} onChange={v => setMem({ discountEnabled: v })} label="Descuento en sus compras" />
        {draft.membership.discountEnabled && (
          <div className="mt-4 pl-14 space-y-3">
            <div className="flex items-center gap-3">
              <input type="number" min={1} max={50} className={inputCls + ' max-w-[100px]'} value={draft.membership.discountPct} onChange={e => setMem({ discountPct: Number(e.target.value) })} />
              <span className="text-gray-300 text-sm font-medium">% de descuento</span>
            </div>
            <Field label="¿Sobre qué aplica el descuento?">
              <select className={selectCls} value={draft.membership.discountScope} onChange={e => setMem({ discountScope: e.target.value as any })}>
                <option value="orden">Toda la orden (platillos + bebidas + extras)</option>
                <option value="platillos">Solo platillos del menú (no sobre extras)</option>
              </select>
            </Field>
            <Field label="¿Cómo se aplica?">
              <select className={selectCls} value={draft.membership.discountAuto ? 'auto' : 'manual'} onChange={e => setMem({ discountAuto: e.target.value === 'auto' })}>
                <option value="auto">Automático en cada visita — siempre aplica</option>
                <option value="manual">El cajero lo activa — el socio decide cuándo usarlo</option>
              </select>
            </Field>
          </div>
        )}
      </div>

      {/* Puntos extra */}
      <div className={`border rounded-xl p-4 transition-all ${draft.membership.pointsEnabled ? 'border-purple-500/50 bg-purple-900/10' : 'border-[#2a3f5f]'}`}>
        <Toggle on={draft.membership.pointsEnabled} onChange={v => setMem({ pointsEnabled: v })} label="Acumula puntos más rápido" />
        {draft.membership.pointsEnabled && (
          <div className="mt-4 pl-14">
            <Field label="Multiplicador">
              <select className={selectCls} value={draft.membership.pointsMultiplier} onChange={e => setMem({ pointsMultiplier: Number(e.target.value) })}>
                <option value={1.5}>1.5x — 50% más puntos</option>
                <option value={2}>2x — el doble de puntos</option>
                <option value={3}>3x — el triple de puntos</option>
              </select>
            </Field>
          </div>
        )}
      </div>

      {/* BENEFICIO 5 — Cumpleaños */}
      <div className={`border rounded-xl p-4 transition-all ${draft.membership.birthdayEnabled ? 'border-pink-500/50 bg-pink-900/10' : 'border-[#2a3f5f]'}`}>
        <Toggle on={draft.membership.birthdayEnabled} onChange={v => setMem({ birthdayEnabled: v })} label="Beneficio especial de cumpleaños 🎂" />
        {draft.membership.birthdayEnabled && (
          <div className="mt-4 space-y-3 pl-14">
            <Tip text="El sistema avisa automáticamente cuando un socio visita en su cumpleaños. No necesitas hacer nada — el cajero lo ve en el POS." />
            <Field label="¿Qué recibe el socio en su cumpleaños?">
              <select className={selectCls} value={draft.membership.birthdayType} onChange={e => setMem({ birthdayType: e.target.value as any })}>
                <option value="descuento">Descuento especial ese día</option>
                <option value="producto_gratis">Producto gratis ese día</option>
              </select>
            </Field>
            {draft.membership.birthdayType === 'descuento' && (
              <div className="flex items-center gap-3">
                <input type="number" min={1} max={100} className={inputCls + ' max-w-[100px]'} value={draft.membership.birthdayDiscountPct} onChange={e => setMem({ birthdayDiscountPct: Number(e.target.value) })} />
                <span className="text-gray-300 text-sm">% de descuento en su cumpleaños</span>
              </div>
            )}
            {draft.membership.birthdayType === 'producto_gratis' && (
              <Field label="¿Qué producto se regala?">
                <select className={selectCls} value={draft.membership.birthdayProductId} onChange={e => setMem({ birthdayProductId: e.target.value })}>
                  <option value="">Selecciona un producto...</option>
                  {['Platillos del menú','Tienda de extras'].map(group => {
                    const items = dishes.filter(d => d.group === group);
                    if (!items.length) return null;
                    return (
                      <optgroup key={group} label={group}>
                        {items.map(d => <option key={d.id} value={d.id}>{d.name} — ${d.price}</option>)}
                      </optgroup>
                    );
                  })}
                </select>
              </Field>
            )}
            <Field label="Mensaje que ve el cajero">
              <input className={inputCls} placeholder="Ej: ¡Feliz cumpleaños! Aplica descuento especial" value={draft.membership.birthdayLabel} onChange={e => setMem({ birthdayLabel: e.target.value })} />
            </Field>
          </div>
        )}
      </div>

      {/* Preview de lo que verá el cajero */}
      {(draft.membership.freeProductEnabled || draft.membership.discountEnabled || draft.membership.priceTagEnabled || draft.membership.pointsEnabled || draft.membership.birthdayEnabled) && (
        <div className="p-4 bg-[#0d1720] border border-[#2a3f5f] rounded-xl">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Así verá el cajero al verificar un socio:</p>
          <div className="space-y-1.5">
            <p className="text-sm text-gray-300">👤 Ana García — <span className="text-green-400 font-semibold">SOCIA ACTIVA</span></p>
            {draft.membership.freeProductEnabled && <p className="text-sm text-amber-400">☕ {draft.membership.freeProductLabel || 'Bebida del día'} — DISPONIBLE HOY</p>}
            {draft.membership.priceTagEnabled && <p className="text-sm text-blue-400">🏷️ {draft.membership.priceTagLabel || 'Precio de socio'}</p>}
            {draft.membership.discountEnabled && draft.membership.discountPct > 0 && <p className="text-sm text-green-400">💚 {draft.membership.discountPct}% descuento en esta visita</p>}
            {draft.membership.pointsEnabled && <p className="text-sm text-purple-400">⭐ Acumula puntos {draft.membership.pointsMultiplier}x</p>}
            {draft.membership.birthdayEnabled && <p className="text-sm text-pink-400">🎂 HOY ES SU CUMPLEAÑOS — {draft.membership.birthdayLabel || 'Aplica beneficio especial'}</p>}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={() => setStep('membership')} className="border border-[#2a3f5f] px-5 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-[#0d1720] transition-colors">Atrás</button>
        <button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          {saving ? 'Guardando...' : 'Guardar beneficios'}
        </button>
      </div>
    </div>
  );
}
