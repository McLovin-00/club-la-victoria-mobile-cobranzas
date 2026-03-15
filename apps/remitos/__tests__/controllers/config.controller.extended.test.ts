/**
 * Tests extendidos para config.controller.ts - cubrir líneas faltantes
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Response } from 'express';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockConfigService: any = {
  getFlowiseConfig: jest.fn(),
  updateFlowiseConfig: jest.fn(),
};

jest.mock('../../src/services/config.service', () => ({
  ConfigService: mockConfigService,
}));

const mockFlowiseService: any = {
  testConnection: jest.fn(),
};

jest.mock('../../src/services/flowise.service', () => ({
  FlowiseService: mockFlowiseService,
}));

describe('ConfigController extended', () => {
  let ConfigController: any;
  let mockRes: any;
  let jsonMock: jest.Mock<any>;
  let statusMock: jest.Mock<any>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../../src/controllers/config.controller');
    ConfigController = module.ConfigController;

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    const sendMock = jest.fn().mockReturnThis();
    const setHeaderMock = jest.fn().mockReturnThis();
    mockRes = {
      json: jsonMock,
      status: statusMock,
      send: sendMock,
      setHeader: setHeaderMock,
    };
  });

  describe('getFlowiseConfig', () => {
    it('retorna configuración con apiKey parcialmente oculta', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({
        enabled: true,
        baseUrl: 'http://test.com',
        apiKey: 'secretkey1234',
        flowId: 'flow123',
      });

      await ConfigController.getFlowiseConfig({} as any, mockRes as Response);

      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.success).toBe(true);
      expect(sent.data.apiKey).toBe('***1234');
    });

    it('retorna apiKey vacío si no hay apiKey', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({
        enabled: false,
        apiKey: '',
      });

      await ConfigController.getFlowiseConfig({} as any, mockRes as Response);

      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.success).toBe(true);
      expect(sent.data.apiKey).toBe('');
    });

    it('maneja errores y retorna 500', async () => {
      mockConfigService.getFlowiseConfig.mockRejectedValue(new Error('DB error') as never);

      await ConfigController.getFlowiseConfig({} as any, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.success).toBe(false);
      expect(sent.error).toBe('CONFIG_ERROR');
      expect(sent.message).toBe('Error al obtener configuración');
    });
  });

  describe('updateFlowiseConfig', () => {
    const mockReq = {
      body: {
        enabled: true,
        baseUrl: 'http://new.com',
        apiKey: 'newkey',
        flowId: 'newflow',
      },
      user: { userId: 1 },
    };

    it('actualiza configuración exitosamente', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({});
      mockConfigService.updateFlowiseConfig.mockResolvedValue(undefined);

      await ConfigController.updateFlowiseConfig(mockReq as any, mockRes as Response);

      expect(mockConfigService.updateFlowiseConfig).toHaveBeenCalled();
      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.success).toBe(true);
      expect(sent.message).toBe('Configuración actualizada');
    });

    it('mantiene apiKey anterior si viene con máscara', async () => {
      const reqMasked = {
        body: { apiKey: '***1234' },
        user: { userId: 1 },
      };
      mockConfigService.getFlowiseConfig.mockResolvedValue({ apiKey: 'oldkey' });
      mockConfigService.updateFlowiseConfig.mockResolvedValue(undefined);

      await ConfigController.updateFlowiseConfig(reqMasked as any, mockRes as Response);

      expect(mockConfigService.updateFlowiseConfig).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: undefined }),
        1
      );
    });

    it('maneja errores y retorna 500', async () => {
      mockConfigService.updateFlowiseConfig.mockRejectedValue(new Error('Update failed') as never);

      await ConfigController.updateFlowiseConfig(mockReq as any, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.success).toBe(false);
      expect(sent.error).toBe('UPDATE_CONFIG_ERROR');
      expect(sent.message).toBe('Error al actualizar configuración');
    });
  });

  describe('testFlowise', () => {
    it('retorna resultado de test exitoso', async () => {
      mockFlowiseService.testConnection.mockResolvedValue({
        success: true,
        message: 'Conexión OK',
      });

      await ConfigController.testFlowise({} as any, mockRes as Response);

      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.success).toBe(true);
      expect(sent.message).toBe('Conexión OK');
    });

    it('retorna resultado de test fallido', async () => {
      mockFlowiseService.testConnection.mockResolvedValue({
        success: false,
        message: 'No se pudo conectar',
      });

      await ConfigController.testFlowise({} as any, mockRes as Response);

      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.success).toBe(false);
      expect(sent.message).toBe('No se pudo conectar');
    });

    it('maneja errores y retorna 500', async () => {
      mockFlowiseService.testConnection.mockRejectedValue(new Error('Test error') as never);

      await ConfigController.testFlowise({} as any, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.success).toBe(false);
      expect(sent.error).toBe('TEST_ERROR');
      expect(sent.message).toBe('Error al probar conexión');
    });
  });
});

