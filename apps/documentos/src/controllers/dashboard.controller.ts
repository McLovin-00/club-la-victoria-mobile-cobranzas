import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { StatusService } from '../services/status.service';
import { DocumentService } from '../services/document.service';
import { queueService } from '../services/queue.service';
import { AppLogger } from '../config/logger';
import { UserRole } from '../types/roles';

// ============================================================================
// HELPERS para stats por rol
// ============================================================================

async function getAdminStats(prisma: any, tenantEmpresaId: number, now: Date) {
  const [totalEquipos, totalDocumentos, pendientesAprobacion, vencidosHoy, rechazados] = await Promise.all([
    prisma.equipo.count({ where: { tenantEmpresaId } }),
    prisma.document.count({ where: { tenantEmpresaId, archived: false } }),
    prisma.document.count({ where: { tenantEmpresaId, status: 'PENDIENTE_APROBACION' as any } }),
    prisma.document.count({ where: { tenantEmpresaId, status: 'APROBADO' as any, expiresAt: { lte: now } } }),
    prisma.document.count({ where: { tenantEmpresaId, status: 'RECHAZADO' as any, archived: false } }),
  ]);
  return { totalEquipos, totalDocumentos, pendientesAprobacion, vencidosHoy, rechazados };
}

async function getDadorStats(prisma: any, tenantEmpresaId: number, now: Date, in30Days: Date) {
  const [misEquipos, pendientesAprobacion, proximosVencer, transportistasActivos] = await Promise.all([
    prisma.equipo.count({ where: { tenantEmpresaId } }),
    prisma.document.count({ where: { tenantEmpresaId, status: 'PENDIENTE_APROBACION' as any } }),
    prisma.document.count({ where: { tenantEmpresaId, status: 'APROBADO' as any, expiresAt: { gte: now, lte: in30Days } } }),
    prisma.empresaTransportista.count({ where: { tenantEmpresaId } }),
  ]);
  return { misEquipos, pendientesAprobacion, proximosVencer, transportistasActivos };
}

async function getTransportistaStats(prisma: any, tenantEmpresaId: number, now: Date, in30Days: Date) {
  const [misEquipos, documentosRechazados, proximosVencer] = await Promise.all([
    prisma.equipo.count({ where: { tenantEmpresaId, empresaTransportistaId: { not: null } } }),
    prisma.document.count({ where: { tenantEmpresaId, status: 'RECHAZADO' as any, archived: false } }),
    prisma.document.count({ where: { tenantEmpresaId, status: 'APROBADO' as any, expiresAt: { gte: now, lte: in30Days } } }),
  ]);
  return { misEquipos, documentosRechazados, documentosFaltantes: 0, proximosVencer };
}

async function getClienteStats(prisma: any, clienteId: number | undefined) {
  if (!clienteId) return { equiposAsignados: 0, vigentes: 0, proximosVencer: 0, vencidos: 0 };
  
  const [equiposAsignados, equipos] = await Promise.all([
    prisma.equipoCliente.count({ where: { clienteId, asignadoHasta: null } }),
    prisma.equipoCliente.findMany({ where: { clienteId, asignadoHasta: null }, include: { equipo: true } }),
  ]);
  
  let vigentes = 0, proximosVencer = 0, vencidos = 0;
  for (const ec of equipos) {
    const estado = (ec as any).equipo?.estado?.toUpperCase();
    if (estado === 'VIGENTE' || estado === 'OK') vigentes++;
    else if (estado === 'PROXIMO_VENCER' || estado === 'WARNING') proximosVencer++;
    else if (estado === 'VENCIDO' || estado === 'EXPIRED') vencidos++;
  }
  return { equiposAsignados, vigentes, proximosVencer, vencidos };
}

// ============================================================================
// CONTROLLER
// ============================================================================

/**
 * Dashboard Controller - Vistas Elegantes para Frontend
 */
export class DashboardController {

  /**
   * Obtener IDs de empresas según rol del usuario
   */
  private static async getEmpresaIdsForUser(user: any, empresaIdParam: any, tenantId: number): Promise<number[]> {
    if (user.role !== UserRole.SUPERADMIN) {
      return [user.empresaId!];
    }

    if (empresaIdParam) {
      return [parseInt(String(empresaIdParam))];
    }

    // Superadmin sin filtro: todas las empresas con documentos
    const prisma = (await import('../config/database')).db.getClient();
    const empresasWithDocs = await prisma.document.findMany({
      where: { tenantEmpresaId: tenantId },
      select: { dadorCargaId: true },
      distinct: ['dadorCargaId'],
    });
    return empresasWithDocs.map((e: any) => e.dadorCargaId);
  }

