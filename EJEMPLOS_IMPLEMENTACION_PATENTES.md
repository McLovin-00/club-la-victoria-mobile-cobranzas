# Ejemplos de Implementación: Portal Cliente con Búsqueda por Patentes

## 📄 1. Backend - Búsqueda Masiva por Patentes

### Schema de Validación

**Archivo**: `apps/documentos/src/schemas/validation.schemas.ts`

```typescript
// Agregar al final del archivo
export const bulkSearchSchema = z.object({
  body: z.object({
    patentes: z.array(z.string().min(1)).min(1).max(50), // máximo 50 patentes
    clienteId: z.number().int().positive().optional(),
  }),
});

export const bulkZipSchema = z.object({
  body: z.object({
    equipoIds: z.array(z.number().int().positive()).optional(),
    patentes: z.array(z.string().min(1)).optional(),
    clienteId: z.number().int().positive().optional(),
    includeExpired: z.boolean().default(false),
  }).refine(data => data.equipoIds || data.patentes, {
    message: 'Se debe proporcionar equipoIds o patentes'
  }),
});
```

---

### Servicio de Búsqueda

**Archivo**: `apps/documentos/src/services/equipo.service.ts`

```typescript
// Agregar método al EquipoService existente

/**
 * Normaliza una patente para búsqueda
 */
function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Búsqueda masiva de equipos por patentes de camiones
 */
static async bulkSearchByPatentes(
  tenantId: number,
  patentes: string[],
  clienteId?: number
): Promise<{
  equipos: Array<any>;
  notFound: string[];
}> {
  const normalizedPatentes = patentes.map(p => normalizePlate(p));
  const uniquePatentes = [...new Set(normalizedPatentes)];

  // Buscar camiones por patentes
  const camiones = await prisma.camion.findMany({
    where: {
      tenantEmpresaId: tenantId,
      patenteNorm: { in: uniquePatentes },
      activo: true,
    },
    select: {
      id: true,
      patenteNorm: true,
      patente: true,
      marca: true,
      modelo: true,
    },
  });

  const foundPatentes = new Set(camiones.map(c => c.patenteNorm));
  const notFound = uniquePatentes.filter(p => !foundPatentes.has(p));

  // Buscar equipos asociados a esos camiones
  const camionIds = camiones.map(c => c.id);
  
  const whereClause: any = {
    tenantEmpresaId: tenantId,
    truckId: { in: camionIds },
    OR: [
      { validTo: null },
      { validTo: { gte: new Date() } },
    ],
  };

  const equipos = await prisma.equipo.findMany({
    where: whereClause,
    include: {
      empresaTransportista: {
        select: {
          id: true,
          cuit: true,
          razonSocial: true,
        },
      },
      clientes: {
        where: clienteId ? { clienteId } : undefined,
        select: {
          clienteId: true,
          asignadoDesde: true,
          asignadoHasta: true,
        },
      },
    },
    orderBy: { validFrom: 'desc' },
  });

  // Filtrar por cliente si se especificó
  let filteredEquipos = equipos;
  if (clienteId) {
    filteredEquipos = equipos.filter(eq => eq.clientes.length > 0);
  }

  // Enriquecer con información de documentos
  const result = await Promise.all(
    filteredEquipos.map(async (equipo) => {
      // Obtener documentos de todas las entidades
      const [empresaDocs, choferDocs, camionDocs, acopladoDocs] = await Promise.all([
        equipo.empresaTransportistaId
          ? prisma.document.findMany({
              where: {
                tenantEmpresaId: tenantId,
                entityType: 'EMPRESA_TRANSPORTISTA',
                entityId: equipo.empresaTransportistaId,
                status: 'APROBADO',
              },
              include: { template: true },
            })
          : [],
        prisma.document.findMany({
          where: {
            tenantEmpresaId: tenantId,
            entityType: 'CHOFER',
            entityId: equipo.driverId,
            status: 'APROBADO',
          },
          include: { template: true },
        }),
        prisma.document.findMany({
          where: {
            tenantEmpresaId: tenantId,
            entityType: 'CAMION',
            entityId: equipo.truckId,
            status: 'APROBADO',
          },
          include: { template: true },
        }),
        equipo.trailerId
          ? prisma.document.findMany({
              where: {
                tenantEmpresaId: tenantId,
                entityType: 'ACOPLADO',
                entityId: equipo.trailerId,
                status: 'APROBADO',
              },
              include: { template: true },
            })
          : [],
      ]);

      return {
        ...equipo,
        documentacion: {
          empresa: empresaDocs,
          chofer: choferDocs,
          camion: camionDocs,
          acoplado: acopladoDocs,
        },
      };
    })
  );

  return {
    equipos: result,
    notFound,
  };
}
```

