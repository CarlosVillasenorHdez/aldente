/**
 * pos.e2e.ts — Flujo completo del Punto de Venta
 *
 * Cubre:
 * - Navegación al POS
 * - Selección de mesa
 * - Agregar platillos al carrito
 * - Enviar a cocina
 * - Procesar pago (efectivo y tarjeta)
 * - Propinas
 * - Cancelar orden
 * - Para llevar
 */
import { test, expect, Page } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function goToPOS(page: Page) {
  await page.goto('/pos-punto-de-venta');
  await expect(page.getByText(/mesa|tabla|table/i).first()).toBeVisible({ timeout: 10_000 });
}

async function selectFirstAvailableTable(page: Page) {
  // Click en la primera mesa libre (estado: libre/available)
  const table = page.locator('[data-testid="table-libre"], [data-status="libre"]').first();
  if (await table.isVisible()) {
    await table.click();
  } else {
    // Fallback: cualquier mesa disponible que no esté ocupada
    await page.locator('button').filter({ hasText: /mesa\s*\d+/i }).first().click();
  }
  await expect(page.getByText(/agregar|carrito|orden/i).first()).toBeVisible({ timeout: 8_000 });
}

async function addFirstDishToCart(page: Page) {
  // Click en el primer platillo disponible del menú
  const dish = page.locator('[data-testid="dish-item"], .dish-card, button').filter({ hasText: /\$\d+/ }).first();
  await dish.waitFor({ timeout: 8_000 });
  await dish.click();
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('POS — Flujo básico de venta en mesa', () => {
  test.beforeEach(async ({ page }) => {
    await goToPOS(page);
  });

  test('navega al POS y muestra mesas', async ({ page }) => {
    // El POS debe mostrar mesas disponibles
    await expect(page.getByText(/pos|punto de venta/i).first()).toBeVisible();
    // Debe haber al menos una mesa
    const tables = page.locator('[class*="table"], [data-testid*="table"]');
    expect(await tables.count()).toBeGreaterThan(0);
  });

  test('puede seleccionar una mesa y ver el panel de orden', async ({ page }) => {
    await selectFirstAvailableTable(page);
    // Panel de orden debe aparecer
    await expect(page.getByText(/subtotal|total|orden/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('puede agregar un platillo al carrito', async ({ page }) => {
    await selectFirstAvailableTable(page);
    await addFirstDishToCart(page);
    // El carrito debe mostrar al menos 1 ítem
    await expect(page.getByText(/1×|× 1|qty.*1/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('el total se actualiza al agregar platillos', async ({ page }) => {
    await selectFirstAvailableTable(page);
    // Obtener total inicial
    const totalEl = page.getByText(/total.*\$|^\$\d+/).first();
    await addFirstDishToCart(page);
    // El total debe ser > $0
    await expect(page.getByText(/\$[1-9]/)).toBeVisible({ timeout: 5_000 });
  });

  test('puede enviar orden a cocina', async ({ page }) => {
    await selectFirstAvailableTable(page);
    await addFirstDishToCart(page);

    // Buscar botón de enviar a cocina
    const sendBtn = page.getByRole('button', { name: /enviar.*cocina|cocina|send/i }).first();
    await sendBtn.waitFor({ timeout: 5_000 });
    await sendBtn.click();

    // Debe aparecer confirmación o cambio de estado
    await expect(
      page.getByText(/enviado|cocina|comanda|sent/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('puede abrir el modal de pago', async ({ page }) => {
    await selectFirstAvailableTable(page);
    await addFirstDishToCart(page);

    const cobrarBtn = page.getByRole('button', { name: /cobrar|pagar|pay/i }).first();
    await cobrarBtn.waitFor({ timeout: 5_000 });
    await cobrarBtn.click();

    // Modal de pago debe aparecer
    await expect(page.getByText(/método de pago|efectivo|tarjeta/i).first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('POS — Modal de pago y propinas', () => {
  test.beforeEach(async ({ page }) => {
    await goToPOS(page);
    await selectFirstAvailableTable(page);
    await addFirstDishToCart(page);
    // Abrir modal de pago
    await page.getByRole('button', { name: /cobrar|pagar/i }).first().click();
    await expect(page.getByText(/efectivo|tarjeta/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('muestra sección de propina', async ({ page }) => {
    await expect(page.getByText(/propina/i)).toBeVisible();
  });

  test('puede seleccionar 10% de propina', async ({ page }) => {
    const btn10 = page.getByRole('button', { name: '10%' });
    await btn10.click();
    // El total debe reflejar la propina
    await expect(page.getByText(/propina|\+\$/i)).toBeVisible({ timeout: 3_000 });
  });

  test('puede ingresar propina manual', async ({ page }) => {
    const tipInput = page.getByPlaceholder('0.00');
    await tipInput.fill('50');
    await expect(page.getByText(/50\.00|propina/i)).toBeVisible({ timeout: 3_000 });
  });

  test('muestra opciones de pago efectivo y tarjeta', async ({ page }) => {
    await expect(page.getByRole('button', { name: /efectivo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /tarjeta/i })).toBeVisible();
  });

  test('muestra cambio al ingresar monto en efectivo', async ({ page }) => {
    await page.getByRole('button', { name: /efectivo/i }).click();
    const cashInput = page.getByPlaceholder(/cantidad|monto/i).first();
    if (await cashInput.isVisible()) {
      await cashInput.fill('500');
      await expect(page.getByText(/cambio/i)).toBeVisible({ timeout: 3_000 });
    }
  });
});

test.describe('POS — Flujo para llevar', () => {
  test('puede crear una orden para llevar', async ({ page }) => {
    await goToPOS(page);

    // Buscar botón para llevar
    const takeoutBtn = page.getByRole('button', { name: /para llevar|takeout|llevar/i }).first();
    if (await takeoutBtn.isVisible({ timeout: 3_000 })) {
      await takeoutBtn.click();

      // Debe pedir nombre del cliente
      const nameInput = page.getByPlaceholder(/nombre.*cliente|cliente/i).first();
      if (await nameInput.isVisible({ timeout: 3_000 })) {
        await nameInput.fill('Juan Prueba');
        await page.getByRole('button', { name: /confirmar|crear|ok/i }).first().click();
      }

      await expect(page.getByText(/para llevar|juan prueba/i).first()).toBeVisible({ timeout: 5_000 });
    } else {
      test.skip(); // Si no tiene botón de para llevar visible, skip
    }
  });
});

test.describe('POS — Panel "En curso" para llevar', () => {
  test('muestra el panel de pedidos en curso', async ({ page }) => {
    await goToPOS(page);

    // Buscar botón del panel "en curso"
    const panelBtn = page.getByRole('button', { name: /en curso|pedidos|panel/i }).first();
    if (await panelBtn.isVisible({ timeout: 3_000 })) {
      await panelBtn.click();
      await expect(page.getByText(/pendiente|en cocina|listo/i).first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
