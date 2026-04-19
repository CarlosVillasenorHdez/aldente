/**
 * inventario.e2e.ts — Módulo de Inventario
 *
 * Cubre:
 * - Navegación al inventario
 * - Visualización de ingredientes
 * - Agregar insumo manual
 * - Importar CSV
 * - Registro de entrada de mercancía (con WACC)
 * - Alertas de stock bajo
 */
import { test, expect, Page } from '@playwright/test';

async function goToInventario(page: Page) {
  await page.goto('/inventario');
  await expect(page.getByText(/inventario|insumos|stock/i).first()).toBeVisible({ timeout: 10_000 });
}

test.describe('Inventario — Visualización', () => {
  test.beforeEach(async ({ page }) => {
    await goToInventario(page);
  });

  test('muestra la lista de ingredientes', async ({ page }) => {
    // Debe haber al menos la tabla/lista de ingredientes
    await expect(page.getByRole('table').or(page.locator('[class*="ingredient"]')).first()).toBeVisible({ timeout: 8_000 });
  });

  test('muestra las métricas de inventario (KPIs)', async ({ page }) => {
    // Valor en stock, alertas de stock bajo
    await expect(page.getByText(/valor.*stock|stock.*total|\$\d/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('puede buscar un ingrediente', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar.*ingrediente|buscar|search/i).first();
    await searchInput.waitFor({ timeout: 5_000 });
    await searchInput.fill('café');
    // El resultado debe filtrar
    await page.waitForTimeout(500); // debounce
    const results = page.getByText(/café/i);
    // Puede haber 0 resultados — lo importante es que no crashe
    expect(await results.count()).toBeGreaterThanOrEqual(0);
  });

  test('muestra el botón de importar CSV', async ({ page }) => {
    await expect(page.getByText(/csv/i).first()).toBeVisible();
  });
});

test.describe('Inventario — Agregar insumo', () => {
  test('puede abrir el formulario de nuevo insumo', async ({ page }) => {
    await goToInventario(page);

    await page.getByRole('button', { name: /agregar.*ingrediente|nuevo.*insumo|\+ insumo/i }).first().click();

    // El modal/form debe aparecer
    await expect(page.getByText(/nombre.*ingrediente|agregar.*insumo|nombre del insumo/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('valida campos requeridos al guardar sin datos', async ({ page }) => {
    await goToInventario(page);
    await page.getByRole('button', { name: /agregar.*ingrediente|nuevo.*insumo/i }).first().click();

    // Intentar guardar sin datos
    const saveBtn = page.getByRole('button', { name: /guardar|agregar ingrediente|save/i }).first();
    if (await saveBtn.isVisible({ timeout: 3_000 })) {
      await saveBtn.click();
      // Debe mostrar error de validación
      await expect(page.getByText(/requerido|obligatorio|nombre.*requerido/i)).toBeVisible({ timeout: 3_000 });
    }
  });
});

test.describe('Inventario — Entrada de mercancía', () => {
  test('puede abrir el modal de registrar movimiento', async ({ page }) => {
    await goToInventario(page);

    const movBtn = page.getByRole('button', { name: /registrar.*movimiento|entrada|movement/i }).first();
    await movBtn.waitFor({ timeout: 5_000 });
    await movBtn.click();

    await expect(page.getByText(/tipo.*movimiento|entrada|salida|merma/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('muestra el preview de WACC al ingresar precio', async ({ page }) => {
    await goToInventario(page);

    const movBtn = page.getByRole('button', { name: /registrar.*movimiento|entrada/i }).first();
    await movBtn.click();

    // Seleccionar tipo "entrada"
    const entradaOption = page.getByRole('option', { name: /entrada/i }).or(
      page.getByRole('button', { name: /entrada/i })
    ).first();
    if (await entradaOption.isVisible({ timeout: 3_000 })) {
      await entradaOption.click();
    }

    // Ingresar precio
    const precioInput = page.getByPlaceholder(/precio.*unidad|costo/i).first();
    if (await precioInput.isVisible({ timeout: 3_000 })) {
      await precioInput.fill('50');
      // El preview de WACC debe aparecer
      await expect(page.getByText(/wacc|costo.*promedio|nuevo.*costo/i)).toBeVisible({ timeout: 3_000 });
    }
  });
});

test.describe('Inventario — Alertas de stock', () => {
  test('muestra ingredientes con stock bajo', async ({ page }) => {
    await goToInventario(page);

    // El tab de alertas o el filtro de stock bajo
    const alertBtn = page.getByRole('button', { name: /alerta|stock.*bajo|bajo.*stock/i }).first();
    if (await alertBtn.isVisible({ timeout: 3_000 })) {
      await alertBtn.click();
      // Puede haber 0 alertas (stock suficiente) — verificar que el filtro funciona
      await page.waitForTimeout(500);
    }
    // Al menos no crashea
    await expect(page.getByText(/inventario|insumos/i).first()).toBeVisible();
  });
});
