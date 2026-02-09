/**
 * Propósito: configuración base de Playwright para correr E2E contra el ambiente de testing (via VPN),
 * con proyectos por rol y autenticación vía storageState.
 *
 * Importante:
 * - El ambiente bloquea intentos fallidos de login por ~15 minutos.
 * - Por eso: sin reintentos en setup y sin tests de credenciales inválidas por defecto.
 */

import { defineConfig, devices } from '@playwright/test';
import { getBaseConfig } from './utils/env';

const { baseUrl } = getBaseConfig();

export default defineConfig({
  testDir: './tests',
  // Evitamos paralelismo agresivo por el bloqueo de login del ambiente.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Local: 4 workers para acelerar ejecución (storageState evita login múltiple).
  workers: process.env.CI ? 2 : 4,
  reporter: [['html', { open: 'never' }], ['list']],
  // Timeouts aumentados para servidor lento (ambiente de testing)
  timeout: 120_000, // 2 minutos por test
  expect: {
    timeout: 30_000, // 30s para assertions/waitFor
  },
  use: {
    baseURL: baseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30_000, // 30s por acción (click, fill, etc.)
    navigationTimeout: 60_000, // 60s para navegación
  },
  projects: [
    // ─── Setup projects (generan storageState, corren solos) ───
    {
      name: 'setup-cliente',
      testMatch: /cliente\.setup\.ts/,
      retries: 0,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-chofer',
      testMatch: /chofer\.setup\.ts/,
      retries: 0,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-transportista',
      testMatch: /transportista\.setup\.ts/,
      retries: 0,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-dadorDeCarga',
      testMatch: /dadorDeCarga\.setup\.ts/,
      retries: 0,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-adminInterno',
      testMatch: /adminInterno\.setup\.ts/,
      retries: 0,
      use: { ...devices['Desktop Chrome'] },
    },

    // ─── Smoke projects (sin dependencia de setup, asumen sesión existente) ───
    {
      name: 'smoke-cliente',
      testMatch: /cliente\.auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/cliente.json',
      },
    },
    {
      name: 'smoke-chofer',
      testMatch: /chofer\.auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/chofer.json',
      },
    },
    {
      name: 'smoke-transportista',
      testMatch: /transportista\.auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/transportista.json',
      },
    },
    {
      name: 'smoke-dador',
      testMatch: /dador\.auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/dadorDeCarga.json',
      },
    },
    {
      name: 'smoke-admin',
      testMatch: /adminInterno\.auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/adminInterno.json',
      },
    },

    // ─── Full projects (con dependencia → setup + specs) ───
    {
      name: 'cliente',
      dependencies: ['setup-cliente'],
      testMatch: ['tests/cliente/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/cliente.json',
      },
    },
    {
      name: 'chofer',
      dependencies: ['setup-chofer'],
      testMatch: ['tests/chofer/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/chofer.json',
      },
    },
    {
      name: 'transportista',
      dependencies: ['setup-transportista'],
      testMatch: ['tests/transportista/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/transportista.json',
      },
    },
    {
      name: 'dadorDeCarga',
      dependencies: ['setup-dadorDeCarga'],
      testMatch: ['tests/dador/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/dadorDeCarga.json',
      },
    },
    {
      name: 'adminInterno',
      dependencies: ['setup-adminInterno'],
      testMatch: ['tests/admin-interno/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/adminInterno.json',
      },
    },
  ],
});


