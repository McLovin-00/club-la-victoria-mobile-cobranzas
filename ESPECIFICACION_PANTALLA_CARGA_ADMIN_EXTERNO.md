# Especificación: Pantalla de Carga para Admin Externos

## 📋 Contexto

**Origen**: Replicar funcionalidad del formulario "QUEBRACHO BLANCO S.R.L. - BASE DE DATOS PROSIL S.A."

**Usuarios**: `admin_externo` y `operador_externo` (Fase 1 enfocada en `admin_externo`)

**Objetivo**: Permitir que empresas transportistas carguen su documentación de forma autónoma a través de una interfaz web moderna, sin depender de Google Forms.

---

## 👥 Nuevos Roles de Usuario

### Roles a Implementar

```typescript
enum UserRole {
  SUPERADMIN,
  ADMIN,
  ADMIN_INTERNO,      // ← Nuevo
  ADMIN_EXTERNO,      // ← Nuevo (Prioridad 1)
  OPERADOR_INTERNO,   // ← Nuevo
  OPERADOR_EXTERNO,   // ← Nuevo
  USER,
}
```

### Matriz de Permisos

| Acción | ADMIN_INTERNO | ADMIN_EXTERNO | OPERADOR_INTERNO | OPERADOR_EXTERNO |
|--------|---------------|---------------|------------------|------------------|
| **Acceso a Microservicio Documentos** | ✅ Total | ✅ Solo su empresa | ✅ Total | ✅ Solo su empresa |
| **Ver pantalla de carga** | ✅ | ✅ | ✅ | ✅ |
| **Cargar documentos propios** | ✅ | ✅ | ⬜ | ⬜ |
| **Editar documentos propios** | ✅ | ✅ | ⬜ | ⬜ |
| **Ver estado de documentos** | ✅ Todos | ✅ Propios | ✅ Todos | ✅ Propios |
| **Aprobar documentos** | ✅ | ❌ | ❌ | ❌ |
| **Rechazar documentos** | ✅ | ❌ | ❌ | ❌ |
| **Ver documentos de otras empresas** | ✅ | ❌ | ✅ Solo lectura | ❌ |
| **Descargar documentos propios** | ✅ | ✅ | ✅ | ✅ |
| **Eliminar documentos** | ✅ | ❌ | ❌ | ❌ |

---

## 🎨 Diseño de la Pantalla de Carga

### Layout General

