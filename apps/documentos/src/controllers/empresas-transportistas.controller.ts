import { Request, Response } from 'express';
import { EmpresaTransportistaService } from '../services/empresa-transportista.service';
import { AppLogger } from '../config/logger';

// Helper para manejo de errores consistente
function handleError(res: Response, error: any, context: string): void {
  AppLogger.error(`${context} error:`, error);
  const msg = error?.message || '';

  if (msg.includes('no encontrada')) {
    res.status(404).json({ success: false, message: msg, code: 'NOT_FOUND' });
    return;
  }
  if (msg.includes('activos asociados')) {
    res.status(400).json({ success: false, message: msg, code: 'HAS_DEPENDENCIES' });
    return;
  }

  res.status(500).json({ success: false, message: msg || 'Error interno del servidor', code: 'INTERNAL_ERROR' });
}

export class EmpresasTransportistasController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const { dadorCargaId, activo, q, page, limit } = req.query as any;
      // Parsear parámetro activo de string a boolean
      let activoBoolean: boolean | undefined;
      if (activo === 'true') activoBoolean = true;
      else if (activo === 'false') activoBoolean = false;

      const result = await EmpresaTransportistaService.list(
        tenantEmpresaId, 
        dadorCargaId ? Number(dadorCargaId) : undefined, 
        {
          activo: activoBoolean,
          q,
          page: page ? parseInt(page, 10) : undefined,
          limit: limit ? parseInt(limit, 10) : undefined,
        }
      );
      // Agregar 'list' para compatibilidad con frontend
      res.json({ success: true, ...result, list: result.data });
    } catch (error) {
      handleError(res, error, 'EmpresasTransportistasController.list');
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const id = Number((req.params as any).id);
      const empresa = await EmpresaTransportistaService.getById(id, tenantEmpresaId);
      if (!empresa) {
        res.status(404).json({ success: false, message: 'Empresa transportista no encontrada', code: 'NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: empresa });
    } catch (error) {
      handleError(res, error, 'EmpresasTransportistasController.getById');
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const { dadorCargaId, razonSocial, cuit, activo, notas } = (req.body || {}) as any;
      const empresa = await EmpresaTransportistaService.create({
        dadorCargaId: Number(dadorCargaId),
        tenantEmpresaId,
        razonSocial,
        cuit,
        activo,
        notas,
      });
      res.status(201).json({ success: true, data: empresa, message: 'Empresa transportista creada' });
    } catch (error) {
      handleError(res, error, 'EmpresasTransportistasController.create');
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const id = Number((req.params as any).id);
      const { razonSocial, cuit, activo, notas } = (req.body || {}) as any;
      const empresa = await EmpresaTransportistaService.update(id, tenantEmpresaId, { razonSocial, cuit, activo, notas });
      res.json({ success: true, data: empresa, message: 'Empresa transportista actualizada' });
    } catch (error) {
      handleError(res, error, 'EmpresasTransportistasController.update');
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const id = Number((req.params as any).id);
      await EmpresaTransportistaService.delete(id, tenantEmpresaId);
      res.json({ success: true, message: 'Empresa transportista eliminada' });
    } catch (error) {
      handleError(res, error, 'EmpresasTransportistasController.delete');
    }
  }

  static async getChoferes(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const id = Number((req.params as any).id);
      const choferes = await EmpresaTransportistaService.getChoferes(id, tenantEmpresaId);
      res.json({ success: true, data: choferes });
    } catch (error) {
      handleError(res, error, 'EmpresasTransportistasController.getChoferes');
    }
  }

  static async getEquipos(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const id = Number((req.params as any).id);
      const equipos = await EmpresaTransportistaService.getEquipos(id, tenantEmpresaId);
      res.json({ success: true, data: equipos });
    } catch (error) {
      handleError(res, error, 'EmpresasTransportistasController.getEquipos');
    }
  }
}


