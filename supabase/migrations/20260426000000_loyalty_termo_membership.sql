-- ─────────────────────────────────────────────────────────────────────────────
-- Membresía tipo "Termo" — beneficio diario cross-sucursal
--
-- Contexto: algunos restaurantes (ej. cafeterías) venden una membresía física
-- (un termo) que da precio preferencial y UN beneficio gratis por día.
-- El beneficio es cross-sucursal: si se usa en sucursal A, no aplica en sucursal B
-- el mismo día. Se resetea automáticamente al día siguiente (por fecha, no por cron).
--
-- Cambios:
--   loyalty_customers:
--     + membership_type       TEXT  — 'puntos' (default) | 'termo'
--     + daily_benefit_used_at TIMESTAMPTZ — cuándo se marcó el beneficio hoy
--     + daily_benefit_used_branch_id UUID — en qué sucursal se usó
--
-- Lógica del beneficio diario (en el cliente, no requiere cron):
--   disponible = daily_benefit_used_at IS NULL
--             OR daily_benefit_used_at::date < CURRENT_DATE (zona horaria del tenant)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Agregar columnas a loyalty_customers ───────────────────────────────────
ALTER TABLE public.loyalty_customers
  ADD COLUMN IF NOT EXISTS membership_type text NOT NULL DEFAULT 'puntos'
    CHECK (membership_type IN ('puntos', 'termo')),
  ADD COLUMN IF NOT EXISTS daily_benefit_used_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS daily_benefit_used_branch_id uuid DEFAULT NULL;

-- ── 2. Índice para búsqueda rápida por teléfono (cross-sucursal) ──────────────
CREATE INDEX IF NOT EXISTS idx_loyalty_customers_phone_tenant
  ON public.loyalty_customers (tenant_id, phone);

CREATE INDEX IF NOT EXISTS idx_loyalty_customers_type
  ON public.loyalty_customers (tenant_id, membership_type);

-- ── 3. Tabla de log de uso del beneficio diario ───────────────────────────────
-- Registra cada vez que un socio usa su café gratis.
-- Útil para reportes: cuántos cafés gratis se otorgaron por día/sucursal.
CREATE TABLE IF NOT EXISTS public.loyalty_daily_benefit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  customer_id     uuid NOT NULL REFERENCES public.loyalty_customers(id) ON DELETE CASCADE,
  branch_id       uuid,                          -- sucursal donde se usó
  benefit_type    text NOT NULL DEFAULT 'cafe_gratis',
  used_at         timestamptz NOT NULL DEFAULT now(),
  registered_by   text DEFAULT '',               -- nombre del cajero
  notes           text DEFAULT ''
);

ALTER TABLE public.loyalty_daily_benefit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'loyalty_daily_benefit_log'
    AND policyname = 'loyalty_daily_benefit_log_tenant'
  ) THEN
    CREATE POLICY loyalty_daily_benefit_log_tenant
      ON public.loyalty_daily_benefit_log
      FOR ALL TO authenticated
      USING (tenant_id = public.auth_tenant_id())
      WITH CHECK (tenant_id = public.auth_tenant_id());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_loyalty_benefit_log_tenant_date
  ON public.loyalty_daily_benefit_log (tenant_id, used_at);

CREATE INDEX IF NOT EXISTS idx_loyalty_benefit_log_customer
  ON public.loyalty_daily_benefit_log (customer_id, used_at);

