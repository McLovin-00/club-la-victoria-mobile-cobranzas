import { z } from 'zod';

// Esquemas base para validación
export const UserRoleSchema = z.enum(['admin', 'user', 'superadmin'], {
  errorMap: () => {
    return { message: 'El rol debe ser: admin, user o superadmin' };
  },
});

export const EmailSchema = z
  .string({
    required_error: 'El email es obligatorio',
  })
  .email({
    message: 'Debe ser un email válido',
  })
  .min(5, 'El email debe tener al menos 5 caracteres')
  .max(255, 'El email no puede exceder 255 caracteres')
  .toLowerCase()
  .trim();

export const PasswordSchema = z
  .string({
    required_error: 'La contraseña es obligatoria',
  })
  .min(6, 'La contraseña debe tener al menos 6 caracteres')
  .max(100, 'La contraseña no puede exceder 100 caracteres')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'La contraseña debe contener al menos: una minúscula, una mayúscula y un número'
  );

export const IdSchema = z
  .number({
    required_error: 'El ID es obligatorio',
    invalid_type_error: 'El ID debe ser un número',
  })
  .int('El ID debe ser un número entero')
  .positive('El ID debe ser un número positivo');

// Esquemas para operaciones CRUD de usuarios

/**
 * Esquema para crear usuario
 */
export const CreateUserSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  role: UserRoleSchema.optional().default('user'),
  empresaId: z
    .number()
    .int('El ID de empresa debe ser un número entero')
    .positive('El ID de empresa debe ser positivo')
    .optional()
    .nullable(),
});

/**
 * Esquema para actualizar usuario
 */
export const UpdateUserSchema = z.object({
  email: EmailSchema.optional(),
  password: PasswordSchema.optional(),
  role: UserRoleSchema.optional(),
  empresaId: z
    .number()
    .int('El ID de empresa debe ser un número entero')
    .positive('El ID de empresa debe ser positivo')
    .optional()
    .nullable(),
});

/**
 * Esquema para login
 */
export const LoginSchema = z.object({
  email: EmailSchema,
  password: z
    .string({
      required_error: 'La contraseña es obligatoria',
    })
    .min(1, 'La contraseña no puede estar vacía'),
});

/**
 * Esquema para cambio de contraseña
 */
export const ChangePasswordSchema = z
  .object({
    oldPassword: z
      .string({
        required_error: 'La contraseña actual es obligatoria',
      })
      .min(1, 'La contraseña actual no puede estar vacía'),
    newPassword: PasswordSchema,
    confirmPassword: z
      .string({
        required_error: 'La confirmación de contraseña es obligatoria',
      })
      .min(1, 'La confirmación de contraseña no puede estar vacía'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

/**
 * Esquema para filtros de búsqueda de usuarios
 */
export const UserFiltersSchema = z.object({
  role: UserRoleSchema.optional(),
  empresaId: z.number().int().positive().optional(),
  search: z
    .string()
    .min(1, 'El término de búsqueda debe tener al menos 1 caracter')
    .max(100, 'El término de búsqueda no puede exceder 100 caracteres')
    .trim()
    .optional(),
  limit: z
    .number()
    .int()
    .min(1, 'El límite debe ser al menos 1')
    .max(100, 'El límite no puede exceder 100')
    .optional()
    .default(10),
  offset: z.number().int().min(0, 'El offset debe ser al menos 0').optional().default(0),
});

/**
 * Esquema para parámetros de ID
 */
export const UserIdParamsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'El ID debe ser un número válido')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0, 'El ID debe ser un número positivo'),
});

// Esquemas de respuesta (para documentación)

/**
 * Esquema de respuesta de usuario (sin contraseña)
 */
export const UserResponseSchema = z.object({
  id: IdSchema,
  email: EmailSchema,
  role: UserRoleSchema,
  empresaId: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  empresa: z
    .object({
      id: IdSchema,
      nombre: z.string(),
      descripcion: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

/**
 * Esquema de respuesta de login
 */
export const LoginResponseSchema = z.object({
  user: UserResponseSchema,
  token: z.string(),
  expiresIn: z.string(),
});

/**
 * Esquema de respuesta paginada de usuarios
 */
export const UsersListResponseSchema = z.object({
  users: z.array(UserResponseSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

// Tipos TypeScript derivados de los esquemas
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type UserFiltersInput = z.infer<typeof UserFiltersSchema>;
export type UserIdParams = z.infer<typeof UserIdParamsSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type UsersListResponse = z.infer<typeof UsersListResponseSchema>;