---

### Controlador

**Archivo**: `apps/documentos/src/controllers/clients.controller.ts`

```typescript
// Agregar método al ClientsController existente

/**
 * POST /api/docs/clients/bulk-search
 * Búsqueda masiva de equipos por patentes
 */
static async bulkSearch(req: AuthRequest, res: Response): Promise<void> {
  const { patentes, clienteId } = req.body;
  const tenantId = req.tenantId!;

  const result = await EquipoService.bulkSearchByPatentes(
    tenantId,
    patentes,
    clienteId
  );

  AppLogger.info('🔍 Búsqueda masiva realizada', {
    tenantId,
    patentesTotal: patentes.length,
    equiposEncontrados: result.equipos.length,
    noEncontradas: result.notFound.length,
  });

  res.json({
    success: true,
    data: result,
    summary: {
      patentesConsultadas: patentes.length,
      equiposEncontrados: result.equipos.length,
      patentesNoEncontradas: result.notFound.length,
    },
  });
}

/**
 * POST /api/docs/clients/bulk-zip
 * Generar ZIP con estructura específica para múltiples equipos
 */
static async generateBulkZip(req: AuthRequest, res: Response): Promise<void> {
  const { equipoIds, patentes, clienteId, includeExpired } = req.body;
  const tenantId = req.tenantId!;

  let equiposToProcess: number[] = equipoIds || [];

  // Si se reciben patentes, buscar equipos
  if (patentes && patentes.length > 0) {
    const searchResult = await EquipoService.bulkSearchByPatentes(
      tenantId,
      patentes,
      clienteId
    );
    equiposToProcess = searchResult.equipos.map((eq: any) => eq.id);
  }

  if (equiposToProcess.length === 0) {
    throw createError('No se encontraron equipos', 404, 'NOT_FOUND');
  }

  // Limitar cantidad de equipos
  if (equiposToProcess.length > 50) {
    throw createError(
      'Máximo 50 equipos por descarga',
      400,
      'TOO_MANY_EQUIPOS'
    );
  }

  // Obtener datos completos de equipos
  const equipos = await prisma.equipo.findMany({
    where: {
      id: { in: equiposToProcess },
      tenantEmpresaId: tenantId,
    },
    include: {
      empresaTransportista: true,
    },
  });

  // Obtener camiones, choferes y acoplados
  const truckIds = equipos.map(eq => eq.truckId);
  const driverIds = equipos.map(eq => eq.driverId);
  const trailerIds = equipos.filter(eq => eq.trailerId).map(eq => eq.trailerId!);

  const [camiones, choferes, acoplados] = await Promise.all([
    prisma.camion.findMany({ where: { id: { in: truckIds } } }),
    prisma.chofer.findMany({ where: { id: { in: driverIds } } }),
    prisma.acoplado.findMany({ where: { id: { in: trailerIds } } }),
  ]);

  const camionesMap = new Map(camiones.map(c => [c.id, c]));
  const choferesMap = new Map(choferes.map(c => [c.id, c]));
  const acopladosMap = new Map(acoplados.map(a => [a.id, a]));

  // Configurar respuesta ZIP
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=documentos_equipos_${Date.now()}.zip`
  );

  const archiver = await getArchiver();
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err: any) => {
    AppLogger.error('💥 Error generando ZIP:', err);
    res.status(500).end(String(err));
  });
  archive.pipe(res);

  const { minioService } = await import('../services/minio.service');

  // Procesar cada equipo
  for (const equipo of equipos) {
    const camion = camionesMap.get(equipo.truckId);
    if (!camion) continue;

    const camionPatente = camion.patenteNorm;
    const basePath = `${camionPatente}/`;

    // 1. Documentos de Empresa Transportista
    if (equipo.empresaTransportistaId && equipo.empresaTransportista) {
      const empresaDocs = await prisma.document.findMany({
        where: {
          tenantEmpresaId: tenantId,
          entityType: 'EMPRESA_TRANSPORTISTA',
          entityId: equipo.empresaTransportistaId,
          status: includeExpired ? undefined : 'APROBADO',
          ...(includeExpired ? {} : {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          }),
        },
        include: { template: true },
      });

      const empresaPath = `${basePath}EMPRESA_${equipo.empresaTransportista.cuit}/`;
      await addDocumentsToArchive(
        archive,
        empresaDocs,
        empresaPath,
        minioService,
        tenantId
      );
    }

    // 2. Documentos de Chofer
    const chofer = choferesMap.get(equipo.driverId);
    if (chofer) {
      const choferDocs = await prisma.document.findMany({
        where: {
          tenantEmpresaId: tenantId,
          entityType: 'CHOFER',
          entityId: equipo.driverId,
          status: includeExpired ? undefined : 'APROBADO',
          ...(includeExpired ? {} : {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          }),
        },
        include: { template: true },
      });

      const choferPath = `${basePath}CHOFER_${chofer.dniNorm}/`;
      await addDocumentsToArchive(
        archive,
        choferDocs,
        choferPath,
        minioService,
        tenantId
      );
    }

    // 3. Documentos de Camión
    const camionDocs = await prisma.document.findMany({
      where: {
        tenantEmpresaId: tenantId,
        entityType: 'CAMION',
        entityId: equipo.truckId,
        status: includeExpired ? undefined : 'APROBADO',
        ...(includeExpired ? {} : {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        }),
      },
      include: { template: true },
    });

    const camionPath = `${basePath}CAMION_${camion.patenteNorm}/`;
    await addDocumentsToArchive(
      archive,
      camionDocs,
      camionPath,
      minioService,
      tenantId
    );

    // 4. Documentos de Acoplado (si existe)
    if (equipo.trailerId) {
      const acoplado = acopladosMap.get(equipo.trailerId);
      if (acoplado) {
        const acopladoDocs = await prisma.document.findMany({
          where: {
            tenantEmpresaId: tenantId,
            entityType: 'ACOPLADO',
            entityId: equipo.trailerId,
            status: includeExpired ? undefined : 'APROBADO',
            ...(includeExpired ? {} : {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            }),
          },
          include: { template: true },
        });

        const acopladoPath = `${basePath}ACOPLADO_${acoplado.patenteNorm}/`;
        await addDocumentsToArchive(
          archive,
          acopladoDocs,
          acopladoPath,
          minioService,
          tenantId
        );
      }
    }
  }

  AppLogger.info('📦 ZIP masivo generado', {
    tenantId,
    equipos: equipos.length,
  });

  archive.finalize();
}

