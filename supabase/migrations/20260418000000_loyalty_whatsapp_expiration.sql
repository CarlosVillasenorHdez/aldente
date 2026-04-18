-- ============================================================
-- LOYALTY WHATSAPP & EXPIRATION SETUP
-- Aplicar en Supabase SQL Editor
-- ============================================================

-- 1. Columna membership_expires_at en loyalty_customers (si no existe)
alter table loyalty_customers
  add column if not exists membership_expires_at timestamptz;

-- 2. Tipo 'expiracion' en loyalty_transactions
-- (si tienes check constraint en el campo type, agregar)
-- alter table loyalty_transactions drop constraint if exists loyalty_transactions_type_check;
-- alter table loyalty_transactions add constraint loyalty_transactions_type_check
--   check (type in ('acumulacion', 'canje', 'expiracion', 'ajuste'));

-- 3. Log de mensajes WhatsApp (opcional pero recomendado)
create table if not exists loyalty_whatsapp_log (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references tenants(id) on delete cascade,
  customer_id   uuid references loyalty_customers(id) on delete set null,
  event         text not null,
  phone         text not null,
  message       text,
  status        text default 'sent' check (status in ('sent', 'error')),
  error_msg     text,
  created_at    timestamptz default now()
);

create index if not exists idx_wa_log_tenant on loyalty_whatsapp_log(tenant_id, created_at desc);

-- 4. Habilitar pg_cron y pg_net (ya deben estar en Supabase)
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;

-- 5. Programar cron diario a las 9:00 AM UTC
-- ⚠ Reemplazar <PROJECT_REF> y <ANON_KEY> con tus valores reales
-- Los encuentras en: Dashboard → Settings → API

/*
select cron.schedule(
  'expire-memberships-daily',
  '0 9 * * *',
  $$
    select net.http_post(
      url        := 'https://<PROJECT_REF>.supabase.co/functions/v1/expire-memberships',
      headers    := jsonb_build_object(
        'Content-Type',    'application/json',
        'Authorization',   'Bearer <ANON_KEY>',
        'x-cron-secret',   '<CRON_SECRET>'
      ),
      body       := '{}'::jsonb
    ) as request_id;
  $$
);
*/

-- Para ver los cron jobs activos:
-- select * from cron.job;

-- Para eliminar el job si necesitas reconfigurarlo:
-- select cron.unschedule('expire-memberships-daily');

-- ============================================================
-- VARIABLES DE ENTORNO para las Edge Functions
-- Configurar en: Dashboard → Edge Functions → Secrets
-- ============================================================
-- CRON_SECRET          = string aleatorio para autenticar el cron
-- WHATSAPP_PROVIDER    = 'twilio' o 'meta'
--
-- Para Twilio:
-- TWILIO_ACCOUNT_SID   = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
-- TWILIO_AUTH_TOKEN    = tu_auth_token
-- TWILIO_WHATSAPP_FROM = whatsapp:+14155238886
--
-- Para Meta Cloud API:
-- META_WA_PHONE_NUMBER_ID = 1234567890
-- META_WA_ACCESS_TOKEN    = EAAxxxxxxx...
-- ============================================================
