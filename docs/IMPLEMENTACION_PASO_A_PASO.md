# Implementación Paso a Paso - Alta Completa de Equipos

## 🎯 Objetivo
Implementar el formulario completo de "Alta de Empresa de Transporte, Choferes y Unidades" con 21 templates de documentos, siguiendo el diseño visual de la imagen proporcionada.

---

## 📦 PASO 1: Crear Seed de Templates (Backend Documentos)

### 1.1 Crear archivo de seed

**Archivo**: `apps/documentos/src/prisma/seeds/documentTemplates.seed.ts`

```typescript
import { PrismaClient } from '../../../node_modules/.prisma/documentos';

const prisma = new PrismaClient();

const templates = [
  // EMPRESA_TRANSPORTISTA (4)
  { name: 'Constancia de Inscripción IIBB', entityType: 'EMPRESA_TRANSPORTISTA', requiresExpiry: false },
  { name: 'Formulario 931 AFIP (Constancia de Pago)', entityType: 'EMPRESA_TRANSPORTISTA', requiresExpiry: false },
  { name: 'Recibo de Sueldo', entityType: 'EMPRESA_TRANSPORTISTA', requiresExpiry: false },
  { name: 'Boleta Sindical', entityType: 'EMPRESA_TRANSPORTISTA', requiresExpiry: false },

  // CHOFER (5)
  { name: 'Acta Temprana ARCA / Constancia ARCA', entityType: 'CHOFER', requiresExpiry: false },
  { name: 'DNI (frente y dorso)', entityType: 'CHOFER', requiresExpiry: true },
  { name: 'Licencia Nacional de Conducir (frente y dorso)', entityType: 'CHOFER', requiresExpiry: true },
  { name: 'Póliza A.R.T. con Cláusula NO REPETICIÓN (30-71781676-2)', entityType: 'CHOFER', requiresExpiry: true },
  { name: 'Póliza Seguro de Vida Obligatorio', entityType: 'CHOFER', requiresExpiry: true },

  // CAMION (6)
  { name: 'Tractor: Título o Contrato Alquiler Certificado', entityType: 'CAMION', requiresExpiry: false },
  { name: 'Tractor: Cédula', entityType: 'CAMION', requiresExpiry: false },
  { name: 'Tractor: RTO (Revisión Técnica Obligatoria)', entityType: 'CAMION', requiresExpiry: true },
  { name: 'Tractor: Póliza Seguro (Cláusula NO REPETICIÓN)', entityType: 'CAMION', requiresExpiry: true },
  { name: 'Tractor: Seguro - Certificado Libre Deuda y Comprobante', entityType: 'CAMION', requiresExpiry: false },

  // ACOPLADO (6)
  { name: 'Semi: Título o Contrato Alquiler Certificado', entityType: 'ACOPLADO', requiresExpiry: false },
  { name: 'Semi: Cédula', entityType: 'ACOPLADO', requiresExpiry: false },
  { name: 'Semi: RTO (Revisión Técnica Obligatoria)', entityType: 'ACOPLADO', requiresExpiry: true },
  { name: 'Semi: Póliza Seguro (Cláusula NO REPETICIÓN)', entityType: 'ACOPLADO', requiresExpiry: true },
  { name: 'Semi: Seguro - Certificado Libre Deuda y Comprobante', entityType: 'ACOPLADO', requiresExpiry: false },
];

async function seedTemplates() {
  console.log('🌱 Seeding document templates...');

  for (const template of templates) {
    await prisma.documentTemplate.upsert({
      where: {
        // Usar combinación única para evitar duplicados
        name_entityType: {
          name: template.name,
          entity_type: template.entityType as any,
        },
      },
      update: {},
      create: {
        name: template.name,
        entity_type: template.entityType as any,
        active: true,
      },
    });
    console.log(`✅ ${template.entityType}: ${template.name}`);
  }

  console.log('✅ Templates seeded successfully!');
}

seedTemplates()
  .catch((e) => {
    console.error('❌ Error seeding templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**NOTA**: Necesitamos agregar un índice único compuesto para evitar duplicados.

### 1.2 Crear migración para índice único

**Archivo**: `apps/documentos/src/prisma/migrations/20251116000001_add_unique_template_name_entity/migration.sql`

```sql
-- Add unique constraint on (name, entity_type) to prevent duplicates
CREATE UNIQUE INDEX "document_templates_name_entity_type_key" 
ON "documentos"."document_templates"("name", "entity_type");
```

### 1.3 Ejecutar seed

```bash
cd apps/documentos
npx tsx src/prisma/seeds/documentTemplates.seed.ts
```

**Verificación**:
```bash
# Conectarse a PostgreSQL y verificar
psql -h localhost -U postgres -d bca
SELECT COUNT(*), entity_type FROM documentos.document_templates GROUP BY entity_type;
```

Debe mostrar:
- EMPRESA_TRANSPORTISTA: 4
- CHOFER: 5
- CAMION: 5
- ACOPLADO: 5

---

## 📦 PASO 2: Endpoint para Templates Agrupados

### 2.1 Crear servicio en microservicio documentos

**Archivo**: `apps/documentos/src/services/templates.service.ts`

```typescript
import { PrismaService } from './prisma.service';
import { EntityType } from '../../node_modules/.prisma/documentos';

