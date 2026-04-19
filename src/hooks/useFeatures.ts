'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Features {
  meseroMovil: boolean;
  inventario: boolean;
  gastos: boolean;
  reportes: boolean;
  reservaciones: boolean;
  lealtad: boolean;
  extrasStore: boolean;
  alarmas: boolean;
  recursosHumanos: boolean;
  delivery: boolean;
  multiSucursal: boolean;
}

// ── Módulos individuales con precio ──────────────────────────────────────────
export const MODULE_CATALOG: {
  key: keyof Features;
  label: string;
  desc: string;
  price: number;
  icon: string;
}[] = [
  { key: 'meseroMovil',     label: 'Mesero Móvil',       desc: 'Tomar órdenes desde el celular del mesero',                          price: 150, icon: '📱' },
  { key: 'inventario',      label: 'Inventario',          desc: 'Stock en tiempo real, recetas, alertas de merma y analítica',         price: 200, icon: '📦' },
  { key: 'reportes',        label: 'P&L + Reportes',      desc: 'Costos reales, margen por platillo, reportes de ventas',              price: 200, icon: '📊' },
  { key: 'gastos',          label: 'Gastos',              desc: 'Gastos fijos, variables, depreciaciones y proveedores',               price: 100, icon: '🧾' },
  { key: 'reservaciones',   label: 'Reservaciones',       desc: 'Agenda de reservas, link público para clientes',                      price: 150, icon: '📅' },
  { key: 'lealtad',         label: 'Lealtad',             desc: 'Puntos, niveles, canjes, auto-expiración y WhatsApp',                 price: 150, icon: '⭐' },
  { key: 'extrasStore',     label: 'Tienda de Extras',    desc: 'Venta de membresías, merch y productos fuera del menú',              price: 100, icon: '🛍️' },
  { key: 'alarmas',         label: 'Alarmas',             desc: 'Alertas de stock bajo, órdenes lentas, picos de venta',              price: 100, icon: '🔔' },
  { key: 'recursosHumanos', label: 'RRHH',                desc: 'Nómina, turnos, vacaciones, permisos, prima cost',                    price: 150, icon: '👥' },
  { key: 'delivery',        label: 'Delivery',            desc: 'Órdenes a domicilio, zonas, tracking',                               price: 150, icon: '🛵' },
  { key: 'multiSucursal',   label: 'Multi-sucursal',      desc: 'Hasta 5 sucursales, dashboard centralizado',                         price: 350, icon: '🏪' },
];

export const BASE_PRICE = 399; // POS + KDS incluido

// ── Planes bundle ─────────────────────────────────────────────────────────────
export const PLAN_FEATURES: Record<string, (keyof Features)[]> = {
  operacion: ['meseroMovil'],
  negocio:   ['meseroMovil','inventario','gastos','reservaciones','lealtad','extrasStore','reportes','alarmas'],
  empresa:   ['meseroMovil','inventario','gastos','reservaciones','lealtad','extrasStore','reportes','alarmas','recursosHumanos','delivery','multiSucursal'],
};

export const PLAN_NAMES: Record<string, string> = {
  medida:    'A tu medida',
  operacion: 'Operación',
  negocio:   'Negocio',
  empresa:   'Empresa',
};

export const PLAN_PRICES: Record<string, number> = {
  medida:    399, // base price — modules add on top
  operacion: 699,
  negocio:   1299,
  empresa:   2199,
};

export const PLAN_COLORS: Record<string, string> = {
  medida:    '#60a5fa',
  operacion: '#4a9eff',
  negocio:   '#c9963a',
  empresa:   '#a78bfa',
};

export const PLAN_ORDER = ['medida', 'operacion', 'negocio', 'empresa'];

export const DEFAULT_FEATURES: Features = {
  meseroMovil: true, inventario: false, gastos: false,
  reportes: false, reservaciones: false, lealtad: false,
  extrasStore: false, alarmas: false, recursosHumanos: false,
  delivery: false, multiSucursal: false,
};

// ── Legacy name normalization ─────────────────────────────────────────────────
const PLAN_LEGACY: Record<string, string> = {
  basico: 'operacion', starter: 'operacion',
  estandar: 'negocio', profesional: 'negocio',
  premium: 'empresa', enterprise: 'empresa',
};

