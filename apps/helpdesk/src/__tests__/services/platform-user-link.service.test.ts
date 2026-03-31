jest.mock('../../config/database', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  },
}));

import { prisma } from '../../config/database';
import {
  findPlatformUserByTelegramId,
  findPlatformUserByTelegramUsername,
  getPlatformUserEmpresaId,
  getPlatformUserTelegramId,
  linkPlatformUserToTelegram,
  normalizeTelegramUsername,
} from '../../services/platform-user-link.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Platform User Link Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeTelegramUsername', () => {
    it('elimina arrobas y pasa a minusculas', () => {
      expect(normalizeTelegramUsername('@@MiUsuario')).toBe('miusuario');
    });

    it('elimina una sola arroba', () => {
      expect(normalizeTelegramUsername('@TestUser')).toBe('testuser');
    });

    it('pasa a minusculas', () => {
      expect(normalizeTelegramUsername('TESTUSER')).toBe('testuser');
    });

    it('recorta a 64 caracteres', () => {
      const longUser = 'a'.repeat(100);
      expect(normalizeTelegramUsername(longUser).length).toBe(64);
    });

    it('hace trim antes de procesar', () => {
      expect(normalizeTelegramUsername('  @User  ')).toBe('user');
    });

    it('devuelve vacio para username de solo arrobas', () => {
      expect(normalizeTelegramUsername('@@@@')).toBe('');
    });

    it('maneja string vacio', () => {
      expect(normalizeTelegramUsername('')).toBe('');
    });

    it('maneja solo espacios', () => {
      expect(normalizeTelegramUsername('   ')).toBe('');
    });
  });

  describe('findPlatformUserByTelegramUsername', () => {
    it('normaliza usernames de Telegram antes de consultarlos', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
        { id: 7, nombre: 'Admin', apellido: 'Demo', email: 'admin@demo.com' },
      ]);

      const result = await findPlatformUserByTelegramUsername('  @Mclovin00112  ');

      expect(result).toEqual({
        id: 7,
        email: 'admin@demo.com',
      });

      const [queryParts, usernameValue] = (mockPrisma.$queryRaw as jest.Mock).mock.calls[0];
      expect(queryParts.join('')).toContain('"platform"."platform_users"');
      expect(usernameValue).toBe('mclovin00112');
    });

    it('devuelve null cuando no se encuentra el usuario', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await findPlatformUserByTelegramUsername('nonexistent');

      expect(result).toBeNull();
    });

    it('devuelve null cuando el username normalizado esta vacio', async () => {
      const result = await findPlatformUserByTelegramUsername('@@@@');

      expect(result).toBeNull();
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('findPlatformUserByTelegramId', () => {
    it('busca por telegram_user_id usando la tabla platform_users', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: 3, email: 'user@test.com' }]);

      const result = await findPlatformUserByTelegramId(123456789);

      expect(result).toEqual({ id: 3, email: 'user@test.com' });

      const [queryParts, telegramUserIdValue] = (mockPrisma.$queryRaw as jest.Mock).mock.calls[0];
      expect(queryParts.join('')).toContain('"platform"."platform_users"');
      expect(telegramUserIdValue).toBe(BigInt(123456789));
    });

    it('devuelve null cuando no se encuentra', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await findPlatformUserByTelegramId(999999999);

      expect(result).toBeNull();
    });

    it('lanza error para telegramUserId no entero seguro', async () => {
      await expect(findPlatformUserByTelegramId(0)).rejects.toThrow('Identificador de Telegram inválido');
    });

    it('lanza error para telegramUserId negativo', async () => {
      await expect(findPlatformUserByTelegramId(-1)).rejects.toThrow('Identificador de Telegram inválido');
    });

    it('lanza error para telegramUserId no seguro (Number.MAX_SAFE_INTEGER + 1)', async () => {
      await expect(findPlatformUserByTelegramId(Number.MAX_SAFE_INTEGER + 1)).rejects.toThrow('Identificador de Telegram inválido');
    });
  });

  describe('getPlatformUserEmpresaId', () => {
    it('devuelve empresa_id cuando existe', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ empresa_id: 42 }]);

      const result = await getPlatformUserEmpresaId(5);

      expect(result).toBe(42);
    });

    it('devuelve null cuando no se encuentra el usuario', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await getPlatformUserEmpresaId(999);

      expect(result).toBeNull();
    });

    it('devuelve null cuando empresa_id es null', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ empresa_id: null }]);

      const result = await getPlatformUserEmpresaId(5);

      expect(result).toBeNull();
    });
  });

  describe('getPlatformUserTelegramId', () => {
    it('devuelve el telegram_user_id persistido como number seguro', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ telegram_user_id: BigInt(987654321) }]);

      const result = await getPlatformUserTelegramId(5);

      expect(result).toBe(987654321);
    });

    it('devuelve null cuando telegram_user_id es null', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ telegram_user_id: null }]);

      const result = await getPlatformUserTelegramId(5);

      expect(result).toBeNull();
    });

    it('devuelve null cuando no se encuentra el usuario', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await getPlatformUserTelegramId(999);

      expect(result).toBeNull();
    });

    it('convierte string a number cuando el valor persistido es string', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ telegram_user_id: '123456789' }]);

      const result = await getPlatformUserTelegramId(5);

      expect(result).toBe(123456789);
    });

    it('pasa number directamente cuando el valor ya es number', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ telegram_user_id: 123456789 }]);

      const result = await getPlatformUserTelegramId(5);

      expect(result).toBe(123456789);
    });

    it('lanza error para valor persistido invalido', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ telegram_user_id: BigInt(0) }]);

      await expect(getPlatformUserTelegramId(5)).rejects.toThrow('Identificador de Telegram persistido inválido');
    });
  });

  describe('linkPlatformUserToTelegram', () => {
    it('actualiza la vinculacion en la tabla real de usuarios', async () => {
      (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      await linkPlatformUserToTelegram(11, 555666777, '@NuevoUsuario');

      const [queryParts, telegramUserIdValue, usernameValue, userIdValue] =
        (mockPrisma.$executeRaw as jest.Mock).mock.calls[0];

      expect(queryParts.join('')).toContain('"platform"."platform_users"');
      expect(telegramUserIdValue).toBe(BigInt(555666777));
      expect(usernameValue).toBe('nuevousuario');
      expect(userIdValue).toBe(11);
    });

    it('funciona sin username de Telegram', async () => {
      (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      await linkPlatformUserToTelegram(11, 555666777);

      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });
});
