import { BaseService } from './base.service';
import { prisma } from '../config/prisma';
import { AppLogger } from '../config/logger';
import { ServiceEstado } from '@prisma/client';

// Types para el servicio de servicios
export interface CreateServiceData {
  nombre: string;
  descripcion?: string;
  version?: string;
  estado?: ServiceEstado;
}

export interface UpdateServiceData {
  nombre?: string;
  descripcion?: string;
  version?: string;
  estado?: ServiceEstado;
}

export interface ServiceFilters {
  search?: string;
  estado?: ServiceEstado;
  limit?: number;
  offset?: number;
}

// Tipo para servicio
export type ServiceData = {
  id: number;
  nombre: string;
  descripcion: string | null;
  version: string | null;
  estado: ServiceEstado;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    instances: number;
  };
};

/**
 * Servicio profesional para gestión de servicios
 * Implementa operaciones CRUD y lógica de negocio específica
 */
export class ServiceService extends BaseService<ServiceData, CreateServiceData, UpdateServiceData> {
  private static instance: ServiceService;

  private constructor() {
    super(prisma, 'Service');
  }

  public static getInstance(): ServiceService {
    if (!ServiceService.instance) {
      ServiceService.instance = new ServiceService();
    }
    return ServiceService.instance;
  }

  // Implementaciones de métodos abstractos
  protected async findByIdImplementation(id: number): Promise<ServiceData | null> {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            instances: true,
          },
        },
      },
    });
    return service as ServiceData | null;
  }

  protected async findManyImplementation(filters?: ServiceFilters): Promise<ServiceData[]> {
    const where: any = {};

    AppLogger.debug('ServiceService.findMany - Filtros recibidos', { filters });

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
            descripcion: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        ];
      }

      if (filters.estado) {
        where.estado = filters.estado;
      }
    }

    AppLogger.debug('ServiceService.findMany - Condiciones WHERE', { where });

    const services = await this.prisma.service.findMany({
      where,
      include: {
        _count: {
          select: {
            instances: true,
          },
        },
      },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
      orderBy: {
        nombre: 'asc',
      },
    });

    return services as ServiceData[];
  }

  protected async createImplementation(data: CreateServiceData): Promise<ServiceData> {
    const service = await this.prisma.service.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        version: data.version || null,
        estado: data.estado || 'activo',
      },
      include: {
        _count: {
          select: {
            instances: true,
          },
        },
      },
    });

    AppLogger.info('Servicio creado exitosamente', {
      serviceId: service.id,
      nombre: service.nombre,
    });

    return service as ServiceData;
  }

  protected async updateImplementation(id: number, data: UpdateServiceData): Promise<ServiceData> {
    const updateData: any = {};

    if (data.nombre) updateData.nombre = data.nombre;
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion || null;
    if (data.version !== undefined) updateData.version = data.version || null;
    if (data.estado) updateData.estado = data.estado;

    const service = await this.prisma.service.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            instances: true,
          },
        },
      },
    });

    AppLogger.info('Servicio actualizado exitosamente', {
      serviceId: service.id,
      nombre: service.nombre,
    });

    return service as ServiceData;
  }

  protected async deleteImplementation(id: number): Promise<void> {
    // Verificar si el servicio tiene instancias asociadas
    const instanceCount = await this.prisma.instance.count({
      where: { serviceId: id },
    });

    if (instanceCount > 0) {
      throw new Error(
        `No se puede eliminar el servicio porque tiene ${instanceCount} instancias asociadas`
      );
    }

    await this.prisma.service.delete({
      where: { id },
    });

    AppLogger.info('Servicio eliminado exitosamente', { serviceId: id });
  }

  protected async countImplementation(filters?: ServiceFilters): Promise<number> {
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
            descripcion: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        ];
      }

      if (filters.estado) {
        where.estado = filters.estado;
      }
    }

    return await this.prisma.service.count({ where });
  }

  // Métodos específicos del dominio de servicio

  /**
   * Buscar servicio por nombre
   */
  public async findByNombre(nombre: string): Promise<ServiceData | null> {
    try {
      AppLogger.logDatabaseOperation('SELECT_BY_NOMBRE', this.modelName);

      const service = await this.prisma.service.findUnique({
        where: { nombre },
        include: {
          _count: {
            select: {
              instances: true,
            },
          },
        },
      });

      return service as ServiceData | null;
    } catch (error) {
      AppLogger.logError(error as Error, `${this.modelName}.findByNombre`);
      throw error;
    }
  }

  /**
   * Obtener servicios simples (solo id y nombre) para selectors
   */
  public async findAllSimple(): Promise<Array<{ id: number; nombre: string }>> {
    try {
      const services = await this.prisma.service.findMany({
        select: {
          id: true,
          nombre: true,
        },
        where: {
          estado: 'activo', // Solo servicios activos para selectors
        },
        orderBy: {
          nombre: 'asc',
        },
      });

      return services;
    } catch (error) {
      AppLogger.logError(error as Error, 'ServiceService.findAllSimple');
      throw error;
    }
  }

  /**
   * Obtener servicios por estado
   */
  public async findByEstado(estado: ServiceEstado): Promise<ServiceData[]> {
    try {
      const services = await this.prisma.service.findMany({
        where: { estado },
        include: {
          _count: {
            select: {
              instances: true,
            },
          },
        },
        orderBy: {
          nombre: 'asc',
        },
      });

      return services as ServiceData[];
    } catch (error) {
      AppLogger.logError(error as Error, `${this.modelName}.findByEstado`);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de servicios
   */
  public async getStats(): Promise<{
    total: number;
    activos: number;
    inactivos: number;
    mantenimiento: number;
    withInstances: number;
    withoutInstances: number;
    averageInstancesPerService: number;
  }> {
    try {
      const [total, servicesWithInstances] = await Promise.all([
        this.count(),
        this.prisma.service.findMany({
          include: {
            _count: {
              select: {
                instances: true,
              },
            },
          },
        }),
      ]);

      const activos = servicesWithInstances.filter(s => s.estado === 'activo').length;
      const inactivos = servicesWithInstances.filter(s => s.estado === 'inactivo').length;
      const mantenimiento = servicesWithInstances.filter(s => s.estado === 'mantenimiento').length;
      const withInstances = servicesWithInstances.filter(s => s._count.instances > 0).length;
      const withoutInstances = total - withInstances;
      const totalInstances = servicesWithInstances.reduce((sum, s) => sum + s._count.instances, 0);
      const averageInstancesPerService = total > 0 ? totalInstances / total : 0;

      return {
        total,
        activos,
        inactivos,
        mantenimiento,
        withInstances,
        withoutInstances,
        averageInstancesPerService: Math.round(averageInstancesPerService * 100) / 100,
      };
    } catch (error) {
      AppLogger.logError(error as Error, 'ServiceService.getStats');
      throw error;
    }
  }

  /**
   * Cambiar estado de un servicio
   */
  public async changeEstado(id: number, estado: ServiceEstado): Promise<ServiceData> {
    try {
      AppLogger.info('Cambiando estado del servicio', { serviceId: id, nuevoEstado: estado });

      const service = await this.update(id, { estado });

      AppLogger.info('Estado del servicio cambiado exitosamente', {
        serviceId: id,
        nuevoEstado: estado,
      });

      return service;
    } catch (error) {
      AppLogger.logError(error as Error, `${this.modelName}.changeEstado`);
      throw error;
    }
  }
}

// Instancia singleton
export const serviceService = ServiceService.getInstance();
export default serviceService; 