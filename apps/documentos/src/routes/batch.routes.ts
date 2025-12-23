import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/roles';
import { SystemConfigService } from '../services/system-config.service';
import { EquipoService } from '../services/equipo.service';
import { JobsService } from '../services/jobs.service';

const router = Router();
// NOSONAR: Content length 50MB is intentional for batch CSV imports with large datasets
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ============================================================================
// CSV PARSING HELPERS
// ============================================================================

interface CsvRowEquipo {
  external_id?: string | null;
  dni_chofer: string;
  patente_tractor: string;
  patente_acoplado?: string | null;
  chofer_phones?: string[];
  empresa_transportista_cuit?: string | null;
  empresa_transportista_nombre?: string | null;
}

/** Crea getter de campos CSV por nombre de columna o índice default */
function createFieldGetter(headers: string[] | null, parts: string[]): (names: string[], idxDefault: number) => string {
  return (names: string[], idxDefault: number): string => {
    if (headers) {
      for (const name of names) {
        const idx = headers.indexOf(name);
        if (idx >= 0 && parts[idx]) return parts[idx];
      }
    }
    return parts[idxDefault] || '';
  };
}

/** Parsea una línea CSV a un objeto de equipo */
function parseEquipoLine(line: string, headers: string[] | null): CsvRowEquipo | null {
  const parts = line.split(',').map(v => (v ?? '').trim());
  const get = createFieldGetter(headers, parts);

  const dni = get(['dni_chofer', 'dni'], 0);
  const tractor = get(['patente_tractor', 'camion_patente', 'tractor'], 1);
  if (!dni || !tractor) return null;

  const phonesRaw = get(['chofer_phones'], 3);
  return {
    external_id: get(['external_id'], -1) || null,
    dni_chofer: dni,
    patente_tractor: tractor,
    patente_acoplado: get(['patente_acoplado', 'acoplado_patente'], 2) || null,
    chofer_phones: phonesRaw ? phonesRaw.split(';').map(p => p.trim()).filter(Boolean).slice(0, 3) : [],
    empresa_transportista_cuit: get(['empresa_transportista_cuit', 'cuit'], 4) || null,
    empresa_transportista_nombre: get(['empresa_transportista_nombre', 'empresa'], 5) || null,
  };
}

/** Parsea contenido CSV a lista de equipos */
function parseCsv(content: string): CsvRowEquipo[] {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const first = lines[0];
  const hasHeader = /dni|chofer|external_id|patente/i.test(first);
  const headers = hasHeader ? first.split(',').map(h => h.trim().toLowerCase()) : null;
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map(line => parseEquipoLine(line, headers)).filter((r): r is CsvRowEquipo => r !== null);
}

