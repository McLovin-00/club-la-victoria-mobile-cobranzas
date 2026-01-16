/**
 * Propósito: generar storageState autenticado para el rol Chofer.
 */

import { test } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { getBaseConfig, getRoleCredentials } from '../../utils/env';
import { ensureAuthDirExists, getAuthStatePath, shouldReuseAuthState } from '../../utils/authState';

test('setup chofer (storageState)', async ({ page }) => {
  if (shouldReuseAuthState('chofer')) return;

  const { loginPath } = getBaseConfig();
  const creds = getRoleCredentials().find((c) => c.role === 'chofer');
  if (!creds) throw new Error('No se encontró CHOFER_EMAIL.');

  const loginPage = new LoginPage(page);
  await loginPage.goto(loginPath);
  await loginPage.login({ email: creds.email, password: creds.password, expectedPathPrefix: /\/chofer(\/|$)/i });

  ensureAuthDirExists();
  await page.context().storageState({ path: getAuthStatePath('chofer') });
});