```
┌─────────────────────────────────────────────────────────┐
│ 🏢 Portal de Carga - [NOMBRE EMPRESA TRANSPORTISTA]    │
│                                        [Usuario] [Salir] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 Progreso General                                     │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░ 23/30 campos (77%) │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  [1. Datos de la Empresa] ✅ Completo               │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  [2. Chofer] ⚠️  Falta 1 documento                  │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  [3. Unidades (Tractor + Semi)] ❌ Incompleto       │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [+ Agregar Nuevo Chofer]  [+ Agregar Nueva Unidad]     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Sección 1: Datos de la Empresa (Accordion Expandible)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🏢 DATOS DE LA EMPRESA TRANSPORTISTA           [▼]     ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                         ┃
┃  Empresa de Transporte *                                ┃
┃  ┌────────────────────────────────────────────┐        ┃
┃  │ [Pre-cargado del perfil]                   │        ┃
┃  └────────────────────────────────────────────┘        ┃
┃                                                         ┃
┃  CUIT *                                                 ┃
┃  ┌────────────────────────────────────────────┐        ┃
┃  │ [Pre-cargado del perfil]                   │        ┃
┃  └────────────────────────────────────────────┘        ┃
┃                                                         ┃
┃  ┌──────────────────────────────────────────────────┐  ┃
┃  │ 📄 Constancia de Inscripción en ARCA *          │  ┃
┃  │                                                  │  ┃
┃  │ [📎 Subir archivo] o [Arrastrar aquí]          │  ┃
┃  │                                                  │  ┃
┃  │ ✅ arca_constancia.pdf (1.2 MB)                │  ┃
┃  │    Subido: 05/11/2025 - Estado: Aprobado       │  ┃
┃  │    [👁️ Ver] [🔄 Reemplazar] [🗑️ Eliminar]      │  ┃
┃  └──────────────────────────────────────────────────┘  ┃
┃                                                         ┃
┃  ┌──────────────────────────────────────────────────┐  ┃
┃  │ 📄 Constancia Ingresos Brutos *                 │  ┃
┃  │ [📎 Subir archivo]                              │  ┃
┃  │ ⚠️  Pendiente                                    │  ┃
┃  └──────────────────────────────────────────────────┘  ┃
┃                                                         ┃
┃  ┌──────────────────────────────────────────────────┐  ┃
┃  │ 📄 Formulario 931 / Acuse y Constancia *        │  ┃
┃  │ [📎 Subir archivo]                              │  ┃
┃  └──────────────────────────────────────────────────┘  ┃
┃                                                         ┃
┃  ┌──────────────────────────────────────────────────┐  ┃
┃  │ 📄 Recibos de Sueldo *                          │  ┃
┃  │ [📎 Subir archivo]                              │  ┃
┃  └──────────────────────────────────────────────────┘  ┃
┃                                                         ┃
┃  ┌──────────────────────────────────────────────────┐  ┃
┃  │ 📄 Boleta Sindical *                            │  ┃
┃  │ [📎 Subir archivo]                              │  ┃
┃  └──────────────────────────────────────────────────┘  ┃
┃                                                         ┃
┃  [💾 Guardar Sección]                                   ┃
┃                                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Sección 2: Choferes (Multi-registro)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 👤 CHOFERES                                     [▼]     ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                         ┃
┃  ┌────────────────────────────────────────────────┐    ┃
┃  │ Chofer #1: JUAN PEREZ [✅ Completo]            │    ┃
┃  │ DNI: 12345678                         [✏️] [🗑️] │    ┃
┃  └────────────────────────────────────────────────┘    ┃
┃                                                         ┃
┃  ┌────────────────────────────────────────────────┐    ┃
┃  │ Chofer #2: MARIA GOMEZ [⚠️ Falta 1 doc]        │    ┃
┃  │ DNI: 87654321                         [✏️] [🗑️] │    ┃
┃  └────────────────────────────────────────────────┘    ┃
┃                                                         ┃
┃  [+ Agregar Nuevo Chofer]                               ┃
┃                                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

#### Modal de Edición de Chofer

```
┌─────────────────────────────────────────────────┐
│ Editar Chofer                            [❌]   │
├─────────────────────────────────────────────────┤
│                                                  │
│ Nombre Completo *                                │
│ ┌──────────────────────────────────────────────┐│
│ │ Juan Perez                                   ││
│ └──────────────────────────────────────────────┘│
│                                                  │
│ DNI *                                            │
│ ┌──────────────────────────────────────────────┐│
│ │ 12345678                                     ││
│ └──────────────────────────────────────────────┘│
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ 📄 Alta Temprana ARCA / Constancia *       │  │
│ │ ✅ alta_arca.pdf (856 KB)                  │  │
│ │ [Ver] [Reemplazar]                         │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ 📄 DNI (frente y dorso) *                  │  │
│ │ ✅ dni_frente_dorso.pdf (1.1 MB)           │  │
│ │ Vencimiento: 01/01/2030                    │  │
│ │ [Ver] [Reemplazar]                         │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ 📄 Licencia de Conducir (frente y dorso) * │  │
│ │ ✅ licencia.pdf (980 KB)                   │  │
│ │ Vencimiento: 15/06/2026                    │  │
│ │ [Ver] [Reemplazar]                         │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ 📄 Póliza A.R.T. con cláusula NO REP. *    │  │
│ │ ⚠️  Pendiente                               │  │
│ │ [Subir archivo]                            │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ 📄 Póliza Seguro de Vida Obligatorio *     │  │
│ │ ✅ seguro_vida.pdf (745 KB)                │  │
│ │ Vencimiento: 30/12/2025                    │  │
│ │ [Ver] [Reemplazar]                         │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│         [Cancelar]  [Guardar Cambios]            │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Sección 3: Unidades (Tractor + Semi)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🚛 UNIDADES (TRACTOR + SEMI)                    [▼]     ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                         ┃
┃  ┌────────────────────────────────────────────────┐    ┃
┃  │ Equipo #1                                      │    ┃
┃  │ Tractor: AB123CD  + Semi: XY789ZW              │    ┃
┃  │ Estado: ✅ Completo                    [✏️] [🗑️] │    ┃
┃  └────────────────────────────────────────────────┘    ┃
┃                                                         ┃
┃  ┌────────────────────────────────────────────────┐    ┃
┃  │ Equipo #2                                      │    ┃
┃  │ Tractor: EF456GH  + Semi: PQ234RS              │    ┃
┃  │ Estado: ⚠️ Falta RTO del Semi         [✏️] [🗑️] │    ┃
┃  └────────────────────────────────────────────────┘    ┃
┃                                                         ┃
┃  [+ Agregar Nueva Unidad]                               ┃
┃                                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

