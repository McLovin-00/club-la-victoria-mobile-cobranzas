/**
 * Coverage tests for flowise-config.controller.ts
 * Covers: helpers (requireSuperadmin, validateFlowiseInput, fetchWithTimeout, buildFlowiseUpdateData),
 *         getConfig, updateConfig, testConnection, getStatus, getCurrentFlowiseConfig.
 * @jest-environment node
 */

const mockSystemConfigService = {
  getFlowiseConfig: jest.fn(),
  updateFlowiseConfig: jest.fn(),
};

jest.mock('../src/services/system-config.service', () => ({
  SystemConfigService: mockSystemConfigService,
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/middlewares/error.middleware', () => ({
  createError: (message: string, statusCode: number, code: string) => {
    const err: any = new Error(message);
    err.statusCode = statusCode;
    err.code = code;
    return err;
  },
}));

import { FlowiseConfigController, getCurrentFlowiseConfig } from '../src/controllers/flowise-config.controller';

function mockReq(overrides: Record<string, any> = {}): any {
  return {
    tenantId: 1,
    user: { userId: 1, role: 'SUPERADMIN' },
    query: {},
    params: {},
    body: {},
    ...overrides,
  };
}

function mockRes(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('FlowiseConfigController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ====================================================================
  // getConfig
  // ====================================================================
  describe('getConfig', () => {
    it('should return config with masked API key', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({
        enabled: true,
        baseUrl: 'https://flowise.example.com',
        apiKey: 'secret-key-1234',
        flowId: 'flow-abc',
        timeout: 30000,
      });
      const req = mockReq();
      const res = mockRes();

      await FlowiseConfigController.getConfig(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.apiKey).toBe('***1234');
      expect(body.baseUrl).toBe('https://flowise.example.com');
    });

    it('should return empty apiKey when none set', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({
        enabled: false,
        baseUrl: '',
        apiKey: '',
        flowId: '',
        timeout: 30000,
      });
      const req = mockReq();
      const res = mockRes();

      await FlowiseConfigController.getConfig(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.apiKey).toBe('');
    });

    it('should throw wrapped error for non-SUPERADMIN', async () => {
      const req = mockReq({ user: { userId: 1, role: 'ADMIN' } });
      const res = mockRes();

      await expect(FlowiseConfigController.getConfig(req, res)).rejects.toThrow('Error al obtener configuración');
    });

    it('should throw on service error', async () => {
      mockSystemConfigService.getFlowiseConfig.mockRejectedValue(new Error('DB error'));
      const req = mockReq();
      const res = mockRes();

      await expect(FlowiseConfigController.getConfig(req, res)).rejects.toThrow('Error al obtener configuración');
    });
  });

  // ====================================================================
  // updateConfig
  // ====================================================================
  describe('updateConfig', () => {
    it('should update config successfully', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({
        enabled: true,
        baseUrl: 'https://old.example.com',
        apiKey: 'old-key-5678',
        flowId: 'old-flow',
        timeout: 30000,
      });
      mockSystemConfigService.updateFlowiseConfig.mockResolvedValue(undefined);

      const req = mockReq({
        body: {
          enabled: true,
          baseUrl: 'https://new.example.com',
          flowId: 'new-flow',
          timeout: 60000,
          apiKey: 'new-key',
        },
      });
      const res = mockRes();

      await FlowiseConfigController.updateConfig(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Configuración actualizada exitosamente' });
      expect(mockSystemConfigService.updateFlowiseConfig).toHaveBeenCalled();
    });

    it('should preserve API key when placeholder is sent', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({
        enabled: true,
        baseUrl: 'https://example.com',
        apiKey: 'real-key-9999',
        flowId: 'flow-1',
        timeout: 30000,
      });
      mockSystemConfigService.updateFlowiseConfig.mockResolvedValue(undefined);

      const req = mockReq({
        body: { apiKey: '***9999' },
      });
      const res = mockRes();

      await FlowiseConfigController.updateConfig(req, res);

      const updateCall = mockSystemConfigService.updateFlowiseConfig.mock.calls[0][0];
      expect(updateCall.apiKey).toBe('real-key-9999');
    });

    it('should throw for non-SUPERADMIN', async () => {
      const req = mockReq({ user: { userId: 1, role: 'ADMIN' }, body: {} });
      const res = mockRes();

      await expect(FlowiseConfigController.updateConfig(req, res)).rejects.toThrow('Acceso denegado');
    });

    it('should throw when enabled=true but no baseUrl', async () => {
      const req = mockReq({ body: { enabled: true, flowId: 'abc' } });
      const res = mockRes();

      await expect(FlowiseConfigController.updateConfig(req, res)).rejects.toThrow('URL base requerida');
    });

    it('should throw when enabled=true but no flowId', async () => {
      const req = mockReq({ body: { enabled: true, baseUrl: 'https://test.com' } });
      const res = mockRes();

      await expect(FlowiseConfigController.updateConfig(req, res)).rejects.toThrow('Flow ID requerido');
    });

    it('should throw when timeout is below 5000', async () => {
      const req = mockReq({ body: { timeout: 1000 } });
      const res = mockRes();

      await expect(FlowiseConfigController.updateConfig(req, res)).rejects.toThrow('Timeout debe estar entre');
    });

    it('should throw when timeout is above 120000', async () => {
      const req = mockReq({ body: { timeout: 200000 } });
      const res = mockRes();

      await expect(FlowiseConfigController.updateConfig(req, res)).rejects.toThrow('Timeout debe estar entre');
    });

    it('should handle update with partial fields', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({
        enabled: true,
        baseUrl: 'https://test.com',
        apiKey: 'key',
        flowId: 'flow',
        timeout: 30000,
      });
      mockSystemConfigService.updateFlowiseConfig.mockResolvedValue(undefined);

      const req = mockReq({ body: { enabled: false } });
      const res = mockRes();

      await FlowiseConfigController.updateConfig(req, res);

      const updateCall = mockSystemConfigService.updateFlowiseConfig.mock.calls[0][0];
      expect(updateCall.enabled).toBe(false);
      expect(updateCall.baseUrl).toBeUndefined();
    });

    it('should rethrow error with code property', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({ enabled: false, apiKey: '' });
      mockSystemConfigService.updateFlowiseConfig.mockRejectedValue(
        Object.assign(new Error('Custom error'), { code: 'CUSTOM' }),
      );
      const req = mockReq({ body: {} });
      const res = mockRes();

      await expect(FlowiseConfigController.updateConfig(req, res)).rejects.toThrow('Custom error');
    });

    it('should wrap generic error', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({ enabled: false, apiKey: '' });
      mockSystemConfigService.updateFlowiseConfig.mockRejectedValue('raw-error');
      const req = mockReq({ body: {} });
      const res = mockRes();

      await expect(FlowiseConfigController.updateConfig(req, res)).rejects.toThrow('Error al actualizar configuración');
    });

    it('should handle empty apiKey (clear key)', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({ apiKey: 'old-key' });
      mockSystemConfigService.updateFlowiseConfig.mockResolvedValue(undefined);

      const req = mockReq({ body: { apiKey: '' } });
      const res = mockRes();

      await FlowiseConfigController.updateConfig(req, res);

      const updateCall = mockSystemConfigService.updateFlowiseConfig.mock.calls[0][0];
      expect(updateCall.apiKey).toBe('');
    });
  });

  // ====================================================================
  // testConnection
  // ====================================================================
  describe('testConnection', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterAll(() => {
      global.fetch = originalFetch;
    });

    it('should return 400 for non-SUPERADMIN', async () => {
      const req = mockReq({ user: { userId: 1, role: 'ADMIN' }, body: {} });
      const res = mockRes();

      await FlowiseConfigController.testConnection(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = res.json.mock.calls[0][0];
      expect(body.error).toContain('Acceso denegado');
    });

    it('should return 400 when no baseUrl for test', async () => {
      const req = mockReq({ body: { flowId: 'abc' } });
      const res = mockRes();

      await FlowiseConfigController.testConnection(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = res.json.mock.calls[0][0];
      expect(body.error).toContain('URL base requerida');
    });

    it('should return 400 when no flowId for test', async () => {
      const req = mockReq({ body: { baseUrl: 'https://test.com' } });
      const res = mockRes();

      await FlowiseConfigController.testConnection(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = res.json.mock.calls[0][0];
      expect(body.error).toContain('Flow ID requerido');
    });

    it('should test connection successfully with status 200', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({ apiKey: 'real-key' });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

      const req = mockReq({
        body: { baseUrl: 'https://flowise.example.com/', flowId: 'flow-1', apiKey: 'new-key', timeout: 30000 },
      });
      const res = mockRes();

      await FlowiseConfigController.testConnection(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.message).toBe('Conexión exitosa');
    });

    it('should handle baseUrl without trailing slash', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({ apiKey: '' });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

      const req = mockReq({
        body: { baseUrl: 'https://flowise.example.com', flowId: 'flow-1', timeout: 10000 },
      });
      const res = mockRes();

      await FlowiseConfigController.testConnection(req, res);

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toBe('https://flowise.example.com/api/v1/prediction/flow-1');
    });

    it('should accept 404/405 as valid responses', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({ apiKey: '' });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 405 });

      const req = mockReq({
        body: { baseUrl: 'https://flowise.example.com/', flowId: 'flow-1' },
      });
      const res = mockRes();

      await FlowiseConfigController.testConnection(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.message).toBe('Servidor responde (conexión OK)');
    });

    it('should skip auth header when apiKey is placeholder', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({ apiKey: 'secret-key-1234' });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

      const req = mockReq({
        body: { baseUrl: 'https://flowise.example.com/', flowId: 'flow-1', apiKey: '***1234' },
      });
      const res = mockRes();

      await FlowiseConfigController.testConnection(req, res);

      const fetchOpts = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchOpts.headers['Authorization']).toBeUndefined();
    });

    it('should return 400 on non-ok response', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({ apiKey: '' });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

      const req = mockReq({
        body: { baseUrl: 'https://flowise.example.com/', flowId: 'flow-1' },
      });
      const res = mockRes();

      await FlowiseConfigController.testConnection(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle AbortError (timeout)', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({ apiKey: '' });
      const abortErr = new Error('AbortError');
      abortErr.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValue(abortErr);

      const req = mockReq({
        body: { baseUrl: 'https://flowise.example.com/', flowId: 'flow-1', timeout: 5000 },
      });
      const res = mockRes();

      await FlowiseConfigController.testConnection(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = res.json.mock.calls[0][0];
      expect(body.error).toContain('Timeout');
    });

    it('should handle generic fetch error', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({ apiKey: '' });
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network fail'));

      const req = mockReq({
        body: { baseUrl: 'https://flowise.example.com/', flowId: 'flow-1' },
      });
      const res = mockRes();

      await FlowiseConfigController.testConnection(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = res.json.mock.calls[0][0];
      expect(body.error).toContain('Error de conexión');
    });

    it('should handle non-Error fetch error', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({ apiKey: '' });
      (global.fetch as jest.Mock).mockRejectedValue('raw string');

      const req = mockReq({
        body: { baseUrl: 'https://flowise.example.com/', flowId: 'flow-1' },
      });
      const res = mockRes();

      await FlowiseConfigController.testConnection(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ====================================================================
  // getStatus
  // ====================================================================
  describe('getStatus', () => {
    it('should return status for SUPERADMIN', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({
        enabled: true,
        baseUrl: 'https://example.com',
      });
      const req = mockReq();
      const res = mockRes();

      await FlowiseConfigController.getStatus(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.enabled).toBe(true);
      expect(body.configured).toBe(true);
    });

    it('should return configured=false when no baseUrl', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({
        enabled: false,
        baseUrl: '',
      });
      const req = mockReq();
      const res = mockRes();

      await FlowiseConfigController.getStatus(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.configured).toBe(false);
    });

    it('should throw wrapped error for non-SUPERADMIN', async () => {
      const req = mockReq({ user: { userId: 1, role: 'ADMIN' } });
      const res = mockRes();

      await expect(FlowiseConfigController.getStatus(req, res)).rejects.toThrow('Error al obtener estado');
    });

    it('should throw on service error', async () => {
      mockSystemConfigService.getFlowiseConfig.mockRejectedValue(new Error('fail'));
      const req = mockReq();
      const res = mockRes();

      await expect(FlowiseConfigController.getStatus(req, res)).rejects.toThrow('Error al obtener estado');
    });
  });

  // ====================================================================
  // getCurrentFlowiseConfig (exported function)
  // ====================================================================
  describe('getCurrentFlowiseConfig', () => {
    it('should return config from SystemConfigService', async () => {
      const cfg = { enabled: true, baseUrl: 'https://example.com', apiKey: 'key', flowId: 'flow', timeout: 30000 };
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue(cfg);

      const result = await getCurrentFlowiseConfig();

      expect(result).toEqual(cfg);
    });
  });

  // ====================================================================
  // buildFlowiseUpdateData - branches via updateConfig
  // ====================================================================
  describe('buildFlowiseUpdateData branches via updateConfig', () => {
    it('should handle baseUrl with whitespace', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({ apiKey: '' });
      mockSystemConfigService.updateFlowiseConfig.mockResolvedValue(undefined);

      const req = mockReq({ body: { baseUrl: '  https://test.com  ', flowId: '  flow-1  ', timeout: '15000' } });
      const res = mockRes();

      await FlowiseConfigController.updateConfig(req, res);

      const call = mockSystemConfigService.updateFlowiseConfig.mock.calls[0][0];
      expect(call.baseUrl).toBe('https://test.com');
      expect(call.flowId).toBe('flow-1');
      expect(call.timeout).toBe(15000);
    });

    it('should handle undefined apiKey (no update)', async () => {
      mockSystemConfigService.getFlowiseConfig.mockResolvedValue({ apiKey: 'existing' });
      mockSystemConfigService.updateFlowiseConfig.mockResolvedValue(undefined);

      const req = mockReq({ body: { enabled: true, baseUrl: 'https://x.com', flowId: 'f' } });
      const res = mockRes();

      await FlowiseConfigController.updateConfig(req, res);

      const call = mockSystemConfigService.updateFlowiseConfig.mock.calls[0][0];
      expect(call.apiKey).toBeUndefined();
    });
  });
});
