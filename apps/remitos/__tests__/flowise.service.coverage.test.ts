/**
 * @jest-environment node
 */

process.env.REMITOS_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';

jest.mock('axios');
jest.mock('../src/services/config.service', () => ({
  ConfigService: {
    getFlowiseConfig: jest.fn(),
  },
}));
jest.mock('../src/config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import axios from 'axios';
import { FlowiseService } from '../src/services/flowise.service';
import { ConfigService } from '../src/services/config.service';

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedConfig = ConfigService.getFlowiseConfig as jest.Mock;

const baseConfig = {
  enabled: true,
  baseUrl: 'https://flowise.example.com',
  apiKey: 'test-key',
  flowId: 'flow-123',
  timeout: 30000,
  systemPrompt: 'prompt',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================================
// analyzeRemito
// ============================================================================
describe('FlowiseService.analyzeRemito', () => {
  it('returns error when disabled', async () => {
    mockedConfig.mockResolvedValue({ ...baseConfig, enabled: false });

    const result = await FlowiseService.analyzeRemito('base64data');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Flowise no está habilitado');
  });

  it('returns error when baseUrl is missing', async () => {
    mockedConfig.mockResolvedValue({ ...baseConfig, baseUrl: '' });

    const result = await FlowiseService.analyzeRemito('base64data');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Flowise no está configurado correctamente');
  });

  it('returns error when flowId is missing', async () => {
    mockedConfig.mockResolvedValue({ ...baseConfig, flowId: '' });

    const result = await FlowiseService.analyzeRemito('base64data');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Flowise no está configurado correctamente');
  });

  it('strips trailing slash from baseUrl', async () => {
    mockedConfig.mockResolvedValue({ ...baseConfig, baseUrl: 'https://flowise.example.com/' });
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { text: '{"numeroRemito": "001", "confianza": 90, "camposDetectados": [], "errores": []}' },
    });

    const result = await FlowiseService.analyzeRemito('base64data');

    expect(result.success).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://flowise.example.com/api/v1/prediction/flow-123',
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('succeeds with valid response (status 200)', async () => {
    mockedConfig.mockResolvedValue(baseConfig);
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: {
        text: JSON.stringify({
          numeroRemito: '0012-001',
          fechaOperacion: '17/05/2025',
          emisor: { nombre: 'Test', detalle: null },
          cliente: 'ClienteX',
          producto: 'Arena',
          transportista: 'TransX',
          chofer: { nombre: 'Chofer', dni: '123' },
          patentes: { chasis: 'AB-123', acoplado: null },
          pesosOrigen: { bruto: 100, tara: 50, neto: 50 },
          pesosDestino: null,
          confianza: 85,
          camposDetectados: ['numeroRemito'],
          errores: [],
        }),
      },
    });

    const result = await FlowiseService.analyzeRemito('base64data');

    expect(result.success).toBe(true);
    expect(result.data?.numeroRemito).toBe('0012-001');
    expect(result.data?.confianza).toBe(85);
  });

  it('includes Authorization header when apiKey is set', async () => {
    mockedConfig.mockResolvedValue(baseConfig);
    mockedAxios.post.mockResolvedValue({ status: 200, data: { text: '{}' } });

    await FlowiseService.analyzeRemito('base64data');

    const headers = mockedAxios.post.mock.calls[0][2]?.headers;
    expect(headers?.Authorization).toBe('Bearer test-key');
  });

  it('omits Authorization header when apiKey is empty', async () => {
    mockedConfig.mockResolvedValue({ ...baseConfig, apiKey: '' });
    mockedAxios.post.mockResolvedValue({ status: 200, data: { text: '{}' } });

    await FlowiseService.analyzeRemito('base64data');

    const headers = mockedAxios.post.mock.calls[0][2]?.headers;
    expect(headers?.Authorization).toBeUndefined();
  });

  it('returns error for non-200 response', async () => {
    mockedConfig.mockResolvedValue(baseConfig);
    mockedAxios.post.mockResolvedValue({ status: 500, data: null });

    const result = await FlowiseService.analyzeRemito('base64data');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Respuesta inválida de Flowise');
  });

  it('returns error for 200 but null data', async () => {
    mockedConfig.mockResolvedValue(baseConfig);
    mockedAxios.post.mockResolvedValue({ status: 200, data: null });

    const result = await FlowiseService.analyzeRemito('base64data');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Respuesta inválida de Flowise');
  });

  it('handles axios error', async () => {
    mockedConfig.mockResolvedValue(baseConfig);
    mockedAxios.post.mockRejectedValue(new Error('Network timeout'));

    const result = await FlowiseService.analyzeRemito('base64data');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network timeout');
  });

  it('handles axios error with response details', async () => {
    mockedConfig.mockResolvedValue(baseConfig);
    const axiosError = new Error('Request failed') as any;
    axiosError.response = { data: { message: 'Bad Request' }, status: 400 };
    mockedAxios.post.mockRejectedValue(axiosError);

    const result = await FlowiseService.analyzeRemito('base64data');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Request failed');
  });

  it('handles error without message property', async () => {
    mockedConfig.mockResolvedValue(baseConfig);
    mockedAxios.post.mockRejectedValue({});

    const result = await FlowiseService.analyzeRemito('base64data');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Error de conexión con Flowise');
  });
});

