import { BaseService } from './base.service';
import { prismaService } from '../config/prisma';
import { AppLogger } from '../config/logger';

export interface CreateEmpresaData {
  nombre: string;
  descripcion?: string;
}

export interface UpdateEmpresaData {
  nombre?: string;
  descripcion?: string;
}

export interface EmpresaFilters {
  search?: string;
  limit?: number;
  offset?: number;
}

// Tipo para empresa
export type EmpresaData = {
  id: number;
  nombre: string;
  descripcion: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    platformUsers: number;
  };
};

/**
 * Servicio profesional para gestión de empresas
 * Implementa operaciones CRUD y lógica de negocio específica
 */
export class EmpresaService extends BaseService<EmpresaData, CreateEmpresaData, UpdateEmpresaData> {
  private static instance: EmpresaService;

  private constructor() {
    super(prismaService.getClient(), 'Empresa');
  }

  public static getInstance(): EmpresaService {
    if (!EmpresaService.instance) {
      EmpresaService.instance = new EmpresaService();
    }
    return EmpresaService.instance;
  }

  protected async findByIdImplementation(id: number): Promise<EmpresaData | null> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
    });
    return empresa as EmpresaData | null;
  }

  protected async findManyImplementation(filters?: EmpresaFilters): Promise<EmpresaData[]> {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { nombre: { contains: filters.search, mode: 'insensitive' } },
        { descripcion: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const empresas = await this.prisma.empresa.findMany({
      where,
      orderBy: { nombre: 'asc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
    return empresas as EmpresaData[];
  }

  protected async countImplementation(filters?: EmpresaFilters): Promise<number> {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { nombre: { contains: filters.search, mode: 'insensitive' } },
        { descripcion: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    return await this.prisma.empresa.count({ where });
  }

  protected async createImplementation(data: CreateEmpresaData): Promise<EmpresaData> {
    const empresa = await this.prisma.empresa.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion || null,
      },
    });

    AppLogger.info('Empresa creada exitosamente', {
      empresaId: empresa.id,
      nombre: empresa.nombre,
    });

    return empresa as EmpresaData;
  }

  protected async updateImplementation(id: number, data: UpdateEmpresaData): Promise<EmpresaData> {
    const empresa = await this.prisma.empresa.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
      },
    });
    return empresa as EmpresaData;
  }

  protected async deleteImplementation(id: number): Promise<void> {
    await this.prisma.empresa.delete({
      where: { id },
    });
  }

  // Método estático específico para listado simple
  public static async findAllSimple(): Promise<{ id: number; nombre: string }[]> {
    const empresas = await prismaService.getClient().empresa.findMany({
      select: {
        id: true,
        nombre: true,
      },
      orderBy: { nombre: 'asc' },
    });
    return empresas;
  }

  // Método estático para obtener todas las empresas
  public static async findAll(): Promise<EmpresaData[]> {
    const empresas = await prismaService.getClient().empresa.findMany({
      orderBy: { nombre: 'asc' },
    });
    return empresas as EmpresaData[];
  }

  /**
   * Buscar empresas con filtros
   */
  public async search(filters: EmpresaFilters): Promise<{
    data: EmpresaData[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { search, limit = 10, offset = 0 } = filters;

    const where: any = {};
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [empresas, total] = await Promise.all([
      this.prisma.empresa.findMany({
        where,
        orderBy: { nombre: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.empresa.count({ where }),
    ]);

    return {
      data: empresas as EmpresaData[],
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    };
  }

  /**
   * Verificar si existe una empresa con el nombre dado
   */
  public async existsByName(nombre: string, excludeId?: number): Promise<boolean> {
    const where: any = { nombre };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const empresa = await this.prisma.empresa.findFirst({ where });
    return !!empresa;
  }

  /**
   * Obtener estadísticas de empresas
   */
  public async getStats(): Promise<{
    total: number;
    withUsers: number;
    withoutUsers: number;
    recentlyCreated: number;
  }> {
    const total = await this.prisma.empresa.count();
    
    // Simplificado - contamos empresas creadas en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentlyCreated = await this.prisma.empresa.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    return {
      total,
      withUsers: 0, // Simplificado por ahora
      withoutUsers: total,
      recentlyCreated,
    };
  }
}
