'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Star, Users, Gift, ChevronRight, ChevronLeft, Check, Info,
         Plus, Trash2, Edit3 } from 'lucide-react';
import { useLoyaltyConfig, MembershipTier, MembershipTierBenefits, DEFAULT_TIER_BENEFITS } from '@/hooks/useLoyaltyConfig';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Tipos importados desde el hook para consistencia de tipos

const COLORS = [
  { id: 'amber',  hex: '#D97706', label: 'Ámbar'   },
  { id: 'slate',  hex: '#64748B', label: 'Plata'   },
  { id: 'yellow', hex: '#CA8A04', label: 'Gold'    },
  { id: 'cyan',   hex: '#0891B2', label: 'Diamond' },
  { id: 'purple', hex: '#7C3AED', label: 'Morado'  },
  { id: 'green',  hex: '#059669', label: 'Verde'   },
];

// DEFAULT_TIER_BENEFITS viene del hook como DEFAULT_TIER_BENEFITS

const NEW_TIER = (): MembershipTier => ({
  id: `tier_${Date.now()}`, name: '', color: '#D97706', order: 1,
  trigger: 'manual', triggerProductId: '', price: 0, durationMonths: 12,
  benefits: { ...DEFAULT_TIER_BENEFITS },
});

// ── Estilos base ──────────────────────────────────────────────────────────────
const INP = "w-full border border-[#2a3f5f] rounded-lg px-3 py-2 text-sm bg-[#0f1923] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400";
const SEL = "w-full border border-[#2a3f5f] rounded-lg px-3 py-2 text-sm bg-[#0f1923] text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400";
const LBL = "text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5";
const CARD = (on: boolean, accent: string) =>
  `border rounded-xl p-4 transition-all ${on ? `border-${accent}-500/40 bg-${accent}-900/10` : 'border-[#2a3f5f]'}`;

const Tip = ({ text }: { text: string }) => (
  <div className="flex gap-2 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
    <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
    <p className="text-xs text-blue-300">{text}</p>
  </div>
);

const Toggle = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <div onClick={() => onChange(!on)} className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-amber-600' : 'bg-gray-700'}`}>
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </div>
    <span className="text-sm text-gray-300">{label}</span>
  </label>
);

type Dish = { id: string; name: string; price: number; group: string };

