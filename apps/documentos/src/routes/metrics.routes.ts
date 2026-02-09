import { Router, Request, Response } from 'express';
import { performanceService } from '../services/performance.service';
import { queueService } from '../services/queue.service';
import { AppLogger } from '../config/logger';

const router: ReturnType<typeof Router> = Router();

/**
 * GET /metrics - Métricas para Prometheus
 * Acceso: Público (para scraping)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // Obtener métricas en paralelo
    const [systemMetrics, queueStats, globalStats, perTenant] = await Promise.all([
      performanceService.getSystemMetrics(),
      queueService.getQueueStats(),
      performanceService.getOptimizedGlobalStats(),
      performanceService.getPerTenantAggregates(),
    ]);

    const responseTime = Date.now() - startTime;
    const memMetrics: any = (globalThis as any).__DOCS_METRICS || {};
    const memoryUsage = process.memoryUsage();

    // Formato Prometheus
    // Métricas por tenant
    const tenantLines = perTenant.map(t => [
      `documentos_tenant_documents_total{tenant_id="${t.tenantId}",status="red"} ${t.redCount}`,
      `documentos_tenant_documents_total{tenant_id="${t.tenantId}",status="yellow"} ${t.yellowCount}`,
      `documentos_tenant_documents_total{tenant_id="${t.tenantId}",status="green"} ${t.greenCount}`,
      `documentos_tenant_documents_total{tenant_id="${t.tenantId}",status="total"} ${t.totalCount}`
    ].join('\n')).join('\n');

    // Pendientes de aprobación y por tipo
    let pendingApproval = 0;
    let pendingApprovalByTypeLines = '';
    try {
      const { db } = await import('../config/database');
      pendingApproval = await db.getClient().document.count({ where: { status: 'PENDIENTE_APROBACION' as any } });
      const paByType = await db.getClient().document.groupBy({ by: ['entityType'], where: { status: 'PENDIENTE_APROBACION' as any }, _count: { entityType: true } });
      pendingApprovalByTypeLines = paByType.map(r => `documentos_pending_approval_by_type{entity_type="${r.entityType}"} ${r._count.entityType}`).join('\n');
    } catch { /* Métricas no críticas */ }

    // KPIs de equipos últimos 7 días (global y por tenant)
    let equipoKpiLines = '';
    try {
      const { prisma } = await import('../config/database');
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [created, swaps, deleted] = await Promise.all([
        prisma.equipoHistory.count({ where: { createdAt: { gte: since }, action: 'create' } }),
        prisma.equipoHistory.count({ where: { createdAt: { gte: since }, OR: [{ action: 'swap' }, { action: 'attach' }, { action: 'close' }, { action: 'detach' }, { action: 'reopen' }] } }),
        prisma.equipoHistory.count({ where: { createdAt: { gte: since }, action: 'delete' } }),
      ]);
      const tenants = await prisma.equipo.findMany({ distinct: ['tenantEmpresaId'], select: { tenantEmpresaId: true } });
      const perTenantLines: string[] = [];
      for (const t of tenants) {
        const [tc, ts, td] = await Promise.all([
          prisma.equipoHistory.count({ where: { createdAt: { gte: since }, action: 'create', equipo: { tenantEmpresaId: t.tenantEmpresaId } } }),
          prisma.equipoHistory.count({ where: { createdAt: { gte: since }, OR: [{ action: 'swap' }, { action: 'attach' }, { action: 'close' }, { action: 'detach' }, { action: 'reopen' }], equipo: { tenantEmpresaId: t.tenantEmpresaId } } }),
          prisma.equipoHistory.count({ where: { createdAt: { gte: since }, action: 'delete', equipo: { tenantEmpresaId: t.tenantEmpresaId } } }),
        ]);
        perTenantLines.push(`documentos_equipos_events_total{tenant_id="${t.tenantEmpresaId}",type="created",window="7d"} ${tc}`);
        perTenantLines.push(`documentos_equipos_events_total{tenant_id="${t.tenantEmpresaId}",type="swaps",window="7d"} ${ts}`);
        perTenantLines.push(`documentos_equipos_events_total{tenant_id="${t.tenantEmpresaId}",type="deleted",window="7d"} ${td}`);
      }
      equipoKpiLines = [
        `documentos_equipos_events_total{type="created",window="7d"} ${created}`,
        `documentos_equipos_events_total{type="swaps",window="7d"} ${swaps}`,
        `documentos_equipos_events_total{type="deleted",window="7d"} ${deleted}`,
        perTenantLines.join('\n')
      ].join('\n');
    } catch { /* Métricas KPI no críticas */ }

    const metrics = `
# HELP documentos_info Información del microservicio documentos
# TYPE documentos_info gauge
documentos_info{version="1.0.0",environment="${process.env.NODE_ENV || 'development'}"} 1

# HELP documentos_uptime_seconds Tiempo de actividad en segundos
# TYPE documentos_uptime_seconds counter
documentos_uptime_seconds ${process.uptime()}

# HELP documentos_memory_usage_bytes Uso de memoria en bytes
# TYPE documentos_memory_usage_bytes gauge
documentos_memory_usage_bytes{type="heap_used"} ${memoryUsage.heapUsed}
documentos_memory_usage_bytes{type="heap_total"} ${memoryUsage.heapTotal}
documentos_memory_usage_bytes{type="external"} ${memoryUsage.external}
documentos_memory_usage_bytes{type="rss"} ${memoryUsage.rss}

# HELP documentos_database_connections Conexiones activas a la base de datos
# TYPE documentos_database_connections gauge
documentos_database_connections ${systemMetrics.databaseConnections}

# HELP documentos_materialized_view_age_minutes Edad de la vista materializada en minutos
# TYPE documentos_materialized_view_age_minutes gauge
documentos_materialized_view_age_minutes ${systemMetrics.materializedViewAge}

# HELP documentos_queue_jobs_total Total de jobs en cola por estado
# TYPE documentos_queue_jobs_total gauge
documentos_queue_jobs_total{state="waiting"} ${queueStats.waiting}
documentos_queue_jobs_total{state="active"} ${queueStats.active}
documentos_queue_jobs_total{state="completed"} ${queueStats.completed}
documentos_queue_jobs_total{state="failed"} ${queueStats.failed}
documentos_queue_jobs_total{state="delayed"} ${queueStats.delayed}

# HELP documentos_documents_total Total de documentos por estado
# TYPE documentos_documents_total gauge
documentos_documents_total{status="total"} ${globalStats.totalDocuments}
documentos_documents_total{status="pending"} ${globalStats.pendingCount}
documentos_documents_total{status="validating"} ${globalStats.validatingCount}
documentos_documents_total{status="approved"} ${globalStats.approvedCount}
documentos_documents_total{status="rejected"} ${globalStats.rejectedCount}
documentos_documents_total{status="expired"} ${globalStats.expiredCount}

# HELP documentos_companies_active Total de empresas activas
# TYPE documentos_companies_active gauge
documentos_companies_active ${globalStats.activeCompanies}

# HELP documentos_processing_hours_avg Tiempo promedio de procesamiento en horas
# TYPE documentos_processing_hours_avg gauge
documentos_processing_hours_avg ${globalStats.avgProcessingHours}

# HELP documentos_metrics_response_time_ms Tiempo de respuesta del endpoint de métricas
# TYPE documentos_metrics_response_time_ms gauge
documentos_metrics_response_time_ms ${responseTime}

# HELP documentos_batch_total Total de lotes creados
# TYPE documentos_batch_total counter
documentos_batch_total ${memMetrics.batch_total || 0}

# HELP documentos_batch_completed_total Total de lotes completados
# TYPE documentos_batch_completed_total counter
documentos_batch_completed_total ${memMetrics.batch_completed || 0}

# HELP documentos_batch_failed_total Total de lotes fallidos
# TYPE documentos_batch_failed_total counter
documentos_batch_failed_total ${memMetrics.batch_failed || 0}

# HELP documentos_pending_approval_total Documentos pendientes de aprobación humana
# TYPE documentos_pending_approval_total gauge
documentos_pending_approval_total ${pendingApproval}

# HELP documentos_pending_approval_by_type Pendientes de aprobación por tipo de entidad
# TYPE documentos_pending_approval_by_type gauge
${pendingApprovalByTypeLines}

# HELP documentos_equipos_events_total Eventos de equipos por tipo (ventana 7d)
# TYPE documentos_equipos_events_total counter
${equipoKpiLines}

# HELP documentos_health_status Estado de salud de dependencias (1=healthy, 0=unhealthy)
# TYPE documentos_health_status gauge
documentos_health_status{service="database"} ${systemMetrics.databaseConnections > 0 ? 1 : 0}
documentos_health_status{service="redis"} ${queueStats.waiting >= 0 ? 1 : 0}

# HELP documentos_tenant_documents_total Totales de documentos por tenant y estado
# TYPE documentos_tenant_documents_total gauge
${tenantLines}
`.trim();

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.status(200).send(metrics);

    AppLogger.debug('📊 Métricas Prometheus generadas', {
      responseTime,
      metricsCount: metrics.split('\n').filter(line => !line.startsWith('#') && line.trim()).length,
    });

  } catch (error) {
    AppLogger.error('💥 Error generando métricas Prometheus:', error);
    res.status(500).send('# Error generating metrics\n');
  }
});

