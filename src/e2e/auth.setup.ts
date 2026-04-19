/**
 * auth.setup.ts — hace login como admin y guarda el storageState
 * Corre una vez antes de los tests principales.
 * Los tests reutilizan la sesión sin necesidad de loguearse cada vez.
 */
import { test as setup, expect } from '@playwright/test';

const TEST_SLUG      = process.env.TEST_TENANT_SLUG  ?? 'barista';
const TEST_USER_NAME = process.env.TEST_USER_NAME    ?? 'Admin';
const TEST_ADMIN_PIN = process.env.TEST_ADMIN_PIN    ?? '1234';

setup('login como admin', async ({ page }) => {
  // Navegar al login del tenant
  await page.goto(`/r/${TEST_SLUG}`);
  await expect(page).toHaveTitle(/Aldente|Login|Acceso/i, { timeout: 15_000 });

  // Seleccionar usuario
  const userBtn = page.getByRole('button', { name: new RegExp(TEST_USER_NAME, 'i') }).first();
  await userBtn.waitFor({ timeout: 10_000 });
  await userBtn.click();

  // Ingresar PIN dígito a dígito
  for (const digit of TEST_ADMIN_PIN.split('')) {
    await page.getByRole('button', { name: digit, exact: true }).first().click();
  }

  // Confirmar login
  const loginBtn = page.getByRole('button', { name: /entrar|ingresar|login/i });
  if (await loginBtn.isVisible()) await loginBtn.click();

  // Esperar dashboard
  await expect(page).toHaveURL(/dashboard|pos|inicio/, { timeout: 15_000 });

  // Guardar sesión autenticada
  await page.context().storageState({ path: 'src/e2e/.auth/user.json' });
});
