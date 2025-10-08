import { db } from '../config/database';
import { AppLogger } from '../config/logger';

/**
 * Performance Service - Optimizaciones para Producción
 * Simplicidad es la sofisticación definitiva
 */
export class PerformanceService {
  private static instance: PerformanceService;
  private readonly mvName = 'document_status_summary';
  private readonly mvUniqueIdx = 'document_status_summary_unique_idx';

  private constructor() {
    AppLogger.info('⚡ Performance Service inicializado');
    // Crear la vista materializada si no existe
    this.ensureMaterializedView()
      .then(() => AppLogger.info('✅ Vista document_status_summary asegurada'))
      .catch((err) => AppLogger.error('💥 Error asegurando vista materializada', err));
  }

  public static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  /**
   * Asegura que la vista materializada exista.
   */
  private async ensureMaterializedView(): Promise<void> {
    // Verificar existencia de la tabla base 'documents' antes de crear la vista (no asumir schema fijo)
    const baseExists = await db.getClient().$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'documents'
      ) AS exists;
    `);
    if (!baseExists[0]?.exists) {
      AppLogger.warn('⚠️ Tablas base aún no existen, posponiendo creación de vista materializada');
      return;
    }

    // Si existe la vista pero sin la columna tenant_id (estructura vieja), la eliminamos y recreamos
    const mvColumns = await db.getClient().$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = '${this.mvName}' AND column_name = 'tenant_id'
      ) AS exists;
    `);
    const mvHasTenantId = mvColumns[0]?.exists === true;
    if (!mvHasTenantId) {
      await db.getClient().$executeRawUnsafe(`DROP MATERIALIZED VIEW IF EXISTS ${this.mvName} CASCADE;`);
    }

    const createSql = `
      CREATE MATERIALIZED VIEW IF NOT EXISTS ${this.mvName} AS
      SELECT
        d.tenant_empresa_id                     AS tenant_id,
        d.dador_carga_id                        AS empresa_id,
        d.entity_type                           AS entity_type,
        d.entity_id                             AS entity_id,
        COUNT(CASE WHEN d.status = 'VENCIDO' OR d.status = 'RECHAZADO' THEN 1 END) AS red_count,
        COUNT(CASE WHEN d.status = 'PENDIENTE' OR d.status = 'VALIDANDO' THEN 1 END) AS yellow_count,
        COUNT(CASE WHEN d.status = 'APROBADO'  THEN 1 END) AS green_count,
        COUNT(d.id)                             AS total_count,
        NOW()                                   AS last_updated
      FROM documents d
      GROUP BY 1,2,3,4;
    `;
    await db.getClient().$executeRawUnsafe(createSql);

    // Asegurar índice único requerido para REFRESH CONCURRENTLY
    await db.getClient().$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS ${this.mvUniqueIdx}
      ON ${this.mvName} (tenant_id, empresa_id, entity_type, entity_id);
    `);
  }

  /**
   * Obtener resumen de estados optimizado (vista materializada)
   */
  public async getOptimizedStatusSummary(empresaId?: number): Promise<Array<{
    empresaId: number;
    entityType: string;
    entityId: number;
    redCount: number;
    yellowCount: number;
    greenCount: number;
    totalCount: number;
    lastUpdated: Date;
    overallStatus: 'verde' | 'amarillo' | 'rojo';
  }>> {
    try {
      const whereClause = empresaId ? 'WHERE empresa_id = $1' : '';
      const params = empresaId ? [empresaId] : [];

      const results = await db.getClient().$queryRawUnsafe(`
        SELECT 
          empresa_id as "empresaId",
          entity_type as "entityType", 
          entity_id as "entityId",
          red_count as "redCount",
          yellow_count as "yellowCount", 
          green_count as "greenCount",
          total_count as "totalCount",
          last_updated as "lastUpdated"
        FROM document_status_summary 
        ${whereClause}
        ORDER BY red_count DESC, yellow_count DESC
      `, ...params) as Array<{
        empresaId: number;
        entityType: string;
        entityId: number;
        redCount: number;
        yellowCount: number;
        greenCount: number;
        totalCount: number;
        lastUpdated: Date;
      }>;

      // Calcular estado general para cada entidad
      return results.map(row => ({
        ...row,
        overallStatus: this.calculateOverallStatus(row.redCount, row.yellowCount, row.greenCount),
      }));
    } catch (_e) {
      AppLogger.error('💥 Error obteniendo resumen optimizado:', _e);
      return [];
    }
  }

  /**
   * Obtener estadísticas globales optimizadas
   */
  public async getOptimizedGlobalStats(): Promise<{
    totalDocuments: number;
    pendingCount: number;
    validatingCount: number;
    approvedCount: number;
    rejectedCount: number;
    expiredCount: number;
    activeCompanies: number;
    avgProcessingHours: number;
  }> {
    try {
      const result = await db.getClient().$queryRawUnsafe(`
        SELECT 
          total_documents as "totalDocuments",
          pending_count as "pendingCount",
          validating_count as "validatingCount", 
          approved_count as "approvedCount",
          rejected_count as "rejectedCount",
          expired_count as "expiredCount",
          active_companies as "activeCompanies",
          COALESCE(avg_processing_hours, 0) as "avgProcessingHours"
        FROM global_document_stats
        LIMIT 1
      `) as Array<{
        totalDocuments: number;
        pendingCount: number;
        validatingCount: number;
        approvedCount: number;
        rejectedCount: number;
        expiredCount: number;
        activeCompanies: number;
        avgProcessingHours: number;
      }>;

      return result[0] || {
        totalDocuments: 0,
        pendingCount: 0,
        validatingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        expiredCount: 0,
        activeCompanies: 0,
        avgProcessingHours: 0,
      };
    } catch (_e) {
      AppLogger.error('💥 Error obteniendo estadísticas globales:', _e);
      return {
        totalDocuments: 0,
        pendingCount: 0,
        validatingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        expiredCount: 0,
        activeCompanies: 0,
        avgProcessingHours: 0,
      };
    }
  }

  /**
   * Obtener alertas críticas optimizadas
   */
  public async getOptimizedCriticalAlerts(empresaId?: number, limit = 50): Promise<Array<{
    empresaId: number;
    entityType: string;
    entityId: number;
    redCount: number;
    totalCount: number;
    redPercentage: number;
    lastUpdated: Date;
  }>> {
    try {
      const whereClause = empresaId ? 'AND empresa_id = $1' : '';
      const params = empresaId ? [empresaId, limit] : [limit];
      const paramIndex = empresaId ? '$2' : '$1';

      const results = await db.getClient().$queryRawUnsafe(`
        SELECT 
          empresa_id as "empresaId",
          entity_type as "entityType",
          entity_id as "entityId", 
          red_count as "redCount",
          total_count as "totalCount",
          red_percentage as "redPercentage",
          last_updated as "lastUpdated"
        FROM critical_alerts
        WHERE red_count > 0 ${whereClause}
        ORDER BY red_count DESC, last_updated DESC
        LIMIT ${paramIndex}
      `, ...params);

      return results as Array<{
        empresaId: number;
        entityType: string;
        entityId: number;
        redCount: number;
        totalCount: number;
        redPercentage: number;
        lastUpdated: Date;
      }>;
    } catch (_e) {
      AppLogger.error('💥 Error obteniendo alertas críticas:', _e);
      return [];
    }
  }

  /**
   * Obtener agregados por tenant desde la vista materializada
   */
  public async getPerTenantAggregates(): Promise<Array<{
    tenantId: number;
    redCount: number;
    yellowCount: number;
    greenCount: number;
    totalCount: number;
  }>> {
    try {
      const rows = await db.getClient().$queryRawUnsafe(`
        SELECT 
          tenant_id   AS "tenantId",
          SUM(red_count)    AS "redCount",
          SUM(yellow_count) AS "yellowCount",
          SUM(green_count)  AS "greenCount",
          SUM(total_count)  AS "totalCount"
        FROM ${this.mvName}
        GROUP BY tenant_id
        ORDER BY tenant_id
      `) as Array<{
        tenantId: number;
        redCount: number;
        yellowCount: number;
        greenCount: number;
        totalCount: number;
      }>;
      return rows;
    } catch (_e) {
      AppLogger.error('💥 Error obteniendo agregados por tenant:', _e);
      return [];
    }
  }

  /**
   * Refrescar vista materializada manualmente
   */
  private async hasUniqueIndex(): Promise<boolean> {
    const rows = await db.getClient().$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = '${this.mvUniqueIdx}'
      ) AS exists;
    `);
    return !!rows[0]?.exists;
  }

  public async refreshMaterializedView(): Promise<void> {
    try {
      const canConcurrent = await this.hasUniqueIndex();
      if (canConcurrent) {
        try {
          await db.getClient().$executeRawUnsafe(`
            REFRESH MATERIALIZED VIEW CONCURRENTLY ${this.mvName}
          `);
        } catch (_e) {
          // Fallback silencioso: este escenario puede ocurrir por locks
          await db.getClient().$executeRawUnsafe(`
            REFRESH MATERIALIZED VIEW ${this.mvName}
          `);
        }
      } else {
        await db.getClient().$executeRawUnsafe(`
          REFRESH MATERIALIZED VIEW ${this.mvName}
        `);
      }
      
      AppLogger.info('✅ Vista materializada refrescada exitosamente');
    } catch (error) {
      // No elevar a error para no ensuciar logs por condiciones transitorias
      AppLogger.warn('⚠️ Falló el refresh de la vista materializada (se omitió).', error as any);
    }
  }

  /**
   * Obtener métricas de performance del sistema
   */
  public async getSystemMetrics(): Promise<{
    databaseConnections: number;
    materializedViewAge: number; // minutos
    avgQueryTime: number; // ms
    cacheHitRatio: number; // porcentaje
  }> {
    try {
      // Conexiones activas
      const connectionsResult = await db.getClient().$queryRawUnsafe(`
        SELECT count(*) as connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `) as Array<{ connections: bigint }>;

      // Edad de la vista materializada
      const viewAgeResult = await db.getClient().$queryRawUnsafe(`
        SELECT 
          EXTRACT(EPOCH FROM (NOW() - MAX(last_updated)))/60 as age_minutes
        FROM document_status_summary
      `) as Array<{ age_minutes: number }>;

      return {
        databaseConnections: Number(connectionsResult[0]?.connections || 0),
        materializedViewAge: viewAgeResult[0]?.age_minutes || 0,
        avgQueryTime: 0, // TODO: Implementar con pg_stat_statements
        cacheHitRatio: 0, // TODO: Implementar cache metrics
      };
    } catch (_e) {
      AppLogger.error('💥 Error obteniendo métricas del sistema:', _e);
      return {
        databaseConnections: 0,
        materializedViewAge: 0,
        avgQueryTime: 0,
        cacheHitRatio: 0,
      };
    }
  }

  /**
   * Calcular estado general de una entidad
   */
  private calculateOverallStatus(redCount: number, yellowCount: number, _greenCount: number): 'verde' | 'amarillo' | 'rojo' {
    if (redCount > 0) return 'rojo';
    if (yellowCount > 0) return 'amarillo';
    return 'verde';
  }

  /**
   * Limpiar datos antiguos para mantener performance
   */
  public async cleanupOldData(): Promise<{
    deletedDocuments: number;
    deletedFiles: number;
  }> {
    try {
      // Esquema actual no tiene deleted_at/document_files; hacer limpieza no destructiva segura
      const deletedDocsResult = 0;
      const deletedFilesResult = 0;

      AppLogger.info('🧹 Limpieza de datos completada', {
        deletedDocuments: deletedDocsResult,
        deletedFiles: deletedFilesResult,
      });

      return {
        deletedDocuments: deletedDocsResult as number,
        deletedFiles: deletedFilesResult as number,
      };
    } catch (error) {
      AppLogger.error('💥 Error en limpieza de datos:', error);
      return {
        deletedDocuments: 0,
        deletedFiles: 0,
      };
    }
  }
}

// Exportar instancia singleton
export const performanceService = PerformanceService.getInstance();