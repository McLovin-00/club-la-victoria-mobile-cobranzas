/**
 * Tests extendidos para minio.service.ts - cubrir líneas faltantes
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EventEmitter } from 'events';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: jest.fn().mockReturnValue({
    MINIO_ENDPOINT: 'http://localhost:9000',
    MINIO_PORT: 9000,
    MINIO_USE_SSL: false,
    MINIO_ACCESS_KEY: 'minioadmin',
    MINIO_SECRET_KEY: 'minioadmin',
    MINIO_REGION: 'us-east-1',
  }),
}));

const mockMinioClient: any = {
  bucketExists: jest.fn(),
  makeBucket: jest.fn(),
  putObject: jest.fn(),
  getObject: jest.fn(),
  presignedGetObject: jest.fn(),
  removeObject: jest.fn(),
};

jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => mockMinioClient),
}));

describe('MinIOService extended', () => {
  let minioService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    // Re-mockear después de reset
    jest.doMock('../../src/config/environment', () => ({
      getEnvironment: jest.fn().mockReturnValue({
        MINIO_ENDPOINT: 'http://localhost:9000',
        MINIO_PORT: 9000,
        MINIO_USE_SSL: false,
        MINIO_ACCESS_KEY: 'minioadmin',
        MINIO_SECRET_KEY: 'minioadmin',
        MINIO_REGION: 'us-east-1',
      }),
    }));

    const module = await import('../../src/services/minio.service');
    minioService = module.minioService;
  });

  describe('uploadRemitoImage', () => {
    it('crea bucket si no existe', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockResolvedValue(undefined);
      mockMinioClient.putObject.mockResolvedValue({ etag: 'abc' });

      const result = await minioService.uploadRemitoImage(
        1,
        100,
        'remito.jpg',
        Buffer.from('image'),
        'image/jpeg'
      );

      expect(mockMinioClient.makeBucket).toHaveBeenCalled();
      expect(result.bucketName).toBe('remitos-empresa-1');
    });

    it('no crea bucket si ya existe', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockResolvedValue({ etag: 'abc' });

      await minioService.uploadRemitoImage(
        1,
        100,
        'remito.jpg',
        Buffer.from('image'),
        'image/jpeg'
      );

      expect(mockMinioClient.makeBucket).not.toHaveBeenCalled();
    });

    it('genera objectKey con formato correcto', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockResolvedValue({ etag: 'abc' });

      const result = await minioService.uploadRemitoImage(
        1,
        100,
        'remito documento.jpg',
        Buffer.from('image'),
        'image/jpeg'
      );

      expect(result.objectKey).toMatch(/^remitos\/100\/\d+_remito_documento\.jpg$/);
    });
  });

  describe('getSignedUrl', () => {
    it('genera URL firmada', async () => {
      mockMinioClient.presignedGetObject.mockResolvedValue('http://signed.url');

      const url = await minioService.getSignedUrl('bucket', 'key');
      expect(url).toBe('http://signed.url');
    });

    it('acepta tiempo de expiración personalizado', async () => {
      mockMinioClient.presignedGetObject.mockResolvedValue('http://signed.url');

      await minioService.getSignedUrl('bucket', 'key', 7200);
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith('bucket', 'key', 7200);
    });
  });

  describe('getObject', () => {
    it('descarga objeto como Buffer', async () => {
      const mockStream = new EventEmitter();
      mockMinioClient.getObject.mockResolvedValue(mockStream);

      const promise = minioService.getObject('bucket', 'key');

      // Simular stream
      setTimeout(() => {
        mockStream.emit('data', Buffer.from('chunk1'));
        mockStream.emit('data', Buffer.from('chunk2'));
        mockStream.emit('end');
      }, 10);

      const result = await promise;
      expect(result).toEqual(Buffer.concat([Buffer.from('chunk1'), Buffer.from('chunk2')]));
    });

    it('maneja errores de stream', async () => {
      const mockStream = new EventEmitter();
      mockMinioClient.getObject.mockResolvedValue(mockStream);

      const promise = minioService.getObject('bucket', 'key');

      setTimeout(() => {
        mockStream.emit('error', new Error('Stream error'));
      }, 10);

      await expect(promise).rejects.toThrow('Stream error');
    });
  });

  describe('deleteObject', () => {
    it('elimina objeto de bucket', async () => {
      mockMinioClient.removeObject.mockResolvedValue(undefined);

      await minioService.deleteObject('bucket', 'key');
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('bucket', 'key');
    });
  });
});

describe('MinIOService constructor with port in endpoint', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('parsea puerto desde endpoint', async () => {
    jest.doMock('../../src/config/environment', () => ({
      getEnvironment: jest.fn().mockReturnValue({
        MINIO_ENDPOINT: 'localhost:9001',
        MINIO_PORT: 9000,
        MINIO_USE_SSL: false,
        MINIO_ACCESS_KEY: 'admin ',
        MINIO_SECRET_KEY: ' admin',
        MINIO_REGION: 'us-east-1',
      }),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Client } = require('minio');

    const module = await import('../../src/services/minio.service');
    expect(module.minioService).toBeDefined();

    // Verificar que se llamó con el puerto correcto
    expect(Client).toHaveBeenCalledWith(
      expect.objectContaining({
        endPoint: 'localhost',
        port: 9001,
      })
    );
  });

  it('usa puerto por defecto cuando puerto en endpoint es 0', async () => {
    jest.doMock('../../src/config/environment', () => ({
      getEnvironment: jest.fn().mockReturnValue({
        MINIO_ENDPOINT: 'localhost:0',
        MINIO_PORT: 9000,
        MINIO_USE_SSL: false,
        MINIO_ACCESS_KEY: 'admin',
        MINIO_SECRET_KEY: 'admin',
        MINIO_REGION: 'us-east-1',
      }),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Client } = require('minio');

    const module = await import('../../src/services/minio.service');
    expect(module.minioService).toBeDefined();

    // Verificar que se llamó con el puerto por defecto (parseInt('0') es 0, que es falsy)
    expect(Client).toHaveBeenCalledWith(
      expect.objectContaining({
        endPoint: 'localhost',
        port: 9000,
      })
    );
  });

  it('usa puerto por defecto cuando puerto en endpoint es inválido', async () => {
    jest.doMock('../../src/config/environment', () => ({
      getEnvironment: jest.fn().mockReturnValue({
        MINIO_ENDPOINT: 'localhost:abc',
        MINIO_PORT: 9000,
        MINIO_USE_SSL: false,
        MINIO_ACCESS_KEY: 'admin',
        MINIO_SECRET_KEY: 'admin',
        MINIO_REGION: 'us-east-1',
      }),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Client } = require('minio');

    const module = await import('../../src/services/minio.service');
    expect(module.minioService).toBeDefined();

    // Verificar que se llamó con el puerto por defecto (parseInt('abc') es NaN, que es falsy)
    expect(Client).toHaveBeenCalledWith(
      expect.objectContaining({
        endPoint: 'localhost',
        port: 9000,
      })
    );
  });

  it('elimina https:// del endpoint', async () => {
    jest.doMock('../../src/config/environment', () => ({
      getEnvironment: jest.fn().mockReturnValue({
        MINIO_ENDPOINT: 'https://minio.example.com:9000',
        MINIO_PORT: 9000,
        MINIO_USE_SSL: true,
        MINIO_ACCESS_KEY: 'admin',
        MINIO_SECRET_KEY: 'admin',
        MINIO_REGION: 'us-east-1',
      }),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Client } = require('minio');

    await import('../../src/services/minio.service');

    expect(Client).toHaveBeenCalledWith(
      expect.objectContaining({
        endPoint: 'minio.example.com',
        port: 9000,
        useSSL: true,
      })
    );
  });

  it('trim accessKey y secretKey', async () => {
    jest.doMock('../../src/config/environment', () => ({
      getEnvironment: jest.fn().mockReturnValue({
        MINIO_ENDPOINT: 'localhost:9000',
        MINIO_PORT: 9000,
        MINIO_USE_SSL: false,
        MINIO_ACCESS_KEY: '  admin  ',
        MINIO_SECRET_KEY: '  secret  ',
        MINIO_REGION: 'us-east-1',
      }),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Client } = require('minio');

    await import('../../src/services/minio.service');

    expect(Client).toHaveBeenCalledWith(
      expect.objectContaining({
        accessKey: 'admin',
        secretKey: 'secret',
      })
    );
  });
});

