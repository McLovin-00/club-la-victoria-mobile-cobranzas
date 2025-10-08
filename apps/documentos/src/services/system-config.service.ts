import { db } from '../config/database';
import { AppLogger } from '../config/logger';
import { createError } from '../middlewares/error.middleware';

/**
 * Sistema de Configuración Persistente
 * Almacena configuración sensible en base de datos
 */

interface FlowiseConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey?: string;
  flowId: string;
  timeout: number;
}

export class SystemConfigService {
  private static readonly FLOWISE_PREFIX = 'flowise.';
  
  /**
   * Obtener configuración completa de Flowise
   */
  static async getFlowiseConfig(): Promise<FlowiseConfig> {
    try {
      const configs = await db.getClient().systemConfig.findMany({
        where: {
          key: {
            startsWith: SystemConfigService.FLOWISE_PREFIX,
          },
        },
      });

      const configMap = new Map<string, string>();
      configs.forEach(config => {
        const key = config.key.replace(SystemConfigService.FLOWISE_PREFIX, '');
        configMap.set(key, config.value || '');
      });

      return {
        enabled: configMap.get('enabled') === 'true',
        baseUrl: configMap.get('baseUrl') || '',
        apiKey: configMap.get('apiKey') || '',
        flowId: configMap.get('flowId') || '',
        timeout: parseInt(configMap.get('timeout') || '30000'),
      };
    } catch (error) {
      AppLogger.error('💥 Error obteniendo configuración Flowise:', error);
      // Retornar configuración por defecto si hay error
      return {
        enabled: false,
        baseUrl: '',
        apiKey: '',
        flowId: '',
        timeout: 30000,
      };
    }
  }

  /**
   * Actualizar configuración de Flowise
   */
  static async updateFlowiseConfig(config: Partial<FlowiseConfig>): Promise<void> {
    try {
      const updates: Array<{ key: string; value: string; encrypted?: boolean }> = [];

      if (config.enabled !== undefined) {
        updates.push({
          key: `${SystemConfigService.FLOWISE_PREFIX}enabled`,
          value: config.enabled.toString(),
        });
      }

      if (config.baseUrl !== undefined) {
        updates.push({
          key: `${SystemConfigService.FLOWISE_PREFIX}baseUrl`,
          value: config.baseUrl,
        });
      }

      if (config.apiKey !== undefined) {
        updates.push({
          key: `${SystemConfigService.FLOWISE_PREFIX}apiKey`,
          value: config.apiKey,
          encrypted: true, // Marcar como sensible
        });
      }

      if (config.flowId !== undefined) {
        updates.push({
          key: `${SystemConfigService.FLOWISE_PREFIX}flowId`,
          value: config.flowId,
        });
      }

      if (config.timeout !== undefined) {
        updates.push({
          key: `${SystemConfigService.FLOWISE_PREFIX}timeout`,
          value: config.timeout.toString(),
        });
      }

      // Usar transacción para atomicidad
      await db.getClient().$transaction(async (prisma) => {
        for (const update of updates) {
          await prisma.systemConfig.upsert({
            where: { key: update.key },
            update: {
              value: update.value,
              encrypted: update.encrypted || false,
              updatedAt: new Date(),
            },
            create: {
              key: update.key,
              value: update.value,
              encrypted: update.encrypted || false,
            },
          });
        }
      });

      AppLogger.info('✅ Configuración Flowise actualizada en BD', {
        keys: updates.map(u => u.key.replace(SystemConfigService.FLOWISE_PREFIX, '')),
      });
    } catch (error) {
      AppLogger.error('💥 Error actualizando configuración Flowise:', error);
      throw createError('Error actualizando configuración', 500, 'CONFIG_UPDATE_ERROR');
    }
  }

  /**
   * Obtener una configuración específica
   */
  static async getConfig(key: string): Promise<string | null> {
    try {
      const config = await db.getClient().systemConfig.findUnique({
        where: { key },
      });
      return config?.value || null;
    } catch (error) {
      AppLogger.error(`💥 Error obteniendo configuración ${key}:`, error);
      return null;
    }
  }

  /**
   * Establecer una configuración específica
   */
  static async setConfig(key: string, value: string, encrypted = false): Promise<void> {
    try {
      await db.getClient().systemConfig.upsert({
        where: { key },
        update: {
          value,
          encrypted,
          updatedAt: new Date(),
        },
        create: {
          key,
          value,
          encrypted,
        },
      });

      AppLogger.info(`✅ Configuración ${key} actualizada`, { encrypted });
    } catch (error) {
      AppLogger.error(`💥 Error estableciendo configuración ${key}:`, error);
      throw createError('Error estableciendo configuración', 500, 'CONFIG_SET_ERROR');
    }
  }

  /**
   * Eliminar una configuración
   */
  static async deleteConfig(key: string): Promise<void> {
    try {
      await db.getClient().systemConfig.delete({
        where: { key },
      });

      AppLogger.info(`🗑️ Configuración ${key} eliminada`);
    } catch (error) {
      AppLogger.error(`💥 Error eliminando configuración ${key}:`, error);
      throw createError('Error eliminando configuración', 500, 'CONFIG_DELETE_ERROR');
    }
  }

  /**
   * Listar todas las configuraciones (sin valores sensibles)
   */
  static async listConfigs(): Promise<Array<{ key: string; hasValue: boolean; encrypted: boolean; updatedAt: Date }>> {
    try {
      const configs = await db.getClient().systemConfig.findMany({
        select: {
          key: true,
          value: true,
          encrypted: true,
          updatedAt: true,
        },
        orderBy: { key: 'asc' },
      });

      return configs.map(config => ({
        key: config.key,
        hasValue: Boolean(config.value),
        encrypted: config.encrypted,
        updatedAt: config.updatedAt,
      }));
    } catch (error) {
      AppLogger.error('💥 Error listando configuraciones:', error);
      return [];
    }
  }

  /**
   * Inicializar configuraciones por defecto
   */
  static async initializeDefaults(): Promise<void> {
    try {
      const defaultConfigs = [
        { key: `${SystemConfigService.FLOWISE_PREFIX}enabled`, value: 'false' },
        { key: `${SystemConfigService.FLOWISE_PREFIX}baseUrl`, value: '' },
        { key: `${SystemConfigService.FLOWISE_PREFIX}apiKey`, value: '', encrypted: true },
        { key: `${SystemConfigService.FLOWISE_PREFIX}flowId`, value: '' },
        { key: `${SystemConfigService.FLOWISE_PREFIX}timeout`, value: '30000' },
      ];

      await db.getClient().$transaction(async (prisma) => {
        for (const config of defaultConfigs) {
          await prisma.systemConfig.upsert({
            where: { key: config.key },
            update: {}, // No actualizar si ya existe
            create: {
              key: config.key,
              value: config.value,
              encrypted: config.encrypted || false,
            },
          });
        }
      });

      AppLogger.info('🔧 Configuraciones por defecto inicializadas');
    } catch (error) {
      AppLogger.error('💥 Error inicializando configuraciones por defecto:', error);
    }
  }
}
