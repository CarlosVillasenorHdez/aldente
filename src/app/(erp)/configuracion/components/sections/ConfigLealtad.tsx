'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Info, Plus, Trash2, Edit3, X } from 'lucide-react';
import { useLoyaltyConfig, MembershipTier, MembershipTierBenefits, DEFAULT_TIER_BENEFITS, TierUpgradeRule } from '@/hooks/useLoyaltyConfig';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const inp = "w-full border border-[#2a3f5f] rounded-lg px-3 py-2 text-sm bg-[#0f1923] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400";
const sel = "w-full border border-[#2a3f5f] rounded-lg px-3 py-2 text-sm bg-[#0f1923] text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400";
const lbl = "text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5";
const TIER_COLORS = ['#F59E0B','#9CA3AF','#EAB308','#8B5CF6','#10B981','#EF4444','#3B82F6'];

interface Dish { id: string; name: string; price: number; group: string }

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 cursor-pointer select-none" onClick={() => onChange(!on)}>
      <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${on ? 'bg-amber-500' : 'bg-gray-700'}`}>
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      <div>
        <span className="text-sm text-gray-200">{label}</span>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <div className="flex gap-2 p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
      <Info size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-blue-300">{text}</p>
    </div>
  );
}

// ── Selector de producto ──────────────────────────────────────────────────────
function ProductSelect({ value, onChange, dishes }: { value: string; onChange: (v: string) => void; dishes: Dish[] }) {
  return (
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
}

// ── Editor de beneficios (reutilizable para nivel único y para tiers) ─────────
function BenefitsForm({ b, onChange, dishes }: { b: MembershipTierBenefits; onChange: (b: MembershipTierBenefits) => void; dishes: Dish[] }) {
  const set = (p: Partial<MembershipTierBenefits>) => onChange({ ...b, ...p });
  return (
    <div className="space-y-3">
      {/* Producto gratis */}
      <div className={`border rounded-xl p-4 transition-all ${b.freeProductEnabled ? 'border-amber-500/30 bg-amber-900/10' : 'border-[#2a3f5f]'}`}>
        <Toggle on={b.freeProductEnabled} onChange={v => set({ freeProductEnabled: v })} label="Producto gratis por visita" />
        {b.freeProductEnabled && (
          <div className="mt-3 space-y-3 pl-14">
            <div>
              <label className={lbl}>¿Qué producto?</label>
              <ProductSelect value={b.freeProductId} onChange={v => set({ freeProductId: v })} dishes={dishes} />
            </div>
            <div>
              <label className={lbl}>¿Con qué frecuencia?</label>
              <select className={sel} value={b.freeProductFreq} onChange={e => set({ freeProductFreq: e.target.value as any })}>
                <option value="diario">Una vez al día</option>
                <option value="visita">Una por visita (ilimitado)</option>
                <option value="semanal">Una vez a la semana</option>
              </select>
            </div>
            <div>
              <label className={lbl}>¿Cómo lo ve el cajero en el POS?</label>
              <input className={inp} placeholder="Ej: Café del día" value={b.freeProductLabel} onChange={e => set({ freeProductLabel: e.target.value })} />
            </div>
          </div>
        )}
      </div>

      {/* Descuento */}
      <div className={`border rounded-xl p-4 transition-all ${b.discountEnabled ? 'border-green-500/30 bg-green-900/10' : 'border-[#2a3f5f]'}`}>
        <Toggle on={b.discountEnabled} onChange={v => set({ discountEnabled: v })} label="Descuento en sus compras" />
        {b.discountEnabled && (
          <div className="mt-3 pl-14 space-y-3">
            <div className="flex items-center gap-3">
              <input type="number" min={1} max={80} className={inp + ' max-w-[90px]'} value={b.discountPct} onChange={e => set({ discountPct: Number(e.target.value) })} />
              <span className="text-sm text-gray-400">% de descuento</span>
            </div>
            <div>
              <label className={lbl}>¿Sobre qué aplica?</label>
              <select className={sel} value={b.discountScope} onChange={e => set({ discountScope: e.target.value as any })}>
                <option value="orden">Toda la orden</option>
                <option value="platillos">Solo platillos del menú</option>
              </select>
            </div>
            <div>
              <label className={lbl}>¿Cómo se aplica?</label>
              <select className={sel} value={b.discountAuto ? 'auto' : 'manual'} onChange={e => set({ discountAuto: e.target.value === 'auto' })}>
                <option value="auto">Automático en cada visita</option>
                <option value="manual">El cajero lo activa</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Cumpleaños */}
      <div className={`border rounded-xl p-4 transition-all ${b.birthdayEnabled ? 'border-pink-500/30 bg-pink-900/10' : 'border-[#2a3f5f]'}`}>
        <Toggle on={b.birthdayEnabled} onChange={v => set({ birthdayEnabled: v })} label="Sorpresa de cumpleaños 🎂" sub="El cajero ve una alerta automática cuando es el cumpleaños del cliente" />
        {b.birthdayEnabled && (
          <div className="mt-3 pl-14 space-y-3">
            <div>
              <label className={lbl}>¿Qué recibe en su cumpleaños?</label>
              <select className={sel} value={b.birthdayType} onChange={e => set({ birthdayType: e.target.value as any })}>
                <option value="descuento">Descuento especial ese día</option>
                <option value="producto_gratis">Producto gratis ese día</option>
              </select>
            </div>
            {b.birthdayType === 'descuento' && (
              <div className="flex items-center gap-3">
                <input type="number" min={1} max={100} className={inp + ' max-w-[90px]'} value={b.birthdayDiscountPct} onChange={e => set({ birthdayDiscountPct: Number(e.target.value) })} />
                <span className="text-sm text-gray-400">% de descuento en su cumpleaños</span>
              </div>
            )}
            {b.birthdayType === 'producto_gratis' && (
              <div>
                <label className={lbl}>¿Qué producto?</label>
                <ProductSelect value={b.birthdayProductId} onChange={v => set({ birthdayProductId: v })} dishes={dishes} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Precio especial (avanzado) */}
      <div className={`border rounded-xl p-4 transition-all ${b.priceTagEnabled ? 'border-blue-500/30 bg-blue-900/10' : 'border-[#2a3f5f]'}`}>
        <Toggle on={b.priceTagEnabled} onChange={v => set({ priceTagEnabled: v })} label="Precio especial de socio" sub="El cajero ve una etiqueta y aplica el precio manualmente" />
        {b.priceTagEnabled && (
          <div className="mt-3 pl-14">
            <label className={lbl}>Etiqueta para el cajero</label>
            <input className={inp} placeholder="Ej: Precio de socio" value={b.priceTagLabel} onChange={e => set({ priceTagLabel: e.target.value })} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal editor de nivel ─────────────────────────────────────────────────────
function TierEditor({ tier, dishes, saving, onSave, onClose }: {
  tier: MembershipTier; dishes: Dish[]; saving: boolean;
  onSave: (t: MembershipTier) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<MembershipTier>({
    ...tier, benefits: { ...DEFAULT_TIER_BENEFITS, ...tier.benefits },
    upgradeRule: tier.upgradeRule ?? 'visitas',
    upgradeThreshold: tier.upgradeThreshold ?? 0,
  });

  const upgradeLabels: Record<string, string> = {
    visitas: 'visitas acumuladas',
    gasto: 'pesos gastados en total',
    producto: '',
    manual: '',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-auto">
      <div className="bg-[#0f1923] border border-[#2a3f5f] rounded-2xl p-6 w-full max-w-md space-y-4 my-8">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-100">{tier.id ? 'Editar nivel' : 'Nuevo nivel'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
        </div>

        {/* Nombre */}
        <div>
          <label className={lbl}>Nombre del nivel</label>
          <input className={inp} placeholder="Ej: Bronce, Plata, Oro" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
        </div>

        {/* Color */}
        <div>
          <label className={lbl}>Color del badge en el POS</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {TIER_COLORS.map(c => (
              <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0f1923]' : ''}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        {/* Regla de ascenso */}
        <div className="p-4 bg-[#0a1628] border border-[#2a3f5f] rounded-xl space-y-3">
          <label className={lbl}>¿Cómo sube el cliente a este nivel?</label>

          <div className="grid grid-cols-2 gap-2">
            {([
              { val: 'manual',   icon: '✋', label: 'Manual', sub: 'El dueño lo asigna' },
              { val: 'visitas',  icon: '🎫', label: 'Por visitas', sub: `Ej: 20 visitas` },
              { val: 'gasto',    icon: '💰', label: 'Por gasto', sub: `Ej: $5,000 acumulados` },
              { val: 'producto', icon: '📦', label: 'Por compra', sub: 'Compra un producto específico' },
            ] as const).map(opt => (
              <button key={opt.val}
                onClick={() => setForm(f => ({ ...f, upgradeRule: opt.val, upgradeThreshold: 0, upgradeProductId: '' }))}
                className={`flex items-start gap-2 p-3 border rounded-xl text-left transition-all ${form.upgradeRule === opt.val ? 'border-amber-500/50 bg-amber-900/15' : 'border-[#2a3f5f] hover:border-gray-600'}`}>
                <span className="text-base leading-none mt-0.5">{opt.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-200">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Umbral según el tipo */}
          {form.upgradeRule === 'manual' && (
            <p className="text-xs text-gray-500 italic">El administrador o gerente asignará este nivel manualmente desde el módulo de Lealtad.</p>
          )}

          {(form.upgradeRule === 'visitas' || form.upgradeRule === 'gasto') && (
            <div>
              <label className={lbl}>
                {form.upgradeRule === 'visitas' ? 'Número de visitas necesarias' : 'Gasto acumulado necesario ($)'}
              </label>
              <div className="flex items-center gap-3">
                <input type="number" min={0} className={`${inp} max-w-[130px]`}
                  placeholder={form.upgradeRule === 'visitas' ? '20' : '5000'}
                  value={form.upgradeThreshold ?? 0}
                  onChange={e => setForm(f => ({ ...f, upgradeThreshold: Number(e.target.value) }))} />
                <span className="text-xs text-gray-400">
                  {form.upgradeRule === 'visitas' ? 'visitas' : 'pesos gastados'}
                </span>
              </div>
              {(form.upgradeThreshold ?? 0) === 0 && (
                <p className="text-xs text-amber-400 mt-1.5">⚡ Umbral = 0 → nivel de entrada (todos los nuevos socios empiezan aquí)</p>
              )}
            </div>
          )}

          {form.upgradeRule === 'producto' && (
            <div>
              <label className={lbl}>¿Qué producto activa este nivel?</label>
              <select className={inp} value={form.upgradeProductId ?? ''}
                onChange={e => setForm(f => ({ ...f, upgradeProductId: e.target.value }))}>
                <option value="">Selecciona el producto...</option>
                {['Platillos del menú','Tienda de extras'].map(group => {
                  const items = dishes.filter(d => d.group === group);
                  if (!items.length) return null;
                  return <optgroup key={group} label={group}>{items.map(d => <option key={d.id} value={d.id}>{d.name} — ${d.price}</option>)}</optgroup>;
                })}
              </select>
            </div>
          )}
        </div>

        {/* Beneficios */}
        <div>
          <label className={lbl}>Beneficios de este nivel</label>
          <div className="mt-1">
            <BenefitsForm b={form.benefits} onChange={b => setForm(f => ({ ...f, benefits: b }))} dishes={dishes} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-[#2a3f5f] hover:bg-[#1a2535]">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.name.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-[#1B3A6B] disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar nivel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function LoyaltyConfig() {
  const { appUser } = useAuth();
  const { config, loading, saving, save } = useLoyaltyConfig(appUser?.tenantId);
  const supabase = useMemo(() => createClient(), []);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [draft, setDraft] = useState(config);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);
  const [savingTiers, setSavingTiers] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!loading && !initialized) {
      setDraft(config);
      setTiers(config.tiers ?? []);
      setInitialized(true);
    }
  }, [loading, config, initialized]);

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

  const setMem = (patch: Partial<typeof draft.membership>) =>
    setDraft(d => ({ ...d, membership: { ...d.membership, ...patch } }));

  const handleSave = async () => {
    await save({ ...draft, tiers });
    toast.success('Configuración guardada');
  };

  const saveTiersToDb = async (next: MembershipTier[]) => {
    const tid = appUser?.tenantId;
    if (!tid) return;
    await supabase.from('system_config').upsert(
      [{ tenant_id: tid, config_key: 'loyalty_membership_tiers', config_value: JSON.stringify(next) }],
      { onConflict: 'tenant_id,config_key' }
    );
  };

  const handleSaveTier = async (tier: MembershipTier) => {
    setSavingTiers(true);
    const next = tier.id && tiers.find(t => t.id === tier.id)
      ? tiers.map(t => t.id === tier.id ? tier : t)
      : [...tiers, { ...tier, id: `tier_${Date.now()}`, order: tiers.length + 1 }];
    await saveTiersToDb(next);
    setTiers(next);
    setEditingTier(null);
    setSavingTiers(false);
    toast.success('Nivel guardado');
  };

  const removeTier = async (id: string) => {
    const next = tiers.filter(t => t.id !== id);
    await saveTiersToDb(next);
    setTiers(next);
    toast.success('Nivel eliminado');
  };

  if (loading || !draft) return <div className="text-sm text-gray-400 py-12 text-center">Cargando...</div>;

  const mem = draft.membership;
  const useMultiLevel = tiers.length > 0;
  const hasReward = mem.freeProductEnabled || mem.discountEnabled || mem.priceTagEnabled || mem.birthdayEnabled;

  return (
    <div className="space-y-5 max-w-xl">

      {/* Activar programa */}
      <div className={`border rounded-xl p-5 transition-all ${mem.enabled ? 'border-amber-500/40 bg-amber-900/10' : 'border-[#2a3f5f] bg-[#0d1720]'}`}>
        <Toggle on={mem.enabled} onChange={v => setMem({ enabled: v })}
          label="Programa de lealtad activo"
          sub="El cajero puede buscar y registrar clientes frecuentes en el POS" />
      </div>

      {mem.enabled && (
        <div className="space-y-5">

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
                <ProductSelect value={mem.triggerProductId} onChange={v => setMem({ triggerProductId: v })} dishes={dishes} />
              </div>
            )}

            <div className={mem.trigger === 'pago_directo' ? 'grid grid-cols-2 gap-3' : ''}>
              {mem.trigger === 'pago_directo' && (
                <div>
                  <label className={lbl}>Precio ($)</label>
                  <input type="number" min={0} className={inp} value={mem.price}
                    onChange={e => setMem({ price: Number(e.target.value) })} />
                </div>
              )}
              <div>
                <label className={lbl}>Vigencia en meses (0 = sin fecha límite)</label>
                <input type="number" min={0} className={inp} value={mem.durationMonths}
                  onChange={e => setMem({ durationMonths: Number(e.target.value) })} />
              </div>
            </div>
          </div>

          {/* Niveles o beneficios únicos */}
          <div className="border border-[#2a3f5f] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-100">
                  {useMultiLevel ? 'Niveles del programa' : '¿Qué recibe el cliente?'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {useMultiLevel
                    ? 'Cada nivel tiene sus propios beneficios'
                    : 'Todos los socios reciben lo mismo'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (useMultiLevel) {
                    if (window.confirm('¿Eliminar todos los niveles? Volverás al programa de un solo nivel.')) {
                      saveTiersToDb([]);
                      setTiers([]);
                    }
                  } else {
                    setEditingTier({ id: '', name: '', color: '#F59E0B', order: 1, trigger: 'manual', triggerProductId: '', price: 0, durationMonths: 12, benefits: { ...DEFAULT_TIER_BENEFITS }, upgradeRule: 'visitas', upgradeThreshold: 0 });
                  }
                }}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors ${useMultiLevel ? 'text-red-400 border-red-800 hover:bg-red-900/20' : 'text-amber-400 border-amber-700 hover:bg-amber-900/20'}`}
              >
                {useMultiLevel ? 'Volver a un nivel' : '+ Múltiples niveles'}
              </button>
            </div>

            {useMultiLevel ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Cada nivel tiene su propia regla de ascenso — configúrala al editar el nivel.</p>

                {/* Lista de niveles */}
                {tiers.map((tier, idx) => (
                  <div key={tier.id} className="flex items-center gap-3 p-3 bg-[#0d1720] border border-[#2a3f5f] rounded-xl">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tier.color }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-100">{tier.name || 'Sin nombre'}</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {idx === 0 || (tier.upgradeThreshold ?? 0) === 0 ? 'Nivel de entrada' :
                          tier.upgradeRule === 'visitas' ? `A partir de ${tier.upgradeThreshold ?? 0} visitas` :
                          tier.upgradeRule === 'gasto'   ? `A partir de $${tier.upgradeThreshold ?? 0} acumulados` :
                          tier.upgradeRule === 'producto' ? 'Por compra de producto' : 'Asignación manual'}
                        {' · '}
                        {[
                          tier.benefits.freeProductEnabled && '☕',
                          tier.benefits.discountEnabled && `${tier.benefits.discountPct}%`,
                          tier.benefits.birthdayEnabled && '🎂',
                        ].filter(Boolean).join(' ') || 'Sin beneficios'}
                      </p>
                    </div>
                    <button onClick={() => setEditingTier({ ...tier })} className="text-blue-400 hover:text-blue-300 p-1"><Edit3 size={13} /></button>
                    <button onClick={() => removeTier(tier.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={13} /></button>
                  </div>
                ))}
                <button
                  onClick={() => setEditingTier({ id: '', name: '', color: '#6B7280', order: tiers.length + 1, trigger: 'manual', triggerProductId: '', price: 0, durationMonths: 12, benefits: { ...DEFAULT_TIER_BENEFITS }, upgradeRule: 'visitas', upgradeThreshold: 0 })}
                  className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-[#2a3f5f] rounded-xl text-sm text-gray-400 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                >
                  <Plus size={14} /> Agregar nivel
                </button>
              </div>
            ) : (
              <BenefitsForm
                b={{
                  freeProductEnabled: mem.freeProductEnabled, freeProductId: mem.freeProductId,
                  freeProductFreq: mem.freeProductFreq, freeProductLabel: mem.freeProductLabel,
                  discountEnabled: mem.discountEnabled, discountPct: mem.discountPct,
                  discountScope: mem.discountScope, discountAuto: mem.discountAuto,
                  priceTagEnabled: mem.priceTagEnabled, priceTagLabel: mem.priceTagLabel,
                  pointsEnabled: mem.pointsEnabled, pointsMultiplier: mem.pointsMultiplier,
                  birthdayEnabled: mem.birthdayEnabled, birthdayType: mem.birthdayType,
                  birthdayDiscountPct: mem.birthdayDiscountPct, birthdayProductId: mem.birthdayProductId,
                  birthdayLabel: mem.birthdayLabel,
                }}
                onChange={b => setMem({
                  freeProductEnabled: b.freeProductEnabled, freeProductId: b.freeProductId,
                  freeProductFreq: b.freeProductFreq, freeProductLabel: b.freeProductLabel,
                  discountEnabled: b.discountEnabled, discountPct: b.discountPct,
                  discountScope: b.discountScope, discountAuto: b.discountAuto,
                  priceTagEnabled: b.priceTagEnabled, priceTagLabel: b.priceTagLabel,
                  birthdayEnabled: b.birthdayEnabled, birthdayType: b.birthdayType,
                  birthdayDiscountPct: b.birthdayDiscountPct, birthdayProductId: b.birthdayProductId,
                  birthdayLabel: b.birthdayLabel,
                })}
                dishes={dishes}
              />
            )}
          </div>

          {/* Preview del cajero — solo en modo un nivel */}
          {!useMultiLevel && hasReward && (
            <div className="p-4 bg-[#0d1720] border border-[#2a3f5f] rounded-xl">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Así lo ve el cajero:</p>
              <p className="text-sm text-gray-300 mb-2">👤 Ana García — <span className="text-green-400 font-semibold">SOCIA ACTIVA</span></p>
              {mem.freeProductEnabled && <p className="text-sm text-amber-400">☕ {mem.freeProductLabel || 'Beneficio del día'} — DISPONIBLE</p>}
              {mem.discountEnabled && mem.discountPct > 0 && <p className="text-sm text-green-400">💚 {mem.discountPct}% {mem.discountAuto ? '(automático)' : '(el cajero activa)'}</p>}
              {mem.birthdayEnabled && <p className="text-sm text-pink-400">🎂 HOY ES SU CUMPLEAÑOS</p>}
            </div>
          )}

        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-[#1B3A6B] px-6 py-3 rounded-xl text-sm font-bold transition-colors w-full">
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </button>

      {editingTier !== null && (
        <TierEditor
          tier={editingTier}
          dishes={dishes}
          saving={savingTiers}
          onSave={handleSaveTier}
          onClose={() => setEditingTier(null)}
        />
      )}
    </div>
  );
}
