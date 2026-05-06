-- Agregar columnas de bloqueo por intentos fallidos a app_users
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS failed_pin_attempts  INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until     TIMESTAMPTZ;

-- Función para verificar si un usuario está bloqueado
CREATE OR REPLACE FUNCTION check_pin_lockout(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rec RECORD;
BEGIN
  SELECT failed_pin_attempts, pin_locked_until
  INTO v_rec
  FROM app_users
  WHERE id = p_user_id;

  -- Si está bloqueado y el tiempo no ha expirado
  IF v_rec.pin_locked_until IS NOT NULL AND v_rec.pin_locked_until > now() THEN
    RETURN jsonb_build_object(
      'locked', true,
      'seconds_left', EXTRACT(EPOCH FROM (v_rec.pin_locked_until - now()))::int
    );
  END IF;

  -- Si el bloqueo expiró, limpiar
  IF v_rec.pin_locked_until IS NOT NULL AND v_rec.pin_locked_until <= now() THEN
    UPDATE app_users
    SET failed_pin_attempts = 0, pin_locked_until = NULL
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object('locked', false, 'attempts', COALESCE(v_rec.failed_pin_attempts, 0));
END;
$$;

-- Función para registrar intento fallido
CREATE OR REPLACE FUNCTION register_failed_pin(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempts INTEGER;
  v_lock_until TIMESTAMPTZ;
BEGIN
  UPDATE app_users
  SET failed_pin_attempts = failed_pin_attempts + 1
  WHERE id = p_user_id
  RETURNING failed_pin_attempts INTO v_attempts;

  -- Escala de bloqueo:
  -- 5 intentos  → bloqueo 1 minuto
  -- 8 intentos  → bloqueo 5 minutos
  -- 10 intentos → bloqueo 30 minutos
  IF v_attempts >= 10 THEN
    v_lock_until := now() + interval '30 minutes';
  ELSIF v_attempts >= 8 THEN
    v_lock_until := now() + interval '5 minutes';
  ELSIF v_attempts >= 5 THEN
    v_lock_until := now() + interval '1 minute';
  END IF;

  IF v_lock_until IS NOT NULL THEN
    UPDATE app_users SET pin_locked_until = v_lock_until WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object('attempts', v_attempts, 'locked_until', v_lock_until);
END;
$$;

-- Función para limpiar intentos en login exitoso
CREATE OR REPLACE FUNCTION clear_pin_attempts(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE app_users
  SET failed_pin_attempts = 0, pin_locked_until = NULL
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION check_pin_lockout TO anon, authenticated;
GRANT EXECUTE ON FUNCTION register_failed_pin TO anon, authenticated;
GRANT EXECUTE ON FUNCTION clear_pin_attempts TO anon, authenticated;

SELECT 'PIN lockout instalado correctamente' AS resultado;
