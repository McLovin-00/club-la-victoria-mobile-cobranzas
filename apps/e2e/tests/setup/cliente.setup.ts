/**
 * Propósito: generar storageState autenticado para el rol Cliente.
 */

import { test } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { getBaseConfig, getRoleCredentials } from '../../utils/env';
import { ensureAuthDirExists, getAuthStatePath, shouldReuseAuthState } from '../../utils/authState';

test('setup cliente (storageState)', async ({ page }) => {
  if (shouldReuseAuthState('cliente')) return;

  const { loginPath } = getBaseConfig();
  // Password ya viene incluida en getRoleCredentials()
  const creds = getRoleCredentials().find((c) => c.role === 'cliente');
  if (!creds) throw new Error('No se encontró CLIENTE_EMAIL.');

  const loginPage = new LoginPage(page);
  await loginPage.goto(loginPath);
  await loginPage.login({ email: creds.email, password: creds.password, expectedPathPrefix: /\/cliente(\/|$)/i });

  ensureAuthDirExists();
  await page.context().storageState({ path: getAuthStatePath('cliente') });
});


