# Aldente — ERP SaaS para Restaurantes

Sistema de gestión integral para restaurantes. Next.js 15 + TypeScript + Supabase + Tailwind CSS.

## Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, PWA
- **Backend**: Supabase (PostgreSQL + RLS + Edge Functions)
- **Pagos**: Stripe (suscripciones mensuales)
- **Deploy**: Rocket.new

## Variables de entorno requeridas

Crea un `.env.local` con:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ocrfaojxnpbxbljskkmz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# App
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com

# Supabase service role (solo en servidor, nunca exponer al cliente)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Setup local

```bash
git clone https://github.com/CarlosVillasenorHdez/aldente
cd aldente
npm install
cp .env .env.local   # editar con tus keys reales
npm run dev          # http://localhost:4028
```

## Estructura del proyecto

```
src/
├── app/
│   ├── (erp)/          # 19 módulos del ERP (POS, KDS, Inventario, etc.)
│   ├── (admin)/        # Panel superadmin (/admin)
│   ├── (marketing)/    # Páginas públicas (/registro)
│   ├── api/stripe/     # Webhooks y checkout de Stripe
│   └── login/          # Login por PIN
├── components/         # AppLayout, Sidebar, Topbar, SubscriptionWall
├── contexts/           # AuthContext (PIN + SHA-256, multi-tenant)
├── hooks/              # 10 hooks: useAuth, useFeatures, useOrderFlow, etc.
└── lib/                # plans.ts, stripe.ts, supabase/client
supabase/
├── functions/          # Edge Functions: create-tenant, create-superadmin, etc.
└── migrations/         # 19 migraciones SQL (no re-ejecutar)
```

## Arquitectura multi-tenant

- RLS en todas las tablas — cada tenant solo ve sus datos
- Login por PIN + SHA-256 (sin Supabase Auth en el ERP)
- `app_role` TEXT soporta roles custom
- `DEFAULT_TENANT` fallback para desarrollo

## Flujo del primer cliente

1. Cliente entra a `/registro` → crea cuenta → 14 días de trial
2. Al vencer trial → `SubscriptionWall` aparece con botones de pago
3. Cliente paga en Stripe → webhook activa features del plan
4. `system_config` en DB controla qué features están habilitadas

## Planes

| Plan     | Precio    | Módulos principales                              |
|----------|-----------|--------------------------------------------------|
| Básico   | $800/mes  | POS, Menú, Corte de caja, Personal               |
| Estándar | $1,500/mes| + KDS, Inventario, Reservaciones, Lealtad, Reportes |
| Premium  | $2,500/mes| + Delivery, Multi-sucursal, RH, Gastos, Alarmas  |

## Comandos útiles

```bash
# Desplegar Edge Functions
supabase functions deploy create-tenant --project-ref ocrfaojxnpbxbljskkmz
supabase functions deploy create-superadmin --project-ref ocrfaojxnpbxbljskkmz

# Crear superadmin
curl -X POST https://ocrfaojxnpbxbljskkmz.supabase.co/functions/v1/create-superadmin \
  -H "x-superadmin-secret: TU_SECRET" \
  -d '{"email":"tu@email.com","password":"password","nombre":"Tu Nombre"}'
```

## Notas para desarrolladores

- No tocar `AuthContext` ni el flujo de PIN
- No re-ejecutar migraciones ya aplicadas
- No modificar el bloque `rocketCritical` en `package.json`
- El superadmin usa Supabase Auth (email+password), completamente separado del ERP
- `useFeatures` lee de `system_config` — se sincroniza automáticamente al cambiar de plan via Stripe webhook
