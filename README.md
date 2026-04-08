# Aldente — ERP SaaS para Restaurantes

> **"Sabes exactamente qué pasa en tu restaurante."**

Sistema de gestión integral para restaurantes construido como SaaS multi-tenant. Cubre el ciclo completo: desde que el cliente pide hasta que el dueño analiza su rentabilidad real.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 · TypeScript · Tailwind CSS · PWA |
| Backend | Supabase (PostgreSQL + RLS + Realtime + Edge Functions) |
| Auth ERP | PIN + SHA-256 (sin Supabase Auth en el ERP) |
| Auth Admin | Supabase Auth (email + password, separado del ERP) |
| Pagos | Stripe (suscripciones mensuales, webhooks) |
| Deploy | Rocket.new (CI/CD automático desde rama `main`) |

---

## Flujos de trabajo implementados

### 1. Flujo de comandas (núcleo del sistema)

```
Mesero agrega platillo al POS
  → ModifierModal: excluir ingredientes / extras / notas
  → Item se agrega al estado local + sync a DB (billing order)

Mesero presiona "Enviar comanda"
  → Flush síncrono de items a DB
  → Se crea orden is_comanda=true (tarjeta KDS FIFO)
  → La orden original permanece como contenedor de billing

KDS en cocina recibe la tarjeta
  → Cocinero inicia → Pendiente → Preparación → Lista
  → Realtime notifica al POS → icono 🔒 en platillos entregados

Mesero cancela un platillo enviado
  → Modal de razón (6 motivos predefinidos + notas libres)
  → cancelItemFromKDS() busca la comanda y cancela/modifica
  → Si estaba en preparación: waste_cost calculado por receta
  → Merma registrada en cancel_type='con_costo'

Cobro (PaymentModal)
  → Soporte split por persona, efectivo + tarjeta, descuentos
  → closeOrder(): calcula cost_actual desde dish_recipes × ingredientes
  → Descuenta stock automáticamente (respeta excludedIngredientIds)
  → Guarda margin_actual, margin_pct en la orden
  → Libera mesa(s) en restaurant_tables
```

### 2. Flujo de información (trazabilidad completa)

```
OPERACIÓN                          DATO GENERADO
─────────────────────────────────────────────────────────────────
Orden creada                   →   orders (is_comanda=false)
Comanda enviada a cocina        →   orders (is_comanda=true, parent_order_id)
Platillo cancelado              →   cancel_type, cancel_reason, waste_cost
Orden cerrada                   →   cost_actual, margin_actual, margin_pct
Stock descontado                →   ingredients.stock, stock_movements
─────────────────────────────────────────────────────────────────

DATO                               VISIBLE EN
─────────────────────────────────────────────────────────────────
Ventas del día                 →   Dashboard KPIs, Corte de Caja, Reportes tab Ventas
Utilidad bruta                 →   Dashboard, Corte de Caja, Reportes P&L
Merma (waste_cost)             →   Gestión de Órdenes, Corte de Caja, Reportes
COGS por platillo              →   Reportes → COGS · Análisis
Razones de cancelación         →   Gestión de Órdenes (panel de frecuencias)
Stock actual                   →   Inventario, Alertas, Dashboard
P&L proporcional al período    →   Reportes P&L (escala día/semana/mes)
```

### 3. Flujo de reservaciones → POS

```
Reservación confirmada
  → Botón "Sentar" en la tarjeta
  → Marca reservación como 'completada'
  → Marca mesa como 'ocupada' en restaurant_tables
  → Redirige al POS (el POS detecta la mesa ocupada via realtime)
```

---

## Estado de implementación por módulo

### ✅ Completamente funcionales