// ============================================================================
// parseResponse (indirectly via analyzeRemito)
// ============================================================================
describe('FlowiseService parseResponse paths', () => {
  beforeEach(() => {
    mockedConfig.mockResolvedValue(baseConfig);
  });

  it('parses string data (extractJsonFromString path)', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: 'Some text {"numeroRemito": "X", "confianza": 70, "camposDetectados": [], "errores": []} trailing',
    });

    const result = await FlowiseService.analyzeRemito('img');

    expect(result.success).toBe(true);
    expect(result.data?.numeroRemito).toBe('X');
  });

  it('parses object with text property (object branch)', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { text: '{"confianza": 42}' },
    });

    const result = await FlowiseService.analyzeRemito('img');

    expect(result.success).toBe(true);
    expect(result.data?.confianza).toBe(42);
  });

  it('parses object with output property', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { output: '{"confianza": 55}' },
    });

    const result = await FlowiseService.analyzeRemito('img');

    expect(result.success).toBe(true);
    expect(result.data?.confianza).toBe(55);
  });

  it('parses object with response property', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { response: '{"confianza": 60}' },
    });

    const result = await FlowiseService.analyzeRemito('img');

    expect(result.success).toBe(true);
    expect(result.data?.confianza).toBe(60);
  });

  it('handles object where text is an object (returns it directly)', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { text: { confianza: 77, camposDetectados: ['a'] } },
    });

    const result = await FlowiseService.analyzeRemito('img');

    expect(result.success).toBe(true);
    expect(result.data?.confianza).toBe(77);
  });

  it('returns empty response for non-object non-string data', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: 12345,
    });

    const result = await FlowiseService.analyzeRemito('img');

    expect(result.success).toBe(true);
    expect(result.data?.confianza).toBe(0);
    expect(result.data?.camposDetectados).toEqual([]);
  });

  it('handles string with no JSON (extractJsonFromString returns null)', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: 'no json here at all',
    });

    const result = await FlowiseService.analyzeRemito('img');

    expect(result.success).toBe(true);
    expect(result.data?.confianza).toBe(0);
  });

  it('handles string with { but no } (extractJsonFromString)', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: 'prefix { broken json',
    });

    const result = await FlowiseService.analyzeRemito('img');

    expect(result.success).toBe(true);
    expect(result.data?.confianza).toBe(0);
  });

  it('handles string with invalid JSON between braces', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: '{ not: valid: json }',
    });

    const result = await FlowiseService.analyzeRemito('img');

    expect(result.success).toBe(true);
    expect(result.data?.confianza).toBe(0);
  });

  it('handles empty object response (no keys parsed warning)', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { text: '{}' },
    });

    const result = await FlowiseService.analyzeRemito('img');

    expect(result.success).toBe(true);
    expect(result.data?.numeroRemito).toBeNull();
  });

  it('buildFlowiseResponse fills defaults for missing fields', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { text: '{"numeroRemito": "R1"}' },
    });

    const result = await FlowiseService.analyzeRemito('img');

    expect(result.data?.emisor).toEqual({ nombre: null, detalle: null });
    expect(result.data?.chofer).toEqual({ nombre: null, dni: null });
    expect(result.data?.patentes).toEqual({ chasis: null, acoplado: null });
    expect(result.data?.pesosOrigen).toEqual({ bruto: null, tara: null, neto: null });
    expect(result.data?.pesosDestino).toBeNull();
    expect(result.data?.camposDetectados).toEqual([]);
    expect(result.data?.errores).toEqual([]);
  });
});