/**
 * GET /metrics/custom - Métricas personalizadas adicionales
 * Acceso: Público (para scraping)
 */
router.get('/custom', async (req: Request, res: Response): Promise<void> => {
  try {
    const criticalAlerts = await performanceService.getOptimizedCriticalAlerts();
    const alertsCount = criticalAlerts.length;

    const customMetrics = `
# HELP documentos_critical_alerts_total Número de entidades con alertas críticas
# TYPE documentos_critical_alerts_total gauge
documentos_critical_alerts_total ${alertsCount}

# HELP documentos_critical_alerts_by_type Alertas críticas agrupadas por tipo de entidad
# TYPE documentos_critical_alerts_by_type gauge
documentos_critical_alerts_by_type{entity_type="DADOR"} ${criticalAlerts.filter(a => a.entityType === 'DADOR').length}
documentos_critical_alerts_by_type{entity_type="CHOFER"} ${criticalAlerts.filter(a => a.entityType === 'CHOFER').length}
documentos_critical_alerts_by_type{entity_type="CAMION"} ${criticalAlerts.filter(a => a.entityType === 'CAMION').length}
documentos_critical_alerts_by_type{entity_type="ACOPLADO"} ${criticalAlerts.filter(a => a.entityType === 'ACOPLADO').length}
`.trim();

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.status(200).send(customMetrics);

  } catch (error) {
    AppLogger.error('💥 Error generando métricas personalizadas:', error);
    res.status(500).send('# Error generating custom metrics\n');
  }
});

export default router;