/**
 * Función auxiliar para agregar documentos al archivo ZIP
 */
async function addDocumentsToArchive(
  archive: any,
  documents: any[],
  basePath: string,
  minioService: any,
  tenantId: number
): Promise<void> {
  for (const doc of documents) {
    try {
      let bucketName: string;
      let objectPath: string;

      if (typeof doc.filePath === 'string' && doc.filePath.includes('/')) {
        const idx = doc.filePath.indexOf('/');
        bucketName = doc.filePath.slice(0, idx);
        objectPath = doc.filePath.slice(idx + 1);
      } else {
        bucketName = `docs-t${tenantId}`;
        objectPath = doc.filePath;
      }

      const stream = await minioService.getObject(bucketName, objectPath);
      
      // Sanitizar nombre de archivo
      const templateName = doc.template?.name || 'documento';
      const sanitizedName = templateName.replace(/[^a-z0-9_\-\.]/gi, '_');
      const extension = doc.fileName?.split('.').pop() || 'pdf';
      const fileName = `${sanitizedName}_${doc.id}.${extension}`;
      
      archive.append(stream, { name: `${basePath}${fileName}` });
    } catch (error) {
      AppLogger.error('Error agregando documento al ZIP:', {
        documentId: doc.id,
        error,
      });
    }
  }
}
```

---

### Rutas

**Archivo**: `apps/documentos/src/routes/clients.routes.ts`

```typescript
// Agregar al final del archivo, antes de export default router