// ============================================================================
// testConnection
// ============================================================================
describe('FlowiseService.testConnection', () => {
  it('returns error when baseUrl is not configured', async () => {
    mockedConfig.mockResolvedValue({ ...baseConfig, baseUrl: '' });

    const result = await FlowiseService.testConnection();

    expect(result.success).toBe(false);
    expect(result.message).toBe('URL de Flowise no configurada');
  });

  it('succeeds when flowId exists in chatflows', async () => {
    mockedConfig.mockResolvedValue(baseConfig);
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: [{ id: 'flow-123', name: 'Remitos' }],
    });

    const result = await FlowiseService.testConnection();

    expect(result.success).toBe(true);
    expect(result.message).toBe('Conexión exitosa');
  });

  it('warns when flowId does not exist in chatflows', async () => {
    mockedConfig.mockResolvedValue(baseConfig);
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: [{ id: 'other-flow', name: 'Other' }],
    });

    const result = await FlowiseService.testConnection();

    expect(result.success).toBe(true);
    expect(result.message).toBe('Conexión OK, pero el Flow ID no existe');
  });

  it('succeeds without flowId (skips flow check)', async () => {
    mockedConfig.mockResolvedValue({ ...baseConfig, flowId: '' });
    mockedAxios.get.mockResolvedValue({ status: 200, data: [] });

    const result = await FlowiseService.testConnection();

    expect(result.success).toBe(true);
    expect(result.message).toBe('Conexión exitosa');
  });

  it('returns HTTP status for non-200 response', async () => {
    mockedConfig.mockResolvedValue(baseConfig);
    mockedAxios.get.mockResolvedValue({ status: 503, data: null });

    const result = await FlowiseService.testConnection();

    expect(result.success).toBe(false);
    expect(result.message).toBe('HTTP 503');
  });

  it('handles connection error', async () => {
    mockedConfig.mockResolvedValue(baseConfig);
    mockedAxios.get.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await FlowiseService.testConnection();

    expect(result.success).toBe(false);
    expect(result.message).toBe('ECONNREFUSED');
  });

  it('handles error without message', async () => {
    mockedConfig.mockResolvedValue(baseConfig);
    mockedAxios.get.mockRejectedValue({});

    const result = await FlowiseService.testConnection();

    expect(result.success).toBe(false);
    expect(result.message).toBe('Error de conexión');
  });

  it('strips trailing slash from baseUrl in test connection', async () => {
    mockedConfig.mockResolvedValue({ ...baseConfig, baseUrl: 'https://flowise.example.com/' });
    mockedAxios.get.mockResolvedValue({ status: 200, data: [] });

    await FlowiseService.testConnection();

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://flowise.example.com/api/v1/chatflows',
      expect.any(Object),
    );
  });

  it('includes Authorization header when apiKey is set', async () => {
    mockedConfig.mockResolvedValue(baseConfig);
    mockedAxios.get.mockResolvedValue({ status: 200, data: [] });

    await FlowiseService.testConnection();

    const headers = mockedAxios.get.mock.calls[0][1]?.headers;
    expect(headers?.Authorization).toBe('Bearer test-key');
  });

  it('omits Authorization header when apiKey is empty', async () => {
    mockedConfig.mockResolvedValue({ ...baseConfig, apiKey: '' });
    mockedAxios.get.mockResolvedValue({ status: 200, data: [] });

    await FlowiseService.testConnection();

    const headers = mockedAxios.get.mock.calls[0][1]?.headers;
    expect(headers).toEqual({});
  });

  it('handles null data in 200 response (flows check)', async () => {
    mockedConfig.mockResolvedValue(baseConfig);
    mockedAxios.get.mockResolvedValue({ status: 200, data: null });

    const result = await FlowiseService.testConnection();

    expect(result.success).toBe(true);
    expect(result.message).toBe('Conexión OK, pero el Flow ID no existe');
  });
});