| Módulo | Descripción |
|---|---|
| **POS** | Mapa de mesas drag & drop, unión, modificadores, split por persona, descuentos, notas |
| **KDS (Cocina)** | FIFO real con is_comanda, semáforo de tiempos, kanban drag, cancelación con merma |
| **Mesero Móvil** | Toma de órdenes, cancelación individual con razón y merma, cierre de cuenta |
| **Gestión de Órdenes** | Historial completo, merma por orden, razones frecuentes, KPIs de período |
| **Corte de Caja** | Resumen de turno: ventas, utilidad bruta, merma, desglose por mesero |
| **Reportes P&L** | Estado de resultados escalado al período, COGS real, merma como partida, punto de equilibrio |
| **Reportes Ventas** | Tendencia, KPIs, merma, línea de equilibrio en gráfica |
| **COGS por Platillo** | Costo de ingredientes, margen %, contribución total por platillo (datos reales de recetas) |
| **Menú** | Catálogo, recetas con ingredientes, toggle is_required, disponibilidad |
| **Inventario** | Stock real, alertas de mínimos, movimientos, análisis de desperdicios |
| **Reservaciones** | Calendario, lista, botón Sentar → POS |
| **Lealtad** | Acumulación y canje de puntos, conectado a closeOrder |
| **Personal** | Empleados, turnos, horarios |
| **Gastos** | Gastos recurrentes + depreciaciones (alimentan el P&L de Reportes) |
| **Dashboard** | KPIs en tiempo real, utilidad del día, merma del día, operaciones en vivo |
| **Configuración** | Restaurante, operaciones, impresora, sucursal, system_config |
| **Alarmas** | Alertas de stock bajo, órdenes lentas, entidad configurable |
| **Onboarding** | Flujo guiado de 4 pasos para nuevos tenants |

### 🟡 Funcionales con alcance limitado

| Módulo | Estado | Gap |
|---|---|---|
| **Delivery** | CRUD de órdenes de delivery | No integrado con POS ni KDS |
| **Recursos Humanos** | Vacaciones y permisos | Nómina calculada pero no pagos reales |
| **Multi-Sucursal** | Consolidado básico | Requiere plan Premium |
| **Sucursales** | Revenue por sucursal | Sin detalle por módulo |

### ❌ Pendiente

| Funcionalidad | Prioridad |
|---|---|
| Emails automáticos día 1 y día 3 del trial | Alta |
| Stripe: activación de planes en producción | Alta (llaves faltantes) |
| Delivery integrado al flujo POS → KDS | Media |
| App móvil nativa (actualmente PWA) | Baja |

---

## Arquitectura de datos clave

### Modelo de comandas (invariante del sistema)

```
orders (is_comanda=false)  ← Contenedor de billing. NUNCA aparece en KDS.
  │
  └── orders (is_comanda=true, parent_order_id=...)  ← Cada "Enviar comanda"
        │   kitchen_status: pendiente → preparacion → lista → entregada
        │   cancel_type: sin_costo | con_costo
        │   waste_cost: calculado por ingredientes × cantidad
        └── order_items ← Platillos de esa comanda específica
```

**Regla crítica**: Todo query de ventas/analítica debe filtrar `.eq('is_comanda', false)`. Sin este filtro, las métricas se inflan 2-4x según el número de comandas por mesa.

### Cálculo de rentabilidad

```
Al cobrar (closeOrder):
  cost_actual = Σ (dish_recipes.quantity × ingredients.cost × item.qty)
  margin_actual = total - cost_actual
  margin_pct = margin_actual / total × 100

Al cancelar platillo (cancelItemFromKDS):
  waste_cost = Σ (dish_recipes.quantity × ingredients.cost) × item.qty
  → Guardado en la comanda cancelada

En Reportes P&L:
  COGS = realKpis.costo (sum de cost_actual del período)
  Merma = query separado: orders WHERE status=cancelada AND cancel_type=con_costo
  Gastos operativos = (nómina + gastos_recurrentes + depreciaciones) × periodFactor
  periodFactor = periodDays / 30  → escala día/semana/mes
```

---

## Planes y precios

| Plan | Precio/mes | Módulos incluidos |
|---|---|---|
| **Básico** | $800 MXN | POS, Menú, Corte de Caja, Personal, Dashboard |
| **Estándar** | $1,500 MXN | + KDS, Mesero Móvil, Inventario, Reservaciones, Lealtad, Reportes, Alarmas |
| **Premium** | $2,500 MXN | + Delivery, Multi-Sucursal, Recursos Humanos, Gastos y Depreciaciones |

Todos los planes incluyen **14 días de prueba gratuita sin tarjeta**.

---

## Setup local

```bash
git clone https://github.com/CarlosVillasenorHdez/aldente
cd aldente
npm install
cp .env .env.local   # editar con tus keys reales
npm run dev          # http://localhost:4028
```

### Variables de entorno

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ocrfaojxnpbxbljskkmz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # solo servidor, nunca al cliente

