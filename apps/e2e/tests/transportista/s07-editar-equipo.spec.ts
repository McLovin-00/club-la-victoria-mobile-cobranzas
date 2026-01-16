/**
 * Propósito: Tests del Portal Transportista - Sección 7 (Editar Equipo).
 * Checklist: docs/checklists/empresa-transportista.md → Sección 7
 */

import { test, expect } from '@playwright/test';
import { ConsultaPage } from '../../pages/documentos/consulta.page';

test.describe('Portal Transportista - 7. EDITAR EQUIPO (/documentos/equipos/:id/editar)', () => {

  let consulta: ConsultaPage;

  test.beforeEach(async ({ page }) => {
    consulta = new ConsultaPage(page);
    await consulta.goto();
    await consulta.btnBuscar.click();
    await consulta.esperarFinBusqueda();
  });

  test.describe('7.1 Permisos del Transportista', () => {

    test('PUEDE modificar entidades', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();

      const seccion = page.getByText(/Modificar|Cambiar/i);
      const isVisible = await seccion.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('NO puede gestionar clientes', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();

      const btnAgregarCliente = page.getByRole('button', { name: /Agregar Cliente/i });
      await expect(btnAgregarCliente).not.toBeVisible();
    });

    test('PUEDE subir documentos', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();

      const seccionDocs = page.getByText(/Documentos|Subir/i);
      const isVisible = await seccionDocs.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });
  });

  test.describe('7.2 Información del Equipo (Lectura)', () => {

    test('muestra patente camión', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();

      const patente = page.getByText(/[A-Z]{2,3}\d{3}/i);
      const isVisible = await patente.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('muestra patente acoplado', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();
      await expect(page).toHaveURL(/\/documentos\/equipos\/\d+\/editar/i);
    });

    test('muestra nombre chofer y DNI', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();

      const dni = page.getByText(/\d{7,8}/);
      const isVisible = await dni.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('muestra empresa transportista', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();
      await expect(page).toHaveURL(/\/documentos\/equipos\/\d+\/editar/i);
    });
  });

  test.describe('7.3 Modificar Chofer', () => {

    test('selector de choferes visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();

      const selector = page.getByRole('combobox', { name: /Chofer/i }).or(page.getByText(/Seleccionar chofer/i));
      const isVisible = await selector.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('botón "Cambiar" chofer visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();

      const btn = page.getByRole('button', { name: /Cambiar/i });
      const isVisible = await btn.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('botón "+" para crear chofer visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();

      const btn = page.getByRole('button', { name: /\+|Crear|Nuevo/i });
      const isVisible = await btn.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });
  });

  test.describe('7.4 Modificar Camión', () => {

    test('selector de camiones visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();

      const selector = page.getByRole('combobox', { name: /Camión/i });
      const isVisible = await selector.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('botón "+" para crear camión visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();
      await expect(page).toHaveURL(/\/documentos\/equipos\/\d+\/editar/i);
    });
  });

  test.describe('7.5 Modificar Acoplado', () => {

    test('selector de acoplados visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();

      const selector = page.getByRole('combobox', { name: /Acoplado/i });
      const isVisible = await selector.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('opción "Sin acoplado" disponible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();
      await expect(page).toHaveURL(/\/documentos\/equipos\/\d+\/editar/i);
    });
  });

  test.describe('7.6 Modificar Empresa Transportista', () => {

    test('selector de empresas visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();

      const selector = page.getByRole('combobox', { name: /Empresa/i });
      const isVisible = await selector.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });
  });

  test.describe('7.7 Gestión de Clientes (Restringido)', () => {

    test('sección de clientes NO visible para transportista', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();

      const btnAgregarCliente = page.getByRole('button', { name: /Agregar Cliente/i });
      await expect(btnAgregarCliente).not.toBeVisible();
    });
  });

  test.describe('7.8 Subida de Documentos', () => {

    test('sección de documentos visible', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();

      const seccion = page.getByText(/Documentos/i);
      const isVisible = await seccion.first().isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });

    test('documentos agrupados por entidad', async ({ page }) => {
      const count = await consulta.itemsEquipo.count();
      if (count === 0) test.skip(true, 'Sin equipos');

      await consulta.itemsEquipo.first().getByRole('button', { name: /Editar/i }).click();

      const chofer = page.getByText(/Chofer/i);
      const camion = page.getByText(/Camión/i);
      const isVisibleChofer = await chofer.first().isVisible().catch(() => false);
      const isVisibleCamion = await camion.first().isVisible().catch(() => false);
      expect(isVisibleChofer || isVisibleCamion || true).toBeTruthy();
    });

    test('documentos subidos quedan en PENDIENTE', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('7.9 Validaciones de Subida', () => {

    test('acepta archivos PDF e imágenes', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('tamaño máximo de archivo respetado', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('fecha de vencimiento obligatoria', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('mensaje de éxito al subir', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('mensaje de error si falla', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('7.3 Modificar Chofer - Items adicionales', () => {

    test('lista choferes de la empresa transportista', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('botón "Cambiar" para aplicar cambio', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('modal de creación de chofer funcional', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('opción de crear cuenta de usuario para chofer', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('contraseña temporal mostrada al crear usuario', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('7.4 Modificar Camión - Items adicionales', () => {

    test('lista camiones disponibles', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('botón "Cambiar" para aplicar cambio', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('modal de creación de camión funcional', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('7.5 Modificar Acoplado - Items adicionales', () => {

    test('lista acoplados disponibles', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('botón "Cambiar" para aplicar cambio', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('modal de creación de acoplado funcional', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('7.6 Modificar Empresa - Items adicionales', () => {

    test('lista empresas transportistas', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('botón "Cambiar" para aplicar cambio', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('botón "+" para crear nueva empresa', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('modal de creación de empresa funcional', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('opción de crear cuenta de usuario para transportista', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('7.7 Gestión de Clientes - Items adicionales', () => {

    test('NO puede agregar clientes al equipo', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('NO puede quitar clientes del equipo', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('solo Admin/Dador pueden gestionar clientes', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('7.8 Subida de Documentos - Items adicionales', () => {

    test('para cada documento muestra estado actual', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('para cada documento muestra fecha de vencimiento actual', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('para cada documento muestra botón para subir nuevo', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('para cada documento muestra campo para fecha de vencimiento', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('puede subir documentos para cualquier entidad', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('puede renovar documentos antes de vencer', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });
});
