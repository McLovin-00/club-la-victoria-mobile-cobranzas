import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { ComplianceService } from '../services/compliance.service';
import { createError } from '../middlewares/error.middleware';
import { AppLogger } from '../config/logger';

export class ComplianceController {
  /**
   * GET /api/docs/compliance/equipos/:id
   * Estado documental completo del equipo (por entidad y por cliente)
   */
  static async getEquipoCompliance(req: AuthRequest, res: Response): Promise<void> {
    const equipoId = Number((req.params as any).id);
    if (!equipoId) throw createError('Equipo inválido', 400, 'BAD_REQUEST');

    const equipo = await prisma.equipo.findUnique({
      where: { id: equipoId },
      select: {
        id: true,
        tenantEmpresaId: true,
        dadorCargaId: true,
        driverId: true,
        truckId: true,
        trailerId: true,
        empresaTransportistaId: true,
        driverDniNorm: true,
        truckPlateNorm: true,
        trailerPlateNorm: true,
      },
    });
    if (!equipo) throw createError('Equipo no encontrado', 404, 'NOT_FOUND');

    // Clientes asociados
    const clientes = await prisma.equipoCliente.findMany({
      where: { equipoId },
      select: { clienteId: true },
      orderBy: { asignadoDesde: 'desc' },
    });

    // Compliance por cliente
    const perCliente = [] as Array<{ clienteId: number; compliance: any[] }>;
    for (const c of clientes) {
      const comp = await ComplianceService.evaluateEquipoCliente(equipoId, c.clienteId);
      perCliente.push({ clienteId: c.clienteId, compliance: comp });
    }

    // Documentos por entidad (incluye rechazados/deprecados/vencidos)
    const allDocumentsByEntity: Record<string, any[]> = {
      EMPRESA_TRANSPORTISTA: [],
      CHOFER: [],
      CAMION: [],
      ACOPLADO: [],
    };
    const loadDocs = async (entityType: 'EMPRESA_TRANSPORTISTA'|'CHOFER'|'CAMION'|'ACOPLADO', entityId?: number | null) => {
      if (!entityId) return;
      const docs = await prisma.document.findMany({
        where: {
          tenantEmpresaId: equipo.tenantEmpresaId,
          dadorCargaId: equipo.dadorCargaId,
          entityType: entityType as any,
          entityId,
        },
        select: { id: true, templateId: true, status: true, uploadedAt: true, expiresAt: true },
        orderBy: [{ uploadedAt: 'desc' }],
      });
      allDocumentsByEntity[entityType] = docs as any[];
    };
    await Promise.all([
      loadDocs('EMPRESA_TRANSPORTISTA', equipo.empresaTransportistaId ?? undefined),
      loadDocs('CHOFER', equipo.driverId ?? undefined),
      loadDocs('CAMION', equipo.truckId ?? undefined),
      loadDocs('ACOPLADO', equipo.trailerId ?? undefined),
    ]);

    AppLogger.debug('📄 Compliance equipo generado', { equipoId });
    res.json({
      success: true,
      data: {
        equipo,
        clientes: perCliente,
        documents: allDocumentsByEntity,
      },
    });
  }
}


