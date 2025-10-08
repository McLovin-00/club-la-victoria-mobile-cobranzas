import { BaseService } from './base.service';
import { prismaService } from '../config/prisma';
import { AppLogger } from '../config/logger';
import bcrypt from 'bcryptjs';

import { UserRole } from '@prisma/client';

// Tipos de negocio
export interface CreateUserData {
  email: string;
  password: string;
  role?: UserRole;
  empresaId?: number | null;
  nombre?: string;
  apellido?: string;
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  role?: UserRole;
  empresaId?: number | null;
  nombre?: string;
  apellido?: string;
}

export interface UserFilters {
  role?: UserRole;
  empresaId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

// Tipos de negocio
export interface UserWithEmpresa {
  id: number;
  email: string;
  role: UserRole;
  empresaId?: number;
  nombre?: string;
  apellido?: string;
  empresa?: {
    id: number;
    nombre: string;
    descripcion?: string;
  };
}

export class UserService extends BaseService<
  UserWithEmpresa,
  CreateUserData,
  UpdateUserData
> {
  private static instance: UserService;

  private constructor() {
    // Use prismaService to ensure singleton client across app
    super(prismaService.getClient(), 'User');
  }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  // --- Implement abstract methods ---
  protected async findByIdImplementation(id: number): Promise<UserWithEmpresa | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        empresa: { select: { id: true, nombre: true, descripcion: true } },
      },
    });
    return user as UserWithEmpresa | null;
  }

  protected async findManyImplementation(filters?: UserFilters): Promise<UserWithEmpresa[]> {
    const where: any = {};
    if (filters) {
      if (filters.role) where.role = filters.role;
      if (filters.empresaId) where.empresaId = filters.empresaId;
      if (filters.search) {
        where.email = { contains: filters.search, mode: 'insensitive' };
      }
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        empresa: { select: { id: true, nombre: true, descripcion: true } },
      },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
      orderBy: { createdAt: 'desc' },
    });

    return users as UserWithEmpresa[];
  }

  protected async createImplementation(data: CreateUserData): Promise<UserWithEmpresa> {
    const hashed = await bcrypt.hash(data.password, 12);
    const created = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        password: hashed,
        role: data.role || UserRole.OPERATOR,
        empresaId: data.empresaId || null,
        nombre: data.nombre,
        apellido: data.apellido,
      },
      include: { empresa: { select: { id: true, nombre: true, descripcion: true } } },
    });
    AppLogger.info('User creado', { id: created.id, email: created.email, role: created.role });
    return created as UserWithEmpresa;
  }

  protected async updateImplementation(id: number, data: UpdateUserData): Promise<UserWithEmpresa> {
    const updateData: any = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { empresa: { select: { id: true, nombre: true, descripcion: true } } },
    });
    return updated as UserWithEmpresa;
  }

  protected async deleteImplementation(id: number): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  protected async countImplementation(filters?: UserFilters): Promise<number> {
    const where: any = {};
    if (filters) {
      if (filters.role) where.role = filters.role;
      if (filters.empresaId) where.empresaId = filters.empresaId;
    }
    return this.prisma.user.count({ where });
  }
} 