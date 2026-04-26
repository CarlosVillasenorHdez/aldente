-- Módulo de Reservaciones
-- Permite a los restaurantes gestionar reservas de mesa con integración al POS

CREATE TABLE IF NOT EXISTS public.reservations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id     uuid REFERENCES public.branches(id) ON DELETE SET NULL,

  -- Datos del cliente
  customer_name text NOT NULL,
  customer_phone text DEFAULT '',
  customer_email text DEFAULT '',
  party_size    integer NOT NULL DEFAULT 2,

  -- Datos de la reserva
  reserved_for  timestamptz NOT NULL,   -- fecha y hora de la reserva
  duration_min  integer DEFAULT 90,     -- duración estimada en minutos
  table_id      uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  table_name    text DEFAULT '',        -- copia del nombre de la mesa al momento de reservar

  -- Estado
  status        text NOT NULL DEFAULT 'confirmada'
                CHECK (status IN ('pendiente','confirmada','llegó','no_show','cancelada')),
  notes         text DEFAULT '',
  source        text DEFAULT 'manual'   -- 'manual' | 'whatsapp' | 'web' | 'telefono'

  -- Auditoría
  created_by    text DEFAULT '',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_reservations_tenant_date
  ON public.reservations (tenant_id, reserved_for);

CREATE INDEX IF NOT EXISTS idx_reservations_branch
  ON public.reservations (branch_id, reserved_for);

CREATE INDEX IF NOT EXISTS idx_reservations_status
  ON public.reservations (tenant_id, status, reserved_for);

-- RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_reservations" ON public.reservations;
CREATE POLICY "tenant_reservations" ON public.reservations
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Función para marcar mesa como reservada cuando se confirma una reserva
CREATE OR REPLACE FUNCTION public.sync_table_reservation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Al confirmar una reserva con mesa asignada → marcar mesa como reservada
  IF NEW.status IN ('confirmada','pendiente') AND NEW.table_id IS NOT NULL THEN
    UPDATE public.restaurant_tables
    SET status = 'reservada', updated_at = now()
    WHERE id = NEW.table_id AND status = 'libre';
  END IF;

  -- Al cancelar/no_show → liberar la mesa si estaba reservada para esta reserva
  IF NEW.status IN ('cancelada','no_show') AND NEW.table_id IS NOT NULL THEN
    UPDATE public.restaurant_tables
    SET status = 'libre', updated_at = now()
    WHERE id = NEW.table_id AND status = 'reservada';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_reservation_table ON public.reservations;
CREATE TRIGGER trg_sync_reservation_table
  AFTER INSERT OR UPDATE OF status, table_id ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.sync_table_reservation_status();