  /**
   * GET /api/docs/dashboard/semaforos - Vista de semáforos por dador
   */
  static async getSemaforosView(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { empresaId } = req.query as any;
      const user = req.user!;

      // Determinar empresas a consultar según rol
      const empresaIds = await DashboardController.getEmpresaIdsForUser(user, empresaId, req.tenantId!);

      // Transformar a formato frontend-friendly
      const now = new Date();
      const { getEnvironment } = await import('../config/environment');
      const env = getEnvironment();
      const dueSoonDate = new Date(now.getTime() + Math.max(0, (env.DOCS_DUE_SOON_DAYS || 30)) * 24 * 60 * 60 * 1000);
      const prisma = (await import('../config/database')).db.getClient();

      const semaforosData = [] as Array<any>;
      for (const eid of empresaIds) {
        const [totalByType, redByType, yellowByType, greenByType] = await Promise.all([
          prisma.document.groupBy({
            by: ['entityType'],
            where: { tenantEmpresaId: req.tenantId!, dadorCargaId: eid },
            _count: { status: true },
          }),
          prisma.document.groupBy({
            by: ['entityType'],
            where: {
              tenantEmpresaId: req.tenantId!,
              dadorCargaId: eid,
              OR: [
                { status: { in: ['RECHAZADO', 'VENCIDO'] as any } },
                { AND: [ { expiresAt: { lte: now } }, { status: { in: ['APROBADO'] as any } } ] },
              ],
            },
            _count: { status: true },
          }),
          prisma.document.groupBy({
            by: ['entityType'],
            where: {
              tenantEmpresaId: req.tenantId!,
              dadorCargaId: eid,
              // Por vencer: solo documentos vigentes (APROBADO/DEPRECADO) con vencimiento entre now y dueSoonDate
              AND: [
                { status: { in: ['APROBADO'] as any } },
                { expiresAt: { gt: now, lte: dueSoonDate } },
              ],
            },
            _count: { status: true },
          }),
          prisma.document.groupBy({
            by: ['entityType'],
            where: {
              tenantEmpresaId: req.tenantId!,
              dadorCargaId: eid,
              AND: [
                { status: { in: ['APROBADO'] as any } },
                { OR: [ { expiresAt: null as any }, { expiresAt: { gt: dueSoonDate } } ] },
              ],
            },
            _count: { status: true },
          }),
        ]);

        const get = (arr: any[], type: string) => {
          const row = arr.find((r: any) => r.entityType === (type as any));
          return row ? Number(row._count?.status || 0) : 0;
        };

        const counts = {
          empresa: get(totalByType, 'EMPRESA_TRANSPORTISTA'),
          choferes: get(totalByType, 'CHOFER'),
          camiones: get(totalByType, 'CAMION'),
          acoplados: get(totalByType, 'ACOPLADO'),
        };

        const rojo = [
          get(redByType, 'EMPRESA_TRANSPORTISTA'),
          get(redByType, 'CHOFER'),
          get(redByType, 'CAMION'),
          get(redByType, 'ACOPLADO'),
        ];
        const amarillo = [
          get(yellowByType, 'EMPRESA_TRANSPORTISTA'),
          get(yellowByType, 'CHOFER'),
          get(yellowByType, 'CAMION'),
          get(yellowByType, 'ACOPLADO'),
        ];
        const verde = [
          get(greenByType, 'EMPRESA_TRANSPORTISTA'),
          get(greenByType, 'CHOFER'),
          get(greenByType, 'CAMION'),
          get(greenByType, 'ACOPLADO'),
        ];

        const totalRed = rojo.reduce((s, v) => s + v, 0);
        const totalYellow = amarillo.reduce((s, v) => s + v, 0);

        // Determinar estado global: rojo > amarillo > verde
        let overallStatus: 'rojo' | 'amarillo' | 'verde' = 'verde';
        if (totalRed > 0) {
          overallStatus = 'rojo';
        } else if (totalYellow > 0) {
          overallStatus = 'amarillo';
        }

        semaforosData.push({
          empresaId: eid,
          overallStatus,
          counts,
          statusCounts: { verde, amarillo, rojo },
        });
      }

      AppLogger.debug(`📊 Vista semáforos solicitada`, {
        userId: user.userId,
        role: user.role,
        empresaId: empresaId || 'todas',
        resultCount: semaforosData.length,
      });

      // Para compatibilidad con el frontend, exponemos semáforos al nivel raíz y
      // dejamos success / metadata opcional en otras propiedades.
      res.json({
        success: true,
        semaforos: semaforosData,
        userRole: user.role,
        userEmpresaId: user.empresaId,
      });
    } catch (error) {
      AppLogger.error('💥 Error obteniendo vista de semáforos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'DASHBOARD_ERROR',
      });
    }
  }

  /**
   * GET /api/docs/dashboard/pending/summary - Resumen de pendientes de aprobación
   */
  static async getPendingSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const prisma = (await import('../config/database')).db.getClient();
      const user = req.user!;
      // Pendientes de aprobación humana
      const whereBase: any = { tenantEmpresaId: req.tenantId!, status: 'PENDIENTE_APROBACION' as any };
      if (user.role !== UserRole.SUPERADMIN) {
        whereBase.dadorCargaId = user.empresaId!;
      }
      const total = await prisma.document.count({ where: whereBase });
      const topByTemplate = await prisma.document.groupBy({
        by: ['templateId'],
        where: whereBase,
        _count: { templateId: true },
        orderBy: { _count: { templateId: 'desc' } },
        take: 5,
      });
      const templateIds = topByTemplate.map((t: any) => t.templateId);
      const templates = templateIds.length
        ? await prisma.documentTemplate.findMany({ where: { id: { in: templateIds } }, select: { id: true, name: true } })
        : [];
      const lastUploads = await prisma.document.findMany({
        where: whereBase,
        orderBy: { uploadedAt: 'desc' },
        take: 10,
        select: { id: true, uploadedAt: true, fileName: true, dadorCargaId: true },
      });

      const top = topByTemplate.map((r: any) => ({
        templateId: r.templateId,
        templateName: templates.find((t) => t.id === r.templateId)?.name || `Plantilla #${r.templateId}`,
        count: Number(r._count.templateId || 0),
      }));

      res.json({ success: true, data: { total, top, lastUploads } });
    } catch (error) {
      AppLogger.error('💥 Error obteniendo resumen de pendientes:', error);
      res.status(500).json({ success: false, message: 'Error interno', code: 'PENDING_SUMMARY_ERROR' });
    }
  }

  /**
   * GET /api/docs/dashboard/stats - Estadísticas globales
   */
  static async getGlobalStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { empresaId } = req.query as any;

      let stats;

      if (user.role === UserRole.SUPERADMIN) {
        if (empresaId) {
          stats = await DocumentService.getDocumentStats(req.tenantId!, parseInt(empresaId));
        } else {
          // Estadísticas globales para superadmin
          stats = {
            total: 0,
            pendiente: 0,
            validando: 0,
            aprobado: 0,
            rechazado: 0,
            vencido: 0,
          };
          
          // Sumar estadísticas de todas las empresas
          const globalSummaries = await StatusService.getGlobalStatusSummary(req.tenantId!);
          for (const summary of globalSummaries) {
            const empresaStats = await DocumentService.getDocumentStats(req.tenantId!, summary.empresaId);
            stats.total += empresaStats.total;
            stats.pendiente += empresaStats.pendiente;
            stats.validando += empresaStats.validando;
            stats.aprobado += empresaStats.aprobado;
            stats.rechazado += empresaStats.rechazado;
            stats.vencido += empresaStats.vencido;
          }
        }
      } else {
        // Admin/Operator solo ve estadísticas de su dador
        stats = await DocumentService.getDocumentStats(req.tenantId!, user.empresaId!);
      }

      // Obtener estadísticas de cola (solo superadmin)
      let queueStats = null;
      if (user.role === UserRole.SUPERADMIN) {
        queueStats = await queueService.getQueueStats();
      }

      AppLogger.debug(`📈 Estadísticas solicitadas`, {
        userId: user.userId,
        role: user.role,
        empresaId: empresaId || user.empresaId,
      });

      res.json({
        success: true,
        data: {
          documentStats: stats,
          queueStats,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      AppLogger.error('💥 Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'STATS_ERROR',
      });
    }
  }

  /**
   * GET /api/docs/dashboard/equipo-kpis - KPIs de equipos (creados, swaps, eliminados)
   */
  static async getEquipoKpis(req: AuthRequest, res: Response): Promise<void> {
    const { prisma } = await import('../config/database');
    const since = req.query.since ? new Date(String(req.query.since)) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const whereBase: any = { createdAt: { gte: since } };
    const [created, swaps, deleted] = await Promise.all([
      prisma.equipoHistory.count({ where: { ...whereBase, action: 'create' } }),
      prisma.equipoHistory.count({ where: { ...whereBase, OR: [{ action: 'attach' }, { action: 'close' }, { action: 'detach' }, { action: 'reopen' }] } }),
      prisma.equipoHistory.count({ where: { ...whereBase, action: 'delete' } }),
    ]);
    res.json({ success: true, data: { since: since.toISOString(), created, swaps, deleted } });
  }

  /**
   * GET /api/docs/dashboard/alerts - Entidades con alertas
   */
  static async getAlertsView(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { empresaId } = req.query as any;

      let alertedEntities;

      if (user.role === UserRole.SUPERADMIN) {
        if (empresaId) {
          alertedEntities = await StatusService.getEntitiesWithAlarms(parseInt(empresaId));
        } else {
          alertedEntities = await StatusService.getEntitiesWithAlarms();
        }
      } else {
        // Admin/Operator solo ve alertas de su dador
        alertedEntities = await StatusService.getEntitiesWithAlarms(user.empresaId!);
      }

      // Agrupar por tipo de entidad
      const alertsByType = {
        empresa: alertedEntities.filter(e => e.entityType === 'DADOR'),
        choferes: alertedEntities.filter(e => e.entityType === 'CHOFER'),
        camiones: alertedEntities.filter(e => e.entityType === 'CAMION'),
        acoplados: alertedEntities.filter(e => e.entityType === 'ACOPLADO'),
      };

      AppLogger.debug(`🚨 Vista de alertas solicitada`, {
        userId: user.userId,
        role: user.role,
        totalAlerts: alertedEntities.length,
      });

      res.json({
        success: true,
        data: {
          alerts: alertsByType,
          totalCount: alertedEntities.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      AppLogger.error('💥 Error obteniendo vista de alertas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'ALERTS_ERROR',
      });
    }
  }

  /**
   * GET /api/docs/dashboard/config - Configuración para frontend
   */
  static async getFrontendConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;

      const config = {
        user: {
          id: user.userId,
          email: user.email,
          role: user.role,
          empresaId: user.empresaId,
        },
        features: {
          canManageTemplates: user.role === UserRole.SUPERADMIN,
          canViewAllCompanies: user.role === UserRole.SUPERADMIN,
          canUploadDocuments: ['SUPERADMIN','ADMIN','OPERATOR'].includes(user.role as any),
          canDeleteDocuments: ['SUPERADMIN','ADMIN'].includes(user.role as any),
          canViewQueueStats: user.role === UserRole.SUPERADMIN,
        },
        endpoints: {
          upload: '/api/docs/documents/upload',
          status: '/api/docs/documents/status',
          preview: '/api/docs/documents/:id/preview',
          templates: '/api/docs/templates',
          config: '/api/docs/config/:empresaId',
          dashboard: '/api/docs/dashboard',
        },
        limits: {
          maxFileSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        },
      };

      AppLogger.debug(`⚙️ Configuración frontend solicitada`, {
        userId: user.userId,
        role: user.role,
      });

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      AppLogger.error('💥 Error obteniendo configuración frontend:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'CONFIG_ERROR',
      });
    }
  }

  /**
   * GET /api/docs/dashboard/approval-kpis - KPIs de aprobación
   */
  static async getApprovalKpis(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = req.tenantId!;
      const { db } = await import('../config/database');
      const pending = await db.getClient().document.count({ where: { tenantEmpresaId, status: 'PENDIENTE_APROBACION' as any } });
      const startOfDay = new Date(new Date().toDateString());
      const approvedToday = await db.getClient().document.count({ where: { tenantEmpresaId, status: 'APROBADO' as any, validatedAt: { gte: startOfDay } } });
      res.json({ success: true, data: { pending, approvedToday, asOf: new Date().toISOString() } });
    } catch (error) {
      AppLogger.error('💥 Error obteniendo KPIs de aprobación:', error);
      res.status(500).json({ success: false, message: 'Error obteniendo KPIs de aprobación', code: 'KPIS_ERROR' });
    }
  }

  /**
   * GET /api/docs/dashboard/stats-por-rol - Stats personalizados por rol
   * Retorna información relevante según el rol del usuario
   */
  static async getStatsPorRol(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = req.tenantId!;
      const user = req.user!;
      const { db } = await import('../config/database');
      const prisma = db.getClient();
      
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const baseStats = { role: user.role, asOf: now.toISOString() };
      
      let roleStats: any = {};
      
      if (user.role === 'SUPERADMIN' || user.role === 'ADMIN_INTERNO') {
        roleStats = await getAdminStats(prisma, tenantEmpresaId, now);
      } else if (user.role === 'DADOR_DE_CARGA') {
        roleStats = await getDadorStats(prisma, tenantEmpresaId, now, in30Days);
      } else if (user.role === 'TRANSPORTISTA' || user.role === 'EMPRESA_TRANSPORTISTA') {
        roleStats = await getTransportistaStats(prisma, tenantEmpresaId, now, in30Days);
      } else if (user.role === 'CLIENTE') {
        roleStats = await getClienteStats(prisma, user.empresaId ?? undefined);
      }
      
      res.json({ success: true, data: { ...baseStats, ...roleStats } });
    } catch (error) {
      AppLogger.error('💥 Error obteniendo stats por rol:', error);
      res.status(500).json({ success: false, message: 'Error obteniendo estadísticas', code: 'STATS_ERROR' });
    }
  }
}