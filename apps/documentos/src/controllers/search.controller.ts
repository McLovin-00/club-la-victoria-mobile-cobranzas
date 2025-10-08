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
    const dni = req.query.dni ? normalizeDni(String(req.query.dni)) : undefined;
    const truckPlate = req.query.truckPlate ? normalizePlate(String(req.query.truckPlate)) : undefined;
    const trailerPlate = req.query.trailerPlate ? normalizePlate(String(req.query.trailerPlate)) : undefined;
    const limit = Math.min(Number(req.query.limit || 25), 100);

    const equipos = await prisma.equipo.findMany({
      where: {
        tenantEmpresaId: req.tenantId!,
        ...(Number.isFinite(empresaId as any) ? { dadorCargaId: empresaId as number } : {}),
        ...(dni ? { driverDniNorm: dni } : {}),
        ...(truckPlate ? { truckPlateNorm: truckPlate } : {}),
        ...(trailerPlate ? { trailerPlateNorm: trailerPlate } : {}),
        OR: [
          { validTo: null },
          { validTo: { gte: new Date() } },
        ],
      },
      orderBy: { validFrom: 'desc' },
      include: { clientes: true },
      take: limit,
    });
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


