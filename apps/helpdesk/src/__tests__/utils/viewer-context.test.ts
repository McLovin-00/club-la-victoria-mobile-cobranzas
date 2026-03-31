import { buildTicketViewerContext } from '../../utils/viewer-context';
import { AuthenticatedRequest } from '../../middlewares';

describe('viewer-context', () => {
  describe('buildTicketViewerContext', () => {
    it('should return context with userId and role', () => {
      const mockReq = {
        user: {
          id: 42,
          email: 'test@example.com',
          role: 'USER',
        },
      } as AuthenticatedRequest;

      const result = buildTicketViewerContext(mockReq);

      expect(result).toEqual({
        userId: 42,
        role: 'USER',
        empresaId: null,
      });
    });

    it('should return empresaId when present', () => {
      const mockReq = {
        user: {
          id: 1,
          email: 'admin@example.com',
          role: 'ADMIN',
          empresaId: 10,
        },
      } as AuthenticatedRequest;

      const result = buildTicketViewerContext(mockReq);

      expect(result).toEqual({
        userId: 1,
        role: 'ADMIN',
        empresaId: 10,
      });
    });

    it('should throw error when user is not authenticated', () => {
      const mockReq = {} as AuthenticatedRequest;

      expect(() => buildTicketViewerContext(mockReq)).toThrow('Usuario no autenticado');
    });

    it('should handle user with undefined empresaId', () => {
      const mockReq = {
        user: {
          id: 5,
          email: 'user@example.com',
          role: 'USER',
          empresaId: undefined,
        },
      } as AuthenticatedRequest;

      const result = buildTicketViewerContext(mockReq);

      expect(result.empresaId).toBeNull();
    });
  });
});
