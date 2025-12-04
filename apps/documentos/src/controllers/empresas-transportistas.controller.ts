import { Request, Response } from 'express';
import { EmpresaTransportistaService } from '../services/empresa-transportista.service';
import { AppLogger } from '../config/logger';

export class EmpresasTransportistasController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const { dadorCargaId, activo, q, page, limit } = req.query as any;
      const result = await EmpresaTransportistaService.list(
        tenantEmpresaId, 
        dadorCargaId ? Number(dadorCargaId) : undefined, 
        {
          activo: activo === 'true' ? true : activo === 'false' ? false : undefined,
          q,
          page: page ? parseInt(page, 10) : undefined,
          limit: limit ? parseInt(limit, 10) : undefined,
        }
      );
      // Agregar 'list' para compatibilidad con frontend
      res.json({ success: true, ...result, list: result.data });
    } catch (error) {
      AppLogger.error('EmpresasTransportistasController.list error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
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
      AppLogger.error('EmpresasTransportistasController.getById error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
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
      AppLogger.error('EmpresasTransportistasController.create error:', error);
      res.status(500).json({ success: false, message: (error as any)?.message || 'Error interno del servidor', code: 'INTERNAL_ERROR' });
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
      AppLogger.error('EmpresasTransportistasController.update error:', error);
      const msg = (error as any)?.message || '';
      if (msg.includes('no encontrada')) {
        res.status(404).json({ success: false, message: msg, code: 'NOT_FOUND' });
        return;
      }
      res.status(500).json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const id = Number((req.params as any).id);
      await EmpresaTransportistaService.delete(id, tenantEmpresaId);
      res.json({ success: true, message: 'Empresa transportista eliminada' });
    } catch (error) {
      AppLogger.error('EmpresasTransportistasController.delete error:', error);
      const msg = (error as any)?.message || '';
      if (msg.includes('no encontrada')) {
        res.status(404).json({ success: false, message: msg, code: 'NOT_FOUND' });
        return;
      }
      if (msg.includes('activos asociados')) {
        res.status(400).json({ success: false, message: msg, code: 'HAS_DEPENDENCIES' });
        return;
      }
      res.status(500).json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
    }
  }

  static async getChoferes(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const id = Number((req.params as any).id);
      const choferes = await EmpresaTransportistaService.getChoferes(id, tenantEmpresaId);
      res.json({ success: true, data: choferes });
    } catch (error) {
      AppLogger.error('EmpresasTransportistasController.getChoferes error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
    }
  }

  static async getEquipos(req: Request, res: Response): Promise<void> {
    try {
      const tenantEmpresaId = (req as any).tenantId as number;
      const id = Number((req.params as any).id);
      const equipos = await EmpresaTransportistaService.getEquipos(id, tenantEmpresaId);
      res.json({ success: true, data: equipos });
    } catch (error) {
      AppLogger.error('EmpresasTransportistasController.getEquipos error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
    }
  }
}


