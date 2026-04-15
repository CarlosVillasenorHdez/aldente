'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  MODULE_CATALOG, PLAN_FEATURES, PLAN_NAMES, PLAN_PRICES, PLAN_COLORS,
  BASE_PRICE, calcMedidaPrice, suggestPlan, invalidateFeaturesCache,
  type Features,
} from '@/hooks/useFeatures';
import { Check, Zap, ArrowRight } from 'lucide-react';

const S = {
  bg: '#0f1923', bg2: '#1a2535', border: 'rgba(255,255,255,0.08)',
  text: '#f1f5f9', muted: 'rgba(241,245,249,0.45)', gold: '#d4922a',
};

const BUNDLE_PLANS = [
  {
    key: 'operacion', color: '#4a9eff', bg: 'rgba(74,158,255,0.08)',
    tagline: 'El primer paso digital serio.',
    modules: PLAN_FEATURES['operacion'],
  },
  {
    key: 'negocio', color: '#d4922a', bg: 'rgba(212,146,42,0.08)',
    tagline: 'Opera con números, no con intuición.',
    tag: 'Más popular',
    modules: PLAN_FEATURES['negocio'],
  },
  {
    key: 'empresa', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)',
    tagline: 'Crece sin perder el hilo.',
    modules: PLAN_FEATURES['empresa'],
  },
];

