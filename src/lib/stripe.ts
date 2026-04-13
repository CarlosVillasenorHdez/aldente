/**
 * src/lib/stripe.ts — precios y tipos de planes Aldente
 * Planes: operacion ($699) | negocio ($1,299) | empresa ($2,199)
 *
 * Price IDs: se obtienen del Stripe Dashboard después de crear los productos.
 * Mientras no existan Price IDs fijos, se usa price_data dinámico en checkout.
 * Una vez creados en Stripe Dashboard, reemplaza los placeholders aquí.
 */

export const STRIPE_PLANS = {
  operacion: {
    name:     'Aldente Operación',
    amount:   69900,        // $699.00 MXN en centavos
    currency: 'mxn' as const,
    interval: 'month' as const,
    // priceId: 'price_xxxx',  // ← agregar cuando se cree en Stripe Dashboard
  },
  negocio: {
    name:     'Aldente Negocio',
    amount:   129900,       // $1,299.00 MXN
    currency: 'mxn' as const,
    interval: 'month' as const,
    // priceId: 'price_xxxx',
  },
  empresa: {
    name:     'Aldente Empresa',
    amount:   219900,       // $2,199.00 MXN
    currency: 'mxn' as const,
    interval: 'month' as const,
    // priceId: 'price_xxxx',
  },
} as const;

// Legacy alias para compatibilidad con código existente
export const STRIPE_PRICES = {
  operacion: STRIPE_PLANS.operacion,
  negocio:   STRIPE_PLANS.negocio,
  empresa:   STRIPE_PLANS.empresa,
  // España (EUR) — futuro
  operacion_eur: { amount: 3900,  currency: 'eur' as const, interval: 'month' as const },
  negocio_eur:   { amount: 6900,  currency: 'eur' as const, interval: 'month' as const },
  empresa_eur:   { amount: 10900, currency: 'eur' as const, interval: 'month' as const },
} as const;

export type StripePlanKey = keyof typeof STRIPE_PLANS;
export type StripePriceKey = keyof typeof STRIPE_PRICES;

export const PLAN_MXN: Record<string, number> = {
  operacion: 699,
  negocio:   1299,
  empresa:   2199,
};

export const PLAN_LABEL: Record<string, string> = {
  operacion: 'Operación',
  negocio:   'Negocio',
  empresa:   'Empresa',
};

/** Devuelve la config del plan para crear una sesión de checkout */
export function getStripePlan(plan: string) {
  return STRIPE_PLANS[plan as StripePlanKey] ?? STRIPE_PLANS.operacion;
}

/** Compatibilidad con código legacy que usaba stripePriceKey() */
export function stripePriceKey(plan: string, currency: 'mxn' | 'eur' = 'mxn'): StripePriceKey {
  const key = currency === 'eur' ? `${plan}_eur` : plan;
  return (key as StripePriceKey) in STRIPE_PRICES ? (key as StripePriceKey) : (plan as StripePriceKey);
}
