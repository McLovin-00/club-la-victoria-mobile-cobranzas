import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import { createError } from '../middlewares/error.middleware';
import { ComplianceService } from '../services/compliance.service';

/**
 * Portal Cliente Controller
 * Endpoints de solo lectura para clientes
 */
export class PortalClienteController {
  /**
   * GET /api/portal-cliente/equipos
   * Lista equipos asignados al cliente autenticado con paginación del lado del servidor
   * Query params: page, limit, search, estado
   */
  static async getEquiposAsignados(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const user = req.user!;
    
    // Parámetros de paginación y filtro
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const search = (req.query.search as string)?.trim().toLowerCase() || '';
    const estado = (req.query.estado as string) || '';
    
    // El clienteId viene del usuario autenticado
    // Por ahora asumimos que empresaId es el clienteId para rol CLIENTE
    const clienteId = (user as any).clienteId || user.empresaId;
    
    if (!clienteId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cliente no identificado' 
      });
    }
    
    try {
      // Obtener TODOS los equipos asignados para calcular el resumen global
      const todosEquiposCliente = await prisma.equipoCliente.findMany({
        where: {
          clienteId,
          asignadoHasta: null, // Solo asignaciones vigentes
          equipo: { tenantEmpresaId: tenantId },
        },
        include: {
          equipo: {
            include: {
              empresaTransportista: true,
              dador: true,
            },
          },
        },
      });
      
      // Obtener datos adicionales de TODOS los equipos para calcular resumen
      const todosEquiposConEstado = await Promise.all(
        todosEquiposCliente.map(async (ec) => {
          const equipo = ec.equipo;
          
          // Obtener chofer, camion, acoplado
          const [chofer, camion, acoplado] = await Promise.all([
            prisma.chofer.findUnique({ where: { id: equipo.driverId } }),
            prisma.camion.findUnique({ where: { id: equipo.truckId } }),
            equipo.trailerId 
              ? prisma.acoplado.findUnique({ where: { id: equipo.trailerId } })
              : null,
          ]);
          
          // Calcular estado de compliance
          let estadoCompliance: 'VIGENTE' | 'PROXIMO_VENCER' | 'VENCIDO' | 'INCOMPLETO' = 'VIGENTE';
          let proximoVencimiento: Date | null = null;
          
          try {
            const compliance = await ComplianceService.evaluateEquipoClienteDetailed(
              equipo.id,
              clienteId
            );
            
            const vencidos = compliance.filter(c => c.state === 'VENCIDO');
            const faltantes = compliance.filter(c => c.state === 'FALTANTE');
            const proximosVencer = compliance.filter(c => c.state === 'PROXIMO_VENCER');
            
            if (vencidos.length > 0) {
              estadoCompliance = 'VENCIDO';
            } else if (faltantes.length > 0) {
              estadoCompliance = 'INCOMPLETO';
            } else if (proximosVencer.length > 0) {
              estadoCompliance = 'PROXIMO_VENCER';
              // Encontrar la fecha más próxima
              const fechas = proximosVencer
                .filter(c => c.doc?.expiresAt)
                .map(c => new Date(c.doc!.expiresAt!));
              if (fechas.length > 0) {
                proximoVencimiento = fechas.reduce((a, b) => a < b ? a : b);
              }
            }
          } catch {
            estadoCompliance = 'INCOMPLETO';
          }
          
          return {
            id: equipo.id,
            identificador: `${camion?.patente || equipo.truckPlateNorm}-${chofer?.dni || equipo.driverDniNorm}`,
            camion: camion ? { 
              patente: camion.patente,
              marca: camion.marca,
              modelo: camion.modelo,
            } : null,
            acoplado: acoplado ? {
              patente: acoplado.patente,
            } : null,
            chofer: chofer ? {
              nombre: chofer.nombre,
              apellido: chofer.apellido,
              dni: chofer.dni,
            } : null,
            empresaTransportista: equipo.empresaTransportista ? {
              razonSocial: equipo.empresaTransportista.razonSocial,
              cuit: equipo.empresaTransportista.cuit,
            } : null,
            estadoCompliance,
            proximoVencimiento: proximoVencimiento?.toISOString() || null,
            asignadoDesde: ec.asignadoDesde,
          };
        })
      );
      
      // Calcular resumen global (sin filtros)
      const resumen = {
        total: todosEquiposConEstado.length,
        vigentes: todosEquiposConEstado.filter(e => e.estadoCompliance === 'VIGENTE').length,
        proximosVencer: todosEquiposConEstado.filter(e => e.estadoCompliance === 'PROXIMO_VENCER').length,
        vencidos: todosEquiposConEstado.filter(e => e.estadoCompliance === 'VENCIDO').length,
        incompletos: todosEquiposConEstado.filter(e => e.estadoCompliance === 'INCOMPLETO').length,
      };
      
      // Aplicar filtros de búsqueda y estado
      let equiposFiltrados = todosEquiposConEstado;
      
      if (search) {
        equiposFiltrados = equiposFiltrados.filter(eq => {
          return (
            eq.identificador.toLowerCase().includes(search) ||
            eq.camion?.patente?.toLowerCase().includes(search) ||
            eq.acoplado?.patente?.toLowerCase().includes(search) ||
            eq.chofer?.dni?.toLowerCase().includes(search) ||
            eq.chofer?.nombre?.toLowerCase().includes(search) ||
            eq.chofer?.apellido?.toLowerCase().includes(search) ||
            eq.empresaTransportista?.razonSocial?.toLowerCase().includes(search) ||
            eq.empresaTransportista?.cuit?.includes(search)
          );
        });
      }
      
      if (estado && estado !== 'TODOS') {
        equiposFiltrados = equiposFiltrados.filter(eq => eq.estadoCompliance === estado);
      }
      
      // Paginación
      const total = equiposFiltrados.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const equiposPaginados = equiposFiltrados.slice(offset, offset + limit);
      
      res.json({
        success: true,
        data: {
          equipos: equiposPaginados,
          resumen,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      AppLogger.error('Error obteniendo equipos de cliente:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }
  
  /**
   * GET /api/portal-cliente/equipos/:id
   * Detalle de equipo con documentos (solo lectura)
   * Incluye documentos vencidos pero marcados como no descargables
   */
  static async getEquipoDetalle(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const equipoId = Number(req.params.id);
    
    const clienteId = (user as any).clienteId || user.empresaId;
    
    if (!clienteId) {
      return res.status(400).json({ success: false, message: 'Cliente no identificado' });
    }
    
    try {
      // Verificar que el equipo está asignado al cliente
      const asignacion = await prisma.equipoCliente.findFirst({
        where: {
          equipoId,
          clienteId,
          asignadoHasta: null,
        },
      });
      
      if (!asignacion) {
        return res.status(403).json({ 
          success: false, 
          message: 'No tiene acceso a este equipo' 
        });
      }
      
      // Obtener equipo con datos
      const equipo = await prisma.equipo.findUnique({
        where: { id: equipoId },
        include: {
          empresaTransportista: true,
          dador: true,
        },
      });
      
      if (!equipo || equipo.tenantEmpresaId !== tenantId) {
        return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
      }
      
      // Obtener chofer, camion, acoplado
      const [chofer, camion, acoplado] = await Promise.all([
        prisma.chofer.findUnique({ where: { id: equipo.driverId } }),
        prisma.camion.findUnique({ where: { id: equipo.truckId } }),
        equipo.trailerId 
          ? prisma.acoplado.findUnique({ where: { id: equipo.trailerId } })
          : null,
      ]);
      
      // Obtener TODOS los documentos aprobados (incluyendo vencidos)
      const entityConditions = [
        { entityType: 'CHOFER' as const, entityId: equipo.driverId },
        { entityType: 'CAMION' as const, entityId: equipo.truckId },
      ];
      
      if (equipo.trailerId) {
        entityConditions.push({ entityType: 'ACOPLADO' as const, entityId: equipo.trailerId });
      }
      
      if (equipo.empresaTransportistaId) {
        entityConditions.push({ 
          entityType: 'EMPRESA_TRANSPORTISTA' as const, 
          entityId: equipo.empresaTransportistaId 
        });
      }
      
      const documentos = await prisma.document.findMany({
        where: {
          tenantEmpresaId: tenantId,
          status: 'APROBADO',
          archived: false,
          OR: entityConditions,
        },
        include: {
          template: true,
        },
        orderBy: [
          { entityType: 'asc' },
          { templateId: 'asc' },
          { uploadedAt: 'desc' },
        ],
      });
      
      // Agrupar por template (quedarse con el más reciente)
      const docsPorTemplate = new Map<string, typeof documentos[0]>();
      for (const doc of documentos) {
        const key = `${doc.entityType}-${doc.entityId}-${doc.templateId}`;
        if (!docsPorTemplate.has(key)) {
          docsPorTemplate.set(key, doc);
        }
      }
      
      // Formatear documentos para respuesta
      const now = new Date();
      const documentosFormateados = Array.from(docsPorTemplate.values()).map(doc => {
        let estado: 'VIGENTE' | 'PROXIMO_VENCER' | 'VENCIDO' = 'VIGENTE';
        let descargable = true;
        
        if (doc.expiresAt) {
          const expires = new Date(doc.expiresAt);
          if (expires < now) {
            estado = 'VENCIDO';
            descargable = false; // Documentos vencidos no se pueden descargar
          } else {
            const diasRestantes = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diasRestantes <= 30) {
              estado = 'PROXIMO_VENCER';
            }
          }
        }
        
        // Nombre de entidad
        let entityName = '';
        switch (doc.entityType) {
          case 'CHOFER':
            entityName = chofer ? `${chofer.nombre || ''} ${chofer.apellido || ''} (${chofer.dni})`.trim() : `Chofer ${doc.entityId}`;
            break;
          case 'CAMION':
            entityName = camion?.patente || `Camión ${doc.entityId}`;
            break;
          case 'ACOPLADO':
            entityName = acoplado?.patente || `Acoplado ${doc.entityId}`;
            break;
          case 'EMPRESA_TRANSPORTISTA':
            entityName = equipo.empresaTransportista?.razonSocial || `Empresa ${doc.entityId}`;
            break;
        }
        
        return {
          id: doc.id,
          templateName: doc.template.name,
          entityType: doc.entityType,
          entityName,
          status: doc.status,
          expiresAt: doc.expiresAt?.toISOString() || null,
          estado,
          descargable, // Nuevo campo: indica si se puede descargar
          uploadedAt: doc.uploadedAt.toISOString(),
        };
      });
      
      // Calcular resumen de estados
      const resumenDocs = {
        total: documentosFormateados.length,
        vigentes: documentosFormateados.filter(d => d.estado === 'VIGENTE').length,
        proximosVencer: documentosFormateados.filter(d => d.estado === 'PROXIMO_VENCER').length,
        vencidos: documentosFormateados.filter(d => d.estado === 'VENCIDO').length,
      };
      
      // Verificar si hay documentos descargables para el botón de descarga masiva
      const hayDocumentosDescargables = documentosFormateados.some(d => d.descargable);
      
      res.json({
        success: true,
        data: {
          equipo: {
            id: equipo.id,
            camion: camion ? {
              patente: camion.patente,
              marca: camion.marca,
              modelo: camion.modelo,
            } : null,
            acoplado: acoplado ? {
              patente: acoplado.patente,
              tipo: acoplado.tipo,
            } : null,
            chofer: chofer ? {
              nombre: chofer.nombre,
              apellido: chofer.apellido,
              dni: chofer.dni,
            } : null,
            empresaTransportista: equipo.empresaTransportista ? {
              razonSocial: equipo.empresaTransportista.razonSocial,
              cuit: equipo.empresaTransportista.cuit,
            } : null,
            asignadoDesde: asignacion.asignadoDesde,
          },
          documentos: documentosFormateados,
          resumenDocs,
          hayDocumentosDescargables,
        },
      });
    } catch (error) {
      AppLogger.error('Error obteniendo detalle de equipo:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }
  
  /**
   * GET /api/portal-cliente/equipos/:id/documentos/:docId/download
   * Descargar un documento específico (solo si no está vencido)
   */
  static async downloadDocumento(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const equipoId = Number(req.params.id);
    const docId = Number(req.params.docId);
    
    const clienteId = (user as any).clienteId || user.empresaId;
    
    try {
      // Verificar acceso al equipo
      const asignacion = await prisma.equipoCliente.findFirst({
        where: {
          equipoId,
          clienteId,
          asignadoHasta: null,
        },
      });
      
      if (!asignacion) {
        return res.status(403).json({ success: false, message: 'No tiene acceso' });
      }
      
      // Obtener documento
      const doc = await prisma.document.findUnique({
        where: { id: docId },
      });
      
      if (!doc || doc.tenantEmpresaId !== tenantId || doc.status !== 'APROBADO') {
        return res.status(404).json({ success: false, message: 'Documento no encontrado' });
      }
      
      // Verificar que el documento no esté vencido
      if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) {
        return res.status(403).json({ 
          success: false, 
          message: 'No se puede descargar un documento vencido' 
        });
      }
      
      // Descargar desde MinIO
      const { minioService } = await import('../services/minio.service');
      
      let bucketName: string;
      let objectPath: string;
      
      if (doc.filePath.includes('/')) {
        const idx = doc.filePath.indexOf('/');
        bucketName = doc.filePath.slice(0, idx);
        objectPath = doc.filePath.slice(idx + 1);
      } else {
        bucketName = `docs-t${tenantId}`;
        objectPath = doc.filePath;
      }
      
      const stream = await minioService.getObject(bucketName, objectPath);
      
      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
      
      (stream as any).pipe(res);
    } catch (error) {
      AppLogger.error('Error descargando documento:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }
  
  /**
   * GET /api/portal-cliente/equipos/:id/download-all
   * Descargar ZIP con todos los documentos vigentes del equipo
   * Estructura: patente_camion/CUIT_empresa/, patente_camion/DNI_chofer/, 
   *             patente_camion/patente_camion/, patente_camion/patente_acoplado/
   */
  static async downloadAllDocumentos(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const equipoId = Number(req.params.id);
    
    const clienteId = (user as any).clienteId || user.empresaId;
    
    try {
      // Verificar acceso
      const asignacion = await prisma.equipoCliente.findFirst({
        where: {
          equipoId,
          clienteId,
          asignadoHasta: null,
        },
      });
      
      if (!asignacion) {
        return res.status(403).json({ success: false, message: 'No tiene acceso' });
      }
      
      // Obtener equipo con datos relacionados
      const equipo = await prisma.equipo.findUnique({
        where: { id: equipoId },
        include: {
          empresaTransportista: true,
        },
      });
      
      if (!equipo || equipo.tenantEmpresaId !== tenantId) {
        return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
      }
      
      // Obtener chofer, camion, acoplado
      const [chofer, camion, acoplado] = await Promise.all([
        prisma.chofer.findUnique({ where: { id: equipo.driverId } }),
        prisma.camion.findUnique({ where: { id: equipo.truckId } }),
        equipo.trailerId 
          ? prisma.acoplado.findUnique({ where: { id: equipo.trailerId } })
          : null,
      ]);
      
      // Obtener documentos
      const entityConditions = [
        { entityType: 'CHOFER' as const, entityId: equipo.driverId },
        { entityType: 'CAMION' as const, entityId: equipo.truckId },
      ];
      
      if (equipo.trailerId) {
        entityConditions.push({ entityType: 'ACOPLADO' as const, entityId: equipo.trailerId });
      }
      
      if (equipo.empresaTransportistaId) {
        entityConditions.push({ 
          entityType: 'EMPRESA_TRANSPORTISTA' as const, 
          entityId: equipo.empresaTransportistaId 
        });
      }
      
      const now = new Date();
      const documentos = await prisma.document.findMany({
        where: {
          tenantEmpresaId: tenantId,
          status: 'APROBADO',
          archived: false,
          OR: entityConditions,
        },
        include: { template: true },
        orderBy: { uploadedAt: 'desc' },
      });
      
      // Filtrar solo documentos vigentes (no vencidos)
      const documentosVigentes = documentos.filter(doc => {
        if (!doc.expiresAt) return true; // Sin fecha de vencimiento = vigente
        return new Date(doc.expiresAt) >= now;
      });
      
      if (documentosVigentes.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'No hay documentos vigentes para descargar' 
        });
      }
      
      // Preparar nombres de carpetas
      const patenteCamion = (camion?.patente || equipo.truckPlateNorm || 'CAMION').replace(/[^a-zA-Z0-9]/g, '_');
      const cuitEmpresa = equipo.empresaTransportista?.cuit?.replace(/[^0-9]/g, '') || 'EMPRESA';
      const dniChofer = chofer?.dni?.replace(/[^0-9]/g, '') || 'CHOFER';
      const patenteAcoplado = (acoplado?.patente || equipo.trailerPlateNorm || 'ACOPLADO').replace(/[^a-zA-Z0-9]/g, '_');
      
      // Preparar ZIP
      const archiver = (await import('archiver')).default;
      const archive = archiver('zip', { zlib: { level: 9 } });
      const { minioService } = await import('../services/minio.service');
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition', 
        `attachment; filename="${patenteCamion}_documentacion.zip"`
      );
      
      archive.pipe(res);
      
      // Agrupar documentos por entidad para evitar duplicados
      const docsPorEntidad = new Map<string, typeof documentosVigentes>();
      for (const doc of documentosVigentes) {
        const key = `${doc.entityType}-${doc.entityId}`;
        if (!docsPorEntidad.has(key)) {
          docsPorEntidad.set(key, []);
        }
        docsPorEntidad.get(key)!.push(doc);
      }
      
      for (const doc of documentosVigentes) {
        try {
          let bucketName: string;
          let objectPath: string;
          
          if (doc.filePath.includes('/')) {
            const idx = doc.filePath.indexOf('/');
            bucketName = doc.filePath.slice(0, idx);
            objectPath = doc.filePath.slice(idx + 1);
          } else {
            bucketName = `docs-t${tenantId}`;
            objectPath = doc.filePath;
          }
          
          // Determinar carpeta según tipo de entidad
          let subFolder = '';
          switch (doc.entityType) {
            case 'EMPRESA_TRANSPORTISTA':
              subFolder = cuitEmpresa;
              break;
            case 'CHOFER':
              subFolder = dniChofer;
              break;
            case 'CAMION':
              subFolder = patenteCamion;
              break;
            case 'ACOPLADO':
              subFolder = patenteAcoplado;
              break;
          }
          
          const stream = await minioService.getObject(bucketName, objectPath);
          const safeTemplateName = doc.template.name.replace(/[^a-zA-Z0-9\s_.-]/gi, '_').trim();
          const extension = doc.fileName.split('.').pop() || 'pdf';
          const fileName = `${safeTemplateName}.${extension}`;
          
          // Estructura: patente_camion/subcarpeta/archivo
          const fullPath = `${patenteCamion}/${subFolder}/${fileName}`;
          
          archive.append(stream as any, { name: fullPath });
        } catch (err) {
          AppLogger.warn(`No se pudo agregar doc ${doc.id} al ZIP: ${err}`);
        }
      }
      
      await archive.finalize();
    } catch (error) {
      AppLogger.error('Error generando ZIP:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error interno' });
      }
    }
  }
}
