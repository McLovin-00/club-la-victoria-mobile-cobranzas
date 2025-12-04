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
   * Lista equipos asignados al cliente autenticado
   */
  static async getEquiposAsignados(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const user = req.user!;
    
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
      // Obtener equipos asignados al cliente
      const equiposCliente = await prisma.equipoCliente.findMany({
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
      
      // Obtener datos adicionales de cada equipo
      const equiposConEstado = await Promise.all(
        equiposCliente.map(async (ec) => {
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
      
      // Calcular resumen
      const resumen = {
        total: equiposConEstado.length,
        vigentes: equiposConEstado.filter(e => e.estadoCompliance === 'VIGENTE').length,
        proximosVencer: equiposConEstado.filter(e => e.estadoCompliance === 'PROXIMO_VENCER').length,
        vencidos: equiposConEstado.filter(e => e.estadoCompliance === 'VENCIDO').length,
        incompletos: equiposConEstado.filter(e => e.estadoCompliance === 'INCOMPLETO').length,
      };
      
      res.json({
        success: true,
        data: {
          equipos: equiposConEstado,
          resumen,
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
      
      // Obtener documentos aprobados de las entidades del equipo
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
        
        if (doc.expiresAt) {
          const expires = new Date(doc.expiresAt);
          if (expires < now) {
            estado = 'VENCIDO';
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
          uploadedAt: doc.uploadedAt.toISOString(),
        };
      });
      
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
        },
      });
    } catch (error) {
      AppLogger.error('Error obteniendo detalle de equipo:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }
  
  /**
   * GET /api/portal-cliente/equipos/:id/documentos/:docId/download
   * Descargar un documento específico
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
   * Descargar ZIP con todos los documentos del equipo
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
      
      // Obtener equipo
      const equipo = await prisma.equipo.findUnique({
        where: { id: equipoId },
      });
      
      if (!equipo || equipo.tenantEmpresaId !== tenantId) {
        return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
      }
      
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
      
      if (documentos.length === 0) {
        return res.status(404).json({ success: false, message: 'No hay documentos para descargar' });
      }
      
      // Preparar ZIP
      const archiver = (await import('archiver')).default;
      const archive = archiver('zip', { zlib: { level: 9 } });
      const { minioService } = await import('../services/minio.service');
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition', 
        `attachment; filename="equipo_${equipoId}_documentos.zip"`
      );
      
      archive.pipe(res);
      
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
          
          const stream = await minioService.getObject(bucketName, objectPath);
          const safeName = `${doc.entityType}_${doc.template.name}_${doc.id}.pdf`
            .replace(/[^a-z0-9_.-]/gi, '_');
          
          archive.append(stream as any, { name: safeName });
        } catch {
          AppLogger.warn(`No se pudo agregar doc ${doc.id} al ZIP`);
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

