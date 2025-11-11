# 📋 LISTADO EXHAUSTIVO DE FUNCIONALIDADES REQUERIDAS

> **Fecha de Generación**: 9 de Noviembre, 2025  
> **Versión**: 1.0  
> **Basado en**: RESUMEN_SOLUCION_COMPROMISO.md, ANALISIS_PORTAL_*.md, RESUMEN_EJECUTIVO_*.md

---

## 📖 Índice

1. [Sistema Principal: Gestión de Equipos](#sistema-principal)
2. [Portal de Cliente](#portal-de-cliente)
3. [Portal de Dador de Carga](#portal-de-dador)
4. [Portal de Transportistas y Choferes](#portal-de-transportistas)
5. [Seguridad y Validaciones](#seguridad)
6. [Resumen de Estimaciones](#resumen-estimaciones)
7. [Priorización Recomendada](#priorizacion)

---

## 🎯 SISTEMA PRINCIPAL: Gestión de Equipos de Transporte {#sistema-principal}

> **Documento Base**: `RESUMEN_SOLUCION_COMPROMISO.md`

### 1. Sistema Multi-Rol con 8 Roles Diferenciados 🔴 CRÍTICO

**Estado**: ❌ Por implementar

**Roles a implementar**:
- [x] SUPERADMIN / ADMIN (control total) - ✅ Ya existe
- [ ] **ADMIN_INTERNO** (puede cargar equipos para cualquier dador)
- [ ] **DADOR_DE_CARGA** (coordina múltiples transportistas)
- [ ] **TRANSPORTISTA** (empresa de transporte)
- [ ] **CHOFER** (conductor)
- [ ] **OPERADOR_INTERNO** (personal operativo)
- [ ] **CLIENTE** (solo lectura)

**Matriz de Permisos Completa**: Ver `RESUMEN_SOLUCION_COMPROMISO.md` líneas 103-139

**Archivos a modificar**:
```
apps/backend/src/
├── types/roles.ts (enum UserRole)
└── middlewares/
    ├── auth.ts
    └── authorize.ts (matriz de permisos)
```

**Estimación**: **2-3 días**

---

### 2. Pantalla de Carga Completa con Accordions 🔴 CRÍTICO

**Estado**: ❌ Por implementar

**Secciones requeridas**:

#### 🏢 Sección Empresa Transportista
- [ ] Formulario con CUIT, Nombre, Razón Social
- [ ] **5 documentos obligatorios**:
  1. Constancia ARCA
  2. Constancia Ingresos Brutos
  3. Formulario 931
  4. Recibos de Sueldo (último mes)
  5. Boleta Sindical

#### 👤 Sección Chofer
- [ ] Formulario con DNI, Nombre, Apellido, Contacto
- [ ] **6 documentos obligatorios**:
  1. DNI
  2. Licencia de Conducir
  3. Carnet de Salud
  4. Curso de Traslado de Sustancias Alimenticias
  5. Seguro de Vida
  6. ART (Aseguradora de Riesgos del Trabajo)

#### 🚜 Sección Tractor/Camión
- [ ] Formulario con Patente, Marca, Modelo
- [ ] **4 documentos obligatorios**:
  1. Cédula Verde
  2. RTO (Revisión Técnica Obligatoria)
  3. Póliza de Seguro
  4. Certificado GNC (si aplica)

#### 🚛 Sección Semi/Acoplado
- [ ] Formulario con Patente, Marca, Modelo
- [ ] **4 documentos obligatorios**:
  1. Cédula Verde
  2. RTO
  3. Póliza de Seguro
  4. SENASA

#### 🎯 Sección Clientes Asignados
- [ ] Multi-select de clientes
- [ ] Un equipo puede tener múltiples clientes

**Validaciones**:
- [ ] **Total: 19 documentos obligatorios** antes de guardar
- [ ] Botón "Guardar" deshabilitado si faltan documentos
- [ ] Mensaje claro listando documentos faltantes
- [ ] Frontend: Validación en tiempo real
- [ ] Backend: HTTP 400 si faltan documentos

**Componentes frontend**:
```
src/components/
├── SeccionEmpresa.tsx
├── SeccionChofer.tsx
├── SeccionUnidades.tsx
├── SeccionClientes.tsx
└── DocumentUploader.tsx
```

**Diseño**: Ver mockup en `RESUMEN_SOLUCION_COMPROMISO.md` líneas 692-763

**Estimación**: **3-4 días**

---

### 3. Sistema de Semáforo de Estados 🔴 CRÍTICO

**Estado**: ❌ Por implementar

#### Estados del Equipo:

| Indicador | Estado | Condición |
|-----------|--------|-----------|
| 🟢 Verde | `COMPLETO_AL_DIA` | Todos los docs obligatorios cargados + aprobados + ninguno vencido/por vencer |
| 🟡 Amarillo | `POR_VENCER` | Docs obligatorios completos + al menos uno vence en < 7 días |
| 🔴 Rojo | `VENCIDO` | Al menos un documento vencido |
| ⚪ Gris | `INCOMPLETO` | Faltan documentos obligatorios |
| 🔵 Azul | `PENDIENTE_APROBACION` | Hay documentos nuevos/actualizados pendientes de aprobación |
| 🔴🔵 Rojo+Azul | `RECHAZADO_Y_PENDIENTE` | Tiene documentos rechazados que necesitan recarga |

#### Estados de Documento Individual:

| Indicador | Estado | Condición |
|-----------|--------|-----------|
| ⚪ Gris | `NO_CARGADO` | No se ha cargado aún |
| 🔵 Azul | `PENDIENTE_APROBACION` | Cargado/actualizado, esperando aprobación |
| 🟢 Verde | `APROBADO` | Aprobado por el dador, válido |
| 🔴🔵 Rojo+Azul | `RECHAZADO` | Rechazado por el dador, necesita recarga |
| 🔴 Rojo | `VENCIDO` | Vencido (fecha pasada) |
| 🟡 Amarillo | `POR_VENCER` | Por vencer (< 7 días) |

**Reglas de Prioridad** (de mayor a menor):
1. INCOMPLETO (gris)
2. VENCIDO (rojo)
3. RECHAZADO_Y_PENDIENTE (rojo+azul)
4. PENDIENTE_APROBACION (azul)
5. POR_VENCER (amarillo)
6. COMPLETO_AL_DIA (verde)

**Implementación**:
- [ ] Service: `EquipoEstadoService` (cálculo de estados)
- [ ] Cálculo automático en tiempo real
- [ ] Visible en listados y detalles
- [ ] Component: `EquipoEstadoBadge.tsx`

**Archivos**:
```
apps/backend/src/services/
└── EquipoEstadoService.ts (CREAR)

apps/frontend/src/components/
└── EquipoEstadoBadge.tsx (CREAR)
```

**Estimación**: **2 días**

---

### 4. Workflow de Aprobación de Documentos 🔴 CRÍTICO

**Estado**: ❌ Por implementar

#### Flujo Completo:

```
1. Usuario carga documento (DADOR/TRANSPORTISTA/CHOFER)
   ↓
2. Estado inicial según rol:
   - ADMIN_INTERNO carga → APROBADO (auto-aprobado)
   - DADOR_DE_CARGA carga → PENDIENTE_APROBACION (puede auto-aprobar)
   - TRANSPORTISTA carga → PENDIENTE_APROBACION (requiere aprobación DADOR)
   - CHOFER carga → PENDIENTE_APROBACION (requiere aprobación DADOR)
   ↓
3. Equipo muestra indicador 🔵 azul
   ↓
4. DADOR_DE_CARGA revisa documentos pendientes:
   
   Opción A: APROBAR
   ↓
   - Estado → APROBADO (🟢)
   - Indicador azul desaparece
   - Se registra: quién aprobó + fecha
   
   Opción B: RECHAZAR
   ↓
   - Modal con motivos predefinidos + comentario
   - Estado → RECHAZADO (🔴🔵)
   - Indicador rojo+azul en equipo
   - Notificación al usuario (email/WhatsApp)
   - Se registra: quién rechazó + fecha + motivo + comentario
   ↓
5. Si rechazado, usuario re-carga → vuelve a PENDIENTE_APROBACION
```

**Características**:
- [ ] Indicador azul persiste hasta aprobación
- [ ] Motivos de rechazo predefinidos:
  - Documento ilegible
  - Documento vencido
  - Documento incorrecto
  - Datos no coinciden
  - Otro (requiere comentario)
- [ ] Notificación automática al usuario por rechazo
- [ ] Aprobación masiva: "Aprobar todos los pendientes" por equipo
- [ ] Historial completo en tabla `DocumentHistorial`

**Modelo de Datos**:
```prisma
model Document {
  // Workflow de aprobación
  estadoAprobacion    EstadoAprobacion  @default(PENDIENTE_APROBACION)
  aprobadoPorId       Int?
  aprobadoPor         User?             @relation("AprobadoPor")
  fechaAprobacion     DateTime?
  rechazadoPorId      Int?
  rechazadoPor        User?             @relation("RechazadoPor")
  fechaRechazo        DateTime?
  motivoRechazo       String?
  comentarioRechazo   String?
  notificarChofer     Boolean           @default(true)
  
  historial           DocumentHistorial[]
}

enum EstadoAprobacion {
  PENDIENTE_APROBACION
  APROBADO
  RECHAZADO
  APROBADO_AUTOMATICO
}

model DocumentHistorial {
  id                Int      @id @default(autoincrement())
  documentId        Int
  accion            String   // 'subido' | 'aprobado' | 'rechazado' | 'reemplazado'
  userId            Int
  motivoRechazo     String?
  comentarioRechazo String?
  metadata          Json?
  createdAt         DateTime @default(now())
  
  document   Document @relation(fields: [documentId], references: [id])
  user       User     @relation(fields: [userId], references: [id])
}
```

**Endpoints**:
```
POST   /api/documentos/aprobacion/:id/aprobar
POST   /api/documentos/aprobacion/:id/rechazar
POST   /api/equipos/:id/aprobar-todos
GET    /api/equipos/:id/documentos-pendientes
GET    /api/equipos/listado-con-pendientes
GET    /api/documentos/:id/historial
```

**Componentes frontend**:
```
src/components/
├── AprobacionModal.tsx
├── RechazoModal.tsx
└── HistorialDocumentoTable.tsx
```

**Estimación**: **3-4 días**

---

### 5. Versionado de Documentos 🟡 ALTA

**Estado**: ❌ Por implementar

**Características**:
- [ ] Campo `esActualizacion: boolean` para renovaciones
- [ ] Campo `documentoAnteriorId: Int?` para cadena de versiones
- [ ] Mantener historial completo (nunca eliminar versiones anteriores)
- [ ] Vista de historial por documento
- [ ] Cadena de versiones: Doc #100 → Doc #101 → Doc #102

**Modelo**:
```prisma
model Document {
  // Versionado
  esActualizacion     Boolean           @default(false)
  documentoAnteriorId Int?
  documentoAnterior   Document?         @relation("VersionAnterior")
  versiones           Document[]        @relation("VersionAnterior")
}
```

**Endpoint de Renovación**:
```
POST /api/documentos/:id/renovar
{
  file: <archivo_nuevo>,
  fechaVencimiento: '2031-01-01'
}
```

**Estimación**: **1-2 días**

---

### 6. Portal del Cliente (Solo Lectura) 🟡 ALTA

**Estado**: ⚠️ Parcialmente implementado

**Funcionalidades**:
- [ ] Listado de equipos asignados al cliente con semáforo
- [ ] Resumen estadístico:
  - 🟢 Equipos aptos: X (%)
  - 🟡 Por vencer: X (%)
  - 🔴 No aptos: X (%)
  - ⚪ Incompletos: X (%)
  - 🔵 Pendientes: X (%)
- [ ] Vista detalle de equipo (solo lectura)
- [ ] Información completa del equipo
- [ ] Documentos agrupados por categoría
- [ ] Estado de cada documento con indicador
- [ ] Fecha de vencimiento visible
- [ ] Información de aprobación (quién + cuándo)
- [ ] Botones por documento:
  - 👁️ Ver (preview)
  - 📥 Descargar
- [ ] Botones generales:
  - 📥 Descargar todos los documentos del equipo
  - 📄 Ver historial completo

**Implementación**:
```
apps/backend/src/
├── services/ClientePortalService.ts
└── controllers/ClientePortalController.ts

apps/frontend/src/
└── features/documentos/
    ├── pages/ClienteEquiposList.tsx
    └── pages/ClienteEquipoDetail.tsx
```

**Estimación**: **2-3 días**

---

### 7. Vista Previa de Documentos 🟡 ALTA

**Estado**: ❌ Por implementar

**Características**:

#### Modal de Vista Previa Completa:
- [ ] Layout lado a lado:
  - Izquierda: Visor de documento
  - Derecha: Datos del formulario
- [ ] Tipos soportados:
  - PDF (con zoom, paginación)
  - Imágenes (JPG, PNG, WEBP)
  - Otros formatos (icono + botón descargar)
- [ ] Controles:
  - Zoom in/out
  - Navegación páginas (PDF)
  - Rotación
  - Descargar original

#### Thumbnails (Miniaturas):
- [ ] Vista previa pequeña al lado de documento cargado
- [ ] Generación automática en backend
- [ ] Click para abrir vista completa

#### Quick Preview:
- [ ] Hover sobre thumbnail → tooltip con preview más grande
- [ ] Sin abrir modal completo

**Seguridad**:
- [ ] URLs firmadas con expiración (1 hora)
- [ ] Token temporal con JWT
- [ ] Verificación de permisos por rol
- [ ] No exposición de rutas reales

**Implementación Backend**:
```
apps/backend/src/services/
├── ThumbnailService.ts (CREAR)
├── SignedURLService.ts (CREAR)
└── DocumentPreviewService.ts (CREAR)
```

**Implementación Frontend**:
```
apps/frontend/src/components/
├── DocumentPreview.tsx (CREAR)
├── DocumentThumbnail.tsx (CREAR)
└── QuickPreview.tsx (CREAR)
```

**Librerías necesarias**:
```json
{
  "backend": {
    "sharp": "^0.32.0",
    "pdf-lib": "^1.17.1",
    "pdf2pic": "^3.0.0"
  },
  "frontend": {
    "react-pdf": "^7.5.0",
    "react-image-lightbox": "^5.1.4"
  }
}
```

**Estimación**: **2-3 días**

---

### 8. Sistema de Notificaciones 🟡 ALTA

**Estado**: ❌ Por implementar

**Características**:
- [ ] **Email**: Si usuario tiene email configurado
- [ ] **WhatsApp**: Si usuario tiene teléfono + opt-in
- [ ] **Sistema no bloqueante**: Continúa si faltan datos
- [ ] **Eventos a notificar**:
  - [ ] Documento rechazado (al CHOFER)
  - [ ] Documento por vencer en 7 días (CHOFER + TRANSPORTISTA + DADOR)
  - [ ] Documento vencido (CHOFER + TRANSPORTISTA + DADOR)
  - [ ] Documento aprobado (al CHOFER)
  - [ ] Equipo completo y apto (DADOR + CLIENTE)

**Modelo de Datos**:
```prisma
model UserNotificationPreferences {
  id              Int     @id @default(autoincrement())
  userId          Int     @unique
  user            User    @relation(...)
  
  emailEnabled    Boolean @default(true)
  whatsappEnabled Boolean @default(false)
  whatsappNumber  String?
  whatsappOptIn   Boolean @default(false)
  
  notifyVencimiento      Boolean @default(true)
  notifyAprobacion       Boolean @default(true)
  notifyRechazo          Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Service**:
```typescript
interface NotificationService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendWhatsApp(to: string, message: string): Promise<void>;
  notifyUser(userId: number, event: NotificationEvent, data: any): Promise<void>;
}

enum NotificationEvent {
  DOCUMENTO_RECHAZADO = 'documento_rechazado',
  DOCUMENTO_POR_VENCER = 'documento_por_vencer',
  DOCUMENTO_VENCIDO = 'documento_vencido',
  DOCUMENTO_APROBADO = 'documento_aprobado',
  EQUIPO_COMPLETO = 'equipo_completo',
}
```

**Cron Job**:
```typescript
// Ejecutar diariamente a las 8 AM
cron.schedule('0 8 * * *', async () => {
  // Buscar documentos que vencen en 7 días
  // Notificar a cada usuario
});
```

**Estimación**: **2 días**

---

### 9. Sistema de Auditoría Completo 🟡 ALTA

**Estado**: ❌ Por implementar

**Acciones a Loggear** (14+ acciones):
- [ ] Carga de documento
- [ ] Descarga de documento
- [ ] Actualización/reemplazo de documento
- [ ] Eliminación de documento
- [ ] Aprobación de documento
- [ ] Rechazo de documento
- [ ] Creación de equipo
- [ ] Actualización de equipo
- [ ] Eliminación de equipo
- [ ] Asignación de equipo a cliente
- [ ] Desasignación de equipo de cliente
- [ ] Descarga de ZIP por cliente
- [ ] Cambio de chofer en equipo
- [ ] Login/logout de usuario

**Modelo**:
```prisma
model AuditLog {
  id           Int      @id @default(autoincrement())
  
  // Quién
  userId       Int
  user         User     @relation(...)
  userRole     UserRole
  userEmail    String
  
  // Qué
  action       String   // 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'DOWNLOAD' | 'UPLOAD'
  entityType   String   // 'Document' | 'Equipo' | 'EmpresaTransportista' | etc.
  entityId     Int?
  
  // Cómo/Detalles
  changes      Json?    // Cambios específicos (antes/después)
  metadata     Json?    // Información adicional
  
  // Contexto
  ipAddress    String?
  userAgent    String?
  
  // Cuándo
  createdAt    DateTime @default(now())
  
  @@index([userId])
  @@index([entityType, entityId])
  @@index([action])
  @@index([createdAt])
}
```

**Service**:
```typescript
export class AuditService {
  async log(params: {
    userId: number;
    action: AuditAction;
    entityType: string;
    entityId?: number;
    changes?: any;
    metadata?: any;
    req?: Request;
  }): Promise<void>
  
  async getLogs(filters: {
    userId?: number;
    entityType?: string;
    entityId?: number;
    action?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    pageSize?: number;
  })
}
```

**Middleware**:
```typescript
export const auditMiddleware = (action: AuditAction, entityType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Log después de respuesta exitosa
  };
};
```

**Endpoints**:
```
GET /api/audit/logs                  // Listar todos (solo ADMIN)
GET /api/audit/logs/entity/:type/:id // Logs de una entidad específica
GET /api/audit/logs/user/:userId     // Logs de un usuario
GET /api/audit/logs/export           // Exportar CSV
```

**Estimación**: **2 días**

---

### 10. Política de Backup y Recovery 🟢 MEDIA

**Estado**: ❌ Por implementar

**Estrategia 3-2-1**:
- **3 copias** de los datos
- **2 tipos de almacenamiento** diferentes
- **1 copia offsite** (fuera del servidor)

**Frecuencia**:
```
├── Backup Completo (Full)
│   └── Diario a las 2 AM
│   └── Retención: 30 días
│
├── Backup Incremental
│   └── Cada 6 horas (6 AM, 12 PM, 6 PM, 12 AM)
│   └── Retención: 7 días
│
└── Backup Snapshot (antes de operaciones críticas)
    └── Manual o automático antes de migraciones
    └── Retención: Indefinida
```

**Implementación**:

#### A. Backup de Base de Datos
```bash
#!/bin/bash
# Script de backup diario (crontab: 0 2 * * *)

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
DB_NAME="monorepo_bca"
S3_BUCKET="s3://bca-backups"

# 1. Dump de PostgreSQL
pg_dump -Fc -f "$BACKUP_DIR/backup_$TIMESTAMP.dump" $DB_NAME

# 2. Comprimir
gzip "$BACKUP_DIR/backup_$TIMESTAMP.dump"

# 3. Upload a S3 (offsite)
aws s3 cp "$BACKUP_DIR/backup_$TIMESTAMP.dump.gz" "$S3_BUCKET/postgres/"

# 4. Limpiar backups antiguos (> 30 días)
find $BACKUP_DIR -name "*.dump.gz" -mtime +30 -delete

# 5. Verificar integridad
pg_restore --list "$BACKUP_DIR/backup_$TIMESTAMP.dump.gz" > /dev/null 2>&1
```

#### B. Backup de Documentos (S3 con Versionado)
```typescript
const s3Config = {
  bucket: 'bca-documentos',
  region: 'us-east-1',
  versioning: true,
  lifecycleRules: [
    {
      transitions: [
        { days: 90, storageClass: 'GLACIER' },
      ],
      expiration: { days: 365 },
    },
  ],
  replication: {
    destinationBucket: 'bca-documentos-replica',
    destinationRegion: 'us-west-2',
  },
};
```

#### C. Soft Delete
```prisma
model Document {
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?
  deletedById Int?
  deletedBy   User?     @relation("DeletedBy")
  purgeAt     DateTime? // Auto-purga después de 90 días
}
```

**Disaster Recovery**:
- **RTO (Recovery Time Objective)**: 4 horas
- **RPO (Recovery Point Objective)**: 6 horas

**Monitoreo**:
- [ ] Alertas por email/SMS si backup falla
- [ ] Dashboard de estado de backups
- [ ] Healthcheck endpoint: `/api/health/backups`

**Estimación**: **2 días**

---

## 🔍 PORTAL DE CLIENTE: Búsqueda por Patentes {#portal-de-cliente}

> **Documento Base**: `ANALISIS_PORTAL_CLIENTE_PATENTES.md`

### 11. Input de Múltiples Patentes 🔴 CRÍTICO

**Estado**: ❌ Por implementar

**Características**:
- [ ] Campo de texto multi-línea (textarea)
- [ ] Pegar patentes: una por línea
- [ ] Validación en tiempo real
- [ ] Normalización automática de patentes
- [ ] Botón "Buscar"
- [ ] Resumen de resultados: encontradas/no encontradas
- [ ] Límite: 50 patentes máximo

**Componente**:
```tsx
// apps/frontend/src/features/documentos/components/BulkPatentesSearch.tsx

export const BulkPatentesSearch = () => {
  const [patentes, setPatentes] = useState<string>('');
  const [results, setResults] = useState<SearchResult>();
  
  const handleSearch = async () => {
    const patentesArray = patentes.split('\n').filter(p => p.trim());
    const response = await fetch('/api/docs/clients/bulk-search', {
      method: 'POST',
      body: JSON.stringify({ patentes: patentesArray }),
    });
    // ...
  };
  
  return (
    <div>
      <textarea
        placeholder="Pegue las patentes (una por línea)"
        value={patentes}
        onChange={(e) => setPatentes(e.target.value)}
        rows={10}
      />
      <button onClick={handleSearch}>Buscar</button>
      {results && <ResultsSummary data={results} />}
    </div>
  );
};
```

**Estimación**: **1-2 horas**

---

### 12. Endpoint de Búsqueda Masiva 🔴 CRÍTICO

**Estado**: ❌ Por implementar

**Endpoint**: `POST /api/docs/clients/bulk-search`

**Request**:
```json
{
  "patentes": ["AA123BB", "CC456DD", "EE789FF"],
  "clienteId": 1
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "equipos": [
      {
        "id": 1,
        "camionPatente": "AA123BB",
        "choferDni": "12345678",
        "acopladoPatente": "ZZ999XX",
        "empresaTransportista": {
          "id": 1,
          "cuit": "20123456789",
          "razonSocial": "Transportes SA"
        },
        "documentacion": {
          "empresa": [...],
          "chofer": [...],
          "camion": [...],
          "acoplado": [...]
        },
        "estado": "COMPLETO_AL_DIA"
      }
    ],
    "notFound": ["XX999YY"]
  },
  "summary": {
    "patentesConsultadas": 3,
    "equiposEncontrados": 2,
    "patentesNoEncontradas": 1
  }
}
```

**Implementación**:
```typescript
// apps/documentos/src/controllers/clients.controller.ts

static async bulkSearch(req: AuthRequest, res: Response) {
  const { patentes, clienteId } = req.body;
  
  // 1. Normalizar patentes
  const normalized = patentes.map(p => normalizePlate(p));
  
  // 2. Buscar camiones por patentes
  const camiones = await prisma.camion.findMany({
    where: {
      patenteNorm: { in: normalized },
      activo: true,
    },
  });
  
  // 3. Buscar equipos asociados
  const equipos = await prisma.equipo.findMany({
    where: {
      truckId: { in: camiones.map(c => c.id) },
      equiposClientes: {
        some: { clienteId },
      },
    },
    include: {
      empresaTransportista: true,
      chofer: true,
      camion: true,
      acoplado: true,
    },
  });
  
  // 4. Enriquecer con documentación
  // ...
  
  res.json({ success: true, data: { equipos, notFound } });
}
```

**Archivos a modificar**:
```
apps/documentos/src/
├── schemas/validation.schemas.ts (MODIFICAR)
├── services/equipo.service.ts (MODIFICAR)
├── controllers/clients.controller.ts (MODIFICAR)
└── routes/clients.routes.ts (MODIFICAR)
```

**Estimación**: **2-3 horas**

---

### 13. ZIP con Estructura Específica 🔴 CRÍTICO

**Estado**: ⚠️ Existe ZIP básico, falta estructura específica

**Endpoint**: `POST /api/docs/clients/bulk-zip`

**Estructura Requerida**:
```
ClienteNombre_Documentacion_07-11-2025/
├── AA123BB/                          # Patente del camión
│   ├── EMPRESA_20123456789/          # CUIT empresa
│   │   ├── Constancia_ARCA.pdf
│   │   ├── Constancia_Ingresos_Brutos.pdf
│   │   ├── Formulario_931.pdf
│   │   ├── Recibos_Sueldo.pdf
│   │   └── Boleta_Sindical.pdf
│   ├── CHOFER_12345678/              # DNI chofer
│   │   ├── DNI.pdf
│   │   ├── Licencia_Conducir.pdf
│   │   ├── Carnet_Salud.pdf
│   │   ├── Curso_Traslado.pdf
│   │   ├── Seguro_Vida.pdf
│   │   └── ART.pdf
│   ├── CAMION_AA123BB/               # Patente camión
│   │   ├── Cedula_Verde.pdf
│   │   ├── RTO.pdf
│   │   ├── Poliza_Seguro.pdf
│   │   └── Certificado_GNC.pdf
│   └── ACOPLADO_ZZ999XX/             # Patente acoplado
│       ├── Cedula_Verde.pdf
│       ├── RTO.pdf
│       ├── Poliza_Seguro.pdf
│       └── SENASA.pdf
├── CC456DD/
│   └── ...
└── Resumen.xlsx                      # Excel con toda la info
```

**Filtros Temporales**:
- [ ] Toda la documentación
- [ ] Solo documentos renovados en última **semana**
- [ ] Solo documentos renovados en última **quincena**
- [ ] Solo documentos renovados en último **mes**
- [ ] Solo documentos renovados en último **año**

**Resumen Excel Incluido**:
Columnas:
- Equipo (patente camión)
- Transportista
- Chofer
- DNI Chofer
- Documento
- Fecha Vencimiento
- Estado
- Aprobado Por

**Formato condicional**:
- 🔴 Rojo: documentos vencidos
- 🟡 Amarillo: documentos por vencer (< 7 días)

**Opciones**:
- [ ] ☑️ Incluir resumen Excel con vencimientos
- [ ] ☑️ Incluir solo documentos aprobados
- [ ] ☐ Incluir historial de aprobaciones

**Implementación**:
```typescript
// apps/documentos/src/services/DocumentZipService.ts

export class DocumentZipService {
  async generarZipEquipos(
    equipoIds: number[],
    clienteNombre: string,
    options: ZipOptions
  ): Promise<Stream> {
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    for (const equipoId of equipoIds) {
      const equipo = await this.getEquipoConDocumentos(equipoId);
      
      // Estructura de carpetas
      const baseFolder = `${equipo.camionPatente}`;
      
      // EMPRESA
      const empresaFolder = `${baseFolder}/EMPRESA_${equipo.empresa.cuit}`;
      for (const doc of equipo.empresa.documentos) {
        archive.file(doc.filePath, { name: `${empresaFolder}/${doc.fileName}` });
      }
      
      // CHOFER
      const choferFolder = `${baseFolder}/CHOFER_${equipo.chofer.dni}`;
      // ...
      
      // CAMION
      // ...
      
      // ACOPLADO
      // ...
    }
    
    // Generar Excel
    const excel = await this.generarResumenExcel(equipos);
    archive.append(excel, { name: 'Resumen.xlsx' });
    
    return archive.finalize();
  }
  
  async generarResumenExcel(equipos: Equipo[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Resumen');
    
    // Columnas
    sheet.columns = [
      { header: 'Equipo', key: 'equipo' },
      { header: 'Transportista', key: 'transportista' },
      // ...
    ];
    
    // Datos
    for (const equipo of equipos) {
      for (const doc of equipo.documentos) {
        sheet.addRow({
          equipo: equipo.camionPatente,
          // ...
        });
      }
    }
    
    // Formato condicional
    // ...
    
    return await workbook.xlsx.writeBuffer();
  }
}
```

**Dependencias**:
```json
{
  "dependencies": {
    "archiver": "^6.0.1",
    "exceljs": "^4.4.0"
  }
}
```

**Estimación**: **4-5 horas**

---

### 14. Consulta de Maestros (Cliente) 🟢 BAJA

**Estado**: ❌ Por implementar

**Características**:
- [ ] Nueva página: `ClienteMaestrosPage.tsx`
- [ ] Tabs: Empresas, Choferes, Camiones, Acoplados
- [ ] Filtros por CUIT, DNI, patente, estado activo
- [ ] Tablas con paginación
- [ ] Links a documentación de cada entidad

**Implementación**:
```tsx
// apps/frontend/src/features/documentos/pages/ClienteMaestrosPage.tsx

export const ClienteMaestrosPage = () => {
  const [activeTab, setActiveTab] = useState('empresas');
  
  return (
    <div>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="empresas">Empresas Transportistas</Tab>
        <Tab value="choferes">Choferes</Tab>
        <Tab value="camiones">Camiones</Tab>
        <Tab value="acoplados">Acoplados</Tab>
      </Tabs>
      
      {activeTab === 'empresas' && <EmpresasTransportistasTable />}
      {activeTab === 'choferes' && <ChoferesTable />}
      {activeTab === 'camiones' && <CamionesTable />}
      {activeTab === 'acoplados' && <AcopladosTable />}
    </div>
  );
};
```

**Estimación**: **2-3 horas**

---

## 🚛 PORTAL DE DADOR DE CARGA {#portal-de-dador}

> **Documentos Base**: `ANALISIS_PORTAL_DADOR_CARGA.md`, `RESUMEN_EJECUTIVO_DADOR.md`

### 15. Rol y Autenticación de Dadores 🔴 CRÍTICO

**Estado**: ❌ Por implementar

**Opción A: Rol EndUser DADOR** (Largo plazo - 10-12h)
- [ ] Agregar `DADOR` a enum `EndUserRole`
- [ ] Migración de base de datos
- [ ] Crear EndUsers para dadores existentes
- [ ] Middleware `authenticateDador`
- [ ] Script de migración

**Opción B: Metadata en User** (MVP - RECOMENDADO - 4-5h)
- [ ] Usar `user.metadata.dadorCargaId`
- [ ] Middleware `resolveDadorId`
- [ ] Aplicar middleware globalmente
- [ ] No requiere cambios en BD

**Implementación Opción B** (Recomendada):
```typescript
// apps/documentos/src/middlewares/dador-resolver.middleware.ts

export const resolveDadorId = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const user = req.user;
  
  // Si el user tiene metadata con dadorCargaId
  if (user.metadata?.dadorCargaId) {
    req.dadorId = user.metadata.dadorCargaId;
  }
  
  next();
};

// Aplicar globalmente
router.use(authenticate);
router.use(resolveDadorId);
```

**Estimación**: **4-5 horas (Opción B)** o **10-12 horas (Opción A)**

---

### 16. Permisos de Aprobación para Dadores 🔴 CRÍTICO

**Estado**: ❌ Por implementar  
**Problema actual**: Solo ADMIN/SUPERADMIN pueden aprobar

**Middleware de Autorización**:
```typescript
// apps/documentos/src/middlewares/auth.middleware.ts

export const authorizeDadorOrAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  
  // Si es ADMIN/SUPERADMIN, permitir todo
  if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
    return next();
  }
  
  // Si es DADOR, verificar que el documento le pertenezca
  if (req.dadorId) {
    const docId = Number(req.params.id);
    const doc = await prisma.document.findUnique({
      where: { id: docId },
      select: { dadorCargaId: true },
    });
    
    if (!doc) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }
    
    if (doc.dadorCargaId === req.dadorId) {
      return next();
    }
  }
  
  return res.status(403).json({ message: 'No tienes permisos para aprobar este documento' });
};
```

**Actualizar Rutas**:
```typescript
// apps/documentos/src/routes/approval.routes.ts

// ANTES:
router.post('/pending/:id/approve', 
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), 
  ApprovalController.approveDocument
);

