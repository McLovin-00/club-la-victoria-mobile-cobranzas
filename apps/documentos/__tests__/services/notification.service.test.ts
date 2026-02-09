/**
 * Tests unitarios para NotificationService
 * Alineados a la implementación actual (notificaciones vía Evolution + logs en DB).
 */

// Mock Prisma completo para este servicio
const prismaMock = {
  notificationLog: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  document: {
    findMany: jest.fn(),
  },
  dadorCarga: {
    findUnique: jest.fn(),
  },
  chofer: {
    findUnique: jest.fn(),
  },
  equipo: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  equipoCliente: {
    findMany: jest.fn(),
  },
};

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: {
    getConfig: jest.fn(),
  },
}));

jest.mock('../../src/services/evolution-client.service', () => ({
  EvolutionClient: {
    sendText: jest.fn().mockResolvedValue({ ok: true }),
  },
}));

jest.mock('../../src/services/compliance.service', () => ({
  ComplianceService: {
    evaluateEquipoCliente: jest.fn(),
  },
}));

import { NotificationService } from '../../src/services/notification.service';
import { SystemConfigService } from '../../src/services/system-config.service';
import { EvolutionClient } from '../../src/services/evolution-client.service';
import { ComplianceService } from '../../src/services/compliance.service';
import { AppLogger } from '../../src/config/logger';

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SystemConfigService.getConfig as jest.Mock).mockReset();
  });

  describe('render', () => {
    it('reemplaza placeholders {{ }}', () => {
      const result = NotificationService.render('Hola {{nombre}} - {{n}}', { nombre: 'Juan', n: 3 });
      expect(result).toBe('Hola Juan - 3');
    });

    it('reemplaza con parámetros faltantes usando string vacío', () => {
      const result = NotificationService.render('Hola {{nombre}} - {{apellido}}', { nombre: 'Juan' });
      expect(result).toBe('Hola Juan - ');
    });

    it('maneja template sin placeholders', () => {
      const result = NotificationService.render('Texto plano sin variables', { nombre: 'Juan' });
      expect(result).toBe('Texto plano sin variables');
    });
  });

  describe('shouldDeduplicate', () => {
    it('retorna true si ya existe log hoy', async () => {
      prismaMock.notificationLog.findFirst.mockResolvedValue({ id: 1 });
      await expect(NotificationService.shouldDeduplicate({ type: 'AVISO', audience: 'CHOFER', documentId: 1 })).resolves.toBe(true);
    });

    it('retorna false si no hay log', async () => {
      prismaMock.notificationLog.findFirst.mockResolvedValue(null);
      await expect(NotificationService.shouldDeduplicate({ type: 'AVISO', audience: 'CHOFER', documentId: 1 })).resolves.toBe(false);
    });

    it('funciona con equipoId en lugar de documentId', async () => {
      prismaMock.notificationLog.findFirst.mockResolvedValue(null);
      await expect(NotificationService.shouldDeduplicate({ type: 'FALTANTE', audience: 'DADOR', equipoId: 5 })).resolves.toBe(false);
      expect(prismaMock.notificationLog.findFirst).toHaveBeenCalledWith({
        where: {
          documentId: undefined,
          equipoId: 5,
          type: 'FALTANTE',
          audience: 'DADOR',
          sentAt: { gte: expect.any(Date) },
        },
      });
    });
  });

  describe('getGlobalEnabled', () => {
    it('prioriza config por tenant si existe', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('true')
        .mockResolvedValueOnce('false');

      await expect(NotificationService.getGlobalEnabled(1)).resolves.toBe(true);
    });

    it('usa fallback global si no hay override', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('true');

      const result = await NotificationService.getGlobalEnabled(1);
      expect(SystemConfigService.getConfig).toHaveBeenNthCalledWith(1, 'tenant:1:notifications.enabled');
      expect(SystemConfigService.getConfig).toHaveBeenNthCalledWith(2, 'notifications.enabled');
      expect(result).toBe(true);
    });

    it('retorna false cuando config es "false"', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockResolvedValue('false');
      await expect(NotificationService.getGlobalEnabled(1)).resolves.toBe(false);
    });

    it('retorna false cuando no hay config', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockResolvedValue(null);
      await expect(NotificationService.getGlobalEnabled(1)).resolves.toBe(false);
    });
  });

  describe('getWindows', () => {
    it('retorna config del tenant si existe', async () => {
      const config = {
        aviso: { enabled: true, unit: 'days' as const, value: 45 },
        alerta: { enabled: true, unit: 'weeks' as const, value: 2 },
        alarma: { enabled: false, unit: 'days' as const, value: 1 },
      };
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(config))
        .mockResolvedValueOnce(null);

      const result = await NotificationService.getWindows(1);
      expect(result).toEqual(config);
    });

    it('usa config global cuando no hay config de tenant', async () => {
      const config = {
        aviso: { enabled: false, unit: 'days' as const, value: 15 },
        alerta: { enabled: true, unit: 'months' as const, value: 1 },
        alarma: { enabled: true, unit: 'days' as const, value: 7 },
      };
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify(config));

      const result = await NotificationService.getWindows(1);
      expect(result).toEqual(config);
    });

    it('retorna valores por defecto cuando no hay config', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockResolvedValue(null);

      const result = await NotificationService.getWindows(1);

      expect(result).toEqual({
        aviso: { enabled: true, unit: 'days', value: 30 },
        alerta: { enabled: true, unit: 'days', value: 14 },
        alarma: { enabled: true, unit: 'days', value: 3 },
      });
    });

    it('maneja JSON inválido retornando defaults', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockResolvedValue('invalid-json{');

      const result = await NotificationService.getWindows(1);

      expect(result).toEqual({
        aviso: { enabled: true, unit: 'days', value: 30 },
        alerta: { enabled: true, unit: 'days', value: 14 },
        alarma: { enabled: true, unit: 'days', value: 3 },
      });
    });
  });

  describe('getTemplates', () => {
    it('retorna templates del tenant mergeados con defaults', async () => {
      const customTemplates = {
        aviso: {
          chofer: { enabled: true, text: 'Aviso customizado' },
          dador: { enabled: true, text: 'Aviso dador' },
        },
      };
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(customTemplates))
        .mockResolvedValueOnce(null);

      const result = await NotificationService.getTemplates(1);

      expect(result.aviso.chofer.text).toBe('Aviso customizado');
      expect(result.alerta).toBeDefined();
      expect(result.alarma).toBeDefined();
    });

    it('usa templates globales cuando no hay de tenant', async () => {
      const globalTemplates = {
        alerta: {
          chofer: { enabled: false, text: 'Alerta global' },
          dador: { enabled: true, text: 'Alerta dador global' },
        },
      };
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify(globalTemplates));

      const result = await NotificationService.getTemplates(1);

      expect(result.alerta.chofer.text).toBe('Alerta global');
      expect(result.aviso).toBeDefined();
    });

    it('retorna templates por defecto cuando no hay configuración', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockResolvedValue(null);

      const result = await NotificationService.getTemplates(1);

      expect(result.aviso.chofer.text).toContain('Hola {{nombre_chofer}}');
      expect(result.alerta.chofer.text).toContain('Alerta');
      expect(result.alarma.chofer.text).toContain('URGENTE');
      expect(result.aviso.dador.text).toContain('{{nombre_dador}}');
    });

    it('maneja JSON inválido retornando defaults', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockResolvedValue('bad-json');

      const result = await NotificationService.getTemplates(1);

      expect(result.aviso.chofer.text).toContain('Hola {{nombre_chofer}}');
      expect(result.alerta).toBeDefined();
      expect(result.alarma).toBeDefined();
    });
  });

  describe('send', () => {
    beforeEach(() => {
      prismaMock.notificationLog.create.mockResolvedValue({ id: 1 });
    });

    it('envía notificación y crea log cuando no es duplicado', async () => {
      prismaMock.notificationLog.findFirst.mockResolvedValue(null);
      (EvolutionClient.sendText as jest.Mock).mockResolvedValue({ ok: true });

      await NotificationService.send('5491112345678', 'Test message', {
        tenantId: 1,
        dadorId: 1,
        documentId: 1,
        audience: 'CHOFER',
        type: 'aviso',
        templateKey: 'test',
      });

      expect(EvolutionClient.sendText).toHaveBeenCalledWith('5491112345678', 'Test message');
      expect(prismaMock.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          target: '5491112345678',
          status: 'SENT',
          type: 'aviso',
          audience: 'CHOFER',
        }),
      });
    });

    it('no envía si ya existe log duplicado hoy', async () => {
      prismaMock.notificationLog.findFirst.mockResolvedValue({ id: 1, sentAt: new Date() });

      await NotificationService.send('5491112345678', 'Test message', {
        tenantId: 1,
        dadorId: 1,
        documentId: 1,
        audience: 'CHOFER',
        type: 'aviso',
        templateKey: 'test',
      });

      expect(EvolutionClient.sendText).not.toHaveBeenCalled();
      expect(prismaMock.notificationLog.create).not.toHaveBeenCalled();
    });

    it('crea log con status FAILED cuando envío falla', async () => {
      prismaMock.notificationLog.findFirst.mockResolvedValue(null);
      (EvolutionClient.sendText as jest.Mock).mockResolvedValue({
        ok: false,
        message: 'Error de conexión',
        status: 500,
      });

      await NotificationService.send('5491112345678', 'Test message', {
        tenantId: 1,
        dadorId: 1,
        documentId: 1,
        audience: 'CHOFER',
        type: 'aviso',
        templateKey: 'test',
      });

      expect(prismaMock.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'FAILED',
          error: 'Error de conexión',
        }),
      });
    });

    it('maneja errores y loguea sin lanzar excepción', async () => {
      prismaMock.notificationLog.findFirst.mockImplementation(() => {
        throw new Error('DB Error');
      });

      await expect(
        NotificationService.send('5491112345678', 'Test message', {
          tenantId: 1,
          dadorId: 1,
          documentId: 1,
          audience: 'CHOFER',
          type: 'aviso',
          templateKey: 'test',
        })
      ).resolves.not.toThrow();

      expect(AppLogger.error).toHaveBeenCalled();
    });

    it('funciona con equipoId en lugar de documentId', async () => {
      prismaMock.notificationLog.findFirst.mockResolvedValue(null);
      (EvolutionClient.sendText as jest.Mock).mockResolvedValue({ ok: true });

      await NotificationService.send('5491112345678', 'Test message', {
        tenantId: 1,
        dadorId: 1,
        equipoId: 5,
        audience: 'DADOR',
        type: 'faltante',
        templateKey: 'test',
      });

      expect(prismaMock.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          equipoId: 5,
          documentId: null,
        }),
      });
    });
  });

  describe('checkExpirations', () => {
    const mockWindows = JSON.stringify({
      aviso: { enabled: true, unit: 'days', value: 30 },
      alerta: { enabled: true, unit: 'days', value: 14 },
      alarma: { enabled: true, unit: 'days', value: 3 },
    });

    const mockTemplates = JSON.stringify({
      aviso: {
        chofer: { enabled: true, text: 'Aviso chofer' },
        dador: { enabled: true, text: 'Aviso dador' },
      },
      alerta: {
        chofer: { enabled: true, text: 'Alerta chofer' },
        dador: { enabled: true, text: 'Alerta dador' },
      },
      alarma: {
        chofer: { enabled: true, text: 'Alarma chofer' },
        dador: { enabled: true, text: 'Alarma dador' },
      },
    });

    const setupConfigMock = (enabled: boolean) => {
      return (key: string) => {
        if (key.includes('enabled')) return Promise.resolve(enabled ? 'true' : 'false');
        if (key.includes('windows')) return Promise.resolve(mockWindows);
        if (key.includes('templates')) return Promise.resolve(mockTemplates);
        return Promise.resolve(null);
      };
    };

    it('retorna 0 cuando notificaciones están deshabilitadas', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockImplementation(setupConfigMock(false));

      const result = await NotificationService.checkExpirations(1);

      expect(result).toBe(0);
      expect(prismaMock.document.findMany).not.toHaveBeenCalled();
    });

    it('procesa documentos por vencer y envía notificaciones', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockImplementation(setupConfigMock(true));
      prismaMock.document.findMany.mockResolvedValue([
        {
          id: 1,
          tenantEmpresaId: 1,
          dadorCargaId: 1,
          entityType: 'CHOFER',
          entityId: 1,
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 días
          template: { name: 'Licencia' },
        },
      ]);
      prismaMock.dadorCarga.findUnique.mockResolvedValue({
        razonSocial: 'Transportadora X',
        phones: ['5491112345678'],
        notifyDriverEnabled: true,
        notifyDadorEnabled: true,
      });
      prismaMock.chofer.findUnique.mockResolvedValue({
        nombre: 'Juan',
        apellido: 'Pérez',
        dni: '12345678',
        phones: ['5491198765432'],
      });
      prismaMock.notificationLog.findFirst.mockResolvedValue(null);
      prismaMock.notificationLog.create.mockResolvedValue({ id: 1 });
      (EvolutionClient.sendText as jest.Mock).mockResolvedValue({ ok: true });

      const result = await NotificationService.checkExpirations(1);

      expect(result).toBeGreaterThan(0);
      expect(EvolutionClient.sendText).toHaveBeenCalled();
    });

    it('no envía notificaciones cuando no hay documentos', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockImplementation(setupConfigMock(true));
      prismaMock.document.findMany.mockResolvedValue([]);

      const result = await NotificationService.checkExpirations(1);

      expect(result).toBe(0);
    });
  });

  describe('checkMissingDocs', () => {
    const setupEnabledMock = (enabled: boolean) => {
      return (key: string) => {
        if (key.includes('enabled')) return Promise.resolve(enabled ? 'true' : 'false');
        return Promise.resolve(null);
      };
    };

    it('retorna 0 cuando notificaciones están deshabilitadas', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockImplementation(setupEnabledMock(false));

      const result = await NotificationService.checkMissingDocs(1);

      expect(result).toBe(0);
      expect(prismaMock.equipo.findMany).not.toHaveBeenCalled();
    });

    it('envía notificaciones para equipos con documentos faltantes', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockImplementation(setupEnabledMock(true));
      prismaMock.equipo.findMany.mockResolvedValue([
        { id: 1, dadorCargaId: 1, tenantEmpresaId: 1 },
      ]);
      prismaMock.equipoCliente.findMany.mockResolvedValue([{ clienteId: 1 }]);
      (ComplianceService.evaluateEquipoCliente as jest.Mock).mockResolvedValue([
        { state: 'FALTANTE', documentTemplate: 'Seguro' },
        { state: 'VIGENTE', documentTemplate: 'Licencia' },
      ]);
      prismaMock.dadorCarga.findUnique.mockResolvedValue({
        phones: ['5491112345678'],
        notifyDriverEnabled: false,
        notifyDadorEnabled: true,
      });
      prismaMock.notificationLog.findFirst.mockResolvedValue(null);
      prismaMock.notificationLog.create.mockResolvedValue({ id: 1 });
      (EvolutionClient.sendText as jest.Mock).mockResolvedValue({ ok: true });

      const result = await NotificationService.checkMissingDocs(1);

      expect(result).toBeGreaterThan(0);
      expect(ComplianceService.evaluateEquipoCliente).toHaveBeenCalledWith(1, 1);
    });

    it('no envía notificaciones cuando no hay faltantes', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockImplementation(setupEnabledMock(true));
      prismaMock.equipo.findMany.mockResolvedValue([{ id: 1, dadorCargaId: 1, tenantEmpresaId: 1 }]);
      prismaMock.equipoCliente.findMany.mockResolvedValue([{ clienteId: 1 }]);
      (ComplianceService.evaluateEquipoCliente as jest.Mock).mockResolvedValue([
        { state: 'VIGENTE', documentTemplate: 'Seguro' },
      ]);

      const result = await NotificationService.checkMissingDocs(1);

      expect(result).toBe(0);
    });

    it('no envía cuando dador no tiene notificaciones habilitadas', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockImplementation(setupEnabledMock(true));
      prismaMock.equipo.findMany.mockResolvedValue([{ id: 1, dadorCargaId: 1, tenantEmpresaId: 1 }]);
      prismaMock.equipoCliente.findMany.mockResolvedValue([{ clienteId: 1 }]);
      (ComplianceService.evaluateEquipoCliente as jest.Mock).mockResolvedValue([{ state: 'FALTANTE' }]);
      prismaMock.dadorCarga.findUnique.mockResolvedValue({
        phones: ['5491112345678'],
        notifyDriverEnabled: false,
        notifyDadorEnabled: false,
      });

      const result = await NotificationService.checkMissingDocs(1);

      expect(result).toBe(0);
    });

    it('maneja equipos sin clientes asignados', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockImplementation(setupEnabledMock(true));
      prismaMock.equipo.findMany.mockResolvedValue([{ id: 1, dadorCargaId: 1, tenantEmpresaId: 1 }]);
      prismaMock.equipoCliente.findMany.mockResolvedValue([]);

      const result = await NotificationService.checkMissingDocs(1);

      expect(result).toBe(0);
    });
  });

  describe('checkMissingForEquipo', () => {
    const setupEnabledMock = (enabled: boolean) => {
      return (key: string) => {
        if (key.includes('enabled')) return Promise.resolve(enabled ? 'true' : 'false');
        return Promise.resolve(null);
      };
    };

    it('retorna 0 cuando notificaciones están deshabilitadas', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockImplementation(setupEnabledMock(false));

      const result = await NotificationService.checkMissingForEquipo(1, 5);

      expect(result).toBe(0);
      expect(prismaMock.equipo.findUnique).not.toHaveBeenCalled();
    });

    it('retorna 0 cuando equipo no existe', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockImplementation(setupEnabledMock(true));
      prismaMock.equipo.findUnique.mockResolvedValue(null);

      const result = await NotificationService.checkMissingForEquipo(1, 5);

      expect(result).toBe(0);
    });

    it('envía notificaciones para equipo con faltantes', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockImplementation(setupEnabledMock(true));
      prismaMock.equipo.findUnique.mockResolvedValue({
        id: 5,
        dadorCargaId: 1,
        tenantEmpresaId: 1,
      });
      prismaMock.equipoCliente.findMany.mockResolvedValue([{ clienteId: 1 }]);
      (ComplianceService.evaluateEquipoCliente as jest.Mock).mockResolvedValue([
        { state: 'FALTANTE', documentTemplate: 'Seguro' },
      ]);
      prismaMock.dadorCarga.findUnique.mockResolvedValue({
        phones: ['5491112345678'],
        notifyDriverEnabled: false,
        notifyDadorEnabled: true,
      });
      prismaMock.notificationLog.findFirst.mockResolvedValue(null);
      prismaMock.notificationLog.create.mockResolvedValue({ id: 1 });
      (EvolutionClient.sendText as jest.Mock).mockResolvedValue({ ok: true });

      const result = await NotificationService.checkMissingForEquipo(1, 5);

      expect(result).toBeGreaterThan(0);
    });

    it('envía múltiples notificaciones para múltiples clientes', async () => {
      (SystemConfigService.getConfig as jest.Mock).mockImplementation(setupEnabledMock(true));
      prismaMock.equipo.findUnique.mockResolvedValue({
        id: 5,
        dadorCargaId: 1,
        tenantEmpresaId: 1,
      });
      prismaMock.equipoCliente.findMany.mockResolvedValue([
        { clienteId: 1 },
        { clienteId: 2 },
      ]);
      (ComplianceService.evaluateEquipoCliente as jest.Mock)
        .mockResolvedValueOnce([{ state: 'FALTANTE' }])
        .mockResolvedValueOnce([{ state: 'FALTANTE' }]);
      prismaMock.dadorCarga.findUnique.mockResolvedValue({
        phones: ['5491112345678'],
        notifyDriverEnabled: false,
        notifyDadorEnabled: true,
      });
      prismaMock.notificationLog.findFirst.mockResolvedValue(null);
      prismaMock.notificationLog.create.mockResolvedValue({ id: 1 });
      (EvolutionClient.sendText as jest.Mock).mockResolvedValue({ ok: true });

      const result = await NotificationService.checkMissingForEquipo(1, 5);

      expect(result).toBeGreaterThan(0);
      expect(ComplianceService.evaluateEquipoCliente).toHaveBeenCalledTimes(2);
    });
  });
});



