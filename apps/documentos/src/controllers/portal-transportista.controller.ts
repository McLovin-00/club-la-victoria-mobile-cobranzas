import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';

// Respuesta vacía reutilizable
const EMPTY_ENTIDADES_RESPONSE = {
  success: true,
  data: {
    empresas: [],
    choferes: [],
    camiones: [],
    acoplados: [],
    contadores: { pendientes: 0, rechazados: 0, porVencer: 0 },
  },
};

// Roles que ven todo el tenant
const ADMIN_ROLES = ['ADMIN', 'SUPERADMIN', 'ADMIN_INTERNO'];

// Helper: construir filtro de equipos según rol
function buildEquipoFilter(tenantId: number, user: any): { where: any; isEmpty: boolean } {
  const where: any = { tenantEmpresaId: tenantId };
  
  if (user.role === 'TRANSPORTISTA' || user.role === 'EMPRESA_TRANSPORTISTA' || user.role === 'CHOFER') {
    if (!user.empresaTransportistaId) return { where, isEmpty: true };
    where.empresaTransportistaId = user.empresaTransportistaId;
  } else if (user.role === 'DADOR_DE_CARGA' && user.dadorCargaId) {
    where.dadorCargaId = user.dadorCargaId;
  }
  
  return { where, isEmpty: false };
}

// Helper: transformar equipo a formato de respuesta
function transformEquipoResponse(equipo: any, chofer: any, camion: any, acoplado: any) {
  return {
    id: equipo.id,
    chofer: chofer ? { nombre: chofer.nombre, apellido: chofer.apellido, dni: chofer.dni } : null,
    camion: camion ? { patente: camion.patente, marca: camion.marca, modelo: camion.modelo } : null,
    acoplado: acoplado ? { patente: acoplado.patente } : null,
    empresaTransportista: equipo.empresaTransportista,
    dador: equipo.dador,
    clientes: equipo.clientes.map((c: any) => ({ id: c.cliente.id, nombre: c.cliente.razonSocial })),
    estado: equipo.estado,
  };
}

/**
 * Obtiene el nombre descriptivo de una entidad
 */
async function getEntityNameForPortal(entityType: string, entityId: number): Promise<string> {
  switch (entityType) {
    case 'CHOFER': {
      const chofer = await prisma.chofer.findUnique({ where: { id: entityId } });
      return chofer ? `${chofer.nombre || ''} ${chofer.apellido || ''} (${chofer.dni})`.trim() : `Chofer ${entityId}`;
    }
    case 'CAMION': {
      const camion = await prisma.camion.findUnique({ where: { id: entityId } });
      return camion?.patente || `Camión ${entityId}`;
    }
    case 'ACOPLADO': {
      const acoplado = await prisma.acoplado.findUnique({ where: { id: entityId } });
      return acoplado?.patente || `Acoplado ${entityId}`;
    }
    case 'EMPRESA_TRANSPORTISTA': {
      const empresa = await prisma.empresaTransportista.findUnique({ where: { id: entityId } });
      return empresa?.razonSocial || `Empresa ${entityId}`;
    }
    default:
      return `${entityType} ${entityId}`;
  }
}

/**
 * Obtiene el dadorCargaId según el rol del usuario
 */
async function getDadorCargaIdForUser(user: any): Promise<number | null> {
  if (user.dadorCargaId) return user.dadorCargaId;
  if (user.empresaTransportistaId) {
    const empresa = await prisma.empresaTransportista.findUnique({
      where: { id: user.empresaTransportistaId },
      select: { dadorCargaId: true },
    });
    return empresa?.dadorCargaId || null;
  }
  return null;
}

/**
 * Portal Transportista Controller
 * Endpoints para empresas transportistas
 */