function planToFeatures(plan: string): Features {
  if (plan === 'medida') {
    // "A tu medida" features are loaded from system_config, not here
    return DEFAULT_FEATURES;
  }
  const allowed = PLAN_FEATURES[plan] ?? Object.keys(DEFAULT_FEATURES) as (keyof Features)[];
  const f = { ...DEFAULT_FEATURES };
  (Object.keys(f) as (keyof Features)[]).forEach(k => {
    f[k] = allowed.includes(k);
  });
  return f;
}

// Module-level cache
let _cachedPlan: string | null = null;
let _cachedFeatures: Features | null = null;

export function invalidateFeaturesCache() { _cachedPlan = null; _cachedFeatures = null; }

export function useFeatures(): { features: Features; plan: string; loading: boolean } {
  const { appUser } = useAuth();
  const [features, setFeatures] = useState<Features>(_cachedFeatures ?? DEFAULT_FEATURES);
  const [plan, setPlan] = useState<string>(_cachedPlan ?? 'operacion');
  const [loading, setLoading] = useState(!_cachedFeatures);

  useEffect(() => {
    if (!appUser?.tenantId) return;
    if (_cachedPlan) { setFeatures(_cachedFeatures!); setPlan(_cachedPlan); setLoading(false); return; }

    const supabase = createClient();

    supabase.from('tenants').select('plan').eq('id', appUser.tenantId).single()
      .then(async ({ data }) => {
        const rawPlan = data?.plan ?? 'operacion';
        const p = PLAN_LEGACY[rawPlan] ?? rawPlan;

        let f: Features;

        if (p === 'medida') {
          // Load individual module toggles from system_config
          const { data: configs } = await supabase
            .from('system_config')
            .select('config_key, config_value')
            .eq('tenant_id', appUser.tenantId)
            .in('config_key', MODULE_CATALOG.map(m => `feature_${m.key.replace(/([A-Z])/g, '_$1').toLowerCase()}`));

          f = { ...DEFAULT_FEATURES };
          (configs ?? []).forEach((c: any) => {
            // Map config key back to feature key
            const mod = MODULE_CATALOG.find(m =>
              `feature_${m.key.replace(/([A-Z])/g, '_$1').toLowerCase()}` === c.config_key
            );
            if (mod) f[mod.key] = c.config_value === 'true';
          });
        } else {
          f = planToFeatures(p);
        }

        _cachedPlan = p;
        _cachedFeatures = f;
        setFeatures(f);
        setPlan(p);
        setLoading(false);
      });
  }, [appUser?.tenantId]); // eslint-disable-line

  return { features, plan, loading };
}

// Legacy compat
export const FEATURE_KEYS: Record<keyof Features, string> = {
  meseroMovil: 'feature_mesero_movil', inventario: 'feature_inventario',
  gastos: 'feature_gastos', reportes: 'feature_reportes',
  reservaciones: 'feature_reservaciones', lealtad: 'feature_lealtad',
  extrasStore: 'feature_extras_store',
  alarmas: 'feature_alarmas', recursosHumanos: 'feature_recursos_humanos',
  delivery: 'feature_delivery', multiSucursal: 'feature_multi_sucursal',
};

export function planMeetsRequirement(currentPlan: string, requiredPlan: string): boolean {
  return PLAN_ORDER.indexOf(currentPlan) >= PLAN_ORDER.indexOf(requiredPlan);
}

// ── Pricing calculator for "A tu medida" ────────────────────────────────────
export function calcMedidaPrice(activeModules: (keyof Features)[]): number {
  const modulesTotal = MODULE_CATALOG
    .filter(m => activeModules.includes(m.key))
    .reduce((sum, m) => sum + m.price, 0);
  return BASE_PRICE + modulesTotal;
}

// Suggest a plan if bundle is cheaper
export function suggestPlan(activeModules: (keyof Features)[]): { plan: string; savings: number } | null {
  const medidaPrice = calcMedidaPrice(activeModules);

  for (const planKey of ['operacion', 'negocio', 'empresa'] as const) {
    const bundlePrice = PLAN_PRICES[planKey];
    const savings = medidaPrice - bundlePrice;
    const planMods = PLAN_FEATURES[planKey];
    const allIncluded = activeModules.every(m => planMods.includes(m));
    if (allIncluded && savings >= 50) {
      return { plan: planKey, savings };
    }
  }
  return null;
}
