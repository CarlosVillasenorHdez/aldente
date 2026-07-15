/**
 * pin.ts — Hasheo de PINs. ÚNICA fuente de verdad.
 *
 * IMPORTANTE: todo el que necesite hashear un PIN debe usar hashPin() de aquí.
 * NO copiar la lógica. Si el hash no coincide exactamente con el que usa el
 * login (AuthContext), el usuario queda bloqueado sin explicación.
 *
 * Este archivo existe porque el hasheo estaba duplicado en 5 lugares y dos
 * olvidaron la sal — el SuperAdmin y el cambio de PIN en Personal generaban
 * hashes que el login nunca reconocía.
 */

/** Sal del sistema. Debe coincidir con la verificación del login. */
const PIN_SALT = 'aldente_salt_2024';

/**
 * Hashea un PIN igual que lo hace el login. Úsala SIEMPRE que guardes un PIN.
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + PIN_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
