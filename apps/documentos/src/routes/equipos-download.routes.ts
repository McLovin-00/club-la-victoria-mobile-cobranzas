/**
 * Rutas de descarga de equipos que manejan autenticación interna via token en body.
 * Estas rutas NO pasan por el middleware authenticate porque reciben el token
 * como parte del form-data para permitir descargas directas desde el navegador.
 */
import { Router, Request, Response } from 'express';
import { AppLogger } from '../config/logger';
import { prisma } from '../config/database';
import ExcelJS from 'exceljs';
import { verifyJwtFromForm } from '../utils/jwt.utils';

const router: ReturnType<typeof Router> = Router();

// ============================================================================
// HELPERS EXCEL
// ============================================================================
interface ExcelRow {
  equipoId: number;
  empresaCuit: string;
  empresaRazonSocial: string;
  choferDni: string;
  choferNombre: string;
  choferApellido: string;
  camionPatente: string;
  acopladoPatente: string;
}

async function buildExcelRowsOnly(equipoIds: number[], tenantEmpresaId?: number): Promise<ExcelRow[]> {
  const rows: ExcelRow[] = [];
  for (const equipoId of equipoIds) {
    const equipo = await prisma.equipo.findUnique({
      where: { id: equipoId },
      include: { empresaTransportista: { select: { cuit: true, razonSocial: true } } },
    });
    if (!equipo) continue;
    if (tenantEmpresaId && equipo.tenantEmpresaId !== tenantEmpresaId) continue;

    const [chofer, camion, acoplado] = await Promise.all([
      prisma.chofer.findUnique({ where: { id: equipo.driverId }, select: { dni: true, nombre: true, apellido: true } }),
      prisma.camion.findUnique({ where: { id: equipo.truckId }, select: { patente: true } }),
      equipo.trailerId ? prisma.acoplado.findUnique({ where: { id: equipo.trailerId }, select: { patente: true } }) : null,
    ]);

    rows.push({
      equipoId: equipo.id,
      empresaCuit: equipo.empresaTransportista?.cuit ?? '',
      empresaRazonSocial: equipo.empresaTransportista?.razonSocial ?? '',
      choferDni: chofer?.dni ?? equipo.driverDniNorm ?? '',
      choferNombre: chofer?.nombre ?? '',
      choferApellido: chofer?.apellido ?? '',
      camionPatente: camion?.patente ?? equipo.truckPlateNorm ?? '',
      acopladoPatente: acoplado?.patente ?? equipo.trailerPlateNorm ?? '',
    });
  }
  return rows;
}

async function generateExcelBuffer(rows: ExcelRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BCA Documentos';

  const sheet = workbook.addWorksheet('Equipos', { properties: { tabColor: { argb: '2563eb' } } });
  sheet.columns = [
    { header: 'ID Equipo', key: 'equipoId', width: 12 },
    { header: 'Empresa CUIT', key: 'empresaCuit', width: 18 },
    { header: 'Empresa Razón Social', key: 'empresaRazonSocial', width: 35 },
    { header: 'Chofer DNI', key: 'choferDni', width: 15 },
    { header: 'Chofer Nombre', key: 'choferNombre', width: 20 },
    { header: 'Chofer Apellido', key: 'choferApellido', width: 20 },
    { header: 'Camión Patente', key: 'camionPatente', width: 15 },
    { header: 'Acoplado Patente', key: 'acopladoPatente', width: 15 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563eb' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 22;

  for (const row of rows) sheet.addRow(row);

  sheet.eachRow((row, num) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'D1D5DB' } },
        left: { style: 'thin', color: { argb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
        right: { style: 'thin', color: { argb: 'D1D5DB' } },
      };
      if (num > 1) cell.alignment = { vertical: 'middle' };
    });
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// ============================================================================
// VALIDACIÓN DE TOKEN Y ROLES
// ============================================================================
const ALLOWED_ROLES = new Set(['ADMIN', 'SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA']);

function validateFormAuth(req: Request, res: Response): { valid: boolean; decoded?: any } {
  const token = String(req.body?.token || '');
  
  AppLogger.debug('📊 Form auth validation', {
    hasToken: !!token,
    bodyKeys: Object.keys(req.body || {}),
    contentType: req.headers['content-type'],
  });

  if (!token) {
    res.status(401).json({ success: false, message: 'Token de autenticación requerido', code: 'MISSING_TOKEN' });
    return { valid: false };
  }

  const decoded = verifyJwtFromForm(token);
  if (!decoded) {
    res.status(401).json({ success: false, message: 'Token inválido o expirado', code: 'INVALID_TOKEN' });
    return { valid: false };
  }

  const userRole = String(decoded.role || decoded.userRole || '');
  if (!ALLOWED_ROLES.has(userRole)) {
    res.status(403).json({ success: false, message: 'No autorizado para esta operación', code: 'FORBIDDEN' });
    return { valid: false };
  }

  return { valid: true, decoded };
}

function parseEquipoIds(req: Request, res: Response, maxLimit: number): { valid: boolean; ids?: number[] } {
  const equipoIds = String(req.body?.equipoIds || '')
    .split(',')
    .map((s: string) => Number(s.trim()))
    .filter((n: number) => Number.isInteger(n) && n > 0);

  if (!equipoIds.length) {
    res.status(400).json({ success: false, message: 'Se requiere al menos un equipoId', code: 'MISSING_EQUIPO_IDS' });
    return { valid: false };
  }

  if (equipoIds.length > maxLimit) {
    res.status(400).json({ success: false, message: `Máximo ${maxLimit} equipos permitidos`, code: 'TOO_MANY_EQUIPOS' });
    return { valid: false };
  }

  return { valid: true, ids: equipoIds };
}

// ============================================================================
// RUTAS
// ============================================================================

/**
 * POST /excel-form
 * Descarga solo el Excel con datos de equipos (sin documentos).
 * Autenticación via token en body del formulario.
 */
router.post('/excel-form', async (req: Request, res: Response) => {
  const auth = validateFormAuth(req, res);
  if (!auth.valid) return;

  const equipos = parseEquipoIds(req, res, 5000);
  if (!equipos.valid || !equipos.ids) return;

  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=resumen_equipos_${stamp}.xlsx`);

  try {
    AppLogger.info('📊 Generando Excel de equipos', { totalEquipos: equipos.ids.length, user: auth.decoded?.email });
    
    const tenantEmpresaId = auth.decoded?.empresaId;
    const excelRows = await buildExcelRowsOnly(equipos.ids, tenantEmpresaId);
    
    if (excelRows.length === 0) {
      AppLogger.warn('📊 No hay equipos para generar Excel');
      res.status(404).send('No se encontraron equipos');
      return;
    }

    const excelBuffer = await generateExcelBuffer(excelRows);
    AppLogger.info('📊 Excel generado correctamente', { rows: excelRows.length, size: excelBuffer.length });
    
    res.send(excelBuffer);
  } catch (err) {
    AppLogger.error('💥 Error generando Excel', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error generando Excel', code: 'EXCEL_GENERATION_ERROR' });
    }
  }
});

/**
 * POST /vigentes-form
 * Descarga ZIP con documentos vigentes de equipos.
 * Autenticación via token en body del formulario.
 * (Este endpoint se mantiene en equipos.routes.ts por su complejidad)
 */

export default router;
