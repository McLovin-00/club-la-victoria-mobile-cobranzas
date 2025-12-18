import { Request, Response } from 'express';
import { ApprovalService } from '../services/approval.service';
import { webSocketService } from '../services/websocket.service';
import { AppLogger } from '../config/logger';
import { AuditService } from '../services/audit.service';

export class ApprovalController {
  static async getPendingDocuments(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const { entityType, minConfidence, maxConfidence, page, limit } = (req.query || {}) as any;
      const result = await ApprovalService.getPendingDocuments(tenantEmpresaId, {
        entityType,
        minConfidence: minConfidence ? parseFloat(minConfidence) : undefined,
        maxConfidence: maxConfidence ? parseFloat(maxConfidence) : undefined,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      AppLogger.error('ApprovalController.getPendingDocuments error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
    }
  }

  static async batchApprove(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const userId = ((req as any).user?.id ?? (req as any).user?.userId) as number | undefined;
      const userRole = ((req as any).user?.role) as string | undefined;
      const { ids, overrides } = (req.body || {}) as { ids: number[]; overrides?: { confirmedEntityType?: string; confirmedEntityId?: number; confirmedExpiration?: string; reviewNotes?: string } };
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no identificado', code: 'USER_NOT_IDENTIFIED' });
        return;
      }
      // Transportistas no pueden aprobar documentos
      if (userRole === 'TRANSPORTISTA' || userRole === 'EMPRESA_TRANSPORTISTA') {
        res.status(403).json({ 
          success: false, 
          message: 'Las Empresas Transportistas no tienen permiso para aprobar documentos. Contacte al Dador de Carga.',
          code: 'TRANSPORTISTA_CANNOT_APPROVE'
        });
        return;
      }
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, message: 'Debe enviar ids[]', code: 'BAD_REQUEST' });
        return;
      }
      const results: Array<{ id: number; ok: boolean; error?: string }> = [];
      const chunkSize = 50;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const ops = chunk.map(async (id) => {
          try {
            await ApprovalService.approveDocument(id, tenantEmpresaId, {
              reviewedBy: userId,
              confirmedEntityType: overrides?.confirmedEntityType,
              confirmedEntityId: overrides?.confirmedEntityId,
              confirmedExpiration: overrides?.confirmedExpiration ? new Date(overrides.confirmedExpiration) : undefined,
              reviewNotes: overrides?.reviewNotes,
            });
            results.push({ id, ok: true });
          } catch (e: any) {
            results.push({ id, ok: false, error: e?.message || 'Error' });
          }
        });
        await Promise.all(ops);
      }
      const approved = results.filter(r => r.ok).length;
      res.json({ success: true, approved, failed: results.length - approved, results });
      // Audit best-effort
      void AuditService.log({
        tenantEmpresaId: (req as any).tenantId,
        userId: (req as any).user?.userId ?? (req as any).user?.id,
        userRole: (req as any).user?.role,
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: res.statusCode,
        action: 'APPROVAL_BATCH_APPROVE',
        entityType: 'DOCUMENT',
        details: { ids, overrides },
      });
      // Refrescar vista materializada (best-effort)
      try { (await import('../services/performance.service')).performanceService.refreshMaterializedView(); } catch {}
    } catch (error) {
      AppLogger.error('ApprovalController.batchApprove error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
    }
  }
  static async getPendingDocument(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const id = Number((req.params as any).id);
      const document = await ApprovalService.getPendingDocument(id, tenantEmpresaId);
      if (!document) {
        res.status(404).json({ success: false, message: 'Documento no encontrado o no pendiente de aprobación', code: 'NOT_FOUND' });
        return;
      }
      // Generar URL de preview servida por el backend para evitar problemas de firmas/CORS en iframes
      // Usar X-Forwarded-Proto si está disponible (proxy/MikroTik), sino req.protocol
      const protocol = req.get('X-Forwarded-Proto') || req.protocol;
      const backendPreviewUrl = `${protocol}://${req.get('host')}/api/docs/documents/${document.id}/download?inline=1`;
      res.json({ success: true, data: { ...document, previewUrl: backendPreviewUrl } });
    } catch (error) {
      AppLogger.error('ApprovalController.getPendingDocument error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
    }
  }

  static async approveDocument(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const userId = ((req as any).user?.id ?? (req as any).user?.userId) as number | undefined;
      const userRole = ((req as any).user?.role) as string | undefined;
      const id = Number((req.params as any).id);
      const { confirmedEntityType, confirmedEntityId, confirmedExpiration, confirmedTemplateId, reviewNotes } = (req.body || {}) as any;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no identificado', code: 'USER_NOT_IDENTIFIED' });
        return;
      }
      // Transportistas no pueden aprobar documentos
      if (userRole === 'TRANSPORTISTA' || userRole === 'EMPRESA_TRANSPORTISTA') {
        res.status(403).json({ 
          success: false, 
          message: 'Las Empresas Transportistas no tienen permiso para aprobar documentos. Contacte al Dador de Carga.',
          code: 'TRANSPORTISTA_CANNOT_APPROVE'
        });
        return;
      }
      const doc = await ApprovalService.approveDocument(id, tenantEmpresaId, {
        reviewedBy: userId,
        confirmedEntityType,
        confirmedEntityId,
        confirmedExpiration: confirmedExpiration ? new Date(confirmedExpiration) : undefined,
        confirmedTemplateId,
        reviewNotes,
      });
      try {
        webSocketService.notifyDocumentApproved({ documentId: doc.id, empresaId: doc.dadorCargaId, expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null });
      } catch {}
      res.json({ success: true, data: doc, message: 'Documento aprobado' });
      // Audit best-effort
      void AuditService.log({
        tenantEmpresaId: (req as any).tenantId,
        userId: (req as any).user?.userId ?? (req as any).user?.id,
        userRole: (req as any).user?.role,
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: res.statusCode,
        action: 'APPROVAL_APPROVE',
        entityType: 'DOCUMENT',
        entityId: doc?.id,
        details: { confirmedEntityType, confirmedEntityId, confirmedExpiration, confirmedTemplateId },
      });
      try { (await import('../services/performance.service')).performanceService.refreshMaterializedView(); } catch {}
    } catch (error) {
      AppLogger.error('ApprovalController.approveDocument error:', error);
      const msg = (error as any)?.message || '';
      if (msg.includes('no encontrado')) {
        res.status(404).json({ success: false, message: msg, code: 'NOT_FOUND' });
        return;
      }
      res.status(500).json({ success: false, message: msg || 'Error interno del servidor', code: 'INTERNAL_ERROR' });
    }
  }

  static async rejectDocument(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const userId = ((req as any).user?.id ?? (req as any).user?.userId) as number | undefined;
      const userRole = ((req as any).user?.role) as string | undefined;
      const id = Number((req.params as any).id);
      const { reason, reviewNotes } = (req.body || {}) as any;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no identificado', code: 'USER_NOT_IDENTIFIED' });
        return;
      }
      // Transportistas no pueden rechazar documentos
      if (userRole === 'TRANSPORTISTA' || userRole === 'EMPRESA_TRANSPORTISTA') {
        res.status(403).json({ 
          success: false, 
          message: 'Las Empresas Transportistas no tienen permiso para rechazar documentos. Contacte al Dador de Carga.',
          code: 'TRANSPORTISTA_CANNOT_REJECT'
        });
        return;
      }
      const doc = await ApprovalService.rejectDocument(id, tenantEmpresaId, { reviewedBy: userId, reason, reviewNotes });
      res.json({ success: true, data: doc, message: 'Documento rechazado' });
      // Audit best-effort
      void AuditService.log({
        tenantEmpresaId: (req as any).tenantId,
        userId: (req as any).user?.userId ?? (req as any).user?.id,
        userRole: (req as any).user?.role,
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: res.statusCode,
        action: 'APPROVAL_REJECT',
        entityType: 'DOCUMENT',
        entityId: doc?.id,
        details: { reason, reviewNotes },
      });
      try { (await import('../services/performance.service')).performanceService.refreshMaterializedView(); } catch {}
    } catch (error) {
      AppLogger.error('ApprovalController.rejectDocument error:', error);
      const msg = (error as any)?.message || '';
      if (msg.includes('no encontrado')) {
        res.status(404).json({ success: false, message: msg, code: 'NOT_FOUND' });
        return;
      }
      res.status(500).json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
    }
  }

  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const stats = await ApprovalService.getApprovalStats(tenantEmpresaId);
      res.json({ success: true, data: stats });
    } catch (error) {
      AppLogger.error('ApprovalController.getStats error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
    }
  }

  /**
   * Rechequear documento con IA
   * POST /approval/pending/:id/recheck
   */
  static async recheckDocument(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const userId = ((req as any).user?.id ?? (req as any).user?.userId) as number | undefined;
      const id = Number((req.params as any).id);

      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no identificado', code: 'USER_NOT_IDENTIFIED' });
        return;
      }

      // Importar servicios necesarios
      const { queueService } = await import('../services/queue.service');
      const { documentValidationService } = await import('../services/document-validation.service');
      const { prisma } = await import('../config/database');

      // Verificar si la validación IA está habilitada
      if (!documentValidationService.isEnabled()) {
        res.status(400).json({ 
          success: false, 
          message: 'Validación con IA no está habilitada', 
          code: 'VALIDATION_DISABLED' 
        });
        return;
      }

      // Verificar que el documento existe y pertenece al tenant
      const document = await prisma.document.findFirst({
        where: {
          id,
          tenantEmpresaId,
          status: 'PENDIENTE_APROBACION',
        },
        select: { id: true, status: true },
      });

      if (!document) {
        res.status(404).json({ 
          success: false, 
          message: 'Documento no encontrado o no está pendiente de aprobación', 
          code: 'NOT_FOUND' 
        });
        return;
      }

      // Encolar para rechequeo
      const jobId = await queueService.addDocumentAIValidation({
        documentId: id,
        solicitadoPor: userId,
        esRechequeo: true,
      });

      // Registrar en auditoría
      void AuditService.log({
        tenantEmpresaId,
        userId,
        userRole: (req as any).user?.role,
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: 200,
        action: 'APPROVAL_RECHECK_REQUESTED',
        entityType: 'DOCUMENT',
        entityId: id,
        details: { jobId },
      });

      res.json({
        success: true,
        message: 'Documento encolado para rechequeo con IA',
        data: { documentId: id, jobId },
      });
    } catch (error) {
      AppLogger.error('ApprovalController.recheckDocument error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
    }
  }
}


