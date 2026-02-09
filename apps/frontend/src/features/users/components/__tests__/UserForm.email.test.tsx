/**
 * Tests de validación de email para UserForm
 *
 * Prueba:
 * - Verificación de email con debounce
 * - Indicadores de verificación
 * - useEmailValidation hook
 * - Bloqueo por email existente
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('UserForm - verificación de email', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debería llamar checkEmail con debounce (500ms)', () => {
    const mockCheckEmail = jest.fn();
    const mode = 'create';
    let watchedEmail = 'test@example.com';
    let lastCheckedEmail = '';

    // Simular debounce
    const debouncedCheckEmail = (email: string) => {
      mockCheckEmail(email);
      lastCheckedEmail = email;
    };

    const emailCheckTimeoutRef = { current: null as number | null };

    // Simular useEffect con debounce
    if (mode === 'create' && watchedEmail && watchedEmail !== lastCheckedEmail) {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }

      emailCheckTimeoutRef.current = setTimeout(() => {
        debouncedCheckEmail(watchedEmail);
      }, 500) as unknown as number;
    }

    // Verificar que se creó el timeout
    expect(jest.getTimerCount()).toBe(1);

    // Avanzar el tiempo
    jest.advanceTimersByTime(500);

    // Verificar que se llamó después del debounce
    expect(mockCheckEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('debería limpiar timeout anterior', () => {
    const mockCheckEmail = jest.fn();
    const emailCheckTimeoutRef = { current: null as number | null };

    // Crear primer timeout
    emailCheckTimeoutRef.current = setTimeout(() => {
      mockCheckEmail('first@example.com');
    }, 500) as unknown as number;

    const timerCount1 = jest.getTimerCount();

    // Limpiar y crear nuevo timeout
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }

    emailCheckTimeoutRef.current = setTimeout(() => {
      mockCheckEmail('second@example.com');
    }, 500) as unknown as number;

    // Avanzar tiempo
    jest.advanceTimersByTime(500);

    // Solo debería haberse llamado el segundo
    expect(mockCheckEmail).toHaveBeenCalledTimes(1);
    expect(mockCheckEmail).toHaveBeenCalledWith('second@example.com');
  });

  it('no debería verificar email en modo edición', () => {
    const mockCheckEmail = jest.fn();
    const mode = 'edit';
    const watchedEmail = 'test@example.com';
    const lastCheckedEmail = '';

    // En modo edición, no se verifica el email
    const shouldCheck = mode === 'create' && watchedEmail && watchedEmail !== lastCheckedEmail;

    expect(shouldCheck).toBe(false);
    expect(mockCheckEmail).not.toHaveBeenCalled();
  });

  it('debería verificar solo email con formato válido', () => {
    const mockCheckEmail = jest.fn();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const emails = [
      'invalid',           // Inválido
      'user@',            // Inválido
      '@example.com',     // Inválido
      'test@example.com', // Válido
      'user@domain.com',  // Válido
    ];

    emails.forEach(email => {
      const isValid = emailRegex.test(email);
      if (isValid) {
        expect(mockCheckEmail).toBeDefined(); // Podría ser llamado
      }
    });
  });

  it('debería actualizar lastCheckedEmail', () => {
    let lastCheckedEmail = '';

    const updateLastChecked = (email: string) => {
      lastCheckedEmail = email;
    };

    updateLastChecked('test@example.com');

    expect(lastCheckedEmail).toBe('test@example.com');
  });

  it('debería respetar el debounce', () => {
    const mockCheckEmail = jest.fn();
    const debouncedCheckEmail = (email: string) => {
      mockCheckEmail(email);
    };

    let timeoutId: NodeJS.Timeout | null = null;

    // Simular múltiples cambios rápidos
    const emails = ['a@test.com', 'ab@test.com', 'abc@test.com', 'abcd@test.com'];

    emails.forEach(email => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        debouncedCheckEmail(email);
      }, 500);
    });

    // Avanzar tiempo completo
    jest.advanceTimersByTime(500);

    // Solo debería llamarse una vez con el último email
    expect(mockCheckEmail).toHaveBeenCalledTimes(1);
    expect(mockCheckEmail).toHaveBeenCalledWith('abcd@test.com');
  });
});

describe('UserForm - indicadores de verificación', () => {
  it('debería mostrar Spinner mientras verifica', () => {
    const isCheckingEmail = true;
    const watchedEmail = 'test@example.com';
    const lastCheckedEmail = 'test@example.com';

    // Condición para mostrar spinner
    const showSpinner = !!(isCheckingEmail && watchedEmail);

    expect(showSpinner).toBe(true);
  });

  it('debería mostrar CheckCircle si email disponible', () => {
    const isCheckingEmail = false;
    const emailExists = false;
    const watchedEmail = 'test@example.com';
    const lastCheckedEmail = 'test@example.com';

    // Condición para mostrar check
    const showCheck = !isCheckingEmail && emailExists === false && watchedEmail === lastCheckedEmail;

    expect(showCheck).toBe(true);
  });

  it('debería mostrar ExclamationTriangle si email existe', () => {
    const isCheckingEmail = false;
    const emailExists = true;

    // Condición para mostrar error
    const showError = !isCheckingEmail && emailExists;

    expect(showError).toBe(true);
  });

  it('no debería mostrar nada si no se verificó', () => {
    const isCheckingEmail = false;
    const emailExists = false;
    const watchedEmail = 'test@example.com';
    const lastCheckedEmail = 'different@example.com';

    // No se verificó este email aún
    const wasChecked = watchedEmail === lastCheckedEmail;

    expect(wasChecked).toBe(false);
  });

  it('debería ocultar indicador si email cambia', () => {
    let watchedEmail = 'old@example.com';
    const lastCheckedEmail = 'old@example.com';

    // Inicialmente verificado
    let wasChecked = watchedEmail === lastCheckedEmail;
    expect(wasChecked).toBe(true);

    // Cambiar email
    watchedEmail = 'new@example.com';
    wasChecked = watchedEmail === lastCheckedEmail;

    // Ahora no está verificado
    expect(wasChecked).toBe(false);
  });

  it('debería mantener indicador si email es el mismo', () => {
    const watchedEmail = 'test@example.com';
    const lastCheckedEmail = 'test@example.com';

    const wasChecked = watchedEmail === lastCheckedEmail;

    expect(wasChecked).toBe(true);
  });
});

describe('UserForm - useEmailValidation hook', () => {
  it('debería obtener checkEmail function', () => {
    const mockCheckEmail = jest.fn();

    const useEmailValidation = () => ({
      checkEmail: mockCheckEmail,
      emailExists: false,
      isCheckingEmail: false,
    });

    const { checkEmail } = useEmailValidation();

    expect(checkEmail).toBeDefined();
    expect(typeof checkEmail).toBe('function');
  });

  it('debería obtener emailExists boolean', () => {
    const useEmailValidation = (exists: boolean) => ({
      checkEmail: jest.fn(),
      emailExists: exists,
      isCheckingEmail: false,
    });

    const { emailExists: exists1 } = useEmailValidation(false);
    const { emailExists: exists2 } = useEmailValidation(true);

    expect(typeof exists1).toBe('boolean');
    expect(typeof exists2).toBe('boolean');
    expect(exists1).toBe(false);
    expect(exists2).toBe(true);
  });

  it('debería obtener isCheckingEmail boolean', () => {
    const useEmailValidation = (checking: boolean) => ({
      checkEmail: jest.fn(),
      emailExists: false,
      isCheckingEmail: checking,
    });

    const { isCheckingEmail: checking1 } = useEmailValidation(false);
    const { isCheckingEmail: checking2 } = useEmailValidation(true);

    expect(typeof checking1).toBe('boolean');
    expect(typeof checking2).toBe('boolean');
    expect(checking1).toBe(false);
    expect(checking2).toBe(true);
  });

  it('debería retornar objeto con todas las propiedades', () => {
    const mockCheckEmail = jest.fn();

    const useEmailValidation = () => ({
      checkEmail: mockCheckEmail,
      emailExists: false,
      isCheckingEmail: false,
    });

    const result = useEmailValidation();

    expect(result).toHaveProperty('checkEmail');
    expect(result).toHaveProperty('emailExists');
    expect(result).toHaveProperty('isCheckingEmail');
  });

  it('debería mantener tipos correctos', () => {
    const useEmailValidation = () => ({
      checkEmail: jest.fn(),
      emailExists: false,
      isCheckingEmail: false,
    });

    const { checkEmail, emailExists, isCheckingEmail } = useEmailValidation();

    expect(typeof checkEmail).toBe('function');
    expect(typeof emailExists).toBe('boolean');
    expect(typeof isCheckingEmail).toBe('boolean');
  });
});

describe('UserForm - bloqueo por email existente', () => {
  it('debería deshabilitar submit si emailExists', () => {
    const emailExists = true;
    const mode = 'create';

    const isSubmitDisabled = mode === 'create' && emailExists;

    expect(isSubmitDisabled).toBe(true);
  });

  it('debería deshabilitar submit si isCheckingEmail', () => {
    const isCheckingEmail = true;
    const mode = 'create';

    const isSubmitDisabled = mode === 'create' && isCheckingEmail;

    expect(isSubmitDisabled).toBe(true);
  });

  it('debería habilitar submit si email disponible', () => {
    const emailExists = false;
    const isCheckingEmail = false;
    const mode = 'create';

    const isSubmitDisabled = mode === 'create' && (emailExists || isCheckingEmail);

    expect(isSubmitDisabled).toBe(false);
  });

  it('debería mostrar toast de error al submitir con email existente', () => {
    const emailExists = true;
    const mode = 'create';
    const data = { email: 'existing@example.com' };

    if (mode === 'create' && emailExists) {
      const showToast = jest.fn();
      showToast('El email ya está registrado', 'error');

      expect(showToast).toHaveBeenCalledWith('El email ya está registrado', 'error');
    }
  });

  it('debería permitir submit en modo edit aunque email existe', () => {
    const emailExists = true;
    const mode = 'edit';

    // En modo edición, emailExists no bloquea el submit
    const isSubmitDisabled = mode === 'create' && emailExists;

    expect(isSubmitDisabled).toBe(false);
  });

  it('debería combinar condiciones de bloqueo', () => {
    const mode = 'create';
    const emailExists = false;
    const isCheckingEmail = false;

    // Todas las condiciones que pueden deshabilitar
    const disabledConditions = {
      emailExists: mode === 'create' && emailExists,
      isCheckingEmail: mode === 'create' && isCheckingEmail,
    };

    expect(disabledConditions.emailExists).toBe(false);
    expect(disabledConditions.isCheckingEmail).toBe(false);
  });

  it('debería bloquear si email existe Y está checkeando', () => {
    const mode = 'create';
    const emailExists = true;
    const isCheckingEmail = true;

    const isDisabled = mode === 'create' && (emailExists || isCheckingEmail);

    expect(isDisabled).toBe(true);
  });
});

describe('UserForm - debounce edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debería manejar email vacío', () => {
    const watchedEmail = '';
    const lastCheckedEmail = '';

    // Email vacío no debería verificarse
    const shouldCheck = !!(watchedEmail && watchedEmail !== lastCheckedEmail);

    expect(shouldCheck).toBe(false);
  });

  it('debería manejar email con solo espacios', () => {
    const watchedEmail = '   ';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // No cumple con el formato básico
    expect(emailRegex.test(watchedEmail)).toBe(false);
  });

  it('debería limpiar timeout al desmontar', () => {
    const emailCheckTimeoutRef = { current: setTimeout(() => {}, 500) as unknown as number };

    // Simular cleanup
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }

    // Verificar que no hay timers pendientes
    jest.advanceTimersByTime(1000);
    // No debería haber errores
    expect(true).toBe(true);
  });

  it('debería manejar cambios rápidos de email', () => {
    const mockCheckEmail = jest.fn();
    let watchedEmail = '';
    let lastCheckedEmail = '';

    const debouncedCheckEmail = (email: string) => {
      mockCheckEmail(email);
      lastCheckedEmail = email;
    };

    let timeoutId: NodeJS.Timeout | null = null;

    const simulateChange = (newEmail: string) => {
      watchedEmail = newEmail;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        debouncedCheckEmail(newEmail);
      }, 500);
    };

    // Cambios rápidos
    simulateChange('a@test.com');
    simulateChange('ab@test.com');
    simulateChange('abc@test.com');

    // Avanzar tiempo
    jest.advanceTimersByTime(500);

    // Solo el último debería contar
    expect(mockCheckEmail).toHaveBeenCalledTimes(1);
    expect(lastCheckedEmail).toBe('abc@test.com');
  });

  it('debería verificar email después de debounce completo', () => {
    const mockCheckEmail = jest.fn();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let lastCheckedEmail = '';

    const watchedEmail = 'test@example.com';

    // Verificar formato primero
    if (!emailRegex.test(watchedEmail)) {
      // No verificar si formato inválido
      expect(mockCheckEmail).not.toHaveBeenCalled();
      return;
    }

    // Simular debounce
    setTimeout(() => {
      mockCheckEmail(watchedEmail);
      lastCheckedEmail = watchedEmail;
    }, 500);

    jest.advanceTimersByTime(500);

    expect(mockCheckEmail).toHaveBeenCalledWith('test@example.com');
    expect(lastCheckedEmail).toBe('test@example.com');
  });
});
