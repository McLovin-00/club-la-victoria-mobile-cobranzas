import { AppLogger } from '../config/logger';
import { prisma } from '../config/database';
import type { Worker as WorkerType } from 'worker_threads';
import ExcelJS from 'exceljs';
import { randomBytes } from 'crypto';

// ============================================================================
// TIPOS
// ============================================================================
type EquipoExcelRow = {
  equipoId: number;
  empresaCuit: string;
  empresaRazonSocial: string;
  choferDni: string;
  choferNombre: string;
  choferApellido: string;
  camionPatente: string;
  acopladoPatente: string;
};

type ZipJob = {
  id: string;
  tenantEmpresaId: number;
  createdAt: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  totalEquipos: number;
  processedEquipos: number;
  artifact?: { bucketName: string; objectPath: string } | null;
  retryCount?: number;
  maxRetries?: number;
};

interface EquipoData {
  id: number;
  tenantEmpresaId: number;
  dadorCargaId: number;
  driverId: number;
  truckId: number;
  trailerId: number | null;
  empresaTransportistaId: number | null;
  driverDniNorm: string | null;
  truckPlateNorm: string | null;
  trailerPlateNorm: string | null;
  empresaTransportista: { cuit: string; razonSocial: string } | null;
}

interface EntityRelations {
  chofer: { dni: string; nombre: string; apellido: string } | null;
  camion: { patente: string } | null;
  acoplado: { patente: string } | null;
}

// ============================================================================
// HELPERS DE CARGA DE DATOS
// ============================================================================
async function loadEquipoWithRelations(equipoId: number): Promise<{ equipo: EquipoData | null; relations: EntityRelations }> {
  const equipo = await prisma.equipo.findUnique({
    where: { id: equipoId },
    include: {
      empresaTransportista: { select: { cuit: true, razonSocial: true } },
    },
  }) as EquipoData | null;

  if (!equipo) {
    return { equipo: null, relations: { chofer: null, camion: null, acoplado: null } };
  }

  const [chofer, camion, acoplado] = await Promise.all([
    prisma.chofer.findUnique({ where: { id: equipo.driverId }, select: { dni: true, nombre: true, apellido: true } }),
    prisma.camion.findUnique({ where: { id: equipo.truckId }, select: { patente: true } }),
    equipo.trailerId ? prisma.acoplado.findUnique({ where: { id: equipo.trailerId }, select: { patente: true } }) : null,
  ]);

  return { equipo, relations: { chofer: chofer as any, camion, acoplado } };
}

function buildExcelRow(equipo: EquipoData, relations: EntityRelations): EquipoExcelRow {
  return {
    equipoId: equipo.id,
    empresaCuit: equipo.empresaTransportista?.cuit || '',
    empresaRazonSocial: equipo.empresaTransportista?.razonSocial || '',
    choferDni: relations.chofer?.dni || equipo.driverDniNorm || '',
    choferNombre: relations.chofer?.nombre || '',
    choferApellido: relations.chofer?.apellido || '',
    camionPatente: relations.camion?.patente || equipo.truckPlateNorm || '',
    acopladoPatente: relations.acoplado?.patente || equipo.trailerPlateNorm || '',
  };
}

