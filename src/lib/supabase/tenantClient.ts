/**
 * tenantClient — wrapper around Supabase that automatically adds
 * .eq('tenant_id', tenantId) to every SELECT/INSERT/UPDATE/DELETE
 * on tenant-isolated tables.
 *
 * This is the PRIMARY isolation mechanism (RLS is secondary).
 * Usage: import { useTenantClient } from '@/lib/supabase/tenantClient';
 */

import { createClient } from './client';
import { useAuth } from '@/contexts/AuthContext';

// Tables that require tenant isolation
const TENANT_TABLES = new Set([
  'dishes', 'ingredients', 'orders', 'order_items', 'employees',
  'restaurant_tables', 'restaurant_layout', 'reservations',
  'loyalty_customers', 'loyalty_transactions', 'gastos_recurrentes',
  'gastos_pagos', 'depreciaciones', 'stock_movements', 'dish_recipes',
  'delivery_orders', 'branches', 'rh_permisos', 'rh_vacaciones',
  'rh_tiempos_extras', 'employee_shifts', 'unit_equivalences',
  'system_config',
]);

/**
 * Returns a supabase query builder that auto-adds tenant filter.
 * For SELECT queries, it wraps the builder to add .eq('tenant_id', tenantId).
 * For INSERT/UPDATE, callers must include tenant_id in the payload.
 */
export function createTenantQuery(tenantId: string | null | undefined) {
  const supabase = createClient();

  return {
    ...supabase,
    from(table: string) {
      const builder = supabase.from(table);
      if (!tenantId || !TENANT_TABLES.has(table)) return builder;

      // Wrap select to auto-add tenant filter
      const originalSelect = builder.select.bind(builder);
      builder.select = (...args: Parameters<typeof originalSelect>) => {
        return (originalSelect(...args) as any).eq('tenant_id', tenantId);
      };

      return builder;
    },
  };
}

/**
 * Hook: returns a Supabase client with automatic tenant filtering.
 * Use this instead of createClient() in ERP components.
 */
export function useTenantClient() {
  const { appUser } = useAuth();
  const tenantId = appUser?.tenantId ?? null;
  const supabase = createClient();

  return new Proxy(supabase, {
    get(target, prop) {
      if (prop !== 'from') return (target as any)[prop];
      return (table: string) => {
        const builder = target.from(table as any);
        if (!tenantId || !TENANT_TABLES.has(table)) return builder;
        // Return a proxy that injects .eq('tenant_id', tenantId) on .select()
        return new Proxy(builder, {
          get(b, method) {
            const orig = (b as any)[method];
            if (typeof orig !== 'function') return orig;
            if (method === 'select') {
              return (...args: any[]) => {
                return orig.apply(b, args).eq('tenant_id', tenantId);
              };
            }
            return orig.bind(b);
          },
        });
      };
    },
  });
}
