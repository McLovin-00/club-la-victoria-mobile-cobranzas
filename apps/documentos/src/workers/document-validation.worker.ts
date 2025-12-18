import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { db } from '../config/database';
import { minioService } from '../services/minio.service';
import { flowiseService } from '../services/flowise.service';
import { webSocketService } from '../services/websocket.service';
import { queueService } from '../services/queue.service';
import { AppLogger } from '../config/logger';
import { getEnvironment } from '../config/environment';
import type { DocumentStatus } from '../../../node_modules/.prisma/documentos';

/**
 * Document Validation Worker - Procesamiento Asíncrono Elegante
 */

interface DocumentValidationJobData {
  documentId: number;
  filePath: string;
  templateName: string;
  entityType: string;
}

interface ValidationResult {
  isValid: boolean;
  extractedData?: any;
  confidence?: number;
  errors?: string[];
}

class DocumentValidationWorker {
  private worker: Worker;
  private redis: Redis;

  constructor() {
    const env = getEnvironment();
    
    // Configurar Redis para BullMQ (usar REDIS_URL)
    const url = env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(url, { maxRetriesPerRequest: null });

    // Crear worker para validación de documentos
    this.worker = new Worker(
      'document-validation',
      this.processValidation.bind(this),
      {
        connection: this.redis,
        concurrency: 2, // Reducir concurrencia para evitar sobrecarga
        removeOnComplete: { count: 10 }, // Mantener solo 10 jobs completados
        removeOnFail: { count: 50 }, // Mantener 50 jobs fallidos para debugging
      }
    );

    this.setupEventHandlers();
    AppLogger.info('🔄 Document Validation Worker iniciado');
  }

