import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config — Aldente ERP
 *
 * Correr en local:      npm run dev && npx playwright test
 * Correr en producción: PLAYWRIGHT_BASE_URL=https://aldente.vercel.app npx playwright test
 * UI mode:              npx playwright test --ui
 * Report:               npx playwright show-report
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const IS_PROD  = BASE_URL.includes('vercel.app') || BASE_URL.includes('aldenteerp');

// Tenant de prueba
const TEST_SLUG       = process.env.TEST_TENANT_SLUG   ?? 'barista';
const TEST_ADMIN_PIN  = process.env.TEST_ADMIN_PIN      ?? '1234';
const TEST_USER_NAME  = process.env.TEST_USER_NAME      ?? 'Admin';

export default defineConfig({
  testDir: './src/e2e',
  fullyParallel: false,         // ERP tiene estado compartido — no paralelizar
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    // Compartir estado de autenticación entre tests del mismo proyecto
    storageState: 'src/e2e/.auth/user.json',
  },

  projects: [
    // Setup: login y guardar sesión
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
      use: { storageState: undefined },
    },

    // Tests principales — dependen del setup de auth
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    // Tests en mobile viewport (Mesero Móvil)
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
      testMatch: '**/mesero.e2e.ts',
    },
  ],

  // Levantar Next.js en dev solo cuando se corre en local
  // En producción (PLAYWRIGHT_BASE_URL apuntando a vercel.app) no levantar nada
  ...(IS_PROD ? {} : {
    webServer: {
      command: 'npm run dev',
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  }),

  // Pasar variables a los tests
  globalSetup: './src/e2e/global-setup.ts',
});

export { BASE_URL, TEST_SLUG, TEST_ADMIN_PIN, TEST_USER_NAME };
