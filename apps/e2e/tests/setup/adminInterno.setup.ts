/**
 * Propósito: generar storageState autenticado para el rol Admin Interno.
 */

import { test } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { getBaseConfig, getRoleCredentials } from '../../utils/env';
import { ensureAuthDirExists, getAuthStatePath, shouldReuseAuthState } from '../../utils/authState';

test('setup admin interno (storageState)', async ({ page }) => {
    if (shouldReuseAuthState('adminInterno')) return;

    const { loginPath } = getBaseConfig();
    const creds = getRoleCredentials().find((c) => c.role === 'adminInterno');
    if (!creds) throw new Error('No se encontró ADMIN_INTERNO_EMAIL.');

    const loginPage = new LoginPage(page);
    await loginPage.goto(loginPath);
    // El servidor redirige a /admin o /portal/admin-interno tras login
    await loginPage.login({ email: creds.email, password: creds.password, expectedPathPrefix: /\/(admin|portal)/i });

    ensureAuthDirExists();
    await page.context().storageState({ path: getAuthStatePath('adminInterno') });
});