// DESPUÉS:
router.post('/pending/:id/approve', 
  authorizeDadorOrAdmin,
  ApprovalController.approveDocument
);

router.post('/pending/:id/reject', 
  authorizeDadorOrAdmin,
  ApprovalController.rejectDocument
);
```

**Componente Frontend**:
```tsx
// apps/frontend/src/features/documentos/components/DadorApprovalQueue.tsx

export const DadorApprovalQueue = () => {
  const { data: pendientes } = useGetPendingDocumentsQuery();
  
  const handleApprove = async (docId: number) => {
    await approveDocument(docId);
  };
  
  const handleReject = async (docId: number, motivo: string) => {
    await rejectDocument(docId, motivo);
  };
  
  return (
    <div>
      <h2>Documentos Pendientes de Aprobación</h2>
      {pendientes?.map(doc => (
        <DocumentCard key={doc.id} document={doc}>
          <button onClick={() => handleApprove(doc.id)}>Aprobar</button>
          <button onClick={() => handleReject(doc.id, 'motivo')}>Rechazar</button>
        </DocumentCard>
      ))}
    </div>
  );
};
```

**Estimación**: **2-3 horas**

---

### 17. Autofiltro por DadorId 🔴 CRÍTICO

**Estado**: ❌ Por implementar  
**Problema actual**: Endpoints no filtran automáticamente

**Middleware**:
```typescript
// apps/documentos/src/middlewares/dador-resolver.middleware.ts

