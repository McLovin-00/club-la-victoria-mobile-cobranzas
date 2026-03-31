/**
 * Setup for Helpdesk E2E tests
 * Generates authenticated storageState for helpdesk user
 * 
 * Note: Helpdesk is accessed via the dador portal, so we use 'dadorDeCarga' credentials
 * and share the same storageState file.
 */

import { test } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { getBaseConfig, getRoleCredentials } from '../../utils/env';
import { ensureAuthDirExists, getAuthStatePath,
shouldReuseAuthState,
} from '../../utils/authState';

test('setup helpdesk user (storageState)', async ({ page }) => {
  // Helpdesk usa credenciales de dadorDeCarga (mismo portal)
  if (shouldReuseAuthState('dadorDeCarga')) return;

  const { loginPath } = getBaseConfig();
  const creds = getRoleCredentials().find((c) => c.role === 'dadorDeCarga');

  if (!creds) throw new Error('No se encontró credenciales para dadorDeCarga.');

  const loginPage = new LoginPage(page);
  await loginPage.goto(loginPath);
  await loginPage.login({
    email: creds.email,
    password: creds.password,
    expectedPathPrefix: /\/dador(\/|$)/i,
  });

  ensureAuthDirExists();
  await page.context().storageState({ path: getAuthStatePath('dadorDeCarga') });
});
