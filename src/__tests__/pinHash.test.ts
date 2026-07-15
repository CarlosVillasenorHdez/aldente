/**
 * pinHash.test.ts — El hasheo de PIN debe ser IDÉNTICO en todos lados.
 *
 * Este test existe por un bug real: el SuperAdmin y el cambio de PIN en
 * Personal hasheaban SIN la sal, mientras el login verificaba CON sal.
 * Resultado: cambiabas un PIN y el usuario quedaba bloqueado, sin error
 * visible. Si alguien vuelve a duplicar la lógica sin sal, esto lo atrapa.
 */
import { describe, it, expect } from 'vitest';
import { hashPin } from '../lib/pin';

// Hash de referencia: lo que el login espera para el PIN '1111'
// (SHA-256 de '1111aldente_salt_2024')
const HASH_1111 = '1ee7151bec2b80bc67c9126a5fafe9fcf75e3aeddda8c0ac9f05aa723b008ca2';

describe('Hasheo de PIN — una sola fuente de verdad', () => {
  it('produce el hash que el login espera (con sal)', async () => {
    expect(await hashPin('1111')).toBe(HASH_1111);
  });

  it('el mismo PIN siempre da el mismo hash (guardar = verificar)', async () => {
    const guardado = await hashPin('4321');
    const verificado = await hashPin('4321');
    expect(guardado).toBe(verificado);
  });

  it('PINs distintos dan hashes distintos', async () => {
    expect(await hashPin('1111')).not.toBe(await hashPin('2222'));
  });

  it('NO es un SHA-256 pelón: la sal debe estar aplicada', async () => {
    // SHA-256 de '1111' sin sal — el bug que teníamos
    const sinSal = '0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c';
    expect(await hashPin('1111')).not.toBe(sinSal);
  });

  it('devuelve hex de 64 caracteres', async () => {
    const h = await hashPin('9999');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});
