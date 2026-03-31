/**
 * Helpdesk E2E Configuration
 * Configuration specific to helpdesk tests
 * 
 * Note: Helpdesk is accessed via the dador portal, so we use 'dadorDeCarga' storageState
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/helpdesk',
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8550',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'helpdesk',
      testMatch: '**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/dadorDeCarga.json',
      },
    },
  ],
});
