/**
 * Propósito: Fixture de autenticación para Playwright.
 * Permite crear tests que ya tienen sesión iniciada.
 */

import { test as base, expect, Page } from '@playwright/test';
import { users, UserRole } from './users';

type AuthFixtures = {
    authenticatedPage: Page;
    loginAs: (role: UserRole) => Promise<void>;
};

/**
 * Realiza login con las credenciales del rol especificado.
 */
async function performLogin(page: Page, role: UserRole): Promise<void> {
    const user = users[role];

    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Esperar que el form esté visible
    await page.waitForSelector('form', { timeout: 10000 });

    // Llenar credenciales
    await page.fill('input[name="email"], input[type="email"]', user.email);
    await page.fill('input[name="password"], input[type="password"]', user.password);

    // Submit
    await page.click('button[type="submit"]');

    // Esperar redirección (varía según rol)
    await page.waitForURL(/(?!.*login).*/, { timeout: 15000 });

    // Verificar que el token se guardó
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
}

/**
 * Test extendido con fixtures de autenticación.
 * 
 * Uso:
 * ```typescript
 * import { test, expect } from '../fixtures/auth.fixture';
 * 
 * test('test con sesión de chofer', async ({ authenticatedPage }) => {
 *   // Ya está logueado como chofer
 *   await authenticatedPage.goto('/chofer');
 * });
 * 
 * test('test con login dinámico', async ({ page, loginAs }) => {
 *   await loginAs('dador');
 *   await page.goto('/dador');
 * });
 * ```
 */
export const test = base.extend<AuthFixtures>({
    authenticatedPage: async ({ page }, use) => {
        // Por defecto, loguea como chofer (el rol más común)
        await performLogin(page, 'chofer');
        await use(page);
    },

    loginAs: async ({ page }, use) => {
        const login = async (role: UserRole) => {
            await performLogin(page, role);
        };
        await use(login);
    }
});

export { expect } from '@playwright/test';

/**
 * Helper para crear un test que requiere un rol específico.
 */
export function testAs(role: UserRole) {
    return base.extend<{ authenticatedPage: Page }>({
        authenticatedPage: async ({ page }, use) => {
            await performLogin(page, role);
            await use(page);
        }
    });
}

// Exports específicos por rol
export const testAsChofer = testAs('chofer');
export const testAsTransportista = testAs('transportista');
export const testAsDador = testAs('dador');
export const testAsAdminInterno = testAs('adminInterno');
export const testAsCliente = testAs('cliente');
