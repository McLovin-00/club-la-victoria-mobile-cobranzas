import { Response } from 'express';
import { EquipoService } from '../services/equipo.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AuditService } from '../services/audit.service';

export class EquiposController {
  static async list(req: AuthRequest, res: Response) {
    // dadorCargaId es opcional para admins (SUPERADMIN, ADMIN_INTERNO)
    const rawDadorId = req.query.dadorCargaId;
    const dadorCargaId = rawDadorId ? Number(rawDadorId) : undefined;
    // Paginación opcional (con defaults definidos en schema)
    const page = (req.query as any).page ? parseInt(String((req.query as any).page), 10) : 1;
    const limit = (req.query as any).limit ? parseInt(String((req.query as any).limit), 10) : 20;
    const data = await EquipoService.list(req.tenantId!, dadorCargaId, page, limit);
    res.json({ success: true, data });
  }

  /**
   * Búsqueda paginada con filtros avanzados
   * GET /api/docs/equipos/search-paged
   */
  static async searchPaged(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const query = req.query as any;
    
    const filters = {
      dadorCargaId: query.dadorCargaId ? Number(query.dadorCargaId) : undefined,
      clienteId: query.clienteId ? Number(query.clienteId) : undefined,
      empresaTransportistaId: query.empresaTransportistaId ? Number(query.empresaTransportistaId) : undefined,
      search: query.search || undefined,
      dni: query.dni || undefined,
      truckPlate: query.truckPlate || undefined,
      trailerPlate: query.trailerPlate || undefined,
    };
    
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;
    
    const result = await EquipoService.searchPaginated(tenantId, filters, page, limit);
    
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
      }
    });
  }

  static async getById(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    const data = await EquipoService.getById(equipoId);
    res.json({ success: true, data });
  }

  // Alta mínima desde identificadores (dni + patentes)
  static async createMinimal(req: AuthRequest, res: Response) {
    // Permitir usar dador por defecto si no viene
    const tenantId = req.tenantId!;
    let dadorId = Number(req.body.dadorCargaId);
    if (!dadorId || Number.isNaN(dadorId)) {
      const { SystemConfigService } = await import('../services/system-config.service');
      const def = await SystemConfigService.getConfig(`tenant:${tenantId}:defaults.defaultDadorId`);
      if (def) dadorId = Number(def);
    }
    const input = {
      tenantEmpresaId: tenantId,
      dadorCargaId: dadorId,
      dniChofer: String(req.body.dniChofer),
      patenteTractor: String(req.body.patenteTractor),
      patenteAcoplado: req.body.patenteAcoplado ? String(req.body.patenteAcoplado) : null,
      choferPhones: Array.isArray(req.body.choferPhones) ? (req.body.choferPhones as string[]) : undefined,
    };
    const data = await EquipoService.createFromIdentifiers(input);
    res.status(201).json({ success: true, data });
  }

  /**
   * Alta Completa de Equipo - TRANSACCIONAL
   * Crea empresa + chofer + camión + acoplado + equipo en una sola transacción
   * Si algún componente ya existe (excepto empresa), retorna ERROR y hace ROLLBACK
   */
  static async createCompleto(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    let dadorId = Number(req.body.dadorCargaId);
    if (!dadorId || Number.isNaN(dadorId)) {
      const { SystemConfigService } = await import('../services/system-config.service');
      const def = await SystemConfigService.getConfig(`tenant:${tenantId}:defaults.defaultDadorId`);
      if (def) dadorId = Number(def);
    }

    const input = {
      tenantEmpresaId: tenantId,
      dadorCargaId: dadorId,
      
      // Empresa Transportista
      empresaTransportistaCuit: String(req.body.empresaTransportistaCuit),
      empresaTransportistaNombre: String(req.body.empresaTransportistaNombre),
      
      // Chofer
      choferDni: String(req.body.choferDni),
      choferNombre: req.body.choferNombre ? String(req.body.choferNombre) : undefined,
      choferApellido: req.body.choferApellido ? String(req.body.choferApellido) : undefined,
      choferPhones: Array.isArray(req.body.choferPhones) ? (req.body.choferPhones as string[]) : undefined,
      
      // Camión
      camionPatente: String(req.body.camionPatente),
      camionMarca: req.body.camionMarca ? String(req.body.camionMarca) : undefined,
      camionModelo: req.body.camionModelo ? String(req.body.camionModelo) : undefined,
      
      // Acoplado (opcional)
      acopladoPatente: req.body.acopladoPatente ? String(req.body.acopladoPatente) : null,
      acopladoTipo: req.body.acopladoTipo ? String(req.body.acopladoTipo) : undefined,
      
      // Clientes a asociar
      clienteIds: Array.isArray(req.body.clienteIds) ? (req.body.clienteIds as number[]) : undefined,
    };

    const data = await EquipoService.createEquipoCompleto(input);
    
    // Log de auditoría
    await AuditService.log({
      tenantEmpresaId: tenantId,
      userId: req.user?.userId,
      userRole: req.user?.role,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: 201,
      action: 'EQUIPO_ALTA_COMPLETA',
      entityType: 'EQUIPO',
      entityId: data.id,
      details: {
        dniChofer: input.choferDni,
        patenteCamion: input.camionPatente,
        patenteAcoplado: input.acopladoPatente,
        cuitEmpresa: input.empresaTransportistaCuit,
      },
    });

    res.status(201).json({ success: true, data });
  }

  /**
   * Rollback de Alta Completa
   * Elimina un equipo y opcionalmente sus componentes
   */
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
    
    // Log de auditoría
    await AuditService.log({
      tenantEmpresaId: req.tenantId,
      userId: req.user?.userId,
      userRole: req.user?.role,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: 200,
      action: 'EQUIPO_ROLLBACK_COMPLETO',
      entityType: 'EQUIPO',
      entityId: equipoId,
      details: input,
    });

    res.json({ success: true, data });
  }

  static async create(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    let dadorId = Number(req.body.dadorCargaId);
    if (!dadorId || Number.isNaN(dadorId)) {
      const { SystemConfigService } = await import('../services/system-config.service');
      const def = await SystemConfigService.getConfig(`tenant:${tenantId}:defaults.defaultDadorId`);
      if (def) dadorId = Number(def);
    }
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
      empresaTransportistaId: typeof req.body.empresaTransportistaId === 'number' ? req.body.empresaTransportistaId : (
        req.body.empresaTransportistaId ? Number(req.body.empresaTransportistaId) : undefined
      ),
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
    // Audit
    void AuditService.log({
      tenantEmpresaId: req.tenantId,
      userId: req.user?.userId,
      userRole: req.user?.role,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: 201,
      action: 'EQUIPO_CLIENTE_ATTACH',
      entityType: 'EQUIPO',
      entityId: equipoId,
      details: { clienteId, asignadoDesde, asignadoHasta },
    });
  }

  static async removeCliente(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.equipoId);
    const clienteId = Number(req.params.clienteId);
    const data = await EquipoService.removeCliente(req.tenantId!, equipoId, clienteId);
    res.json({ success: true, data });
    // Audit
    void AuditService.log({
      tenantEmpresaId: req.tenantId,
      userId: req.user?.userId,
      userRole: req.user?.role,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: 200,
      action: 'EQUIPO_CLIENTE_DETACH',
      entityType: 'EQUIPO',
      entityId: equipoId,
      details: { clienteId },
    });
  }

  static async delete(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    const data = await EquipoService.delete(equipoId);
    res.json({ success: true, data });
  }

  static async history(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    const limit = Math.min(Number(req.query.limit || 50), 100);
    const { prisma } = await import('../config/database');
    const rows = await prisma.equipoHistory.findMany({ where: { equipoId }, orderBy: { createdAt: 'desc' }, take: limit });
    res.json({ success: true, data: rows });
  }

  /**
   * Actualizar entidades del equipo (chofer, camión, acoplado, empresa)
   */
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

  /**
   * Agregar cliente a equipo
   */
  static async addCliente(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    const clienteId = Number(req.body.clienteId);

    const data = await EquipoService.addClienteToEquipo({
      equipoId,
      clienteId,
      usuarioId: req.user?.userId ?? 0,
      tenantEmpresaId: req.tenantId!,
    });

    res.status(201).json({ success: true, data });
  }

  /**
   * Quitar cliente de equipo (con archivado de documentos exclusivos)
   */
  static async removeClienteWithArchive(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    const clienteId = Number(req.params.clienteId);

    const data = await EquipoService.removeClienteFromEquipo({
      equipoId,
      clienteId,
      usuarioId: req.user?.userId ?? 0,
      tenantEmpresaId: req.tenantId!,
    });

    res.json({ success: true, data });
  }

  /**
   * Transferir equipo a otro dador de carga (solo admin interno)
   */
  static async transferir(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    const nuevoDadorCargaId = Number(req.body.nuevoDadorCargaId);
    const motivo = req.body.motivo ? String(req.body.motivo) : undefined;

    const data = await EquipoService.transferirEquipo({
      equipoId,
      nuevoDadorCargaId,
      usuarioId: req.user?.userId ?? 0,
      tenantEmpresaId: req.tenantId!,
      motivo,
    });

    res.json({ success: true, data });
  }

  /**
   * Obtener requisitos consolidados del equipo
   */
  static async getRequisitos(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    const data = await EquipoService.getRequisitosEquipo(equipoId, req.tenantId!);
    res.json({ success: true, data });
  }

  /**
   * Obtener historial de auditoría del equipo
   */
  static async getAuditHistory(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    const data = await AuditService.getEquipoHistory(equipoId);
    res.json({ success: true, data });
  }
}
