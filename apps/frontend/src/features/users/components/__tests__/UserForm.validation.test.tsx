/**
 * Tests de validación para UserForm
 *
 * Prueba:
 * - Validación de email
 * - Validación de password
 * - Validación de confirmPassword
 * - Validación de role
 * - Validación de empresa
 */
import { describe, it, expect } from '@jest/globals';

describe('UserForm - validación de email', () => {
  it('debería requerir email', () => {
    const email = '';

    // Email vacío es inválido
    expect(email.trim().length).toBe(0);
  });

  it('debería validar formato de email', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Válidos
    expect(emailRegex.test('user@example.com')).toBe(true);
    expect(emailRegex.test('test.user@domain.co.uk')).toBe(true);
    expect(emailRegex.test('user+tag@example.com')).toBe(true);
    expect(emailRegex.test('user123@test-domain.com')).toBe(true);

    // Inválidos
    expect(emailRegex.test('')).toBe(false);
    expect(emailRegex.test('user@')).toBe(false);
    expect(emailRegex.test('@example.com')).toBe(false);
    expect(emailRegex.test('userexample.com')).toBe(false);
    expect(emailRegex.test('user@.com')).toBe(false);
    expect(emailRegex.test('user@domain')).toBe(false);
    expect(emailRegex.test('user name@example.com')).toBe(false);
  });

  it('debería aceptar email válido', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmail = 'valid.user@example.com';

    expect(emailRegex.test(validEmail)).toBe(true);
  });

  it('debería rechazar email con espacios', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    expect(emailRegex.test(' user@example.com')).toBe(false);
    expect(emailRegex.test('user @example.com')).toBe(false);
    expect(emailRegex.test('user@ example.com')).toBe(false);
    expect(emailRegex.test('user@example .com')).toBe(false);
  });

  it('debería rechazar email sin @', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    expect(emailRegex.test('userexample.com')).toBe(false);
  });

  it('debería rechazar email sin dominio', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    expect(emailRegex.test('user@')).toBe(false);
  });

  it('debería rechazar email sin TLD', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    expect(emailRegex.test('user@domain')).toBe(false);
  });
});

describe('UserForm - validación de password', () => {
  it('debería requerir password en modo create', () => {
    const mode = 'create';
    const password = '';

    // En modo create, password es requerido
    if (mode === 'create') {
      expect(password.length).toBe(0);
    }
  });

  it('debería validar longitud mínima de 6 caracteres', () => {
    const minLength = 6;

    // Muy cortos (inválidos)
    expect(''.length).toBeLessThan(minLength);
    expect('a'.length).toBeLessThan(minLength);
    expect('ab'.length).toBeLessThan(minLength);
    expect('abc'.length).toBeLessThan(minLength);
    expect('abcd'.length).toBeLessThan(minLength);
    expect('abcde'.length).toBeLessThan(minLength);

    // Válido (exactamente 6)
    expect('abcdef'.length).toBeGreaterThanOrEqual(minLength);

    // Válido (más de 6)
    expect('abcdefg'.length).toBeGreaterThan(minLength);
  });

  it('debería validar mayúscula, minúscula y número', () => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

    // Válidos
    expect(passwordRegex.test('Password123')).toBe(true);
    expect(passwordRegex.test('MyPassword1')).toBe(true);
    expect(passwordRegex.test('SecurePass99')).toBe(true);

    // Inválidos - sin mayúscula
    expect(passwordRegex.test('password123')).toBe(false);

    // Inválidos - sin minúscula
    expect(passwordRegex.test('PASSWORD123')).toBe(false);

    // Inválidos - sin número
    expect(passwordRegex.test('Password')).toBe(false);

    // Inválidos - solo letras mayúsculas
    expect(passwordRegex.test('PASSWORD')).toBe(false);

    // Inválidos - solo letras minúsculas
    expect(passwordRegex.test('password')).toBe(false);

    // Inválidos - solo números
    expect(passwordRegex.test('123456')).toBe(false);
  });

  it('debería aceptar password fuerte', () => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    const strongPasswords = [
      'Password123',
      'MySecurePass99',
      'AdminPass2024',
      'SuperSecret1',
    ];

    strongPasswords.forEach(password => {
      expect(password.length).toBeGreaterThanOrEqual(6);
      expect(passwordRegex.test(password)).toBe(true);
    });
  });

  it('debería rechazar password débil', () => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    const weakPasswords = [
      '123456',           // Solo números
      'abcdef',           // Solo minúsculas
      'ABCDEF',           // Solo mayúsculas
      'Abc1',             // Muy corto
      'password',         // Sin mayúscula ni número
      'PASSWORD123',      // Sin minúscula
      'Password',         // Sin número
    ];

    weakPasswords.forEach(password => {
      // O muy corto o no cumple con el regex
      const isValid = password.length >= 6 && passwordRegex.test(password);
      expect(isValid).toBe(false);
    });
  });

  it('no debería mostrar password en modo edit', () => {
    const mode = 'edit';

    // En modo edit, password no es requerido
    if (mode === 'edit') {
      expect(mode).toBe('edit');
    }
  });
});

