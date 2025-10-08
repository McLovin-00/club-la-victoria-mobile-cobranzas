import { BaseService } from './base.service';
import { prisma } from '../config/prisma';
import { AppLogger } from '../config/logger';
import { InstanceEstado } from '@prisma/client';

// Types para el servicio de instancias
export interface CreateInstanceData {
  nombre: string;
  serviceId: number;
  empresaId: number;
  estado?: InstanceEstado;
  configuracion?: any;
  requierePermisos?: boolean;
}

export interface UpdateInstanceData {
  nombre?: string;
  serviceId?: number;
  estado?: InstanceEstado;
  configuracion?: any;
}

export interface InstanceFilters {
  search?: string;
  serviceId?: number;
  empresaId?: number;
  estado?: InstanceEstado;
  limit?: number;
  offset?: number;
}

// Tipo para instancia
export interface InstanceData {
  id: number;
  nombre: string;
  serviceId: number;
  empresaId: number;
  estado: InstanceEstado;
  requierePermisos: boolean;
  configuracion?: any; // Convertido a opcional
  createdAt: Date;
  updatedAt: Date;
  service?: {
    id: number;
    nombre: string;
    descripcion: string | null;
    version: string | null;
    estado: string;
  };
  empresa?: {
    id: number;
    nombre: string;
    descripcion: string | null;
  };
  canales?: any[];
  permisos?: any[];
  auditLogs?: any[];
}

/**
 * Servicio profesional para gestión de instancias
 * Implementa operaciones CRUD y lógica de negocio específica con validaciones de empresa
 */
export class InstanceService extends BaseService<InstanceData, CreateInstanceData, UpdateInstanceData> {
  private static instance: InstanceService;

  private constructor() {
    super(prisma, 'Instance');
  }

  public static getInstance(): InstanceService {
    if (!InstanceService.instance) {
      InstanceService.instance = new InstanceService();
    }
    return InstanceService.instance;
  }

