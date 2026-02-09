/**
 * Propósito: generar storageState autenticado para el rol Dador de Carga.
 */

import { test } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { getBaseConfig, getRoleCredentials } from '../../utils/env';
import { ensureAuthDirExists, getAuthStatePath, shouldReuseAuthState } from '../../utils/authState';

test('setup dador de carga (storageState)', async ({ page }) => {
  if (shouldReuseAuthState('dadorDeCarga')) return;

  const { loginPath } = getBaseConfig();
  const creds = getRoleCredentials().find((c) => c.role === 'dadorDeCarga');
  if (!creds) throw new Error('No se encontró DADOR_EMAIL.');

  const loginPage = new LoginPage(page);
  await loginPage.goto(loginPath);
  // El servidor puede redirigir a /dador o /dador-carga
  await loginPage.login({ email: creds.email, password: creds.password, expectedPathPrefix: /\/dador/i });

  ensureAuthDirExists();
  await page.context().storageState({ path: getAuthStatePath('dadorDeCarga') });
});
