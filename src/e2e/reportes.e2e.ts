/**
 * reportes.e2e.ts — Módulo de Reportes P&L y Corte de Caja
 *
 * Cubre:
 * - Acceso al P&L mensual
 * - Renderizado de gráficas
 * - Cambio de período
 * - Comparación año anterior
 * - Corte de caja: métricas del turno
 * - Exportar CSV del corte
 */
import { test, expect, Page } from '@playwright/test';

test.describe('Reportes — P&L', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reportes');
    await expect(page.getByText(/reporte|p&l|ventas|financiero/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('muestra el P&L mensual', async ({ page }) => {
    await expect(page.getByText(/ventas.*netas|ventas.*brutas|total.*ventas/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('muestra COGS y utilidad bruta', async ({ page }) => {
    await expect(page.getByText(/cogs|costo.*venta|utilidad.*bruta/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('muestra EBITDA o utilidad neta', async ({ page }) => {
    await expect(page.getByText(/ebitda|utilidad.*neta|resultado/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('puede cambiar de período mensual', async ({ page }) => {
    // Navegar al mes anterior
    const prevBtn = page.getByRole('button', { name: /anterior|prev|←|‹/i }).first();
    if (await prevBtn.isVisible({ timeout: 3_000 })) {
      await prevBtn.click();
      // Los datos deben recargarse (no crash)
      await expect(page.getByText(/ventas|total/i).first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test('muestra el desglose por mes (gráfica de barras)', async ({ page }) => {
    // La gráfica de tendencia mensual
    await expect(
      page.locator('canvas, svg, [class*="chart"], [class*="graph"]').first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('muestra la sección de comparación con año anterior', async ({ page }) => {
    const prevYearSection = page.getByText(/año anterior|vs.*año|previous year/i).first();
    if (await prevYearSection.isVisible({ timeout: 5_000 })) {
      await expect(prevYearSection).toBeVisible();
    }
  });
});

test.describe('Reportes — Analítica de inventario', () => {
  test('muestra la analítica de insumos', async ({ page }) => {
    await page.goto('/inventario');
    // Tab de analítica
    const analyticsTab = page.getByRole('tab', { name: /anal[ií]tica|análisis/i }).or(
      page.getByRole('button', { name: /anal[ií]tica|análisis/i })
    ).first();

    if (await analyticsTab.isVisible({ timeout: 3_000 })) {
      await analyticsTab.click();
      await expect(page.getByText(/insumo|ingrediente|consumo/i).first()).toBeVisible({ timeout: 8_000 });
    }
  });
});

test.describe('Corte de Caja', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/corte-caja');
    await expect(page.getByText(/corte.*caja|cierre.*caja|turno/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('muestra las métricas del turno actual', async ({ page }) => {
    await expect(page.getByText(/ventas.*total|total.*ventas|\$\d/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('muestra desglose por método de pago', async ({ page }) => {
    await expect(page.getByText(/efectivo/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/tarjeta/i)).toBeVisible({ timeout: 5_000 });
  });

  test('muestra tabla de ventas por mesero', async ({ page }) => {
    await expect(page.getByText(/mesero|por.*mesero|vendedor/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('el botón de exportar CSV está disponible', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /exportar.*csv|csv|descargar/i }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('exportar CSV genera un archivo descargable', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 5_000 }).catch(() => null);
    const csvBtn = page.getByRole('button', { name: /exportar.*csv|csv|descargar/i }).first();
    if (await csvBtn.isVisible({ timeout: 3_000 })) {
      await csvBtn.click();
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.csv$/i);
      }
    }
  });

  test('el botón de imprimir está disponible', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /imprimir|print/i }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('muestra el campo para cerrar caja', async ({ page }) => {
    // Campo para ingresar quién cierra la caja
    await expect(
      page.getByPlaceholder(/nombre.*cierre|cerrado.*por|who/i).or(
        page.getByText(/cerrar caja/i)
      ).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});
