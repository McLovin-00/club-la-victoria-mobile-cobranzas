/**
 * Propósito: generar storageState autenticado para el rol Empresa Transportista.
 */

import { test } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { getBaseConfig, getRoleCredentials } from '../../utils/env';
import { ensureAuthDirExists, getAuthStatePath, shouldReuseAuthState } from '../../utils/authState';

test('setup transportista (storageState)', async ({ page }) => {
  if (shouldReuseAuthState('transportista')) return;

  const { loginPath } = getBaseConfig();
  const creds = getRoleCredentials().find((c) => c.role === 'transportista');
  if (!creds) throw new Error('No se encontró TRANSPORTISTA_EMAIL.');

  const loginPage = new LoginPage(page);
  await loginPage.goto(loginPath);
  await loginPage.login({ email: creds.email, password: creds.password, expectedPathPrefix: /\/transportista(\/|$)/i });

  ensureAuthDirExists();
  await page.context().storageState({ path: getAuthStatePath('transportista') });
});