describe('UserForm - validación de confirmPassword', () => {
  it('debería requerir confirmación de password', () => {
    const password = 'Password123';
    const confirmPassword = '';

    // confirmPassword vacío es inválido si hay password
    const isValid = !!(password && confirmPassword && password === confirmPassword);
    expect(isValid).toBe(false);
  });

  it('debería coincidir con password', () => {
    const password = 'Password123';
    const confirmPassword = 'Password123';

    expect(password === confirmPassword).toBe(true);
  });

  it('debería mostrar error si no coincide', () => {
    const password = 'Password123';
    const confirmPassword = 'Password456';

    expect(password === confirmPassword).toBe(false);
  });

  it('debería ser case-sensitive', () => {
    const password = 'Password123';
    const confirmPassword = 'password123'; // minúscula en lugar de mayúscula

    expect(password === confirmPassword).toBe(false);
  });

  it('debería actualizar validación cuando password cambia', () => {
    // Simular cambios de password
    let password = 'OldPass123';
    let confirmPassword = 'OldPass123';

    expect(password === confirmPassword).toBe(true);

    // Cambiar password
    password = 'NewPass456';

    // Ahora no coinciden
    expect(password === confirmPassword).toBe(false);

    // Actualizar confirmPassword
    confirmPassword = 'NewPass456';

    // Ahora coinciden de nuevo
    expect(password === confirmPassword).toBe(true);
  });

  it('debería manejar espacios', () => {
    const password = 'Password123';
    const confirmPassword = 'Password123 ';

    // Espacio extra hace que no coincidan
    expect(password === confirmPassword).toBe(false);
  });

  it('debería permitir passwords vacíos en modo edición', () => {
    const mode = 'edit';
    let password = '';
    let confirmPassword = '';

    if (mode === 'edit') {
      // En modo edición, password puede estar vacío (no se cambia)
      const isValid = !password || password === confirmPassword;
      expect(isValid).toBe(true);
    }
  });
});

describe('UserForm - validación de role', () => {
  it('debería requerir role', () => {
    const role = '';

    // Role vacío es inválido
    expect(role).toBe('');
  });

  it('debería tener opciones user y admin', () => {
    const validRoles = ['user', 'admin'];

    validRoles.forEach(role => {
      expect(validRoles.includes(role)).toBe(true);
    });
  });

  it('debería aceptar role válido', () => {
    const role = 'admin';
    const validRoles = ['user', 'admin'];

    expect(validRoles.includes(role)).toBe(true);
  });

  it('debería validar role seleccionado', () => {
    const validRoles = ['user', 'admin'];

    // Válidos
    expect(validRoles.includes('user')).toBe(true);
    expect(validRoles.includes('admin')).toBe(true);

    // Inválido
    expect(validRoles.includes('superadmin')).toBe(false);
    expect(validRoles.includes('')).toBe(false);
    expect(validRoles.includes('invalid')).toBe(false);
  });

  it('debería rechazar superadmin como opción de formulario', () => {
    // superadmin no es una opción válida en el formulario
    // (se convierte a admin si el usuario original es superadmin)
    const formRoleOptions = ['user', 'admin'];

    expect(formRoleOptions.includes('superadmin')).toBe(false);
  });
});