# Stripe (pendiente activar)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# App
NEXT_PUBLIC_APP_URL=https://aldente.app
NEXT_PUBLIC_SITE_URL=https://aldente.app
```

---

## Reglas para desarrolladores

1. **No tocar** `AuthContext` ni el flujo de PIN del ERP
2. **No re-ejecutar** migraciones ya aplicadas en Supabase
3. **No modificar** el bloque `rocketCritical` en `package.json`
4. **Siempre filtrar** `.eq('is_comanda', false)` en queries de ventas/analítica
5. POS y Cocina **no usan** `AppLayout` (tienen layout propio con sidebar colapsado)
6. El superadmin usa Supabase Auth (email+password) **separado** del ERP (PIN)
7. `useFeatures` lee de `system_config` — se sincroniza via Stripe webhook

---

## Comandos de administración

```bash
# Desplegar Edge Functions
supabase functions deploy create-tenant --project-ref ocrfaojxnpbxbljskkmz
supabase functions deploy create-superadmin --project-ref ocrfaojxnpbxbljskkmz

# Crear superadmin
curl -X POST https://ocrfaojxnpbxbljskkmz.supabase.co/functions/v1/create-superadmin \
  -H "x-superadmin-secret: TU_SECRET" \
  -d '{"email":"admin@aldente.app","password":"password","nombre":"Admin"}'
```

---

## Speech para prospecto: Restaurante chino con inventario en papel

### Contexto del cliente
- Operación establecida con buen flujo de efectivo
- Inventario en papel y Excel
- Desconoce su rentabilidad real por platillo
- Probablemente tiene pérdidas invisibles en merma y platillos mal costeados

### El problema que resuelve Aldente para él

**"Usted sabe cuánto entra, pero no sabe cuánto se pierde en el camino."**

Cuatro pérdidas invisibles que Aldente hace visibles desde el día 1:

1. **Merma no medida**: Cada vez que se cancela un platillo porque llegó frío, porque el cliente esperó 40 minutos, o porque el mesero lo registró mal — eso tiene un costo real en ingredientes. En papel, ese costo no existe. En Aldente, tiene nombre, monto y razón.

2. **Platillos que pierden dinero**: Con las recetas configuradas en el sistema, el COGS por platillo es automático. Sabrá si su pato laqueado tiene margen del 68% o del 12% — y si vale la pena mantenerlo en carta.

3. **Inventario que "se evapora"**: El sistema descuenta automáticamente los ingredientes por cada venta. Si el papel dice que quedan 50 patos y el sistema dice 38, la diferencia de 12 tiene una explicación — y Aldente la rastrea.

4. **El día que termina sin saber si fue bueno**: El corte de caja de Aldente muestra en 30 segundos: ventas del turno, utilidad bruta, merma del día, y si el día fue rentable o no (comparado con el punto de equilibrio real de ese día).

### Lo que ve el dueño en su teléfono hoy mismo

- Dashboard en tiempo real: mesas activas, órdenes en cocina, ventas del día vs meta
- Alerta si alguna mesa lleva más de 30 minutos esperando
- Al cerrar: "Hoy vendiste $8,400. Tu utilidad bruta fue $5,200 (61.9%). Tuviste $340 de merma en 3 cancelaciones."

### Por qué Aldente vs Excel

| Excel | Aldente |
|---|---|
| Se actualiza cuando alguien lo hace | Tiempo real, automático |
| Solo ve ventas totales | Ve costo, margen y merma por platillo |
| El inventario es fe | El inventario se descuenta por receta al cobrar |
| El corte tarda 30 min | El corte tarda 30 segundos |
| No hay historia de cancelaciones | Cada cancelación tiene razón y costo |
| Un solo usuario, un solo lugar | Meseros, cocineros y dueño en sus propios dispositivos |

### Recomendación de plan para este cliente

**Plan Estándar ($1,500 MXN/mes)**

Incluye lo que más le aporta valor:
- KDS en cocina (elimina comandas en papel, reduce errores)
- Inventario con recetas (costeo automático, alertas de stock)
- Reportes P&L (sabe si el día fue rentable)
- Mesero móvil (los meseros toman órdenes desde su celular, sin errores de transcripción)

**ROI estimado**: Si el sistema evita el equivalente a 2 platillos de merma por día ($150 × 30 días = $4,500/mes), ya pagó 3 veces su costo. Y eso sin contar el tiempo ahorrado en el corte de caja y el inventario manual.

---

*Aldente v4.6 — Abril 2026*
