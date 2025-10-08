import { Request, Response } from 'express';
import { EmpresaService } from '../services/empresa.service';
import { AppLogger } from '../config/logger';
import { AuthPayload } from '../services/platformAuth.service';

const empresaService = EmpresaService.getInstance();

/**
 * Obtener todas las empresas
 */
export const getAllEmpresas = async (req: Request, res: Response) => {
  try {
        const user = (req as any).platformUser as AuthPayload;
        // Admin/Operator solo deberían ver su empresa; Superadmin puede ver todas o filtrar por tenant
        if (user?.role === 'ADMIN' || user?.role === 'OPERATOR') {
            const empresa = user.empresaId ? await empresaService.findById(user.empresaId) : null;
            return res.status(200).json({ success: true, data: empresa ? [empresa] : [] });
        }
        const tenantId = (req as any).tenantId as number | undefined;
        if (tenantId) {
            const empresa = await empresaService.findById(tenantId);
            return res.status(200).json({ success: true, data: empresa ? [empresa] : [] });
        }
        const empresas = await empresaService.findMany();
        res.status(200).json({ success: true, data: empresas });
    } catch (error) {
        AppLogger.error('Error fetching all empresas:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

/**
 * Obtener todas las empresas (versión simple)
 */
export const getAllEmpresasSimple = async (_req: Request, res: Response) => {
  try {
    const empresas = await empresaService.findMany({ limit: 1000 });
    res.status(200).json({
      success: true,
      data: empresas,
    });
  } catch (error) {
    AppLogger.error('Error fetching simple empresas:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

/**
 * Obtener empresa por ID
 */
export const getEmpresaById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = (req as any).platformUser as AuthPayload;

    AppLogger.info('🔍 Obteniendo empresa por ID', {
      empresaId: id,
      userId: user.userId,
      userRole: user.role,
    });

    const empresa = await empresaService.findById(id);

    if (!empresa) {
      return res.status(404).json({
        success: false,
        message: 'Empresa no encontrada',
      });
    }

    AppLogger.info('✅ Empresa encontrada', {
      empresaId: empresa.id,
      nombre: empresa.nombre,
      userId: user.userId,
    });

    res.status(200).json(empresa);
  } catch (error) {
    AppLogger.error('❌ Error al obtener empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Crear nueva empresa
 */
export const createEmpresa = async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion } = req.body;
    const user = (req as any).platformUser as AuthPayload;

    AppLogger.info('📝 Creando nueva empresa', {
      nombre,
      userId: user.userId,
      userRole: user.role,
    });

    const empresa = await empresaService.create({
      nombre,
      descripcion,
    });

    AppLogger.info('✅ Empresa creada exitosamente', {
      empresaId: empresa.id,
      nombre: empresa.nombre,
      userId: user.userId,
    });

    res.status(201).json(empresa);
  } catch (error) {
    AppLogger.error('❌ Error al crear empresa:', error);

    if (error instanceof Error && error.message.includes('unique constraint')) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una empresa con ese nombre',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Actualizar empresa
 */
export const updateEmpresa = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { nombre, descripcion } = req.body;
    const user = (req as any).platformUser as AuthPayload;

    AppLogger.info('✏️ Actualizando empresa', {
      empresaId: id,
      nombre,
      userId: user.userId,
      userRole: user.role,
    });

    const empresa = await empresaService.update(id, {
      nombre,
      descripcion,
    });

    if (!empresa) {
      return res.status(404).json({
        success: false,
        message: 'Empresa no encontrada',
      });
    }

    AppLogger.info('✅ Empresa actualizada exitosamente', {
      empresaId: empresa.id,
      nombre: empresa.nombre,
      userId: user.userId,
    });

    res.status(200).json(empresa);
  } catch (error) {
    AppLogger.error('❌ Error al actualizar empresa:', error);

    if (error instanceof Error && error.message.includes('unique constraint')) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una empresa con ese nombre',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Eliminar empresa
 */
export const deleteEmpresa = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = (req as any).platformUser as AuthPayload;

    AppLogger.info('🗑️ Eliminando empresa', {
      empresaId: id,
      userId: user.userId,
      userRole: user.role,
    });

    const empresa = await empresaService.findById(id);
    if (!empresa) {
      return res.status(404).json({
        success: false,
        message: 'Empresa no encontrada',
      });
    }

    await empresaService.delete(id);

    AppLogger.info('✅ Empresa eliminada exitosamente', {
      empresaId: id,
      userId: user.userId,
    });

    res.status(200).json({
      success: true,
      message: 'Empresa eliminada exitosamente',
    });
  } catch (error) {
    AppLogger.error('❌ Error al eliminar empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Obtener estadísticas de empresas
 */
export const getEmpresaStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).platformUser as AuthPayload;

    AppLogger.info('📊 Obteniendo estadísticas de empresas', {
      userId: user.userId,
    });

    const stats = await empresaService.getStats();

    AppLogger.info('✅ Estadísticas obtenidas exitosamente', {
      userId: user.userId,
    });

    res.json(stats);
  } catch (error) {
    AppLogger.error('❌ Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};
