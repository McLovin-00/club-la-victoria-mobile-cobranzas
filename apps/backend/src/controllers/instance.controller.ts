import { Response } from 'express';
import { InstanceService } from '../services/instance.service';
import { AppLogger } from '../config/logger';
import { AuthRequest } from '../middlewares/platformAuth.middleware';

const instanceService = InstanceService.getInstance();

/**
 * Obtener todas las instancias (con filtros por empresa según permisos)
 */
export const getInstances = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { search, serviceId, estado, limit = 50, offset = 0 } = req.query;

    AppLogger.info('📋 Obteniendo lista de instancias', {
      userId: user.userId,
      userRole: user.role,
      filters: { search, serviceId, estado, limit, offset },
    });

    // Aplicar filtros según el rol del usuario
    let instances: any[];
    if (user.role === 'SUPERADMIN') {
      // Superadmin puede ver todas las instancias
      instances = await instanceService.findMany({
        search: search as string,
        serviceId: serviceId ? parseInt(serviceId as string) : undefined,
        estado: estado as any,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    } else if (user.role === 'ADMIN' && user.empresaId) {
      // Admin solo puede ver instancias de su empresa
      instances = await instanceService.findManyByEmpresa(user.empresaId, {
        search: search as string,
        serviceId: serviceId ? parseInt(serviceId as string) : undefined,
        estado: estado as any,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    } else if (user.role === 'OPERATOR' && user.empresaId) {
      // Usuario normal solo puede ver instancias de su empresa
      instances = await instanceService.findManyByEmpresa(user.empresaId, {
        search: search as string,
        serviceId: serviceId ? parseInt(serviceId as string) : undefined,
        estado: estado as any,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    } else {
      // Usuario sin empresa no puede ver instancias
      instances = [];
    }

    AppLogger.info('✅ Lista de instancias obtenida exitosamente', {
      count: instances.length,
      userId: user.userId,
    });

    res.json({
      success: true,
      data: instances,
    });
  } catch (error) {
    AppLogger.error('❌ Error al obtener instancias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Obtener instancia por ID (con validación de permisos)
 */
export const getInstanceById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    AppLogger.info('🔍 Obteniendo instancia por ID', {
      instanceId: id,
      userId: user.userId,
    });

    const instance = await instanceService.findById(parseInt(id));

    if (!instance) {
      AppLogger.warn('⚠️ Instancia no encontrada', {
        instanceId: id,
        userId: user.userId,
      });
      return res.status(404).json({
        success: false,
        message: 'Instancia no encontrada',
      });
    }

    // Validar permisos según el rol
    if (user.role === 'SUPERADMIN') {
      // Superadmin puede ver cualquier instancia
    } else if ((user.role === 'ADMIN' || user.role === 'OPERATOR') && user.empresaId) {
      // Admin y operator solo pueden ver instancias de su empresa
      if (instance.empresaId !== user.empresaId) {
        AppLogger.warn('⚠️ Usuario sin permisos para ver esta instancia', {
          instanceId: id,
          userId: user.userId,
          userEmpresaId: user.empresaId,
          instanceEmpresaId: instance.empresaId,
        });
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver esta instancia',
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver instancias',
      });
    }

    AppLogger.info('✅ Instancia obtenida exitosamente', {
      instanceId: id,
      userId: user.userId,
    });

    res.json(instance);
  } catch (error) {
    AppLogger.error('❌ Error al obtener instancia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Crear nueva instancia
 */
export const createInstance = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, serviceId, empresaId, estado, configuracion } = req.body;
    const user = req.user!;

    AppLogger.info('📝 Creando nueva instancia', {
      nombre,
      serviceId,
      empresaId,
      userId: user.userId,
      userRole: user.role,
    });

    // Validar permisos y determinar empresaId
    let targetEmpresaId = empresaId;

    if (user.role === 'SUPERADMIN') {
      // Superadmin puede crear instancias para cualquier empresa
      if (!targetEmpresaId) {
        return res.status(400).json({
          success: false,
          message: 'Debe especificar una empresa para la instancia',
        });
      }
    } else if (user.role === 'ADMIN' && user.empresaId) {
      // Admin solo puede crear instancias para su empresa
      targetEmpresaId = user.empresaId;
    } else {
      // Usuarios normales no pueden crear instancias
      AppLogger.warn('⚠️ Usuario sin permisos para crear instancias', {
        userId: user.userId,
        userRole: user.role,
      });
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear instancias',
      });
    }

    const instance = await instanceService.create({
      nombre,
      serviceId,
      empresaId: targetEmpresaId,
      estado,
      configuracion,
    });

    AppLogger.info('✅ Instancia creada exitosamente', {
      instanceId: instance.id,
      nombre: instance.nombre,
      userId: user.userId,
    });

    res.status(201).json(instance);
  } catch (error) {
    AppLogger.error('❌ Error al crear instancia:', error);

    if (error instanceof Error) {
      if (error.message.includes('Ya existe una instancia con este nombre')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      if (error.message.includes('El servicio especificado no existe')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      if (error.message.includes('La empresa especificada no existe')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Actualizar instancia
 */
export const updateInstance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, serviceId, estado, configuracion } = req.body;
    const user = req.user!;

    AppLogger.info('✏️ Actualizando instancia', {
      instanceId: id,
      userId: user.userId,
      userRole: user.role,
    });

    // Validar permisos
    if (user.role === 'SUPERADMIN') {
      // Superadmin puede actualizar cualquier instancia
    } else if (user.role === 'ADMIN' && user.empresaId) {
      // Admin solo puede actualizar instancias de su empresa
      const hasAccess = await instanceService.validateEmpresaAccess(parseInt(id), user.empresaId);
      if (!hasAccess) {
        AppLogger.warn('⚠️ Usuario sin permisos para actualizar esta instancia', {
          instanceId: id,
          userId: user.userId,
          userEmpresaId: user.empresaId,
        });
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para actualizar esta instancia',
        });
      }
    } else {
      // Usuarios normales no pueden actualizar instancias
      AppLogger.warn('⚠️ Usuario sin permisos para actualizar instancias', {
        userId: user.userId,
        userRole: user.role,
      });
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar instancias',
      });
    }

    const instance = await instanceService.update(parseInt(id), {
      nombre,
      serviceId,
      estado,
      configuracion,
    });

    AppLogger.info('✅ Instancia actualizada exitosamente', {
      instanceId: id,
      userId: user.userId,
    });

    res.json(instance);
  } catch (error) {
    AppLogger.error('❌ Error al actualizar instancia:', error);

    if (error instanceof Error) {
      if (error.message.includes('Ya existe una instancia con este nombre')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      if (error.message.includes('La instancia no existe')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Eliminar instancia
 */
export const deleteInstance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    AppLogger.info('🗑️ Eliminando instancia', {
      instanceId: id,
      userId: user.userId,
      userRole: user.role,
    });

    // Validar permisos
    if (user.role === 'SUPERADMIN') {
      // Superadmin puede eliminar cualquier instancia
    } else if (user.role === 'ADMIN' && user.empresaId) {
      // Admin solo puede eliminar instancias de su empresa
      const hasAccess = await instanceService.validateEmpresaAccess(parseInt(id), user.empresaId);
      if (!hasAccess) {
        AppLogger.warn('⚠️ Usuario sin permisos para eliminar esta instancia', {
          instanceId: id,
          userId: user.userId,
          userEmpresaId: user.empresaId,
        });
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar esta instancia',
        });
      }
    } else {
      // Usuarios normales no pueden eliminar instancias
      AppLogger.warn('⚠️ Usuario sin permisos para eliminar instancias', {
        userId: user.userId,
        userRole: user.role,
      });
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar instancias',
      });
    }

    await instanceService.delete(parseInt(id));

    AppLogger.info('✅ Instancia eliminada exitosamente', {
      instanceId: id,
      userId: user.userId,
    });

    res.status(204).send();
  } catch (error) {
    AppLogger.error('❌ Error al eliminar instancia:', error);

    if (error instanceof Error && error.message.includes('La instancia no existe')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Obtener estadísticas de instancias
 */
export const getInstanceStats = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    AppLogger.info('📊 Obteniendo estadísticas de instancias', {
      userId: user.userId,
      userRole: user.role,
    });

    let stats;
    if (user.role === 'SUPERADMIN') {
      // Superadmin puede ver estadísticas de todas las instancias
      stats = await instanceService.getStats();
    } else if ((user.role === 'ADMIN' || user.role === 'OPERATOR') && user.empresaId) {
      // Admin y operator solo pueden ver estadísticas de su empresa
      stats = await instanceService.getStats(user.empresaId);
    } else {
      // Sin empresa no hay estadísticas
      stats = {
        total: 0,
        activas: 0,
        inactivas: 0,
        error: 0,
        byService: [],
      };
    }

    AppLogger.info('✅ Estadísticas de instancias obtenidas exitosamente', {
      userId: user.userId,
    });

    res.json(stats);
  } catch (error) {
    AppLogger.error('❌ Error al obtener estadísticas de instancias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Cambiar estado de una instancia
 */
export const changeInstanceEstado = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const user = req.user!;

    AppLogger.info('🔄 Cambiando estado de la instancia', {
      instanceId: id,
      nuevoEstado: estado,
      userId: user.userId,
      userRole: user.role,
    });

    // Validar permisos
    if (user.role === 'SUPERADMIN') {
      // Superadmin puede cambiar estado de cualquier instancia
    } else if (user.role === 'ADMIN' && user.empresaId) {
      // Admin solo puede cambiar estado de instancias de su empresa
      const hasAccess = await instanceService.validateEmpresaAccess(parseInt(id), user.empresaId);
      if (!hasAccess) {
        AppLogger.warn('⚠️ Usuario sin permisos para cambiar estado de esta instancia', {
          instanceId: id,
          userId: user.userId,
          userEmpresaId: user.empresaId,
        });
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para cambiar el estado de esta instancia',
        });
      }
    } else {
      // Usuarios normales no pueden cambiar estado
      AppLogger.warn('⚠️ Usuario sin permisos para cambiar estado de instancias', {
        userId: user.userId,
        userRole: user.role,
      });
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cambiar el estado de instancias',
      });
    }

    const instance = await instanceService.changeEstado(parseInt(id), estado);

    AppLogger.info('✅ Estado de la instancia cambiado exitosamente', {
      instanceId: id,
      nuevoEstado: estado,
      userId: user.userId,
    });

    res.json(instance);
  } catch (error) {
    AppLogger.error('❌ Error al cambiar estado de la instancia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}; 