interface TemplateGrouped {
  id: number;
  name: string;
  requiresExpiry: boolean;
}

interface TemplatesResponse {
  EMPRESA_TRANSPORTISTA: TemplateGrouped[];
  CHOFER: TemplateGrouped[];
  CAMION: TemplateGrouped[];
  ACOPLADO: TemplateGrouped[];
}

export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async getTemplatesGrouped(): Promise<TemplatesResponse> {
    const templates = await this.prisma.documentTemplate.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        entity_type: true,
      },
      orderBy: [{ entity_type: 'asc' }, { id: 'asc' }],
    });

    // Mapear templates que requieren fecha de vencimiento
    const requiresExpiryNames = [
      'DNI',
      'Licencia',
      'RTO',
      'Póliza',
      'Seguro de Vida',
    ];

    const grouped: TemplatesResponse = {
      EMPRESA_TRANSPORTISTA: [],
      CHOFER: [],
      CAMION: [],
      ACOPLADO: [],
    };

    templates.forEach((t) => {
      const requiresExpiry = requiresExpiryNames.some((keyword) =>
        t.name.includes(keyword)
      );

      grouped[t.entity_type].push({
        id: t.id,
        name: t.name,
        requiresExpiry,
      });
    });

    return grouped;
  }
}
```

### 2.2 Crear ruta en microservicio documentos

**Archivo**: `apps/documentos/src/routes/templates.routes.ts`

```typescript
import { Router } from 'express';
import { TemplatesService } from '../services/templates.service';
import { PrismaService } from '../services/prisma.service';

const router = Router();
const prismaService = new PrismaService();
const templatesService = new TemplatesService(prismaService);

/**
 * GET /api/documentos/templates/grouped
 * Retorna templates agrupados por entityType
 */
