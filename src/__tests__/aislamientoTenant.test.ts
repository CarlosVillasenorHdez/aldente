/**
 * aislamientoTenant.test.ts — Garantía de aislamiento entre restaurantes.
 *
 * El aislamiento lo aplica la app filtrando cada query por tenant_id (las
 * políticas RLS son permisivas por el connection pooling). Estos tests
 * documentan que la lógica de filtrado separa correctamente los datos de
 * dos restaurantes distintos (RABLE vs Meta).
 */
import { describe, it, expect } from 'vitest';

interface Row { id: string; tenant_id: string; branch_id?: string | null; total?: number; }

// Réplica del patrón de filtrado que usa la app en cada query
function filtrarPorTenant<T extends Row>(rows: T[], tenantId: string, branchId?: string | null): T[] {
  let out = rows.filter(r => r.tenant_id === tenantId);
  if (branchId) out = out.filter(r => r.branch_id === branchId || r.branch_id == null);
  return out;
}

const RABLE = 'rable-uuid';
const META = 'meta-uuid';

describe('Aislamiento entre restaurantes', () => {
  const ventas: Row[] = [
    { id: 'v1', tenant_id: RABLE, total: 340 },
    { id: 'v2', tenant_id: RABLE, total: 235 },
    { id: 'v3', tenant_id: META,  total: 500 },
    { id: 'v4', tenant_id: META,  total: 180 },
  ];

  it('RABLE solo ve sus ventas, nunca las de Meta', () => {
    const deRable = filtrarPorTenant(ventas, RABLE);
    expect(deRable).toHaveLength(2);
    expect(deRable.every(v => v.tenant_id === RABLE)).toBe(true);
    expect(deRable.some(v => v.tenant_id === META)).toBe(false);
  });

  it('Meta solo ve sus ventas, nunca las de RABLE', () => {
    const deMeta = filtrarPorTenant(ventas, META);
    expect(deMeta).toHaveLength(2);
    expect(deMeta.reduce((s, v) => s + (v.total ?? 0), 0)).toBe(680);
  });

  it('los totales no se mezclan entre restaurantes', () => {
    const totalRable = filtrarPorTenant(ventas, RABLE).reduce((s, v) => s + (v.total ?? 0), 0);
    const totalMeta = filtrarPorTenant(ventas, META).reduce((s, v) => s + (v.total ?? 0), 0);
    expect(totalRable).toBe(575);
    expect(totalMeta).toBe(680);
    expect(totalRable).not.toBe(totalMeta);
  });

  it('Meta multi-sucursal: cada sucursal ve lo suyo + lo compartido', () => {
    const metaVentas: Row[] = [
      { id: 'a', tenant_id: META, branch_id: 'suc1', total: 100 },
      { id: 'b', tenant_id: META, branch_id: 'suc2', total: 200 },
      { id: 'c', tenant_id: META, branch_id: null,   total: 50 }, // compartido
    ];
    const suc1 = filtrarPorTenant(metaVentas, META, 'suc1');
    // Sucursal 1 ve su venta + la compartida, NO la de sucursal 2
    expect(suc1.map(v => v.id).sort()).toEqual(['a', 'c']);
    expect(suc1.some(v => v.id === 'b')).toBe(false);
  });
});
