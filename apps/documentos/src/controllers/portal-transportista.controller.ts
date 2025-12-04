import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';

/**
 * Portal Transportista Controller
 * Endpoints para empresas transportistas
 */
export class PortalTransportistaController {
  /**
   * GET /api/portal-transportista/mis-entidades
   * Obtiene las entidades (choferes, camiones, acoplados) del transportista
   */
  static async getMisEntidades(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const user = req.user!;
    
    try {
      // Obtener empresas transportistas del tenant del usuario
      // Para un transportista, su empresaId puede estar relacionado con la empresa transportista
      const empresas = await prisma.empresaTransportista.findMany({
        where: { tenantEmpresaId: tenantId },
        select: {
          id: true,
          razonSocial: true,
          cuit: true,
          dadorCargaId: true,
        },
      });
      
      if (empresas.length === 0) {
        return res.json({
          success: true,
          data: {
            empresas: [],
            choferes: [],
            camiones: [],
            acoplados: [],
            contadores: { pendientes: 0, rechazados: 0, porVencer: 0 },
          },
        });
      }
      
      const dadorIds = [...new Set(empresas.map(e => e.dadorCargaId))];
      
      // Obtener choferes
      const choferes = await prisma.chofer.findMany({
        where: {
          tenantEmpresaId: tenantId,
          dadorCargaId: { in: dadorIds },
          activo: true,
        },
        select: {
          id: true,
          dni: true,
          nombre: true,
          apellido: true,
          dadorCargaId: true,
        },
        orderBy: { apellido: 'asc' },
      });
      
      // Obtener camiones
      const camiones = await prisma.camion.findMany({
        where: {
          tenantEmpresaId: tenantId,
          dadorCargaId: { in: dadorIds },
          activo: true,
        },
        select: {
          id: true,
          patente: true,
          marca: true,
          modelo: true,
          dadorCargaId: true,
        },
        orderBy: { patente: 'asc' },
      });
      
      // Obtener acoplados
      const acoplados = await prisma.acoplado.findMany({
        where: {
          tenantEmpresaId: tenantId,
          dadorCargaId: { in: dadorIds },
          activo: true,
        },
        select: {
          id: true,
          patente: true,
          tipo: true,
          dadorCargaId: true,
        },
        orderBy: { patente: 'asc' },
      });
      
      // Contar documentos pendientes, rechazados y por vencer
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const [pendientes, rechazados, porVencer] = await Promise.all([
        prisma.document.count({
          where: {
            tenantEmpresaId: tenantId,
            dadorCargaId: { in: dadorIds },
            status: 'PENDIENTE_APROBACION',
            archived: false,
          },
        }),
        prisma.document.count({
          where: {
            tenantEmpresaId: tenantId,
            dadorCargaId: { in: dadorIds },
            status: 'RECHAZADO',
            archived: false,
          },
        }),
        prisma.document.count({
          where: {
            tenantEmpresaId: tenantId,
            dadorCargaId: { in: dadorIds },
            status: 'APROBADO',
            archived: false,
            expiresAt: {
              gte: now,
              lte: in30Days,
            },
          },
        }),
      ]);
      
      res.json({
        success: true,
        data: {
          empresas,
          choferes,
          camiones,
          acoplados,
          contadores: { pendientes, rechazados, porVencer },
        },
      });
    } catch (error) {
      AppLogger.error('Error obteniendo entidades transportista:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }
  
  /**
   * GET /api/portal-transportista/equipos
   * Lista equipos donde el transportista es la empresa transportista
   */
  static async getMisEquipos(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    
    try {
      const equipos = await prisma.equipo.findMany({
        where: {
          tenantEmpresaId: tenantId,
          empresaTransportistaId: { not: null },
        },
        include: {
          empresaTransportista: true,
          dador: true,
          clientes: {
            where: { asignadoHasta: null },
            include: { cliente: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      
      // Obtener datos adicionales
      const equiposConDatos = await Promise.all(
        equipos.map(async (equipo) => {
          const [chofer, camion, acoplado] = await Promise.all([
            prisma.chofer.findUnique({ where: { id: equipo.driverId } }),
            prisma.camion.findUnique({ where: { id: equipo.truckId } }),
            equipo.trailerId 
              ? prisma.acoplado.findUnique({ where: { id: equipo.trailerId } })
              : null,
          ]);
          
          return {
            id: equipo.id,
            chofer: chofer ? {
              nombre: chofer.nombre,
              apellido: chofer.apellido,
              dni: chofer.dni,
            } : null,
            camion: camion ? {
              patente: camion.patente,
              marca: camion.marca,
              modelo: camion.modelo,
            } : null,
            acoplado: acoplado ? {
              patente: acoplado.patente,
            } : null,
            empresaTransportista: equipo.empresaTransportista,
            dador: equipo.dador,
            clientes: equipo.clientes.map(c => ({
              id: c.cliente.id,
              nombre: c.cliente.razonSocial,
            })),
            estado: equipo.estado,
          };
        })
      );
      
      res.json({
        success: true,
        data: equiposConDatos,
      });
    } catch (error) {
      AppLogger.error('Error obteniendo equipos transportista:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }
  
  /**
   * GET /api/portal-transportista/documentos/rechazados
   * Lista documentos rechazados para corregir
   */
  static async getDocumentosRechazados(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    
    try {
      const documentos = await prisma.document.findMany({
        where: {
          tenantEmpresaId: tenantId,
          status: 'RECHAZADO',
          archived: false,
        },
        include: {
          template: true,
        },
        orderBy: { reviewedAt: 'desc' },
      });
      
      // Enriquecer con nombre de entidad
      const documentosEnriquecidos = await Promise.all(
        documentos.map(async (doc) => {
          let entityName = '';
          
          switch (doc.entityType) {
            case 'CHOFER':
              const chofer = await prisma.chofer.findUnique({ where: { id: doc.entityId } });
              entityName = chofer ? `${chofer.nombre || ''} ${chofer.apellido || ''} (${chofer.dni})`.trim() : `Chofer ${doc.entityId}`;
              break;
            case 'CAMION':
              const camion = await prisma.camion.findUnique({ where: { id: doc.entityId } });
              entityName = camion?.patente || `Camión ${doc.entityId}`;
              break;
            case 'ACOPLADO':
              const acoplado = await prisma.acoplado.findUnique({ where: { id: doc.entityId } });
              entityName = acoplado?.patente || `Acoplado ${doc.entityId}`;
              break;
            case 'EMPRESA_TRANSPORTISTA':
              const empresa = await prisma.empresaTransportista.findUnique({ where: { id: doc.entityId } });
              entityName = empresa?.razonSocial || `Empresa ${doc.entityId}`;
              break;
          }
          
          return {
            id: doc.id,
            templateId: doc.templateId,
            templateName: doc.template.name,
            entityType: doc.entityType,
            entityId: doc.entityId,
            entityName,
            rechazadoAt: doc.reviewedAt?.toISOString(),
            motivoRechazo: doc.rejectionReason || 'Sin motivo especificado',
            reviewNotes: doc.reviewNotes,
          };
        })
      );
      
      res.json({
        success: true,
        data: documentosEnriquecidos,
      });
    } catch (error) {
      AppLogger.error('Error obteniendo documentos rechazados:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }
  
  /**
   * GET /api/portal-transportista/documentos/pendientes
   * Lista documentos pendientes de aprobación
   */
  static async getDocumentosPendientes(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    
    try {
      const documentos = await prisma.document.findMany({
        where: {
          tenantEmpresaId: tenantId,
          status: 'PENDIENTE_APROBACION',
          archived: false,
        },
        include: {
          template: true,
        },
        orderBy: { uploadedAt: 'desc' },
      });
      
      res.json({
        success: true,
        data: documentos.map(doc => ({
          id: doc.id,
          templateName: doc.template.name,
          entityType: doc.entityType,
          entityId: doc.entityId,
          uploadedAt: doc.uploadedAt.toISOString(),
          fileName: doc.fileName,
        })),
      });
    } catch (error) {
      AppLogger.error('Error obteniendo documentos pendientes:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }
}

