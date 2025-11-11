import { Router, Response } from 'express';
import { authenticate, authorize, tenantResolver, validate } from '../middlewares/auth.middleware';
import { UserRole } from '../types/roles';
import { auditLogsQuerySchema } from '../schemas/audit.schemas';
import { db } from '../config/database';
import { AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate, tenantResolver);

// Solo roles con privilegios pueden consultar auditoría
const ADMIN_ROLES = [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.ADMIN_INTERNO];

async function buildWhereFromQuery(req: AuthRequest): Promise<any> {
  const {
    from,
    to,
    userId,
    userRole,
    method,
    statusCode,
    action,
    entityType,
    entityId,
    pathContains,
  } = req.query as any;
  const where: any = { tenantEmpresaId: req.tenantId };
  if (userId) where.userId = Number(userId);
  if (userRole) where.userRole = String(userRole);
  if (method) where.method = String(method);
  if (statusCode) where.statusCode = Number(statusCode);
  if (action) where.accion = String(action);
  if (entityType) where.entityType = String(entityType);
  if (entityId) where.entityId = Number(entityId);
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(String(from));
    if (to) where.createdAt.lte = new Date(String(to));
  }
  if (pathContains) {
    where.path = { contains: String(pathContains), mode: 'insensitive' };
  }
  return where;
}

router.get(
  '/logs',
  authorize(ADMIN_ROLES),
  validate(auditLogsQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const prisma: any = db.getClient?.();
      const { page = 1, limit = 20 } = req.query as any;

      const where = await buildWhereFromQuery(req);

      if (!prisma?.auditLog?.findMany) {
        res.json({
          success: true,
          data: [],
          total: 0,
          page: Number(page),
          limit: Number(limit),
          totalPages: 0,
        });
        return;
      }

      const [data, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({
        success: true,
        data,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }
);

// CSV export
router.get(
  '/logs.csv',
  authorize(ADMIN_ROLES),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const prisma: any = db.getClient?.();
      if (!prisma?.auditLog?.findMany) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
        res.end('id,createdAt,accion,method,statusCode,userId,userRole,entityType,entityId,path\n');
        return;
      }
      const where = await buildWhereFromQuery(req);
      const rows = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10000,
      });
      const esc = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const header = 'id,createdAt,accion,method,statusCode,userId,userRole,entityType,entityId,path\n';
      const lines = rows.map((r: any) =>
        [r.id, r.createdAt?.toISOString?.() || r.createdAt, r.accion, r.method, r.statusCode, r.userId ?? '', r.userRole ?? '', r.entityType ?? '', r.entityId ?? '', r.path ?? '']
          .map(esc)
          .join(',')
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
      res.end(header + lines.join('\n') + '\n');
    } catch (_error) {
      res.status(500).json({ success: false, message: 'Error generando CSV' });
    }
  }
);

// Excel export
let _excel: any;
async function getExcel() {
  if (!_excel) {
    const mod = await import('exceljs');
    _excel = mod as any;
  }
  return _excel;
}
router.get(
  '/logs.xlsx',
  authorize(ADMIN_ROLES),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const prisma: any = db.getClient?.();
      if (!prisma?.auditLog?.findMany) {
        res.status(200).end();
        return;
      }
      const where = await buildWhereFromQuery(req);
      const rows = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10000,
      });
      const ExcelJS = await getExcel();
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('AuditLogs');
      ws.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Fecha', key: 'createdAt', width: 24 },
        { header: 'Acción', key: 'accion', width: 30 },
        { header: 'Método', key: 'method', width: 10 },
        { header: 'Status', key: 'statusCode', width: 8 },
        { header: 'Usuario', key: 'userId', width: 12 },
        { header: 'Rol', key: 'userRole', width: 16 },
        { header: 'Entidad', key: 'entityType', width: 16 },
        { header: 'Entidad ID', key: 'entityId', width: 12 },
        { header: 'Ruta', key: 'path', width: 50 },
      ];
      rows.forEach((r: any) => {
        ws.addRow({
          id: r.id,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
          accion: r.accion,
          method: r.method,
          statusCode: r.statusCode,
          userId: r.userId ?? '',
          userRole: r.userRole ?? '',
          entityType: r.entityType ?? '',
          entityId: r.entityId ?? '',
          path: r.path ?? '',
        });
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.xlsx');
      await wb.xlsx.write(res as any);
      res.end();
    } catch (_error) {
      res.status(500).json({ success: false, message: 'Error generando Excel' });
    }
  }
);

export default router;


