/**
 * Propósito: test base para E2E con dataset seed y helpers comunes.
 * Se usa para mantener specs concisos y evitar beforeAll repetidos.
 */

import { test as base, expect } from '@playwright/test';
import type { SeedData } from '../seed/seed.types';
import { ensureSeedData } from '../seed/seedManager';

type Fixtures = {
  seed: SeedData;
};

export const test = base.extend<Fixtures>({
  seed: async ({ request }, use) => {
    const data = await ensureSeedData(request);
    await use(data);
  },
});

export { expect };

// Chequeo de conectividad UI (evita falsos negativos por VPN/URL caída).
test.beforeEach(async ({ page }) => {
  try {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 8_000 });
  } catch {
    test.skip(true, 'Ambiente de testing inaccesible (VPN/URL).');
  }
});


