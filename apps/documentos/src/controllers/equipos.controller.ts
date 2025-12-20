import { Response } from 'express';
import { EquipoService } from '../services/equipo.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AuditService } from '../services/audit.service';

// ============================================================================
// HELPERS
// ============================================================================
function parseActivo(value: string | undefined): boolean | 'all' {
  if (value === 'all') return 'all';
  if (value === 'false') return false;
  return true; // default
}

async function getDefaultDadorId(tenantId: number, bodyDadorId: any): Promise<number> {
  const dadorId = Number(bodyDadorId);
  if (dadorId && !Number.isNaN(dadorId)) return dadorId;

  const { SystemConfigService } = await import('../services/system-config.service');
  const def = await SystemConfigService.getConfig(`tenant:${tenantId}:defaults.defaultDadorId`);
  return def ? Number(def) : 0;
}

function logAudit(req: AuthRequest, action: string, entityId: number, statusCode: number, details?: any): void {
  void AuditService.log({
    tenantEmpresaId: req.tenantId,
    userId: req.user?.userId,
    userRole: req.user?.role,
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode,
    action,
    entityType: 'EQUIPO',
    entityId,
    details,
  });
}

// ============================================================================
// CONTROLADOR
// ============================================================================
export class EquiposController {
  static async list(req: AuthRequest, res: Response) {
    const dadorCargaId = req.query.dadorCargaId ? Number(req.query.dadorCargaId) : undefined;
    const page = parseInt(String((req.query as any).page), 10) || 1;
    const limit = parseInt(String((req.query as any).limit), 10) || 20;
    const choferId = req.user?.role === ('CHOFER' as any) ? (req.user?.choferId ?? undefined) : undefined;
    const activo = parseActivo((req.query as any).activo);

    const data = await EquipoService.list(req.tenantId!, dadorCargaId, page, limit, { choferId, activo });
    res.json({ success: true, data });
  }

