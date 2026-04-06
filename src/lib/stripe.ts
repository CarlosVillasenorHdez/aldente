/**
 * src/lib/stripe.ts — precios y tipos de planes Stripe
 * El cliente de Stripe se inicializa lazy dentro de cada route handler,
 * no aquí, para evitar errores de build cuando STRIPE_SECRET_KEY no está disponible.
 */

export const STRIPE_PRICES = {
  // México (MXN)
  basico:           { amount: 80000,  currency: 'mxn', interval: 'month' as const },
  estandar:         { amount: 150000, currency: 'mxn', interval: 'month' as const },
  premium:          { amount: 250000, currency: 'mxn', interval: 'month' as const },
  // España (EUR) — €49 / €89 / €149 por mes
  basico_eur:       { amount: 4900,   currency: 'eur', interval: 'month' as const },
  estandar_eur:     { amount: 8900,   currency: 'eur', interval: 'month' as const },
  premium_eur:      { amount: 14900,  currency: 'eur', interval: 'month' as const },
} as const;

export type StripePlanKey = keyof typeof STRIPE_PRICES;

/** Returns the Stripe price key for a given plan and currency */
export function stripePriceKey(plan: string, currency: 'mxn' | 'eur' = 'mxn'): StripePlanKey {
  const key = currency === 'eur' ? `${plan}_eur` : plan;
  return (key as StripePlanKey) in STRIPE_PRICES ? (key as StripePlanKey) : (plan as StripePlanKey);
}