export const autoFilterByDador = (req: AuthRequest, res: Response, next: NextFunction) => {
  const dadorId = req.dadorId || req.user?.metadata?.dadorCargaId;
  
  if (dadorId) {
    // Agregar filtro automático a la query
    req.query.dadorCargaId = String(dadorId);
  }
  
  next();
};
```

**Aplicar a Rutas**:
```typescript
// apps/documentos/src/routes/maestros.routes.ts

router.use(authenticate);
router.use(resolveDadorId);
router.use(autoFilterByDador);  // ← Nuevo middleware

// Ahora todos los listados se filtran automáticamente
router.get('/empresas', ...);  // Solo muestra empresas del dador
router.get('/choferes', ...);  // Solo muestra choferes del dador
router.get('/camiones', ...);  // Solo muestra camiones del dador
router.get('/acoplados', ...); // Solo muestra acoplados del dador
```

**Estimación**: **3-4 horas**

---

### 18. Búsqueda Masiva por Patentes (Dador) 🟡 ALTA

**Estado**: ❌ Por implementar

**Endpoint**: `POST /api/docs/dadores/bulk-search`

**Implementación**:
```typescript
// apps/documentos/src/controllers/dadores.controller.ts

static async bulkSearch(req: AuthRequest, res: Response) {
  const { patentes } = req.body;
  const dadorId = req.dadorId;
  
  // Normalizar patentes
  const normalized = patentes.map(normalizePlate);
  
  // Buscar camiones del dador por patentes
  const camiones = await prisma.camion.findMany({
    where: {
      tenantEmpresaId: req.tenantId,
      dadorCargaId: dadorId,
      patenteNorm: { in: normalized },
    },
  });
  
  // Buscar equipos asociados
  const equipos = await prisma.equipo.findMany({
    where: {
      truckId: { in: camiones.map(c => c.id) },
      dadorCargaId: dadorId,
    },
    include: {
      empresaTransportista: true,
      chofer: true,
      camion: true,
      acoplado: true,
    },
  });
  
  const foundPatentes = new Set(camiones.map(c => c.patenteNorm));
  const notFound = normalized.filter(p => !foundPatentes.has(p));
  
  res.json({ success: true, data: { equipos, notFound } });
}
```

**Componente Frontend**:
Reutilizar `BulkPatentesSearch` del cliente

**Estimación**: **3-4 horas**

---

### 19. ZIP Estructurado (Dador) 🟡 ALTA

**Estado**: ❌ Por implementar

**Endpoint**: `POST /api/docs/dadores/bulk-zip`

**Implementación**: Misma estructura que cliente, con filtro por `dadorId`

**Estimación**: **2-3 horas**

---

### 20. Portal de Consulta de Maestros (Dador) 🟢 MEDIA

**Estado**: ❌ Por implementar

**Página Nueva**:
```tsx
// apps/frontend/src/features/documentos/pages/DadorMaestrosPage.tsx

