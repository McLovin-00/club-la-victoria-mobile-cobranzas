import { Router, Request, Response } from 'express';
import { authenticateUser, authorizeRoles } from '../middlewares/platformAuth.middleware';

const router = Router();

/**
 * Endpoints para el Portal de Transportistas Mobile-First
 * Implementación inicial con datos mock
 */

// GET /api/docs/transportistas/dashboard-stats
router.get('/dashboard-stats', authenticateUser, authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']), async (req: Request, res: Response) => {
  try {
    // Mock data - en producción vendría de la base de datos
    const mockStats = {
      cumplimiento: 85,
      vigentes: 12,
      vencidos: 2,
      proximos: 3,
      total: 17,
    };

    res.json({
      success: true,
      data: mockStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas del dashboard',
    });
  }
});

// GET /api/docs/transportistas/alertas-urgentes
router.get('/alertas-urgentes', authenticateUser, authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']), async (req: Request, res: Response) => {
  try {
    // Mock data - alertas urgentes
    const mockAlertas = [
      {
        id: 'alerta-1',
        equipoId: 101,
        documentoTipo: 'VTV',
        diasVencimiento: 2,
        mensaje: 'La VTV del equipo vence en 2 días',
      },
      {
        id: 'alerta-2',
        equipoId: 102,
        documentoTipo: 'Seguro',
        diasVencimiento: -1,
        mensaje: 'El seguro del equipo está vencido desde hace 1 día',
      },
      {
        id: 'alerta-3',
        equipoId: 103,
        documentoTipo: 'Licencia de Conducir',
        diasVencimiento: 5,
        mensaje: 'La licencia del chofer vence en 5 días',
      },
      {
        id: 'alerta-4',
        equipoId: 104,
        documentoTipo: 'Habilitación',
        diasVencimiento: 1,
        mensaje: 'La habilitación vence mañana',
      },
    ];

    res.json({
      success: true,
      data: mockAlertas,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting alertas urgentes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener alertas urgentes',
    });
  }
});

// GET /api/docs/transportistas/mis-equipos (ya existe, pero asegurar formato)
router.get('/mis-equipos', authenticateUser, authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']), async (req: Request, res: Response) => {
  try {
    // Mock data - equipos del transportista
    const mockEquipos = [
      {
        id: 101,
        driverDniNorm: '12345678',
        truckPlateNorm: 'ABC123',
        trailerPlateNorm: 'DEF456',
        estado: 'ACTIVO',
        cumplimiento: 85,
      },
      {
        id: 102,
        driverDniNorm: '87654321',
        truckPlateNorm: 'GHI789',
        trailerPlateNorm: null,
        estado: 'ACTIVO',
        cumplimiento: 92,
      },
    ];

    res.json({
      success: true,
      data: mockEquipos,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting mis equipos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener equipos',
    });
  }
});

// GET /api/docs/transportistas/calendar-events
router.get('/calendar-events', authenticateUser, authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']), async (req: Request, res: Response) => {
  try {
    // Mock data - eventos del calendario
    const mockEvents = [
      {
        id: 'event-1',
        equipoId: '101',
        equipoNombre: 'ABC123 + DEF456',
        documentoTipo: 'VTV',
        fechaVencimiento: new Date('2024-02-15'),
        estado: 'proximo',
        prioridad: 'alta',
        diasRestantes: 5,
      },
      {
        id: 'event-2',
        equipoId: '102',
        equipoNombre: 'GHI789',
        documentoTipo: 'Seguro',
        fechaVencimiento: new Date('2024-02-08'),
        estado: 'vencido',
        prioridad: 'alta',
        diasRestantes: -2,
      },
      {
        id: 'event-3',
        equipoId: '101',
        equipoNombre: 'ABC123 + DEF456',
        documentoTipo: 'Licencia de Conducir',
        fechaVencimiento: new Date('2024-03-01'),
        estado: 'vigente',
        prioridad: 'media',
        diasRestantes: 20,
      },
      {
        id: 'event-4',
        equipoId: '102',
        equipoNombre: 'GHI789',
        documentoTipo: 'Habilitación',
        fechaVencimiento: new Date('2024-02-11'),
        estado: 'proximo',
        prioridad: 'alta',
        diasRestantes: 1,
      },
    ];

    res.json({
      success: true,
      data: mockEvents,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting calendar events:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener eventos del calendario',
    });
  }
});

// GET /api/docs/transportistas/profile
router.get('/profile', authenticateUser, authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']), async (req: Request, res: Response) => {
  try {
    // Mock data - perfil del transportista
    const mockProfile = {
      id: 'user-123',
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan.perez@example.com',
      telefono: '+54 9 11 1234 5678',
      dni: '12345678',
      licencia: 'A2',
      fechaNacimiento: '1985-03-15',
      avatar: null,
    };

    res.json({
      success: true,
      data: mockProfile,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener perfil',
    });
  }
});

// POST /api/docs/transportistas/avatar
router.post('/avatar', authenticateUser, authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']), async (req: Request, res: Response) => {
  try {
    // Mock upload avatar
    const _file = req.body?.file;
    
    res.json({
      success: true,
      data: {
        avatarUrl: '/uploads/avatars/mock-avatar.jpg',
        message: 'Avatar actualizado correctamente',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({
      success: false,
      error: 'Error al subir avatar',
    });
  }
});

// GET /api/docs/transportistas/preferences
router.get('/preferences', authenticateUser, authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']), async (req: Request, res: Response) => {
  try {
    // Mock data - preferencias del usuario
    const mockPreferences = {
      notifications: {
        whatsapp: {
          enabled: true,
          instances: ['main', 'backup'],
          templates: {
            vencimiento: 'template_vencimiento',
            urgente: 'template_urgente',
          },
        },
        push: {
          enabled: false,
        },
        email: {
          enabled: true,
        },
      },
      app: {
        theme: 'light',
        language: 'es',
        timezone: 'America/Argentina/Buenos_Aires',
      },
    };

    res.json({
      success: true,
      data: mockPreferences,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener preferencias',
    });
  }
});

export default router;
