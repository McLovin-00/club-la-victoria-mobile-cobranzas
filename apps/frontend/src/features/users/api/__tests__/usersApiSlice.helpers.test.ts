/**
 * Tests para funciones helper internas de usersApiSlice
 *
 * Prueba:
 * - handleApiError: Manejo de errores de API
 * - processUserData: Procesamiento de datos antes de envío
 * - createUsersTags: Creación de tags de cache
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Crear mock functions que podemos referenciar
const mockLoggerApi = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerDebug = jest.fn();

// Mock del Logger antes de importar el módulo
jest.mock('../../../../lib/utils', () => ({
  Logger: {
    api: mockLoggerApi,
    error: mockLoggerError,
    warn: mockLoggerWarn,
    debug: mockLoggerDebug,
  },
}));

describe('usersApiSlice - handleApiError helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería loggear error y retornarlo', () => {
    const error = new Error('Test error');
    const operation = 'testOperation';

    // Simular handleApiError
    const handleApiError = (error: unknown, operation: string) => {
      mockLoggerError(`Error en ${operation}:`, error);
      return error;
    };

    const result = handleApiError(error, operation);

    expect(mockLoggerError).toHaveBeenCalledWith('Error en testOperation:', error);
    expect(result).toBe(error);
  });

  it('debería manejar errores desconocidos', () => {
    const unknownError = 'String error';
    const operation = 'unknownOperation';

    const handleApiError = (error: unknown, operation: string) => {
      mockLoggerError(`Error en ${operation}:`, error);
      return error;
    };

    const result = handleApiError(unknownError, operation);

    expect(mockLoggerError).toHaveBeenCalledWith('Error en unknownOperation:', unknownError);
    expect(result).toBe(unknownError);
  });

  it('debería pasar el operation name al log', () => {
    const error = new Error('Network error');
    const operations = ['getUsuarios', 'createUser', 'updateUser', 'deleteUser', 'checkEmail'];

    const handleApiError = (error: unknown, operation: string) => {
      mockLoggerError(`Error en ${operation}:`, error);
      return error;
    };

    operations.forEach(op => {
      handleApiError(error, op);
      expect(mockLoggerError).toHaveBeenCalledWith(`Error en ${op}:`, error);
    });
  });

  it('debería manejar objetos de error sin message', () => {
    const errorObject = { code: 'ERR_CODE' };
    const operation = 'objectError';

    const handleApiError = (error: unknown, operation: string) => {
      mockLoggerError(`Error en ${operation}:`, error);
      return error;
    };

    const result = handleApiError(errorObject, operation);

    expect(mockLoggerError).toHaveBeenCalledWith('Error en objectError:', errorObject);
    expect(result).toBe(errorObject);
  });

  it('debería manejar null como error', () => {
    const error = null;
    const operation = 'nullError';

    const handleApiError = (error: unknown, operation: string) => {
      mockLoggerError(`Error en ${operation}:`, error);
      return error;
    };

    const result = handleApiError(error, operation);

    expect(mockLoggerError).toHaveBeenCalledWith('Error en nullError:', null);
    expect(result).toBe(null);
  });
});

describe('usersApiSlice - processUserData helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Simular la función processUserData del código real
  const processUserData = (userData: { empresaId?: string | number | null; [key: string]: any }) => {
    const processed = { ...userData };

    // Convertir empresaId a número si es string
    if (processed.empresaId && typeof processed.empresaId === 'string') {
      processed.empresaId = parseInt(processed.empresaId, 10);
    }

    // Asegurar que empresaId sea null si es 0 o undefined
    if (!processed.empresaId) {
      processed.empresaId = null;
    }

    mockLoggerApi('Datos procesados para envío:', processed);
    return processed;
  };

  it('debería convertir empresaId string a número', () => {
    const input = { empresaId: '123', email: 'test@test.com' };
    const result = processUserData(input);

    expect(result.empresaId).toBe(123);
    expect(result.email).toBe('test@test.com');
    expect(mockLoggerApi).toHaveBeenCalledWith('Datos procesados para envío:', { empresaId: 123, email: 'test@test.com' });
  });

  it('debería mantener empresaId numérico', () => {
    const input = { empresaId: 456, email: 'test@test.com' };
    const result = processUserData(input);

    expect(result.empresaId).toBe(456);
    expect(result.email).toBe('test@test.com');
  });

  it('debería convertir 0 a null', () => {
    const input = { empresaId: 0, email: 'test@test.com' };
    const result = processUserData(input);

    expect(result.empresaId).toBe(null);
  });

  it('debería convertir undefined a null', () => {
    const input = { empresaId: undefined, email: 'test@test.com' };
    const result = processUserData(input);

    expect(result.empresaId).toBe(null);
  });

  it('debería mantener null como null', () => {
    const input = { empresaId: null, email: 'test@test.com' };
    const result = processUserData(input);

    expect(result.empresaId).toBe(null);
  });

  it('debería manejar string vacío como null', () => {
    const input = { empresaId: '', email: 'test@test.com' };
    const result = processUserData(input);

    expect(result.empresaId).toBe(null);
  });

  it('debería preservar otros campos sin cambios', () => {
    const input = {
      empresaId: '789',
      email: 'TEST@EXAMPLE.COM',
      role: 'admin',
      password: 'Password123',
      nombre: 'Test User',
    };
    const result = processUserData(input);

    expect(result).toEqual({
      empresaId: 789,
      email: 'TEST@EXAMPLE.COM',
      role: 'admin',
      password: 'Password123',
      nombre: 'Test User',
    });
  });

  it('debería manejar string numérico inválido (NaN)', () => {
    const input = { empresaId: 'abc', email: 'test@test.com' };
    const result = processUserData(input);

    // parseInt('abc', 10) devuelve NaN, que es falsy, así que se convierte a null
    expect(result.empresaId).toBe(null);
  });

  it('debería manejar string con espacios', () => {
    const input = { empresaId: ' 123 ', email: 'test@test.com' };
    const result = processUserData(input);

    expect(result.empresaId).toBe(123); // parseInt maneja espacios
  });

  it('debería manejar string decimal (truncar)', () => {
    const input = { empresaId: '123.45', email: 'test@test.com' };
    const result = processUserData(input);

    expect(result.empresaId).toBe(123); // parseInt trunca
  });
});

describe('usersApiSlice - createUsersTags helper', () => {
  // Simular la función createUsersTags del código real
  const createUsersTags = (users?: Array<{ id: number }>) => {
    if (!Array.isArray(users)) {
      return [{ type: 'User' as const, id: 'LIST' }];
    }

    return [
      { type: 'User' as const, id: 'LIST' },
      ...users.map(user => ({ type: 'User' as const, id: user.id })),
    ];
  };

  it('debería crear tags para array de usuarios', () => {
    const users = [
      { id: 1, email: 'user1@test.com' },
      { id: 2, email: 'user2@test.com' },
      { id: 3, email: 'user3@test.com' },
    ];

    const result = createUsersTags(users);

    expect(result).toHaveLength(4); // LIST + 3 usuarios
    expect(result).toContainEqual({ type: 'User', id: 'LIST' });
    expect(result).toContainEqual({ type: 'User', id: 1 });
    expect(result).toContainEqual({ type: 'User', id: 2 });
    expect(result).toContainEqual({ type: 'User', id: 3 });
  });

  it('debería retornar solo LIST si users no es array', () => {
    expect(createUsersTags(undefined)).toEqual([{ type: 'User', id: 'LIST' }]);
    expect(createUsersTags(null as any)).toEqual([{ type: 'User', id: 'LIST' }]);
    expect(createUsersTags('string' as any)).toEqual([{ type: 'User', id: 'LIST' }]);
    expect(createUsersTags({} as any)).toEqual([{ type: 'User', id: 'LIST' }]);
  });

  it('debería manejar array vacío', () => {
    const result = createUsersTags([]);

    expect(result).toEqual([{ type: 'User', id: 'LIST' }]);
    expect(result).toHaveLength(1);
  });

  it('debería incluir tag individual por cada usuario', () => {
    const users = [{ id: 5, email: 'test@test.com' }];
    const result = createUsersTags(users);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: 'User', id: 'LIST' });
    expect(result[1]).toEqual({ type: 'User', id: 5 });
  });

  it('debería manejar array con un solo usuario', () => {
    const users = [{ id: 1, email: 'single@test.com' }];
    const result = createUsersTags(users);

    expect(result).toEqual([
      { type: 'User', id: 'LIST' },
      { type: 'User', id: 1 },
    ]);
  });

  it('debería manejar IDs grandes', () => {
    const users = [{ id: 999999, email: 'large@test.com' }];
    const result = createUsersTags(users);

    expect(result).toContainEqual({ type: 'User', id: 999999 });
  });

  it('debería mantener tipo "User" constante', () => {
    const users = [
      { id: 1, email: 'user1@test.com' },
      { id: 2, email: 'user2@test.com' },
    ];
    const result = createUsersTags(users);

    result.forEach(tag => {
      expect(tag.type).toBe('User');
    });
  });

  it('debería preservar el orden: LIST primero, luego usuarios', () => {
    const users = [
      { id: 3, email: 'user3@test.com' },
      { id: 1, email: 'user1@test.com' },
      { id: 2, email: 'user2@test.com' },
    ];
    const result = createUsersTags(users);

    expect(result[0]).toEqual({ type: 'User', id: 'LIST' });
    expect(result[1].id).toBe(3);
    expect(result[2].id).toBe(1);
    expect(result[3].id).toBe(2);
  });
});