export const DadorMaestrosPage = () => {
  const [activeTab, setActiveTab] = useState('empresas');
  
  return (
    <div>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="empresas">Empresas Transportistas</Tab>
        <Tab value="choferes">Choferes</Tab>
        <Tab value="camiones">Camiones</Tab>
        <Tab value="acoplados">Acoplados</Tab>
      </Tabs>
      
      {activeTab === 'empresas' && <EmpresasTransportistasTable />}
      {activeTab === 'choferes' && <ChoferesTable />}
      {activeTab === 'camiones' && <CamionesTable />}
      {activeTab === 'acoplados' && <AcopladosTable />}
    </div>
  );
};
```

**Integración**:
- [ ] Agregar link en `DadoresPortalPage`
- [ ] Configurar ruta en App.tsx

**Estimación**: **4-5 horas**

---

## 🚚 PORTAL DE TRANSPORTISTAS Y CHOFERES {#portal-de-transportistas}

> **Documentos Base**: `ANALISIS_PORTAL_TRANSPORTISTAS_CHOFERES.md`, `RESUMEN_EJECUTIVO_TRANSPORTISTAS.md`

### 21. Rol TRANSPORTISTA 🔴 CRÍTICO

**Estado**: ❌ Por implementar

**Decisión**: Un solo rol `TRANSPORTISTA` para empresas y choferes

```typescript
// Agregar a enum UserRole
export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  DADOR_CARGA = 'DADOR_CARGA',
  TRANSPORTISTA = 'TRANSPORTISTA',  // ← NUEVO
}