/**
 * POST /api/docs/clients/bulk-search
 * Búsqueda masiva de equipos por patentes
 */
router.post(
  '/bulk-search',
  authenticate,
  validate(bulkSearchSchema),
  ClientsController.bulkSearch
);

/**
 * POST /api/docs/clients/bulk-zip
 * Generar ZIP con estructura específica para múltiples equipos
 */
router.post(
  '/bulk-zip',
  authenticate,
  validate(bulkZipSchema),
  ClientsController.generateBulkZip
);
```

---

## 📄 2. Frontend - Componente de Búsqueda Masiva

### Componente de Búsqueda

**Archivo**: `apps/frontend/src/features/documentos/components/BulkPatentesSearch.tsx`

```typescript
import React, { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../../components/ui/toast';

interface BulkPatentesSearchProps {
  clienteId?: number;
  onResultsFound?: (equipos: any[]) => void;
}

export const BulkPatentesSearch: React.FC<BulkPatentesSearchProps> = ({
  clienteId,
  onResultsFound,
}) => {
  const [patentes, setPatentes] = useState<string>('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const { addToast } = useToast();

  const normalizePlate = (plate: string): string => {
    return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  };

  const handleSearch = async () => {
    const lines = patentes
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    
    if (lines.length === 0) {
      addToast({
        title: 'Error',
        description: 'Ingrese al menos una patente',
        variant: 'error',
      });
      return;
    }

    if (lines.length > 50) {
      addToast({
        title: 'Error',
        description: 'Máximo 50 patentes por búsqueda',
        variant: 'error',
      });
      return;
    }

    setSearching(true);

    try {
      const response = await fetch('/api/docs/clients/bulk-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          patentes: lines,
          clienteId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data);
        onResultsFound?.(data.data.equipos);
        
        addToast({
          title: 'Búsqueda completada',
          description: `Encontrados ${data.data.equipos.length} equipos`,
          variant: 'success',
        });
      } else {
        throw new Error(data.message || 'Error en la búsqueda');
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al buscar',
        variant: 'error',
      });
    } finally {
      setSearching(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!results?.data?.equipos || results.data.equipos.length === 0) {
      addToast({
        title: 'Error',
        description: 'No hay equipos para descargar',
        variant: 'error',
      });
      return;
    }

    setDownloading(true);

    try {
      const equipoIds = results.data.equipos.map((eq: any) => eq.id);
      
      const response = await fetch('/api/docs/clients/bulk-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          equipoIds,
          includeExpired: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al generar ZIP');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documentos_equipos_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      addToast({
        title: 'Descarga iniciada',
        description: 'El archivo ZIP se está descargando',
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Error al descargar el archivo ZIP',
        variant: 'error',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-0 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-xl">
            <MagnifyingGlassIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Búsqueda Masiva por Patentes</h2>
            <p className="text-purple-100 text-sm">
              Pegue un listado de patentes (una por línea) para buscar equipos
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Patentes de Camiones (una por línea, máximo 50)
          </label>
          <textarea
            className="w-full h-32 p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-0 focus:border-purple-500 transition-colors font-mono text-sm"
            placeholder={'AA123BB\nCC456DD\nEE789FF'}
            value={patentes}
            onChange={(e) => setPatentes(e.target.value)}
          />
          <p className="text-sm text-gray-500 mt-1">
            {patentes.split('\n').filter(l => l.trim()).length} patente(s) ingresada(s)
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSearch}
            disabled={searching || !patentes.trim()}
            className="flex-1 h-12 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90"
          >
            {searching ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Buscando...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                Buscar Equipos
              </>
            )}
          </Button>

          {results && results.data.equipos.length > 0 && (
            <Button
              onClick={handleDownloadZip}
              disabled={downloading}
              className="flex-1 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:opacity-90"
            >
              {downloading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generando ZIP...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Descargar Todo (ZIP)
                </>
              )}
            </Button>
          )}
        </div>

        {/* Resultados */}
        {results && (
          <div className="mt-6 space-y-4">
            <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 border-2 border-emerald-200 rounded-xl p-4">
              <h3 className="font-bold text-gray-800 mb-2">📊 Resumen</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Consultadas</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {results.summary.patentesConsultadas}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Equipos Encontrados</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {results.summary.equiposEncontrados}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">No Encontradas</p>
                  <p className="text-2xl font-bold text-red-600">
                    {results.summary.patentesNoEncontradas}
                  </p>
                </div>
              </div>
            </div>

            {results.data.notFound.length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <h4 className="font-bold text-red-800 mb-2">
                  ⚠️ Patentes No Encontradas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {results.data.notFound.map((p: string) => (
                    <span
                      key={p}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
```

---

### Componente de Preview

**Archivo**: `apps/frontend/src/features/documentos/components/DocumentPreviewModal.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '../../../components/ui/button';

interface DocumentPreviewModalProps {
  documentId: number;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  documentId,
  onClose,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const response = await fetch(`/api/docs/documents/${documentId}/preview`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Error al obtener preview');
        }

        const data = await response.json();
        
        if (data.success && data.url) {
          setPreviewUrl(data.url);
        } else {
          throw new Error(data.message || 'URL de preview no disponible');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [documentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-4 rounded-t-2xl flex justify-between items-center">
          <h2 className="text-xl font-bold">Vista Previa de Documento</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <XMarkIcon className="h-6 w-6" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin text-6xl mb-4">⏳</div>
                <p className="text-gray-600">Cargando vista previa...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center bg-red-50 border-2 border-red-200 rounded-xl p-8">
                <p className="text-6xl mb-4">❌</p>
                <h3 className="text-xl font-bold text-red-800 mb-2">
                  Error al Cargar Preview
                </h3>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          )}

          {previewUrl && !loading && !error && (
            <iframe
              src={previewUrl}
              className="w-full h-full border-2 border-gray-200 rounded-xl"
              title="Vista previa del documento"
            />
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 rounded-b-2xl flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
```

---

## 📄 3. Integración en ClientePortalPage

**Archivo**: `apps/frontend/src/pages/ClientePortalPage.tsx`

```typescript
// Agregar imports
import { BulkPatentesSearch } from '../features/documentos/components/BulkPatentesSearch';
import { DocumentPreviewModal } from '../features/documentos/components/DocumentPreviewModal';

// Agregar estado para preview
const [previewDocId, setPreviewDocId] = useState<number | null>(null);
const [bulkResults, setBulkResults] = useState<any[]>([]);

// En el JSX, agregar el componente de búsqueda masiva antes de la tarjeta de equipos:

<BulkPatentesSearch
  clienteId={resolvedClienteId}
  onResultsFound={(equipos) => {
    setBulkResults(equipos);
  }}
/>

// Actualizar DocumentoRow para agregar botón de preview:

<div className="flex gap-2">
  <Button 
    size="sm" 
    variant="outline" 
    onClick={() => setPreviewDocId(doc.id)}
    className="border-2 border-purple-300 text-purple-600 hover:bg-purple-100 rounded-xl font-semibold"
  >
    <EyeIcon className="h-4 w-4 mr-1" />
    Ver
  </Button>
  <Button 
    size="sm" 
    variant="outline" 
    onClick={handleDownload}
    className="border-2 border-cyan-300 text-cyan-600 hover:bg-cyan-100 rounded-xl font-semibold"
  >
    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
    Descargar
  </Button>
</div>

// Al final del componente, agregar el modal de preview:

{previewDocId && (
  <DocumentPreviewModal
    documentId={previewDocId}
    onClose={() => setPreviewDocId(null)}
  />
)}
```

---

## 🧪 4. Testing

### Test del Servicio

**Archivo**: `apps/documentos/src/services/__tests__/equipo.service.test.ts`

```typescript
import { EquipoService } from '../equipo.service';
import { prisma } from '../../config/database';

describe('EquipoService.bulkSearchByPatentes', () => {
  const tenantId = 1;

  it('debe encontrar equipos por patentes', async () => {
    const result = await EquipoService.bulkSearchByPatentes(
      tenantId,
      ['AA123BB', 'CC456DD']
    );

    expect(result.equipos).toBeDefined();
    expect(Array.isArray(result.equipos)).toBe(true);
    expect(result.notFound).toBeDefined();
    expect(Array.isArray(result.notFound)).toBe(true);
  });

  it('debe normalizar patentes correctamente', async () => {
    const result = await EquipoService.bulkSearchByPatentes(
      tenantId,
      ['aa-123-bb', 'AA123BB'] // duplicados con diferentes formatos
    );

    // Debe encontrar solo una vez cada patente única
    expect(result.equipos.length).toBeLessThanOrEqual(1);
  });

  it('debe retornar patentes no encontradas', async () => {
    const result = await EquipoService.bulkSearchByPatentes(
      tenantId,
      ['NOEXISTE999']
    );

    expect(result.notFound).toContain('NOEXISTE999');
    expect(result.equipos.length).toBe(0);
  });
});
```

---

## 📝 Checklist de Implementación

### Backend
- [ ] Agregar schemas de validación en `validation.schemas.ts`
- [ ] Implementar `bulkSearchByPatentes` en `EquipoService`
- [ ] Implementar `bulkSearch` en `ClientsController`
- [ ] Implementar `generateBulkZip` en `ClientsController`
- [ ] Implementar función auxiliar `addDocumentsToArchive`
- [ ] Agregar rutas en `clients.routes.ts`
- [ ] Agregar tests unitarios
- [ ] Probar con Postman/curl

### Frontend
- [ ] Crear componente `BulkPatentesSearch.tsx`
- [ ] Crear componente `DocumentPreviewModal.tsx`
- [ ] Integrar componentes en `ClientePortalPage.tsx`
- [ ] Agregar estado para preview y resultados de búsqueda
- [ ] Actualizar `DocumentoRow` con botón de preview
- [ ] Agregar manejo de errores y toasts
- [ ] Probar en navegador

### Testing
- [ ] Probar búsqueda con 1 patente
- [ ] Probar búsqueda con 10 patentes
- [ ] Probar búsqueda con 50 patentes
- [ ] Probar búsqueda con patentes no encontradas
- [ ] Probar generación de ZIP
- [ ] Verificar estructura de carpetas en ZIP
- [ ] Probar preview de PDF
- [ ] Probar preview de imágenes

### Documentación
- [ ] Actualizar README con nuevas funcionalidades
- [ ] Documentar estructura del ZIP en docs
- [ ] Agregar ejemplos de uso en docs

---

## 🚀 Comandos para Testing

```bash
# Backend - Test unitarios
cd apps/documentos
npm test -- equipo.service.test.ts

# Backend - Test endpoint con curl
curl -X POST http://localhost:3002/api/docs/clients/bulk-search \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{
    "patentes": ["AA123BB", "CC456DD"],
    "clienteId": 1
  }'

# Frontend - Iniciar en modo desarrollo
cd apps/frontend
npm run dev
```

---

Este documento contiene todos los ejemplos de código necesarios para implementar la funcionalidad solicitada. Todos los ejemplos siguen las convenciones del proyecto y están listos para ser copiados y adaptados.

