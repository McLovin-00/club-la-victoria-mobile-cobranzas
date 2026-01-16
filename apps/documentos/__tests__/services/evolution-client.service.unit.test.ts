jest.mock('../../src/config/logger', () => ({
  AppLogger: { warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn() },
}));

import { SystemConfigService } from '../../src/services/system-config.service';
import { EvolutionClient } from '../../src/services/evolution-client.service';

describe('EvolutionClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).fetch = jest.fn();
  });

  describe('normalizeServerUrl', () => {
    it('normaliza undefined a http:/ (el código agrega http:// a strings vacíos)', () => {
      const result = (EvolutionClient as any).normalizeServerUrl(undefined);
      expect(result).toBe('http:/');
    });

    it('normaliza null a http:/', () => {
      const result = (EvolutionClient as any).normalizeServerUrl(null);
      expect(result).toBe('http:/');
    });

    it('normaliza string vacío a http:/', () => {
      const result = (EvolutionClient as any).normalizeServerUrl('');
      expect(result).toBe('http:/');
    });

    it('remueve https://https:// y deja solo http://', () => {
      const result = (EvolutionClient as any).normalizeServerUrl('https://https://localhost');
      expect(result).toBe('http://localhost');
    });

    it('remueve http// duplicado', () => {
      const result = (EvolutionClient as any).normalizeServerUrl('http//localhost');
      expect(result).toBe('http://localhost');
    });

    it('agrega http:// a server sin protocolo', () => {
      const result = (EvolutionClient as any).normalizeServerUrl('localhost');
      expect(result).toBe('http://localhost');
    });

    it('agrega http:// a server con puerto sin protocolo', () => {
      const result = (EvolutionClient as any).normalizeServerUrl('localhost:8080');
      expect(result).toBe('http://localhost:8080');
    });

    it('remueve slash final', () => {
      const result = (EvolutionClient as any).normalizeServerUrl('http://localhost/');
      expect(result).toBe('http://localhost');
    });

    it('remueve slash final de https', () => {
      const result = (EvolutionClient as any).normalizeServerUrl('https://localhost/');
      expect(result).toBe('https://localhost');
    });

    it('mantiene protocolo https correcto', () => {
      const result = (EvolutionClient as any).normalizeServerUrl('https://api.example.com');
      expect(result).toBe('https://api.example.com');
    });

    it('normaliza con espacios en blanco', () => {
      const result = (EvolutionClient as any).normalizeServerUrl('  http://localhost  ');
      expect(result).toBe('http://localhost');
    });

    it('no modifica URL con path', () => {
      const result = (EvolutionClient as any).normalizeServerUrl('https://api.example.com/v1/endpoint');
      expect(result).toBe('https://api.example.com/v1/endpoint');
    });
  });

  describe('sendText', () => {
    it('retorna config error cuando falta token (configuración incompleta)', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('http://localhost')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('instance');
      (globalThis as any).fetch.mockImplementation(() => {
        throw new Error('No debería llamarse fetch');
      });
      const out = await EvolutionClient.sendText('54911', 'hola');
      expect(out.ok).toBe(false);
      expect(out.message).toBe('Configuración incompleta');
    });

    it('retorna config error cuando falta instance (configuración incompleta)', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('http://localhost')
        .mockResolvedValueOnce('token')
        .mockResolvedValueOnce(null);
      (globalThis as any).fetch.mockImplementation(() => {
        throw new Error('No debería llamarse fetch');
      });
      const out = await EvolutionClient.sendText('54911', 'hola');
      expect(out.ok).toBe(false);
      expect(out.message).toBe('Configuración incompleta');
    });

    it('retorna config incompleta cuando token es empty string', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('http://localhost')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('instance');
      (globalThis as any).fetch.mockImplementation(() => {
        throw new Error('No debería llamarse fetch');
      });
      const out = await EvolutionClient.sendText('54911', 'hola');
      expect(out.ok).toBe(false);
      expect(out.message).toBe('Configuración incompleta');
    });

    it('retorna config incompleta cuando instance es empty string', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('http://localhost')
        .mockResolvedValueOnce('token')
        .mockResolvedValueOnce('');
      (globalThis as any).fetch.mockImplementation(() => {
        throw new Error('No debería llamarse fetch');
      });
      const out = await EvolutionClient.sendText('54911', 'hola');
      expect(out.ok).toBe(false);
      expect(out.message).toBe('Configuración incompleta');
    });

    it('retorna config error cuando todos son undefined', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);
      (globalThis as any).fetch.mockImplementation(() => {
        throw new Error('No debería llamarse fetch');
      });
      const out = await EvolutionClient.sendText('54911', 'hola');
      expect(out.ok).toBe(false);
    });

    it('retorna ok en primer endpoint exitoso', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('http://localhost/')
        .mockResolvedValueOnce('token')
        .mockResolvedValueOnce('inst');

      (globalThis as any).fetch
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const out = await EvolutionClient.sendText('54911', 'hola');
      expect(out.ok).toBe(true);
      expect(out.status).toBe(200);
      expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
    });

    it('intenta segundo endpoint cuando primero falla', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('http://localhost/')
        .mockResolvedValueOnce('token')
        .mockResolvedValueOnce('inst');

      (globalThis as any).fetch
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const out = await EvolutionClient.sendText('54911', 'hola');
      expect(out.ok).toBe(true);
      expect((globalThis as any).fetch).toHaveBeenCalledTimes(2);
    });

    it('intenta tercer endpoint cuando primeros fallan', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('http://localhost/')
        .mockResolvedValueOnce('token')
        .mockResolvedValueOnce('inst');

      (globalThis as any).fetch
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, status: 201 });

      const out = await EvolutionClient.sendText('54911', 'hola');
      expect(out.ok).toBe(true);
      expect(out.status).toBe(201);
      expect((globalThis as any).fetch).toHaveBeenCalledTimes(3);
    });

    it('retorna false con último status cuando todos fallan', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('localhost')
        .mockResolvedValueOnce('token')
        .mockResolvedValueOnce('inst');

      (globalThis as any).fetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 502 })
        .mockResolvedValueOnce({ ok: false, status: 503 });

      const out = await EvolutionClient.sendText('54911', 'hola');
      expect(out.ok).toBe(false);
      expect(out.status).toBe(503);
      expect(out.message).toBe('No se pudo enviar mensaje');
    });

    it('retorna false cuando fetch lanza exception', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('http://localhost')
        .mockResolvedValueOnce('token')
        .mockResolvedValueOnce('inst');

      (globalThis as any).fetch
        .mockRejectedValueOnce(new Error('Network error'));

      const out = await EvolutionClient.sendText('54911', 'hola');
      expect(out.ok).toBe(false);
      expect(out.status).toBeUndefined();
    });

    it('retorna false cuando todas las rutas fallan con exception', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('http://localhost')
        .mockResolvedValueOnce('token')
        .mockResolvedValueOnce('inst');

      (globalThis as any).fetch
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Server error'));

      const out = await EvolutionClient.sendText('54911', 'test');
      expect(out.ok).toBe(false);
      expect(out.status).toBeUndefined();
      expect((globalThis as any).fetch).toHaveBeenCalledTimes(3);
    });

    it('normaliza URL con httpshttps y envía correctamente', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('https://https://api.evolution.com/')
        .mockResolvedValueOnce('my-token')
        .mockResolvedValueOnce('my-instance');

      (globalThis as any).fetch
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const out = await EvolutionClient.sendText('123456789', 'Test message');
      expect(out.ok).toBe(true);
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        'http://api.evolution.com/message/sendText/my-instance',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer my-token',
            apikey: 'my-token',
          }),
        })
      );
    });

    it('envía con msisdn y text correctos', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('http://localhost')
        .mockResolvedValueOnce('token')
        .mockResolvedValueOnce('inst');

      (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, status: 200 });

      await EvolutionClient.sendText('5491166667777', 'Mensaje de prueba');

      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        'http://localhost/message/sendText/inst',
        expect.objectContaining({
          body: JSON.stringify({ number: '5491166667777', text: 'Mensaje de prueba' }),
        })
      );
    });

    it('prueba todos los paths candidatos en orden correcto', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('http://localhost')
        .mockResolvedValueOnce('token')
        .mockResolvedValueOnce('inst');

      const mockFetch = (globalThis as any).fetch;
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 });

      await EvolutionClient.sendText('123', 'test');

      const calls = mockFetch.mock.calls;
      expect(calls[0][0]).toContain('/message/sendText/inst');
      expect(calls[1][0]).toContain('/messages/sendText/inst');
      expect(calls[2][0]).toContain('/send-text/inst');
    });

    it('usa headers correctos con content-type json', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('http://localhost')
        .mockResolvedValueOnce('secret-token')
        .mockResolvedValueOnce('my-instance');

      (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, status: 200 });

      await EvolutionClient.sendText('123', 'test');

      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer secret-token',
            apikey: 'secret-token',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('no reintenta después de éxito', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('http://localhost')
        .mockResolvedValueOnce('token')
        .mockResolvedValueOnce('inst');

      (globalThis as any).fetch.mockResolvedValueOnce({ ok: true, status: 200 });

      await EvolutionClient.sendText('123', 'test');

      expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
    });
  });
});
