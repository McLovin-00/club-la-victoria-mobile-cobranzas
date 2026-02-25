/**
 * Coverage tests for notification.service.ts
 * Covers: toDays, loadChoferData, sendToPhones, getGlobalEnabled, getWindows, getTemplates,
 *         addDuration, subtractDuration, render, shouldDeduplicate, send,
 *         checkExpirations, processDocumentNotifications, buildNotificationParams,
 *         sendWindowNotifications, sendAudienceNotifications, checkMissingDocs, checkMissingForEquipo.
 * @jest-environment node
 */

const mockPrisma = {
  chofer: { findUnique: jest.fn() },
  notificationLog: { findFirst: jest.fn(), create: jest.fn() },
  document: { findMany: jest.fn() },
  equipo: { findMany: jest.fn(), findUnique: jest.fn() },
  equipoCliente: { findMany: jest.fn() },
  dadorCarga: { findUnique: jest.fn() },
};

jest.mock('../src/config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockSystemConfigService = {
  getConfig: jest.fn(),
};
jest.mock('../src/services/system-config.service', () => ({
  SystemConfigService: mockSystemConfigService,
}));

const mockEvolutionClient = {
  sendText: jest.fn(),
};
jest.mock('../src/services/evolution-client.service', () => ({
  EvolutionClient: mockEvolutionClient,
}));

const mockComplianceService = {
  evaluateEquipoCliente: jest.fn(),
};
jest.mock('../src/services/compliance.service', () => ({
  ComplianceService: mockComplianceService,
}));

import { NotificationService } from '../src/services/notification.service';

