import { Request, Response } from 'express';
import { authService, AuthPayload } from '../services/auth.service';
import { AppLogger } from '../config/logger';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

// Esquemas de validación con Zod
const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email es requerido'),
  password: z.string().min(1, 'Contraseña es requerida'),
});

const registerSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['user', 'admin', 'superadmin']).optional().default('user'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual es requerida'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

const checkEmailSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email es requerido'),
});

const updateEmpresaSchema = z.object({
  empresaId: z.number().int().positive().nullable(),
});

/**
 * Controlador de autenticación
 */

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const result = await authService.login(validatedData as { email: string; password: string });

    res.status(200).json(result);
  } catch (error) {
    AppLogger.error('Error en login:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: error.errors,
      });
    }

    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error en autenticación',
    });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = registerSchema.parse(req.body);
    const authUser = (req as any).user as AuthPayload;

    const validatedData = {
      email: email.toLowerCase().trim(),
      password,
      role: role as UserRole,
    };

    const result = await authService.register(validatedData, authUser);

    res.status(201).json(result);
  } catch (error) {
    AppLogger.error('Error en registro:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: error.errors,
      });
    }

    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error en registro',
    });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    AppLogger.error('Error al obtener usuario actual:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const validatedData = changePasswordSchema.parse(req.body);
    const user = (req as any).user as AuthPayload;

    await authService.changePassword(
      user.userId,
      validatedData.currentPassword,
      validatedData.newPassword
    );

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
    });
  } catch (error) {
    AppLogger.error('Error al cambiar contraseña:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: error.errors,
      });
    }

    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al cambiar contraseña',
    });
  }
};

export const checkEmail = async (req: Request, res: Response) => {
  try {
    const validatedData = checkEmailSchema.parse(req.body);

    // Buscar usuario por email
    const user = await authService.findByEmail(validatedData.email);

    res.status(200).json({
      success: true,
      exists: !!user,
      message: user ? 'Email ya registrado' : 'Email disponible',
    });
  } catch (error) {
    AppLogger.error('Error al verificar email:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado',
      });
    }

    const result = await authService.refreshToken(token);

    res.status(200).json({
      success: true,
      data: result.user,
      token: result.token,
      message: 'Token actualizado exitosamente',
    });
  } catch (error) {
    AppLogger.error('Error al refrescar token:', error);
    res.status(401).json({
      success: false,
      message: 'Token inválido o expirado',
    });
  }
};

export const updateEmpresa = async (req: Request, res: Response) => {
  try {
    const validatedData = updateEmpresaSchema.parse(req.body);
    const user = (req as any).user as AuthPayload;

    AppLogger.info('🏢 Actualizando empresa del usuario', {
      userId: user.userId,
      currentEmpresaId: user.empresaId,
      newEmpresaId: validatedData.empresaId,
    });

    const result = await authService.updateUserEmpresa(user.userId, validatedData.empresaId);

    AppLogger.info('✅ Empresa actualizada exitosamente', {
      userId: user.userId,
      empresaId: validatedData.empresaId,
    });

    res.status(200).json(result);
  } catch (error) {
    AppLogger.error('Error al actualizar empresa:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: error.errors,
      });
    }

    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al actualizar empresa',
    });
  }
};
