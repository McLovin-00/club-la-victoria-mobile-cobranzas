import { EndUser, $Enums } from '@prisma/client';
import { AppLogger } from '../config/logger';
import { prismaService } from '../config/prisma';

// Use the correct enum from Prisma
type IdentifierType = $Enums.IdentifierType;

interface EndUserCreateData {
  identifierType: IdentifierType;
  identifier_value: string;
  empresaId?: number;
  nombre?: string;
  apellido?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  pais?: string;
  metadata?: any;
}

interface EndUserUpdateData {
  nombre?: string;
  apellido?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  pais?: string;
  metadata?: any;
  isActive?: boolean;
}

interface EndUserProfile extends EndUser {
  empresa?: {
    id: number;
    nombre: string;
    descripcion?: string | null;
  } | null;
}

interface EndUserQueryParams {
  empresaId?: number;
  identifierType?: IdentifierType;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

interface EndUserSearchResult {
  users: EndUserProfile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class EndUserService {
  /**
   * Identifica un usuario final por tipo y valor de identificador
   */
  static async identifyUser(
    identifierType: IdentifierType,
    identifier_value: string
  ): Promise<EndUserProfile | null> {
    try {
      AppLogger.debug('🔍 Identificando usuario final', {
        identifierType,
        identifier_value: this.sanitizeIdentifierForLog(identifier_value),
      });

      const prisma = prismaService.getClient();
      const endUser = await prisma.endUser.findUnique({
        where: {
          identifierType_identifier_value: {
            identifierType,
            identifier_value: identifier_value.trim(),
          },
        },
        include: {
          empresa: {
            select: {
              id: true,
              nombre: true,
              descripcion: true,
            },
          },
        },
      });

      if (endUser) {
        // Actualizar último acceso
        await this.updateLastAccess(endUser.id);
        
        AppLogger.info('✅ Usuario final identificado exitosamente', {
          userId: endUser.id,
          identifierType,
          empresaId: endUser.empresaId,
        });
      } else {
        AppLogger.debug('❌ Usuario final no encontrado', {
          identifierType,
          identifier_value: this.sanitizeIdentifierForLog(identifier_value),
        });
      }

      return endUser as EndUserProfile | null;
    } catch (error) {
      AppLogger.error('💥 Error identificando usuario final:', error);
      return null;
    }
  }

  /**
   * Crea un nuevo usuario final
   */
  static async createEndUser(data: EndUserCreateData | any): Promise<EndUserProfile> {
    try {
      AppLogger.info('📝 Creando nuevo usuario final', {
        identifierType: data.identifierType,
        identifier_value: this.sanitizeIdentifierForLog(data.identifier_value || data.identifierValue),
        empresaId: data.empresaId,
      });

      // Verificar si ya existe
      const existingUser = await this.identifyUser(data.identifierType, (data.identifier_value || data.identifierValue));
      if (existingUser) {
        throw new Error('Usuario final ya existe con este identificador');
      }

      const prisma = prismaService.getClient();
      const endUser = await prisma.endUser.create({
        data: {
          email: data.identifier_value || data.identifierValue, // compat
          identifierType: data.identifierType,
          identifier_value: (data.identifier_value || data.identifierValue).trim(),
          empresaId: data.empresaId,
          nombre: data.nombre,
          apellido: data.apellido,
          direccion: data.direccion,
          localidad: data.localidad,
          provincia: data.provincia,
          pais: data.pais,
          metadata: data.metadata,
          last_access: new Date(),
        },
        include: {
          empresa: {
            select: {
              id: true,
              nombre: true,
              descripcion: true,
            },
          },
        },
      });

      AppLogger.info('✅ Usuario final creado exitosamente', {
        userId: endUser.id,
        identifierType: endUser.identifierType,
        empresaId: endUser.empresaId,
      });

      return endUser as EndUserProfile;
    } catch (error) {
      AppLogger.error('💥 Error creando usuario final:', error);
      throw error;
    }
  }

  /**
   * Obtiene o crea un usuario final (find or create pattern)
   */
  static async getOrCreateEndUser(data: EndUserCreateData): Promise<EndUserProfile> {
    try {
      // Intentar identificar usuario existente
      const existingUser = await this.identifyUser(data.identifierType, data.identifier_value);
      
      if (existingUser) {
        // Si está inactivo, reactivarlo
        if (!existingUser.is_active) {
          return await this.updateEndUser(existingUser.id, { isActive: true });
        }
        return existingUser;
      }

      // Crear nuevo usuario si no existe
      return await this.createEndUser(data);
    } catch (error) {
      AppLogger.error('💥 Error en getOrCreateEndUser:', error);
      throw error;
    }
  }

  /**
   * Actualiza un usuario final
   */
  static async updateEndUser(userId: number, data: EndUserUpdateData): Promise<EndUserProfile> {
    try {
      AppLogger.info('🔄 Actualizando usuario final', { userId });

      const prisma = prismaService.getClient();
      // Mapear y filtrar únicamente campos permitidos, adaptando snake_case cuando corresponda
      const prismaUpdateData: any = { updatedAt: new Date() };

      if (typeof (data as any).nombre !== 'undefined') prismaUpdateData.nombre = (data as any).nombre;
      if (typeof (data as any).apellido !== 'undefined') prismaUpdateData.apellido = (data as any).apellido;
      if (typeof (data as any).direccion !== 'undefined') prismaUpdateData.direccion = (data as any).direccion;
      if (typeof (data as any).localidad !== 'undefined') prismaUpdateData.localidad = (data as any).localidad;
      if (typeof (data as any).provincia !== 'undefined') prismaUpdateData.provincia = (data as any).provincia;
      if (typeof (data as any).pais !== 'undefined') prismaUpdateData.pais = (data as any).pais;
      if (typeof (data as any).metadata !== 'undefined') prismaUpdateData.metadata = (data as any).metadata;
      if (typeof (data as any).empresaId !== 'undefined') prismaUpdateData.empresaId = (data as any).empresaId;
      if (typeof (data as any).isActive !== 'undefined') prismaUpdateData.is_active = Boolean((data as any).isActive);

      const endUser = await prisma.endUser.update({
        where: { id: userId },
        data: prismaUpdateData,
        include: {
          empresa: {
            select: {
              id: true,
              nombre: true,
              descripcion: true,
            },
          },
        },
      });

      return endUser as EndUserProfile;
    } catch (error) {
      AppLogger.error('💥 Error actualizando usuario final:', error);
      throw error;
    }
  }

  /**
   * Busca usuarios finales con filtros y paginación
   */
  static async searchEndUsers(params: EndUserQueryParams): Promise<EndUserSearchResult> {
    try {
      const {
        empresaId,
        identifierType,
        isActive = true,
        search,
        page = 1,
        limit = 50,
      } = params;

      const where: any = {};

      if (empresaId) {
        where.empresaId = empresaId;
      }

      if (identifierType) {
        where.identifierType = identifierType;
      }

      if (isActive !== undefined) {
        where.is_active = isActive;
      }

      if (search) {
        where.OR = [
          { nombre: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { identifier_value: { contains: search, mode: 'insensitive' } },
        ];
      }

      const offset = (page - 1) * limit;

      const prisma = prismaService.getClient();
      const [users, total] = await Promise.all([
        prisma.endUser.findMany({
          where,
          include: {
            empresa: {
              select: {
                id: true,
                nombre: true,
                descripcion: true,
              },
            },
          },
          take: limit,
          skip: offset,
          orderBy: { last_access: 'desc' },
        }),
        prisma.endUser.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        users: users as EndUserProfile[],
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      AppLogger.error('💥 Error buscando usuarios finales:', error);
      throw error;
    }
  }

  /**
   * Desactiva un usuario final
   */
  static async deactivateEndUser(userId: number): Promise<void> {
    try {
      await this.updateEndUser(userId, { isActive: false });
      AppLogger.info('✅ Usuario final desactivado', { userId });
    } catch (error) {
      AppLogger.error('💥 Error desactivando usuario final:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de usuarios finales por empresa
   */
  static async getEndUserStats(empresaId?: number): Promise<any> {
    try {
      const where: any = {};
      if (empresaId) {
        where.empresaId = empresaId;
      }

      const prisma = prismaService.getClient();
      const [
        totalActive,
        totalInactive,
        byIdentifierType,
      ] = await Promise.all([
        prisma.endUser.count({ where: { ...where, isActive: true } }),
        prisma.endUser.count({ where: { ...where, isActive: false } }),
        prisma.endUser.groupBy({
          where,
          by: ['identifierType'],
          _count: { id: true },
        }),
      ]);

      const identifierTypeStats = byIdentifierType.reduce((acc: any, item: any) => {
        acc[item.identifierType] = item._count.id;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalActive,
        totalInactive,
        total: totalActive + totalInactive,
        byIdentifierType: identifierTypeStats,
      };
    } catch (error) {
      AppLogger.error('💥 Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  /**
   * Actualiza la fecha de último acceso
   */
  static async updateLastAccess(userId: number): Promise<void> {
    try {
      const prisma = prismaService.getClient();
      await prisma.endUser.update({
        where: { id: userId },
        data: { last_access: new Date() },
      });
    } catch (error) {
      AppLogger.warn('⚠️ Error actualizando último acceso:', error);
    }
  }

  /**
   * Sanitiza identificadores para logs (oculta información sensible)
   */
  private static sanitizeIdentifierForLog(identifier: string): string {
    if (identifier.includes('@')) {
      const [local, domain] = identifier.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    }
    return identifier.substring(0, 3) + '***';
  }
} 