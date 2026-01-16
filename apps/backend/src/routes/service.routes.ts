import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServicesSimple,
  getServiceStats,
  changeServiceEstado,
} from '../controllers/service.controller';
import { authenticateUser, authorizeRoles, tenantResolver } from '../middlewares/platformAuth.middleware';

const router = Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateUser, tenantResolver);

// Validaciones
const createServiceValidation = [
  body('nombre')
    .isString()
    .isLength({ min: 1, max: 150 })
    .withMessage('El nombre debe tener entre 1 y 150 caracteres')
    .trim(),
  body('descripcion')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
    .trim(),
  body('version')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('La versión no puede exceder 50 caracteres')
    .trim(),
  body('estado')
    .optional()
    .isIn(['activo', 'inactivo', 'mantenimiento'])
    .withMessage('El estado debe ser: activo, inactivo o mantenimiento'),
];

const updateServiceValidation = [
  body('nombre')
    .optional()
    .isString()
    .isLength({ min: 1, max: 150 })
    .withMessage('El nombre debe tener entre 1 y 150 caracteres')
    .trim(),
  body('descripcion')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
    .trim(),
  body('version')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('La versión no puede exceder 50 caracteres')
    .trim(),
  body('estado')
    .optional()
    .isIn(['activo', 'inactivo', 'mantenimiento'])
    .withMessage('El estado debe ser: activo, inactivo o mantenimiento'),
];

const changeEstadoValidation = [
  body('estado')
    .isIn(['activo', 'inactivo', 'mantenimiento'])
    .withMessage('El estado debe ser: activo, inactivo o mantenimiento'),
];

const serviceIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
];

const getServicesValidation = [
  query('search')
    .optional()
    .isString()
    .withMessage('La búsqueda debe ser una cadena de texto'),
  query('estado')
    .optional()
    .isIn(['activo', 'inactivo', 'mantenimiento'])
    .withMessage('El estado debe ser: activo, inactivo o mantenimiento'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser entre 1 y 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El offset debe ser mayor o igual a 0'),
];

// Middleware de validación
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array(),
    });
  }
  next();
};

// Rutas públicas (requieren autenticación pero no superadmin)
router.get('/', getServicesValidation, handleValidationErrors, getServices);
router.get('/simple', getServicesSimple);
router.get('/stats', getServiceStats);
router.get('/:id', serviceIdValidation, handleValidationErrors, getServiceById);

// Rutas protegidas (requieren superadmin)
router.post(
  '/',
  authorizeRoles(['SUPERADMIN']),
  createServiceValidation,
  handleValidationErrors,
  createService
);

router.put(
  '/:id',
  authorizeRoles(['SUPERADMIN']),
  serviceIdValidation,
  updateServiceValidation,
  handleValidationErrors,
  updateService
);

router.delete(
  '/:id',
  authorizeRoles(['SUPERADMIN']),
  serviceIdValidation,
  handleValidationErrors,
  deleteService
);

router.patch(
  '/:id/estado',
  authorizeRoles(['SUPERADMIN']),
  serviceIdValidation,
  changeEstadoValidation,
  handleValidationErrors,
  changeServiceEstado
);

export default router; 