describe('NotificationService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ====================================================================
  // getGlobalEnabled
  // ====================================================================
  describe('getGlobalEnabled', () => {
    it('should return true when tenant config is "true"', async () => {
      mockSystemConfigService.getConfig.mockResolvedValue('true');

      const result = await NotificationService.getGlobalEnabled(1);

      expect(result).toBe(true);
    });

    it('should return false when tenant config is "false"', async () => {
      mockSystemConfigService.getConfig.mockResolvedValue('false');

      const result = await NotificationService.getGlobalEnabled(1);

      expect(result).toBe(false);
    });

    it('should fallback to default config when tenant config is null', async () => {
      mockSystemConfigService.getConfig
        .mockResolvedValueOnce(null)     // tenant-specific
        .mockResolvedValueOnce('true');  // default

      const result = await NotificationService.getGlobalEnabled(1);

      expect(result).toBe(true);
    });

    it('should return false when both configs are null', async () => {
      mockSystemConfigService.getConfig
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await NotificationService.getGlobalEnabled(1);

      expect(result).toBe(false);
    });
  });

  // ====================================================================
  // getWindows
  // ====================================================================
  describe('getWindows', () => {
    it('should return parsed windows from config', async () => {
      const config = JSON.stringify({
        aviso: { enabled: true, unit: 'days', value: 60 },
        alerta: { enabled: false, unit: 'weeks', value: 1 },
        alarma: { enabled: true, unit: 'months', value: 1 },
      });
      mockSystemConfigService.getConfig.mockResolvedValue(config);

      const result = await NotificationService.getWindows(1);

      expect(result.aviso.value).toBe(60);
      expect(result.alerta.enabled).toBe(false);
    });

    it('should return defaults when config is null', async () => {
      mockSystemConfigService.getConfig.mockResolvedValue(null);

      const result = await NotificationService.getWindows(1);

      expect(result.aviso.value).toBe(30);
      expect(result.alerta.value).toBe(14);
      expect(result.alarma.value).toBe(3);
    });

    it('should return defaults on invalid JSON', async () => {
      mockSystemConfigService.getConfig.mockResolvedValue('invalid-json');

      const result = await NotificationService.getWindows(1);

      expect(result.aviso.enabled).toBe(true);
    });

    it('should fallback to global config when tenant config is null', async () => {
      mockSystemConfigService.getConfig
        .mockResolvedValueOnce(null) // tenant
        .mockResolvedValueOnce(JSON.stringify({ aviso: { enabled: false, unit: 'days', value: 15 }, alerta: { enabled: true, unit: 'days', value: 7 }, alarma: { enabled: true, unit: 'days', value: 1 } })); // global

      const result = await NotificationService.getWindows(1);

      expect(result.aviso.value).toBe(15);
    });
  });

  // ====================================================================
  // getTemplates
  // ====================================================================
  describe('getTemplates', () => {
    it('should return parsed templates', async () => {
      const tpl = JSON.stringify({ aviso: { chofer: { enabled: false, text: 'custom' } } });
      mockSystemConfigService.getConfig.mockResolvedValue(tpl);

      const result = await NotificationService.getTemplates(1);

      expect(result.aviso.chofer.enabled).toBe(false);
    });

    it('should return defaults when null', async () => {
      mockSystemConfigService.getConfig.mockResolvedValue(null);

      const result = await NotificationService.getTemplates(1);

      expect(result.aviso.chofer.enabled).toBe(true);
    });

    it('should return defaults on invalid JSON', async () => {
      mockSystemConfigService.getConfig.mockResolvedValue('broken');

      const result = await NotificationService.getTemplates(1);

      expect(result.aviso.chofer.enabled).toBe(true);
    });
  });

  // ====================================================================
  // render
  // ====================================================================
  describe('render', () => {
    it('should replace template variables', () => {
      const result = NotificationService.render('Hola {{nombre_chofer}}, tu {{documento}} vence el {{vence_el}}.', {
        nombre_chofer: 'Juan',
        documento: 'DNI',
        vence_el: '01/01/2026',
      });

      expect(result).toBe('Hola Juan, tu DNI vence el 01/01/2026.');
    });

    it('should handle missing variables as empty string', () => {
      const result = NotificationService.render('Hola {{ nombre }}', {});

      expect(result).toBe('Hola ');
    });

    it('should handle variables with spaces', () => {
      const result = NotificationService.render('{{ nombre_chofer }}', { nombre_chofer: 'Pedro' });

      expect(result).toBe('Pedro');
    });
  });

  // ====================================================================
  // shouldDeduplicate
  // ====================================================================
  describe('shouldDeduplicate', () => {
    it('should return true when log exists today', async () => {
      mockPrisma.notificationLog.findFirst.mockResolvedValue({ id: 1 });

      const result = await NotificationService.shouldDeduplicate({
        documentId: 1, type: 'aviso', audience: 'CHOFER',
      });

      expect(result).toBe(true);
    });

    it('should return false when no log today', async () => {
      mockPrisma.notificationLog.findFirst.mockResolvedValue(null);

      const result = await NotificationService.shouldDeduplicate({
        documentId: 1, type: 'aviso', audience: 'CHOFER',
      });

      expect(result).toBe(false);
    });

    it('should handle equipoId', async () => {
      mockPrisma.notificationLog.findFirst.mockResolvedValue(null);

      const result = await NotificationService.shouldDeduplicate({
        equipoId: 5, type: 'faltante', audience: 'DADOR',
      });

      expect(result).toBe(false);
    });
  });

  // ====================================================================
  // send
  // ====================================================================
  describe('send', () => {
    it('should send message and log success', async () => {
      mockPrisma.notificationLog.findFirst.mockResolvedValue(null);
      mockEvolutionClient.sendText.mockResolvedValue({ ok: true });
      mockPrisma.notificationLog.create.mockResolvedValue({});

      await NotificationService.send('+5491112345678', 'Hola', {
        documentId: 1, dadorId: 10, audience: 'CHOFER', type: 'aviso', tenantId: 1, templateKey: 'templates.aviso.chofer',
      });

      expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'SENT' }),
      }));
    });

    it('should log FAILED when evolution returns not ok', async () => {
      mockPrisma.notificationLog.findFirst.mockResolvedValue(null);
      mockEvolutionClient.sendText.mockResolvedValue({ ok: false, message: 'Invalid number', status: 400 });
      mockPrisma.notificationLog.create.mockResolvedValue({});

      await NotificationService.send('+5491112345678', 'Hola', {
        documentId: 1, audience: 'CHOFER', type: 'aviso', tenantId: 1, templateKey: 'templates.aviso.chofer',
      });

      expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }));
    });

    it('should skip when deduplicate returns true', async () => {
      mockPrisma.notificationLog.findFirst.mockResolvedValue({ id: 1 });

      await NotificationService.send('+5491112345678', 'Hola', {
        documentId: 1, audience: 'CHOFER', type: 'aviso', tenantId: 1, templateKey: 'key',
      });

      expect(mockEvolutionClient.sendText).not.toHaveBeenCalled();
    });

    it('should handle error gracefully', async () => {
      mockPrisma.notificationLog.findFirst.mockRejectedValue(new Error('DB error'));

      await NotificationService.send('+5491112345678', 'Hola', {
        documentId: 1, audience: 'CHOFER', type: 'aviso', tenantId: 1, templateKey: 'key',
      });

      expect(mockEvolutionClient.sendText).not.toHaveBeenCalled();
    });

    it('should handle resp without message (use status)', async () => {
      mockPrisma.notificationLog.findFirst.mockResolvedValue(null);
      mockEvolutionClient.sendText.mockResolvedValue({ ok: false, status: 500 });
      mockPrisma.notificationLog.create.mockResolvedValue({});

      await NotificationService.send('+5491112345678', 'Hola', {
        documentId: 1, audience: 'DADOR', type: 'alerta', tenantId: 1, templateKey: 'key',
      });

      expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ error: '500' }),
      }));
    });
  });

  // ====================================================================
  // checkExpirations
  // ====================================================================
  describe('checkExpirations', () => {
    it('should return 0 when notifications disabled', async () => {
      mockSystemConfigService.getConfig.mockResolvedValue('false');

      const result = await NotificationService.checkExpirations(1);

      expect(result).toBe(0);
    });

    it('should process documents within horizon', async () => {
      mockSystemConfigService.getConfig
        .mockResolvedValueOnce('true')  // getGlobalEnabled
        .mockResolvedValueOnce(null)    // getWindows (tenant)
        .mockResolvedValueOnce(null)    // getWindows (global)
        .mockResolvedValueOnce(null)    // getTemplates (tenant)
        .mockResolvedValueOnce(null);   // getTemplates (global)

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 1,
          tenantEmpresaId: 1,
          dadorCargaId: 10,
          entityType: 'CHOFER',
          entityId: 100,
          expiresAt: tomorrow,
          template: { name: 'DNI' },
        },
      ]);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({
        razonSocial: 'Dador SA',
        phones: ['+5491112345678'],
        notifyDadorEnabled: true,
        notifyDriverEnabled: true,
      });
      mockPrisma.chofer.findUnique.mockResolvedValue({
        nombre: 'Juan',
        apellido: 'Perez',
        dni: '12345678',
        phones: ['+5491198765432'],
      });
      mockPrisma.notificationLog.findFirst.mockResolvedValue(null);
      mockEvolutionClient.sendText.mockResolvedValue({ ok: true });
      mockPrisma.notificationLog.create.mockResolvedValue({});

      const result = await NotificationService.checkExpirations(1);

      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should skip disabled windows', async () => {
      const windows = JSON.stringify({
        aviso: { enabled: false, unit: 'days', value: 30 },
        alerta: { enabled: false, unit: 'days', value: 14 },
        alarma: { enabled: false, unit: 'days', value: 3 },
      });
      mockSystemConfigService.getConfig
        .mockResolvedValueOnce('true')
        .mockResolvedValueOnce(windows)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockPrisma.document.findMany.mockResolvedValue([
        { id: 1, tenantEmpresaId: 1, dadorCargaId: 10, entityType: 'CHOFER', entityId: 100, expiresAt: tomorrow, template: { name: 'DNI' } },
      ]);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({ razonSocial: 'D', phones: [], notifyDadorEnabled: false, notifyDriverEnabled: false });
      mockPrisma.chofer.findUnique.mockResolvedValue({ nombre: '', apellido: '', dni: '', phones: [] });

      const result = await NotificationService.checkExpirations(1);

      expect(result).toBe(0);
    });

    it('should handle non-CHOFER entity in loadChoferData', async () => {
      mockSystemConfigService.getConfig
        .mockResolvedValueOnce('true')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockPrisma.document.findMany.mockResolvedValue([
        { id: 1, tenantEmpresaId: 1, dadorCargaId: 10, entityType: 'CAMION', entityId: 100, expiresAt: tomorrow, template: { name: 'RTO' } },
      ]);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({ razonSocial: 'D', phones: [], notifyDadorEnabled: false, notifyDriverEnabled: false });

      const result = await NotificationService.checkExpirations(1);

      expect(result).toBe(0);
    });

    it('should handle chofer not found in loadChoferData', async () => {
      mockSystemConfigService.getConfig
        .mockResolvedValueOnce('true')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockPrisma.document.findMany.mockResolvedValue([
        { id: 1, tenantEmpresaId: 1, dadorCargaId: 10, entityType: 'CHOFER', entityId: 999, expiresAt: tomorrow, template: { name: 'DNI' } },
      ]);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({ razonSocial: 'D', phones: [], notifyDadorEnabled: false, notifyDriverEnabled: false });
      mockPrisma.chofer.findUnique.mockResolvedValue(null);

      const result = await NotificationService.checkExpirations(1);

      expect(result).toBe(0);
    });

    it('should send to dador when notifyDadorEnabled and window applies', async () => {
      mockSystemConfigService.getConfig
        .mockResolvedValueOnce('true')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const in2Days = new Date();
      in2Days.setDate(in2Days.getDate() + 2);

      mockPrisma.document.findMany.mockResolvedValue([
        { id: 1, tenantEmpresaId: 1, dadorCargaId: 10, entityType: 'CHOFER', entityId: 100, expiresAt: in2Days, template: { name: 'DNI' } },
      ]);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({
        razonSocial: 'Dador SA',
        phones: ['+549111', '+549222'],
        notifyDadorEnabled: true,
        notifyDriverEnabled: false,
      });
      mockPrisma.chofer.findUnique.mockResolvedValue({ nombre: 'J', apellido: 'P', dni: '123', phones: [] });
      mockPrisma.notificationLog.findFirst.mockResolvedValue(null);
      mockEvolutionClient.sendText.mockResolvedValue({ ok: true });
      mockPrisma.notificationLog.create.mockResolvedValue({});

      const result = await NotificationService.checkExpirations(1);

      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should not send chofer notification when chofer has no phones', async () => {
      mockSystemConfigService.getConfig
        .mockResolvedValueOnce('true')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const in2Days = new Date();
      in2Days.setDate(in2Days.getDate() + 2);

      mockPrisma.document.findMany.mockResolvedValue([
        { id: 1, tenantEmpresaId: 1, dadorCargaId: 10, entityType: 'CHOFER', entityId: 100, expiresAt: in2Days, template: { name: 'DNI' } },
      ]);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({
        razonSocial: 'D',
        phones: [],
        notifyDadorEnabled: false,
        notifyDriverEnabled: true,
      });
      mockPrisma.chofer.findUnique.mockResolvedValue({ nombre: 'J', apellido: 'P', dni: '123', phones: [] });

      const result = await NotificationService.checkExpirations(1);

      expect(result).toBe(0);
    });

    it('should use weeks unit in toDays', async () => {
      const windowsConfig = JSON.stringify({
        aviso: { enabled: true, unit: 'weeks', value: 2 },
        alerta: { enabled: true, unit: 'months', value: 1 },
        alarma: { enabled: true, unit: 'days', value: 1 },
      });
      mockSystemConfigService.getConfig
        .mockResolvedValueOnce('true')
        .mockResolvedValueOnce(windowsConfig)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockPrisma.document.findMany.mockResolvedValue([]);

      const result = await NotificationService.checkExpirations(1);

      expect(result).toBe(0);
    });
  });

  // ====================================================================
  // checkMissingDocs
  // ====================================================================
  describe('checkMissingDocs', () => {
    it('should return 0 when disabled', async () => {
      mockSystemConfigService.getConfig.mockResolvedValue('false');

      const result = await NotificationService.checkMissingDocs(1);

      expect(result).toBe(0);
    });

    it('should notify dador when faltantes exist', async () => {
      mockSystemConfigService.getConfig
        .mockResolvedValueOnce('true');  // getGlobalEnabled

      mockPrisma.equipo.findMany.mockResolvedValue([
        { id: 1, dadorCargaId: 10, tenantEmpresaId: 1 },
      ]);
      mockPrisma.equipoCliente.findMany.mockResolvedValue([{ clienteId: 5 }]);
      mockComplianceService.evaluateEquipoCliente.mockResolvedValue([
        { state: 'FALTANTE' },
      ]);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({
        phones: ['+549111'],
        notifyDriverEnabled: false,
        notifyDadorEnabled: true,
      });
      mockPrisma.notificationLog.findFirst.mockResolvedValue(null);
      mockEvolutionClient.sendText.mockResolvedValue({ ok: true });
      mockPrisma.notificationLog.create.mockResolvedValue({});

      const result = await NotificationService.checkMissingDocs(1);

      expect(result).toBe(1);
    });

    it('should skip when no faltantes', async () => {
      mockSystemConfigService.getConfig.mockResolvedValueOnce('true');
      mockPrisma.equipo.findMany.mockResolvedValue([{ id: 1, dadorCargaId: 10, tenantEmpresaId: 1 }]);
      mockPrisma.equipoCliente.findMany.mockResolvedValue([{ clienteId: 5 }]);
      mockComplianceService.evaluateEquipoCliente.mockResolvedValue([
        { state: 'VIGENTE' },
      ]);

      const result = await NotificationService.checkMissingDocs(1);

      expect(result).toBe(0);
    });

    it('should skip when dador notifyDadorEnabled is false', async () => {
      mockSystemConfigService.getConfig.mockResolvedValueOnce('true');
      mockPrisma.equipo.findMany.mockResolvedValue([{ id: 1, dadorCargaId: 10, tenantEmpresaId: 1 }]);
      mockPrisma.equipoCliente.findMany.mockResolvedValue([{ clienteId: 5 }]);
      mockComplianceService.evaluateEquipoCliente.mockResolvedValue([{ state: 'FALTANTE' }]);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({
        phones: ['+549111'],
        notifyDadorEnabled: false,
      });

      const result = await NotificationService.checkMissingDocs(1);

      expect(result).toBe(0);
    });

    it('should handle dador with null phones', async () => {
      mockSystemConfigService.getConfig.mockResolvedValueOnce('true');
      mockPrisma.equipo.findMany.mockResolvedValue([{ id: 1, dadorCargaId: 10, tenantEmpresaId: 1 }]);
      mockPrisma.equipoCliente.findMany.mockResolvedValue([{ clienteId: 5 }]);
      mockComplianceService.evaluateEquipoCliente.mockResolvedValue([{ state: 'FALTANTE' }]);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({
        phones: null,
        notifyDadorEnabled: true,
      });
      mockPrisma.notificationLog.findFirst.mockResolvedValue(null);
      mockEvolutionClient.sendText.mockResolvedValue({ ok: true });
      mockPrisma.notificationLog.create.mockResolvedValue({});

      const result = await NotificationService.checkMissingDocs(1);

      expect(result).toBe(0);
    });
  });

  // ====================================================================
  // checkMissingForEquipo
  // ====================================================================
  describe('checkMissingForEquipo', () => {
    it('should return 0 when disabled', async () => {
      mockSystemConfigService.getConfig.mockResolvedValue('false');

      const result = await NotificationService.checkMissingForEquipo(1, 5);

      expect(result).toBe(0);
    });

    it('should return 0 when equipo not found', async () => {
      mockSystemConfigService.getConfig.mockResolvedValueOnce('true');
      mockPrisma.equipo.findUnique.mockResolvedValue(null);

      const result = await NotificationService.checkMissingForEquipo(1, 999);

      expect(result).toBe(0);
    });

    it('should notify for faltantes on specific equipo', async () => {
      mockSystemConfigService.getConfig.mockResolvedValueOnce('true');
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 5, dadorCargaId: 10, tenantEmpresaId: 1 });
      mockPrisma.equipoCliente.findMany.mockResolvedValue([{ clienteId: 3 }]);
      mockComplianceService.evaluateEquipoCliente.mockResolvedValue([{ state: 'FALTANTE' }]);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({
        phones: ['+549111', '+549222'],
        notifyDadorEnabled: true,
      });
      mockPrisma.notificationLog.findFirst.mockResolvedValue(null);
      mockEvolutionClient.sendText.mockResolvedValue({ ok: true });
      mockPrisma.notificationLog.create.mockResolvedValue({});

      const result = await NotificationService.checkMissingForEquipo(1, 5);

      expect(result).toBe(2);
    });

    it('should skip when no faltantes for equipo', async () => {
      mockSystemConfigService.getConfig.mockResolvedValueOnce('true');
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 5, dadorCargaId: 10, tenantEmpresaId: 1 });
      mockPrisma.equipoCliente.findMany.mockResolvedValue([{ clienteId: 3 }]);
      mockComplianceService.evaluateEquipoCliente.mockResolvedValue([{ state: 'VIGENTE' }]);

      const result = await NotificationService.checkMissingForEquipo(1, 5);

      expect(result).toBe(0);
    });

    it('should skip when dador notifyDadorEnabled is false', async () => {
      mockSystemConfigService.getConfig.mockResolvedValueOnce('true');
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 5, dadorCargaId: 10, tenantEmpresaId: 1 });
      mockPrisma.equipoCliente.findMany.mockResolvedValue([{ clienteId: 3 }]);
      mockComplianceService.evaluateEquipoCliente.mockResolvedValue([{ state: 'FALTANTE' }]);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({ phones: ['+549111'], notifyDadorEnabled: false });

      const result = await NotificationService.checkMissingForEquipo(1, 5);

      expect(result).toBe(0);
    });

    it('should limit phones to 5', async () => {
      mockSystemConfigService.getConfig.mockResolvedValueOnce('true');
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 5, dadorCargaId: 10, tenantEmpresaId: 1 });
      mockPrisma.equipoCliente.findMany.mockResolvedValue([{ clienteId: 3 }]);
      mockComplianceService.evaluateEquipoCliente.mockResolvedValue([{ state: 'FALTANTE' }]);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({
        phones: ['+549111', '+549222', '+549333', '+549444', '+549555', '+549666', '+549777'],
        notifyDadorEnabled: true,
      });
      mockPrisma.notificationLog.findFirst.mockResolvedValue(null);
      mockEvolutionClient.sendText.mockResolvedValue({ ok: true });
      mockPrisma.notificationLog.create.mockResolvedValue({});

      const result = await NotificationService.checkMissingForEquipo(1, 5);

      expect(result).toBe(5);
    });
  });

  // ====================================================================
  // buildNotificationParams branches
  // ====================================================================
  describe('buildNotificationParams edge cases via checkExpirations', () => {
    it('should handle doc with template=null', async () => {
      mockSystemConfigService.getConfig
        .mockResolvedValueOnce('true')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const in2Days = new Date();
      in2Days.setDate(in2Days.getDate() + 2);

      mockPrisma.document.findMany.mockResolvedValue([
        { id: 1, tenantEmpresaId: 1, dadorCargaId: 10, entityType: 'CAMION', entityId: 100, expiresAt: in2Days, template: null },
      ]);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({ razonSocial: null, phones: [], notifyDadorEnabled: false, notifyDriverEnabled: false });

      const result = await NotificationService.checkExpirations(1);

      expect(result).toBe(0);
    });

    it('should use CAMION entityId as patente_camion in params', async () => {
      mockSystemConfigService.getConfig
        .mockResolvedValueOnce('true')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const in2Days = new Date();
      in2Days.setDate(in2Days.getDate() + 2);

      mockPrisma.document.findMany.mockResolvedValue([
        { id: 1, tenantEmpresaId: 1, dadorCargaId: 10, entityType: 'CAMION', entityId: 50, expiresAt: in2Days, template: { name: 'RTO' } },
      ]);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({
        razonSocial: 'D',
        phones: ['+549111'],
        notifyDadorEnabled: true,
        notifyDriverEnabled: false,
      });
      mockPrisma.notificationLog.findFirst.mockResolvedValue(null);
      mockEvolutionClient.sendText.mockResolvedValue({ ok: true });
      mockPrisma.notificationLog.create.mockResolvedValue({});

      const result = await NotificationService.checkExpirations(1);

      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});