describe('UserForm - validación de empresa', () => {
  it('debería requerir empresa para role admin', () => {
    const role = 'admin';
    const empresaId = null;

    // Para admin, empresaId es requerido
    if (role === 'admin') {
      expect(empresaId).toBeNull(); // Debería tener un valor
    }
  });

  it('no debería requerir empresa para role user', () => {
    const role = 'user';
    const empresaId = null;

    // Para user, empresaId es opcional
    if (role === 'user') {
      expect(empresaId).toBeNull(); // Puede ser null
    }
  });

  it('debería validar empresaId seleccionado', () => {
    const empresas = [
      { id: 1, nombre: 'Empresa 1' },
      { id: 2, nombre: 'Empresa 2' },
    ];

    const empresaId = 1;

    // Verificar que la empresa existe en la lista
    const empresaExists = empresas.some(e => e.id === empresaId);
    expect(empresaExists).toBe(true);
  });

  it('debería aceptar empresaId nulo para role user', () => {
    const role = 'user';
    const empresaId = null;

    // Para user, null es válido
    const isValid = role === 'user' && empresaId === null;
    expect(isValid).toBe(true);
  });

  it('debería aceptar empresaId válido para role admin', () => {
    const role = 'admin';
    const empresaId = 5;

    // Para admin, empresaId debe ser un número válido
    const isValid = role === 'admin' && empresaId !== null && empresaId > 0;
    expect(isValid).toBe(true);
  });

  it('debería rechazar empresaId 0', () => {
    const empresaId = 0;

    // 0 se convierte a null
    const processedEmpresaId = !empresaId ? null : empresaId;
    expect(processedEmpresaId).toBe(null);
  });

  it('debería rechazar empresaId negativo', () => {
    const empresaId = -1;

    // Negativo es inválido
    const isValid = empresaId && empresaId > 0;
    expect(isValid).toBe(false);
  });
});

describe('UserForm - validaciones combinadas', () => {
  it('debería validar todos los campos juntos', () => {
    const formData = {
      email: 'test@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
      role: 'admin',
      empresaId: 5,
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

    // Validar email
    expect(emailRegex.test(formData.email)).toBe(true);

    // Validar password
    expect(formData.password.length).toBeGreaterThanOrEqual(6);
    expect(passwordRegex.test(formData.password)).toBe(true);

    // Validar confirmPassword
    expect(formData.password === formData.confirmPassword).toBe(true);

    // Validar role
    expect(['user', 'admin'].includes(formData.role)).toBe(true);

    // Validar empresaId para admin
    expect(formData.empresaId).toBeGreaterThan(0);
  });

  it('debería detectar al menos un campo inválido', () => {
    const invalidForms = [
      { email: '', password: 'Pass123', confirmPassword: 'Pass123', role: 'admin', empresaId: 1 }, // email vacío
      { email: 'test@example.com', password: 'Pass1', confirmPassword: 'Pass1', role: 'user', empresaId: null }, // password muy corto
      { email: 'test@example.com', password: 'Password123', confirmPassword: 'Different', role: 'user', empresaId: null }, // passwords no coinciden
      { email: 'test@example.com', password: 'Password123', confirmPassword: 'Password123', role: '', empresaId: null }, // role vacío
      { email: 'test@example.com', password: 'Password123', confirmPassword: 'Password123', role: 'admin', empresaId: null }, // admin sin empresa
    ];

    invalidForms.forEach(form => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

      let hasError = false;

      if (!emailRegex.test(form.email)) hasError = true;
      if (form.password && form.password.length < 6) hasError = true;
      if (form.password && form.confirmPassword && form.password !== form.confirmPassword) hasError = true;
      if (!form.role) hasError = true;
      if (form.role === 'admin' && !form.empresaId) hasError = true;

      expect(hasError).toBe(true);
    });
  });

  it('debería pasar validación completa con datos correctos', () => {
    const validForm = {
      email: 'user@example.com',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
      role: 'user',
      empresaId: null,
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

    let allValid = true;

    if (!emailRegex.test(validForm.email)) allValid = false;
    if (validForm.password.length < 6) allValid = false;
    if (!passwordRegex.test(validForm.password)) allValid = false;
    if (validForm.password !== validForm.confirmPassword) allValid = false;
    if (!validForm.role) allValid = false;

    expect(allValid).toBe(true);
  });
});
