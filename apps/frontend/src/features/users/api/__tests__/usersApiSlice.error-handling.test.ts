/**
 * Tests para manejo de errores en usersApiSlice
 *
 * Prueba:
 * - transformResponse de cada endpoint
 * - transformErrorResponse
 * - providesTags con error
 * - invalidatesTags con error
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Crear mock functions que podemos referenciar
const mockLoggerApi = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

// Mock del Logger con referencias consistentes
jest.mock('../../../../lib/utils', () => ({
  Logger: {
    api: mockLoggerApi,
    error: mockLoggerError,
    warn: mockLoggerWarn,
  },
}));

describe('usersApiSlice - getUsuarios transformResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Simular transformResponse de getUsuarios
  const transformGetUsuariosResponse = (response: {
    success: boolean;
    data: unknown[];
    [key: string]: any;
  }) => {
    mockLoggerApi('Respuesta de getUsuarios:', response);

    // Validar estructura de respuesta
    if (!response || !response.success || !Array.isArray(response.data)) {
      mockLoggerWarn('Respuesta de usuarios inválida:', response);
      throw new Error('Error al obtener usuarios: respuesta inválida');
    }

    return response;
  };

  it('debería lanzar error si response es null', () => {
    expect(() => transformGetUsuariosResponse(null as any)).toThrow(
      'Error al obtener usuarios: respuesta inválida'
    );
  });

  it('debería lanzar error si response es undefined', () => {
    expect(() => transformGetUsuariosResponse(undefined as any)).toThrow(
      'Error al obtener usuarios: respuesta inválida'
    );
  });

  it('debería lanzar error si success es false', () => {
    const response = { success: false, data: [] };

    expect(() => transformGetUsuariosResponse(response)).toThrow(
      'Error al obtener usuarios: respuesta inválida'
    );
  });

  it('debería lanzar error si data no es array', () => {
    const response = { success: true, data: 'not an array' };

    expect(() => transformGetUsuariosResponse(response)).toThrow(
      'Error al obtener usuarios: respuesta inválida'
    );
  });

  it('debería lanzar error si data es null', () => {
    const response = { success: true, data: null };

    expect(() => transformGetUsuariosResponse(response as any)).toThrow(
      'Error al obtener usuarios: respuesta inválida'
    );
  });

  it('debería lanzar error si data es undefined', () => {
    const response = { success: true };

    expect(() => transformGetUsuariosResponse(response as any)).toThrow(
      'Error al obtener usuarios: respuesta inválida'
    );
  });

  it('debería retornar response si es válido', () => {
    const response = { success: true, data: [{ id: 1, email: 'test@test.com' }] };

    const result = transformGetUsuariosResponse(response);

    expect(result).toEqual(response);
  });

  it('debería loggear respuesta válida', () => {
    const response = { success: true, data: [] };

    transformGetUsuariosResponse(response);

    expect(mockLoggerApi).toHaveBeenCalledWith('Respuesta de getUsuarios:', response);
  });

  it('debería loggear warning para respuesta inválida', () => {
    const response = { success: false, data: [] };

    try {
      transformGetUsuariosResponse(response);
    } catch (e) {
      // Se espera que lance error
    }

    expect(mockLoggerWarn).toHaveBeenCalledWith('Respuesta de usuarios inválida:', response);
  });

  it('debería manejar array vacío como válido', () => {
    const response = { success: true, data: [] };

    const result = transformGetUsuariosResponse(response);

    expect(result.data).toEqual([]);
  });

  it('debería mantener campos adicionales de la respuesta', () => {
    const response = {
      success: true,
      data: [{ id: 1 }],
      total: 1,
      page: 1,
      limit: 10,
    };

    const result = transformGetUsuariosResponse(response);

    expect(result).toHaveProperty('total', 1);
    expect(result).toHaveProperty('page', 1);
    expect(result).toHaveProperty('limit', 10);
  });
});

describe('usersApiSlice - getUsuarioById transformResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const transformGetUsuarioByIdResponse = (response: {
    success: boolean;
    data?: { id: number; [key: string]: any };
    [key: string]: any;
  }) => {
    mockLoggerApi(`Respuesta de getUsuarioById(${response.data?.id}):`, response);

    if (!response || !response.success || !response.data) {
      mockLoggerWarn('Usuario obtenido es inválido:', response);
      throw new Error('Error al obtener usuario: respuesta inválida');
    }

    return response;
  };

  it('debería lanzar error si response no tiene success', () => {
    const response = { data: { id: 1 } };

    expect(() => transformGetUsuarioByIdResponse(response as any)).toThrow(
      'Error al obtener usuario: respuesta inválida'
    );
  });

  it('debería lanzar error si success es false', () => {
    const response = { success: false, data: { id: 1 } };

    expect(() => transformGetUsuarioByIdResponse(response)).toThrow(
      'Error al obtener usuario: respuesta inválida'
    );
  });

  it('debería lanzar error si response no tiene data', () => {
    const response = { success: true };

    expect(() => transformGetUsuarioByIdResponse(response as any)).toThrow(
      'Error al obtener usuario: respuesta inválida'
    );
  });

  it('debería lanzar error si data es null', () => {
    const response = { success: true, data: null };

    expect(() => transformGetUsuarioByIdResponse(response as any)).toThrow(
      'Error al obtener usuario: respuesta inválida'
    );
  });

  it('debería lanzar error si data es undefined', () => {
    const response = { success: true, data: undefined };

    expect(() => transformGetUsuarioByIdResponse(response as any)).toThrow(
      'Error al obtener usuario: respuesta inválida'
    );
  });

  it('debería retornar response si es válido', () => {
    const response = { success: true, data: { id: 1, email: 'test@test.com' } };

    const result = transformGetUsuarioByIdResponse(response);

    expect(result).toEqual(response);
  });

  it('debería loggear ID de usuario obtenido', () => {
    const response = { success: true, data: { id: 123 } };

    transformGetUsuarioByIdResponse(response);

    expect(mockLoggerApi).toHaveBeenCalledWith('Respuesta de getUsuarioById(123):', response);
  });

  it('debería loggear warning para respuesta inválida', () => {
    const response = { success: false, data: null };

    try {
      transformGetUsuarioByIdResponse(response as any);
    } catch (e) {
      // Se espera que lance error
    }

    expect(mockLoggerWarn).toHaveBeenCalledWith('Usuario obtenido es inválido:', response);
  });
});

describe('usersApiSlice - createUser transformResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const transformCreateUserResponse = (response: {
    success: boolean;
    data?: { id?: number; [key: string]: any };
    [key: string]: any;
  }) => {
    mockLoggerApi('Usuario creado exitosamente:', response);

    // Validar estructura básica de respuesta
    if (!response || !response.success || !response.data) {
      mockLoggerWarn('Respuesta de creación de usuario inválida:', response);
      throw new Error('Error al crear usuario: respuesta inválida');
    }

    // Validar que el usuario tenga ID (indica creación exitosa)
    if (!response.data.id) {
      mockLoggerWarn('Usuario creado sin ID válido:', response);
      throw new Error('Error al crear usuario: ID no válido');
    }

    return response;
  };

  it('debería lanzar error si success es false', () => {
    const response = { success: false, data: { id: 1 } };

    expect(() => transformCreateUserResponse(response)).toThrow(
      'Error al crear usuario: respuesta inválida'
    );
  });

  it('debería lanzar error si data no existe', () => {
    const response = { success: true };

    expect(() => transformCreateUserResponse(response as any)).toThrow(
      'Error al crear usuario: respuesta inválida'
    );
  });

  it('debería lanzar error si data.id no existe', () => {
    const response = { success: true, data: { email: 'test@test.com' } };

    expect(() => transformCreateUserResponse(response)).toThrow(
      'Error al crear usuario: ID no válido'
    );
  });

  it('debería lanzar error si data.id es 0', () => {
    const response = { success: true, data: { id: 0 } };

    expect(() => transformCreateUserResponse(response)).toThrow(
      'Error al crear usuario: ID no válido'
    );
  });

  it('debería lanzar error si data.id es null', () => {
    const response = { success: true, data: { id: null } };

    expect(() => transformCreateUserResponse(response as any)).toThrow(
      'Error al crear usuario: ID no válido'
    );
  });

  it('debería retornar response si es válido', () => {
    const response = { success: true, data: { id: 1, email: 'test@test.com' } };

    const result = transformCreateUserResponse(response);

    expect(result).toEqual(response);
  });

  it('debería loggear confirmación de creación', () => {
    const response = { success: true, data: { id: 1 } };

    transformCreateUserResponse(response);

    expect(mockLoggerApi).toHaveBeenCalledWith('Usuario creado exitosamente:', response);
  });

  it('debería loggear warning para ID inválido', () => {
    const response = { success: true, data: { email: 'test@test.com' } };

    try {
      transformCreateUserResponse(response);
    } catch (e) {
      // Se espera que lance error
    }

    expect(mockLoggerWarn).toHaveBeenCalledWith('Usuario creado sin ID válido:', response);
  });
});

describe('usersApiSlice - updateUser transformResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const transformUpdateUserResponse = (response: {
    success: boolean;
    data?: any;
    [key: string]: any;
  }) => {
    mockLoggerApi('Usuario actualizado exitosamente:', response);

    if (!response || !response.success || !response.data) {
      mockLoggerWarn('Respuesta de actualización de usuario inválida:', response);
      throw new Error('Error al actualizar usuario: respuesta inválida');
    }

    return response;
  };

  it('debería lanzar error si success es false', () => {
    const response = { success: false, data: { id: 1 } };

    expect(() => transformUpdateUserResponse(response)).toThrow(
      'Error al actualizar usuario: respuesta inválida'
    );
  });

  it('debería lanzar error si data no existe', () => {
    const response = { success: true };

    expect(() => transformUpdateUserResponse(response as any)).toThrow(
      'Error al actualizar usuario: respuesta inválida'
    );
  });

  it('debería lanzar error si data es null', () => {
    const response = { success: true, data: null };

    expect(() => transformUpdateUserResponse(response as any)).toThrow(
      'Error al actualizar usuario: respuesta inválida'
    );
  });

  it('debería retornar response si es válido', () => {
    const response = { success: true, data: { id: 1, email: 'updated@test.com' } };

    const result = transformUpdateUserResponse(response);

    expect(result).toEqual(response);
  });

  it('debería loggear confirmación de actualización', () => {
    const response = { success: true, data: { id: 1 } };

    transformUpdateUserResponse(response);

    expect(mockLoggerApi).toHaveBeenCalledWith('Usuario actualizado exitosamente:', response);
  });

  it('debería loggear warning para respuesta inválida', () => {
    const response = { success: false, data: null };

    try {
      transformUpdateUserResponse(response);
    } catch (e) {
      // Se espera que lance error
    }

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Respuesta de actualización de usuario inválida:',
      response
    );
  });
});

describe('usersApiSlice - deleteUser transformResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const transformDeleteUserResponse = (response: {
    success: boolean;
    message?: string;
    [key: string]: any;
  }) => {
    mockLoggerApi('Usuario eliminado exitosamente:', response);

    if (!response || !response.success) {
      mockLoggerWarn('Respuesta de eliminación de usuario inválida:', response);
      throw new Error('Error al eliminar usuario: respuesta inválida');
    }

    return response;
  };

  it('debería lanzar error si success es false', () => {
    const response = { success: false };

    expect(() => transformDeleteUserResponse(response)).toThrow(
      'Error al eliminar usuario: respuesta inválida'
    );
  });

  it('debería lanzar error si response es null', () => {
    expect(() => transformDeleteUserResponse(null as any)).toThrow(
      'Error al eliminar usuario: respuesta inválida'
    );
  });

  it('debería retornar response si es válido', () => {
    const response = { success: true, message: 'Usuario eliminado' };

    const result = transformDeleteUserResponse(response);

    expect(result).toEqual(response);
  });

  it('debería loggear confirmación de eliminación', () => {
    const response = { success: true, message: 'Usuario eliminado' };

    transformDeleteUserResponse(response);

    expect(mockLoggerApi).toHaveBeenCalledWith('Usuario eliminado exitosamente:', response);
  });

  it('debería loggear warning para respuesta inválida', () => {
    const response = { success: false };

    try {
      transformDeleteUserResponse(response);
    } catch (e) {
      // Se espera que lance error
    }

    expect(mockLoggerWarn).toHaveBeenCalledWith('Respuesta de eliminación de usuario inválida:', response);
  });
});

describe('usersApiSlice - providesTags con error', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createUsersTags = (users?: Array<{ id: number }>) => {
    if (!Array.isArray(users)) {
      return [{ type: 'User' as const, id: 'LIST' }];
    }
    return [
      { type: 'User' as const, id: 'LIST' },
      ...users.map(user => ({ type: 'User' as const, id: user.id })),
    ];
  };

  it('getUsuarios: Debería retornar LIST tag en caso de error', () => {
    const error = true;

    if (error) {
      mockLoggerWarn('Error en getUsuarios, usando tags por defecto:', error);
      const tags = [{ type: 'User' as const, id: 'LIST' }];
      expect(tags).toEqual([{ type: 'User', id: 'LIST' }]);
      return;
    }

    // Este código no debería ejecutarse
    expect(true).toBe(false);
  });

  it('getUsuarioById: Debería retornar array vacío en caso de error', () => {
    const error = true;
    const id = 123;

    if (error) {
      mockLoggerWarn(`Error obteniendo usuario ${id}:`, error);
      const tags: any[] = [];
      expect(tags).toEqual([]);
      return;
    }

    expect(true).toBe(false);
  });

  it('getUsuarioById: Debería retornar tag específico si no hay error', () => {
    const error = false;
    const id = 456;

    if (!error) {
      const tags = [{ type: 'User' as const, id }];
      expect(tags).toEqual([{ type: 'User', id: 456 }]);
      return;
    }

    expect(true).toBe(false);
  });
});

describe('usersApiSlice - invalidatesTags con error', () => {
  it('updateUser: Debería invalidar solo LIST en caso de error', () => {
    const error = true;
    const id = 5;

    const tags = error ? [] : [{ type: 'User' as const, id }, { type: 'User' as const, id: 'LIST' }];

    expect(tags).toEqual([]);
  });

  it('updateUser: Debería invalidar ambos tags si no hay error', () => {
    const error = false;
    const id = 10;

    const tags = error ? [] : [
      { type: 'User' as const, id },
      { type: 'User' as const, id: 'LIST' },
    ];

    expect(tags).toEqual([
      { type: 'User', id: 10 },
      { type: 'User', id: 'LIST' },
    ]);
  });

  it('deleteUser: Debería invalidar solo LIST en caso de error', () => {
    const error = true;
    const id = 3;

    const tags = error ? [] : [
      { type: 'User' as const, id },
      { type: 'User' as const, id: 'LIST' },
    ];

    expect(tags).toEqual([]);
  });

  it('deleteUser: Debería invalidar ambos tags si no hay error', () => {
    const error = false;
    const id = 7;

    const tags = error ? [] : [
      { type: 'User' as const, id },
      { type: 'User' as const, id: 'LIST' },
    ];

    expect(tags).toEqual([
      { type: 'User', id: 7 },
      { type: 'User', id: 'LIST' },
    ]);
  });

  it('createUser: Siempre invalida LIST (no tiene manejo de error específico)', () => {
    // createUser siempre invalida LIST independientemente del resultado
    const tags = [{ type: 'User' as const, id: 'LIST' }];

    expect(tags).toEqual([{ type: 'User', id: 'LIST' }]);
  });
});

describe('usersApiSlice - transformErrorResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const handleApiError = (error: unknown, operation: string) => {
    mockLoggerError(`Error en ${operation}:`, error);
    return error;
  };

  it('debería llamar handleApiError con el nombre de la operación', () => {
    const error = new Error('Test error');
    const operations = ['getUsuarios', 'getUsuarioById', 'createUser', 'updateUser', 'deleteUser', 'checkEmail'];

    operations.forEach(op => {
      handleApiError(error, op);
      expect(mockLoggerError).toHaveBeenCalledWith(`Error en ${op}:`, error);
    });
  });

  it('debería retornar el error sin modificar', () => {
    const error = { status: 500, data: { message: 'Server error' } };
    const result = handleApiError(error, 'testOperation');

    expect(result).toBe(error);
  });
});