// ==============================
// CSV import para Dadores
// ==============================
router.post('/dadores/:dadorId/equipos/import-csv', authenticate, authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), upload.single('file'), async (req: any, res) => {
  const dadorId = Number(req.params.dadorId);
  if (!dadorId || !req.file) return res.status(400).json({ success: false, message: 'Parámetros inválidos' });

  const content = req.file.buffer.toString('utf-8');
  const rows = parseCsv(content);
  const dryRun = String(req.query.dryRun || 'false') === 'true';
  const results: Array<{ ok: boolean; error?: string; external_id?: string | null }> = [];

  for (const r of rows) {
    try {
      if (!dryRun) {
        await EquipoService.createFromIdentifiers({
          tenantEmpresaId: req.tenantId!,
          dadorCargaId: dadorId,
          dniChofer: r.dni_chofer,
          patenteTractor: r.patente_tractor,
          patenteAcoplado: r.patente_acoplado || undefined,
          choferPhones: r.chofer_phones,
          empresaTransportistaCuit: r.empresa_transportista_cuit || undefined,
          empresaTransportistaNombre: r.empresa_transportista_nombre || undefined,
        });
      }
      results.push({ ok: true, external_id: r.external_id || null });
    } catch (e: any) {
      results.push({ ok: false, error: e?.message || 'Error al crear equipo', external_id: r.external_id || null });
    }
  }

  // CSV de errores (descargable): external_id,dni,tractor,acoplado,error
  const errorRows = results
    .map((r, idx) => ({ r, src: rows[idx] }))
    .filter((x) => !x.r.ok)
    .map(({ r, src }) => [r.external_id || '', src.dni_chofer, src.patente_tractor, src.patente_acoplado || '', r.error || ''].map((v) => String(v).replace(/"/g, '""')));
  const errorsCsv = ['external_id,dni_chofer,patente_tractor,patente_acoplado,error']
    .concat(errorRows.map((cols) => cols.map((c) => /[",\n]/.test(c) ? `"${c}"` : c).join(',')))
    .join('\n');

  res.json({
    success: true,
    dryRun,
    total: rows.length,
    created: results.filter(r => r.ok).length,
    errors: results.filter(r => !r.ok),
    errorsCsv,
  });
});

// ==============================
// Batch de documentos para Dadores
// ==============================
router.post('/dadores/:dadorId/documentos/batch', authenticate, authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), upload.array('files', 50), async (req: any, res) => {
  const dadorId = Number(req.params.dadorId);
  if (!dadorId || !req.files?.length) return res.status(400).json({ success: false, message: 'Parámetros inválidos' });
  const skipDedupe = String(req.query.skipDedupe || 'false') === 'true';
  const jobId = JobsService.createDocumentsBatch({ tenantEmpresaId: req.tenantId!, dadorId, files: req.files as Express.Multer.File[], skipDedupe });
  res.status(202).json({ success: true, jobId });
});

// ==============================
// Batch de documentos para Transportistas (usa dador por defecto)
// ==============================
router.post('/transportistas/documentos/batch', authenticate, authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), upload.array('files', 50), async (req: any, res) => {
  // Leer clave namespaced por tenant. Fallback a clave global histórica si existiera.
  const namespacedKey = `tenant:${req.tenantId}:defaults.defaultDadorId`;
  let dadorValue = await SystemConfigService.getConfig(namespacedKey);
  if (!dadorValue) {
    dadorValue = await SystemConfigService.getConfig('documentos.defaultDadorId');
  }
  const dadorId = dadorValue ? Number(dadorValue) : NaN;
  if (!dadorId || Number.isNaN(dadorId)) return res.status(400).json({ success: false, message: 'Dador por defecto no configurado' });
  if (!req.files?.length) return res.status(400).json({ success: false, message: 'Sin archivos' });
  const skipDedupe = String(req.query.skipDedupe || 'false') === 'true';
  const jobId = JobsService.createDocumentsBatch({ tenantEmpresaId: req.tenantId!, dadorId, files: req.files as Express.Multer.File[], skipDedupe });
  res.status(202).json({ success: true, jobId });
});

// ==============================
// Estado de job
// ==============================
router.get('/jobs/:jobId/status', authenticate, async (req, res) => {
  const job = JobsService.getJob(String(req.params.jobId));
  if (!job) return res.status(404).json({ success: false, message: 'Job no encontrado' });

  // Enriquecer con resultados por documento si hay items
  let results: Array<{ documentId: number; fileName: string; status: string; comprobante?: string; vencimiento?: string | null }> = [];
  try {
    if (job.items && job.items.length > 0) {
      const { db } = await import('../config/database');
      const ids = job.items.map(i => i.documentId);
      const docs = await db.getClient().document.findMany({
        where: { id: { in: ids } },
        select: { id: true, status: true, validationData: true, expiresAt: true, fileName: true },
      });
      results = job.items.map((it) => {
        const d = docs.find(x => x.id === it.documentId);
        const ai = (d as any)?.validationData?.ai || {};
        return {
          documentId: it.documentId,
          fileName: it.fileName || d?.fileName || `document-${it.documentId}`,
          status: (d?.status as any) || 'PENDIENTE',
          comprobante: ai?.comprobante,
          vencimiento: d?.expiresAt ? new Date(d.expiresAt).toISOString() : null,
        };
      });
    }
  } catch { /* noop */ }

  res.json({ success: true, job: { ...job, results } });
});

// ==============================
// Reintentar fallidos de un job
// ==============================
router.post('/jobs/:jobId/retry-failed', authenticate, authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), async (req: any, res) => {
  const job = JobsService.getJob(String(req.params.jobId));
  if (!job) return res.status(404).json({ success: false, message: 'Job no encontrado' });
  try {
    const { db } = await import('../config/database');
    const { queueService } = await import('../services/queue.service');
    // Buscar documentos RECHAZADO del lote (presentes en job.items)
    const ids = (job.items || []).map(i => i.documentId);
    const failedDocs = await db.getClient().document.findMany({ where: { id: { in: ids }, status: 'RECHAZADO' as any }, select: { id: true, filePath: true } });
    for (const d of failedDocs) {
      await queueService.addDocumentValidation({ documentId: d.id, filePath: d.filePath, templateName: 'AUTO', entityType: 'DADOR' });
    }
    return res.json({ success: true, retried: failedDocs.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'Error al reintentar' });
  }
});

export default router;


