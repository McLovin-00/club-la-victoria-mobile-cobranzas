import { Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { AppLogger } from '../config/logger';
import { AuthRequest } from '../middlewares/platformAuth.middleware';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
let CACHED_PRIVATE_KEY: string | null = null;
const getPrivateKey = (): string => {
  if (!CACHED_PRIVATE_KEY) {
    let raw = process.env.JWT_PRIVATE_KEY;
    if (!raw && process.env.JWT_PRIVATE_KEY_PATH) {
      try {
        const fs = require('fs');
        raw = fs.readFileSync(process.env.JWT_PRIVATE_KEY_PATH, 'utf8');
      } catch (_e) {}
    }
    if (!raw) throw new Error('JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_PATH is required');
    CACHED_PRIVATE_KEY = raw.includes('-----BEGIN') ? raw : raw.replace(/\n/g, '\n');
  }
  return CACHED_PRIVATE_KEY;
};

export class PlatformUserController {
  /**
   * Obtener lista de usuarios de plataforma con filtros y paginación
   * GET /api/usuarios
   */
  static async getUsuarios(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Parámetros de consulta inválidos',
          errors: errors.array(),
        });
        return;
      }

      const user = req.user!;
      const { 
        page = '1', 
        limit = '10', 
        search = '', 
        role,
        empresaId 
      } = req.query;

      AppLogger.info('📋 Obteniendo usuarios de plataforma', {
        userId: user.userId,
        userRole: user.role,
        page,
        limit,
        search,
        role,
        empresaId,
      });

      // Construir filtros de consulta
      const where: any = {};

      // Filtro de búsqueda por texto
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = search.trim();
        where.OR = [
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { nombre: { contains: searchTerm, mode: 'insensitive' } },
          { apellido: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }

      // Filtro por rol
      if (role && typeof role === 'string') {
        where.role = role.toUpperCase();
      }

      // Filtro por empresa
      if (empresaId && typeof empresaId === 'string') {
        const empresaIdNum = parseInt(empresaId);
        if (!isNaN(empresaIdNum)) {
          where.empresaId = empresaIdNum;
        }
      }

      // Aplicar restricciones según el rol del usuario actual
      if (user.role === 'ADMIN') {
        // Los administradores solo pueden ver usuarios de su empresa
        // y no pueden ver otros superadministradores
        where.empresaId = user.empresaId;
        where.role = { not: 'SUPERADMIN' };
        
        AppLogger.debug('🔒 Aplicando restricciones de admin', {
          adminEmpresaId: user.empresaId,
          excludingSuperadmins: true,
        });
      } else if (user.role === 'SUPERADMIN') {
        // Si es superadmin y viene tenant seleccionado, filtrar por esa empresa
        if (req.tenantId && Number.isInteger(req.tenantId)) {
          where.empresaId = req.tenantId;
          AppLogger.debug('🏢 Filtro por tenant aplicado (superadmin)', { tenantId: req.tenantId });
        }
      }

      // Configurar paginación
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(parseInt(limit as string) || 10, 100); // Máximo 100
      const skip = (pageNum - 1) * limitNum;

      AppLogger.debug('📊 Parámetros de consulta procesados', {
        where,
        pageNum,
        limitNum,
        skip,
      });

      // Ejecutar consultas en paralelo para mejor rendimiento
      const [usuarios, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limitNum,
          select: {
            id: true,
            email: true,
            role: true,
            nombre: true,
            apellido: true,
            empresaId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [ { createdAt: 'desc' }, { email: 'asc' } ],
        }),
        prisma.user.count({ where }),
      ]);

      AppLogger.info('✅ Usuarios de plataforma obtenidos exitosamente', {
        totalFound: total,
        currentPage: pageNum,
        usersInPage: usuarios.length,
        userId: user.userId,
      });

      const totalPages = Math.ceil(total / limitNum);

      const usersData = usuarios.map((u: any) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        nombre: u.nombre,
        apellido: u.apellido,
        empresaId: u.empresaId,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }));

      res.status(200).json({
        success: true,
        data: usersData,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      });

    } catch (_error) {
      AppLogger.error('💥 Error obteniendo usuarios de plataforma:', {
        error: _error instanceof Error ? _error.message : 'Error desconocido',
        stack: _error instanceof Error ? _error.stack : undefined,
        userId: req.user?.userId,
      });
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener usuarios',
      });
    }
  }

  /**
   * Obtener un usuario específico por ID
   * GET /api/usuarios/:id
   */
  static async getUsuarioById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'ID de usuario inválido',
          errors: errors.array(),
        });
        return;
      }

      const user = req.user!;
      const userId = parseInt(req.params.id);

      AppLogger.info('👤 Obteniendo usuario específico', {
        requestedUserId: userId,
        requestingUserId: user.userId,
        requestingUserRole: user.role,
      });

      // Construir filtros según permisos
      const where: any = { id: userId };

      if (user.role === 'ADMIN') {
        // Los administradores solo pueden ver usuarios de su empresa
        where.empresaId = user.empresaId;
        where.role = { not: 'SUPERADMIN' };
      } else if (user.role === 'SUPERADMIN' && req.tenantId && Number.isInteger(req.tenantId)) {
        // Superadmin con tenant fijado limita la búsqueda a esa empresa
        where.empresaId = req.tenantId;
      }

      const usuario = await prisma.user.findFirst({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          nombre: true,
          apellido: true,
          empresaId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!usuario) {
        AppLogger.warn('⚠️ Usuario no encontrado o sin permisos', {
          requestedUserId: userId,
          requestingUserId: user.userId,
        });
        
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        });
        return;
      }

      AppLogger.info('✅ Usuario específico obtenido exitosamente', {
        foundUserId: usuario.id,
        foundUserEmail: usuario.email,
        requestingUserId: user.userId,
      });

      res.status(200).json({
        success: true,
        data: usuario,
      });

    } catch (_error) {
      AppLogger.error('💥 Error obteniendo usuario específico:', {
        error: _error instanceof Error ? _error.message : 'Error desconocido',
        stack: _error instanceof Error ? _error.stack : undefined,
        requestedUserId: req.params.id,
        requestingUserId: req.user?.userId,
      });
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener usuario',
      });
    }
  }

  /**
   * Actualizar empresa del usuario actual (solo para superadmin)
   * POST /api/usuarios/update-empresa
   */
  static async updateEmpresa(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array(),
        });
        return;
      }

      const user = req.user!;
      const { empresaId } = req.body;

      AppLogger.info('🏢 Actualizando empresa del usuario', {
        userId: user.userId,
        currentEmpresaId: user.empresaId,
        newEmpresaId: empresaId,
      });

      // Validar que la empresa existe si se proporciona
      if (empresaId !== null) {
        const empresa = await prisma.empresa.findUnique({
          where: { id: empresaId },
          select: { id: true, nombre: true },
        });

        if (!empresa) {
          AppLogger.warn('⚠️ Empresa no encontrada', {
            empresaId,
            userId: user.userId,
          });
          
          res.status(404).json({
            success: false,
            message: 'Empresa no encontrada',
          });
          return;
        }
      }

      // Actualizar usuario en la base de datos
      const updatedUser = await prisma.user.update({
        where: { id: user.userId },
        data: { empresaId: empresaId || null },
      });

      // Obtener empresa si existe
      let empresa = null;
      if (updatedUser.empresaId) {
        empresa = await prisma.empresa.findUnique({
          where: { id: updatedUser.empresaId },
          select: {
            id: true,
            nombre: true,
            descripcion: true,
          },
        });
      }

      // Generar nuevo token con la empresa actualizada
      const tokenPayload = {
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        empresaId: updatedUser.empresaId,
      };

      const newToken = jwt.sign(tokenPayload as any, getPrivateKey(), { algorithm: 'RS256', expiresIn: JWT_EXPIRES_IN as any });

      AppLogger.info('✅ Empresa actualizada exitosamente', {
        userId: user.userId,
        oldEmpresaId: user.empresaId,
        newEmpresaId: updatedUser.empresaId,
      });

      res.status(200).json({
        success: true,
        message: 'Empresa actualizada exitosamente',
        token: newToken,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          empresaId: updatedUser.empresaId,
          empresa: empresa,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (_error) {
      AppLogger.error('💥 Error actualizando empresa del usuario:', {
        error: _error instanceof Error ? _error.message : 'Error desconocido',
        stack: _error instanceof Error ? _error.stack : undefined,
        userId: req.user?.userId,
        requestedEmpresaId: req.body?.empresaId,
      });
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al actualizar empresa',
      });
    }
  }
} 