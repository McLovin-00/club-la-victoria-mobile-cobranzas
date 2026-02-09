/**
 * Tests extendidos para flowise.service.ts - cubrir líneas faltantes
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

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
};

jest.mock('../../src/services/config.service', () => ({
  ConfigService: mockConfigService,
}));

const mockAxios: any = {
  post: jest.fn(),
  get: jest.fn(),
};

jest.mock('axios', () => ({
  default: mockAxios,
  ...mockAxios,
}));

describe('FlowiseService extended', () => {
  let FlowiseService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../../src/services/flowise.service');
    FlowiseService = module.FlowiseService;
  });

  describe('analyzeRemito', () => {
    it('retorna error si Flowise no está habilitado', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({ enabled: false });
      
      const result = await FlowiseService.analyzeRemito('base64img');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Flowise no está habilitado');
    });

    it('retorna error si baseUrl o flowId no están configurados', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({ 
        enabled: true, 
        baseUrl: '', 
        flowId: '' 
      });
      
      const result = await FlowiseService.analyzeRemito('base64img');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Flowise no está configurado correctamente');
    });

    it('envía imagen a Flowise y retorna datos parseados', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({ 
        enabled: true, 
        baseUrl: 'http://flowise.test/', 
        flowId: 'flow123',
        apiKey: 'key',
        timeout: 30000,
      });
      
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: { text: '{"numeroRemito": "001", "confianza": 0.9}' },
      });
      
      const result = await FlowiseService.analyzeRemito('base64img');
      expect(result.success).toBe(true);
      expect(result.data?.confianza).toBe(0.9);
    });

    it('maneja JSON inválido en la respuesta', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({ 
        enabled: true, 
        baseUrl: 'http://flowise.test/', 
        flowId: 'flow123',
        apiKey: 'key',
        timeout: 30000,
      });
      
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: { text: '{invalid json}' },
      });
      
      const result = await FlowiseService.analyzeRemito('base64img');
      expect(result.success).toBe(true);
      // Datos por defecto cuando falla el parsing
      expect(result.data).toBeDefined();
    });

    it('maneja respuesta donde text es objeto directo', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({ 
        enabled: true, 
        baseUrl: 'http://flowise.test/', 
        flowId: 'flow123',
        apiKey: 'key',
        timeout: 30000,
      });
      
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: { text: { numeroRemito: '002', confianza: 0.85 } },
      });
      
      const result = await FlowiseService.analyzeRemito('base64img');
      expect(result.success).toBe(true);
      expect(result.data?.numeroRemito).toBe('002');
    });

    it('loggea advertencia cuando respuesta está vacía', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({ 
        enabled: true, 
        baseUrl: 'http://flowise.test/', 
        flowId: 'flow123',
        apiKey: 'key',
        timeout: 30000,
      });
      
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: {},
      });
      
      const result = await FlowiseService.analyzeRemito('base64img');
      expect(result.success).toBe(true);
      
      const { AppLogger } = await import('../../src/config/logger');
      expect(AppLogger.warn).toHaveBeenCalledWith('⚠️ No se pudo parsear respuesta JSON de Flowise');
    });

    it('retorna error si respuesta es inválida', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({ 
        enabled: true, 
        baseUrl: 'http://flowise.test', 
        flowId: 'flow123',
        timeout: 30000,
      });
      
      mockAxios.post.mockResolvedValue({
        status: 500,
        data: null,
      });
      
      const result = await FlowiseService.analyzeRemito('base64img');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Respuesta inválida de Flowise');
    });

    it('maneja errores de conexión', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({ 
        enabled: true, 
        baseUrl: 'http://flowise.test', 
        flowId: 'flow123',
        timeout: 30000,
      });
      
      mockAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));
      
      const result = await FlowiseService.analyzeRemito('base64img');
      expect(result.success).toBe(false);
      expect(result.error).toBe('ECONNREFUSED');
    });

    it('maneja errores con response de axios', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({ 
        enabled: true, 
        baseUrl: 'http://flowise.test', 
        flowId: 'flow123',
        timeout: 30000,
      });
      
      const axiosError: any = new Error('Request failed');
      axiosError.response = { status: 503, data: { message: 'Service unavailable' } };
      mockAxios.post.mockRejectedValue(axiosError);
      
      const result = await FlowiseService.analyzeRemito('base64img');
      expect(result.success).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('retorna error si baseUrl no está configurado', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({ baseUrl: '' });
      
      const result = await FlowiseService.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toBe('URL de Flowise no configurada');
    });

    it('retorna éxito si conexión es válida', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({ 
        baseUrl: 'http://flowise.test/',
        apiKey: 'key',
        flowId: 'flow123',
      });
      
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: [{ id: 'flow123', name: 'Test Flow' }],
      });
      
      const result = await FlowiseService.testConnection();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Conexión exitosa');
    });

    it('advierte si flowId no existe en la lista', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({ 
        baseUrl: 'http://flowise.test',
        flowId: 'nonexistent',
      });
      
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: [{ id: 'other', name: 'Other Flow' }],
      });
      
      const result = await FlowiseService.testConnection();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Flow ID no existe');
    });

    it('retorna status HTTP en caso de respuesta no-200', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({ 
        baseUrl: 'http://flowise.test',
      });
      
      mockAxios.get.mockResolvedValue({ status: 401, data: null });
      
      const result = await FlowiseService.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toBe('HTTP 401');
    });

    it('maneja errores de conexión', async () => {
      mockConfigService.getFlowiseConfig.mockResolvedValue({ 
        baseUrl: 'http://flowise.test',
      });
      
      mockAxios.get.mockRejectedValue(new Error('Timeout'));
      
      const result = await FlowiseService.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toBe('Timeout');
    });
  });
});

