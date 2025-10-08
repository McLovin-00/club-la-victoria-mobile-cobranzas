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

export default router;


