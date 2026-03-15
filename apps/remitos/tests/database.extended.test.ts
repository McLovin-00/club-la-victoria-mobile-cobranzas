/**
 * Tests extendidos para database.ts - cubrir líneas faltantes (disconnect)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock de PrismaClient
const mockPrismaInstance = {
  $connect: jest.fn().mockResolvedValue(undefined as never),
  $disconnect: jest.fn().mockResolvedValue(undefined as never),
};

jest.mock('.prisma/remitos', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaInstance),
}));

describe('Database extended', () => {
  let db: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Re-importar para reiniciar el singleton
    jest.resetModules();
    
    // Re-mockear después de resetModules
    jest.doMock('../src/config/logger', () => ({
      AppLogger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      },
    }));
    
    jest.doMock('.prisma/remitos', () => ({
      PrismaClient: jest.fn().mockImplementation(() => mockPrismaInstance),
    }));

    const module = await import('../src/config/database');
    db = module.db;
  });

  describe('connect', () => {
    it('crea cliente y conecta a la base de datos', async () => {
      await db.connect();
      expect(mockPrismaInstance.$connect).toHaveBeenCalled();
    });

    it('no reconecta si ya está conectado', async () => {
      await db.connect();
      await db.connect();
      // Solo debería conectar una vez
      expect(mockPrismaInstance.$connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('desconecta cliente si está conectado', async () => {
      await db.connect();
      await db.disconnect();
      expect(mockPrismaInstance.$disconnect).toHaveBeenCalled();
    });

    it('no hace nada si no hay cliente conectado', async () => {
      // No conectamos, solo desconectamos
      await db.disconnect();
      // No debería fallar
    });
  });

  describe('getClient', () => {
    it('lanza error si no está conectado', () => {
      // Sin conectar primero, debería fallar
      expect(() => db.getClient()).toThrow('Database not connected');
    });

    it('retorna cliente si está conectado', async () => {
      await db.connect();
      const client = db.getClient();
      expect(client).toBe(mockPrismaInstance);
    });
  });
});