#### Modal de Edición de Unidad (Tabs: Tractor / Semi)

```
┌──────────────────────────────────────────────────────┐
│ Editar Unidad - Equipo #1                     [❌]   │
├──────────────────────────────────────────────────────┤
│                                                       │
│  [🚜 TRACTOR]  [🚛 SEMI]                              │
│  ───────────  ─────────                               │
│                                                       │
│  Patente *                                            │
│  ┌────────────────────────────────────────────────┐  │
│  │ AB123CD                                        │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ 📄 Título / Contrato de Alquiler Certificado * │  │
│  │ ✅ titulo_tractor.pdf (1.5 MB)                 │  │
│  │ [Ver] [Reemplazar]                             │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ 📄 Cédula *                                    │  │
│  │ ✅ cedula_tractor.pdf (890 KB)                 │  │
│  │ [Ver] [Reemplazar]                             │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ 📄 RTO - Revisión Técnica Obligatoria *       │  │
│  │ ✅ rto_tractor.pdf (720 KB)                    │  │
│  │ Vencimiento: 20/08/2026                        │  │
│  │ [Ver] [Reemplazar]                             │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ 📄 Póliza de Seguro con cláusula NO REP. *     │  │
│  │ ✅ poliza_tractor.pdf (1.2 MB)                 │  │
│  │ [Ver] [Reemplazar]                             │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ 📄 Certificado libre deuda + Comprobante *     │  │
│  │ ✅ seguro_pago_tractor.pdf (650 KB)            │  │
│  │ [Ver] [Reemplazar]                             │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│           [Cancelar]  [Guardar Cambios]               │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## 🔧 Funcionalidades Clave

### 1. **Gestión de Estado de Carga**

```typescript
type EstadoCarga = 'completo' | 'incompleto' | 'pendiente_aprobacion';

interface SeccionEstado {
  seccion: 'empresa' | 'chofer' | 'unidad';
  completitud: number; // 0-100
  documentosPendientes: string[];
  documentosAprobados: string[];
  documentosRechazados: string[];
}
```

### 2. **Validaciones en Tiempo Real**

- ✅ Validación de formato de CUIT
- ✅ Validación de formato de patentes (normalización)
- ✅ Validación de DNI (longitud, formato)
- ✅ Validación de archivos (tamaño máx: 10 MB, formatos: PDF, JPG, PNG)
- ✅ Validación de fechas de vencimiento (alertas si vence en < 30 días)
- ⚠️ Advertencias de campos obligatorios faltantes

### 3. **Indicadores Visuales**

```typescript
// Estados de documentos
✅ Aprobado (verde)
⏳ En revisión (amarillo)
❌ Rechazado (rojo)
⚠️ Por vencer (naranja - < 30 días)
🔴 Vencido (rojo)
⬜ Pendiente de carga (gris)
```

### 4. **Notificaciones**

- 📧 Email al completar carga inicial
- 📧 Email cuando un documento es aprobado/rechazado
- 📧 Alertas de vencimientos próximos (30, 15, 7 días antes)
- 🔔 Notificaciones en la plataforma

### 5. **Historial de Cambios**

```
┌─────────────────────────────────────────────────┐
│ Historial de Cambios - DNI Juan Perez           │
├─────────────────────────────────────────────────┤
│ 05/11/2025 10:30 - Subido por admin_externo     │
│ 05/11/2025 14:45 - Aprobado por admin_interno   │
│ 06/11/2025 09:15 - Reemplazado por admin_ext... │
│ 06/11/2025 16:20 - En revisión                  │
└─────────────────────────────────────────────────┘
```

---

## 🏗️ Arquitectura Técnica

### Frontend: Componentes React

```
apps/frontend/src/features/carga-externa/
├── pages/
│   └── CargaExternaPage.tsx              // Página principal
├── components/
│   ├── SeccionEmpresa.tsx                // Acordeón datos empresa
│   ├── SeccionChoferes.tsx               // Lista de choferes
│   ├── SeccionUnidades.tsx               // Lista de unidades
│   ├── ModalChofer.tsx                   // Modal edición chofer
│   ├── ModalUnidad.tsx                   // Modal edición unidad
│   ├── DocumentUploader.tsx              // Componente subida archivo
│   ├── DocumentCard.tsx                  // Card estado documento
│   ├── ProgressIndicator.tsx             // Barra progreso
│   └── DatePicker.tsx                    // Selector de fechas
├── hooks/
│   ├── useCargaEmpresa.ts               // Hook datos empresa
│   ├── useCargaChoferes.ts              // Hook choferes
│   ├── useCargaUnidades.ts              // Hook unidades
│   └── useDocumentUpload.ts             // Hook subida docs
└── types/
    └── carga-externa.types.ts           // Types TypeScript