router.get('/grouped', async (req, res) => {
  try {
    const grouped = await templatesService.getTemplatesGrouped();
    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error('Error fetching grouped templates:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

export default router;
```

### 2.3 Registrar ruta en app principal

**Archivo**: `apps/documentos/src/app.ts`

```typescript
import templatesRoutes from './routes/templates.routes';

// ... código existente ...

app.use('/api/documentos/templates', templatesRoutes);
```

### 2.4 Probar endpoint

```bash
curl http://localhost:4802/api/documentos/templates/grouped | jq
```

---

## 📦 PASO 3: Endpoint de Presigned URLs

### 3.1 Crear servicio MinIO (si no existe)

**Archivo**: `apps/documentos/src/services/minio.service.ts`

```typescript
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';

export interface PresignedUrlRequest {
  fileName: string;
  mimeType: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  objectKey: string;
  fileName: string;
}

export class MinioService {
  private client: Minio.Client;
  private bucket: string;

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
    this.bucket = process.env.MINIO_BUCKET || 'documentos';
  }

  async generatePresignedUrls(
    requests: PresignedUrlRequest[]
  ): Promise<PresignedUrlResponse[]> {
    const results: PresignedUrlResponse[] = [];

    for (const req of requests) {
      const ext = req.fileName.split('.').pop();
      const objectKey = `uploads/${uuidv4()}.${ext}`;

      const uploadUrl = await this.client.presignedPutObject(
        this.bucket,
        objectKey,
        24 * 60 * 60 // 24 horas
      );

      results.push({
        uploadUrl,
        objectKey,
        fileName: req.fileName,
      });
    }

    return results;
  }
}
```

### 3.2 Crear ruta de presigned URLs

**Archivo**: `apps/documentos/src/routes/uploads.routes.ts`

```typescript
import { Router } from 'express';
import { MinioService } from '../services/minio.service';

const router = Router();
const minioService = new MinioService();

/**
 * POST /api/documentos/uploads/presign-urls
 * Body: { files: [{ fileName, mimeType }] }
 */
router.post('/presign-urls', async (req, res) => {
  try {
    const { files } = req.body;

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere array de files' });
    }

    const presignedUrls = await minioService.generatePresignedUrls(files);

    res.json({ success: true, data: presignedUrls });
  } catch (error) {
    console.error('Error generating presigned URLs:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

export default router;
```

### 3.3 Registrar ruta

**Archivo**: `apps/documentos/src/app.ts`

```typescript
import uploadsRoutes from './routes/uploads.routes';

app.use('/api/documentos/uploads', uploadsRoutes);
```

### 3.4 Probar endpoint

```bash
curl -X POST http://localhost:4802/api/documentos/uploads/presign-urls \
  -H "Content-Type: application/json" \
  -d '{"files":[{"fileName":"test.pdf","mimeType":"application/pdf"}]}' | jq
```

---

## 📦 PASO 4: Endpoint de Ensamblaje de Equipo

### 4.1 Crear servicio de ensamblaje

**Archivo**: `apps/documentos/src/services/equipoAssembly.service.ts`

```typescript
import { PrismaService } from './prisma.service';
import { EntityType } from '../../node_modules/.prisma/documentos';

interface AssembleEquipoRequest {
  tenantEmpresaId: number;
  dadorCargaId: number;
  empresaTransportista: {
    cuit: string;
    razonSocial: string;
  };
  chofer: {
    dni: string;
    nombre: string;
    apellido: string;
    phones?: string[];
  };
  tractor: {
    patente: string;
    marca?: string;
    modelo?: string;
  };
  semi?: {
    patente: string;
    tipo?: string;
  };
  documents: Array<{
    templateId: number;
    entityType: EntityType;
    objectKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    expiresAt?: string;
  }>;
  clienteIds?: number[];
}

export class EquipoAssemblyService {
  constructor(private prisma: PrismaService) {}

  async assembleEquipo(data: AssembleEquipoRequest) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Crear/recuperar EmpresaTransportista
      const empresaTransportista = await tx.empresaTransportista.upsert({
        where: {
          tenantEmpresaId_dadorCargaId_cuit: {
            tenantEmpresaId: data.tenantEmpresaId,
            dadorCargaId: data.dadorCargaId,
            cuit: data.empresaTransportista.cuit,
          },
        },
        update: {},
        create: {
          tenantEmpresaId: data.tenantEmpresaId,
          dadorCargaId: data.dadorCargaId,
          cuit: data.empresaTransportista.cuit,
          razonSocial: data.empresaTransportista.razonSocial,
          activo: true,
        },
      });

      // 2. Crear/recuperar Chofer
      const dniNorm = data.chofer.dni.replace(/\D/g, '');
      const chofer = await tx.chofer.upsert({
        where: {
          tenantEmpresaId_dadorCargaId_dniNorm: {
            tenantEmpresaId: data.tenantEmpresaId,
            dadorCargaId: data.dadorCargaId,
            dniNorm,
          },
        },
        update: {},
        create: {
          tenantEmpresaId: data.tenantEmpresaId,
          dadorCargaId: data.dadorCargaId,
          empresaTransportistaId: empresaTransportista.id,
          dni: data.chofer.dni,
          dniNorm,
          nombre: data.chofer.nombre,
          apellido: data.chofer.apellido,
          phones: data.chofer.phones || [],
          activo: true,
        },
      });

      // 3. Crear/recuperar Tractor
      const patenteNormTractor = data.tractor.patente.toUpperCase().replace(/\s/g, '');
      const tractor = await tx.camion.upsert({
        where: {
          tenantEmpresaId_dadorCargaId_patenteNorm: {
            tenantEmpresaId: data.tenantEmpresaId,
            dadorCargaId: data.dadorCargaId,
            patenteNorm: patenteNormTractor,
          },
        },
        update: {},
        create: {
          tenantEmpresaId: data.tenantEmpresaId,
          dadorCargaId: data.dadorCargaId,
          empresaTransportistaId: empresaTransportista.id,
          patente: data.tractor.patente,
          patenteNorm: patenteNormTractor,
          marca: data.tractor.marca,
          modelo: data.tractor.modelo,
          activo: true,
        },
      });

      // 4. Crear/recuperar Semi (opcional)
      let semi = null;
      if (data.semi?.patente) {
        const patenteNormSemi = data.semi.patente.toUpperCase().replace(/\s/g, '');
        semi = await tx.acoplado.upsert({
          where: {
            tenantEmpresaId_dadorCargaId_patenteNorm: {
              tenantEmpresaId: data.tenantEmpresaId,
              dadorCargaId: data.dadorCargaId,
              patenteNorm: patenteNormSemi,
            },
          },
          update: {},
          create: {
            tenantEmpresaId: data.tenantEmpresaId,
            dadorCargaId: data.dadorCargaId,
            empresaTransportistaId: empresaTransportista.id,
            patente: data.semi.patente,
            patenteNorm: patenteNormSemi,
            tipo: data.semi.tipo,
            activo: true,
          },
        });
      }

      // 5. Validar templates obligatorios
      const allTemplates = await tx.documentTemplate.findMany({
        where: { active: true },
        select: { id: true, entity_type: true },
      });

      const expectedTemplateIds = allTemplates.map((t) => t.id);
      const providedTemplateIds = data.documents.map((d) => d.templateId);

      const missingTemplates = expectedTemplateIds.filter(
        (id) => !providedTemplateIds.includes(id)
      );

      if (missingTemplates.length > 0) {
        throw new Error(
          `Faltan templates obligatorios: ${missingTemplates.join(', ')}`
        );
      }

      // 6. Crear documentos
      const entityIdMap = {
        EMPRESA_TRANSPORTISTA: empresaTransportista.id,
        CHOFER: chofer.id,
        CAMION: tractor.id,
        ACOPLADO: semi?.id || 0,
      };

      for (const doc of data.documents) {
        const entityId = entityIdMap[doc.entityType];

        await tx.document.create({
          data: {
            templateId: doc.templateId,
            entityType: doc.entityType,
            entityId,
            dadorCargaId: data.dadorCargaId,
            tenantEmpresaId: data.tenantEmpresaId,
            fileName: doc.fileName,
            filePath: doc.objectKey,
            fileSize: doc.fileSize,
            mimeType: doc.mimeType,
            status: 'PENDIENTE',
            expiresAt: doc.expiresAt ? new Date(doc.expiresAt) : null,
          },
        });
      }

      // 7. Crear Equipo
      const equipo = await tx.equipo.create({
        data: {
          driverId: chofer.id,
          truckId: tractor.id,
          trailerId: semi?.id,
          dadorCargaId: data.dadorCargaId,
          tenantEmpresaId: data.tenantEmpresaId,
          empresaTransportistaId: empresaTransportista.id,
          driverDniNorm: dniNorm,
          truckPlateNorm: patenteNormTractor,
          trailerPlateNorm: semi ? semi.patenteNorm : null,
          validFrom: new Date(),
          estado: 'activa',
        },
      });

      // 8. Asignar clientes (opcional)
      if (data.clienteIds && data.clienteIds.length > 0) {
        for (const clienteId of data.clienteIds) {
          await tx.equipoCliente.create({
            data: {
              equipoId: equipo.id,
              clienteId,
              asignadoDesde: new Date(),
            },
          });
        }
      }

      return { success: true, equipoId: equipo.id };
    });
  }
}
```

### 4.2 Crear ruta de ensamblaje

**Archivo**: `apps/documentos/src/routes/equipos.routes.ts`

```typescript
import { Router } from 'express';
import { EquipoAssemblyService } from '../services/equipoAssembly.service';
import { PrismaService } from '../services/prisma.service';

const router = Router();
const prismaService = new PrismaService();
const equipoService = new EquipoAssemblyService(prismaService);

/**
 * POST /api/documentos/equipos/assemble
 */
router.post('/assemble', async (req, res) => {
  try {
    const result = await equipoService.assembleEquipo(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Error assembling equipo:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
```

### 4.3 Registrar ruta

**Archivo**: `apps/documentos/src/app.ts`

```typescript
import equiposRoutes from './routes/equipos.routes';

app.use('/api/documentos/equipos', equiposRoutes);
```

---

## 📦 PASO 5: Frontend - RTK Query API Slice

### 5.1 Crear equiposApiSlice

**Archivo**: `apps/frontend/src/features/equipos/api/equiposApiSlice.ts`

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface TemplateGrouped {
  id: number;
  name: string;
  requiresExpiry: boolean;
}

export interface TemplatesGroupedResponse {
  EMPRESA_TRANSPORTISTA: TemplateGrouped[];
  CHOFER: TemplateGrouped[];
  CAMION: TemplateGrouped[];
  ACOPLADO: TemplateGrouped[];
}

export interface PresignedUrlRequest {
  fileName: string;
  mimeType: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  objectKey: string;
  fileName: string;
}

export interface AssembleEquipoRequest {
  tenantEmpresaId: number;
  dadorCargaId: number;
  empresaTransportista: {
    cuit: string;
    razonSocial: string;
  };
  chofer: {
    dni: string;
    nombre: string;
    apellido: string;
    phones?: string[];
  };
  tractor: {
    patente: string;
    marca?: string;
    modelo?: string;
  };
  semi?: {
    patente: string;
    tipo?: string;
  };
  documents: Array<{
    templateId: number;
    entityType: string;
    objectKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    expiresAt?: string;
  }>;
  clienteIds?: number[];
}

export const equiposApi = createApi({
  reducerPath: 'equiposApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:4802',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any).auth?.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getTemplatesGrouped: builder.query<TemplatesGroupedResponse, void>({
      query: () => '/api/documentos/templates/grouped',
      transformResponse: (response: any) => response.data,
    }),
    getPresignedUrls: builder.mutation<PresignedUrlResponse[], PresignedUrlRequest[]>({
      query: (files) => ({
        url: '/api/documentos/uploads/presign-urls',
        method: 'POST',
        body: { files },
      }),
      transformResponse: (response: any) => response.data,
    }),
    assembleEquipo: builder.mutation<{ success: boolean; equipoId: number }, AssembleEquipoRequest>({
      query: (data) => ({
        url: '/api/documentos/equipos/assemble',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useGetTemplatesGroupedQuery,
  useGetPresignedUrlsMutation,
  useAssembleEquipoMutation,
} = equiposApi;
```

### 5.2 Registrar en store

**Archivo**: `apps/frontend/src/store/store.ts`

```typescript
import { equiposApi } from '../features/equipos/api/equiposApiSlice';

export const store = configureStore({
  reducer: {
    // ... reducers existentes
    [equiposApi.reducerPath]: equiposApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(equiposApi.middleware),
});
```

---

## 📦 PASO 6: Frontend - Componente de Upload Individual

### 6.1 Crear DocumentoUploadField

**Archivo**: `apps/frontend/src/features/equipos/components/DocumentoUploadField.tsx`

```typescript
import React, { useState } from 'react';
import { CheckCircleIcon, ArrowUpTrayIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface DocumentoUploadFieldProps {
  templateId: number;
  label: string;
  requiresExpiry: boolean;
  onUploadComplete: (data: {
    templateId: number;
    objectKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    expiresAt?: string;
  }) => void;
  getPresignedUrl: (file: { fileName: string; mimeType: string }) => Promise<{
    uploadUrl: string;
    objectKey: string;
  }>;
}

export const DocumentoUploadField: React.FC<DocumentoUploadFieldProps> = ({
  templateId,
  label,
  requiresExpiry,
  onUploadComplete,
  getPresignedUrl,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploaded(false);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Seleccioná un archivo');
      return;
    }

    if (requiresExpiry && !expiresAt) {
      setError('La fecha de vencimiento es obligatoria');
      return;
    }

    try {
      setUploading(true);
      setError('');

      // 1. Obtener presigned URL
      const { uploadUrl, objectKey } = await getPresignedUrl({
        fileName: file.name,
        mimeType: file.type,
      });

      // 2. Subir archivo a MinIO
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Error subiendo archivo a MinIO');
      }

      // 3. Notificar al padre
      onUploadComplete({
        templateId,
        objectKey,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        expiresAt: requiresExpiry ? expiresAt : undefined,
      });

      setUploaded(true);
    } catch (err: any) {
      setError(err.message || 'Error subiendo archivo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className='border rounded p-4 mb-3 bg-white'>
      <label className='block text-sm font-medium mb-2'>{label}</label>

      <div className='flex items-center gap-2 mb-2'>
        <input
          type='file'
          accept='application/pdf,image/*'
          onChange={handleFileChange}
          className='text-sm'
          disabled={uploading || uploaded}
        />

        {uploaded && <CheckCircleIcon className='h-5 w-5 text-green-600' />}
      </div>

      {requiresExpiry && (
        <div className='mb-2'>
          <label className='block text-xs text-gray-600 mb-1'>Vencimiento</label>
          <input
            type='date'
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className='border rounded px-2 py-1 text-sm'
            disabled={uploading || uploaded}
          />
        </div>
      )}

      {error && <p className='text-xs text-red-600 mb-2'>{error}</p>}

      {!uploaded && (
        <button
          type='button'
          onClick={handleUpload}
          disabled={!file || uploading}
          className='border rounded px-3 py-1 text-sm bg-blue-600 text-white disabled:opacity-50 flex items-center gap-1'
        >
          {uploading ? (
            <>Subiendo...</>
          ) : (
            <>
              <ArrowUpTrayIcon className='h-4 w-4' />
              Subir
            </>
          )}
        </button>
      )}
    </div>
  );
};
```

---

## 📦 PASO 7: Frontend - Página Principal AltaEquipoPage

### 7.1 Crear página completa

**Archivo**: `apps/frontend/src/features/equipos/pages/AltaEquipoPage.tsx`

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGetTemplatesGroupedQuery,
  useGetPresignedUrlsMutation,
  useAssembleEquipoMutation,
} from '../api/equiposApiSlice';
import { DocumentoUploadField } from '../components/DocumentoUploadField';
import { useAppSelector } from '../../../store/hooks';

const schema = z.object({
  empresaCuit: z.string().length(11, 'El CUIT debe tener 11 dígitos'),
  empresaRazonSocial: z.string().min(3, 'Razón social requerida'),
  choferDni: z.string().min(7, 'DNI requerido'),
  choferNombre: z.string().min(2, 'Nombre requerido'),
  choferApellido: z.string().min(2, 'Apellido requerido'),
  tractorPatente: z.string().min(6, 'Patente requerida'),
  semiPatente: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const AltaEquipoPage: React.FC = () => {
  const navigate = useNavigate();
  const tenantEmpresaId = useAppSelector((s) => (s as any).auth?.user?.empresaId) || 1;
  const dadorCargaId = 1; // Hardcoded por ahora, luego se obtiene del usuario

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { data: templates, isLoading: loadingTemplates } = useGetTemplatesGroupedQuery();
  const [getPresignedUrls] = useGetPresignedUrlsMutation();
  const [assembleEquipo, { isLoading: assembling }] = useAssembleEquipoMutation();

  const [uploadedDocs, setUploadedDocs] = useState<
    Array<{
      templateId: number;
      entityType: string;
      objectKey: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      expiresAt?: string;
    }>
  >([]);

  const handleDocumentUpload = (data: any, entityType: string) => {
    setUploadedDocs((prev) => [...prev, { ...data, entityType }]);
  };

  const getPresignedUrlWrapper = async (file: { fileName: string; mimeType: string }) => {
    const result = await getPresignedUrls([file]).unwrap();
    return result[0];
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Calcular total de templates obligatorios
      const totalTemplates =
        (templates?.EMPRESA_TRANSPORTISTA.length || 0) +
        (templates?.CHOFER.length || 0) +
        (templates?.CAMION.length || 0) +
        (data.semiPatente ? templates?.ACOPLADO.length || 0 : 0);

      if (uploadedDocs.length < totalTemplates) {
        alert(`Faltan ${totalTemplates - uploadedDocs.length} documentos por subir`);
        return;
      }

      const payload = {
        tenantEmpresaId,
        dadorCargaId,
        empresaTransportista: {
          cuit: data.empresaCuit,
          razonSocial: data.empresaRazonSocial,
        },
        chofer: {
          dni: data.choferDni,
          nombre: data.choferNombre,
          apellido: data.choferApellido,
        },
        tractor: {
          patente: data.tractorPatente,
        },
        semi: data.semiPatente ? { patente: data.semiPatente } : undefined,
        documents: uploadedDocs,
      };

      await assembleEquipo(payload).unwrap();

      alert('✅ Equipo creado exitosamente');
      navigate('/equipos');
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  if (loadingTemplates) return <div>Cargando templates...</div>;

  const totalRequired =
    (templates?.EMPRESA_TRANSPORTISTA.length || 0) +
    (templates?.CHOFER.length || 0) +
    (templates?.CAMION.length || 0) +
    (templates?.ACOPLADO.length || 0);

  const progress = (uploadedDocs.length / totalRequired) * 100;

  return (
    <div className='container mx-auto px-4 py-6'>
      <h1 className='text-2xl font-semibold mb-4'>Alta de Empresa de Transporte, Choferes y Unidades</h1>

      {/* Progress Bar */}
      <div className='mb-6'>
        <div className='text-sm text-gray-600 mb-1'>
          Documentos subidos: {uploadedDocs.length} / {totalRequired} ({Math.round(progress)}%)
        </div>
        <div className='w-full h-3 bg-gray-200 rounded'>
          <div className='h-3 bg-green-500 rounded' style={{ width: `${progress}%` }} />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
        {/* Sección 1: Empresa Transportista */}
        <section className='border p-4 rounded'>
          <h2 className='text-lg font-semibold mb-3'>Empresa Transportista</h2>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-sm mb-1'>CUIT (11 dígitos)</label>
              <input {...register('empresaCuit')} className='border rounded px-2 py-1 w-full' />
              {errors.empresaCuit && <p className='text-xs text-red-600'>{errors.empresaCuit.message}</p>}
            </div>
            <div>
              <label className='block text-sm mb-1'>Razón Social</label>
              <input {...register('empresaRazonSocial')} className='border rounded px-2 py-1 w-full' />
              {errors.empresaRazonSocial && <p className='text-xs text-red-600'>{errors.empresaRazonSocial.message}</p>}
            </div>
          </div>
        </section>

        {/* Sección 2: Documentos Empresa */}
        <section className='border p-4 rounded'>
          <h2 className='text-lg font-semibold mb-3'>Documentos Empresa Transportista</h2>
          {templates?.EMPRESA_TRANSPORTISTA.map((t) => (
            <DocumentoUploadField
              key={t.id}
              templateId={t.id}
              label={t.name}
              requiresExpiry={t.requiresExpiry}
              onUploadComplete={(data) => handleDocumentUpload(data, 'EMPRESA_TRANSPORTISTA')}
              getPresignedUrl={getPresignedUrlWrapper}
            />
          ))}
        </section>

        {/* Sección 3: Chofer */}
        <section className='border p-4 rounded'>
          <h2 className='text-lg font-semibold mb-3'>Chofer</h2>
          <div className='grid grid-cols-3 gap-3 mb-3'>
            <div>
              <label className='block text-sm mb-1'>Nombre</label>
              <input {...register('choferNombre')} className='border rounded px-2 py-1 w-full' />
              {errors.choferNombre && <p className='text-xs text-red-600'>{errors.choferNombre.message}</p>}
            </div>
            <div>
              <label className='block text-sm mb-1'>Apellido</label>
              <input {...register('choferApellido')} className='border rounded px-2 py-1 w-full' />
              {errors.choferApellido && <p className='text-xs text-red-600'>{errors.choferApellido.message}</p>}
            </div>
            <div>
              <label className='block text-sm mb-1'>DNI</label>
              <input {...register('choferDni')} className='border rounded px-2 py-1 w-full' />
              {errors.choferDni && <p className='text-xs text-red-600'>{errors.choferDni.message}</p>}
            </div>
          </div>

          {templates?.CHOFER.map((t) => (
            <DocumentoUploadField
              key={t.id}
              templateId={t.id}
              label={t.name}
              requiresExpiry={t.requiresExpiry}
              onUploadComplete={(data) => handleDocumentUpload(data, 'CHOFER')}
              getPresignedUrl={getPresignedUrlWrapper}
            />
          ))}
        </section>

        {/* Sección 4: Tractor */}
        <section className='border p-4 rounded'>
          <h2 className='text-lg font-semibold mb-3'>Tractor</h2>
          <div className='mb-3'>
            <label className='block text-sm mb-1'>Patente</label>
            <input {...register('tractorPatente')} className='border rounded px-2 py-1' />
            {errors.tractorPatente && <p className='text-xs text-red-600'>{errors.tractorPatente.message}</p>}
          </div>

          {templates?.CAMION.map((t) => (
            <DocumentoUploadField
              key={t.id}
              templateId={t.id}
              label={t.name}
              requiresExpiry={t.requiresExpiry}
              onUploadComplete={(data) => handleDocumentUpload(data, 'CAMION')}
              getPresignedUrl={getPresignedUrlWrapper}
            />
          ))}
        </section>

        {/* Sección 5: Semi (Opcional) */}
        <section className='border p-4 rounded'>
          <h2 className='text-lg font-semibold mb-3'>Semi (Opcional)</h2>
          <div className='mb-3'>
            <label className='block text-sm mb-1'>Patente</label>
            <input {...register('semiPatente')} className='border rounded px-2 py-1' />
          </div>

          {templates?.ACOPLADO.map((t) => (
            <DocumentoUploadField
              key={t.id}
              templateId={t.id}
              label={t.name}
              requiresExpiry={t.requiresExpiry}
              onUploadComplete={(data) => handleDocumentUpload(data, 'ACOPLADO')}
              getPresignedUrl={getPresignedUrlWrapper}
            />
          ))}
        </section>

        {/* Botón Submit */}
        <button
          type='submit'
          disabled={assembling || uploadedDocs.length < totalRequired}
          className='bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50'
        >
          {assembling ? 'Creando Equipo...' : 'Crear Equipo'}
        </button>
      </form>
    </div>
  );
};

export default AltaEquipoPage;
```

---

## 📦 PASO 8: Rutas Frontend

### 8.1 Registrar ruta

**Archivo**: `apps/frontend/src/App.tsx`

```typescript
import AltaEquipoPage from './features/equipos/pages/AltaEquipoPage';

// ... dentro de Routes
<Route path='/equipos/alta' element={<AltaEquipoPage />} />
```

---

## ✅ Checklist de Verificación Final

- [ ] Seed de templates ejecutado (21 templates creados)
- [ ] Endpoint `/api/documentos/templates/grouped` responde correctamente
- [ ] Endpoint `/api/documentos/uploads/presign-urls` genera URLs
- [ ] Endpoint `/api/documentos/equipos/assemble` valida y crea equipo
- [ ] Frontend carga templates agrupados
- [ ] Componente `DocumentoUploadField` sube archivos a MinIO
- [ ] Progress bar actualiza correctamente
- [ ] Botón "Crear Equipo" disabled hasta completar todos los uploads
- [ ] Al crear equipo, redirige a dashboard con mensaje de éxito
- [ ] Validaciones Zod funcionan (CUIT, DNI, patentes)

---

## 🚀 Siguiente Paso

**Implementar PASO 1**: Crear seed de templates y ejecutar migraciones.