// Diferenciación con metadata
user = {
  role: 'TRANSPORTISTA',
  metadata: {
    type: 'empresa' | 'chofer',
    empresaTransportistaId?: 5,
    choferId?: 10,
    choferDni?: '12345678'
  }
}
```

**Estimación**: **2 horas**

---

### 22. Middleware authorizeTransportista 🔴 CRÍTICO

**Estado**: ❌ Por implementar

```typescript
// apps/documentos/src/middlewares/auth.middleware.ts

export const authorizeTransportista = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const user = req.user;
  
  // ADMIN/SUPERADMIN/DADOR_CARGA: acceso total
  if (['SUPERADMIN', 'ADMIN', 'DADOR_CARGA'].includes(user.role)) {
    next();
    return;
  }
  
  // TRANSPORTISTA: solo acceso a SUS datos
  if (user.role === 'TRANSPORTISTA') {
    const transportistaId = user.metadata?.empresaTransportistaId;
    const choferId = user.metadata?.choferId;
    const choferDni = user.metadata?.dni;
    
    if (!transportistaId && !choferId && !choferDni) {
      return res.status(403).json({ 
        success: false, 
        message: 'Usuario sin transportista/chofer asociado' 
      });
    }
    
    // Inyectar filtros automáticamente
    req.transportistaId = transportistaId;
    req.choferId = choferId;
    req.choferDni = choferDni;
    
    next();
    return;
  }
  
  res.status(403).json({ success: false, message: 'Permisos insuficientes' });
};
```

**Estimación**: **4 horas**

---

### 23. Filtrado de Equipos por Transportista 🔴 CRÍTICO

**Estado**: ⚠️ Existe `/mis-equipos` básico, falta filtrado completo

**Service Method**:
```typescript
// apps/documentos/src/services/equipo.service.ts

