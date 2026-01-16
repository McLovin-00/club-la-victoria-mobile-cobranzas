/**
 * Propósito: Tests del Portal Admin Interno - Sección 1 (Autenticación y acceso).
 * Checklist: docs/checklists/admin-interno.md → Sección 1
 *
 * Importante: por rate limit, credenciales inválidas quedan en skip.
 */

import { test, expect } from '@playwright/test';
import { isBaseUrlReachable } from '../helpers/reachability';

test.beforeAll(async ({ request }) => {
  const ok = await isBaseUrlReachable(request);
  test.skip(!ok, 'Ambiente de testing inaccesible (VPN/URL).');
});

test.describe('Portal Admin Interno - 1. AUTENTICACIÓN Y ACCESO', () => {
  test('1.1 Login válido: redirige a /portal/admin-interno y token en localStorage', async ({ page }) => {
    await page.goto('/portal/admin-interno', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/portal\/admin-interno(\/|$)/i);

    const tokenExists = await page.evaluate(() => !!localStorage.getItem('token'));
    expect(tokenExists).toBeTruthy();
  });

  test.skip('1.1 Login inválido: contraseña incorrecta muestra error', async () => {});
  test.skip('1.1 Login inválido: email inexistente muestra error', async () => {});

  test('1.2 Sesión: persiste al refrescar (F5)', async ({ page }) => {
    await page.goto('/portal/admin-interno', { waitUntil: 'domcontentloaded' });
    await page.reload();
    await expect(page).toHaveURL(/\/portal\/admin-interno(\/|$)/i);
  });

  test('1.3 Autorización: rutas permitidas navegan sin ir a /login', async ({ page }) => {
    const allowed = [
      '/portal/admin-interno',
      '/documentos/consulta',
      '/documentos/equipos/alta-completa',
      '/documentos/equipos/1/editar',
      '/documentos/equipos/1/estado',
      '/documentos/aprobacion',
      '/documentos/aprobacion/1',
      '/documentos/auditoria',
      '/platform-users',
      '/transportista',
      '/chofer',
      '/dador',
      '/cliente',
      '/cliente/equipos/1',
      '/perfil',
    ];

    for (const path of allowed) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(page.url()).not.toMatch(/\/login(\/|$)/i);
    }
  });

  test('1.4 Autorización: rutas restringidas no deben permitir acceso directo', async ({ page }) => {
    // Según App.tsx:
    // - /empresas: solo SUPERADMIN
    // - /end-users: ADMIN y SUPERADMIN
    const restricted = ['/empresas', '/end-users'];

    for (const path of restricted) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);
      const currentPath = new URL(page.url()).pathname;
      const stayedOnRestricted = currentPath.startsWith(path);
      const hasDeniedText = await page.getByText(/no autorizado|forbidden|acceso denegado/i).isVisible().catch(() => false);
      expect(!stayedOnRestricted || hasDeniedText).toBeTruthy();
    }
  });
});


