import { Router, Request, Response } from 'express';
import { authenticateUser, authorizeRoles } from '../middlewares/platformAuth.middleware';

// Domain routes for Documentos main endpoints used by frontend (dadores, defaults, etc.)
const router = Router();

// In-memory mock state (replace with DB in real service)
let defaultsState: {
  defaultClienteId: number | null;
  defaultDadorId: number | null;
  missingCheckDelayMinutes: number | null;
  noExpiryHorizonYears?: number | null;
} = {
  defaultClienteId: null,
  defaultDadorId: null,
  missingCheckDelayMinutes: 15,
  noExpiryHorizonYears: 100,
};

let dadores: Array<{ id: number; razonSocial: string; cuit: string; activo: boolean; notas?: string; phones?: string[] }> = [
  { id: 1, razonSocial: 'Dador Demo S.A.', cuit: '30-12345678-9', activo: true, phones: ['+5491112345678'] },
];

let clients: Array<{ id: number; razonSocial: string; cuit: string; activo: boolean; notas?: string }> = [
  { id: 1, razonSocial: 'Cliente Demo S.A.', cuit: '30-22334455-6', activo: true },
  { id: 2, razonSocial: 'Cliente Norte SRL', cuit: '30-33445566-7', activo: true },
];

// Requisitos por cliente (mock)
const clientRequirements: Record<number, Array<{ id: number; templateId: number; entityType: 'CHOFER'|'CAMION'|'ACOPLADO'; obligatorio: boolean; diasAnticipacion: number; visibleChofer: boolean; template: { id: number; name: string; entityType: string } }>> = {
  1: [
    { id: 11, templateId: 1001, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 15, visibleChofer: true, template: { id: 1001, name: 'Licencia', entityType: 'CHOFER' } },
    { id: 12, templateId: 1002, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 30, visibleChofer: false, template: { id: 1002, name: 'VTV', entityType: 'CAMION' } },
  ],
  2: [
    { id: 21, templateId: 1003, entityType: 'ACOPLADO', obligatorio: false, diasAnticipacion: 10, visibleChofer: true, template: { id: 1003, name: 'Seguro', entityType: 'ACOPLADO' } },
  ],
};

const equipos: Array<{
  id: number;
  dadorCargaId: number;
  driverDniNorm: string;
  truckPlateNorm: string;
  trailerPlateNorm?: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
}> = [
  { id: 101, dadorCargaId: 1, driverDniNorm: '12345678', truckPlateNorm: 'AA123BB', trailerPlateNorm: 'AC456CD', estado: 'ACTIVO' },
  { id: 102, dadorCargaId: 1, driverDniNorm: '87654321', truckPlateNorm: 'AB987CD', trailerPlateNorm: null, estado: 'ACTIVO' },
];

// GET /api/docs/defaults
router.get(
  '/defaults',
  authenticateUser,
  authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']),
  async (_req: Request, res: Response) => {
    return res.json({ success: true, data: defaultsState, timestamp: new Date().toISOString() });
  }
);

// PUT /api/docs/defaults
router.put(
  '/defaults',
  authenticateUser,
  authorizeRoles(['ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    const body = req.body || {};
    defaultsState = { ...defaultsState, ...body };
    return res.json({ success: true, data: defaultsState, timestamp: new Date().toISOString() });
  }
);

// GET /api/docs/dadores
router.get(
  '/dadores',
  authenticateUser,
  authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    const { activo } = req.query as any;
    let list = dadores;
    if (activo !== undefined) {
      const flag = String(activo) === 'true';
      list = dadores.filter((d) => d.activo === flag);
    }
    return res.json({ success: true, data: list, defaults: { defaultDadorId: defaultsState.defaultDadorId }, timestamp: new Date().toISOString() });
  }
);

// POST /api/docs/dadores
router.post(
  '/dadores',
  authenticateUser,
  authorizeRoles(['ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    const { razonSocial, cuit, activo = true, notas = '', phones = [] } = req.body || {};
    const next = { id: Date.now(), razonSocial, cuit, activo: Boolean(activo), notas, phones };
    dadores.push(next);
    return res.json({ success: true, data: next, timestamp: new Date().toISOString() });
  }
);

// PUT /api/docs/dadores/:id
router.put(
  '/dadores/:id',
  authenticateUser,
  authorizeRoles(['ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const idx = dadores.findIndex((d) => d.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Dador no encontrado' });
    dadores[idx] = { ...dadores[idx], ...(req.body || {}) };
    return res.json({ success: true, data: dadores[idx], timestamp: new Date().toISOString() });
  }
);

