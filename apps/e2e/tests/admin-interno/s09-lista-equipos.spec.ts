/**
 * Propósito: Tests del Portal Admin Interno - Sección 9 (Lista de equipos y acciones).
 */

import { test, expect } from '@playwright/test';
import { isBaseUrlReachable } from '../helpers/reachability';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.beforeAll(async ({ request }) => {
  const ok = await isBaseUrlReachable(request);
  test.skip(!ok, 'Ambiente de testing inaccesible (VPN/URL).');
});

test.describe('Portal Admin Interno - 9. LISTA DE EQUIPOS', () => {
  test.beforeEach(async ({ page }) => {
    const consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();
  });

  test('9.1 Información por equipo: "Equipo #ID" y badges', async ({ page }) => {
    const consulta = new ConsultaPage(page);
    const count = await consulta.itemsEquipo.count();
    if (count === 0) test.skip(true, 'Sin equipos para validar lista');

    const item = consulta.itemsEquipo.first();
    await expect(item).toContainText(/Equipo #\d+/);
    await expect(item).toContainText(/Activo|Inactivo/);
  });

  test('9.3 Acciones por equipo: Editar/Ver estado/Bajar doc/Activar-Desactivar/Eliminar', async ({ page }) => {
    const consulta = new ConsultaPage(page);
    const count = await consulta.itemsEquipo.count();
    if (count === 0) test.skip(true, 'Sin equipos para validar acciones');

    const item = consulta.itemsEquipo.first();
    await expect(item.getByRole('button', { name: /Editar/i })).toBeVisible();
    await expect(item.getByRole('button', { name: /Ver estado/i })).toBeVisible();
    await expect(item.getByRole('button', { name: /Bajar documentación/i })).toBeVisible();
    await expect(item.getByRole('button', { name: /Desactivar|Activar/i })).toBeVisible();
    await expect(item.getByRole('button', { name: /Eliminar/i })).toBeVisible();
  });
});