export default function ConfigPlan() {
  const { appUser } = useAuth();
  const supabase = createClient();

  const [currentPlan, setCurrentPlan] = useState<string>('operacion');
  const [activeModules, setActiveModules] = useState<Set<keyof Features>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!appUser?.tenantId) return;
    const { data: tenant } = await supabase
      .from('tenants').select('plan, trial_ends_at').eq('id', appUser.tenantId).single();
    const plan = tenant?.plan ?? 'operacion';
    setCurrentPlan(plan);
    setTrialEndsAt(tenant?.trial_ends_at ?? null);

    if (plan === 'medida') {
      const { data: configs } = await supabase
        .from('system_config').select('config_key, config_value')
        .eq('tenant_id', appUser.tenantId)
        .in('config_key', MODULE_CATALOG.map(m => `feature_${toSnake(m.key)}`));
      const active = new Set<keyof Features>();
      (configs ?? []).forEach((c: any) => {
        const mod = MODULE_CATALOG.find(m => `feature_${toSnake(m.key)}` === c.config_key);
        if (mod && c.config_value === 'true') active.add(mod.key);
      });
      setActiveModules(active);
    } else {
      setActiveModules(new Set(PLAN_FEATURES[plan] ?? []));
    }
    setLoading(false);
  }, [appUser?.tenantId]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  function toSnake(key: string) {
    return key.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  function toggleModule(key: keyof Features) {
    if (currentPlan !== 'medida') return;
    setActiveModules(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function switchToMedida() {
    if (!appUser?.tenantId) return;
    setSaving(true);
    try {
      await supabase.from('tenants').update({ plan: 'medida' }).eq('id', appUser.tenantId);
      // Write module toggles to system_config
      await saveMedidaModules(activeModules);
      setCurrentPlan('medida');
      invalidateFeaturesCache();
      toast.success('Plan "A tu medida" activado');
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }

  async function switchToBundle(planKey: string) {
    if (!appUser?.tenantId) return;
    setSaving(true);
    try {
      await supabase.from('tenants').update({ plan: planKey }).eq('id', appUser.tenantId);
      invalidateFeaturesCache();
      setCurrentPlan(planKey);
      setActiveModules(new Set(PLAN_FEATURES[planKey] ?? []));
      toast.success(`Plan ${PLAN_NAMES[planKey]} activado`);
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }

  async function saveMedidaModules(mods: Set<keyof Features>) {
    if (!appUser?.tenantId) return;
    const upserts = MODULE_CATALOG.map(m => ({
      config_key: `feature_${toSnake(m.key)}`,
      config_value: mods.has(m.key) ? 'true' : 'false',
      tenant_id: appUser.tenantId,
    }));
    await supabase.from('system_config').upsert(upserts, { onConflict: 'tenant_id,config_key' });
    invalidateFeaturesCache();
  }

  async function handleSaveMedida() {
    setSaving(true);
    try {
      await saveMedidaModules(activeModules);
      toast.success('Módulos actualizados — recarga para ver los cambios');
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }

  const medidaTotal = calcMedidaPrice([...activeModules]);
  const suggestion = suggestPlan([...activeModules]);
  const trialDays = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  if (loading) return <div style={{ color: S.muted, padding: 32, textAlign: 'center' }}>Cargando…</div>;

  return (
    <div style={{ maxWidth: 720 }}>

      {/* Trial banner */}
      {trialDays !== null && trialDays >= 0 && (
        <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 24,
          background: trialDays <= 3 ? 'rgba(248,113,113,0.08)' : 'rgba(212,146,42,0.08)',
          border: `1px solid ${trialDays <= 3 ? 'rgba(248,113,113,0.25)' : 'rgba(212,146,42,0.25)'}`,
          display: 'flex', alignItems: 'center', gap: 12 }}>
          <Zap size={16} color={trialDays <= 3 ? '#f87171' : S.gold} />
          <p style={{ fontSize: 13, color: S.text, margin: 0, flex: 1 }}>
            {trialDays === 0
              ? 'Tu período de prueba terminó. Activa un plan para seguir usando Aldente.'
              : `Te quedan ${trialDays} día${trialDays !== 1 ? 's' : ''} de prueba. Todos los módulos están activos durante el trial.`}
          </p>
        </div>
      )}

      {/* ── A TU MEDIDA ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: S.text, margin: 0 }}>
            Plan "A tu medida"
          </h2>
          {currentPlan === 'medida' && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
              background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>ACTIVO</span>
          )}
        </div>
        <p style={{ fontSize: 13, color: S.muted, marginBottom: 20, lineHeight: 1.6 }}>
          Nadie conoce tu negocio mejor que tú. Elige solo lo que necesitas —
          el sidebar mostrará únicamente los módulos que tengas activos.
        </p>

        {/* Base */}
        <div style={{ background: S.bg2, border: S.border, borderRadius: 12, padding: '14px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(212,146,42,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🍽️</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: S.text, margin: '0 0 2px' }}>POS + KDS</p>
            <p style={{ fontSize: 11, color: S.muted, margin: 0 }}>Tomar órdenes, comanda a cocina, cobrar, corte de caja — siempre incluido</p>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: S.gold, flexShrink: 0 }}>${BASE_PRICE}/mes</span>
        </div>

        {/* Module toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {MODULE_CATALOG.map(mod => {
            const active = currentPlan === 'medida' ? activeModules.has(mod.key) : (PLAN_FEATURES[currentPlan] ?? []).includes(mod.key);
            const isMedida = currentPlan === 'medida';
            return (
              <div key={mod.key}
                onClick={() => isMedida && toggleModule(mod.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12,
                  border: `1px solid ${active && isMedida ? 'rgba(212,146,42,0.3)' : S.border}`,
                  background: active && isMedida ? 'rgba(212,146,42,0.06)' : S.bg2,
                  cursor: isMedida ? 'pointer' : 'default',
                  transition: 'all .15s', opacity: !isMedida ? 0.6 : 1 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{mod.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: S.text, margin: '0 0 1px' }}>{mod.label}</p>
                  <p style={{ fontSize: 11, color: S.muted, margin: 0 }}>{mod.desc}</p>
                </div>
                <span style={{ fontSize: 12, color: active ? S.gold : S.muted, fontWeight: 600, flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
                  +${mod.price}/mes
                </span>
                {isMedida && (
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${active ? S.gold : S.border}`,
                    background: active ? S.gold : 'transparent', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                    {active && <Check size={13} color="#080b10" strokeWidth={3} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Total + suggestion */}
        {currentPlan === 'medida' && (
          <div style={{ background: S.bg2, borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: suggestion ? 12 : 0 }}>
              <span style={{ fontSize: 13, color: S.muted }}>Total mensual</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: S.gold }}>${medidaTotal.toLocaleString('es-MX')}/mes</span>
            </div>
            {suggestion && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(52,211,153,0.08)',
                border: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Zap size={14} color="#34d399" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: '#34d399', margin: 0, flex: 1 }}>
                  Con los módulos que elegiste, el Plan {PLAN_NAMES[suggestion.plan]} te ahorraría
                  <strong> ${suggestion.savings}/mes</strong> e incluye módulos adicionales.
                </p>
                <button onClick={() => switchToBundle(suggestion!.plan)} disabled={saving}
                  style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.3)',
                    background: 'rgba(52,211,153,0.12)', color: '#34d399', fontSize: 11,
                    fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  Cambiar <ArrowRight size={10} style={{ display: 'inline', marginLeft: 2 }} />
                </button>
              </div>
            )}
          </div>
        )}

        {currentPlan === 'medida' ? (
          <button onClick={handleSaveMedida} disabled={saving}
            style={{ padding: '11px 24px', borderRadius: 10, border: 'none',
              background: saving ? 'rgba(212,146,42,0.4)' : S.gold, color: '#080b10',
              fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        ) : (
          <button onClick={switchToMedida} disabled={saving}
            style={{ padding: '11px 24px', borderRadius: 10,
              border: '1px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.08)',
              color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
            Cambiar a "A tu medida"
          </button>
        )}
      </div>

      {/* ── BUNDLE PLANS ────────────────────────────────────────────────────── */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: S.text, marginBottom: 6 }}>Planes bundle</h2>
        <p style={{ fontSize: 13, color: S.muted, marginBottom: 20, lineHeight: 1.6 }}>
          Todo incluido, precio fijo. Si usas 3 o más módulos del siguiente nivel, el bundle siempre te conviene más.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {BUNDLE_PLANS.map(p => {
            const isActive = currentPlan === p.key;
            const allModules = [...p.modules];
            const modulesCost = BASE_PRICE + allModules.reduce((s, k) => {
              const m = MODULE_CATALOG.find(m => m.key === k);
              return s + (m?.price ?? 0);
            }, 0);
            const savings = modulesCost - PLAN_PRICES[p.key];
            return (
              <div key={p.key} style={{ background: isActive ? p.bg : S.bg2,
                border: `1px solid ${isActive ? p.color : S.border}`,
                borderRadius: 14, padding: '18px 20px', transition: 'all .15s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: p.color }}>{PLAN_NAMES[p.key]}</span>
                      {(p as any).tag && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 10,
                          background: `${p.color}25`, color: p.color }}>{(p as any).tag}</span>
                      )}
                      {isActive && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 10,
                          background: `${p.color}20`, color: p.color }}>ACTIVO</span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: S.muted, margin: 0 }}>{p.tagline}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: p.color }}>
                      ${PLAN_PRICES[p.key].toLocaleString('es-MX')}
                      <span style={{ fontSize: 12, fontWeight: 400, color: S.muted }}>/mes</span>
                    </div>
                    {savings > 0 && (
                      <div style={{ fontSize: 11, color: '#34d399', marginTop: 2 }}>
                        Ahorras ${savings}/mes vs módulos
                      </div>
                    )}
                  </div>
                </div>

                {/* Modules included */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20,
                    background: `${p.color}15`, color: p.color, border: `1px solid ${p.color}30` }}>
                    🍽️ POS + KDS
                  </span>
                  {allModules.map(k => {
                    const mod = MODULE_CATALOG.find(m => m.key === k);
                    if (!mod) return null;
                    return (
                      <span key={k} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20,
                        background: `${p.color}15`, color: p.color, border: `1px solid ${p.color}30` }}>
                        {mod.icon} {mod.label}
                      </span>
                    );
                  })}
                </div>

                {!isActive && (
                  <button onClick={() => switchToBundle(p.key)} disabled={saving}
                    style={{ padding: '9px 20px', borderRadius: 10, border: `1px solid ${p.color}50`,
                      background: `${p.color}15`, color: p.color, fontSize: 13,
                      fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
                    {saving ? 'Cambiando…' : `Activar plan ${PLAN_NAMES[p.key]}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
