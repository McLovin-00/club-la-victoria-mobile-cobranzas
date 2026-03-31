/**
 * Tests for identify.ts middleware
 */

jest.mock('grammy', () => ({
  Context: class {},
}));

jest.mock('../../../services/telegram.service', () => ({
  telegramService: {
    findUserByTelegramUsername: jest.fn(),
    linkTelegramUser: jest.fn(),
  },
}));

jest.mock('../../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../services/platform-user-link.service', () => ({
  findPlatformUserByTelegramId: jest.fn(),
}));

jest.mock('../../../config/database', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

import { identifyMiddleware, requireAuth, requireResolver } from '../../../bot/middleware/identify';
import { findPlatformUserByTelegramId } from '../../../services/platform-user-link.service';
import { prisma } from '../../../config/database';
import { AppLogger } from '../../../config/logger';
import { telegramService } from '../../../services/telegram.service';

describe('identify middleware', () => {
  let mockCtx: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNext = jest.fn();
    
    mockCtx = {
      from: {
        id: 12345,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
      },
      session: undefined,
      reply: jest.fn(),
    };
  });

  describe('identifyMiddleware', () => {
    describe('when ctx.from is missing', () => {
      it('should call next without processing', async () => {
        mockCtx.from = undefined;

        await identifyMiddleware(mockCtx, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(findPlatformUserByTelegramId).not.toHaveBeenCalled();
      });
    });

    describe('when user needs identification', () => {
      it('should set session with user info when found', async () => {
        (findPlatformUserByTelegramId as jest.Mock).mockResolvedValue({ id: 1, email: 'user@test.com' });

        await identifyMiddleware(mockCtx, mockNext);

        expect(mockCtx.session.userId).toBe(1);
        expect(mockCtx.session.isAuthenticated).toBe(true);
        expect(mockCtx.session.isNewUser).toBe(false);
      });

      it('should mark as new user when not found', async () => {
        (findPlatformUserByTelegramId as jest.Mock).mockResolvedValue(null);
        (telegramService.findUserByTelegramUsername as jest.Mock).mockResolvedValue(null);

        await identifyMiddleware(mockCtx, mockNext);

        expect(mockCtx.session.isNewUser).toBe(true);
        expect(mockCtx.session.isAuthenticated).toBe(false);
      });

      it('should handle errors gracefully', async () => {
        (findPlatformUserByTelegramId as jest.Mock).mockRejectedValue(new Error('DB error'));

        await identifyMiddleware(mockCtx, mockNext);

        expect(AppLogger.error).toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('requireAuth', () => {
    it('should block unauthenticated user', async () => {
      mockCtx.session = { isAuthenticated: false };

      await requireAuth(mockCtx, mockNext);

      expect(mockCtx.reply).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow authenticated user', async () => {
      mockCtx.session = { isAuthenticated: true };

      await requireAuth(mockCtx, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireResolver', () => {
    it('should block user without userId', async () => {
      mockCtx.session = {};

      await requireResolver(mockCtx, mockNext);

      expect(mockCtx.reply).toHaveBeenCalledWith('⚠️ No autorizado.');
    });

    it('should block non-resolver user', async () => {
      mockCtx.session = { userId: 1 };
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ role: 'USER' }]);

      await requireResolver(mockCtx, mockNext);

      expect(mockCtx.reply).toHaveBeenCalled();
    });

    it('should allow admin user', async () => {
      mockCtx.session = { userId: 1 };
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ role: 'ADMIN' }]);

      await requireResolver(mockCtx, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow superadmin user', async () => {
      mockCtx.session = { userId: 1 };
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ role: 'SUPERADMIN' }]);

      await requireResolver(mockCtx, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
