/**
 * MSW Handlers para FlowiseConfigPage
 */
import { http, HttpResponse } from 'msw';

const API_URL = process.env.VITE_DOCUMENTOS_API_URL || 'http://localhost:4802';

export const flowiseHandlers = [
  // GET config
  http.get(`${API_URL}/api/docs/flowise`, () => {
    return HttpResponse.json({
      enabled: true,
      baseUrl: 'https://flowise.test.com',
      apiKey: 'test-api-key',
      flowId: 'test-flow-123',
      timeout: 30000,
    });
  }),

  // PUT config
  http.put(`${API_URL}/api/docs/flowise`, async ({ request }) => {
    return new HttpResponse(null, { status: 200 });
  }),

  // POST test connection
  http.post(`${API_URL}/api/docs/flowise/test`, async ({ request }) => {
    const body = await request.json();
    
    if (body.baseUrl && body.flowId) {
      return HttpResponse.json({
        success: true,
        message: 'Conexión exitosa',
      });
    }
    
    return HttpResponse.json({
      success: false,
      message: 'Error de conexión',
    }, { status: 400 });
  }),
];

export const flowiseHandlersError = [
  http.get(`${API_URL}/api/docs/flowise`, () => {
    return HttpResponse.json({ enabled: true }, { status: 500 });
  }),
];

export const flowiseHandlersConnectionError = [
  http.post(`${API_URL}/api/docs/flowise/test`, () => {
    return HttpResponse.json({
      success: false,
      message: 'Error de conexión',
    }, { status: 400 });
  }),
];