async function loadEquipoDocuments(equipo: EquipoData, now: Date): Promise<any[]> {
  const entityClauses: any[] = [];
  if (equipo.empresaTransportistaId) entityClauses.push({ entityType: 'EMPRESA_TRANSPORTISTA', entityId: equipo.empresaTransportistaId });
  if (equipo.driverId) entityClauses.push({ entityType: 'CHOFER', entityId: equipo.driverId });
  if (equipo.truckId) entityClauses.push({ entityType: 'CAMION', entityId: equipo.truckId });
  if (equipo.trailerId) entityClauses.push({ entityType: 'ACOPLADO', entityId: equipo.trailerId });

  return prisma.document.findMany({
    where: {
      tenantEmpresaId: equipo.tenantEmpresaId,
      dadorCargaId: equipo.dadorCargaId,
      status: 'APROBADO' as any,
      AND: [
        entityClauses.length ? { OR: entityClauses } : {},
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    } as any,
    include: { template: { select: { name: true } } },
    orderBy: { uploadedAt: 'desc' },
  });
}

function parseFilePath(filePath: string, tenantEmpresaId: number): { bucketName: string; objectPath: string } {
  if (filePath.includes('/')) {
    const idx = filePath.indexOf('/');
    return { bucketName: filePath.slice(0, idx), objectPath: filePath.slice(idx + 1) };
  }
  return { bucketName: `docs-t${tenantEmpresaId}`, objectPath: filePath };
}

function getEntityFolder(entityType: string): string {
  const folders: Record<string, string> = { CHOFER: 'chofer', CAMION: 'camion', ACOPLADO: 'acoplado' };
  return folders[entityType] || 'otro';
}

function getEntityIdLabel(entityType: string, equipo: EquipoData, fallbackId: number): string {
  const labels: Record<string, string | null> = {
    CHOFER: equipo.driverDniNorm,
    CAMION: equipo.truckPlateNorm,
    ACOPLADO: equipo.trailerPlateNorm,
  };
  return labels[entityType] || String(fallbackId);
}

function buildZipEntryName(doc: any, equipo: EquipoData): string {
  const folder = getEntityFolder(doc.entityType);
  const idLabel = getEntityIdLabel(doc.entityType, equipo, doc.entityId);
  const templateName = (doc.template?.name || 'documento').replace(/[^a-z0-9_-]/gi, '_');
  return `equipo_${equipo.id}/${folder}/${idLabel}_${templateName}_${doc.id}.pdf`;
}

// ============================================================================
// GENERACIÓN DE EXCEL
// ============================================================================
async function generateEquiposExcel(rows: EquipoExcelRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BCA Documentos';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Equipos', {
    properties: { tabColor: { argb: '2563eb' } }
  });

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

  // Estilo de encabezados
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563eb' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 22;

  for (const row of rows) {
    sheet.addRow(row);
  }

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'D1D5DB' } },
        left: { style: 'thin', color: { argb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
        right: { style: 'thin', color: { argb: 'D1D5DB' } }
      };
      if (rowNumber > 1) {
        cell.alignment = { vertical: 'middle' };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ============================================================================
// PROCESAMIENTO DE EQUIPO
// ============================================================================
async function processEquipoForZip(
  equipoId: number,
  tenantEmpresaId: number,
  zipStream: any,
  now: Date
): Promise<EquipoExcelRow | null> {
  const { equipo, relations } = await loadEquipoWithRelations(equipoId);

  if (!equipo || equipo.tenantEmpresaId !== tenantEmpresaId) {
    return null;
  }

  // Cargar documentos
  const docs = await loadEquipoDocuments(equipo, now);

  // Agregar documentos al ZIP
  const { minioService } = await import('./minio.service');
  for (const doc of docs) {
    const { bucketName, objectPath } = parseFilePath(doc.filePath, tenantEmpresaId);
    const stream = await minioService.getObject(bucketName, objectPath);
    const entryName = buildZipEntryName(doc, equipo);
    zipStream.append(stream as any, { name: entryName });
  }

  return buildExcelRow(equipo, relations);
}

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================
export class DocumentZipService {
  private static getStore(): Map<string, ZipJob> {
    (globalThis as any).__ZIP_JOBS = (globalThis as any).__ZIP_JOBS || new Map<string, ZipJob>();
    return (globalThis as any).__ZIP_JOBS;
  }

  private static forcedFailOnce = new Set<string>();

  private static get Worker(): typeof WorkerType | null {
    try {
      const { Worker } = require('worker_threads') as typeof import('worker_threads');
      return Worker;
    } catch {
      return null;
    }
  }

  static getJob(jobId: string): ZipJob | undefined {
    const store = this.getStore();
    const j = store.get(jobId);
    return j ? { ...j } : undefined;
  }

  static enqueueZipJob(tenantEmpresaId: number, equipoIds: number[]): string {
    const id = `zip_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const store = this.getStore();
    store.set(id, {
      id,
      tenantEmpresaId,
      createdAt: Date.now(),
      status: 'queued',
      progress: 0,
      totalEquipos: equipoIds.length,
      processedEquipos: 0,
      artifact: null,
      retryCount: 0,
      maxRetries: Number(process.env.DOCUMENT_ZIP_MAX_RETRIES || 2),
    });

    // Test environment mock
    if (process.env.NODE_ENV === 'test' && process.env.ZIP_ENABLE_ASYNC !== 'true') {
      const j = store.get(id)!;
      j.status = 'completed';
      j.progress = 1;
      j.artifact = { bucketName: `docs-t${tenantEmpresaId}`, objectPath: `exports/zips/${id}.zip` };
      store.set(id, { ...j });
      return id;
    }

    setTimeout(() => this.startJobWithRetry(id, tenantEmpresaId, equipoIds).catch(() => {}), 10);
    return id;
  }

  private static async startJobWithRetry(jobId: string, tenantEmpresaId: number, equipoIds: number[]) {
    const store = this.getStore();
    const job = store.get(jobId);
    if (!job) return;

    try {
      AppLogger.info('📦 Iniciando ZIP job', { jobId, attempt: (job.retryCount ?? 0) + 1, total: equipoIds.length });
      
      const useWorker = String(process.env.ZIP_USE_WORKER || '').toLowerCase() === 'true' && process.env.NODE_ENV !== 'test';
      if (useWorker && this.Worker) {
        await this.runInWorker(jobId, tenantEmpresaId, equipoIds);
      } else {
        await this.runJob(jobId, tenantEmpresaId, equipoIds);
      }
    } catch (err: any) {
      this.handleJobError(jobId, tenantEmpresaId, equipoIds, err);
    }
  }

  private static handleJobError(jobId: string, tenantEmpresaId: number, equipoIds: number[], err: any): void {
    const store = this.getStore();
    const current = store.get(jobId);
    if (!current) return;

    const maxRetries = current.maxRetries ?? 0;
    const nextRetry = (current.retryCount ?? 0) + 1;

    if (nextRetry <= maxRetries) {
      current.retryCount = nextRetry;
      current.status = 'queued';
      current.message = `Retrying (${nextRetry}/${maxRetries}) after error: ${err?.message || err}`;
      store.set(jobId, { ...current });

      const backoffMs = Math.min(30000, Math.pow(2, nextRetry) * (process.env.NODE_ENV === 'test' ? 200 : 1000));
      AppLogger.warn('🔁 Reintentando ZIP job', { jobId, nextRetry, backoffMs });
      setTimeout(() => this.startJobWithRetry(jobId, tenantEmpresaId, equipoIds).catch(() => {}), backoffMs);
      return;
    }

    current.status = 'failed';
    current.message = err?.message || 'Error generando ZIP';
    current.progress = 1;
    store.set(jobId, { ...current });
    AppLogger.error('💥 ZIP job falló sin reintentos restantes', { jobId, error: err?.message });
  }

  private static async runInWorker(jobId: string, tenantEmpresaId: number, equipoIds: number[]): Promise<void> {
    const Worker = this.Worker;
    if (!Worker) {
      await this.runJob(jobId, tenantEmpresaId, equipoIds);
      return;
    }

    const path = require('path');
    const workerPath = path.resolve(__dirname, '../workers/document-zip.worker.ts');
    const worker = new Worker(workerPath, {
      execArgv: ['-r', 'ts-node/register/transpile-only'],
      workerData: { jobId, tenantEmpresaId, equipoIds },
    });

    if (typeof worker.unref === 'function') worker.unref();

    await new Promise<void>((resolve, reject) => {
      worker.once('message', (msg: any) => msg?.ok ? resolve() : reject(new Error(msg?.error)));
      worker.once('error', reject);
      worker.once('exit', (code: number) => code === 0 ? resolve() : reject(new Error(`Worker exited with code ${code}`)));
    });
  }

  private static async runJob(jobId: string, tenantEmpresaId: number, equipoIds: number[]): Promise<void> {
    const store = this.getStore();
    const job = store.get(jobId);
    if (!job) return;

    job.status = 'processing';
    job.progress = 0.05;
    store.set(jobId, { ...job });

    // Force fail for testing
    if (process.env.ZIP_FORCE_FAIL_FIRST === 'true' && !this.forcedFailOnce.has(jobId)) {
      this.forcedFailOnce.add(jobId);
      throw new Error('Forced failure (test)');
    }

    const archiverMod = await import('archiver');
    const archiver = (archiverMod as any).default || archiverMod;
    const { PassThrough } = await import('stream');

    const zipStream = archiver('zip', { zlib: { level: 9 } });
    const out = new PassThrough();
    const chunks: Buffer[] = [];
    out.on('data', (d: Buffer) => chunks.push(Buffer.from(d)));
    zipStream.on('error', (err: any) => { AppLogger.error('💥 Error en ZIP:', err); throw err; });
    zipStream.pipe(out);

    const excelRows: EquipoExcelRow[] = [];
    const now = new Date();
    let processed = 0;

    for (const equipoId of equipoIds) {
      const row = await processEquipoForZip(equipoId, tenantEmpresaId, zipStream, now);
      if (row) excelRows.push(row);

      processed += 1;
      job.processedEquipos = processed;
      job.progress = Math.min(0.05 + (processed / equipoIds.length) * 0.9, 0.95);
      store.set(jobId, { ...job });
    }

    // Agregar Excel al ZIP
    const excelBuffer = await generateEquiposExcel(excelRows);
    zipStream.append(excelBuffer, { name: 'resumen_equipos.xlsx' });

    await zipStream.finalize();
    await new Promise<void>((resolve, reject) => {
      out.on('finish', resolve);
      out.on('error', reject);
    });

    // Subir a MinIO
    const buffer = Buffer.concat(chunks);
    const objectPath = `exports/zips/${jobId}.zip`;
    const { minioService } = await import('./minio.service');
    const uploaded = await minioService.uploadObject(tenantEmpresaId, objectPath, buffer, 'application/zip');

    job.status = 'completed';
    job.progress = 1;
    job.artifact = uploaded;
    store.set(jobId, { ...job });

    AppLogger.info('📦 ZIP masivo generado', { jobId, size: buffer.length, objectPath: uploaded.objectPath });
  }
}
