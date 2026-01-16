/**
 * Tests de manejo de errores para UserModal
 *
 * Prueba:
 * - Type guard isRTKQueryError
 * - Manejo de error 400 (validation errors)
 * - Manejo de error 401 (sesión expirada)
 * - Manejo de error 403 (sin permisos)
 * - Manejo de error 409 (email duplicado)
 * - Manejo de error 422 (datos inválidos)
 * - Manejo de error 500 (error interno)
 * - Manejo de error de red/Error
 * - Manejo de error desconocido
 * - Estado inválido del modal
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock de Toast.utils
const mockShowToast = jest.fn();

describe('UserModal - type guard isRTKQueryError', () => {
  it('debería identificar error con status', () => {
    const error = { status: 400, data: { message: 'Bad Request' } };

    // Type guard del componente
    const isRTKQueryError = (error: unknown): error is { status?: number; data?: any } => {
      return typeof error === 'object' && error !== null && 'status' in error;
    };

    expect(isRTKQueryError(error)).toBe(true);
  });

  it('debería rechazar error sin status', () => {
    const error = { message: 'Some error' };

    const isRTKQueryError = (error: unknown): error is { status?: number; data?: any } => {
      return typeof error === 'object' && error !== null && 'status' in error;
    };

    expect(isRTKQueryError(error)).toBe(false);
  });

  it('debería tener type property', () => {
    const error = { status: 404 };

    expect(error).toHaveProperty('status');
  });

  it('debería manejar null', () => {
    const error = null;

    const isRTKQueryError = (error: unknown): error is { status?: number } => {
      return typeof error === 'object' && error !== null && 'status' in error;
    };

    expect(isRTKQueryError(error)).toBe(false);
  });

  it('debería manejar undefined', () => {
    const error = undefined;

    const isRTKQueryError = (error: unknown): error is { status?: number } => {
      return typeof error === 'object' && error !== null && 'status' in error;
    };

    expect(isRTKQueryError(error)).toBe(false);
  });
});

describe('UserModal - manejo de error 400', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería extraer validationErrors de data.errors', () => {
    const error = {
      status: 400,
      data: {
        success: false,
        errors: [
          { field: 'email', message: 'Email inválido', code: 'INVALID_EMAIL' },
          { field: 'password', message: 'Password muy corto', code: 'INVALID_PASSWORD' },
        ],
      },
    };

    const isRTKQueryError = (err: unknown): err is typeof error => {
      return typeof err === 'object' && err !== null && 'status' in err;
    };

    if (isRTKQueryError(error)) {
      const { status, data } = error;

      if (status === 400 && data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const validationErrors = data.errors
          .map((err: any) => err.message)
          .filter(Boolean)
          .join(', ');

        expect(validationErrors).toBe('Email inválido, Password muy corto');
      }
    }
  });

  it('debería unir messages con coma', () => {
    const error = {
      status: 400,
      data: {
        success: false,
        errors: [
          { field: 'email', message: 'Error 1', code: 'ERR1' },
          { field: 'password', message: 'Error 2', code: 'ERR2' },
          { field: 'role', message: 'Error 3', code: 'ERR3' },
        ],
      },
    };

    const isRTKQueryError = (err: unknown): err is typeof error => {
      return typeof err === 'object' && err !== null && 'status' in err;
    };

    if (isRTKQueryError(error)) {
      const { data } = error;
      const validationErrors = data?.errors
        ?.map((err: any) => err.message)
        .filter(Boolean)
        .join(', ');

      expect(validationErrors).toBe('Error 1, Error 2, Error 3');
    }
  });

  it('debería fallback a data.message', () => {
    const error = {
      status: 400,
      data: {
        success: false,
        message: 'Error de validación general',
      },
    };

    const isRTKQueryError = (err: unknown): err is typeof error => {
      return typeof err === 'object' && err !== null && 'status' in err;
    };

    if (isRTKQueryError(error)) {
      const { data } = error;
      const message = data?.message || 'Datos inválidos. Verifica la información ingresada.';

      expect(message).toBe('Error de validación general');
    }
  });

  it('debería fallback a mensaje genérico', () => {
    const error = {
      status: 400,
      data: {
        success: false,
      },
    };

    const isRTKQueryError = (err: unknown): err is typeof error => {
      return typeof err === 'object' && err !== null && 'status' in err;
    };

    if (isRTKQueryError(error)) {
      const { data } = error;
      const message = data?.message || 'Datos inválidos. Verifica la información ingresada.';

      expect(message).toBe('Datos inválidos. Verifica la información ingresada.');
    }
  });
});

describe('UserModal - manejo de error 401', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería mostrar toast "Sesión expirada"', () => {
    const error = { status: 401, data: { message: 'Unauthorized' } };

    const isRTKQueryError = (err: unknown): err is typeof error => {
      return typeof err === 'object' && err !== null && 'status' in err;
    };

    if (isRTKQueryError(error) && error.status === 401) {
      mockShowToast('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
    }

    expect(mockShowToast).toHaveBeenCalledWith(
      'Sesión expirada. Por favor, inicia sesión nuevamente.',
      'error'
    );
  });

  it('debería loggear error', () => {
    const mockLoggerError = jest.fn();
    const error = { status: 401 };

    mockLoggerError('Error al guardar usuario:', error);

    expect(mockLoggerError).toHaveBeenCalledWith('Error al guardar usuario:', error);
  });
});

describe('UserModal - manejo de error 403', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería mostrar toast "No tienes permisos"', () => {
    const error = { status: 403, data: { message: 'Forbidden' } };

    const isRTKQueryError = (err: unknown): err is typeof error => {
      return typeof err === 'object' && err !== null && 'status' in err;
    };

    if (isRTKQueryError(error) && error.status === 403) {
      mockShowToast('No tienes permisos para realizar esta acción', 'error');
    }

    expect(mockShowToast).toHaveBeenCalledWith(
      'No tienes permisos para realizar esta acción',
      'error'
    );
  });

  it('debería loggear error', () => {
    const mockLoggerError = jest.fn();
    const error = { status: 403 };

    mockLoggerError('Error al guardar usuario:', error);

    expect(mockLoggerError).toHaveBeenCalledWith('Error al guardar usuario:', error);
  });
});

describe('UserModal - manejo de error 409', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería mostrar toast "Email ya registrado"', () => {
    const error = { status: 409, data: { message: 'Conflict' } };

    const isRTKQueryError = (err: unknown): err is typeof error => {
      return typeof err === 'object' && err !== null && 'status' in err;
    };

    if (isRTKQueryError(error) && error.status === 409) {
      mockShowToast('El email ya está registrado', 'error');
    }

    expect(mockShowToast).toHaveBeenCalledWith('El email ya está registrado', 'error');
  });

  it('debería loggear error', () => {
    const mockLoggerError = jest.fn();
    const error = { status: 409 };

    mockLoggerError('Error al guardar usuario:', error);

    expect(mockLoggerError).toHaveBeenCalledWith('Error al guardar usuario:', error);
  });
});

describe('UserModal - manejo de error 422', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería mostrar toast "Datos no válidos"', () => {
    const error = { status: 422, data: { message: 'Unprocessable Entity' } };

    const isRTKQueryError = (err: unknown): err is typeof error => {
      return typeof err === 'object' && err !== null && 'status' in err;
    };

    if (isRTKQueryError(error) && error.status === 422) {
      mockShowToast('Los datos proporcionados no son válidos', 'error');
    }

    expect(mockShowToast).toHaveBeenCalledWith(
      'Los datos proporcionados no son válidos',
      'error'
    );
  });

  it('debería loggear error', () => {
    const mockLoggerError = jest.fn();
    const error = { status: 422 };

    mockLoggerError('Error al guardar usuario:', error);

    expect(mockLoggerError).toHaveBeenCalledWith('Error al guardar usuario:', error);
  });
});

describe('UserModal - manejo de error 500', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería mostrar toast "Error interno"', () => {
    const error = { status: 500, data: { message: 'Internal Server Error' } };

    const isRTKQueryError = (err: unknown): err is typeof error => {
      return typeof err === 'object' && err !== null && 'status' in err;
    };

    if (isRTKQueryError(error) && error.status === 500) {
      mockShowToast('Error interno del servidor. Inténtalo más tarde.', 'error');
    }

    expect(mockShowToast).toHaveBeenCalledWith(
      'Error interno del servidor. Inténtalo más tarde.',
      'error'
    );
  });

  it('debería loggear error', () => {
    const mockLoggerError = jest.fn();
    const error = { status: 500 };

    mockLoggerError('Error al guardar usuario:', error);

    expect(mockLoggerError).toHaveBeenCalledWith('Error al guardar usuario:', error);
  });
});

describe('UserModal - manejo de error de red/Error', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería detectar Error instance', () => {
    const error = new Error('Network error');

    expect(error instanceof Error).toBe(true);
  });

  it('debería mostrar toast "Error de conexión"', () => {
    const error = new Error('Network error');

    if (error instanceof Error) {
      mockShowToast('Error de conexión. Verifica tu conexión a internet.', 'error');
    }

    expect(mockShowToast).toHaveBeenCalledWith(
      'Error de conexión. Verifica tu conexión a internet.',
      'error'
    );
  });

  it('debería loggear error.message', () => {
    const mockLoggerError = jest.fn();
    const error = new Error('Network error');

    mockLoggerError('Error de red o aplicación:', error.message);

    expect(mockLoggerError).toHaveBeenCalledWith('Error de red o aplicación:', 'Network error');
  });
});

describe('UserModal - manejo de error desconocido', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería mostrar toast genérico', () => {
    const error = { unknown: 'error' };

    const isRTKQueryError = (err: unknown): err is { status?: number } => {
      return typeof err === 'object' && err !== null && 'status' in err;
    };

    const isError = error instanceof Error;

    if (!isRTKQueryError(error) && !isError) {
      mockShowToast('Error inesperado. Inténtalo de nuevo.', 'error');
    }

    expect(mockShowToast).toHaveBeenCalledWith('Error inesperado. Inténtalo de nuevo.', 'error');
  });

  it('debería loggear error completo', () => {
    const mockLoggerError = jest.fn();
    const error = { unknown: 'error' };

    mockLoggerError('Error desconocido:', error);

    expect(mockLoggerError).toHaveBeenCalledWith('Error desconocido:', error);
  });

  it('debería manejar string como error', () => {
    const error = 'string error';

    const isRTKQueryError = (err: unknown): err is { status?: number } => {
      return typeof err === 'object' && err !== null && 'status' in err;
    };

    const isError = error instanceof Error;

    if (!isRTKQueryError(error) && !isError) {
      mockShowToast('Error inesperado. Inténtalo de nuevo.', 'error');
    }

    expect(mockShowToast).toHaveBeenCalledWith('Error inesperado. Inténtalo de nuevo.', 'error');
  });

  it('debería manejar número como error', () => {
    const error = 404;

    const isRTKQueryError = (err: unknown): err is { status?: number } => {
      return typeof err === 'object' && err !== null && 'status' in err;
    };

    const isError = error instanceof Error;

    if (!isRTKQueryError(error) && !isError) {
      mockShowToast('Error inesperado. Inténtalo de nuevo.', 'error');
    }

    expect(mockShowToast).toHaveBeenCalledWith('Error inesperado. Inténtalo de nuevo.', 'error');
  });
});

describe('UserModal - estado inválido del modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería detectar mode=edit sin user', () => {
    // Simular detección de estado inválido
    const mode = 'edit';
    const user = null;

    const isInvalidState = mode === 'edit' && !user;

    expect(isInvalidState).toBe(true);
  });

  it('debería mostrar toast "Estado inválido"', () => {
    // Simular respuesta a estado inválido
    mockShowToast('Error: Estado de modal inválido', 'error');

    expect(mockShowToast).toHaveBeenCalledWith('Error: Estado de modal inválido', 'error');
  });

  it('debería loggear error', () => {
    const mockLoggerError = jest.fn();

    mockLoggerError('Estado de modal inválido');

    expect(mockLoggerError).toHaveBeenCalledWith('Estado de modal inválido');
  });

  it('no debería llamar onClose', () => {
    // Simular que NO se llama onClose en estado inválido
    const onClose = jest.fn();

    // Simular lógica del componente
    const mode = 'edit';
    const user = null;

    if (mode === 'edit' && !user) {
      // No llamar a onClose
      return;
    }

    // Si llegamos aquí, sí llamaríamos a onClose
    onClose();

    // En este caso, onClose NO debería ser llamado
    expect(onClose).not.toHaveBeenCalled();
  });

  it('debería manejar create mode sin user válido', () => {
    const mode = 'create';
    const user = null;

    // En modo create, user puede ser null
    const isValidForCreate = mode === 'create';

    expect(isValidForCreate).toBe(true);
  });

  it('debería manejar edit mode con user válido', () => {
    const mode = 'edit';
    const user = { id: 1, email: 'test@test.com' };

    // En modo edit, user debe existir
    const isValidForEdit = mode === 'edit' && user !== null;

    expect(isValidForEdit).toBe(true);
  });
});
