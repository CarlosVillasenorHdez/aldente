/**
 * checkAndUpgradeTier
 *
 * Verifica si un cliente califica para subir de nivel según las reglas
 * configuradas. Se llama después de cada visita o pago.
 *
 * No lanza errores — falla silenciosamente para no interrumpir el flujo del cajero.
 *
 * Retorna el nuevo tier_id si hubo upgrade, null si no.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MembershipTier } from './useLoyaltyConfig';

interface Customer {
  id: string;
  tier_id: string | null;
  total_visits: number;
  total_spent: number;
  points: number;
}

export async function checkAndUpgradeTier(
  supabase: SupabaseClient,
  tenantId: string,
  customer: Customer,
  tiers: MembershipTier[],
): Promise<string | null> {
  if (!tiers.length) return null;  // sin niveles configurados

  // Ordenar de mayor a menor (el más exigente primero)
  const sorted = [...tiers].sort((a, b) => b.order - a.order);

  // Encontrar el nivel más alto al que califica
  for (const tier of sorted) {
    const rule      = tier.upgradeRule ?? 'manual';
    const threshold = tier.upgradeThreshold ?? 0;

    let qualifies = false;

    if (rule === 'manual') {
      continue;  // manual = no se evalúa automáticamente
    }

    if (rule === 'visitas') {
      qualifies = threshold === 0 || customer.total_visits >= threshold;
    } else if (rule === 'gasto') {
      qualifies = threshold === 0 || customer.total_spent >= threshold;
    } else if (rule === 'producto') {
      continue;  // se maneja en el trigger de venta del producto
    }

    if (qualifies && customer.tier_id !== tier.id) {
      // El cliente califica para este nivel — actualizarlo
      try {
        await supabase.from('loyalty_customers').update({
          tier_id: tier.id,
          updated_at: new Date().toISOString(),
        }).eq('id', customer.id);

        // Registrar el upgrade en audit_log
        await supabase.from('audit_log').insert({
          tenant_id:   tenantId,
          action:      'tier_upgrade',
          entity:      'loyalty_customers',
          entity_id:   customer.id,
          details:     `Upgrade automático a nivel "${tier.name}" — regla: ${rule}, umbral: ${threshold}`,
        });

        return tier.id;
      } catch {
        return null;
      }
    }
  }

  return null;
}