export class PortalTransportistaController {
  /**
   * Construir filtro de empresas según rol del usuario
   */
  private static buildEmpresasFilter(tenantId: number, user: any): { where: any; isEmpty: boolean } {
    const where: any = { tenantEmpresaId: tenantId };

    // Admins ven todo
    if (ADMIN_ROLES.includes(user.role)) {
      return { where, isEmpty: false };
    }

    // Transportista/EmpresaTransportista: solo su empresa
    if (user.role === 'TRANSPORTISTA' || user.role === 'EMPRESA_TRANSPORTISTA' || user.role === 'CHOFER') {
      if (!user.empresaTransportistaId) return { where, isEmpty: true };
      where.id = user.empresaTransportistaId;
      return { where, isEmpty: false };
    }

    // Dador de carga: empresas de su dador
    if (user.role === 'DADOR_DE_CARGA' && user.dadorCargaId) {
      where.dadorCargaId = user.dadorCargaId;
    }

    return { where, isEmpty: false };
  }

  /**
   * GET /api/portal-transportista/mis-entidades
   * Obtiene las entidades (choferes, camiones, acoplados) del transportista
   */
  static async getMisEntidades(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const user = req.user!;
    
    try {
      const { where: whereEmpresas, isEmpty } = PortalTransportistaController.buildEmpresasFilter(tenantId, user);

      if (isEmpty) {
        return res.json(EMPTY_ENTIDADES_RESPONSE);
      }
      
      const empresas = await prisma.empresaTransportista.findMany({
        where: whereEmpresas,
        select: {
          id: true,
          razonSocial: true,
          cuit: true,
          dadorCargaId: true,
        },
      });
      
      if (empresas.length === 0) {
        return res.json(EMPTY_ENTIDADES_RESPONSE);
      }
      
      const dadorIds = [...new Set(empresas.map(e => e.dadorCargaId))];
      const empresaIds = empresas.map(e => e.id);
      
      // Base where para entidades - filtrar por empresa transportista si el usuario es transportista/chofer
      const baseWhereEntidades: any = {
        tenantEmpresaId: tenantId,
        activo: true,
      };
      
      if (user.role === 'TRANSPORTISTA' || user.role === 'EMPRESA_TRANSPORTISTA' || user.role === 'CHOFER') {
        // Filtrar por empresas transportistas del usuario
        baseWhereEntidades.empresaTransportistaId = { in: empresaIds };
      } else if (user.role === 'DADOR_DE_CARGA') {
        // Filtrar por dador de carga
        baseWhereEntidades.dadorCargaId = { in: dadorIds };
      } else {
        // Admin ve todo del tenant (filtrar por dadores de las empresas encontradas)
        baseWhereEntidades.dadorCargaId = { in: dadorIds };
      }
      
      // Obtener choferes
      const choferes = await prisma.chofer.findMany({
        where: baseWhereEntidades,
        select: {
          id: true,
          dni: true,
          nombre: true,
          apellido: true,
          dadorCargaId: true,
          empresaTransportistaId: true,
        },
        orderBy: { apellido: 'asc' },
      });
      
      // Obtener camiones
      const camiones = await prisma.camion.findMany({
        where: baseWhereEntidades,
        select: {
          id: true,
          patente: true,
          marca: true,
          modelo: true,
          dadorCargaId: true,
          empresaTransportistaId: true,
        },
        orderBy: { patente: 'asc' },
      });
      
      // Obtener acoplados
      const acoplados = await prisma.acoplado.findMany({
        where: baseWhereEntidades,
        select: {
          id: true,
          patente: true,
          tipo: true,
          dadorCargaId: true,
          empresaTransportistaId: true,
        },
        orderBy: { patente: 'asc' },
      });
      
      // Contar documentos pendientes, rechazados y por vencer
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      // Base where para documentos - Document no tiene empresaTransportistaId, usar dadorCargaId
      const baseWhereDocumentos: any = {
        tenantEmpresaId: tenantId,
        archived: false,
        dadorCargaId: { in: dadorIds },
      };
      
      const [pendientes, rechazados, porVencer] = await Promise.all([
        prisma.document.count({
          where: {
            ...baseWhereDocumentos,
            status: 'PENDIENTE_APROBACION',
          },
        }),
        prisma.document.count({
          where: {
            ...baseWhereDocumentos,
            status: 'RECHAZADO',
          },
        }),
        prisma.document.count({
          where: {
            ...baseWhereDocumentos,
            status: 'APROBADO',
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
    const user = req.user!;
    
    try {
      const { where, isEmpty } = buildEquipoFilter(tenantId, user);
      if (isEmpty) return res.json({ success: true, data: [] });
      
      const equipos = await prisma.equipo.findMany({
        where,
        include: {
          empresaTransportista: true,
          dador: true,
          clientes: { where: { asignadoHasta: null }, include: { cliente: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      
      const equiposConDatos = await Promise.all(
        equipos.map(async (equipo) => {
          const [chofer, camion, acoplado] = await Promise.all([
            prisma.chofer.findUnique({ where: { id: equipo.driverId } }),
            prisma.camion.findUnique({ where: { id: equipo.truckId } }),
            equipo.trailerId ? prisma.acoplado.findUnique({ where: { id: equipo.trailerId } }) : null,
          ]);
          return transformEquipoResponse(equipo, chofer, camion, acoplado);
        })
      );
      
      res.json({ success: true, data: equiposConDatos });
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
    const user = req.user!;
    
    try {
      const whereDocumentos: any = { tenantEmpresaId: tenantId, status: 'RECHAZADO', archived: false };
      
      // Filtrar según rol
      const isTransportistaRole = ['TRANSPORTISTA', 'EMPRESA_TRANSPORTISTA', 'CHOFER'].includes(user.role);
      if (isTransportistaRole || user.role === 'DADOR_DE_CARGA') {
        const dadorCargaId = await getDadorCargaIdForUser(user);
        if (!dadorCargaId && isTransportistaRole) {
          return res.json({ success: true, data: [] });
        }
        if (dadorCargaId) whereDocumentos.dadorCargaId = dadorCargaId;
      }
      // Admin/Superadmin ven todo
      
      const documentos = await prisma.document.findMany({
        where: whereDocumentos,
        include: { template: true },
        orderBy: { reviewedAt: 'desc' },
      });
      
      // Enriquecer con nombre de entidad
      const documentosEnriquecidos = await Promise.all(
        documentos.map(async (doc) => ({
          id: doc.id,
          templateId: doc.templateId,
          templateName: doc.template.name,
          entityType: doc.entityType,
          entityId: doc.entityId,
          entityName: await getEntityNameForPortal(doc.entityType, doc.entityId),
          rechazadoAt: doc.reviewedAt?.toISOString(),
          motivoRechazo: doc.rejectionReason || 'Sin motivo especificado',
          reviewNotes: doc.reviewNotes,
        }))
      );
      
      res.json({ success: true, data: documentosEnriquecidos });
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
    const user = req.user!;
    
    try {
      // Filtrar según el rol del usuario - Document usa dadorCargaId, no empresaTransportistaId
      const whereDocumentos: any = {
        tenantEmpresaId: tenantId,
        status: 'PENDIENTE_APROBACION',
        archived: false,
      };
      
      if (user.role === 'TRANSPORTISTA' || user.role === 'EMPRESA_TRANSPORTISTA' || user.role === 'CHOFER') {
        // Usar dadorCargaId del usuario o buscar desde empresa transportista
        if (user.dadorCargaId) {
          whereDocumentos.dadorCargaId = user.dadorCargaId;
        } else if (user.empresaTransportistaId) {
          const empresa = await prisma.empresaTransportista.findUnique({
            where: { id: user.empresaTransportistaId },
            select: { dadorCargaId: true },
          });
          if (empresa) {
            whereDocumentos.dadorCargaId = empresa.dadorCargaId;
          } else {
            return res.json({ success: true, data: [] });
          }
        } else {
          return res.json({ success: true, data: [] });
        }
      } else if (user.role === 'DADOR_DE_CARGA') {
        if (user.dadorCargaId) {
          whereDocumentos.dadorCargaId = user.dadorCargaId;
        }
      }
      // Admin/Superadmin ven todo
      
      const documentos = await prisma.document.findMany({
        where: whereDocumentos,
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