```

### Backend: Endpoints Nuevos

```typescript
// apps/documentos/src/routes/carga-externa.routes.ts

// EMPRESA
GET    /api/docs/carga-externa/empresa           // Obtener datos empresa
POST   /api/docs/carga-externa/empresa/documentos // Subir doc empresa
DELETE /api/docs/carga-externa/empresa/documentos/:id // Eliminar doc

// CHOFERES
GET    /api/docs/carga-externa/choferes          // Listar choferes
POST   /api/docs/carga-externa/choferes          // Crear chofer
PUT    /api/docs/carga-externa/choferes/:id      // Actualizar chofer
DELETE /api/docs/carga-externa/choferes/:id      // Eliminar chofer
POST   /api/docs/carga-externa/choferes/:id/documentos // Subir doc chofer
DELETE /api/docs/carga-externa/choferes/:id/documentos/:docId // Eliminar

// UNIDADES
GET    /api/docs/carga-externa/unidades          // Listar unidades
POST   /api/docs/carga-externa/unidades          // Crear unidad (tractor+semi)
PUT    /api/docs/carga-externa/unidades/:id      // Actualizar unidad
DELETE /api/docs/carga-externa/unidades/:id      // Eliminar unidad
POST   /api/docs/carga-externa/unidades/:id/tractor/documentos // Doc tractor
POST   /api/docs/carga-externa/unidades/:id/semi/documentos // Doc semi
DELETE /api/docs/carga-externa/unidades/:id/documentos/:docId // Eliminar

// RESUMEN
GET    /api/docs/carga-externa/resumen           // Estado general de carga
GET    /api/docs/carga-externa/historial/:docId  // Historial de un documento
```

### Middleware de Autorización

```typescript
// apps/documentos/src/middlewares/external-auth.middleware.ts

export const authorizeExternalAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  
  // Verificar rol
  if (![UserRole.ADMIN_EXTERNO, UserRole.ADMIN_INTERNO, UserRole.ADMIN, UserRole.SUPERADMIN].includes(user.role)) {
    return res.status(403).json({ 
      message: 'No tienes permisos para acceder a esta funcionalidad' 
    });
  }
  
  // Si es admin externo, resolver su empresaTransportistaId
  if (user.role === UserRole.ADMIN_EXTERNO) {
    const empresaId = user.metadata?.empresaTransportistaId;
    
    if (!empresaId) {
      return res.status(400).json({ 
        message: 'Usuario externo sin empresa asignada' 
      });
    }
    
    req.empresaTransportistaId = empresaId;
    
    // Scope: solo puede acceder a su propia empresa
    req.scopeFilter = { empresaTransportistaId: empresaId };
  }
  
  next();
};
```

### Modelo de Datos

```prisma
// apps/documentos/src/prisma/schema.prisma

// Agregar a User
model User {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  role        UserRole
  metadata    Json?    // { empresaTransportistaId: number }
  // ... otros campos
}

enum UserRole {
  SUPERADMIN
  ADMIN
  ADMIN_INTERNO
  ADMIN_EXTERNO
  OPERADOR_INTERNO
  OPERADOR_EXTERNO
  USER
}

