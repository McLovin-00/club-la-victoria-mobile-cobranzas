import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { MaestrosService } from '../services/maestros.service';
import { createError } from '../middlewares/error.middleware';

export const MaestrosController = {
  // EMPRESAS
  async listEmpresas(req: AuthRequest, res: Response) {
    const activo = req.query.activo === undefined ? undefined : req.query.activo === 'true';
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const { data, total } = await MaestrosService.listEmpresas(activo, req.query.q as string | undefined, page, limit);
    res.json({ success: true, data, pagination: { page, limit, total } });
  },
  async createEmpresa(req: AuthRequest, res: Response) {
    const data = await MaestrosService.createEmpresa(req.body);
    res.status(201).json({ success: true, data });
  },
  async updateEmpresa(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const data = await MaestrosService.updateEmpresa(id, req.body);
    res.json({ success: true, data });
  },
  async deleteEmpresa(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    await MaestrosService.deleteEmpresa(id);
    res.json({ success: true });
  },

  // CHOFERES
  async listChoferes(req: AuthRequest, res: Response) {
    const dadorCargaId = Number(req.query.dadorCargaId);
    if (!dadorCargaId) throw createError('dadorCargaId requerido', 400);
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const rawActivo = req.query.activo as string | undefined;
    const activo = rawActivo === undefined ? undefined : rawActivo === 'true' || rawActivo === '1';
    const { data, total } = await MaestrosService.listChoferes(
      req.tenantId!,
      dadorCargaId,
      req.query.q as string | undefined,
      activo,
      page,
      limit,
    );
    res.json({ success: true, data, pagination: { page, limit, total } });
  },
  async getChoferById(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const data = await MaestrosService.getChoferById(req.tenantId!, id);
    if (!data) throw createError('Chofer no encontrado', 404);
    res.json({ success: true, data });
  },
  async createChofer(req: AuthRequest, res: Response) {
    const data = await MaestrosService.createChofer({
      tenantEmpresaId: req.tenantId!,
      dadorCargaId: Number(req.body.dadorCargaId),
      dni: String(req.body.dni),
      nombre: req.body.nombre,
      apellido: req.body.apellido,
      phones: req.body.phones,
      activo: req.body.activo,
    });
    res.status(201).json({ success: true, data });
  },
  async updateChofer(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const data = await MaestrosService.updateChofer(req.tenantId!, id, req.body);
    res.json({ success: true, data });
  },
  async deleteChofer(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    await MaestrosService.deleteChofer(req.tenantId!, id);
    res.json({ success: true });
  },

  // CAMIONES
  async listCamiones(req: AuthRequest, res: Response) {
    const dadorCargaId = Number(req.query.dadorCargaId);
    if (!dadorCargaId) throw createError('dadorCargaId requerido', 400);
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const rawActivo = req.query.activo as string | undefined;
    const activo = rawActivo === undefined ? undefined : rawActivo === 'true' || rawActivo === '1';
    const { data, total } = await MaestrosService.listCamiones(
      req.tenantId!,
      dadorCargaId,
      req.query.q as string | undefined,
      activo,
      page,
      limit,
    );
    res.json({ success: true, data, pagination: { page, limit, total } });
  },
  async createCamion(req: AuthRequest, res: Response) {
    const data = await MaestrosService.createCamion({
      tenantEmpresaId: req.tenantId!,
      dadorCargaId: Number(req.body.dadorCargaId),
      patente: String(req.body.patente),
      marca: req.body.marca,
      modelo: req.body.modelo,
      activo: req.body.activo,
    });
    res.status(201).json({ success: true, data });
  },
  async updateCamion(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const data = await MaestrosService.updateCamion(req.tenantId!, id, req.body);
    res.json({ success: true, data });
  },
  async deleteCamion(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    await MaestrosService.deleteCamion(req.tenantId!, id);
    res.json({ success: true });
  },

  // ACOPLADOS
  async listAcoplados(req: AuthRequest, res: Response) {
    const dadorCargaId = Number(req.query.dadorCargaId);
    if (!dadorCargaId) throw createError('dadorCargaId requerido', 400);
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const rawActivo = req.query.activo as string | undefined;
    const activo = rawActivo === undefined ? undefined : rawActivo === 'true' || rawActivo === '1';
    const { data, total } = await MaestrosService.listAcoplados(
      req.tenantId!,
      dadorCargaId,
      req.query.q as string | undefined,
      activo,
      page,
      limit,
    );
    res.json({ success: true, data, pagination: { page, limit, total } });
  },
  async createAcoplado(req: AuthRequest, res: Response) {
    const data = await MaestrosService.createAcoplado({
      tenantEmpresaId: req.tenantId!,
      dadorCargaId: Number(req.body.dadorCargaId),
      patente: String(req.body.patente),
      tipo: req.body.tipo,
      activo: req.body.activo,
    });
    res.status(201).json({ success: true, data });
  },
  async updateAcoplado(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    const data = await MaestrosService.updateAcoplado(req.tenantId!, id, req.body);
    res.json({ success: true, data });
  },
  async deleteAcoplado(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    await MaestrosService.deleteAcoplado(req.tenantId!, id);
    res.json({ success: true });
  },
};


