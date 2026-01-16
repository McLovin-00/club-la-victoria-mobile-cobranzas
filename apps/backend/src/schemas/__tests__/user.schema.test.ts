/**
 * @jest-environment node
 */
import {
  ChangePasswordSchema,
  CreateUserSchema,
  EmailSchema,
  IdSchema,
  LoginSchema,
  LoginResponseSchema,
  PasswordSchema,
  UpdateUserSchema,
  UserFiltersSchema,
  UserIdParamsSchema,
  UserResponseSchema,
  UserRoleSchema,
  UsersListResponseSchema,
} from '../user.schema';

describe('user.schema (Zod) - unit', () => {
  describe('UserRoleSchema', () => {
    it('accepts valid roles', () => {
      expect(UserRoleSchema.parse('admin')).toBe('admin');
      expect(UserRoleSchema.parse('user')).toBe('user');
      expect(UserRoleSchema.parse('superadmin')).toBe('superadmin');
    });

    it('rejects invalid roles with custom error message', () => {
      const r = UserRoleSchema.safeParse('owner');
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(r.error.issues[0]?.message).toBe('El rol debe ser: admin, user o superadmin');
      }
    });
  });

  describe('EmailSchema', () => {
    it('normalizes email (lowercase) and accepts valid email', () => {
      // Nota: EmailSchema valida .email() antes de .trim(), por eso no usamos espacios.
      const v = EmailSchema.parse('TeSt@Example.COM');
      expect(v).toBe('test@example.com');
    });

    it('rejects missing/invalid/too short/too long emails', () => {
      // invalid format
      const invalid = EmailSchema.safeParse('not-an-email');
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues.some(i => i.message === 'Debe ser un email válido')).toBe(true);
      }

      // too short (min 5)
      const tooShort = EmailSchema.safeParse('a@b');
      expect(tooShort.success).toBe(false);
      if (!tooShort.success) {
        expect(tooShort.error.issues.some(i => i.message === 'El email debe tener al menos 5 caracteres')).toBe(true);
      }

      // too long (max 255)
      const longLocal = 'a'.repeat(246); // + "@x.com" => 252, adjust to exceed 255
      const tooLongVal = `${'a'.repeat(252)}@x.com`; // definitely > 255
      const tooLong = EmailSchema.safeParse(tooLongVal);
      expect(tooLong.success).toBe(false);
      if (!tooLong.success) {
        expect(tooLong.error.issues.some(i => i.message === 'El email no puede exceder 255 caracteres')).toBe(true);
      }

      // required_error
      const missing = EmailSchema.safeParse(undefined);
      expect(missing.success).toBe(false);
      if (!missing.success) {
        expect(missing.error.issues.some(i => i.message === 'El email es obligatorio')).toBe(true);
      }
      // keep TS happy for unused variable in some compilers
      expect(longLocal.length).toBeGreaterThan(0);
    });
  });

  describe('PasswordSchema', () => {
    it('accepts valid password meeting length and complexity', () => {
      expect(PasswordSchema.parse('Abcdef1')).toBe('Abcdef1');
      expect(PasswordSchema.parse('Zz123456')).toBe('Zz123456');
    });

    it('rejects too short, too long, and missing complexity', () => {
      const tooShort = PasswordSchema.safeParse('Ab1');
      expect(tooShort.success).toBe(false);
      if (!tooShort.success) {
        expect(tooShort.error.issues.some(i => i.message === 'La contraseña debe tener al menos 6 caracteres')).toBe(true);
      }

      const tooLong = PasswordSchema.safeParse(`Ab1${'a'.repeat(200)}`);
      expect(tooLong.success).toBe(false);
      if (!tooLong.success) {
        expect(tooLong.error.issues.some(i => i.message === 'La contraseña no puede exceder 100 caracteres')).toBe(true);
      }

      const noUpper = PasswordSchema.safeParse('abcdef1');
      expect(noUpper.success).toBe(false);
      if (!noUpper.success) {
        expect(
          noUpper.error.issues.some(
            i =>
              i.message ===
              'La contraseña debe contener al menos: una minúscula, una mayúscula y un número'
          )
        ).toBe(true);
      }

      const noLower = PasswordSchema.safeParse('ABCDEF1');
      expect(noLower.success).toBe(false);
      if (!noLower.success) {
        expect(
          noLower.error.issues.some(
            i =>
              i.message ===
              'La contraseña debe contener al menos: una minúscula, una mayúscula y un número'
          )
        ).toBe(true);
      }

      const noDigit = PasswordSchema.safeParse('Abcdefg');
      expect(noDigit.success).toBe(false);
      if (!noDigit.success) {
        expect(
          noDigit.error.issues.some(
            i =>
              i.message ===
              'La contraseña debe contener al menos: una minúscula, una mayúscula y un número'
          )
        ).toBe(true);
      }

      const missing = PasswordSchema.safeParse(undefined);
      expect(missing.success).toBe(false);
      if (!missing.success) {
        expect(missing.error.issues.some(i => i.message === 'La contraseña es obligatoria')).toBe(true);
      }
    });
  });

  describe('IdSchema', () => {
    it('accepts positive integers', () => {
      expect(IdSchema.parse(1)).toBe(1);
      expect(IdSchema.parse(999)).toBe(999);
    });

    it('rejects non-number, non-integer, and non-positive values', () => {
      const notNumber = IdSchema.safeParse('1');
      expect(notNumber.success).toBe(false);
      if (!notNumber.success) {
        expect(notNumber.error.issues.some(i => i.message === 'El ID debe ser un número')).toBe(true);
      }

      const notInt = IdSchema.safeParse(1.5);
      expect(notInt.success).toBe(false);
      if (!notInt.success) {
        expect(notInt.error.issues.some(i => i.message === 'El ID debe ser un número entero')).toBe(true);
      }

      const notPositive = IdSchema.safeParse(0);
      expect(notPositive.success).toBe(false);
      if (!notPositive.success) {
        expect(notPositive.error.issues.some(i => i.message === 'El ID debe ser un número positivo')).toBe(true);
      }

      const missing = IdSchema.safeParse(undefined);
      expect(missing.success).toBe(false);
      if (!missing.success) {
        expect(missing.error.issues.some(i => i.message === 'El ID es obligatorio')).toBe(true);
      }
    });
  });

  describe('CreateUserSchema', () => {
    it('parses valid input and applies default role=user', () => {
      // Nota: EmailSchema valida .email() antes de .trim(), por eso no usamos espacios.
      const parsed = CreateUserSchema.parse({
        email: 'USER@Example.com',
        password: 'Abcdef1',
      });

      expect(parsed.email).toBe('user@example.com');
      expect(parsed.password).toBe('Abcdef1');
      expect(parsed.role).toBe('user');
      expect(parsed.empresaId).toBeUndefined();
    });

    it('accepts empresaId as integer positive, nullable, optional', () => {
      const withEmpresa = CreateUserSchema.parse({
        email: 'a1234@b.com',
        password: 'Abcdef1',
        empresaId: 10,
        role: 'admin',
      });
      expect(withEmpresa.empresaId).toBe(10);
      expect(withEmpresa.role).toBe('admin');

      const nullEmpresa = CreateUserSchema.parse({
        email: 'a1234@b.com',
        password: 'Abcdef1',
        empresaId: null,
      });
      expect(nullEmpresa.empresaId).toBeNull();
    });

    it('rejects invalid empresaId (non-int or non-positive)', () => {
      const nonInt = CreateUserSchema.safeParse({
        email: 'a1234@b.com',
        password: 'Abcdef1',
        empresaId: 1.5,
      });
      expect(nonInt.success).toBe(false);
      if (!nonInt.success) {
        expect(nonInt.error.issues.some(i => i.message === 'El ID de empresa debe ser un número entero')).toBe(true);
      }

      const nonPositive = CreateUserSchema.safeParse({
        email: 'a1234@b.com',
        password: 'Abcdef1',
        empresaId: 0,
      });
      expect(nonPositive.success).toBe(false);
      if (!nonPositive.success) {
        expect(nonPositive.error.issues.some(i => i.message === 'El ID de empresa debe ser positivo')).toBe(true);
      }
    });
  });

  describe('UpdateUserSchema', () => {
    it('accepts partial update (all fields optional)', () => {
      // Nota: EmailSchema valida .email() antes de .trim(), por eso no usamos espacios.
      const parsed = UpdateUserSchema.parse({ email: 'X@Y.com' });
      expect(parsed.email).toBe('x@y.com');
      expect(parsed.password).toBeUndefined();
      expect(parsed.role).toBeUndefined();
      expect(parsed.empresaId).toBeUndefined();
    });

    it('accepts empresaId nullable/optional and validates integer positive when present', () => {
      const ok = UpdateUserSchema.parse({ empresaId: 5 });
      expect(ok.empresaId).toBe(5);

      const nullable = UpdateUserSchema.parse({ empresaId: null });
      expect(nullable.empresaId).toBeNull();

      const bad = UpdateUserSchema.safeParse({ empresaId: -1 });
      expect(bad.success).toBe(false);
      if (!bad.success) {
        expect(bad.error.issues.some(i => i.message === 'El ID de empresa debe ser positivo')).toBe(true);
      }
    });
  });

  describe('LoginSchema', () => {
    it('accepts valid login payload', () => {
      const parsed = LoginSchema.parse({ email: 'test@ex.com', password: 'x' });
      expect(parsed).toEqual({ email: 'test@ex.com', password: 'x' });
    });

    it('rejects empty password with controlled error message', () => {
      const r = LoginSchema.safeParse({ email: 'test@ex.com', password: '' });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(r.error.issues.some(i => i.message === 'La contraseña no puede estar vacía')).toBe(true);
      }
    });

    it('rejects missing password with required_error message', () => {
      const r = LoginSchema.safeParse({ email: 'test@ex.com' } as any);
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(r.error.issues.some(i => i.message === 'La contraseña es obligatoria')).toBe(true);
      }
    });
  });

  describe('ChangePasswordSchema', () => {
    it('accepts when newPassword matches confirmPassword', () => {
      const parsed = ChangePasswordSchema.parse({
        oldPassword: 'old',
        newPassword: 'Abcdef1',
        confirmPassword: 'Abcdef1',
      });

      expect(parsed.oldPassword).toBe('old');
      expect(parsed.newPassword).toBe('Abcdef1');
      expect(parsed.confirmPassword).toBe('Abcdef1');
    });

    it('rejects when newPassword does not match confirmPassword (refinement branch)', () => {
      const r = ChangePasswordSchema.safeParse({
        oldPassword: 'old',
        newPassword: 'Abcdef1',
        confirmPassword: 'Different1A',
      });

      expect(r.success).toBe(false);
      if (!r.success) {
        // The refinement should target confirmPassword
        const issue = r.error.issues.find(i => i.message === 'Las contraseñas no coinciden');
        expect(issue).toBeDefined();
        expect(issue?.path).toEqual(['confirmPassword']);
      }
    });

    it('rejects empty oldPassword and empty confirmPassword with controlled errors', () => {
      const r = ChangePasswordSchema.safeParse({
        oldPassword: '',
        newPassword: 'Abcdef1',
        confirmPassword: '',
      });

      expect(r.success).toBe(false);
      if (!r.success) {
        expect(r.error.issues.some(i => i.message === 'La contraseña actual no puede estar vacía')).toBe(true);
        expect(r.error.issues.some(i => i.message === 'La confirmación de contraseña no puede estar vacía')).toBe(true);
      }
    });
  });

  describe('UserFiltersSchema', () => {
    it('applies defaults for limit and offset', () => {
      const parsed = UserFiltersSchema.parse({});
      expect(parsed.limit).toBe(10);
      expect(parsed.offset).toBe(0);
      expect(parsed.role).toBeUndefined();
      expect(parsed.empresaId).toBeUndefined();
      expect(parsed.search).toBeUndefined();
    });

    it('trims search and accepts valid filters', () => {
      const parsed = UserFiltersSchema.parse({
        role: 'admin',
        empresaId: 7,
        search: '  hello ',
        limit: 25,
        offset: 5,
      });

      expect(parsed.role).toBe('admin');
      expect(parsed.empresaId).toBe(7);
      expect(parsed.search).toBe('hello');
      expect(parsed.limit).toBe(25);
      expect(parsed.offset).toBe(5);
    });

    it('rejects invalid boundaries and controlled messages', () => {
      const r1 = UserFiltersSchema.safeParse({ limit: 0 });
      expect(r1.success).toBe(false);
      if (!r1.success) {
        expect(r1.error.issues.some(i => i.message === 'El límite debe ser al menos 1')).toBe(true);
      }

      const r2 = UserFiltersSchema.safeParse({ limit: 101 });
      expect(r2.success).toBe(false);
      if (!r2.success) {
        expect(r2.error.issues.some(i => i.message === 'El límite no puede exceder 100')).toBe(true);
      }

      const r3 = UserFiltersSchema.safeParse({ offset: -1 });
      expect(r3.success).toBe(false);
      if (!r3.success) {
        expect(r3.error.issues.some(i => i.message === 'El offset debe ser al menos 0')).toBe(true);
      }

      const r4 = UserFiltersSchema.safeParse({ search: '' });
      expect(r4.success).toBe(false);
      if (!r4.success) {
        expect(r4.error.issues.some(i => i.message === 'El término de búsqueda debe tener al menos 1 caracter')).toBe(true);
      }
    });
  });

  describe('UserIdParamsSchema', () => {
    it('transforms id from numeric string to number and enforces > 0', () => {
      const parsed = UserIdParamsSchema.parse({ id: '42' });
      expect(parsed.id).toBe(42);
      expect(typeof parsed.id).toBe('number');
    });

    it('rejects non-numeric strings', () => {
      const r = UserIdParamsSchema.safeParse({ id: 'abc' });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(r.error.issues.some(i => i.message === 'El ID debe ser un número válido')).toBe(true);
      }
    });

    it('rejects zero/negative after transform (refinement branch)', () => {
      const r = UserIdParamsSchema.safeParse({ id: '0' });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(r.error.issues.some(i => i.message === 'El ID debe ser un número positivo')).toBe(true);
      }
    });
  });

  describe('UserResponseSchema', () => {
    it('accepts valid response payload, including optional empresa as null and empresaId as null', () => {
      const payload = {
        id: 1,
        email: 'USER@Example.com',
        role: 'user',
        empresaId: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        empresa: null,
      };

      const parsed = UserResponseSchema.parse(payload);
      expect(parsed.id).toBe(1);
      expect(parsed.email).toBe('user@example.com');
      expect(parsed.role).toBe('user');
      expect(parsed.empresaId).toBeNull();
      expect(parsed.empresa).toBeNull();
      expect(parsed.createdAt).toBeInstanceOf(Date);
      expect(parsed.updatedAt).toBeInstanceOf(Date);
    });

    it('accepts empresa object when provided', () => {
      const payload = {
        id: 2,
        email: 'a1234@b.com',
        role: 'admin',
        empresaId: 10,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        empresa: {
          id: 10,
          nombre: 'Acme',
          descripcion: null,
        },
      };

      const parsed = UserResponseSchema.parse(payload);
      expect(parsed.empresa?.id).toBe(10);
      expect(parsed.empresa?.nombre).toBe('Acme');
      expect(parsed.empresa?.descripcion).toBeNull();
    });

    it('rejects when createdAt/updatedAt are not Date objects', () => {
      const r = UserResponseSchema.safeParse({
        id: 1,
        email: 'test@ex.com',
        role: 'user',
        empresaId: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      } as any);

      expect(r.success).toBe(false);
      if (!r.success) {
        // Zod date errors are generic, assert by path presence
        const paths = r.error.issues.map(i => i.path.join('.'));
        expect(paths).toContain('createdAt');
        expect(paths).toContain('updatedAt');
      }
    });
  });

  describe('UsersListResponseSchema', () => {
    it('accepts paginated response with one user', () => {
      const payload = {
        users: [
          {
            id: 1,
            email: 'test@ex.com',
            role: 'user',
            empresaId: null,
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
            updatedAt: new Date('2024-01-02T00:00:00.000Z'),
            empresa: null,
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      const parsed = UsersListResponseSchema.parse(payload);
      expect(parsed.users).toHaveLength(1);
      expect(parsed.pagination.page).toBe(1);
      expect(parsed.pagination.hasNext).toBe(false);
      expect(parsed.pagination.hasPrev).toBe(false);
    });

    it('rejects invalid pagination numbers (branch coverage on min/positive)', () => {
      const r = UsersListResponseSchema.safeParse({
        users: [],
        pagination: {
          page: 0, // should be positive
          limit: 0, // should be positive
          total: -1, // min 0
          totalPages: -1, // min 0
          hasNext: false,
          hasPrev: false,
        },
      });

      expect(r.success).toBe(false);
      if (!r.success) {
        const messages = r.error.issues.map(i => i.message);
        // don't overfit exact Zod messages; assert by presence of issues for fields
        const paths = r.error.issues.map(i => i.path.join('.'));
        expect(paths).toContain('pagination.page');
        expect(paths).toContain('pagination.limit');
        expect(paths).toContain('pagination.total');
        expect(paths).toContain('pagination.totalPages');
        expect(messages.length).toBeGreaterThan(0);
      }
    });
  });

  describe('LoginResponseSchema', () => {
    it('accepts valid login response', () => {
      const payload = {
        user: {
          id: 1,
          email: 'test@ex.com',
          role: 'user',
          empresaId: null,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
          empresa: null,
        },
        token: 'jwt-token',
        expiresIn: '1h',
      };

      const parsed = LoginResponseSchema.parse(payload);
      expect(parsed.token).toBe('jwt-token');
      expect(parsed.expiresIn).toBe('1h');
      expect(parsed.user.email).toBe('test@ex.com');
    });

    it('rejects when token is missing', () => {
      const r = LoginResponseSchema.safeParse({
        user: {
          id: 1,
          email: 'test@ex.com',
          role: 'user',
          empresaId: null,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        },
        expiresIn: '1h',
      } as any);

      expect(r.success).toBe(false);
      if (!r.success) {
        const paths = r.error.issues.map(i => i.path.join('.'));
        expect(paths).toContain('token');
      }
    });
  });
});