// DELETE /api/docs/dadores/:id
router.delete(
  '/dadores/:id',
  authenticateUser,
  authorizeRoles(['ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    dadores = dadores.filter((d) => d.id !== id);
    return res.json({ success: true, data: { id }, timestamp: new Date().toISOString() });
  }
);

export default router;

// =============================
// EQUIPOS (para portales)
// =============================
router.get(
  '/equipos',
  authenticateUser,
  authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    const { dadorCargaId } = req.query as any;
    const list = dadorCargaId ? equipos.filter(e => String(e.dadorCargaId) === String(dadorCargaId)) : equipos;
    return res.json({ success: true, data: list, timestamp: new Date().toISOString() });
  }
);

router.post(
  '/equipos/:id/check-missing-now',
  authenticateUser,
  authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    return res.json({ success: true, data: { jobId: `chk_${Date.now()}` }, message: 'Revisión de faltantes iniciada' });
  }
);

router.post(
  '/equipos/:id/request-missing',
  authenticateUser,
  authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    return res.json({ success: true, data: { notifications: 1 }, message: 'Solicitud enviada al chofer' });
  }
);

router.get(
  '/clients/equipos/:id/zip',
  authenticateUser,
  authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const content = Buffer.from(`ZIP placeholder for equipo ${id}`);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=equipo_${id}.zip`);
    return res.send(content);
  }
);

// =============================
// CLIENTES (para portal cliente)
// =============================
router.get(
  '/clients',
  authenticateUser,
  authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    const { activo } = req.query as any;
    let list = clients;
    if (activo !== undefined) {
      const flag = String(activo) === 'true';
      list = clients.filter((c) => c.activo === flag);
    }
    return res.json({ success: true, data: list, defaults: { defaultClienteId: list[0]?.id ?? null }, timestamp: new Date().toISOString() });
  }
);

router.post(
  '/clients',
  authenticateUser,
  authorizeRoles(['ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    const { razonSocial, cuit, activo = true, notas } = req.body || {};
    const next = { id: Date.now(), razonSocial, cuit, activo: Boolean(activo), notas };
    clients.push(next);
    return res.json({ success: true, data: next, timestamp: new Date().toISOString() });
  }
);

router.put(
  '/clients/:id',
  authenticateUser,
  authorizeRoles(['ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const idx = clients.findIndex((c) => c.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    clients[idx] = { ...clients[idx], ...(req.body || {}) };
    return res.json({ success: true, data: clients[idx], timestamp: new Date().toISOString() });
  }
);

router.delete(
  '/clients/:id',
  authenticateUser,
  authorizeRoles(['ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    clients = clients.filter((c) => c.id !== id);
    return res.json({ success: true, data: { id }, timestamp: new Date().toISOString() });
  }
);

router.get(
  '/clients/:clienteId/requirements',
  authenticateUser,
  authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    const clienteId = Number(req.params.clienteId);
    const list = clientRequirements[clienteId] || [];
    return res.json({ success: true, data: list, timestamp: new Date().toISOString() });
  }
);

router.post(
  '/clients/:clienteId/requirements',
  authenticateUser,
  authorizeRoles(['ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    const clienteId = Number(req.params.clienteId);
    const arr = clientRequirements[clienteId] || (clientRequirements[clienteId] = []);
    const next = { id: Date.now(), ...(req.body || {}), template: { id: (req.body?.templateId || 0), name: 'Template', entityType: req.body?.entityType || '' } };
    arr.push(next as any);
    return res.json({ success: true, data: next, timestamp: new Date().toISOString() });
  }
);

router.delete(
  '/clients/:clienteId/requirements/:requirementId',
  authenticateUser,
  authorizeRoles(['ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    const clienteId = Number(req.params.clienteId);
    const reqId = Number(req.params.requirementId);
    const arr = clientRequirements[clienteId] || [];
    clientRequirements[clienteId] = arr.filter((r) => r.id !== reqId) as any;
    return res.json({ success: true, data: { id: reqId }, timestamp: new Date().toISOString() });
  }
);

router.get(
  '/clients/:clienteId/equipos',
  authenticateUser,
  authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']),
  async (req: Request, res: Response) => {
    const _clienteId = Number(req.params.clienteId);
    // Mock: devolver algunos equipos relacionados (usamos lista general como placeholder)
    const list = equipos.map(e => ({ id: e.id, equipo: { id: e.id, driverDniNorm: e.driverDniNorm, truckPlateNorm: e.truckPlateNorm, trailerPlateNorm: e.trailerPlateNorm } }));
    return res.json({ success: true, data: list, timestamp: new Date().toISOString() });
  }
);