  /**
   * Procesar validación de documento
   */
  private async processValidation(job: Job<DocumentValidationJobData>): Promise<ValidationResult> {
    const { documentId, filePath, templateName, entityType } = job.data;
    
    AppLogger.info(`🔍 Procesando validación documento ${documentId}`, {
      templateName,
      entityType,
    });

    try {
      // Verificar al inicio que el documento existe
      const docCheck = await db.getClient().document.findUnique({
        where: { id: documentId },
        select: { id: true }
      });

      if (!docCheck) {
        AppLogger.warn(`⚠️ Documento ${documentId} ya fue eliminado, cancelando job`);
        return { isValid: false, errors: ['Documento eliminado'] };
      }

      // Actualizar estado a CLASIFICANDO
      await db.getClient().document.update({ where: { id: documentId }, data: { status: 'CLASIFICANDO' as DocumentStatus } });

      // Obtener URL firmada para el archivo
      const [bucketName, ...pathParts] = filePath.split('/');
      const objectPath = pathParts.join('/');
      const signedUrl = await minioService.getSignedUrl(bucketName, objectPath, 3600);

      // Clasificar usando Flowise (no aprobar automáticamente)
      const clf = await flowiseService.classifyDocument(signedUrl, templateName, { documentId });
      const rawSnippet = (() => { try { return clf?.raw ? JSON.stringify(clf.raw) : undefined; } catch { return undefined; } })();
      const logPayload = {
        documentId,
        entityTypeDetected: clf?.entityType,
        entityIdDetected: clf?.entityId,
        expirationDetected: clf?.expirationDate,
        documentTypeDetected: clf?.documentType,
        confidence: clf?.confidence,
        rawSnippet,
      };
      AppLogger.info(`🤖 Resultado Flowise (classifyDocument): ${JSON.stringify(logPayload)}`);

      // Persistiremos el ID detectado como string (para soportar CUIT completos y valores alfanuméricos)
      const detectedIdStr = (() => {
        const v = (clf as any).entityId ?? (clf as any).raw?.metadata?.aiParsed?.idEntidad;
        if (v === undefined || v === null) return null;
        return String(v).trim() || null;
      })();

      // Normalizar valores desconocidos para no violar enums/constraints
      const normalizeUnknown = (val: any): string | null => {
        if (val === undefined || val === null) return null;
        const s = String(val).trim();
        if (!s) return null;
        const u = s.toUpperCase();
        return (u === 'DESCONOCIDO' || u === 'UNKNOWN' || u === 'N/A' || u === '-') ? null : s;
      };
      const sanitizeEntityType = (val: any): any => {
        const s = String(val ?? '').trim().toUpperCase();
        return ['DADOR','EMPRESA_TRANSPORTISTA','CHOFER','CAMION','ACOPLADO'].includes(s) ? (s as any) : null;
      };
      const safeEntityType = sanitizeEntityType((clf as any)?.entityType);
      const safeDetectedId = normalizeUnknown(detectedIdStr);
      const safeDocType = normalizeUnknown((clf as any)?.documentType);
      const safeExp = (() => { const iso = (clf as any)?.expirationDate; if (!iso) return null; const d = new Date(iso); return isNaN(d.getTime()) ? null : d; })();

      // Verificar que el documento aún existe antes de persistir clasificación
      const docExists = await db.getClient().document.findUnique({
        where: { id: documentId },
        select: { id: true }
      });

      if (!docExists) {
        AppLogger.warn(`⚠️ Documento ${documentId} ya fue eliminado, cancelando job`);
        return { isValid: false, errors: ['Documento inexistente'] };
      }

      // Persistir clasificación
      await db.getClient().documentClassification.upsert({
        where: { documentId },
        create: {
          documentId,
          detectedEntityType: safeEntityType,
          detectedEntityId: safeDetectedId,
          detectedExpiration: safeExp,
          detectedDocumentType: safeDocType,
          confidence: clf.confidence || 0,
          aiResponse: clf.raw || null,
        },
        update: {
          detectedEntityType: safeEntityType,
          detectedEntityId: safeDetectedId,
          detectedExpiration: safeExp,
          detectedDocumentType: safeDocType,
          confidence: clf.confidence || 0,
          aiResponse: clf.raw || null,
        },
      });

      // Si Flowise detectó tipo de documento y entidad, ajustar plantilla del documento
      // IMPORTANTE: NO crear plantillas automáticamente - solo buscar existentes
      try {
        if (safeDocType && safeEntityType) {
          const tpl = await db.getClient().documentTemplate.findFirst({
            where: { name: safeDocType, entityType: safeEntityType as any } as any,
          });
          const templateIdToUse: number | null = (tpl as any)?.id ?? null;
          
          if (!templateIdToUse) {
            // Plantilla no existe - NO crear automáticamente
            // Loguear advertencia para que admin la cree manualmente si es necesaria
            AppLogger.warn(`⚠️ Plantilla no encontrada: ${safeDocType} (${safeEntityType}) - Documento ID: ${documentId}`);
          } else if (templateIdToUse) {
            // Verificar nuevamente que el documento existe antes de actualizar
            const stillExists = await db.getClient().document.findUnique({
              where: { id: documentId },
              select: { id: true }
            });
            if (stillExists) {
              await db.getClient().document.update({ where: { id: documentId }, data: { templateId: templateIdToUse } });
            }
          }
        }
      } catch { /* noop */ }

      // Marcar pendiente de aprobación humana (no rechazar automáticamente por "desconocido")
      // Verificar nuevamente que el documento existe antes de actualizar status
      const finalExists = await db.getClient().document.findUnique({
        where: { id: documentId },
        select: { id: true }
      });
      if (finalExists) {
        await db.getClient().document.update({ where: { id: documentId }, data: { status: 'PENDIENTE_APROBACION' as DocumentStatus } });
        
        // Encolar validación IA si está habilitada
        try {
          const { documentValidationService } = await import('../services/document-validation.service');
          if (documentValidationService.isEnabled()) {
            await queueService.addDocumentAIValidation({
              documentId,
              esRechequeo: false,
            });
            AppLogger.info(`🤖 Documento ${documentId} encolado para validación IA automática`);
          }
        } catch (aiError) {
          // No fallar el job de clasificación si la validación IA falla al encolar
          AppLogger.warn(`⚠️ Error encolando validación IA para documento ${documentId}:`, {
            error: (aiError as Error)?.message || 'Unknown',
          });
        }
      }

      return { isValid: true, extractedData: { classification: clf }, confidence: clf.confidence };
    } catch (error) {
      // Limpiar el error para evitar referencias circulares en logs
      const cleanError = {
        message: (error as any)?.message || 'Error desconocido',
        stack: (error as any)?.stack || 'Sin stack trace',
        code: (error as any)?.code || undefined,
        name: (error as any)?.name || 'Error'
      };
      AppLogger.error(`💥 Error validando documento ${documentId}:`, cleanError);
      await this.markDocumentAsRejected(documentId, ['Error interno de validación']);
      throw error;
    }
  }

