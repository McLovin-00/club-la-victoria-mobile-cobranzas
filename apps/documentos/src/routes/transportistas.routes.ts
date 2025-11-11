import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';

const router = Router();

router.use(authenticate);

// Mis equipos (para chofer logueado) - requiere que el token tenga un dni o choferId
router.get('/mis-equipos', async (req: any, res) => {
  const user = req.user as any;
  if (!user) return res.status(401).json({ success: false, message: 'UNAUTHORIZED' });
  // Intentar mapear chofer por DNI o por userId si hay relación
  let chofer: any = null;
  if (user.dni) {
    chofer = await prisma.chofer.findFirst({ where: { dni: String(user.dni) } });
  }
  if (!chofer && user.choferId) {
    chofer = await prisma.chofer.findUnique({ where: { id: Number(user.choferId) } });
  }
  if (!chofer) return res.json({ success: true, data: [] });

  const equipos = await prisma.equipo.findMany({
    where: { driverId: chofer.id },
    select: { id: true, driverDniNorm: true, truckPlateNorm: true, trailerPlateNorm: true },
    orderBy: { id: 'desc' },
  });
  res.json({ success: true, data: equipos });
});

// Búsquedas limitadas por transportista (por DNI/placa, acotadas al dueño)
router.post('/search', async (req: any, res) => {
  const user = req.user as any;
  if (!user) return res.status(401).json({ success: false, message: 'UNAUTHORIZED' });
  const meta = (user.metadata || {}) as any;
  const empresaTransportistaId = meta.empresaTransportistaId ? Number(meta.empresaTransportistaId) : undefined;
  const choferId = meta.choferId ? Number(meta.choferId) : undefined;
  const dniNorm = (req.body?.dni || meta.choferDniNorm || '').toString().replace(/[^0-9]/g, '');
  const plate = (req.body?.plate || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');

  const where: any = { };
  if (empresaTransportistaId) where.empresaTransportistaId = empresaTransportistaId;
  if (choferId || dniNorm) {
    where.OR = [
      choferId ? { driverId: choferId } : undefined,
      dniNorm ? { driverDniNorm: dniNorm } : undefined,
    ].filter(Boolean);
  }
  if (plate) {
    where.OR = [
      ...(where.OR || []),
      { truckPlateNorm: plate },
      { trailerPlateNorm: plate },
    ];
  }
  if (!Object.keys(where).length) return res.json({ success: true, data: [] });
  const equipos = await prisma.equipo.findMany({
    where,
    select: { id: true, driverDniNorm: true, truckPlateNorm: true, trailerPlateNorm: true, empresaTransportistaId: true },
    orderBy: { id: 'desc' },
    take: 100,
  });
  res.json({ success: true, data: equipos });
});

export default router;


