# Arquitectura Multi-Tenant y Multi-Sucursal

## Capas de aislamiento

### 1. Tenant isolation (SEGURIDAD — Row Level Security)
- Implementado en Supabase via RLS en todas las tablas
- Política: `tenant_id = auth_tenant_id()`
- Un tenant NUNCA puede ver datos de otro tenant
- Esto es a nivel de base de datos — no depende del código del frontend

### 2. Branch filtering (UX — no seguridad)
- El `branch_id` en orders, restaurant_tables, delivery_orders filtra por sucursal
- Manejado via `useBranch()` → `BranchContext` → `activeBranchId`
- Los módulos que respetan el filtro: POS, Mesero, Delivery, Reportes, Alarmas
- Módulos globales (no filtran por branch): Inventario, Menú, Personal, Gastos
  → Esto es INTENCIONAL: el menú e inventario son del restaurante completo

## Tablas con branch_id
- orders
- restaurant_tables  
- delivery_orders
- cortes_caja (branch implícito via mesero/branch)

## Tablas SIN branch_id (globales por tenant)
- dishes (menú global)
- ingredients (inventario global)
- employees (personal global)
- gastos_recurrentes (gastos globales)
- loyalty_customers (lealtad global)
- suppliers (proveedores globales)

## Cómo probar multi-sucursal
1. Crear 2 branches en Configuración → Layout
2. Asignar mesas a cada branch
3. Hacer login con usuario de branch 1 → solo ve sus mesas
4. Hacer login con usuario de branch 2 → solo ve sus mesas
5. El admin ve todas las sucursales en reportes consolidados
