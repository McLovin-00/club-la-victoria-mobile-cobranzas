import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AppLogger } from '../config/logger';
import { AuthPayload } from '../services/platformAuth.service';

// Dashboard para usuario normal
export const getDashboardUser = async (req: Request, res: Response) => {
  try {
    const user = (req as any).platformUser as AuthPayload;

    if (!user) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    // Actividad reciente (simulada por ahora)
    const recentActivity = [
      {
        id: '1',
        action: 'Inicio de sesión',
        user: user.email,
        timestamp: new Date().toISOString(),
        description: 'Has iniciado sesión en el sistema',
      },
    ];

    res.json({
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
      },
      recentActivity,
    });
  } catch (error: any) {
    AppLogger.error('Error en dashboard de usuario', {
      error: error.message,
      stack: error.stack,
      userId: ((req as any).platformUser as AuthPayload)?.userId,
    });
    res.status(500).json({ message: 'Error al obtener dashboard', error: error.message });
  }
};

// Dashboard para admin
export const getDashboardAdmin = async (req: Request, res: Response) => {
  try {
    const user = (req as any).platformUser as AuthPayload;

    if (!user) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      return res.status(403).json({ message: 'Se requiere rol de administrador' });
    }

    // Obtener usuarios (excluyendo superadmins si es admin)
    const whereClause: any = {};

    if (user.role === 'ADMIN') {
      whereClause.role = {
        not: 'SUPERADMIN',
      };
      whereClause.empresaId = user.empresaId;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Transformar usuarios para incluir información básica
    const usersData = users.map((u: any) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      lastActive: u.updatedAt.toISOString(),
    }));

    // Actividad reciente
    const recentActivity = [
      {
        id: '1',
        action: 'Usuario creado',
        user: 'admin@example.com',
        timestamp: new Date().toISOString(),
        description: 'Nuevo usuario creado en el sistema',
      },
      {
        id: '2',
        action: 'Sistema actualizado',
        user: 'user1@example.com',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        description: 'Sistema actualizado correctamente',
      },
    ];

    res.json({
      usersCount: users.length,
      bots: [],
      botCompleteness: [],
      clientsCount: 0,
      recentActivity,
      users: usersData,
    });
  } catch (error: any) {
    AppLogger.error('Error en dashboard de admin', {
      error: error.message,
      stack: error.stack,
      userId: ((req as any).platformUser as AuthPayload)?.userId,
    });
    res.status(500).json({ message: 'Error al obtener dashboard', error: error.message });
  }
};

// Dashboard para superadmin
export const getDashboardSuperAdmin = async (req: Request, res: Response) => {
  try {
    const user = (req as any).platformUser as AuthPayload;

    if (!user) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (user.role !== 'SUPERADMIN') {
      return res.status(403).json({ message: 'Se requiere rol de superadmin' });
    }

    AppLogger.info('Iniciando obtención de datos para dashboard de superadmin', {
      userId: user.userId,
    });

    // Obtener estadísticas de usuarios
    const usersCount = await prisma.user.count();

    // Usuarios activos en los últimos 30 días - SIMPLIFICADO
    const activeUsersCount = await prisma.user.count();

    // Obtener estadísticas de empresas - SIMPLIFICADO
    const empresasCount = await prisma.empresa.count();
    const empresas = await prisma.empresa.findMany({
      take: 5,
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Estadísticas de empresas por mes (últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const empresasStats = await prisma.empresa.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: { createdAt: { gte: sixMonthsAgo } },
      orderBy: { createdAt: 'asc' },
    });

    // Obtener últimos usuarios - SIMPLIFICADO
    const recentUsers = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Formatear actividad del sistema
    const systemActivity = [
      ...recentUsers.map((u: any) => ({
        id: `user-${u.id}`,
        action: 'Usuario creado',
        user: u.email,
        timestamp: u.createdAt.toISOString(),
        description: `Usuario ${u.email} creado con rol ${u.role}`,
      })),
      ...empresas.slice(0, 5).map((e: any) => ({
        id: `empresa-${e.id}`,
        action: 'Empresa creada',
        user: 'Sistema',
        timestamp: e.createdAt.toISOString(),
        description: `Empresa ${e.nombre} agregada al sistema`,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

    AppLogger.info('Dashboard de superadmin obtenido exitosamente', {
      userId: user.userId,
      usersCount,
      activeUsersCount,
      empresasCount,
    });

    res.json({
      empresasCount,
      totalUsersCount: usersCount,
      activeBotsCount: 0,
      totalBots: 0,
      // Usar memoria RSS como % de un límite razonable (500MB para apps Node.js)
      serverUsage: Math.min(Math.round((process.memoryUsage().rss / (500 * 1024 * 1024)) * 100), 100),
      empresasStats: empresasStats.length > 0 
        ? empresasStats.map((stat: any) => ({
            month: stat.createdAt.toISOString().substring(0, 7), // YYYY-MM format
            count: stat._count.id,
          }))
        : [{ month: new Date().toISOString().substring(0, 7), count: 0 }],
      empresas: empresas.map((empresa: any) => ({
        id: empresa.id,
        nombre: empresa.nombre,
        descripcion: empresa.descripcion,
        usuariosCount: 0, // Simplified for now
        createdAt: empresa.createdAt.toISOString(),
        updatedAt: empresa.updatedAt.toISOString(),
      })),
      systemActivity,
      totalTextsCount: 0,
      pendingTextsCount: 0,
      completedTextsCount: 0,
      processedToday: 0,
      recentActivity: systemActivity,
    });
  } catch (error: any) {
    AppLogger.error('Error en dashboard de superadmin', {
      error: error.message,
      stack: error.stack,
      userId: ((req as any).platformUser as AuthPayload)?.userId,
    });
    res.status(500).json({ message: 'Error al obtener dashboard', error: error.message });
  }
};

// Función principal que determina qué dashboard mostrar según el rol
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const user = (req as any).platformUser as AuthPayload;

    if (!user) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    AppLogger.info('Solicitando dashboard', {
      userId: user.userId,
      role: user.role,
    });

    switch (user.role) {
      case 'SUPERADMIN':
        return await getDashboardSuperAdmin(req, res);
      case 'ADMIN':
        return await getDashboardAdmin(req, res);
      case 'OPERATOR':
      default:
        return await getDashboardUser(req, res);
    }
  } catch (error: any) {
    AppLogger.error('Error en getDashboard', {
      error: error.message,
      stack: error.stack,
      userId: (req as any).platformUser?.userId,
    });
    res.status(500).json({ message: 'Error al obtener dashboard', error: error.message });
  }
};

// Función para refrescar datos del dashboard
export const refreshDashboard = async (req: Request, res: Response) => {
  try {
    AppLogger.info('Refrescando dashboard', { userId: (req as any).platformUser?.userId });

    // Simplemente redirigir a getDashboard
    return await getDashboard(req, res);
  } catch (error: any) {
    AppLogger.error('Error al refrescar dashboard', {
      error: error.message,
      stack: error.stack,
      userId: (req as any).platformUser?.userId,
    });
    res.status(500).json({ message: 'Error al refrescar dashboard', error: error.message });
  }
};