static async getEquiposByTransportista(
  tenantId: number,
  empresaTransportistaId?: number,
  choferId?: number,
  choferDni?: string
): Promise<Equipo[]> {
  const where: any = {
    tenantEmpresaId: tenantId,
    OR: [],
  };
  
  // Si es empresa: equipos donde la empresa está asignada
  if (empresaTransportistaId) {
    where.OR.push({ empresaTransportistaId });
  }
  
  // Si es chofer: equipos donde es el driver
  if (choferId) {
    where.OR.push({ driverId: choferId });
  }
  
  // Si es chofer por DNI
  if (choferDni) {
    const dniNorm = normalizeDni(choferDni);
    where.OR.push({ driverDniNorm: dniNorm });
  }
  
  if (where.OR.length === 0) {
    return [];
  }
  
  return await prisma.equipo.findMany({
    where,
    include: {
      empresaTransportista: true,
      chofer: true,
      camion: true,
      acoplado: true,
      clientes: true,
    },
    orderBy: { validFrom: 'desc' },
  });
}
```

**Endpoint**:
```
GET /api/docs/transportistas/mis-equipos (ACTUALIZAR)
```

**Estimación**: **3-4 horas**

---

### 24. Filtrado de Maestros por Transportista 🟡 ALTA

**Estado**: ❌ Por implementar

**Endpoints Nuevos**:
- `GET /api/docs/transportistas/mis-choferes`
- `GET /api/docs/transportistas/mis-camiones`
- `GET /api/docs/transportistas/mis-acoplados`

**Implementación**:
```typescript
// Choferes del transportista
static async getChoferesByTransportista(
  tenantId: number,
  empresaTransportistaId?: number,
  choferId?: number
): Promise<Chofer[]> {
  const where: any = {
    tenantEmpresaId: tenantId,
    activo: true,
  };
  
  if (empresaTransportistaId) {
    // Empresa: todos sus choferes
    where.empresaTransportistaId = empresaTransportistaId;
  } else if (choferId) {
    // Chofer individual: solo él mismo
    where.id = choferId;
  }
  
  return await prisma.chofer.findMany({ where });
}

