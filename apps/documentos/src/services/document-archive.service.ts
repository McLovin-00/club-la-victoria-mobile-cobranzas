import { AppLogger } from '../config/logger';

type ArchiveReason = 'CLIENTE_REMOVIDO' | 'ENTIDAD_CAMBIADA' | 'MANUAL' | 'REEMPLAZADO';

type ArchiveParams = {
  documentIds: number[];
  reason: ArchiveReason;
  userId: number;
};

type RestoreParams = {
  entityType: string;
  entityId: number;
  templateIds: number[];
};

/**
 * DocumentArchiveService
 * Maneja el archivado y restauración de documentos
 */
export class DocumentArchiveService {
  /**
   * Archiva documentos (no los elimina, solo los marca como archivados)
   */
  static async archiveDocuments(params: ArchiveParams): Promise<void> {
    const { documentIds, reason, userId } = params;

    if (documentIds.length === 0) return;

    try {
      const { db } = await import('../config/database');
      const client: any = db.getClient?.();

      if (client?.document?.updateMany) {
        await client.document.updateMany({
          where: { id: { in: documentIds } },
          data: {
            archived: true,
            archivedAt: new Date(),
            archivedBy: userId,
            archiveReason: reason,
          },
        });

        AppLogger.info('📦 DOCS_ARCHIVED', { documentIds, reason, userId });
      }
    } catch (err) {
      AppLogger.error('Error archivando documentos', { error: err, params });
      throw err;
    }
  }

  /**
   * Restaura documentos archivados para una entidad
   * Útil cuando se re-vincula una entidad que ya tenía documentos
   */
  static async restoreDocuments(params: RestoreParams): Promise<unknown[]> {
    const { entityType, entityId, templateIds } = params;

    try {
      const { db } = await import('../config/database');
      const client: any = db.getClient?.();

      if (!client?.document) return [];

      // Buscar documentos archivados que coincidan
      const archivedDocs = await client.document.findMany({
        where: {
          entityType,
          entityId,
          templateId: { in: templateIds },
          archived: true,
        },
        orderBy: { uploadedAt: 'desc' },
      });

      if (archivedDocs.length === 0) return [];

      // Restaurar el más reciente de cada template
      const toRestore: number[] = [];
      const seenTemplates = new Set<number>();

      for (const doc of archivedDocs) {
        if (!seenTemplates.has(doc.templateId)) {
          seenTemplates.add(doc.templateId);
          toRestore.push(doc.id);
        }
      }

      if (toRestore.length > 0) {
        await client.document.updateMany({
          where: { id: { in: toRestore } },
          data: {
            archived: false,
            archivedAt: null,
            archivedBy: null,
            archiveReason: null,
          },
        });

        AppLogger.info('📦 DOCS_RESTORED', { entityType, entityId, restoredIds: toRestore });
      }

      return archivedDocs.filter((d: any) => toRestore.includes(d.id));
    } catch (err) {
      AppLogger.error('Error restaurando documentos', { error: err, params });
      throw err;
    }
  }

  /**
   * Obtiene documentos archivados para una entidad
   */
  static async getArchivedDocuments(params: { entityType: string; entityId: number }): Promise<unknown[]> {
    try {
      const { db } = await import('../config/database');
      const client: any = db.getClient?.();

      if (!client?.document) return [];

      return await client.document.findMany({
        where: {
          entityType: params.entityType,
          entityId: params.entityId,
          archived: true,
        },
        include: { template: true },
        orderBy: { uploadedAt: 'desc' },
      });
    } catch {
      return [];
    }
  }

  /**
   * Encuentra documentos que son requisito SOLO de un cliente específico
   * (para archivarlos cuando se quita ese cliente)
   */
  static async findDocumentsExclusiveToClient(params: {
    equipoId: number;
    clienteId: number;
    otherClienteIds: number[];
  }): Promise<number[]> {
    try {
      const { db } = await import('../config/database');
      const client: any = db.getClient?.();

      if (!client?.clienteDocumentRequirement) return [];

      // Obtener requisitos del cliente que se va a quitar
      const clientRequirements = await client.clienteDocumentRequirement.findMany({
        where: { clienteId: params.clienteId },
        select: { templateId: true, entityType: true },
      });

      // Obtener requisitos de los otros clientes
      const otherRequirements = await client.clienteDocumentRequirement.findMany({
        where: { clienteId: { in: params.otherClienteIds } },
        select: { templateId: true, entityType: true },
      });

      // Crear set de requisitos de otros clientes
      const otherReqSet = new Set(
        otherRequirements.map((r: any) => `${r.templateId}-${r.entityType}`)
      );

      // Filtrar requisitos exclusivos del cliente a quitar
      const exclusiveReqs = clientRequirements.filter(
        (r: any) => !otherReqSet.has(`${r.templateId}-${r.entityType}`)
      );

      if (exclusiveReqs.length === 0) return [];

      // Obtener el equipo para saber las entidades
      const equipo = await client.equipo.findUnique({
        where: { id: params.equipoId },
      });

      if (!equipo) return [];

      // Buscar documentos que coincidan con los requisitos exclusivos
      const exclusiveDocIds: number[] = [];

      for (const req of exclusiveReqs) {
        let entityId: number | null = null;

        switch (req.entityType) {
          case 'CHOFER':
            entityId = equipo.driverId;
            break;
          case 'CAMION':
            entityId = equipo.truckId;
            break;
          case 'ACOPLADO':
            entityId = equipo.trailerId;
            break;
          case 'EMPRESA_TRANSPORTISTA':
            entityId = equipo.empresaTransportistaId;
            break;
        }

        if (entityId) {
          const docs = await client.document.findMany({
            where: {
              entityType: req.entityType,
              entityId,
              templateId: req.templateId,
              archived: false,
            },
            select: { id: true },
          });

          exclusiveDocIds.push(...docs.map((d: any) => d.id));
        }
      }

      return exclusiveDocIds;
    } catch (err) {
      AppLogger.error('Error buscando documentos exclusivos', { error: err, params });
      return [];
    }
  }
}