// Tabla para tracking de estado de carga
model CargaExternaEstado {
  id                      Int      @id @default(autoincrement())
  empresaTransportistaId  Int
  seccion                 String   // 'empresa' | 'chofer' | 'unidad'
  entityId                Int?     // ID del chofer o unidad si aplica
  completitud             Int      // 0-100
  documentosPendientes    Int
  documentosAprobados     Int
  documentosRechazados    Int
  updatedAt               DateTime @updatedAt
  
  @@unique([empresaTransportistaId, seccion, entityId])
  @@index([empresaTransportistaId])
}

// Tabla para historial de documentos
model DocumentHistorial {
  id         Int      @id @default(autoincrement())
  documentId Int
  accion     String   // 'subido' | 'aprobado' | 'rechazado' | 'reemplazado' | 'eliminado'
  userId     Int
  motivo     String?  // Razón de rechazo
  createdAt  DateTime @default(now())
  
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id])
  
  @@index([documentId])
}
```

---

## 🚀 Plan de Implementación

### Fase 1: Setup y Roles (2-3 días)

**Backend:**
1. ✅ Agregar nuevos roles a enum UserRole
2. ✅ Migración de base de datos
3. ✅ Crear middleware `authorizeExternalAdmin`
4. ✅ Crear modelo `CargaExternaEstado`
5. ✅ Crear modelo `DocumentHistorial`
6. ✅ Script para asignar empresaTransportistaId a usuarios

**Frontend:**
1. ✅ Actualizar types de roles
2. ✅ Actualizar guards de rutas
3. ✅ Crear layout base de CargaExternaPage

**Testing:**
1. ✅ Tests unitarios de middleware
2. ✅ Tests de permisos por rol

---

### Fase 2: Sección Empresa (2-3 días)

**Backend:**
1. ✅ Endpoint GET /empresa
2. ✅ Endpoint POST /empresa/documentos
3. ✅ Endpoint DELETE /empresa/documentos/:id
4. ✅ Validaciones de archivos

**Frontend:**
1. ✅ Componente `SeccionEmpresa`
2. ✅ Componente `DocumentUploader`
3. ✅ Componente `DocumentCard`
4. ✅ Hook `useCargaEmpresa`

**Testing:**
1. ✅ Tests de endpoints
2. ✅ Tests de componentes
3. ✅ Test E2E: cargar documento de empresa

---

### Fase 3: Sección Choferes (3-4 días)

**Backend:**
1. ✅ CRUD completo de choferes
2. ✅ Endpoints de documentos por chofer
3. ✅ Cálculo de completitud
4. ✅ Validaciones de DNI y fechas

**Frontend:**
1. ✅ Componente `SeccionChoferes`
2. ✅ Componente `ModalChofer`
3. ✅ Hook `useCargaChoferes`
4. ✅ Validaciones de formulario

**Testing:**
1. ✅ Tests de CRUD choferes
2. ✅ Tests de carga de documentos
3. ✅ Test E2E: flujo completo chofer

---

### Fase 4: Sección Unidades (3-4 días)

**Backend:**
1. ✅ CRUD completo de unidades (tractor + semi)
2. ✅ Endpoints de documentos por unidad
3. ✅ Normalización de patentes
4. ✅ Creación de equipos automática

**Frontend:**
1. ✅ Componente `SeccionUnidades`
2. ✅ Componente `ModalUnidad` (con tabs)
3. ✅ Hook `useCargaUnidades`
4. ✅ Validación de patentes

**Testing:**
1. ✅ Tests de CRUD unidades
2. ✅ Tests de normalización patentes
3. ✅ Test E2E: flujo completo unidad

---

### Fase 5: Dashboard y Resumen (2 días)

**Backend:**
1. ✅ Endpoint GET /resumen (estado general)
2. ✅ Endpoint GET /historial/:docId
3. ✅ Servicio de cálculo de completitud

**Frontend:**
1. ✅ Componente `ProgressIndicator`
2. ✅ Dashboard de estado general
3. ✅ Modal de historial de cambios

**Testing:**
1. ✅ Tests de cálculos de completitud
2. ✅ Test E2E: flujo completo end-to-end

---

### Fase 6: Notificaciones y Pulido (2 días)

**Backend:**
1. ✅ Integración con servicio de notificaciones
2. ✅ Emails de alertas de vencimiento
3. ✅ Webhook para aprobaciones/rechazos

**Frontend:**
1. ✅ Mejoras UI/UX
2. ✅ Mensajes de éxito/error
3. ✅ Loading states y skeletons
4. ✅ Responsive design

**Testing:**
1. ✅ Tests de integración completos
2. ✅ Testing de carga (performance)
3. ✅ Testing de seguridad

---

## 📊 Estimación Total

| Fase | Duración | Complejidad |
|------|----------|-------------|
| Fase 1: Setup y Roles | 2-3 días | Media |
| Fase 2: Sección Empresa | 2-3 días | Media |
| Fase 3: Sección Choferes | 3-4 días | Alta |
| Fase 4: Sección Unidades | 3-4 días | Alta |
| Fase 5: Dashboard | 2 días | Media |
| Fase 6: Notificaciones | 2 días | Media |
| **TOTAL** | **14-18 días** | |

**Recursos**: 1 desarrollador full-stack

---

## 🔒 Consideraciones de Seguridad

### 1. Autenticación y Autorización
- ✅ JWT con expiración corta (1h)
- ✅ Refresh tokens
- ✅ Rate limiting: max 100 req/min por usuario
- ✅ Validación estricta de permisos en cada endpoint
- ✅ Logs de auditoría de todas las acciones

### 2. Validación de Archivos
- ✅ Tamaño máximo: 10 MB por archivo
- ✅ Formatos permitidos: PDF, JPG, PNG
- ✅ Escaneo de virus (ClamAV)
- ✅ Nombres de archivo sanitizados
- ✅ Almacenamiento en ubicaciones seguras

### 3. Protección de Datos
- ✅ Cifrado en tránsito (HTTPS)
- ✅ Cifrado en reposo (archivos sensibles)
- ✅ No exponer paths absolutos al frontend
- ✅ URLs firmadas para descarga de documentos
- ✅ TTL en URLs de descarga (1h)

### 4. Control de Acceso
```typescript
// Verificación doble: rol + ownership
const canAccess = (user, resource) => {
  // Admin interno/super: acceso total
  if ([UserRole.ADMIN_INTERNO, UserRole.ADMIN, UserRole.SUPERADMIN].includes(user.role)) {
    return true;
  }
  
  // Admin externo: solo su empresa
  if (user.role === UserRole.ADMIN_EXTERNO) {
    return resource.empresaTransportistaId === user.metadata?.empresaTransportistaId;
  }
  
  return false;
};
```

---

## 📱 Responsividad

### Desktop (> 1024px)
- Layout de 2 columnas para modales
- Tablas completas
- Máximo ancho: 1400px

### Tablet (768px - 1024px)
- Layout de 1 columna
- Tablas responsive (scroll horizontal)
- Accordions por defecto cerrados

### Mobile (< 768px)
- Stack vertical completo
- Cards en lugar de tablas
- Botones de acción como menú dropdown
- Upload drag-and-drop reemplazado por botón

---

## 🎯 Métricas de Éxito

### KPIs Técnicos
- ⚡ Tiempo de carga inicial < 2s
- ⚡ Tiempo de subida de documento < 5s (archivo 5MB)
- ⚡ 99.9% uptime
- ⚡ < 1% error rate

### KPIs de Negocio
- 📊 % de empresas que completan carga inicial (target: > 80%)
- 📊 Tiempo promedio para completar carga (target: < 30 min)
- 📊 % de documentos aprobados en primera revisión (target: > 70%)
- 📊 Reducción de emails/llamadas de soporte (target: -50%)

---

## 🔄 Próximos Pasos Después del MVP

### Mejoras Futuras (Post-Launch)
1. **Carga Masiva CSV**: Importar múltiples choferes/unidades
2. **Integración con APIs externas**: Validación automática de CUIT, DNI
3. **Firma Digital**: Documentos con firma electrónica
4. **App Mobile**: Versión nativa iOS/Android
5. **Chatbot**: Asistencia automática para completar formulario
6. **Analytics Dashboard**: Métricas de uso para admins internos
7. **Integración WhatsApp**: Carga de documentos por WhatsApp
8. **Recordatorios automáticos**: SMS/WhatsApp para docs por vencer

---

**Fecha de Creación**: 7 de Noviembre, 2025  
**Versión del Documento**: 1.0  
**Autor**: Análisis basado en formulario BCA  
**Estado**: ✅ Especificación Completa - Listo para Desarrollo

