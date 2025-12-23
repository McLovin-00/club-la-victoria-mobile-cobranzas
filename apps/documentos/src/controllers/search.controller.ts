import { Response } from 'express';
import { prisma } from '../config/database';
import { ComplianceService } from '../services/compliance.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppLogger } from '../config/logger';

function normalizeDni(dni: string): string {
  return (dni || '').replace(/\D+/g, '');
}

function normalizePlate(plate: string): string {
  return (plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Parsea un valor de query param a número o undefined */
function parseQueryNum(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  if (str === '') return undefined;
  const num = Number(str);
  return Number.isFinite(num) ? num : undefined;
}

export class SearchController {
  static async search(req: AuthRequest, res: Response) {
    AppLogger.debug('🔍 SearchController: query params recibidos', { query: req.query });
    
    const empresaId = parseQueryNum(req.query.dadorCargaId);
    const clienteId = parseQueryNum(req.query.clienteId);
    const empresaTransportistaId = parseQueryNum(req.query.empresaTransportistaId);
    
    AppLogger.debug('🔍 SearchController: filtros parseados', { empresaId, clienteId, empresaTransportistaId });
    const dni = req.query.dni ? normalizeDni(String(req.query.dni)) : undefined;
    const truckPlate = req.query.truckPlate ? normalizePlate(String(req.query.truckPlate)) : undefined;
    const trailerPlate = req.query.trailerPlate ? normalizePlate(String(req.query.trailerPlate)) : undefined;
    const limit = Math.min(Number(req.query.limit || 25), 100);

    // Base where clause
    const where: any = {
      tenantEmpresaId: req.tenantId!,
      ...(empresaId ? { dadorCargaId: empresaId } : {}),
      ...(empresaTransportistaId ? { empresaTransportistaId } : {}),
      ...(dni ? { driverDniNorm: dni } : {}),
      ...(truckPlate ? { truckPlateNorm: truckPlate } : {}),
      ...(trailerPlate ? { trailerPlateNorm: trailerPlate } : {}),
      OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
    };
    
    AppLogger.debug('🔍 SearchController: where clause', { where });

    // Si filtramos por cliente, necesitamos una subconsulta
    let equipos: any[];
    if (clienteId) {
      const equipoIds = await prisma.equipoCliente.findMany({
        where: { clienteId },
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