  /**
   * Validar documento usando Flowise con fallback
   */
  private async validateWithFlowise(
    fileUrl: string,
    templateName: string,
    entityType: string
  ): Promise<ValidationResult> {
    try {
      // Intentar validación con Flowise
      const flowiseResult = await flowiseService.validateDocument(
        fileUrl,
        templateName,
        entityType
      );

      AppLogger.info(`🤖 Validación Flowise completada`, {
        isValid: flowiseResult.isValid,
        confidence: flowiseResult.confidence,
      });

      return {
        isValid: flowiseResult.isValid,
        extractedData: flowiseResult.extractedData,
        confidence: flowiseResult.confidence,
        errors: flowiseResult.errors,
      };
    } catch (error) {
      // Limpiar el error para evitar referencias circulares en logs
      const cleanError = {
        message: (error as any)?.message || 'Error desconocido',
        code: (error as any)?.code || undefined,
        name: (error as any)?.name || 'Error'
      };
      AppLogger.warn('⚠️ Flowise no disponible, usando simulación:', cleanError);
      return await this.simulateValidation(fileUrl, templateName);
    }
  }

  /**
   * Simulación de validación (fallback)
   */
  private async simulateValidation(
    fileUrl: string,
    templateName: string
  ): Promise<ValidationResult> {
    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simular diferentes resultados basados en el template
    const isValid = Math.random() > 0.15; // 85% de documentos válidos
    
    if (isValid) {
      return {
        isValid: true,
        extractedData: {
          templateName,
          extractedText: `Texto extraído simulado de ${templateName}`,
          confidence: Math.random() * 0.2 + 0.8, // 80-100% confianza
          processedAt: new Date().toISOString(),
          source: 'simulation',
        },
        confidence: Math.random() * 0.2 + 0.8,
      };
    } else {
      return {
        isValid: false,
        errors: [
          'Documento ilegible',
          'Información incompleta',
          'Formato no válido',
        ].slice(0, Math.floor(Math.random() * 2) + 1),
      };
    }
  }