// Similar para camiones y acoplados
```

**Estimación**: **3-4 horas**

---

### 25. Búsqueda por Patentes (Transportistas) 🟡 ALTA

**Estado**: ❌ Por implementar

**Endpoint**: `POST /api/docs/transportistas/bulk-search`

**Diferencias con Dador/Cliente**:
- Límite: **20 patentes** (menos que dador/cliente)
- Solo patentes de sus equipos

**Implementación**:
```typescript
static async bulkSearchByPatentesTransportista(
  tenantId: number,
  patentes: string[],
  empresaTransportistaId?: number,
  choferId?: number
): Promise<{ equipos: any[]; notFound: string[] }> {
  const normalizedPatentes = patentes.map(p => normalizePlate(p));
  const uniquePatentes = [...new Set(normalizedPatentes)];
  
  // Buscar camiones del transportista
  const camionesWhere: any = {
    tenantEmpresaId: tenantId,
    patenteNorm: { in: uniquePatentes },
    activo: true,
  };
  
  if (empresaTransportistaId) {
    camionesWhere.empresaTransportistaId = empresaTransportistaId;
  } else if (choferId) {
    // Camiones que el chofer usa
    const equipos = await prisma.equipo.findMany({
      where: { driverId: choferId },
      select: { truckId: true },
    });
    camionesWhere.id = { in: equipos.map(e => e.truckId) };
  }
  
  const camiones = await prisma.camion.findMany({ where: camionesWhere });
  
  const foundPatentes = new Set(camiones.map(c => c.patenteNorm));
  const notFound = uniquePatentes.filter(p => !foundPatentes.has(p));
  
  // Buscar equipos asociados
  // ...
  
  return { equipos, notFound };
}
```

**Componente Frontend**: Reutilizar `BulkPatentesSearch`

**Estimación**: **3 horas**

---

### 26. Descarga de ZIP (Transportistas) 🟡 ALTA

**Estado**: ❌ Por implementar

**Endpoint**: `POST /api/docs/transportistas/bulk-zip`

**Características**:
- Estructura similar a cliente/dador
- Límite: **20 equipos**
- Filtrado por transportistaId

**Estimación**: **3-4 horas**

---

### 27. Dashboard de Cumplimiento Mejorado 🟢 MEDIA

**Estado**: ✅ Existe `DashboardCumplimiento`, ❌ Falta mejorar

**Mejoras a Implementar**:
- [ ] Estado global de cumplimiento (gráfico)
- [ ] Alertas de vencimientos destacadas
- [ ] Lista de documentos faltantes
- [ ] Gráfico de estado por equipo (pie chart)
- [ ] Acciones rápidas (re-subir, solicitar)

**Componente**:
```tsx
// apps/frontend/src/features/documentos/components/TransportistaMaestros.tsx

export const DashboardCumplimientoMejorado = () => {
  const { data: stats } = useGetComplianceStatsQuery();
  
  return (
    <div>
      <EstadoGlobalCard stats={stats} />
      <AlertasVencimientosCard />
      <DocumentosFaltantesCard />
      <GraficoEstadosEquipos />
    </div>
  );
};
```

**Estimación**: **3 horas**

---

## 🔐 SEGURIDAD Y VALIDACIONES {#seguridad}

### 28. Control de Acceso Estricto 🔴 CRÍTICO

**Estado**: ⚠️ Parcialmente implementado

**Validaciones Requeridas**:
- [ ] Verificación doble: `tenantEmpresaId` + scope específico (dadorId/transportistaId/choferId)
- [ ] Filtrado en queries (NUNCA solo en frontend)
- [ ] Middleware `canAccessResource` para validación granular
- [ ] Tests de seguridad para cross-access

**Implementación**:
```typescript
// apps/documentos/src/middlewares/canAccessResource.ts

export const canAccessResource = async (
  userId: number,
  resourceId: number,
  resourceType: string,
  scope: { dadorId?: number; transportistaId?: number; choferId?: number }
) => {
  const resource = await prisma[resourceType].findUnique({
    where: { id: resourceId },
    select: { 
      dadorCargaId: true, 
      empresaTransportistaId: true,
      tenantEmpresaId: true 
    },
  });
  
  if (!resource) return false;
  
  // Verificar scope
  if (scope.dadorId && resource.dadorCargaId !== scope.dadorId) {
    return false;
  }
  
  if (scope.transportistaId && resource.empresaTransportistaId !== scope.transportistaId) {
    return false;
  }
  
  return true;
};
```

**Estimación**: Incluido en cada módulo

---

### 29. Rate Limiting Diferenciado 🟡 ALTA

**Estado**: ✅ Existe rate limiting básico, ❌ Falta diferenciación por rol

**Límites por Rol**:
```typescript
const rateLimits = {
  CLIENTE: {
    bulkSearch: 50, // patentes/request
    bulkZip: 50,    // equipos/request
  },
  DADOR_CARGA: {
    bulkSearch: 50,
    bulkZip: 50,
  },
  TRANSPORTISTA: {
    bulkSearch: 20,  // menos que cliente/dador
    bulkZip: 20,
  },
  GLOBAL: {
    requestsPerMinute: 100, // req/min por IP
  },
};
```

**Implementación**:
```typescript
// apps/documentos/src/middlewares/rate-limit.middleware.ts

export const rateLimitByRole = (action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const role = req.user.role;
    const limit = rateLimits[role]?.[action] || rateLimits.GLOBAL[action];
    
    // Aplicar límite
    // ...
  };
};
```

**Estimación**: **2 horas**

---

### 30. Validación de Archivos 🟡 ALTA

**Estado**: ⚠️ Validación básica existe, falta completar

**Validaciones Requeridas**:
- [ ] Tipos permitidos: PDF, JPG, PNG, WEBP
- [ ] Tamaño máximo: 10 MB por archivo
- [ ] Escaneo de virus (opcional con ClamAV)
- [ ] Normalización de nombres de archivo
- [ ] Validación de mime-type real (no solo extensión)

**Implementación**:
```typescript
// apps/documentos/src/middlewares/file-validation.middleware.ts

