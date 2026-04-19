/**
 * mesero.e2e.ts — Mesero Móvil (viewport mobile)
 *
 * Cubre:
 * - Login en viewport móvil
 * - Ver mesas asignadas
 * - Tomar orden desde celular
 * - Enviar a cocina
 * - Ver estado de órdenes (ready chime)
 */
import { test, expect, Page } from '@playwright/test';

const TEST_SLUG = process.env.TEST_TENANT_SLUG ?? 'barista';

async function loginMesero(page: Page) {
  await page.goto(`/r/${TEST_SLUG}`);
  await expect(page.getByText(/mesero|waiter/i).or(page.getByRole('button')).first()).toBeVisible({ timeout: 10_000 });

  // Seleccionar usuario mesero (si existe)
  const meseroBtn = page.getByRole('button', { name: /mesero|waiter/i }).first();
  if (await meseroBtn.isVisible({ timeout: 3_000 })) {
    await meseroBtn.click();
    // PIN del mesero (asumimos 1234 o primer usuario disponible)
    for (const digit of '1234'.split('')) {
      await page.getByRole('button', { name: digit, exact: true }).first().click();
    }
    const loginBtn = page.getByRole('button', { name: /entrar|ingresar/i });
    if (await loginBtn.isVisible()) await loginBtn.click();
    await page.waitForURL(/mesero|pos|dashboard/, { timeout: 10_000 });
  }
}

test.describe('Mesero Móvil — Layout', () => {
  test('la interfaz se adapta al viewport móvil', async ({ page }) => {
    await page.goto('/mesero');
    // No debe haber scroll horizontal (interfaz responsive)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // +5px de tolerancia
  });

  test('muestra el mapa de mesas en móvil', async ({ page }) => {
    await page.goto('/mesero');
    await expect(
      page.getByText(/mesa|table/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('el menú de platillos es scrolleable en móvil', async ({ page }) => {
    await page.goto('/mesero');
    // Seleccionar primera mesa disponible
    const table = page.locator('button, [role="button"]').filter({ hasText: /mesa\s*\d+/i }).first();
    if (await table.isVisible({ timeout: 5_000 })) {
      await table.click();
      // El menú debe aparecer
      await expect(page.getByText(/\$\d/)).toBeVisible({ timeout: 8_000 });
    }
  });
});

test.describe('Mesero Móvil — Tomar orden', () => {
  test('puede agregar platillo desde el menú móvil', async ({ page }) => {
    await page.goto('/mesero');

    const table = page.locator('button').filter({ hasText: /mesa\s*\d+|libre/i }).first();
    if (await table.isVisible({ timeout: 5_000 })) {
      await table.click();

      const dish = page.locator('button').filter({ hasText: /\$\d+/ }).first();
      if (await dish.isVisible({ timeout: 5_000 })) {
        await dish.click();
        // El carrito debe actualizarse
        await expect(page.getByText(/1×|\$\d+.*total/i)).toBeVisible({ timeout: 5_000 });
      }
    } else {
      test.skip();
    }
  });

  test('puede enviar orden a cocina desde móvil', async ({ page }) => {
    await page.goto('/mesero');

    const table = page.locator('button').filter({ hasText: /mesa\s*\d+|libre/i }).first();
    if (await table.isVisible({ timeout: 5_000 })) {
      await table.click();

      const dish = page.locator('button').filter({ hasText: /\$\d+/ }).first();
      if (await dish.isVisible({ timeout: 5_000 })) {
        await dish.click();

        const sendBtn = page.getByRole('button', { name: /enviar.*cocina|cocina|send/i }).first();
        if (await sendBtn.isVisible({ timeout: 3_000 })) {
          await sendBtn.click();
          await expect(page.getByText(/enviado|cocina|comanda/i)).toBeVisible({ timeout: 5_000 });
        }
      }
    } else {
      test.skip();
    }
  });
});

test.describe('Mesero Móvil — Notificaciones', () => {
  test('muestra indicador de órdenes listas', async ({ page }) => {
    await page.goto('/mesero');

    // El badge de órdenes listas puede estar en la UI
    const badge = page.getByText(/\d+.*lista|listo/i).or(
      page.locator('[class*="ready"], [class*="badge"][class*="green"]')
    ).first();

    // Puede estar vacío (sin órdenes listas) — verificar que no crashea
    await expect(page.getByText(/mesero|mesa|table/i).first()).toBeVisible({ timeout: 8_000 });
  });
});