  static async searchPaged(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const query = req.query as any;
    const activo = parseActivo(query.activo);

    const validComplianceFilters = ['faltantes', 'vencidos', 'por_vencer'];
    const complianceFilter = validComplianceFilters.includes(query.complianceFilter)
      ? query.complianceFilter as 'faltantes' | 'vencidos' | 'por_vencer'
      : undefined;

    const filters = {
      dadorCargaId: query.dadorCargaId ? Number(query.dadorCargaId) : undefined,
      clienteId: query.clienteId ? Number(query.clienteId) : undefined,
      empresaTransportistaId: query.empresaTransportistaId ? Number(query.empresaTransportistaId) : undefined,
      search: query.search || undefined,
      dni: query.dni || undefined,
      truckPlate: query.truckPlate || undefined,
      trailerPlate: query.trailerPlate || undefined,
      choferId: req.user?.role === ('CHOFER' as any) ? (req.user?.choferId ?? undefined) : undefined,
      activo,
      complianceFilter,
    };

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;

    const result = await EquipoService.searchPaginatedWithCompliance(tenantId, filters, page, limit);

    res.json({
      success: true,
      data: result.equipos,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
      },
      stats: result.stats
    });
  }

  static async getById(req: AuthRequest, res: Response) {
    const data = await EquipoService.getById(Number(req.params.id));
    res.json({ success: true, data });
  }

  static async createMinimal(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const dadorId = await getDefaultDadorId(tenantId, req.body.dadorCargaId);

    const input = {
      tenantEmpresaId: tenantId,
      dadorCargaId: dadorId,
      dniChofer: String(req.body.dniChofer),
      patenteTractor: String(req.body.patenteTractor),
      patenteAcoplado: req.body.patenteAcoplado ? String(req.body.patenteAcoplado) : null,
      choferPhones: Array.isArray(req.body.choferPhones) ? req.body.choferPhones : undefined,
    };

    const data = await EquipoService.createFromIdentifiers(input);
    res.status(201).json({ success: true, data });
  }

  static async createCompleto(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const dadorId = await getDefaultDadorId(tenantId, req.body.dadorCargaId);

    const input = {
      tenantEmpresaId: tenantId,
      dadorCargaId: dadorId,
      empresaTransportistaCuit: String(req.body.empresaTransportistaCuit),
      empresaTransportistaNombre: String(req.body.empresaTransportistaNombre),
      choferDni: String(req.body.choferDni),
      choferNombre: req.body.choferNombre ? String(req.body.choferNombre) : undefined,
      choferApellido: req.body.choferApellido ? String(req.body.choferApellido) : undefined,
      choferPhones: Array.isArray(req.body.choferPhones) ? req.body.choferPhones : undefined,
      camionPatente: String(req.body.camionPatente),
      camionMarca: req.body.camionMarca ? String(req.body.camionMarca) : undefined,
      camionModelo: req.body.camionModelo ? String(req.body.camionModelo) : undefined,
      acopladoPatente: req.body.acopladoPatente ? String(req.body.acopladoPatente) : null,
      acopladoTipo: req.body.acopladoTipo ? String(req.body.acopladoTipo) : undefined,
      clienteIds: Array.isArray(req.body.clienteIds) ? req.body.clienteIds : undefined,
    };

    const data = await EquipoService.createEquipoCompleto(input);

    logAudit(req, 'EQUIPO_ALTA_COMPLETA', data.id, 201, {
      dniChofer: input.choferDni,
      patenteCamion: input.camionPatente,
      patenteAcoplado: input.acopladoPatente,
      cuitEmpresa: input.empresaTransportistaCuit,
    });

    res.status(201).json({ success: true, data });
  }

  static async rollbackCompleto(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    const input = {
      tenantEmpresaId: req.tenantId!,
      equipoId,
      deleteChofer: req.body.deleteChofer === true,
      deleteCamion: req.body.deleteCamion === true,
      deleteAcoplado: req.body.deleteAcoplado === true,
      deleteEmpresa: req.body.deleteEmpresa === true,
    };

    const data = await EquipoService.rollbackAltaCompleta(input);
    logAudit(req, 'EQUIPO_ROLLBACK_COMPLETO', equipoId, 200, input);
    res.json({ success: true, data });
  }

  static async create(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const dadorId = await getDefaultDadorId(tenantId, req.body.dadorCargaId);

    const input = {
      tenantEmpresaId: tenantId,
      dadorCargaId: dadorId,
      driverId: Number(req.body.driverId),
      truckId: Number(req.body.truckId),
      trailerId: req.body.trailerId ? Number(req.body.trailerId) : null,
      empresaTransportistaId: req.body.empresaTransportistaId ? Number(req.body.empresaTransportistaId) : null,
      driverDni: String(req.body.driverDni),
      truckPlate: String(req.body.truckPlate),
      trailerPlate: req.body.trailerPlate ? String(req.body.trailerPlate) : null,
      validFrom: new Date(req.body.validFrom),
      validTo: req.body.validTo ? new Date(req.body.validTo) : null,
      forceMove: req.body.forceMove === true,
    };

    const data = await EquipoService.create(input);
    res.status(201).json({ success: true, data });
  }

  static async update(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const data = await EquipoService.update(id, {
      trailerId: req.body.trailerId ? Number(req.body.trailerId) : undefined,
      trailerPlate: req.body.trailerPlate,
      validTo: req.body.validTo ? new Date(req.body.validTo) : undefined,
      estado: req.body.estado,
      empresaTransportistaId: req.body.empresaTransportistaId !== undefined
        ? Number(req.body.empresaTransportistaId)
        : undefined,
    });
    res.json({ success: true, data });
  }

  static async associateCliente(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.equipoId);
    const clienteId = Number(req.params.clienteId);
    const asignadoDesde = new Date(req.body.asignadoDesde);
    const asignadoHasta = req.body.asignadoHasta ? new Date(req.body.asignadoHasta) : undefined;

    const data = await EquipoService.associateCliente(req.tenantId!, equipoId, clienteId, asignadoDesde, asignadoHasta);
    res.status(201).json({ success: true, data });
    logAudit(req, 'EQUIPO_CLIENTE_ATTACH', equipoId, 201, { clienteId, asignadoDesde, asignadoHasta });
  }

  static async removeCliente(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.equipoId);
    const clienteId = Number(req.params.clienteId);

    const data = await EquipoService.removeCliente(req.tenantId!, equipoId, clienteId);
    res.json({ success: true, data });
    logAudit(req, 'EQUIPO_CLIENTE_DETACH', equipoId, 200, { clienteId });
  }

  static async delete(req: AuthRequest, res: Response) {
    const data = await EquipoService.delete(Number(req.params.id));
    res.json({ success: true, data });
  }

  static async history(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    const limit = Math.min(Number(req.query.limit || 50), 100);
    const { prisma } = await import('../config/database');
    const rows = await prisma.equipoHistory.findMany({ where: { equipoId }, orderBy: { createdAt: 'desc' }, take: limit });
    res.json({ success: true, data: rows });
  }

  static async updateEntidades(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    const input = {
      equipoId,
      usuarioId: req.user?.userId ?? 0,
      tenantEmpresaId: req.tenantId!,
      choferId: req.body.choferId !== undefined ? Number(req.body.choferId) : undefined,
      camionId: req.body.camionId !== undefined ? Number(req.body.camionId) : undefined,
      acopladoId: req.body.acopladoId !== undefined ? (req.body.acopladoId === null ? null : Number(req.body.acopladoId)) : undefined,
      empresaTransportistaId: req.body.empresaTransportistaId !== undefined ? Number(req.body.empresaTransportistaId) : undefined,
    };

    const data = await EquipoService.updateEquipo(input);
    res.json({ success: true, data });
  }

  static async addCliente(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    const data = await EquipoService.addClienteToEquipo({
      equipoId,
      clienteId: Number(req.body.clienteId),
      usuarioId: req.user?.userId ?? 0,
      tenantEmpresaId: req.tenantId!,
    });
    res.status(201).json({ success: true, data });
  }

  static async removeClienteWithArchive(req: AuthRequest, res: Response) {
    const data = await EquipoService.removeClienteFromEquipo({
      equipoId: Number(req.params.id),
      clienteId: Number(req.params.clienteId),
      usuarioId: req.user?.userId ?? 0,
      tenantEmpresaId: req.tenantId!,
    });
    res.json({ success: true, data });
  }

  static async transferir(req: AuthRequest, res: Response) {
    const data = await EquipoService.transferirEquipo({
      equipoId: Number(req.params.id),
      nuevoDadorCargaId: Number(req.body.nuevoDadorCargaId),
      usuarioId: req.user?.userId ?? 0,
      tenantEmpresaId: req.tenantId!,
      motivo: req.body.motivo ? String(req.body.motivo) : undefined,
    });
    res.json({ success: true, data });
  }

  static async getRequisitos(req: AuthRequest, res: Response) {
    const data = await EquipoService.getRequisitosEquipo(Number(req.params.id), req.tenantId!);
    res.json({ success: true, data });
  }

  static async getAuditHistory(req: AuthRequest, res: Response) {
    const data = await AuditService.getEquipoHistory(Number(req.params.id));
    res.json({ success: true, data });
  }
}