  /**
   * Marcar documento como aprobado
   */
  private async markDocumentAsApproved(documentId: number, extractedData: any): Promise<void> {
    try {
      // Obtener información del documento antes de actualizar
      const documentBefore = await db.getClient().document.findUnique({
        where: { id: documentId },
        include: {
          template: true,
        },
      });

      // Mapear campos de IA al documento
      const ai = extractedData?.metadata?.aiParsed || {};

      // Intentar mapear Entidad/Id_Entidad → entidad real
      let newEntityType = documentBefore?.entityType;
      let newEntityId = documentBefore?.entityId;
      let newDadorId = (documentBefore as any)?.dadorCargaId ?? undefined;

      const normalizeDni = (dni: string) => (dni || '').replace(/\D+/g, '');
      const normalizeCuit = (cuit: string) => (cuit || '').replace(/\D+/g, '');
      const normalizePlate = (p: string) => (p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

      try {
        if (ai?.entidad && ai?.idEntidad && ai.entidad.toUpperCase() !== 'DESCONOCIDO' && ai.idEntidad !== 'Desconocido') {
          const entidad = ai.entidad.toUpperCase();
          const tenantId = (documentBefore as any).tenantEmpresaId;
          // Intentar resolver dador explícito si viene en AI; si no, usar el del documento
          const fallbackDadorId = (documentBefore as any).dadorCargaId as number;
          if (entidad === 'DADOR' || entidad === 'EMPRESA_TRANSPORTISTA') {
            // Crear/usar Empresa Transportista bajo el dador actual (fallback) usando CUIT
            const cuit = normalizeCuit(String(ai.idEntidad));
            const dadorId = fallbackDadorId;
            if (cuit && dadorId) {
              let empresa = await db.getClient().empresaTransportista.findFirst({ where: { tenantEmpresaId: tenantId, dadorCargaId: dadorId, cuit } });
              if (!empresa) {
                try {
                  const { EmpresaTransportistaService } = await import('../services/empresa-transportista.service');
                  empresa = await EmpresaTransportistaService.create({ tenantEmpresaId: tenantId, dadorCargaId: dadorId, cuit, razonSocial: `Empresa ${cuit}`, activo: true });
                } catch { /* noop */ }
              }
              if (empresa) { newEntityType = 'EMPRESA_TRANSPORTISTA' as any; newEntityId = (empresa as any).id; newDadorId = dadorId; }
            }
          } else if (entidad === 'CHOFER') {
            const dni = normalizeDni(String(ai.idEntidad));
            let chofer = await db.getClient().chofer.findFirst({ where: { tenantEmpresaId: tenantId, dniNorm: dni } });
            if (!chofer) {
              // Crear chofer si no existe
              try {
                const { MaestrosService } = await import('../services/maestros.service');
                chofer = await MaestrosService.createChofer({ tenantEmpresaId: tenantId, dadorCargaId: fallbackDadorId, dni, activo: true, phones: [] });
              } catch { /* noop */ }
            }
            if (chofer) { newEntityType = 'CHOFER' as any; newEntityId = (chofer as any).id; newDadorId = (chofer as any).dadorCargaId; }
          } else if (entidad === 'CAMION') {
            const pat = normalizePlate(String(ai.idEntidad));
            let camion = await db.getClient().camion.findFirst({ where: { tenantEmpresaId: tenantId, patenteNorm: pat } });
            if (!camion) {
              try {
                const { MaestrosService } = await import('../services/maestros.service');
                camion = await MaestrosService.createCamion({ tenantEmpresaId: tenantId, dadorCargaId: fallbackDadorId, patente: String(ai.idEntidad), activo: true });
              } catch { /* noop */ }
            }
            if (camion) { newEntityType = 'CAMION' as any; newEntityId = (camion as any).id; newDadorId = (camion as any).dadorCargaId; }
          } else if (entidad === 'ACOPLADO') {
            const pat = normalizePlate(String(ai.idEntidad));
            let acoplado = await db.getClient().acoplado.findFirst({ where: { tenantEmpresaId: tenantId, patenteNorm: pat } });
            if (!acoplado) {
              try {
                const { MaestrosService } = await import('../services/maestros.service');
                acoplado = await MaestrosService.createAcoplado({ tenantEmpresaId: tenantId, dadorCargaId: fallbackDadorId, patente: String(ai.idEntidad), activo: true });
              } catch { /* noop */ }
            }
            if (acoplado) { newEntityType = 'ACOPLADO' as any; newEntityId = (acoplado as any).id; newDadorId = (acoplado as any).dadorCargaId; }
          }
        }
      } catch {}

      // Fecha de vencimiento validada (rango)
      const aiVencIso = ai?.vencimientoDate;
      let safeExpiresAt: Date | undefined;
      if (aiVencIso) {
        const d = new Date(aiVencIso);
        const now = new Date();
        const max = new Date(now.getFullYear() + 15, 0, 1);
        if (!isNaN(d.getTime()) && d > new Date('1970-01-01') && d < max) {
          safeExpiresAt = d;
        }
      }

      const updatedDoc = await db.getClient().document.update({
        where: { id: documentId },
        data: {
          status: 'APROBADO' as DocumentStatus,
          validationData: {
            ...extractedData,
            ai: ai,
          },
          validatedAt: new Date(),
          // Si IA devolvió vencimiento válido, guardarlo
          expiresAt: safeExpiresAt ?? undefined,
          // Actualizar mapeo si se identificó
          entityType: newEntityType,
          entityId: newEntityId,
          dadorCargaId: newDadorId,
        },
        include: { template: true },
      });

      // Deprecación de duplicados: mismo entity, misma plantilla y mismo vencimiento → marcar DEPRECADO los anteriores APROBADO
      try {
        const { getEnvironment } = await import('../config/environment');
        const { minioService } = await import('../services/minio.service');
        const env = getEnvironment();
        if (updatedDoc.expiresAt) {
          const stale = await db.getClient().document.findMany({
            where: {
              id: { not: updatedDoc.id },
              tenantEmpresaId: (updatedDoc as any).tenantEmpresaId,
              entityType: updatedDoc.entityType as any,
              entityId: updatedDoc.entityId,
              templateId: updatedDoc.templateId,
              status: 'APROBADO' as any,
              expiresAt: updatedDoc.expiresAt,
            },
            select: { id: true, validationData: true },
          });
          for (const s of stale) {
            const prevVD = (s as any).validationData || {};
            await db.getClient().document.update({
              where: { id: s.id },
              data: {
                status: 'DEPRECADO' as any,
                validationData: {
                  ...prevVD,
                  replacedBy: updatedDoc.id,
                  replacedAt: new Date().toISOString(),
                },
              },
            });
          }
          if (stale.length > 0) {
            AppLogger.info(`♻️ Deprecados ${stale.length} documentos previos por duplicado de vencimiento`, { documentId: updatedDoc.id });
          }

          // Retención: mantener como máximo N versiones DEPRECADO por combinación (entity, template, expiresAt)
          const maxKeep = Math.max(0, Number(env.DOCS_MAX_DEPRECATED_VERSIONS || 2) || 2);
          if (maxKeep >= 0) {
            const deprecated = await db.getClient().document.findMany({
              where: {
                tenantEmpresaId: (updatedDoc as any).tenantEmpresaId,
                entityType: updatedDoc.entityType as any,
                entityId: updatedDoc.entityId,
                templateId: updatedDoc.templateId,
                status: 'DEPRECADO' as any,
                expiresAt: updatedDoc.expiresAt,
              },
              orderBy: { uploadedAt: 'desc' },
              select: { id: true, filePath: true, uploadedAt: true },
            });
            if (deprecated.length > maxKeep) {
              const toDelete = deprecated.slice(maxKeep); // más viejos
              for (const d of toDelete) {
                try {
                  // eliminar objeto de MinIO
                  if (d.filePath) {
                    const [bucketName, ...pathParts] = (d.filePath as string).split('/');
                    const objectPath = pathParts.join('/');
                    await minioService.deleteDocument(bucketName, objectPath);
                  }
                } catch (_e) {
                  AppLogger.warn('No se pudo eliminar objeto de MinIO para documento deprecado', { id: d.id });
                }
                // eliminar registro
                try {
                  await db.getClient().document.delete({ where: { id: d.id } });
                } catch (_e) {
                  AppLogger.warn('No se pudo eliminar registro de documento deprecado', { id: d.id });
                }
              }
              AppLogger.info(`🧹 Retención aplicada: eliminadas ${toDelete.length} versiones deprecadas antiguas`);
            }
          }
        }
      } catch (_e) {
        AppLogger.warn('No se pudo aplicar deprecación automática de duplicados');
      }

      // Notificar cambio de estado via WebSocket
      if (documentBefore) {
        webSocketService.notifyDocumentStatusChange({
          documentId,
          empresaId: (documentBefore as any).dadorCargaId ?? (documentBefore as any).empresaId,
          entityType: documentBefore.entityType,
          entityId: documentBefore.entityId,
          oldStatus: documentBefore.status,
          newStatus: 'APROBADO',
          templateName: documentBefore.template.name,
          fileName: documentBefore.fileName,
        });

        // Notificar actualización de dashboard
        webSocketService.notifyDashboardUpdate((documentBefore as any).dadorCargaId ?? (documentBefore as any).empresaId);
      }

      AppLogger.info(`✅ Documento ${documentId} aprobado automáticamente`);
    } catch (error) {
      // Limpiar el error para evitar referencias circulares en logs
      const cleanError = {
        message: (error as any)?.message || 'Error desconocido',
        stack: (error as any)?.stack || 'Sin stack trace',
        code: (error as any)?.code || undefined,
        name: (error as any)?.name || 'Error'
      };
      AppLogger.error('Error marcando documento como aprobado:', cleanError);
    }
  }

  /**
   * Marcar documento como rechazado
   */
  private async markDocumentAsRejected(documentId: number, errors?: string[]): Promise<void> {
    try {
      // Obtener información del documento antes de actualizar
      const documentBefore = await db.getClient().document.findUnique({
        where: { id: documentId },
        include: {
          template: true,
        },
      });

      if (!documentBefore) {
        AppLogger.warn(`⚠️ Documento ${documentId} ya fue eliminado, no se puede marcar como rechazado`);
        return;
      }

      await db.getClient().document.update({
        where: { id: documentId },
        data: {
          status: 'RECHAZADO' as DocumentStatus,
          validationData: {
            errors: errors || ['Error de validación'],
            rejectedAt: new Date().toISOString(),
          },
          validatedAt: new Date(),
        },
      });

      // Notificar cambio de estado via WebSocket
      if (documentBefore) {
        webSocketService.notifyDocumentStatusChange({
          documentId,
          empresaId: (documentBefore as any).dadorCargaId ?? (documentBefore as any).empresaId,
          entityType: documentBefore.entityType,
          entityId: documentBefore.entityId,
          oldStatus: documentBefore.status,
          newStatus: 'RECHAZADO',
          templateName: documentBefore.template.name,
          fileName: documentBefore.fileName,
          validationNotes: errors?.join(', '),
        });

        // Notificar actualización de dashboard
        webSocketService.notifyDashboardUpdate((documentBefore as any).dadorCargaId ?? (documentBefore as any).empresaId);
      }

      AppLogger.warn(`❌ Documento ${documentId} rechazado automáticamente`, { errors });
    } catch (error) {
      // Limpiar el error para evitar referencias circulares en logs
      const cleanError = {
        message: (error as any)?.message || 'Error desconocido',
        stack: (error as any)?.stack || 'Sin stack trace',
        code: (error as any)?.code || undefined,
        name: (error as any)?.name || 'Error'
      };
      AppLogger.error('Error marcando documento como rechazado:', cleanError);
    }
  }

  /**
   * Configurar event handlers
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      AppLogger.info(`🎉 Job ${job.id} completado exitosamente`);
    });

    this.worker.on('failed', (job, err) => {
      // Limpiar el error para evitar referencias circulares en logs
      const cleanError = {
        message: (err as any)?.message || 'Error desconocido',
        stack: (err as any)?.stack || 'Sin stack trace',
        code: (err as any)?.code || undefined,
        name: (err as any)?.name || 'Error'
      };
      AppLogger.error(`💥 Job ${job?.id} falló:`, cleanError);
    });

    this.worker.on('error', (err) => {
      // Limpiar el error para evitar referencias circulares en logs
      const cleanError = {
        message: (err as any)?.message || 'Error desconocido',
        stack: (err as any)?.stack || 'Sin stack trace',
        code: (err as any)?.code || undefined,
        name: (err as any)?.name || 'Error'
      };
      AppLogger.error('💥 Error en worker:', cleanError);
    });

    this.worker.on('ready', () => {
      AppLogger.info('🚀 Document Validation Worker listo');
    });
  }

  /**
   * Cerrar worker
   */
  public async close(): Promise<void> {
    await this.worker.close();
    await this.redis.quit();
    AppLogger.info('🔄 Document Validation Worker cerrado');
  }
}

// Exportar instancia singleton
let workerInstance: DocumentValidationWorker | null = null;

export const getDocumentValidationWorker = (): DocumentValidationWorker => {
  if (!workerInstance) {
    workerInstance = new DocumentValidationWorker();
  }
  return workerInstance;
};

export const closeDocumentValidationWorker = async (): Promise<void> => {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
};