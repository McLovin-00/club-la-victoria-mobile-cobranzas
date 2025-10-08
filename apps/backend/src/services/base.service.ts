import { PrismaClient } from '@prisma/client';
import { AppLogger } from '../config/logger';

/**
 * Servicio base abstracto que implementa operaciones CRUD comunes
 * Implementa el patrón Repository con Prisma
 */
export abstract class BaseService<T, CreateData, UpdateData> {
  protected prisma: PrismaClient;
  protected modelName: string;

  constructor(prisma: PrismaClient, modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
  }

  /**
   * Buscar por ID
   */
  public async findById(id: number): Promise<T | null> {
    try {
      AppLogger.logDatabaseOperation('SELECT', this.modelName);
      const result = await this.findByIdImplementation(id);
      return result;
    } catch (error) {
      AppLogger.logError(error as Error, `${this.modelName}.findById`);
      throw error;
    }
  }

  /**
   * Buscar muchos con filtros opcionales
   */
  public async findMany(filters?: any): Promise<T[]> {
    try {
      AppLogger.logDatabaseOperation('SELECT_MANY', this.modelName);
      const results = await this.findManyImplementation(filters);
      return results;
    } catch (error) {
      AppLogger.logError(error as Error, `${this.modelName}.findMany`);
      throw error;
    }
  }

  /**
   * Crear nuevo registro
   */
  public async create(data: CreateData): Promise<T> {
    try {
      AppLogger.logDatabaseOperation('INSERT', this.modelName);
      const result = await this.createImplementation(data);
      AppLogger.info(`${this.modelName} creado exitosamente`);
      return result;
    } catch (error) {
      AppLogger.logError(error as Error, `${this.modelName}.create`);
      throw error;
    }
  }

  /**
   * Actualizar registro existente
   */
  public async update(id: number, data: UpdateData): Promise<T> {
    try {
      AppLogger.logDatabaseOperation('UPDATE', this.modelName);
      const result = await this.updateImplementation(id, data);
      AppLogger.info(`${this.modelName} actualizado exitosamente`, { id });
      return result;
    } catch (error) {
      AppLogger.logError(error as Error, `${this.modelName}.update`);
      throw error;
    }
  }

  /**
   * Eliminar registro
   */
  public async delete(id: number): Promise<void> {
    try {
      AppLogger.logDatabaseOperation('DELETE', this.modelName);
      await this.deleteImplementation(id);
      AppLogger.info(`${this.modelName} eliminado exitosamente`, { id });
    } catch (error) {
      AppLogger.logError(error as Error, `${this.modelName}.delete`);
      throw error;
    }
  }

  /**
   * Contar registros
   */
  public async count(filters?: any): Promise<number> {
    try {
      AppLogger.logDatabaseOperation('COUNT', this.modelName);
      const count = await this.countImplementation(filters);
      return count;
    } catch (error) {
      AppLogger.logError(error as Error, `${this.modelName}.count`);
      throw error;
    }
  }

  // Métodos abstractos que deben implementar las clases derivadas
  protected abstract findByIdImplementation(id: number): Promise<T | null>;
  protected abstract findManyImplementation(filters?: any): Promise<T[]>;
  protected abstract createImplementation(data: CreateData): Promise<T>;
  protected abstract updateImplementation(id: number, data: UpdateData): Promise<T>;
  protected abstract deleteImplementation(id: number): Promise<void>;
  protected abstract countImplementation(filters?: any): Promise<number>;
}
