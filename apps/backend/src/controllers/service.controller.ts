import { Response } from 'express';
import { ServiceService } from '../services/service.service';
import { AppLogger } from '../config/logger';
import { AuthRequest } from '../middlewares/platformAuth.middleware';

const serviceService = ServiceService.getInstance();

/**
 * Obtener todos los servicios
 */
export const getServices = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { search, estado, limit = 50, offset = 0 } = req.query;

    AppLogger.info('📋 Obteniendo lista de servicios', {
      userId: user.userId,
      userRole: user.role,
      filters: { search, estado, limit, offset },
    });

    const _tenantId = req.tenantId || (req.user?.empresaId ?? null);
    const services = await serviceService.findMany({
      search: search as string,
      estado: estado as any,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      // Nota: si el modelo de Service es global, no filtramos por empresa
      // Si en el futuro se añade multi-tenant, aquí se aplicaría where.empresaId = tenantId
    });

    AppLogger.info('✅ Lista de servicios obtenida exitosamente', {
      count: services.length,
      userId: user.userId,
    });

    res.json(services);
  } catch (error) {
    AppLogger.error('❌ Error al obtener servicios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Obtener servicio por ID
 */
export const getServiceById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    AppLogger.info('🔍 Obteniendo servicio por ID', {
      serviceId: id,
      userId: user.userId,
    });

    const service = await serviceService.findById(parseInt(id));

    if (!service) {
      AppLogger.warn('⚠️ Servicio no encontrado', {
        serviceId: id,
        userId: user.userId,
      });
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado',
      });
    }

    AppLogger.info('✅ Servicio obtenido exitosamente', {
      serviceId: id,
      userId: user.userId,
    });

    res.json(service);
  } catch (error) {
    AppLogger.error('❌ Error al obtener servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Crear nuevo servicio
 */
export const createService = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, descripcion, version, estado } = req.body;
    const user = req.user!;

    AppLogger.info('📝 Creando nuevo servicio', {
      nombre,
      userId: user.userId,
      userRole: user.role,
    });

    // Validar que el usuario tenga permisos (solo superadmin)
    if (user.role !== 'SUPERADMIN') {
      AppLogger.warn('⚠️ Usuario sin permisos para crear servicios', {
        userId: user.userId,
        userRole: user.role,
      });
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear servicios',
      });
    }

    const service = await serviceService.create({
      nombre,
      descripcion,
      version,
      estado,
    });

    AppLogger.info('✅ Servicio creado exitosamente', {
      serviceId: service.id,
      nombre: service.nombre,
      userId: user.userId,
    });

    res.status(201).json(service);
  } catch (error) {
    AppLogger.error('❌ Error al crear servicio:', error);

    if (error instanceof Error && error.message.includes('unique constraint')) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un servicio con ese nombre',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Actualizar servicio
 */
export const updateService = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, version, estado } = req.body;
    const user = req.user!;

    AppLogger.info('✏️ Actualizando servicio', {
      serviceId: id,
      userId: user.userId,
      userRole: user.role,
    });

    // Validar que el usuario tenga permisos (solo superadmin)
    if (user.role !== 'SUPERADMIN') {
      AppLogger.warn('⚠️ Usuario sin permisos para actualizar servicios', {
        userId: user.userId,
        userRole: user.role,
      });
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar servicios',
      });
    }

    const service = await serviceService.update(parseInt(id), {
      nombre,
      descripcion,
      version,
      estado,
    });

    AppLogger.info('✅ Servicio actualizado exitosamente', {
      serviceId: id,
      userId: user.userId,
    });

    res.json(service);
  } catch (error) {
    AppLogger.error('❌ Error al actualizar servicio:', error);

    if (error instanceof Error && error.message.includes('unique constraint')) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un servicio con ese nombre',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Eliminar servicio
 */
export const deleteService = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    AppLogger.info('🗑️ Eliminando servicio', {
      serviceId: id,
      userId: user.userId,
      userRole: user.role,
    });

    // Validar que el usuario tenga permisos (solo superadmin)
    if (user.role !== 'SUPERADMIN') {
      AppLogger.warn('⚠️ Usuario sin permisos para eliminar servicios', {
        userId: user.userId,
        userRole: user.role,
      });
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar servicios',
      });
    }

    await serviceService.delete(parseInt(id));

    AppLogger.info('✅ Servicio eliminado exitosamente', {
      serviceId: id,
      userId: user.userId,
    });

    res.status(204).send();
  } catch (error) {
    AppLogger.error('❌ Error al eliminar servicio:', error);

    if (error instanceof Error && error.message.includes('instancias asociadas')) {
      return res.status(400).json({
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
 * Obtener servicios simples para selectors
 */
export const getServicesSimple = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    AppLogger.info('📋 Obteniendo servicios simples', {
      userId: user.userId,
      userRole: user.role,
    });

    const services = await serviceService.findAllSimple();

    AppLogger.info('✅ Servicios simples obtenidos exitosamente', {
      count: services.length,
      userId: user.userId,
    });

    res.json(services);
  } catch (error) {
    AppLogger.error('❌ Error al obtener servicios simples:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Obtener estadísticas de servicios
 */
export const getServiceStats = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    AppLogger.info('📊 Obteniendo estadísticas de servicios', {
      userId: user.userId,
      userRole: user.role,
    });

    const stats = await serviceService.getStats();

    AppLogger.info('✅ Estadísticas de servicios obtenidas exitosamente', {
      userId: user.userId,
    });

    res.json(stats);
  } catch (error) {
    AppLogger.error('❌ Error al obtener estadísticas de servicios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Cambiar estado de un servicio
 */
export const changeServiceEstado = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const user = req.user!;

    AppLogger.info('🔄 Cambiando estado del servicio', {
      serviceId: id,
      nuevoEstado: estado,
      userId: user.userId,
      userRole: user.role,
    });

    // Validar que el usuario tenga permisos (solo superadmin)
    if (user.role !== 'SUPERADMIN') {
      AppLogger.warn('⚠️ Usuario sin permisos para cambiar estado de servicios', {
        userId: user.userId,
        userRole: user.role,
      });
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cambiar el estado de servicios',
      });
    }

    const service = await serviceService.changeEstado(parseInt(id), estado);

    AppLogger.info('✅ Estado del servicio cambiado exitosamente', {
      serviceId: id,
      nuevoEstado: estado,
      userId: user.userId,
    });

    res.json(service);
  } catch (error) {
    AppLogger.error('❌ Error al cambiar estado del servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}; 