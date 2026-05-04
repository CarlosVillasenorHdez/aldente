/**
 * src/lib/plans.ts — DEPRECATED
 * Fuente canónica: src/hooks/useFeatures.ts (PLAN_PRICES, PLAN_NAMES, PLAN_FEATURES)
 * Este archivo existe solo para compatibilidad. No agregar lógica aquí.
 */
import { PLAN_NAMES, PLAN_PRICES, PLAN_FEATURES } from '@/hooks/useFeatures';

export const PLAN_MODULES = {
  operacion: { label: PLAN_NAMES.operacion, price: PLAN_PRICES.operacion, pages: PLAN_FEATURES.operacion, features: {} as Record<string, never> },
  negocio:   { label: PLAN_NAMES.negocio,   price: PLAN_PRICES.negocio,   pages: PLAN_FEATURES.negocio,   features: {} as Record<string, never> },
  empresa:   { label: PLAN_NAMES.empresa,   price: PLAN_PRICES.empresa,   pages: PLAN_FEATURES.empresa,   features: {} as Record<string, never> },
  // legacy aliases
  basico:    { label: PLAN_NAMES.operacion, price: PLAN_PRICES.operacion, pages: PLAN_FEATURES.operacion, features: {} as Record<string, never> },
  estandar:  { label: PLAN_NAMES.negocio,   price: PLAN_PRICES.negocio,   pages: PLAN_FEATURES.negocio,   features: {} as Record<string, never> },
  premium:   { label: PLAN_NAMES.empresa,   price: PLAN_PRICES.empresa,   pages: PLAN_FEATURES.empresa,   features: {} as Record<string, never> },
} as const;

export type PlanKey = keyof typeof PLAN_MODULES;

export function getPlan(plan: string): { label: string; price: number; pages: readonly string[]; features: Record<string, never> } {
  return PLAN_MODULES[plan as PlanKey] ?? PLAN_MODULES.operacion;
}

export function planPrice(plan: string): number {
  return getPlan(plan).price;
}
