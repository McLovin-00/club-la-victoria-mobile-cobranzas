import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';

const router: ReturnType<typeof Router> = Router();

router.use(authenticate);

// Helper: construir filtro de búsqueda para transportistas
function buildSearchFilter(meta: any, body: any): Record<string, any> | null {
  const empresaTransportistaId = meta.empresaTransportistaId ? Number(meta.empresaTransportistaId) : undefined;
  const choferId = meta.choferId ? Number(meta.choferId) : undefined;
  const dniNorm = (body?.dni || meta.choferDniNorm || '').toString().replace(/\D/g, '');
  const plate = (body?.plate || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');

  const where: any = {};
  
  if (empresaTransportistaId) {
    where.empresaTransportistaId = empresaTransportistaId;
  }
  
  // Agregar condiciones de chofer
  const choferConditions = [
    choferId ? { driverId: choferId } : null,
    dniNorm ? { driverDniNorm: dniNorm } : null,
  ].filter(Boolean);
  
  if (choferConditions.length) {
    where.OR = choferConditions;
  }
  
  // Agregar condiciones de placa
  if (plate) {
    where.OR = [
      ...(where.OR || []),
      { truckPlateNorm: plate },
      { trailerPlateNorm: plate },
    ];
  }
  
  return Object.keys(where).length ? where : null;
}

// Mis equipos (para chofer logueado) - requiere que el token tenga un dni o choferId
router.get('/mis-equipos', async (req: any, res) => {
  const user = req.user;
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
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, message: 'UNAUTHORIZED' });
  
  const where = buildSearchFilter(user.metadata || {}, req.body);
  if (!where) return res.json({ success: true, data: [] });
  
  const equipos = await prisma.equipo.findMany({
    where,
    select: { id: true, driverDniNorm: true, truckPlateNorm: true, trailerPlateNorm: true, empresaTransportistaId: true },
    orderBy: { id: 'desc' },
    take: 100,
  });
  res.json({ success: true, data: equipos });
});

export default router;


