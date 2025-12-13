import { Request, Response } from 'express';
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
        // Soportar múltiples valores separados por | para búsqueda OR
        const searchTerms = search.includes('|') 
          ? search.split('|').map(s => s.trim().toLowerCase()).filter(Boolean)
          : [search];
        
        equiposFiltrados = equiposFiltrados.filter(eq => {
          // Buscar coincidencia con CUALQUIERA de los términos
          return searchTerms.some(term => {
            // Normalizar patentes quitando guiones/espacios para comparar
            const patenteNorm = (p: string | undefined | null) => (p || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const termNorm = term.replace(/[^a-z0-9]/g, '');
            
            return (
              eq.identificador.toLowerCase().includes(term) ||
              patenteNorm(eq.camion?.patente).includes(termNorm) ||
              patenteNorm(eq.acoplado?.patente).includes(termNorm) ||
              eq.chofer?.dni?.toLowerCase().includes(term) ||
              eq.chofer?.nombre?.toLowerCase().includes(term) ||
              eq.chofer?.apellido?.toLowerCase().includes(term) ||
              eq.empresaTransportista?.razonSocial?.toLowerCase().includes(term) ||
              eq.empresaTransportista?.cuit?.includes(term)
            );
          });
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
      
      // Obtener TODOS los documentos aprobados y vencidos
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
          status: { in: ['APROBADO', 'VENCIDO'] }, // Incluir vencidos para mostrarlos
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
        
        // Si el documento tiene status VENCIDO en la BD, marcarlo como vencido
        if (doc.status === 'VENCIDO') {
          estado = 'VENCIDO';
          descargable = false;
        } else if (doc.expiresAt) {
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
      
      // Verificar si es vencido
      const esVencido = doc.status === 'VENCIDO' || (doc.expiresAt && new Date(doc.expiresAt) < new Date());
      const esPreview = req.query.preview === 'true';
      
      // Si está vencido y NO es preview, rechazar descarga
      if (esVencido && !esPreview) {
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
      
      // Preparar nombres de carpetas con prefijo numérico para orden
      const patenteCamion = (camion?.patente || equipo.truckPlateNorm || 'CAMION').replace(/[^a-zA-Z0-9]/g, '_');
      const cuitEmpresa = equipo.empresaTransportista?.cuit?.replace(/[^0-9]/g, '') || 'EMPRESA';
      const dniChofer = chofer?.dni?.replace(/[^0-9]/g, '') || 'CHOFER';
      const patenteAcoplado = (acoplado?.patente || equipo.trailerPlateNorm || 'ACOPLADO').replace(/[^a-zA-Z0-9]/g, '_');
      
      // Nombres de carpetas con prefijo para orden
      const folderNames: Record<string, string> = {
        'EMPRESA_TRANSPORTISTA': `1_Empresa_Transportista_${cuitEmpresa}`,
        'CHOFER': `2_Chofer_${dniChofer}`,
        'CAMION': `3_Tractor_${patenteCamion}`,
        'ACOPLADO': `4_Semi_Acoplado_${patenteAcoplado}`,
      };
      
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
          
          // Determinar carpeta según tipo de entidad (con prefijo numérico para orden)
          const subFolder = folderNames[doc.entityType] || 'otros';
          
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
  
  /**
   * POST /api/portal-cliente/equipos/bulk-download
   * Descarga ZIP de múltiples equipos asignados al cliente
   */
  static async bulkDownloadDocumentos(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const clienteId = (user as any).clienteId || user.empresaId;
    
    if (!clienteId) {
      return res.status(400).json({ success: false, message: 'Cliente no identificado' });
    }
    
    const equipoIds: number[] = req.body.equipoIds || [];
    if (!equipoIds.length) {
      return res.status(400).json({ success: false, message: 'Debe especificar equipoIds' });
    }
    
    try {
      // Verificar que todos los equipos están asignados al cliente
      const asignaciones = await prisma.equipoCliente.findMany({
        where: {
          clienteId,
          equipoId: { in: equipoIds },
          asignadoHasta: null,
        },
        select: { equipoId: true }
      });
      
      const equiposPermitidos = asignaciones.map(a => a.equipoId);
      const equiposOrdenados = equiposPermitidos.sort((a, b) => a - b);
      
      if (equiposOrdenados.length === 0) {
        return res.status(403).json({ success: false, message: 'No tiene acceso a estos equipos' });
      }
      
      // Obtener equipos con datos
      const equipos = await prisma.equipo.findMany({
        where: { id: { in: equiposOrdenados }, tenantEmpresaId: tenantId },
        include: { empresaTransportista: true }
      });
      
      // Preparar ZIP
      const archiver = (await import('archiver')).default;
      const archive = archiver('zip', { zlib: { level: 9 } });
      const { minioService } = await import('../services/minio.service');
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="documentos_${equiposOrdenados.length}_equipos.zip"`);
      archive.pipe(res);
      
      for (const equipo of equipos) {
        // Obtener datos relacionados
        const [chofer, camion, acoplado] = await Promise.all([
          prisma.chofer.findUnique({ where: { id: equipo.driverId } }),
          prisma.camion.findUnique({ where: { id: equipo.truckId } }),
          equipo.trailerId ? prisma.acoplado.findUnique({ where: { id: equipo.trailerId } }) : null
        ]);
        
        // Preparar nombres de carpetas
        const patenteCamion = (camion?.patente || equipo.truckPlateNorm || 'CAMION').replace(/[^a-zA-Z0-9]/g, '_');
        const cuitEmpresa = equipo.empresaTransportista?.cuit?.replace(/[^0-9]/g, '') || 'EMPRESA';
        const dniChofer = chofer?.dni?.replace(/[^0-9]/g, '') || 'CHOFER';
        const patenteAcoplado = (acoplado?.patente || equipo.trailerPlateNorm || 'ACOPLADO').replace(/[^a-zA-Z0-9]/g, '_');
        
        const folderNames: Record<string, string> = {
          'EMPRESA_TRANSPORTISTA': `1_Empresa_Transportista_${cuitEmpresa}`,
          'CHOFER': `2_Chofer_${dniChofer}`,
          'CAMION': `3_Tractor_${patenteCamion}`,
          'ACOPLADO': `4_Semi_Acoplado_${patenteAcoplado}`,
        };
        
        // Obtener documentos aprobados
        const entityConditions = [
          { entityType: 'CHOFER' as const, entityId: equipo.driverId },
          { entityType: 'CAMION' as const, entityId: equipo.truckId },
        ];
        if (equipo.trailerId) {
          entityConditions.push({ entityType: 'ACOPLADO' as any, entityId: equipo.trailerId });
        }
        if (equipo.empresaTransportistaId) {
          entityConditions.push({ entityType: 'EMPRESA_TRANSPORTISTA' as any, entityId: equipo.empresaTransportistaId });
        }
        
        const documentos = await prisma.document.findMany({
          where: {
            tenantEmpresaId: tenantId,
            status: 'APROBADO',
            OR: entityConditions
          },
          include: { template: true }
        });
        
        // Agregar documentos al ZIP
        for (const doc of documentos) {
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
            
            const subFolder = folderNames[doc.entityType] || 'otros';
            const stream = await minioService.getObject(bucketName, objectPath);
            const safeTemplateName = doc.template.name.replace(/[^a-zA-Z0-9\s_.-]/gi, '_').trim();
            const extension = doc.fileName.split('.').pop() || 'pdf';
            const fileName = `${safeTemplateName}.${extension}`;
            
            // Estructura: patente_equipo/subcarpeta/archivo
            const fullPath = `${patenteCamion}/${subFolder}/${fileName}`;
            archive.append(stream as any, { name: fullPath });
          } catch (err) {
            AppLogger.warn(`No se pudo agregar doc ${doc.id} al ZIP: ${err}`);
          }
        }
      }
      
      await archive.finalize();
    } catch (error) {
      AppLogger.error('Error generando ZIP masivo:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error interno' });
      }
    }
  }
  
  /**
   * POST /api/portal-cliente/equipos/bulk-download-form
   * Endpoint especial para descarga via formulario (sin middleware de auth)
   * Valida el token JWT manualmente desde el body
   * Acepta searchTerm para buscar todos los equipos que coincidan
   */
  static async bulkDownloadForm(req: Request, res: Response) {
    try {
      // Obtener token del body
      const token = req.body.token;
      if (!token) {
        return res.status(401).send('Token requerido');
      }
      
      // Validar token con clave pública RSA
      const jwt = require('jsonwebtoken');
      const fs = require('fs');
      let decoded: any;
      try {
        const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || '/keys/jwt_public.pem';
        const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
        decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
      } catch (e) {
        return res.status(401).send('Token inválido');
      }
      
      const tenantId = decoded.tenantEmpresaId || decoded.empresaId || 1;
      const clienteId = decoded.clienteId || decoded.empresaId;
      
      if (!clienteId) {
        return res.status(400).send('Cliente no identificado');
      }
      
      // Obtener parámetros de búsqueda
      const searchTerm = req.body.searchTerm || '';
      const estado = req.body.estado || '';
      
      // Buscar equipos asignados al cliente que coincidan con la búsqueda
      let equipoIds: number[] = [];
      
      // Obtener todas las asignaciones del cliente
      const asignaciones = await prisma.equipoCliente.findMany({
        where: {
          clienteId,
          asignadoHasta: null,
        },
        select: { equipoId: true }
      });
      
      const equiposDelCliente = asignaciones.map(a => a.equipoId);
      
      if (equiposDelCliente.length === 0) {
        return res.status(404).send('No hay equipos asignados');
      }
      
      // Si hay searchTerm, filtrar equipos
      if (searchTerm) {
        const searchValues = searchTerm.split('|').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
        
        // Buscar equipos que coincidan con patente o DNI
        const equiposFiltrados = await prisma.equipo.findMany({
          where: {
            id: { in: equiposDelCliente },
            tenantEmpresaId: tenantId,
            OR: [
              { truckPlateNorm: { in: searchValues } },
              { trailerPlateNorm: { in: searchValues } },
              { driverDniNorm: { in: searchValues } },
            ]
          },
          select: { id: true }
        });
        
        equipoIds = equiposFiltrados.map(e => e.id);
      } else {
        // Sin búsqueda, usar todos los equipos del cliente
        equipoIds = equiposDelCliente;
      }
      
      if (equipoIds.length === 0) {
        return res.status(404).send('No se encontraron equipos');
      }
      
      // Ordenar de menor a mayor
      equipoIds.sort((a, b) => a - b);
      
      // Limitar a 200 equipos máximo
      const equiposLimitados = equipoIds.slice(0, 200);
      
      // Obtener equipos con datos
      const equipos = await prisma.equipo.findMany({
        where: { id: { in: equiposLimitados }, tenantEmpresaId: tenantId },
        include: { empresaTransportista: true }
      });
      
      // Preparar ZIP
      const archiver = (await import('archiver')).default;
      const archive = archiver('zip', { zlib: { level: 9 } });
      const { minioService } = await import('../services/minio.service');
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="documentos_${equiposLimitados.length}_equipos.zip"`);
      archive.pipe(res);
      
      for (const equipo of equipos) {
        const [chofer, camion, acoplado] = await Promise.all([
          prisma.chofer.findUnique({ where: { id: equipo.driverId } }),
          prisma.camion.findUnique({ where: { id: equipo.truckId } }),
          equipo.trailerId ? prisma.acoplado.findUnique({ where: { id: equipo.trailerId } }) : null
        ]);
        
        const patenteCamion = (camion?.patente || equipo.truckPlateNorm || 'CAMION').replace(/[^a-zA-Z0-9]/g, '_');
        const cuitEmpresa = equipo.empresaTransportista?.cuit?.replace(/[^0-9]/g, '') || 'EMPRESA';
        const dniChofer = chofer?.dni?.replace(/[^0-9]/g, '') || 'CHOFER';
        const patenteAcoplado = (acoplado?.patente || equipo.trailerPlateNorm || 'ACOPLADO').replace(/[^a-zA-Z0-9]/g, '_');
        
        const folderNames: Record<string, string> = {
          'EMPRESA_TRANSPORTISTA': `1_Empresa_Transportista_${cuitEmpresa}`,
          'CHOFER': `2_Chofer_${dniChofer}`,
          'CAMION': `3_Tractor_${patenteCamion}`,
          'ACOPLADO': `4_Semi_Acoplado_${patenteAcoplado}`,
        };
        
        // Obtener documentos aprobados
        const entityConditions = [
          { entityType: 'CHOFER' as const, entityId: equipo.driverId },
          { entityType: 'CAMION' as const, entityId: equipo.truckId },
        ];
        if (equipo.trailerId) {
          entityConditions.push({ entityType: 'ACOPLADO' as any, entityId: equipo.trailerId });
        }
        if (equipo.empresaTransportistaId) {
          entityConditions.push({ entityType: 'EMPRESA_TRANSPORTISTA' as any, entityId: equipo.empresaTransportistaId });
        }
        
        const documentos = await prisma.document.findMany({
          where: {
            tenantEmpresaId: tenantId,
            status: 'APROBADO',
            OR: entityConditions
          },
          include: { template: true }
        });
        
        for (const doc of documentos) {
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
            
            const subFolder = folderNames[doc.entityType] || 'otros';
            const stream = await minioService.getObject(bucketName, objectPath);
            const safeTemplateName = doc.template.name.replace(/[^a-zA-Z0-9\s_.-]/gi, '_').trim();
            const extension = doc.fileName.split('.').pop() || 'pdf';
            const fileName = `${safeTemplateName}.${extension}`;
            
            const fullPath = `${patenteCamion}/${subFolder}/${fileName}`;
            archive.append(stream as any, { name: fullPath });
          } catch (err) {
            AppLogger.warn(`No se pudo agregar doc ${doc.id} al ZIP: ${err}`);
          }
        }
      }
      
      await archive.finalize();
    } catch (error) {
      AppLogger.error('Error en bulkDownloadForm:', error);
      if (!res.headersSent) {
        res.status(500).send('Error interno');
      }
    }
  }
}