  // Implementaciones de métodos abstractos
  protected async findByIdImplementation(id: number): Promise<InstanceData | null> {
    const instance = await this.prisma.instance.findUnique({
      where: { id },
      include: {
        service: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            version: true,
            estado: true,
          },
        },
        empresa: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
          },
        },
      },
    });
    return instance as InstanceData | null;
  }

  protected async findManyImplementation(filters?: InstanceFilters): Promise<InstanceData[]> {
    const where: any = {};

    AppLogger.debug('InstanceService.findMany - Filtros recibidos', { filters });

    if (filters) {
      if (filters.search) {
        where.OR = [
          {
            nombre: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
          {
            service: {
              nombre: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          },
        ];
      }

      if (filters.serviceId) {
        where.serviceId = filters.serviceId;
      }

      if (filters.empresaId) {
        where.empresaId = filters.empresaId;
      }

      if (filters.estado) {
        where.estado = filters.estado;
      }
    }

    AppLogger.debug('InstanceService.findMany - Condiciones WHERE', { where });

    const instances = await this.prisma.instance.findMany({
      where,
      include: {
        service: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            version: true,
            estado: true,
          },
        },
        empresa: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
          },
        },
      },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return instances as InstanceData[];
  }

  protected async createImplementation(data: CreateInstanceData): Promise<InstanceData> {
    // Validar que el servicio existe y está activo
    const service = await this.prisma.service.findUnique({
      where: { id: data.serviceId },
    });

    if (!service) {
      throw new Error('El servicio especificado no existe');
    }

    if (service.estado !== 'activo') {
      throw new Error('No se puede crear una instancia de un servicio que no está activo');
    }

    // Validar que la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: data.empresaId },
    });

    if (!empresa) {
      throw new Error('La empresa especificada no existe');
    }

    // Verificar que no exista una instancia con el mismo nombre en la empresa
    const existingInstance = await this.prisma.instance.findFirst({
      where: {
        nombre: data.nombre,
        empresaId: data.empresaId,
      },
    });

    if (existingInstance) {
      throw new Error('Ya existe una instancia con este nombre en la empresa');
    }

    const instance = await this.prisma.instance.create({
      data: {
        nombre: data.nombre,
        service: { connect: { id: data.serviceId } },
        empresa: { connect: { id: data.empresaId } },
        estado: data.estado || InstanceEstado.activa,
        requierePermisos: data.requierePermisos ?? true,
      },
      include: {
        service: true,
        empresa: true,
      },
    });

    AppLogger.info('Instancia creada exitosamente', {
      instanceId: instance.id,
      nombre: instance.nombre,
      serviceId: instance.serviceId,
      empresaId: instance.empresaId,
    });

    return instance as InstanceData;
  }

  protected async updateImplementation(id: number, data: UpdateInstanceData): Promise<InstanceData> {
    // Obtener la instancia actual
    const currentInstance = await this.prisma.instance.findUnique({
      where: { id },
    });

    if (!currentInstance) {
      throw new Error('La instancia no existe');
    }

    const updateData: any = {};

    if (data.nombre) {
      // Verificar que no exista otra instancia con el mismo nombre en la empresa
      const existingInstance = await this.prisma.instance.findFirst({
        where: {
          nombre: data.nombre,
          empresaId: currentInstance.empresaId,
          id: { not: id },
        },
      });

      if (existingInstance) {
        throw new Error('Ya existe una instancia con este nombre en la empresa');
      }

      updateData.nombre = data.nombre;
    }

    if (data.serviceId) {
      // Validar que el servicio existe y está activo
      const service = await this.prisma.service.findUnique({
        where: { id: data.serviceId },
      });

      if (!service) {
        throw new Error('El servicio especificado no existe');
      }

      if (service.estado !== 'activo') {
        throw new Error('No se puede asignar un servicio que no está activo');
      }

      updateData.serviceId = data.serviceId;
    }

    if (data.estado) {
      updateData.estado = data.estado;
    }

    if (data.configuracion !== undefined) {
      updateData.configuracion = data.configuracion;
    }

    const instance = await this.prisma.instance.update({
      where: { id },
      data: updateData,
      include: {
        service: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            version: true,
            estado: true,
          },
        },
        empresa: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
          },
        },
      },
    });

    AppLogger.info('Instancia actualizada exitosamente', {
      instanceId: instance.id,
      nombre: instance.nombre,
    });

    return instance as InstanceData;
  }

  protected async deleteImplementation(id: number): Promise<void> {
    // Verificar que la instancia existe
    const instance = await this.prisma.instance.findUnique({
      where: { id },
    });

    if (!instance) {
      throw new Error('La instancia no existe');
    }

    await this.prisma.instance.delete({
      where: { id },
    });

    AppLogger.info('Instancia eliminada exitosamente', { instanceId: id });
  }

  protected async countImplementation(filters?: InstanceFilters): Promise<number> {
    const where: any = {};

    if (filters) {
      if (filters.search) {
        where.OR = [
          {
            nombre: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
          {
            service: {
              nombre: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          },
        ];
      }

      if (filters.serviceId) {
        where.serviceId = filters.serviceId;
      }

      if (filters.empresaId) {
        where.empresaId = filters.empresaId;
      }

      if (filters.estado) {
        where.estado = filters.estado;
      }
    }

    return await this.prisma.instance.count({ where });
  }

  // Métodos específicos del dominio de instancia

  /**
   * Obtener instancias filtradas por empresa (para permisos)
   */
  public async findManyByEmpresa(empresaId: number, filters?: Omit<InstanceFilters, 'empresaId'>): Promise<InstanceData[]> {
    const fullFilters = { ...filters, empresaId };
    return this.findMany(fullFilters);
  }

  /**
   * Obtener instancias por servicio
   */
  public async findByService(serviceId: number): Promise<InstanceData[]> {
    try {
      const instances = await this.prisma.instance.findMany({
        where: { serviceId },
        include: {
          service: {
            select: {
              id: true,
              nombre: true,
              descripcion: true,
              version: true,
              estado: true,
            },
          },
          empresa: {
            select: {
              id: true,
              nombre: true,
              descripcion: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return instances as InstanceData[];
    } catch (error) {
      AppLogger.logError(error as Error, `${this.modelName}.findByService`);
      throw error;
    }
  }

  /**
   * Obtener instancias por estado
   */
  public async findByEstado(estado: InstanceEstado, empresaId?: number): Promise<InstanceData[]> {
    try {
      const where: any = { estado };
      if (empresaId) {
        where.empresaId = empresaId;
      }

      const instances = await this.prisma.instance.findMany({
        where,
        include: {
          service: {
            select: {
              id: true,
              nombre: true,
              descripcion: true,
              version: true,
              estado: true,
            },
          },
          empresa: {
            select: {
              id: true,
              nombre: true,
              descripcion: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return instances as InstanceData[];
    } catch (error) {
      AppLogger.logError(error as Error, `${this.modelName}.findByEstado`);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de instancias
   */
  public async getStats(empresaId?: number): Promise<{
    total: number;
    activas: number;
    inactivas: number;
    error: number;
    byService: Array<{ serviceId: number; serviceName: string; count: number }>;
  }> {
    try {
      const where: any = {};
      if (empresaId) {
        where.empresaId = empresaId;
      }

      const [total, instances] = await Promise.all([
        this.count({ empresaId }),
        this.prisma.instance.findMany({
          where,
          include: {
            service: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        }),
      ]);

      const activas = instances.filter(i => i.estado === 'activa').length;
      const inactivas = instances.filter(i => i.estado === 'inactiva').length;
      const error = instances.filter(i => i.estado === 'error').length;

      // Agrupar por servicio
      const serviceGroups = instances.reduce((acc, instance) => {
        const serviceId = instance.serviceId;
        if (!acc[serviceId]) {
          acc[serviceId] = {
            serviceId,
            serviceName: instance.service.nombre,
            count: 0,
          };
        }
        acc[serviceId].count++;
        return acc;
      }, {} as Record<number, { serviceId: number; serviceName: string; count: number }>);

      const byService = Object.values(serviceGroups);

      return {
        total,
        activas,
        inactivas,
        error,
        byService,
      };
    } catch (error) {
      AppLogger.logError(error as Error, 'InstanceService.getStats');
      throw error;
    }
  }

  /**
   * Cambiar estado de una instancia
   */
  public async changeEstado(id: number, estado: InstanceEstado): Promise<InstanceData> {
    try {
      AppLogger.info('Cambiando estado de la instancia', { instanceId: id, nuevoEstado: estado });

      const instance = await this.update(id, { estado });

      AppLogger.info('Estado de la instancia cambiado exitosamente', {
        instanceId: id,
        nuevoEstado: estado,
      });

      return instance;
    } catch (error) {
      AppLogger.logError(error as Error, `${this.modelName}.changeEstado`);
      throw error;
    }
  }

  /**
   * Validar permisos de acceso a instancia por empresa
   */
  public async validateEmpresaAccess(instanceId: number, empresaId: number): Promise<boolean> {
    try {
      const instance = await this.prisma.instance.findUnique({
        where: { id: instanceId },
        select: { empresaId: true },
      });

      return instance?.empresaId === empresaId;
    } catch (error) {
      AppLogger.logError(error as Error, `${this.modelName}.validateEmpresaAccess`);
      return false;
    }
  }
}

// Instancia singleton
export const instanceService = InstanceService.getInstance();
export default instanceService; 