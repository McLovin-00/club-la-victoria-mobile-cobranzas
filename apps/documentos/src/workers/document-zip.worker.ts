 
import { parentPort, workerData } from 'worker_threads';

async function main() {
  try {
    const { DocumentZipService } = await import('../services/document-zip.service');
    const { jobId, tenantEmpresaId, equipoIds } = (workerData || {}) as { jobId: string; tenantEmpresaId: number; equipoIds: number[] };
    await (DocumentZipService as any)['runJob'](jobId, tenantEmpresaId, Array.isArray(equipoIds) ? equipoIds : []);
    parentPort?.postMessage({ ok: true });
  } catch (e: any) {
    parentPort?.postMessage({ ok: false, error: e?.message || String(e) });
  }
}

void main();