export const validateFile = (req: Request, res: Response, next: NextFunction) => {
  const file = req.file;
  
  // Tipos permitidos
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return res.status(400).json({ message: 'Tipo de archivo no permitido' });
  }
  
  // Tamaño máximo: 10 MB
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return res.status(400).json({ message: 'Archivo muy grande (máx 10 MB)' });
  }
  
  // Normalizar nombre
  file.originalname = normalizeFilename(file.originalname);
  
  next();
};
```

**Estimación**: **2 horas**

---

## 📊 RESUMEN DE ESTIMACIONES {#resumen-estimaciones}

### Por Prioridad:

#### 🔴 CRÍTICO (13 funcionalidades)
| # | Funcionalidad | Estimación |
|---|---------------|------------|
| 1 | Sistema Multi-Rol | 2-3 días |
| 2 | Pantalla de Carga Completa | 3-4 días |
| 3 | Sistema de Semáforo | 2 días |
| 4 | Workflow de Aprobación | 3-4 días |
| 11 | Input Múltiples Patentes | 1-2h |
| 12 | Endpoint Búsqueda Masiva | 2-3h |
| 13 | ZIP Estructurado | 4-5h |
| 15 | Rol Dadores (Opción B) | 4-5h |
| 16 | Permisos Aprobación Dadores | 2-3h |
| 17 | Autofiltro DadorId | 3-4h |
| 21 | Rol TRANSPORTISTA | 2h |
| 22 | Middleware Transportista | 4h |
| 23 | Filtrado Equipos Transportista | 3-4h |
| **SUBTOTAL CRÍTICO** | **~18-20 días** |

#### 🟡 ALTA (11 funcionalidades)
| # | Funcionalidad | Estimación |
|---|---------------|------------|
| 5 | Versionado Documentos | 1-2 días |
| 6 | Portal Cliente | 2-3 días |
| 7 | Vista Previa Documentos | 2-3 días |
| 8 | Sistema Notificaciones | 2 días |
| 9 | Sistema Auditoría | 2 días |
| 18 | Búsqueda Patentes (Dador) | 3-4h |
| 19 | ZIP Dador | 2-3h |
| 24 | Filtrado Maestros (Transp) | 3-4h |
| 25 | Búsqueda Patentes (Transp) | 3h |
| 26 | ZIP Transportistas | 3-4h |
| 29 | Rate Limiting Diferenciado | 2h |
| 30 | Validación Archivos | 2h |
| **SUBTOTAL ALTA** | **~13-15 días** |

#### 🟢 MEDIA/BAJA (6 funcionalidades)
| # | Funcionalidad | Estimación |
|---|---------------|------------|
| 10 | Backup y Recovery | 2 días |
| 14 | Consulta Maestros (Cliente) | 2-3h |
| 20 | Portal Maestros (Dador) | 4-5h |
| 27 | Dashboard Mejorado (Transp) | 3h |
| **SUBTOTAL MEDIA/BAJA** | **~3-4 días** |

### **TOTAL ESTIMADO: 34-39 días hábiles (~7-8 semanas)**

---

## 🎯 PRIORIZACIÓN RECOMENDADA {#priorizacion}

### **FASE 1: Setup Base (Semanas 1-2)** 🔴
**Objetivo**: Infraestructura de roles y pantalla de carga

1. ✅ Sistema Multi-Rol (3 días)
2. ✅ Pantalla de Carga Completa (4 días)
3. ✅ Sistema de Semáforo (2 días)

**Duración**: 2 semanas (9 días)

---

### **FASE 2: Workflow Crítico (Semanas 3-4)** 🔴
**Objetivo**: Aprobación y versionado

4. ✅ Workflow de Aprobación (4 días)
5. ✅ Versionado de Documentos (2 días)
6. ✅ Sistema de Auditoría (2 días)

**Duración**: 2 semanas (8 días)

---

### **FASE 3: Portales - Parte 1 (Semanas 5-6)** 🔴
**Objetivo**: Portal de Cliente y Dador

7. ✅ Portal del Cliente (3 días)
8. ✅ Rol Dadores (Opción B) + Permisos + Autofiltro (2 días)
9. ✅ Búsqueda por Patentes (Cliente + Dador) (1 día)
10. ✅ ZIP Estructurado (Cliente + Dador) (2 días)

**Duración**: 2 semanas (8 días)

---

### **FASE 4: Portales - Parte 2 (Semanas 7-8)** 🔴
**Objetivo**: Portal de Transportistas

11. ✅ Rol TRANSPORTISTA + Middleware (1 día)
12. ✅ Filtrado Equipos y Maestros (Transp) (1 día)
13. ✅ Búsqueda por Patentes (Transp) (1 día)
14. ✅ ZIP Transportistas (1 día)
15. ✅ Dashboard Mejorado (1 día)

**Duración**: 2 semanas (5 días)

---

### **FASE 5: Funcionalidades Avanzadas (Semana 9)** 🟡
**Objetivo**: Vista previa y notificaciones

16. ✅ Vista Previa de Documentos (3 días)
17. ✅ Sistema de Notificaciones (2 días)

**Duración**: 1 semana (5 días)

---

### **FASE 6: Calidad y Seguridad (Semana 10)** 🟡🟢
**Objetivo**: Testing, seguridad y backup

18. ✅ Rate Limiting Diferenciado (0.5 días)
19. ✅ Validación de Archivos (0.5 días)
20. ✅ Política de Backup (2 días)
21. ✅ Consulta de Maestros (portales) (1 día)
22. ✅ Testing exhaustivo (1 día)

**Duración**: 1 semana (5 días)

---

## 📝 NOTAS FINALES

### Funcionalidades NO Incluidas (Post-MVP)
❌ **NO implementar en esta fase**:
- Dashboard de estadísticas con gráficos avanzados
- Reportes adicionales
- Integraciones externas (AFIP, ANSES, etc.)
- Historial de equipos por chofer
- Wizard de onboarding
- Permisos granulares adicionales
- Aplicación móvil nativa
- Firma digital de documentos

### Documentos Base
- `RESUMEN_SOLUCION_COMPROMISO.md` (2141 líneas)
- `ANALISIS_PORTAL_CLIENTE_PATENTES.md` (401 líneas)
- `ANALISIS_PORTAL_DADOR_CARGA.md` (653 líneas)
- `ANALISIS_PORTAL_TRANSPORTISTAS_CHOFERES.md` (655 líneas)
- `RESUMEN_EJECUTIVO_PATENTES.md` (338 líneas)
- `RESUMEN_EJECUTIVO_DADOR.md` (463 líneas)
- `RESUMEN_EJECUTIVO_TRANSPORTISTAS.md` (481 líneas)

### Métricas del Proyecto
- **Roles nuevos**: 6 (ADMIN_INTERNO, DADOR, TRANSPORTISTA, CHOFER, OPERADOR_INTERNO, CLIENTE)
- **Documentos obligatorios**: 19 (fijos)
- **Estados de equipo**: 6 (Verde, Amarillo, Rojo, Gris, Azul, Rojo+Azul)
- **Estados de documento**: 6 (No cargado, Pendiente, Aprobado, Rechazado, Vencido, Por vencer)
- **Portales**: 3 (Cliente, Dador, Transportistas/Choferes)
- **Endpoints nuevos**: ~30
- **Componentes React nuevos**: ~25
- **Servicios backend nuevos**: ~10

---

**Fecha de Generación**: 9 de Noviembre, 2025  
**Versión del Documento**: 1.0  
**Estado**: ✅ Completo y Listo para Implementación  
**Aprobado por**: _____________  
**Fecha de Aprobación**: _____________

---

## 📞 Contacto

Para dudas o aclaraciones sobre este listado:
- Revisar documentos base en el directorio del proyecto
- Consultar con el equipo de desarrollo
- Validar estimaciones con el equipo técnico

**¡El proyecto está listo para comenzar la implementación!** 🚀

