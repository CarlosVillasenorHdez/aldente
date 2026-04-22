'use client';

/**
 * ConfigLealtad — Simplicidad brutal
 * Una sola pregunta: ¿cómo recompensas a tus clientes?
 */

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useLoyaltyConfig } from '@/hooks/useLoyaltyConfig';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const inp = "w-full border border-[#2a3f5f] rounded-lg px-3 py-2 text-sm bg-[#0f1923] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400";
const sel = "w-full border border-[#2a3f5f] rounded-lg px-3 py-2 text-sm bg-[#0f1923] text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400";
const lbl = "text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5";

const Toggle = ({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) => (
  <label className="flex items-start gap-3 cursor-pointer select-none">
    <div onClick={() => onChange(!on)} className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${on ? 'bg-amber-500' : 'bg-gray-700'}`}>
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </div>
    <div>
      <span className="text-sm text-gray-200">{label}</span>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  </label>
);

const Tip = ({ text }: { text: string }) => (
  <div className="flex gap-2 p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
    <Info size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
    <p className="text-xs text-blue-300">{text}</p>
  </div>
);

interface Dish { id: string; name: string; price: number; group: string }

export default function LoyaltyConfig() {
  const { appUser } = useAuth();
  const { config, loading, saving, save } = useLoyaltyConfig(appUser?.tenantId);
  const supabase = useMemo(() => createClient(), []);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [draft, setDraft] = useState(config);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => { if (!loading) setDraft(config); }, [loading, config]);

  useEffect(() => {
    const tid = appUser?.tenantId;
    if (!tid) return;
    Promise.all([
      supabase.from('dishes').select('id,name,price').eq('tenant_id', tid).eq('available', true).order('name'),
      supabase.from('extras_catalog').select('id,name,price').eq('tenant_id', tid).eq('is_active', true).order('name'),
    ]).then(([dr, er]) => setDishes([
      ...(dr.data ?? []).map((d: any) => ({ id: d.id, name: d.name, price: Number(d.price), group: 'Platillos del menú' })),
      ...(er.data ?? []).map((e: any) => ({ id: e.id, name: e.name, price: Number(e.price), group: 'Tienda de extras' })),
    ]));
  }, [supabase, appUser?.tenantId]);

  const handleSave = async () => {
    await save({ ...draft, tiers: [] });
    toast.success('Configuración guardada');
  };

  const setMem = (patch: Partial<typeof draft.membership>) =>
    setDraft(d => ({ ...d, membership: { ...d.membership, ...patch } }));

  const ProductSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select className={sel} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Selecciona un producto...</option>
      {['Platillos del menú', 'Tienda de extras'].map(group => {
        const items = dishes.filter(d => d.group === group);
        if (!items.length) return null;
        return (
          <optgroup key={group} label={group}>
            {items.map(d => <option key={d.id} value={d.id}>{d.name} — ${d.price}</option>)}
          </optgroup>
        );
      })}
    </select>
  );

  if (loading || !draft) return <div className="text-sm text-gray-400 py-12 text-center">Cargando...</div>;

  const mem = draft.membership;
  const hasReward = mem.freeProductEnabled || mem.discountEnabled || mem.priceTagEnabled || mem.birthdayEnabled;

  return (
    <div className="space-y-5 max-w-xl">

      {/* Activar/desactivar */}
      <div className={`border rounded-xl p-5 transition-all ${mem.enabled ? 'border-amber-500/40 bg-amber-900/10' : 'border-[#2a3f5f] bg-[#0d1720]'}`}>
        <Toggle
          on={mem.enabled}
          onChange={v => setMem({ enabled: v })}
          label="Programa de lealtad activo"
          sub="El cajero puede buscar y registrar clientes frecuentes en el POS"
        />
      </div>

      {mem.enabled && (<>

        {/* Cómo se registra */}
        <div className="border border-[#2a3f5f] rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-100">¿Cómo se registra un cliente?</p>
          <div className="space-y-2">
            {([
              { val: 'manual', label: 'El cajero lo registra manualmente', sub: 'Membresía gratuita — cualquier cliente puede pedir unirse' },
              { val: 'venta_producto', label: 'Al comprar un producto específico', sub: 'Ejemplo: compra el termo y queda registrado automáticamente' },
              { val: 'pago_directo', label: 'Pago directo de la membresía', sub: 'El cliente paga una cuota para activarla' },
            ] as const).map(opt => (
              <label key={opt.val} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${mem.trigger === opt.val ? 'border-amber-500/50 bg-amber-900/10' : 'border-[#2a3f5f] hover:border-gray-600'}`}>
                <input type="radio" className="mt-1 flex-shrink-0" checked={mem.trigger === opt.val}
                  onChange={() => setMem({ trigger: opt.val })} />
                <div>
                  <p className="text-sm font-medium text-gray-100">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                </div>
              </label>
            ))}
          </div>

          {mem.trigger === 'venta_producto' && (
            <div>
              <label className={lbl}>¿Qué producto activa la membresía?</label>
              <ProductSelect value={mem.triggerProductId} onChange={v => setMem({ triggerProductId: v })} />
            </div>
          )}

          {mem.trigger === 'pago_directo' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Precio ($)</label>
                <input type="number" min={0} className={inp} value={mem.price}
                  onChange={e => setMem({ price: Number(e.target.value) })} />
              </div>
              <div>
                <label className={lbl}>Vigencia (meses, 0 = sin límite)</label>
                <input type="number" min={0} className={inp} value={mem.durationMonths}
                  onChange={e => setMem({ durationMonths: Number(e.target.value) })} />
              </div>
            </div>
          )}

          {mem.trigger !== 'pago_directo' && (
            <div>
              <label className={lbl}>Vigencia en meses (0 = sin fecha límite)</label>
              <input type="number" min={0} className={inp} value={mem.durationMonths}
                onChange={e => setMem({ durationMonths: Number(e.target.value) })} />
            </div>
          )}
        </div>

        {/* Beneficios */}
        <div className="border border-[#2a3f5f] rounded-xl p-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-100">¿Qué recibe el cliente en cada visita?</p>
            <p className="text-xs text-gray-500 mt-1">Activa uno o más. Se pueden combinar.</p>
          </div>

          {/* Producto gratis */}
          <div className={`border rounded-xl p-4 transition-all ${mem.freeProductEnabled ? 'border-amber-500/30 bg-amber-900/10' : 'border-[#2a3f5f]'}`}>
            <Toggle on={mem.freeProductEnabled} onChange={v => setMem({ freeProductEnabled: v })}
              label="Producto gratis por visita" />
            {mem.freeProductEnabled && (
              <div className="mt-3 space-y-3 pl-14">
                <div>
                  <label className={lbl}>¿Qué producto?</label>
                  <ProductSelect value={mem.freeProductId} onChange={v => setMem({ freeProductId: v })} />
                </div>
                <div>
                  <label className={lbl}>¿Con qué frecuencia?</label>
                  <select className={sel} value={mem.freeProductFreq}
                    onChange={e => setMem({ freeProductFreq: e.target.value as any })}>
                    <option value="diario">Una vez al día</option>
                    <option value="visita">Una por visita (ilimitado)</option>
                    <option value="semanal">Una vez a la semana</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>¿Cómo lo ve el cajero en el POS?</label>
                  <input className={inp} placeholder="Ej: Café del día" value={mem.freeProductLabel}
                    onChange={e => setMem({ freeProductLabel: e.target.value })} />
                </div>
              </div>
            )}
          </div>

          {/* Descuento */}
          <div className={`border rounded-xl p-4 transition-all ${mem.discountEnabled ? 'border-green-500/30 bg-green-900/10' : 'border-[#2a3f5f]'}`}>
            <Toggle on={mem.discountEnabled} onChange={v => setMem({ discountEnabled: v })}
              label="Descuento en sus compras" />
            {mem.discountEnabled && (
              <div className="mt-3 pl-14 space-y-3">
                <div className="flex items-center gap-3">
                  <input type="number" min={1} max={50} className={inp + ' max-w-[90px]'}
                    value={mem.discountPct} onChange={e => setMem({ discountPct: Number(e.target.value) })} />
                  <span className="text-sm text-gray-400">% de descuento</span>
                </div>
                <div>
                  <label className={lbl}>¿Sobre qué aplica?</label>
                  <select className={sel} value={mem.discountScope}
                    onChange={e => setMem({ discountScope: e.target.value as any })}>
                    <option value="orden">Toda la orden</option>
                    <option value="platillos">Solo platillos del menú</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>¿Cómo se aplica?</label>
                  <select className={sel} value={mem.discountAuto ? 'auto' : 'manual'}
                    onChange={e => setMem({ discountAuto: e.target.value === 'auto' })}>
                    <option value="auto">Automático en cada visita</option>
                    <option value="manual">El cajero lo activa</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Cumpleaños */}
          <div className={`border rounded-xl p-4 transition-all ${mem.birthdayEnabled ? 'border-pink-500/30 bg-pink-900/10' : 'border-[#2a3f5f]'}`}>
            <Toggle on={mem.birthdayEnabled} onChange={v => setMem({ birthdayEnabled: v })}
              label="Sorpresa de cumpleaños 🎂"
              sub="El cajero ve una alerta automática cuando es el cumpleaños del cliente" />
            {mem.birthdayEnabled && (
              <div className="mt-3 pl-14 space-y-3">
                <div>
                  <label className={lbl}>¿Qué recibe en su cumpleaños?</label>
                  <select className={sel} value={mem.birthdayType}
                    onChange={e => setMem({ birthdayType: e.target.value as any })}>
                    <option value="descuento">Descuento especial ese día</option>
                    <option value="producto_gratis">Producto gratis ese día</option>
                  </select>
                </div>
                {mem.birthdayType === 'descuento' && (
                  <div className="flex items-center gap-3">
                    <input type="number" min={1} max={100} className={inp + ' max-w-[90px]'}
                      value={mem.birthdayDiscountPct} onChange={e => setMem({ birthdayDiscountPct: Number(e.target.value) })} />
                    <span className="text-sm text-gray-400">% de descuento en su cumpleaños</span>
                  </div>
                )}
                {mem.birthdayType === 'producto_gratis' && (
                  <div>
                    <label className={lbl}>¿Qué producto?</label>
                    <ProductSelect value={mem.birthdayProductId} onChange={v => setMem({ birthdayProductId: v })} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preview del cajero */}
        {hasReward && (
          <div className="p-4 bg-[#0d1720] border border-[#2a3f5f] rounded-xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Así lo ve el cajero al verificar a un cliente:
            </p>
            <p className="text-sm text-gray-300 mb-2">
              👤 Ana García — <span className="text-green-400 font-semibold">SOCIA ACTIVA</span>
            </p>
            {mem.freeProductEnabled && <p className="text-sm text-amber-400">☕ {mem.freeProductLabel || 'Beneficio del día'} — DISPONIBLE</p>}
            {mem.discountEnabled && mem.discountPct > 0 && <p className="text-sm text-green-400">💚 {mem.discountPct}% {mem.discountAuto ? '(automático)' : '(el cajero activa)'}</p>}
            {mem.birthdayEnabled && <p className="text-sm text-pink-400">🎂 HOY ES SU CUMPLEAÑOS</p>}
          </div>
        )}

        {/* Opciones avanzadas */}
        <button onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showAdvanced ? 'Ocultar opciones avanzadas' : 'Opciones avanzadas (precio especial de socio)'}
        </button>

        {showAdvanced && (
          <div className="space-y-3 border border-[#2a3f5f] rounded-xl p-5">
            <div className={`border rounded-xl p-4 transition-all ${mem.priceTagEnabled ? 'border-blue-500/30 bg-blue-900/10' : 'border-[#2a3f5f]'}`}>
              <Toggle on={mem.priceTagEnabled} onChange={v => setMem({ priceTagEnabled: v })}
                label="Precio especial de socio"
                sub="El cajero ve una etiqueta y aplica el precio manualmente según tu política" />
              {mem.priceTagEnabled && (
                <div className="mt-3 pl-14">
                  <label className={lbl}>Etiqueta para el cajero</label>
                  <input className={inp} placeholder="Ej: Precio de socio"
                    value={mem.priceTagLabel} onChange={e => setMem({ priceTagLabel: e.target.value })} />
                </div>
              )}
            </div>
            <Tip text="¿Necesitas múltiples niveles (Plata, Gold, Platino) con beneficios distintos por nivel? Contáctanos." />
          </div>
        )}

      </>)}

      <button onClick={handleSave} disabled={saving}
        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-[#1B3A6B] px-6 py-3 rounded-xl text-sm font-bold transition-colors w-full">
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  );
}