-- ── 4. Función helper: verificar si el beneficio está disponible hoy ──────────
-- Devuelve TRUE si el socio puede usar su beneficio diario.
-- Compara por fecha en la zona horaria de CDMX (America/Mexico_City).
CREATE OR REPLACE FUNCTION public.loyalty_benefit_available_today(
  p_customer_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_used_at timestamptz;
  v_tz text := 'America/Mexico_City';
BEGIN
  SELECT daily_benefit_used_at
  INTO v_used_at
  FROM public.loyalty_customers
  WHERE id = p_customer_id;

  -- Si nunca se ha usado o el último uso fue antes de hoy (en CDMX)
  RETURN (
    v_used_at IS NULL OR
    (v_used_at AT TIME ZONE v_tz)::date < (now() AT TIME ZONE v_tz)::date
  );
END;
$$;

-- ── 5. Función: marcar beneficio como usado ───────────────────────────────────
-- Actualiza loyalty_customers y registra en el log.
-- Devuelve error si ya fue usado hoy.
CREATE OR REPLACE FUNCTION public.loyalty_use_daily_benefit(
  p_customer_id  uuid,
  p_branch_id    uuid DEFAULT NULL,
  p_registered_by text DEFAULT '',
  p_benefit_type text DEFAULT 'cafe_gratis'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer    public.loyalty_customers%ROWTYPE;
  v_available   boolean;
  v_tz          text := 'America/Mexico_City';
BEGIN
  -- Verificar que el cliente existe y pertenece al tenant
  SELECT * INTO v_customer
  FROM public.loyalty_customers
  WHERE id = p_customer_id
    AND tenant_id = public.auth_tenant_id();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Socio no encontrado');
  END IF;

  -- Verificar membresía activa
  IF NOT v_customer.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Membresía inactiva o vencida');
  END IF;

  -- Verificar que sea tipo termo
  IF v_customer.membership_type != 'termo' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este socio no tiene membresía Termo');
  END IF;

  -- Verificar vencimiento
  IF v_customer.membership_expires_at IS NOT NULL
     AND v_customer.membership_expires_at < now() THEN
    -- Auto-expirar
    UPDATE public.loyalty_customers
    SET is_active = false, updated_at = now()
    WHERE id = p_customer_id;
    RETURN jsonb_build_object('ok', false, 'error', 'Membresía vencida');
  END IF;

  -- Verificar beneficio del día
  v_available := (
    v_customer.daily_benefit_used_at IS NULL OR
    (v_customer.daily_benefit_used_at AT TIME ZONE v_tz)::date
      < (now() AT TIME ZONE v_tz)::date
  );

  IF NOT v_available THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'El beneficio del día ya fue utilizado',
      'used_at', v_customer.daily_benefit_used_at,
      'used_branch_id', v_customer.daily_benefit_used_branch_id
    );
  END IF;

  -- Marcar como usado
  UPDATE public.loyalty_customers
  SET
    daily_benefit_used_at        = now(),
    daily_benefit_used_branch_id = p_branch_id,
    updated_at                   = now()
  WHERE id = p_customer_id;

  -- Registrar en el log
  INSERT INTO public.loyalty_daily_benefit_log
    (tenant_id, customer_id, branch_id, benefit_type, registered_by)
  VALUES
    (v_customer.tenant_id, p_customer_id, p_branch_id, p_benefit_type, p_registered_by);

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Beneficio registrado correctamente',
    'customer_name', v_customer.name,
    'benefit_type', p_benefit_type
  );
END;
$$;

-- ── 6. Comentarios en columnas ────────────────────────────────────────────────
COMMENT ON COLUMN public.loyalty_customers.membership_type IS
  'puntos = programa de puntos tradicional | termo = membresía física con beneficio diario';

COMMENT ON COLUMN public.loyalty_customers.daily_benefit_used_at IS
  'Última vez que se usó el beneficio diario. Se resetea automáticamente al comparar por fecha en CDMX.';

COMMENT ON COLUMN public.loyalty_customers.daily_benefit_used_branch_id IS
  'Sucursal donde se usó el beneficio hoy. Cross-sucursal: se verifica en cualquier sucursal del tenant.';

COMMENT ON TABLE public.loyalty_daily_benefit_log IS
  'Historial de uso del beneficio diario (café gratis). Útil para reportes de cafés otorgados por día/sucursal.';
