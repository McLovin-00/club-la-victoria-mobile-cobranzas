import { db } from '../config/database';
import type { DocumentStatus, Prisma } from '.prisma/documentos';

export class ApprovalService {
  static async getPendingDocuments(
    tenantEmpresaId: number,
    filters: { entityType?: string; minConfidence?: number; maxConfidence?: number; page?: number; limit?: number } = {}
  ): Promise<{ data: any[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    const { entityType, minConfidence, maxConfidence, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = {
      tenantEmpresaId,
      status: 'PENDIENTE_APROBACION' as DocumentStatus,
      classification: {
        ...(entityType && { detectedEntityType: entityType as any }),
        ...(minConfidence !== undefined && { confidence: { gte: minConfidence } }),
        ...(maxConfidence !== undefined && { confidence: { lte: maxConfidence } }),
        reviewedAt: null,
      },
    };

    const [documents, total] = await Promise.all([
      db.getClient().document.findMany({
        where,
        include: { template: { select: { id: true, name: true, entityType: true } }, classification: true },
        skip,
        take: limit,
        orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
      }),
      db.getClient().document.count({ where }),
    ]);

    // Enriquecer documentos con entityNaturalId (CUIT/DNI/Patente)
    const enrichedDocs = await Promise.all(
      documents.map(async (doc) => {
        let entityNaturalId: string | null = null;
        try {
          switch (doc.entityType) {
            case 'EMPRESA_TRANSPORTISTA': {
              const empresa = await db.getClient().empresaTransportista.findUnique({
                where: { id: doc.entityId },
                select: { cuit: true },
              });
              entityNaturalId = empresa?.cuit || null;
              break;
            }
            case 'CHOFER': {
              const chofer = await db.getClient().chofer.findUnique({
                where: { id: doc.entityId },
                select: { dni: true },
              });
              entityNaturalId = chofer?.dni || null;
              break;
            }
            case 'CAMION': {
              const camion = await db.getClient().camion.findUnique({
                where: { id: doc.entityId },
                select: { patente: true },
              });
              entityNaturalId = camion?.patente || null;
              break;
            }
            case 'ACOPLADO': {
              const acoplado = await db.getClient().acoplado.findUnique({
                where: { id: doc.entityId },
                select: { patente: true },
              });
              entityNaturalId = acoplado?.patente || null;
              break;
            }
          }
        } catch {
          // Si falla, entityNaturalId queda null
        }
        return { ...doc, entityNaturalId };
      })
    );

    return { data: enrichedDocs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getPendingDocument(documentId: number, tenantEmpresaId: number): Promise<any | null> {
    const document = await db.getClient().document.findFirst({
      where: { id: documentId, tenantEmpresaId, status: 'PENDIENTE_APROBACION' as DocumentStatus },
      include: { template: true, classification: true },
    });
    
    if (!document) return null;
    
    // Obtener el identificador natural de la entidad (CUIT, DNI o Patente)
    let entityNaturalId: string | null = null;
    
    try {
      switch (document.entityType) {
        case 'EMPRESA_TRANSPORTISTA': {
          const empresa = await db.getClient().empresaTransportista.findUnique({
            where: { id: document.entityId },
            select: { cuit: true },
          });
          entityNaturalId = empresa?.cuit || null;
          break;
        }
        case 'CHOFER': {
          const chofer = await db.getClient().chofer.findUnique({
            where: { id: document.entityId },
            select: { dni: true },
          });
          entityNaturalId = chofer?.dni || null;
          break;
        }
        case 'CAMION': {
          const camion = await db.getClient().camion.findUnique({
            where: { id: document.entityId },
            select: { patente: true },
          });
          entityNaturalId = camion?.patente || null;
          break;
        }
        case 'ACOPLADO': {
          const acoplado = await db.getClient().acoplado.findUnique({
            where: { id: document.entityId },
            select: { patente: true },
          });
          entityNaturalId = acoplado?.patente || null;
          break;
        }
      }
    } catch (e) {
      // Si falla la búsqueda del identificador natural, no es crítico
      console.warn('No se pudo obtener el identificador natural de la entidad:', e);
    }
    
    return {
      ...document,
      entityNaturalId, // CUIT, DNI o Patente según el tipo de entidad
    };
  }

  static async approveDocument(
    documentId: number,
    tenantEmpresaId: number,
    reviewData: { reviewedBy: number; confirmedEntityType?: string; confirmedEntityId?: number | string; confirmedExpiration?: Date; confirmedTemplateId?: number; reviewNotes?: string }
  ): Promise<any> {
    return db.getClient().$transaction(async (tx) => {
      const document = await tx.document.findFirst({
        where: { id: documentId, tenantEmpresaId, status: 'PENDIENTE_APROBACION' as DocumentStatus },
        include: { classification: true, template: true },
      });
      if (!document || !document.classification) throw new Error('Documento no encontrado o no está pendiente de aprobación');

      const finalEntityType = (reviewData.confirmedEntityType || (document.classification as any).detectedEntityType || document.entityType) as any;

      const normalizeDigits = (s: string): string => s.replace(/\D+/g, '');
      const normalizePlate = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const isInt32 = (n: number): boolean => Number.isInteger(n) && n >= -2147483648 && n <= 2147483647;

      // Resolver ID interno según tipo de entidad y valor provisto/detectado
      const proposedVal: unknown = (reviewData.confirmedEntityId !== undefined && reviewData.confirmedEntityId !== null)
        ? reviewData.confirmedEntityId
        : (document.classification as any).detectedEntityId;

      let finalEntityId: number | null = null;
      const tenantId = document.tenantEmpresaId as number;
      const fallbackDadorId = (document as any).dadorCargaId as number;

      const ensureEmpresaTransportista = async (cuitRaw: string): Promise<number | null> => {
        const cuit = normalizeDigits(String(cuitRaw));
        if (!cuit) return null;
        let emp = await tx.empresaTransportista.findFirst({ where: { tenantEmpresaId: tenantId, dadorCargaId: fallbackDadorId, cuit } });
        if (!emp) {
          try {
            emp = await tx.empresaTransportista.create({ data: { tenantEmpresaId: tenantId, dadorCargaId: fallbackDadorId, cuit, razonSocial: `Empresa ${cuit}`, activo: true } });
          } catch { /* noop */ }
        }
        return emp ? (emp as any).id : null;
      };

      const ensureChofer = async (dniRaw: string): Promise<number | null> => {
        const dni = normalizeDigits(String(dniRaw));
        if (!dni) return null;
        let ch = await tx.chofer.findFirst({ where: { tenantEmpresaId: tenantId, dniNorm: dni } });
        if (!ch) {
          try { ch = await tx.chofer.create({ data: { tenantEmpresaId: tenantId, dadorCargaId: fallbackDadorId, dni, dniNorm: dni, activo: true, phones: [] } }); } catch { /* noop */ }
        }
        return ch ? (ch as any).id : null;
      };

      const ensureCamion = async (plateRaw: string): Promise<number | null> => {
        const patNorm = normalizePlate(String(plateRaw));
        if (!patNorm) return null;
        let cm = await tx.camion.findFirst({ where: { tenantEmpresaId: tenantId, patenteNorm: patNorm } });
        if (!cm) {
          try { cm = await tx.camion.create({ data: { tenantEmpresaId: tenantId, dadorCargaId: fallbackDadorId, patente: String(plateRaw), patenteNorm: patNorm, activo: true } }); } catch { /* noop */ }
        }
        return cm ? (cm as any).id : null;
      };

      const ensureAcoplado = async (plateRaw: string): Promise<number | null> => {
        const patNorm = normalizePlate(String(plateRaw));
        if (!patNorm) return null;
        let ac = await tx.acoplado.findFirst({ where: { tenantEmpresaId: tenantId, patenteNorm: patNorm } });
        if (!ac) {
          try { ac = await tx.acoplado.create({ data: { tenantEmpresaId: tenantId, dadorCargaId: fallbackDadorId, patente: String(plateRaw), patenteNorm: patNorm, activo: true } }); } catch { /* noop */ }
        }
        return ac ? (ac as any).id : null;
      };

      if (typeof proposedVal === 'number') {
        finalEntityId = isInt32(proposedVal) ? Math.trunc(proposedVal) : null;
      } else if (typeof proposedVal === 'string') {
        // Intentar resolver según tipo
        if (finalEntityType === 'EMPRESA_TRANSPORTISTA') {
          finalEntityId = await ensureEmpresaTransportista(proposedVal);
        } else if (finalEntityType === 'CHOFER') {
          // Si es puro número corto, podría ser ID interno; probar búsqueda directa si cabe en int32
          const digits = normalizeDigits(proposedVal);
          if (digits && digits.length <= 9) {
            const n = Number(digits);
            if (isInt32(n)) {
              const exists = await tx.chofer.findFirst({ where: { tenantEmpresaId: tenantId, id: n } });
              finalEntityId = exists ? n : null;
            }
          }
          if (!finalEntityId) finalEntityId = await ensureChofer(proposedVal);
        } else if (finalEntityType === 'CAMION') {
          finalEntityId = await ensureCamion(proposedVal);
        } else if (finalEntityType === 'ACOPLADO') {
          finalEntityId = await ensureAcoplado(proposedVal);
        }
      }

      const finalExpiration = reviewData.confirmedExpiration || (document.classification as any).detectedExpiration || undefined;
      if (!finalEntityType) throw new Error('Debe seleccionar la entidad');
      if (!finalEntityId) throw new Error('Debe confirmarse la identidad de la entidad antes de aprobar');
      const tplIdCandidate = reviewData.confirmedTemplateId ?? (document.templateId || undefined);
      if (!tplIdCandidate) throw new Error('Debe seleccionar el tipo de documento');
      if (!finalExpiration) throw new Error('Debe especificar la fecha de vencimiento');

      await tx.documentClassification.update({
        where: { documentId },
        data: { reviewedAt: new Date(), reviewedBy: reviewData.reviewedBy, reviewNotes: reviewData.reviewNotes },
      });

      // Intentar mapear automáticamente la plantilla si no se confirmó una
      let newTemplateId: number | undefined = tplIdCandidate;
      if (!newTemplateId) {
        const detectedName = (document.classification as any)?.detectedDocumentType as string | undefined;
        if (detectedName) {
          const tpl = await tx.documentTemplate.findFirst({ where: { name: detectedName, entityType: finalEntityType } as any });
          if (tpl) newTemplateId = (tpl as any).id;
        }
      }

      const updated = await tx.document.update({
        where: { id: documentId },
        data: {
          status: 'APROBADO' as DocumentStatus,
          validatedAt: new Date(),
          entityType: finalEntityType as any,
          entityId: finalEntityId,
          expiresAt: finalExpiration,
          ...(newTemplateId ? { templateId: newTemplateId } : {}),
        },
        include: { template: true },
      });

      // Renombrar archivo en MinIO al aprobar: TIPO_ENTIDAD_IDDOCUMENTO.pdf (usar DNI/CUIT/patente detectada o confirmada)
      try {
        const docBefore = await tx.document.findUnique({ where: { id: updated.id }, select: { filePath: true, dadorCargaId: true } });
        if (docBefore?.filePath) {
          const [bucketName, ...pathParts] = (docBefore.filePath as string).split('/');
          const oldPath = pathParts.join('/');
          const norm = (s: string) => String(s)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
          const digits = (s: string) => String(s).replace(/\D+/g, '');
          const plate = (s: string) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
          const rawDetected = (document.classification as any)?.detectedEntityId as string | undefined;
          const rawConfirmed = (reviewData.confirmedEntityId as any);
          let idForName: string | undefined;
          const et = updated.entityType as any as string;
          if (rawConfirmed !== undefined && rawConfirmed !== null && String(rawConfirmed).trim() !== '') {
            idForName = (et === 'CAMION' || et === 'ACOPLADO') ? plate(String(rawConfirmed)) : digits(String(rawConfirmed));
          } else if (rawDetected) {
            idForName = (et === 'CAMION' || et === 'ACOPLADO') ? plate(String(rawDetected)) : digits(String(rawDetected));
          }
          if (!idForName || idForName.length === 0) idForName = String(updated.entityId);
          const fileName = `${norm(updated.template?.name || 'DOC')}_${norm(updated.entityType as any)}_${idForName}.pdf`;
          const baseDir = oldPath.split('/').slice(0, -1).join('/');
          const newPath = `${baseDir}/${fileName}`;
          // Mover en MinIO
          const { minioService } = await import('./minio.service');
          await minioService.moveObject(bucketName, oldPath, newPath);
          // Actualizar DB
          await tx.document.update({ where: { id: updated.id }, data: { fileName, filePath: `${bucketName}/${newPath}` } });
        }
      } catch { /* noop */ }

      // Deprecación y retención tras aprobar manualmente
      try {
        const { getEnvironment } = await import('../config/environment');
        const { minioService } = await import('./minio.service');
        const env = getEnvironment();

        const tplId = updated.templateId;
        const exp = updated.expiresAt || null;
        if (tplId && exp) {
          // Marcar anteriores aprobados con misma combinación como DEPRECADO
          const stale = await tx.document.findMany({
            where: {
              tenantEmpresaId: updated.tenantEmpresaId as number,
              id: { not: updated.id },
              entityType: updated.entityType as any,
              entityId: updated.entityId,
              templateId: tplId,
              status: 'APROBADO' as any,
              expiresAt: exp,
            },
            select: { id: true, validationData: true },
          });
          for (const s of stale) {
            await tx.document.update({
              where: { id: s.id },
              data: {
                status: 'DEPRECADO' as any,
                validationData: { ...(s as any).validationData, replacedBy: updated.id, replacedAt: new Date().toISOString() },
              },
            });
          }

          // Retención: mantener N DEPRECADO más recientes
          const maxKeep = Math.max(0, Number(env.DOCS_MAX_DEPRECATED_VERSIONS || 2) || 2);
          if (maxKeep >= 0) {
            const deprecated = await tx.document.findMany({
              where: {
                tenantEmpresaId: updated.tenantEmpresaId as number,
                entityType: updated.entityType as any,
                entityId: updated.entityId,
                templateId: tplId,
                status: 'DEPRECADO' as any,
                expiresAt: exp,
              },
              orderBy: { uploadedAt: 'desc' },
              select: { id: true, filePath: true },
            });
            if (deprecated.length > maxKeep) {
              const toDelete = deprecated.slice(maxKeep);
              for (const d of toDelete) {
                try {
                  if (d.filePath) {
                    const [bucketName, ...pathParts] = (d.filePath as string).split('/');
                    const objectPath = pathParts.join('/');
                    await minioService.deleteDocument(bucketName, objectPath);
                  }
                } catch {}
                try { await tx.document.delete({ where: { id: d.id } }); } catch {}
              }
            }
          }
        }
      } catch {}

      return updated;
    });
  }

  static async rejectDocument(
    documentId: number,
    tenantEmpresaId: number,
    reviewData: { reviewedBy: number; reason: string; reviewNotes?: string }
  ): Promise<any> {
    return db.getClient().$transaction(async (tx) => {
      const document = await tx.document.findFirst({
        where: { id: documentId, tenantEmpresaId, status: 'PENDIENTE_APROBACION' as DocumentStatus },
        include: { classification: true },
      });
      if (!document) throw new Error('Documento no encontrado o no está pendiente de aprobación');

      if (document.classification) {
        await tx.documentClassification.update({
          where: { documentId },
          data: { reviewedAt: new Date(), reviewedBy: reviewData.reviewedBy, reviewNotes: `RECHAZADO: ${reviewData.reason}${reviewData.reviewNotes ? ` | ${reviewData.reviewNotes}` : ''}` },
        });
      }

      return tx.document.update({ where: { id: documentId }, data: { status: 'RECHAZADO' as DocumentStatus, validatedAt: new Date() } });
    });
  }

  static async getApprovalStats(tenantEmpresaId: number) {
    const stats = await db.getClient().document.groupBy({ by: ['status'], where: { tenantEmpresaId }, _count: { status: true } });
    const result = { pendienteAprobacion: 0, aprobados: 0, rechazados: 0, total: 0 } as any;
    stats.forEach((s) => {
      const c = (s as any)._count.status;
      result.total += c;
      if (s.status === ('PENDIENTE_APROBACION' as any)) result.pendienteAprobacion = c;
      else if (s.status === ('APROBADO' as any)) result.aprobados = c;
      else if (s.status === ('RECHAZADO' as any)) result.rechazados = c;
    });
    return result;
  }
}