const ProductSelect = ({ value, onSelect, dishes }: { value: string; onSelect: (id: string) => void; dishes: Dish[] }) => (
  <select className={SEL} value={value} onChange={e => onSelect(e.target.value)}>
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

// ── Editor de beneficios ──────────────────────────────────────────────────────
function BenefitsEditor({ benefits: b, onChange, dishes }: {
  benefits: MembershipTierBenefits; onChange: (b: MembershipTierBenefits) => void; dishes: Dish[];
}) {
  const upd = (patch: Partial<MembershipTierBenefits>) => onChange({ ...b, ...patch });

  return (
    <div className="space-y-3">
      {/* Producto gratis */}
      <div className={CARD(b.freeProductEnabled, 'amber')}>
        <Toggle on={b.freeProductEnabled} onChange={v => upd({ freeProductEnabled: v })} label="Bebida o platillo gratis" />
        {b.freeProductEnabled && <div className="mt-3 space-y-3 pl-14">
          <div><label className={LBL}>¿Qué producto?</label><ProductSelect value={b.freeProductId} onSelect={id => upd({ freeProductId: id })} dishes={dishes} /></div>
          <div><label className={LBL}>Frecuencia</label>
            <select className={SEL} value={b.freeProductFreq} onChange={e => upd({ freeProductFreq: e.target.value as any })}>
              <option value="diario">Una vez al día</option>
              <option value="visita">Una vez por visita (ilimitado)</option>
              <option value="semanal">Una vez por semana</option>
            </select>
          </div>
          <div><label className={LBL}>Etiqueta en el POS</label>
            <input className={INP} placeholder="Café del día" value={b.freeProductLabel} onChange={e => upd({ freeProductLabel: e.target.value })} />
          </div>
          {b.freeProductFreq !== 'visita' && <Tip text="Cross-sucursal: el contador es compartido en todas las sucursales del restaurante." />}
        </div>}
      </div>

      {/* Descuento */}
      <div className={CARD(b.discountEnabled, 'green')}>
        <Toggle on={b.discountEnabled} onChange={v => upd({ discountEnabled: v })} label="Descuento en sus compras" />
        {b.discountEnabled && <div className="mt-3 space-y-3 pl-14">
          <div className="flex items-center gap-3">
            <input type="number" min={1} max={80} className={INP + ' max-w-[100px]'} value={b.discountPct} onChange={e => upd({ discountPct: Number(e.target.value) })} />
            <span className="text-gray-300 text-sm">% de descuento</span>
          </div>
          <div><label className={LBL}>¿Sobre qué aplica?</label>
            <select className={SEL} value={b.discountScope} onChange={e => upd({ discountScope: e.target.value as any })}>
              <option value="orden">Toda la orden (platillos + bebidas + extras)</option>
              <option value="platillos">Solo platillos del menú</option>
            </select>
          </div>
          <div><label className={LBL}>¿Cómo se aplica?</label>
            <select className={SEL} value={b.discountAuto ? 'auto' : 'manual'} onChange={e => upd({ discountAuto: e.target.value === 'auto' })}>
              <option value="auto">Automático — siempre que el socio compre</option>
              <option value="manual">El cajero lo activa cuando el socio lo solicita</option>
            </select>
          </div>
        </div>}
      </div>

      {/* Precio especial */}
      <div className={CARD(b.priceTagEnabled, 'blue')}>
        <Toggle on={b.priceTagEnabled} onChange={v => upd({ priceTagEnabled: v })} label="Precio especial de socio" />
        {b.priceTagEnabled && <div className="mt-3 space-y-2 pl-14">
          <label className={LBL}>Etiqueta para el cajero</label>
          <input className={INP} placeholder="Precio de socio" value={b.priceTagLabel} onChange={e => upd({ birthdayLabel: e.target.value })} />
          <Tip text="El cajero ve esta etiqueta en azul y aplica el precio manualmente según tu política." />
        </div>}
      </div>

      {/* Puntos extra */}
      <div className={CARD(b.pointsEnabled, 'purple')}>
        <Toggle on={b.pointsEnabled} onChange={v => upd({ pointsEnabled: v })} label="Acumula puntos más rápido" />
        {b.pointsEnabled && <div className="mt-3 pl-14">
          <label className={LBL}>Multiplicador</label>
          <select className={SEL} value={b.pointsMultiplier} onChange={e => upd({ pointsMultiplier: Number(e.target.value) })}>
            <option value={1.5}>1.5x — 50% más puntos</option>
            <option value={2}>2x — el doble de puntos</option>
            <option value={3}>3x — el triple de puntos</option>
          </select>
        </div>}
      </div>

      {/* Cumpleaños */}
      <div className={CARD(b.birthdayEnabled, 'pink')}>
        <Toggle on={b.birthdayEnabled} onChange={v => upd({ birthdayEnabled: v })} label="Beneficio especial de cumpleaños 🎂" />
        {b.birthdayEnabled && <div className="mt-3 space-y-3 pl-14">
          <Tip text="El sistema avisa automáticamente al cajero cuando el socio visita en su cumpleaños." />
          <div><label className={LBL}>¿Qué recibe?</label>
            <select className={SEL} value={b.birthdayType} onChange={e => upd({ birthdayType: e.target.value as any })}>
              <option value="descuento">Descuento especial ese día</option>
              <option value="producto_gratis">Producto gratis ese día</option>
            </select>
          </div>
          {b.birthdayType === 'descuento' && (
            <div className="flex items-center gap-3">
              <input type="number" min={1} max={100} className={INP + ' max-w-[100px]'} value={b.birthdayDiscountPct} onChange={e => upd({ birthdayDiscountPct: Number(e.target.value) })} />
              <span className="text-gray-300 text-sm">% de descuento</span>
            </div>
          )}
          {b.birthdayType === 'producto_gratis' && (
            <div><label className={LBL}>¿Qué producto?</label><ProductSelect value={b.birthdayProductId} onSelect={id => upd({ birthdayProductId: id })} dishes={dishes} /></div>
          )}
          <div><label className={LBL}>Mensaje para el cajero</label>
            <input className={INP} placeholder="¡Feliz cumpleaños! Aplica descuento especial" value={b.birthdayLabel} onChange={e => upd({ birthdayLabel: e.target.value })} />
          </div>
        </div>}
      </div>
    </div>
  );
}

// ── Preview del cajero ────────────────────────────────────────────────────────
function CajeroPreview({ tier }: { tier: MembershipTier }) {
  const b = tier.benefits;
  const any = b.freeProductEnabled || b.discountEnabled || b.priceTagEnabled || b.pointsEnabled || b.birthdayEnabled;
  if (!any) return null;
  const hex = COLORS.find(c => c.id === tier.color)?.hex ?? '#D97706';
  return (
    <div className="p-4 bg-[#0d1720] border border-[#2a3f5f] rounded-xl">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vista del cajero en el POS:</p>
      <p className="text-sm text-gray-300 mb-1.5">👤 Ana García — <span className="font-bold" style={{ color: hex }}>SOCIA {(tier.name || 'NIVEL').toUpperCase()}</span></p>
      {b.freeProductEnabled && <p className="text-sm text-amber-400">☕ {b.freeProductLabel || 'Bebida del día'} — DISPONIBLE HOY</p>}
      {b.priceTagEnabled && <p className="text-sm text-blue-400">🏷️ {b.priceTagLabel || 'Precio de socio'}</p>}
      {b.discountEnabled && b.discountPct > 0 && <p className="text-sm text-green-400">💚 {b.discountPct}% {b.discountAuto ? '(automático)' : '(el cajero activa)'}</p>}
      {b.pointsEnabled && <p className="text-sm text-purple-400">⭐ Acumula puntos {b.pointsMultiplier}x</p>}
      {b.birthdayEnabled && <p className="text-sm text-pink-400">🎂 HOY ES SU CUMPLEAÑOS — {b.birthdayLabel}</p>}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
type Step = 'overview' | 'points' | 'tiers' | 'tier_edit';

export default function LoyaltyConfig() {
  const { appUser } = useAuth();
  const { config, loading, saving, save } = useLoyaltyConfig(appUser?.tenantId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const supabase = useMemo(() => createClient(), []);  // estable — no recrear en cada render

  const [draft, setDraft]         = useState(config);
  const [tiers, setTiers]         = useState<MembershipTier[]>([]);
  const [editingTier, setEditing] = useState<MembershipTier | null>(null);
  const [step, setStep]           = useState<Step>('overview');
  const [dishes, setDishes]       = useState<Dish[]>([]);
  const [savingT, setSavingT]     = useState(false);

  useEffect(() => { if (!loading) setDraft(config); }, [loading, config]);

  useEffect(() => {
    const tid = appUser?.tenantId; if (!tid) return;
    Promise.all([
      supabase.from('dishes').select('id,name,price').eq('tenant_id', tid).eq('available', true).order('name'),
      supabase.from('extras_catalog').select('id,name,price').eq('tenant_id', tid).eq('is_active', true).order('name'),
    ]).then(([dr, er]) => setDishes([
      ...(dr.data ?? []).map(d => ({ id: d.id, name: d.name, price: Number(d.price), group: 'Platillos del menú' })),
      ...(er.data ?? []).map(e => ({ id: e.id, name: e.name, price: Number(e.price), group: 'Tienda de extras'   })),
    ]));
  }, [supabase, appUser?.tenantId]);

  useEffect(() => {
    const tid = appUser?.tenantId; if (!tid) return;
    supabase.from('system_config').select('config_value')
      .eq('tenant_id', tid).eq('config_key', 'loyalty_membership_tiers').single()
      .then(({ data }) => { try { setTiers(JSON.parse(data?.config_value ?? '[]')); } catch { setTiers([]); } });
  }, [supabase, appUser?.tenantId]);

  const saveTiers = useCallback(async (next: MembershipTier[]) => {
    const tid = appUser?.tenantId; if (!tid) return;
    setSavingT(true);
    await supabase.from('system_config').upsert(
      [{ tenant_id: tid, config_key: 'loyalty_membership_tiers', config_value: JSON.stringify(next) }],
      { onConflict: 'tenant_id,config_key' }
    );
    setTiers(next); setSavingT(false); toast.success('Niveles guardados');
  }, [supabase, appUser?.tenantId]);

  const saveConfig = async () => {
    await save({ ...draft, tiers });   // incluir tiers del estado local
    toast.success('Configuración guardada');
  };

  if (loading || !draft) return <div className="text-sm text-gray-400 py-12 text-center">Cargando configuración...</div>;

  // OVERVIEW ──────────────────────────────────────────────────────────────────
  if (step === 'overview') return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold text-gray-100">Configuración de lealtad</h2>
        <p className="text-sm text-gray-400 mt-1">Programa de puntos y membresías — independientes y combinables.</p>
      </div>

      {/* Puntos */}
      <div onClick={() => setStep('points')} className={`border rounded-xl p-5 cursor-pointer hover:border-amber-500/40 transition-all ${draft.points.enabled ? 'border-amber-500/40 bg-amber-900/10' : 'border-[#2a3f5f]'}`}>
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${draft.points.enabled ? 'bg-amber-600' : 'bg-[#0d1720]'}`}>
              <Star size={18} className={draft.points.enabled ? 'text-white' : 'text-gray-500'} />
            </div>
            <div>
              <p className="font-semibold text-gray-100">Programa de puntos</p>
              <p className="text-xs text-gray-500 mt-0.5">{draft.points.enabled ? `$${draft.points.pesosPerPoint} = 1 pto · Mínimo: ${draft.points.minRedeemPoints} pts` : 'Acumula puntos, canjéalos por descuentos'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${draft.points.enabled ? 'bg-green-900/40 text-green-400' : 'bg-[#0d1720] text-gray-500'}`}>{draft.points.enabled ? 'Activo' : 'Inactivo'}</span>
            <ChevronRight size={16} className="text-gray-500" />
          </div>
        </div>
      </div>

      {/* Membresía */}
      <div onClick={() => setStep('tiers')} className={`border rounded-xl p-5 cursor-pointer hover:border-purple-500/40 transition-all ${tiers.length > 0 ? 'border-purple-500/40 bg-purple-900/10' : 'border-[#2a3f5f]'}`}>
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tiers.length > 0 ? 'bg-purple-700' : 'bg-[#0d1720]'}`}>
              <Users size={18} className={tiers.length > 0 ? 'text-white' : 'text-gray-500'} />
            </div>
            <div>
              <p className="font-semibold text-gray-100">Membresía — niveles</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {tiers.length === 0 ? 'Sin niveles — configura el primero'
                  : tiers.length === 1 ? `1 nivel: ${tiers[0].name}`
                  : `${tiers.length} niveles: ${tiers.map(t => t.name).join(' · ')}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${tiers.length > 0 ? 'bg-green-900/40 text-green-400' : 'bg-[#0d1720] text-gray-500'}`}>{tiers.length > 0 ? `${tiers.length} nivel${tiers.length > 1 ? 'es' : ''}` : 'Sin configurar'}</span>
            <ChevronRight size={16} className="text-gray-500" />
          </div>
        </div>
        {tiers.length > 1 && (
          <div className="flex gap-2 mt-3 pl-13">
            {tiers.map(t => { const hex = COLORS.find(c => c.id === t.color)?.hex ?? '#D97706'; return (
              <span key={t.id} className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: hex }}>{t.name}</span>
            );})}
          </div>
        )}
      </div>

      {(draft.points.enabled || tiers.length > 0) && (
        <div className="flex gap-2 p-3 bg-green-900/20 border border-green-800 rounded-lg">
          <Check size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-300">Las transacciones de lealtad aparecen en el P&L: ingresos por membresías, costo de beneficios y descuentos aplicados.</p>
        </div>
      )}
      <button onClick={saveConfig} disabled={saving} className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors">
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  );

  // PUNTOS ────────────────────────────────────────────────────────────────────
  if (step === 'points') return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('overview')} className="text-gray-400 hover:text-gray-200"><ChevronLeft size={20} /></button>
        <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2"><Star size={18} className="text-amber-500" /> Programa de puntos</h2>
      </div>
      <Toggle on={draft.points.enabled} onChange={v => setDraft(d => ({ ...d, points: { ...d.points, enabled: v } }))} label="Activar programa de puntos" />
      {draft.points.enabled && (
        <div className="grid grid-cols-2 gap-4">
          {([
            { label: 'Pesos por punto', hint: '$X gastados = 1 punto', key: 'pesosPerPoint', min: 1, step: 1 },
            { label: 'Valor del punto ($)', hint: 'Descuento por punto canjeado', key: 'pointValue', min: 0.1, step: 0.1 },
            { label: 'Mínimo para canjear', hint: 'Puntos necesarios para usar', key: 'minRedeemPoints', min: 1, step: 1 },
          ] as any[]).map(f => (
            <div key={f.key}>
              <label className={LBL}>{f.label}</label>
              <input type="number" min={f.min} step={f.step} className={INP} value={(draft.points as any)[f.key]}
                onChange={e => setDraft(d => ({ ...d, points: { ...d.points, [f.key]: Number(e.target.value) } }))} />
              <p className="text-xs text-gray-500 mt-1">{f.hint}</p>
            </div>
          ))}
          <div>
            <label className={LBL}>Expiración</label>
            <select className={SEL} value={draft.points.expireDays ?? ''}
              onChange={e => setDraft(d => ({ ...d, points: { ...d.points, expireDays: e.target.value ? Number(e.target.value) : null } }))}>
              <option value="">Sin vencimiento</option>
              <option value="90">90 días</option>
              <option value="180">6 meses</option>
              <option value="365">1 año</option>
            </select>
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={() => setStep('overview')} className="border border-[#2a3f5f] px-5 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-[#0d1720]">Atrás</button>
        <button onClick={saveConfig} disabled={saving} className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </div>
  );

  // LISTA DE NIVELES ──────────────────────────────────────────────────────────
  if (step === 'tiers') return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('overview')} className="text-gray-400 hover:text-gray-200"><ChevronLeft size={20} /></button>
        <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2"><Users size={18} className="text-purple-400" /> Niveles de membresía</h2>
      </div>
      <p className="text-sm text-gray-400">Cada nivel tiene su propio trigger y beneficios. Si solo tienes un tipo de membresía, crea solo un nivel.</p>

      {tiers.length === 0 && (
        <div className="border border-dashed border-[#2a3f5f] rounded-xl p-8 text-center">
          <Users size={32} className="mx-auto text-gray-600 mb-3" />
          <p className="text-sm text-gray-400">Sin niveles configurados</p>
          <p className="text-xs text-gray-600 mt-1">Crea el primero para activar el programa de membresía</p>
        </div>
      )}

      <div className="space-y-3">
        {tiers.map((tier, idx) => {
          const hex = COLORS.find(c => c.id === tier.color)?.hex ?? '#D97706';
          const nb = Object.values(tier.benefits).filter((b: any) => b.enabled).length;
          return (
            <div key={tier.id} className="flex items-center gap-3 p-4 border border-[#2a3f5f] rounded-xl hover:border-[#3a5f92] transition-colors">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: hex }}>{idx + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-100">{tier.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {tier.trigger === 'manual' ? 'Registro manual' : tier.trigger === 'venta_producto' ? 'Al vender producto' : 'Pago directo'}
                  {tier.price > 0 ? ` · $${tier.price}` : ' · Gratis'}
                  {tier.durationMonths > 0 ? ` · ${tier.durationMonths} meses` : ' · Sin vencimiento'}
                  {` · ${nb} beneficio${nb !== 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setEditing({ ...tier }); setStep('tier_edit'); }} className="p-2 text-gray-400 hover:text-gray-200 hover:bg-[#1a2535] rounded-lg transition-colors"><Edit3 size={15} /></button>
                <button onClick={() => saveTiers(tiers.filter(t => t.id !== tier.id))} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => { setEditing(NEW_TIER()); setStep('tier_edit'); }}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#2a3f5f] hover:border-purple-500/50 rounded-xl py-3 text-sm text-gray-400 hover:text-gray-200 transition-colors">
        <Plus size={16} /> Agregar nivel
      </button>
    </div>
  );

  // EDITAR NIVEL ──────────────────────────────────────────────────────────────
  if (step === 'tier_edit' && editingTier) {
    const setT = (patch: Partial<MembershipTier>) => setEditing(t => t ? { ...t, ...patch } : t);
    const isNew = !tiers.find(t => t.id === editingTier.id);

    const handleSaveTier = async () => {
      if (!editingTier.name.trim()) { toast.error('El nivel necesita un nombre'); return; }
      await saveTiers(isNew ? [...tiers, editingTier] : tiers.map(t => t.id === editingTier.id ? editingTier : t));
      setStep('tiers');
    };

    return (
      <div className="space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('tiers')} className="text-gray-400 hover:text-gray-200"><ChevronLeft size={20} /></button>
          <h2 className="text-xl font-semibold text-gray-100">{isNew ? 'Nuevo nivel' : `Editar: ${editingTier.name}`}</h2>
        </div>

        {/* Nombre y color */}
        <div className="p-4 border border-[#2a3f5f] rounded-xl space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Identidad del nivel</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LBL}>Nombre *</label>
              <input className={INP} placeholder="Ej: Básico, Plata, Gold" value={editingTier.name} onChange={e => setT({ name: e.target.value })} />
            </div>
            <div>
              <label className={LBL}>Color</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {COLORS.map(c => (
                  <button key={c.id} onClick={() => setT({ color: c.id })} title={c.label}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${editingTier.color === c.id ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c.hex }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trigger */}
        <div className="p-4 border border-[#2a3f5f] rounded-xl space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">¿Cómo se activa este nivel?</p>
          <div className="space-y-2">
            {[
              { val: 'manual',          label: 'El staff lo registra manualmente',  desc: 'El cajero registra al socio cuando entregue el produto o corresponda' },
              { val: 'venta_producto',  label: 'Al vender un producto del menú',    desc: 'Se activa automáticamente al vender el produto seleccionado' },
              { val: 'pago_directo',    label: 'El cliente paga la membresía',      desc: 'El cliente paga una cuota para pertenecer a este nivel' },
            ].map(opt => (
              <label key={opt.val} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${editingTier.trigger === opt.val ? 'border-purple-500/50 bg-purple-900/10' : 'border-[#2a3f5f] hover:border-[#3a5f92]'}`}>
                <input type="radio" className="mt-0.5" checked={editingTier.trigger === opt.val} onChange={() => setT({ trigger: opt.val as any })} />
                <div>
                  <p className="text-sm font-medium text-gray-200">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
          {editingTier.trigger === 'venta_producto' && (
            <div>
              <label className={LBL}>¿Qué produto activa este nivel?</label>
              <ProductSelect value={editingTier.triggerProductId} onSelect={id => setT({ triggerProductId: id })} dishes={dishes} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {editingTier.trigger === 'pago_directo' && (
              <div>
                <label className={LBL}>Precio (MXN)</label>
                <input type="number" min={0} className={INP} value={editingTier.price} onChange={e => setT({ price: Number(e.target.value) })} />
              </div>
            )}
            <div>
              <label className={LBL}>Duración de la membresía</label>
              <select className={SEL} value={editingTier.durationMonths} onChange={e => setT({ durationMonths: Number(e.target.value) })}>
                <option value={0}>Sin vencimiento</option>
                <option value={1}>1 mes</option>
                <option value={3}>3 meses</option>
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
                <option value={24}>24 meses</option>
              </select>
            </div>
          </div>
        </div>

        {/* Beneficios */}
        <div className="p-4 border border-[#2a3f5f] rounded-xl space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">¿Qué recibe el socio de este nivel?</p>
          <BenefitsEditor benefits={editingTier.benefits} onChange={b => setT({ benefits: b })} dishes={dishes} />
        </div>

        <CajeroPreview tier={editingTier} />

        <div className="flex gap-3">
          <button onClick={() => setStep('tiers')} className="border border-[#2a3f5f] px-5 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-[#0d1720]">Cancelar</button>
          <button onClick={handleSaveTier} disabled={savingT} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
            {savingT ? 'Guardando...' : 'Guardar nivel'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
