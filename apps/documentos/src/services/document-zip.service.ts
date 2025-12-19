import { AppLogger } from '../config/logger';
import { prisma } from '../config/database';
import type { Worker as WorkerType } from 'worker_threads';
import ExcelJS from 'exceljs';

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
  progress: number; // 0..1
  message?: string;
  totalEquipos: number;
  processedEquipos: number;
  artifact?: { bucketName: string; objectPath: string } | null;
  retryCount?: number;
  maxRetries?: number;
};

export class DocumentZipService {
  private static getStore(): Map<string, ZipJob> {
    (globalThis as any).__ZIP_JOBS = (globalThis as any).__ZIP_JOBS || new Map<string, ZipJob>();
    return (globalThis as any).__ZIP_JOBS;
  }
  // For tests: force first failure per job when enabled via env
  private static forcedFailOnce = new Set<string>();
  // Lazy worker ctor loader
  private static _Worker: typeof WorkerType | null = null;
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
    const id = `zip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
    // In test environment, avoid background async unless explicitly enabled
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
    const attempt = (job.retryCount ?? 0) + 1;
    try {
      try { AppLogger.info('📦 Iniciando ZIP job', { jobId, attempt, total: equipoIds.length }); } catch {}
      const useWorker = String(process.env.ZIP_USE_WORKER || '').toLowerCase() === 'true' && process.env.NODE_ENV !== 'test';
      if (useWorker && this.Worker) {
        await this.runInWorker(jobId, tenantEmpresaId, equipoIds);
      } else {
        await this.runJob(jobId, tenantEmpresaId, equipoIds);
      }
    } catch (err: any) {
      const current = store.get(jobId);
      if (!current) return;
      const maxRetries = current.maxRetries ?? 0;
      const nextRetry = (current.retryCount ?? 0) + 1;
      const canRetry = nextRetry <= maxRetries;
      if (canRetry) {
        current.retryCount = nextRetry;
        current.status = 'queued';
        current.message = `Retrying (${nextRetry}/${maxRetries}) after error: ${err?.message || err}`;
        store.set(jobId, { ...current });
        const base = process.env.NODE_ENV === 'test' ? 200 : 1000;
        const backoffMs = Math.min(30000, Math.pow(2, nextRetry) * base);
        try { AppLogger.warn('🔁 Reintentando ZIP job', { jobId, nextRetry, backoffMs }); } catch {}
        setTimeout(() => {
          this.startJobWithRetry(jobId, tenantEmpresaId, equipoIds).catch(() => {});
        }, backoffMs);
        return;
      }
      // No retry left
      current.status = 'failed';
      current.message = err?.message || 'Error generando ZIP';
      current.progress = 1;
      store.set(jobId, { ...current });
      try { AppLogger.error('💥 ZIP job falló sin reintentos restantes', { jobId, error: err?.message }); } catch {}
    }
  }

  private static async runInWorker(jobId: string, tenantEmpresaId: number, equipoIds: number[]): Promise<void> {
    const Worker = this.Worker;
    if (!Worker) {
      // fallback inline
      await this.runJob(jobId, tenantEmpresaId, equipoIds);
      return;
    }
    // Resolve TS worker entry and ensure ts-node for TS runtime when not built
    const path = require('path');
    const workerPath = path.resolve(__dirname, '../workers/document-zip.worker.ts');
    const execArgv: string[] = [];
    // Enable ts-node when running uncompiled TS
    execArgv.push('-r', 'ts-node/register/transpile-only');
    const worker = new Worker(workerPath, {
      execArgv,
      workerData: { jobId, tenantEmpresaId, equipoIds },
    });
    // Avoid keeping process alive unnecessarily
    if (typeof worker.unref === 'function') worker.unref();
    await new Promise<void>((resolve, reject) => {
      const onMessage = (msg: any) => {
        if (msg?.ok) resolve();
        else if (msg?.error) reject(new Error(msg.error));
      };
      const onError = (e: any) => reject(e);
      const onExit = (code: number) => {
        if (code === 0) resolve();
        else reject(new Error(`Worker exited with code ${code}`));
      };
      worker.once('message', onMessage);
      worker.once('error', onError);
      worker.once('exit', onExit);
    });
  }

  private static async runJob(jobId: string, tenantEmpresaId: number, equipoIds: number[]): Promise<void> {
    const store = this.getStore();
    const job = store.get(jobId);
    if (!job) return;
    job.status = 'processing';
    job.progress = 0.05;
    store.set(jobId, { ...job });

    try {
      // For testing retry path deterministically
      if (process.env.ZIP_FORCE_FAIL_FIRST === 'true' && !this.forcedFailOnce.has(jobId)) {
        this.forcedFailOnce.add(jobId);
        throw new Error('Forced failure (test)');
      }
      const archiverMod = await import('archiver');
      const archiver = (archiverMod as any).default || (archiverMod as any);
      const { PassThrough } = await import('stream');

      // Construir ZIP en memoria con streaming
      const zipStream = archiver('zip', { zlib: { level: 9 } });
      const out = new PassThrough();
      const chunks: Buffer[] = [];
      out.on('data', (d: Buffer) => chunks.push(Buffer.from(d)));

      // Manejo de errores de archiver
      zipStream.on('error', (err: any) => {
        try { AppLogger.error('💥 Error en construcción de ZIP:', err); } catch {}
        throw err;
      });
      zipStream.pipe(out);

      // Almacenamos datos de cada equipo para el Excel
      const excelRows: EquipoExcelRow[] = [];

      // Por cada equipo, seleccionar documentos vigentes y agregarlos al ZIP
      const now = new Date();
      let processed = 0;
      for (const equipoId of equipoIds) {
        // Cargar equipo con relación empresaTransportista
        const equipo = await prisma.equipo.findUnique({
          where: { id: equipoId },
          include: {
            empresaTransportista: {
              select: { cuit: true, razonSocial: true }
            },
          },
        });
        if (!equipo || equipo.tenantEmpresaId !== tenantEmpresaId) {
          processed += 1;
          job.processedEquipos = processed;
          job.progress = Math.min(0.05 + (processed / equipoIds.length) * 0.9, 0.95);
          store.set(jobId, { ...job });
          continue;
        }

        // Consultar datos del chofer, camión y acoplado por separado
        const [chofer, camion, acoplado] = await Promise.all([
          prisma.chofer.findUnique({
            where: { id: equipo.driverId },
            select: { dni: true, nombre: true, apellido: true }
          }),
          prisma.camion.findUnique({
            where: { id: equipo.truckId },
            select: { patente: true }
          }),
          equipo.trailerId ? prisma.acoplado.findUnique({
            where: { id: equipo.trailerId },
            select: { patente: true }
          }) : Promise.resolve(null),
        ]);

        // Agregar datos del equipo al array para el Excel
        excelRows.push({
          equipoId: equipo.id,
          empresaCuit: equipo.empresaTransportista?.cuit || '',
          empresaRazonSocial: equipo.empresaTransportista?.razonSocial || '',
          choferDni: chofer?.dni || equipo.driverDniNorm || '',
          choferNombre: chofer?.nombre || '',
          choferApellido: chofer?.apellido || '',
          camionPatente: camion?.patente || equipo.truckPlateNorm || '',
          acopladoPatente: acoplado?.patente || equipo.trailerPlateNorm || '',
        });

        const entityClauses: any[] = [];
        if (equipo.empresaTransportistaId) entityClauses.push({ entityType: 'EMPRESA_TRANSPORTISTA' as any, entityId: equipo.empresaTransportistaId });
        if (equipo.driverId) entityClauses.push({ entityType: 'CHOFER' as any, entityId: equipo.driverId });
        if (equipo.truckId) entityClauses.push({ entityType: 'CAMION' as any, entityId: equipo.truckId });
        if (equipo.trailerId) entityClauses.push({ entityType: 'ACOPLADO' as any, entityId: equipo.trailerId });

        const docs = await prisma.document.findMany({
          where: {
            tenantEmpresaId: tenantEmpresaId,
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

        for (const d of docs) {
          let bucketName: string;
          let objectPath: string;
          if (typeof d.filePath === 'string' && d.filePath.includes('/')) {
            const idx = d.filePath.indexOf('/');
            bucketName = d.filePath.slice(0, idx);
            objectPath = d.filePath.slice(idx + 1);
          } else {
            bucketName = `docs-t${tenantEmpresaId}`;
            objectPath = d.filePath as any;
          }
          const { minioService } = await import('./minio.service');
          const stream = await minioService.getObject(bucketName, objectPath);
          const folder = (d as any).entityType === 'CHOFER' ? 'chofer' : (d as any).entityType === 'CAMION' ? 'camion' : 'acoplado';
          const idLabel =
            (d as any).entityType === 'CHOFER'
              ? (equipo.driverDniNorm || (d as any).entityId)
              : (d as any).entityType === 'CAMION'
              ? (equipo.truckPlateNorm || (d as any).entityId)
              : (equipo.trailerPlateNorm || (d as any).entityId);
          const name = `equipo_${equipo.id}/${folder}/${idLabel}_${((d as any).template?.name || 'documento').replace(/[^a-z0-9_-]/gi, '_')}_${d.id}.pdf`;
          zipStream.append(stream as any, { name });
        }

        processed += 1;
        job.processedEquipos = processed;
        job.progress = Math.min(0.05 + (processed / equipoIds.length) * 0.9, 0.95);
        store.set(jobId, { ...job });
        try { AppLogger.debug?.('⏳ Progreso ZIP job', { jobId, processed, total: equipoIds.length, progress: job.progress }); } catch {}
      }

      // Generar Excel con resumen de equipos
      const excelBuffer = await this.generateEquiposExcel(excelRows);
      zipStream.append(excelBuffer, { name: 'resumen_equipos.xlsx' });

      await zipStream.finalize();

      // Esperar a que termine de escribir
      await new Promise<void>((resolve, reject) => {
        out.on('finish', () => resolve());
        out.on('error', (e: any) => reject(e));
      });

      const buffer = Buffer.concat(chunks);
      const objectPath = `exports/zips/${jobId}.zip`;
      const { minioService } = await import('./minio.service');
      const uploaded = await minioService.uploadObject(tenantEmpresaId, objectPath, buffer, 'application/zip');

      job.status = 'completed';
      job.progress = 1;
      job.artifact = uploaded;
      store.set(jobId, { ...job });

      try { AppLogger.info('📦 ZIP masivo generado', { jobId, size: buffer.length, objectPath: uploaded.objectPath }); } catch {}
    } catch (e: any) {
      // Propagar para que el manejador de reintentos decida
      try { AppLogger.error('💥 ZIP job failed', { jobId, error: e?.message }); } catch {}
      throw e;
    }
  }

  /**
   * Genera un archivo Excel con el resumen de equipos
   */
  private static async generateEquiposExcel(rows: EquipoExcelRow[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BCA Documentos';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Equipos', {
      properties: { tabColor: { argb: '2563eb' } }
    });

    // Definir columnas
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
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2563eb' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 22;

    // Agregar filas de datos
    for (const row of rows) {
      sheet.addRow(row);
    }

    // Aplicar bordes y alineación a todas las filas de datos
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

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}


