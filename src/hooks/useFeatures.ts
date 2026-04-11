'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Features {
  lealtad: boolean;
  reservaciones: boolean;
  delivery: boolean;
  meseroMovil: boolean;
  inventario: boolean;
  recursosHumanos: boolean;
  gastos: boolean;
  reportes: boolean;
  alarmas: boolean;
  multiSucursal: boolean;
}

// Plan → features incluidas
// Cada plan incluye las del anterior (acumulativo)
const PLAN_FEATURES: Record<string, (keyof Features)[]> = {
  operacion: ['meseroMovil'],
  negocio:   ['meseroMovil','inventario','gastos','reservaciones','lealtad','reportes','alarmas'],
  empresa:   ['meseroMovil','inventario','gastos','reservaciones','lealtad','reportes','alarmas','multiSucursal','recursosHumanos','delivery'],
};

// Fallback: si el plan no existe en el mapa, dar acceso a todo
// (para tenants legacy / profesional / etc.)
const ALL_FEATURES: (keyof Features)[] = [
  'meseroMovil','inventario','gastos','reservaciones','lealtad',
  'reportes','alarmas','multiSucursal','recursosHumanos','delivery'
];

export const DEFAULT_FEATURES: Features = {
  lealtad: false, reservaciones: false, delivery: false,
  meseroMovil: true, inventario: false, recursosHumanos: false,
  gastos: false, reportes: false, alarmas: false, multiSucursal: false,
};

function planToFeatures(plan: string): Features {
  const allowed = PLAN_FEATURES[plan] ?? ALL_FEATURES;
  return {
    lealtad:         allowed.includes('lealtad'),
    reservaciones:   allowed.includes('reservaciones'),
    delivery:        allowed.includes('delivery'),
    meseroMovil:     allowed.includes('meseroMovil'),
    inventario:      allowed.includes('inventario'),
    recursosHumanos: allowed.includes('recursosHumanos'),
    gastos:          allowed.includes('gastos'),
    reportes:        allowed.includes('reportes'),
    alarmas:         allowed.includes('alarmas'),
    multiSucursal:   allowed.includes('multiSucursal'),
  };
}

// Module-level plan cache
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
      .then(({ data }) => {
        // Normalize legacy plan names to current names
        const rawPlan = data?.plan ?? 'operacion';
        const PLAN_LEGACY: Record<string, string> = {
          basico: 'operacion', starter: 'operacion',
          estandar: 'negocio', profesional: 'negocio',
          premium: 'empresa', enterprise: 'empresa',
        };
        const p = PLAN_LEGACY[rawPlan] ?? rawPlan;
        const f = planToFeatures(p);
        _cachedPlan = p;
        _cachedFeatures = f;
        setFeatures(f);
        setPlan(p);
        setLoading(false);
      });
  }, [appUser?.tenantId]);

  return { features, plan, loading };
}

// Legacy compatibility
export const FEATURE_KEYS: Record<keyof Features, string> = {
  lealtad:'feature_lealtad', reservaciones:'feature_reservaciones',
  delivery:'feature_delivery', meseroMovil:'feature_mesero_movil',
  inventario:'feature_inventario', recursosHumanos:'feature_recursos_humanos',
  gastos:'feature_gastos', reportes:'feature_reportes',
  alarmas:'feature_alarmas', multiSucursal:'feature_multi_sucursal',
};

export const PLAN_NAMES: Record<string, string> = {
  operacion: 'Operación', negocio: 'Negocio', empresa: 'Empresa',
};

export const PLAN_PRICES: Record<string, number> = {
  operacion: 799, negocio: 1499, empresa: 2499,
};

export const PLAN_COLORS: Record<string, string> = {
  operacion: '#4a9eff', negocio: '#c9963a', empresa: '#a78bfa',
};

// Plan order for comparisons
export const PLAN_ORDER = ['operacion', 'negocio', 'empresa'];
export function planMeetsRequirement(currentPlan: string, requiredPlan: string): boolean {
  return PLAN_ORDER.indexOf(currentPlan) >= PLAN_ORDER.indexOf(requiredPlan);
}
