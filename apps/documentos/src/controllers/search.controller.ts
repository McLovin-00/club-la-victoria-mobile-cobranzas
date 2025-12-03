import { Response } from 'express';
import { prisma } from '../config/database';
import { ComplianceService } from '../services/compliance.service';
import { AuthRequest } from '../middlewares/auth.middleware';

function normalizeDni(dni: string): string {
  return (dni || '').replace(/\D+/g, '');
}

function normalizePlate(plate: string): string {
  return (plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export class SearchController {
  static async search(req: AuthRequest, res: Response) {
    const empresaIdRaw = req.query.dadorCargaId;
    const empresaId = empresaIdRaw !== undefined && empresaIdRaw !== null && String(empresaIdRaw).trim() !== ''
      ? Number(empresaIdRaw)
      : undefined;
    const clienteIdRaw = req.query.clienteId;
    const clienteId = clienteIdRaw !== undefined && clienteIdRaw !== null && String(clienteIdRaw).trim() !== ''
      ? Number(clienteIdRaw)
      : undefined;
    const empresaTransportistaIdRaw = req.query.empresaTransportistaId;
    const empresaTransportistaId = empresaTransportistaIdRaw !== undefined && empresaTransportistaIdRaw !== null && String(empresaTransportistaIdRaw).trim() !== ''
      ? Number(empresaTransportistaIdRaw)
      : undefined;
    const dni = req.query.dni ? normalizeDni(String(req.query.dni)) : undefined;
    const truckPlate = req.query.truckPlate ? normalizePlate(String(req.query.truckPlate)) : undefined;
    const trailerPlate = req.query.trailerPlate ? normalizePlate(String(req.query.trailerPlate)) : undefined;
    const limit = Math.min(Number(req.query.limit || 25), 100);

    // Base where clause
    const where: any = {
      tenantEmpresaId: req.tenantId!,
      ...(Number.isFinite(empresaId as any) ? { dadorCargaId: empresaId as number } : {}),
      ...(Number.isFinite(empresaTransportistaId as any) ? { empresaTransportistaId: empresaTransportistaId as number } : {}),
      ...(dni ? { driverDniNorm: dni } : {}),
      ...(truckPlate ? { truckPlateNorm: truckPlate } : {}),
      ...(trailerPlate ? { trailerPlateNorm: trailerPlate } : {}),
      OR: [
        { validTo: null },
        { validTo: { gte: new Date() } },
      ],
    };

    // Si filtramos por cliente, necesitamos una subconsulta
    let equipos: any[];
    if (Number.isFinite(clienteId as any)) {
      const equipoIds = await prisma.equipoCliente.findMany({
        where: { clienteId: clienteId as number },
        select: { equipoId: true },
        distinct: ['equipoId'],
      });
      const ids = equipoIds.map((ec) => ec.equipoId);
      if (ids.length === 0) {
        equipos = [];
      } else {
        equipos = await prisma.equipo.findMany({
          where: {
            ...where,
            id: { in: ids },
          },
          orderBy: { validFrom: 'desc' },
          include: { clientes: true },
          take: limit,
        });
      }
    } else {
      equipos = await prisma.equipo.findMany({
        where,
        orderBy: { validFrom: 'desc' },
        include: { clientes: true },
        take: limit,
      });
    }
    const result = await Promise.all(equipos.map(async (eq) => {
      const clientes = await prisma.equipoCliente.findMany({ where: { equipoId: eq.id } });
      const clientesResults = await Promise.all(clientes.map(async (c) => ({
        clienteId: c.clienteId,
        compliance: await ComplianceService.evaluateEquipoCliente(eq.id, c.clienteId),
      })));
      return { equipo: eq, clientes: clientesResults };
    }));

    res.json({ success: true, data: result, pagination: { limit } });
  }
}


