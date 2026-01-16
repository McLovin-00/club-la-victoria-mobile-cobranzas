/**
 * Tests reales para FlowiseService (src/services/flowise.service.ts)
 * @jest-environment node
 */

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const axiosPost = jest.fn();
const axiosGet = jest.fn();
jest.mock('axios', () => ({
  __esModule: true,
  default: { post: (...args: any[]) => axiosPost(...args), get: (...args: any[]) => axiosGet(...args) },
  post: (...args: any[]) => axiosPost(...args),
  get: (...args: any[]) => axiosGet(...args),
}));

const ConfigServiceMock = {
  getFlowiseConfig: jest.fn(),
};
jest.mock('../../src/services/config.service', () => ({
  ConfigService: ConfigServiceMock,
}));

import { FlowiseService } from '../../src/services/flowise.service';

describe('FlowiseService (real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('analyzeRemito: returns error when disabled', async () => {
    ConfigServiceMock.getFlowiseConfig.mockResolvedValue({ enabled: false, baseUrl: '', flowId: '', apiKey: '', timeout: 1000 });
    const out = await FlowiseService.analyzeRemito('abc');
    expect(out.success).toBe(false);
    expect(out.error).toContain('no está habilitado');
  });

  it('analyzeRemito: returns error when misconfigured', async () => {
    ConfigServiceMock.getFlowiseConfig.mockResolvedValue({ enabled: true, baseUrl: '', flowId: '', apiKey: '', timeout: 1000 });
    const out = await FlowiseService.analyzeRemito('abc');
    expect(out.success).toBe(false);
  });

  it('analyzeRemito: parses JSON embedded in string', async () => {
    ConfigServiceMock.getFlowiseConfig.mockResolvedValue({ enabled: true, baseUrl: 'http://x', flowId: 'flow', apiKey: '', timeout: 1000 });
    axiosPost.mockResolvedValue({
      status: 200,
      data: 'respuesta: {"numeroRemito":"R1","confianza":0.8,"camposDetectados":["numeroRemito"]}',
    });
    const out = await FlowiseService.analyzeRemito('abc');
    expect(out.success).toBe(true);
    expect(out.data?.numeroRemito).toBe('R1');
    expect(out.data?.confianza).toBe(0.8);
  });

  it('analyzeRemito: handles axios error', async () => {
    ConfigServiceMock.getFlowiseConfig.mockResolvedValue({ enabled: true, baseUrl: 'http://x', flowId: 'flow', apiKey: '', timeout: 1000 });
    axiosPost.mockRejectedValue(new Error('timeout'));
    const out = await FlowiseService.analyzeRemito('abc');
    expect(out.success).toBe(false);
    expect(out.error).toBe('timeout');
  });

  it('testConnection: ok with existing flowId', async () => {
    ConfigServiceMock.getFlowiseConfig.mockResolvedValue({ enabled: true, baseUrl: 'http://x', flowId: 'flow', apiKey: '', timeout: 1000 });
    axiosGet.mockResolvedValue({ status: 200, data: [{ id: 'flow' }] });
    const out = await FlowiseService.testConnection();
    expect(out.success).toBe(true);
  });
});


