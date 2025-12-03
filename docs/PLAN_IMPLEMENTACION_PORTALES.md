# Plan de Implementación: Sistema de Portales Multi-Rol

## Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Fase 0: Edición de Equipos Existentes](#fase-0-edición-de-equipos-existentes)
3. [Fase 1: Sistema de Roles y Permisos](#fase-1-sistema-de-roles-y-permisos)
4. [Fase 2: Portal Cliente (Solo Lectura)](#fase-2-portal-cliente-solo-lectura)
5. [Fase 3: Separación Dador/Transportista](#fase-3-separación-dadortransportista)
6. [Fase 4: Flujo de Aprobación con Rechazos](#fase-4-flujo-de-aprobación-con-rechazos)
7. [Fase 5: Dashboards Diferenciados](#fase-5-dashboards-diferenciados)
8. [Pruebas](#pruebas)
9. [Despliegue](#despliegue)

---

## Resumen Ejecutivo

### Objetivo
Implementar un sistema de portales diferenciados por rol que permita:
- **Cliente**: Consultar y descargar documentación de equipos asignados
- **Dador de Carga**: Gestionar equipos, aprobar documentos, monitorear compliance
- **Empresa Transportista**: Cargar documentación, editar equipos propios (sin aprobar)
- **Admin Interno**: Control total del sistema

### Arquitectura
- Un solo portal con rutas y vistas diferenciadas por rol
- URL base: `https://portal.bca.com/`
- Redirección automática según rol después del login

### Stack Tecnológico
- **Frontend**: React 18 + TypeScript + TailwindCSS
- **Backend**: Node.js + Express + Prisma
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT con RS256

---

## Fase 0: Edición de Equipos Existentes

### Duración Estimada: 2-3 semanas

---

### 0.1 Base de Datos

#### 0.1.1 Crear tabla de auditoría de cambios

**Archivo**: `apps/documentos/prisma/schema.prisma`

```prisma
model EquipoAuditLog {
  id              Int      @id @default(autoincrement())
  equipoId        Int
  usuarioId       Int
  accion          String   // 'CREAR', 'EDITAR', 'ELIMINAR', 'TRANSFERIR'
  campoModificado String?  // 'chofer', 'camion', 'acoplado', 'empresa', 'cliente', 'dadorCarga'
  valorAnterior   String?  // JSON stringificado
  valorNuevo      String?  // JSON stringificado
  motivo          String?  // Opcional, para transferencias
  createdAt       DateTime @default(now())
  
  equipo          Equipo   @relation(fields: [equipoId], references: [id])
  usuario         Usuario  @relation(fields: [usuarioId], references: [id])
  
  @@index([equipoId])
  @@index([usuarioId])
  @@index([createdAt])
}
```

**Migración**:
```bash
npx prisma migrate dev --name add_equipo_audit_log
```

#### 0.1.2 Agregar campo `archived` a documentos

**Archivo**: `apps/documentos/prisma/schema.prisma`

Modificar modelo `Document`:
```prisma
model Document {
  // ... campos existentes ...
  archived      Boolean  @default(false)
  archivedAt    DateTime?
  archivedBy    Int?     // usuarioId que archivó
  archiveReason String?  // 'CLIENTE_REMOVIDO', 'ENTIDAD_CAMBIADA', etc.
}
```

**Migración**:
```bash
npx prisma migrate dev --name add_document_archive_fields
```

#### 0.1.3 Índices adicionales para performance

```sql
CREATE INDEX idx_documents_archived ON documents(archived) WHERE archived = false;
CREATE INDEX idx_documents_entity_archived ON documents(entity_type, entity_id, archived);
```

---

### 0.2 Backend - Endpoints

#### 0.2.1 PUT `/api/equipos/:id` - Actualizar equipo

**Archivo**: `apps/documentos/src/controllers/equipos.controller.ts`

**Funcionalidad**:
- Validar que el usuario tiene permiso (dador de carga dueño o admin interno)
- Validar cambios de entidad (chofer, camión, acoplado, empresa)
- Verificar documentos existentes para nuevas entidades
- Si faltan documentos, rechazar con lista de faltantes
- Registrar en auditoría cada cambio
- Retornar equipo actualizado

**Request Body**:
```typescript
interface UpdateEquipoRequest {
  choferId?: number;
  camionId?: number;
  acopladoId?: number;
  empresaTransportistaId?: number;
  documentosNuevos?: Array<{
    templateId: number;
    entityType: 'CHOFER' | 'CAMION' | 'ACOPLADO' | 'EMPRESA_TRANSPORTISTA';
    entityId: number;
    file: Express.Multer.File;
    expiresAt?: string;
  }>;
}
```

**Response**:
```typescript
interface UpdateEquipoResponse {
  success: boolean;
  equipo?: Equipo;
  documentosPendientes?: Array<{
    documentId: number;
    status: 'PENDIENTE';
  }>;
  error?: string;
  documentosFaltantes?: Array<{
    templateId: number;
    templateName: string;
    entityType: string;
    entityId: number;
  }>;
}
```

**Validaciones**:
1. Usuario autenticado
2. Usuario es dador de carga del equipo O admin interno
3. Si cambia entidad, verificar que:
   - La nueva entidad existe
   - La nueva entidad pertenece al mismo dador de carga (o es nueva)
   - Los documentos requeridos están vigentes O se incluyen en `documentosNuevos`
4. Si agrega cliente, verificar requisitos adicionales

**Subtareas**:
- [ ] 0.2.1.1 Crear archivo `equipos.controller.ts` si no existe
- [ ] 0.2.1.2 Implementar función `updateEquipo`
- [ ] 0.2.1.3 Implementar validación de permisos
- [ ] 0.2.1.4 Implementar validación de documentos existentes
- [ ] 0.2.1.5 Implementar lógica de actualización de entidades
- [ ] 0.2.1.6 Implementar registro de auditoría
- [ ] 0.2.1.7 Agregar ruta en `equipos.routes.ts`

#### 0.2.2 POST `/api/equipos/:id/clientes` - Agregar cliente

**Archivo**: `apps/documentos/src/controllers/equipos.controller.ts`

**Request Body**:
```typescript
interface AddClienteRequest {
  clienteId: number;
  documentosNuevos?: Array<{
    templateId: number;
    entityType: string;
    entityId: number;
    file: Express.Multer.File;
    expiresAt?: string;
  }>;
}
```

**Validaciones**:
1. Cliente existe
2. Cliente no está ya vinculado al equipo
3. Todos los requisitos del nuevo cliente están cubiertos (docs vigentes o nuevos)

**Subtareas**:
- [ ] 0.2.2.1 Implementar función `addClienteToEquipo`
- [ ] 0.2.2.2 Obtener requisitos del cliente (`ClienteRequisitoDocumento`)
- [ ] 0.2.2.3 Verificar documentos existentes vs requeridos
- [ ] 0.2.2.4 Si faltan docs y no se proveen, rechazar con lista
- [ ] 0.2.2.5 Crear relación `EquipoCliente`
- [ ] 0.2.2.6 Registrar en auditoría
- [ ] 0.2.2.7 Agregar ruta

#### 0.2.3 DELETE `/api/equipos/:id/clientes/:clienteId` - Quitar cliente

**Archivo**: `apps/documentos/src/controllers/equipos.controller.ts`

**Validaciones**:
1. Cliente está vinculado al equipo
2. No es el último cliente (mínimo 1 debe quedar)

**Lógica de archivado**:
1. Obtener documentos que son requisito SOLO de este cliente
2. Marcar esos documentos como `archived = true`
3. Registrar `archiveReason = 'CLIENTE_REMOVIDO'`

**Subtareas**:
- [ ] 0.2.3.1 Implementar función `removeClienteFromEquipo`
- [ ] 0.2.3.2 Validar que queda al menos 1 cliente
- [ ] 0.2.3.3 Identificar documentos exclusivos del cliente removido
- [ ] 0.2.3.4 Archivar documentos (no eliminar)
- [ ] 0.2.3.5 Eliminar relación `EquipoCliente`
- [ ] 0.2.3.6 Registrar en auditoría
- [ ] 0.2.3.7 Agregar ruta

#### 0.2.4 POST `/api/equipos/:id/transferir` - Transferir dador de carga (solo admin)

**Archivo**: `apps/documentos/src/controllers/equipos.controller.ts`

**Request Body**:
```typescript
interface TransferirEquipoRequest {
  nuevoDadorCargaId: number;
}
```

**Validaciones**:
1. Usuario es admin interno
2. Nuevo dador de carga existe
3. Nuevo dador de carga es diferente al actual

**Lógica**:
1. Actualizar `equipo.dadorCargaId` (o campo equivalente)
2. Mantener todos los clientes
3. Mantener todos los documentos
4. Registrar en auditoría con detalle completo

**Subtareas**:
- [ ] 0.2.4.1 Implementar función `transferirEquipo`
- [ ] 0.2.4.2 Verificar rol admin interno
- [ ] 0.2.4.3 Actualizar dador de carga
- [ ] 0.2.4.4 Registrar auditoría detallada
- [ ] 0.2.4.5 Agregar ruta con middleware de admin

#### 0.2.5 GET `/api/equipos/:id/requisitos` - Obtener requisitos consolidados

**Archivo**: `apps/documentos/src/controllers/equipos.controller.ts`

**Response**:
```typescript
interface RequisitosEquipoResponse {
  requisitos: Array<{
    templateId: number;
    templateName: string;
    entityType: 'EMPRESA_TRANSPORTISTA' | 'CHOFER' | 'CAMION' | 'ACOPLADO';
    requeridoPor: Array<{ clienteId: number; clienteName: string }>;
    documentoActual?: {
      id: number;
      status: string;
      expiresAt: string;
      estado: 'VIGENTE' | 'PROXIMO_VENCER' | 'VENCIDO' | 'FALTANTE';
    };
  }>;
}
```

**Subtareas**:
- [ ] 0.2.5.1 Implementar función `getRequisitosEquipo`
- [ ] 0.2.5.2 Obtener todos los clientes del equipo
- [ ] 0.2.5.3 Consolidar requisitos de todos los clientes (sin duplicar)
- [ ] 0.2.5.4 Para cada requisito, buscar documento actual
- [ ] 0.2.5.5 Calcular estado del documento
- [ ] 0.2.5.6 Agregar ruta

---

### 0.3 Backend - Servicios

#### 0.3.1 Servicio de Auditoría

**Archivo**: `apps/documentos/src/services/audit.service.ts`

```typescript
class AuditService {
  static async logEquipoChange(params: {
    equipoId: number;
    usuarioId: number;
    accion: 'CREAR' | 'EDITAR' | 'ELIMINAR' | 'TRANSFERIR';
    campoModificado?: string;
    valorAnterior?: any;
    valorNuevo?: any;
    motivo?: string;
  }): Promise<void>;
  
  static async getEquipoHistory(equipoId: number): Promise<EquipoAuditLog[]>;
}
```

**Subtareas**:
- [ ] 0.3.1.1 Crear archivo `audit.service.ts`
- [ ] 0.3.1.2 Implementar `logEquipoChange`
- [ ] 0.3.1.3 Implementar `getEquipoHistory`
- [ ] 0.3.1.4 Agregar serialización JSON para valores complejos

#### 0.3.2 Servicio de Documentos Archivados

**Archivo**: `apps/documentos/src/services/document-archive.service.ts`

```typescript
class DocumentArchiveService {
  static async archiveDocuments(params: {
    documentIds: number[];
    reason: 'CLIENTE_REMOVIDO' | 'ENTIDAD_CAMBIADA' | 'MANUAL';
    userId: number;
  }): Promise<void>;
  
  static async restoreDocuments(params: {
    entityType: string;
    entityId: number;
    templateIds: number[];
  }): Promise<Document[]>;
  
  static async getArchivedDocuments(params: {
    entityType: string;
    entityId: number;
  }): Promise<Document[]>;
}
```

**Subtareas**:
- [ ] 0.3.2.1 Crear archivo `document-archive.service.ts`
- [ ] 0.3.2.2 Implementar `archiveDocuments`
- [ ] 0.3.2.3 Implementar `restoreDocuments`
- [ ] 0.3.2.4 Implementar `getArchivedDocuments`
- [ ] 0.3.2.5 Modificar queries existentes para excluir archivados por defecto

#### 0.3.3 Servicio de Validación de Requisitos

**Archivo**: `apps/documentos/src/services/requisitos-validation.service.ts`

```typescript
class RequisitosValidationService {
  static async validateEquipoCompliance(params: {
    equipoId: number;
    cambios?: {
      choferId?: number;
      camionId?: number;
      acopladoId?: number;
      empresaTransportistaId?: number;
      clientesAgregar?: number[];
      clientesQuitar?: number[];
    };
    documentosNuevos?: Array<{
      templateId: number;
      entityType: string;
      entityId: number;
    }>;
  }): Promise<{
    valid: boolean;
    faltantes: Array<{
      templateId: number;
      templateName: string;
      entityType: string;
      entityId: number;
      entityName: string;
    }>;
  }>;
}
```

**Subtareas**:
- [ ] 0.3.3.1 Crear archivo `requisitos-validation.service.ts`
- [ ] 0.3.3.2 Implementar lógica de consolidación de requisitos
- [ ] 0.3.3.3 Implementar verificación de documentos existentes
- [ ] 0.3.3.4 Implementar verificación de documentos nuevos (pendientes)
- [ ] 0.3.3.5 Retornar lista detallada de faltantes

---

### 0.4 Frontend - Componentes

#### 0.4.1 Página de Edición de Equipo

**Archivo**: `apps/frontend/src/features/equipos/pages/EditarEquipoPage.tsx`

**Estructura**:
```
EditarEquipoPage
├── Header (título, botón cancelar/guardar)
├── SeccionEntidades
│   ├── SelectorEntidad (Empresa Transportista)
│   ├── SelectorEntidad (Chofer)
│   ├── SelectorEntidad (Camión)
│   └── SelectorEntidad (Acoplado)
├── SeccionClientes
│   ├── ListaClientes (con botón quitar)
│   └── BotonAgregarCliente
├── SeccionDocumentos
│   ├── GrupoDocumentos (por entidad)
│   │   ├── DocumentoItem (existente, vigente)
│   │   ├── DocumentoItem (existente, por vencer)
│   │   ├── DocumentoItem (existente, vencido)
│   │   └── DocumentoItem (faltante, con upload)
│   └── SeccionNuevosRequisitos (si se agregó cliente)
├── SeccionAdminInterno (condicional)
│   └── SelectorDadorCarga + BotonTransferir
└── Footer (mensajes de error, botón guardar)
```

**Subtareas**:
- [ ] 0.4.1.1 Crear archivo `EditarEquipoPage.tsx`
- [ ] 0.4.1.2 Implementar carga de datos del equipo
- [ ] 0.4.1.3 Implementar estado local para cambios
- [ ] 0.4.1.4 Implementar componente `SelectorEntidad`
- [ ] 0.4.1.5 Implementar componente `ListaClientes`
- [ ] 0.4.1.6 Implementar componente `GrupoDocumentos`
- [ ] 0.4.1.7 Implementar componente `DocumentoItem`
- [ ] 0.4.1.8 Implementar lógica de validación
- [ ] 0.4.1.9 Implementar botón guardar (deshabilitado si faltan docs)
- [ ] 0.4.1.10 Implementar llamada API para guardar
- [ ] 0.4.1.11 Agregar ruta en router

#### 0.4.2 Componente SelectorEntidad

**Archivo**: `apps/frontend/src/features/equipos/components/SelectorEntidad.tsx`

**Props**:
```typescript
interface SelectorEntidadProps {
  entityType: 'CHOFER' | 'CAMION' | 'ACOPLADO' | 'EMPRESA_TRANSPORTISTA';
  currentEntityId: number;
  dadorCargaId: number;
  onChange: (newEntityId: number) => void;
  disabled?: boolean;
}
```

**Funcionalidad**:
- Mostrar entidad actual con nombre/identificador
- Dropdown con entidades disponibles del mismo dador de carga
- Al cambiar, disparar verificación de documentos
- Mostrar indicador si la nueva entidad tiene docs completos

**Subtareas**:
- [ ] 0.4.2.1 Crear archivo `SelectorEntidad.tsx`
- [ ] 0.4.2.2 Implementar fetch de entidades disponibles
- [ ] 0.4.2.3 Implementar dropdown con búsqueda
- [ ] 0.4.2.4 Mostrar estado de documentos de cada opción
- [ ] 0.4.2.5 Emitir evento onChange

#### 0.4.3 Componente GrupoDocumentos

**Archivo**: `apps/frontend/src/features/equipos/components/GrupoDocumentos.tsx`

**Props**:
```typescript
interface GrupoDocumentosProps {
  entityType: string;
  entityId: number;
  entityName: string;
  requisitos: Array<{
    templateId: number;
    templateName: string;
    documentoActual?: {
      id: number;
      status: string;
      expiresAt: string;
      estado: string;
    };
    requeridoPor: Array<{ clienteId: number; clienteName: string }>;
  }>;
  onUpload: (templateId: number, file: File, expiresAt?: string) => void;
  archivosSubidos: Record<number, File>;
}
```

**Funcionalidad**:
- Agrupar documentos por entidad
- Mostrar estado de cada documento (vigente/vencido/faltante)
- Input de archivo para documentos faltantes o a reemplazar
- Indicador visual de documentos ya seleccionados para subir

**Subtareas**:
- [ ] 0.4.3.1 Crear archivo `GrupoDocumentos.tsx`
- [ ] 0.4.3.2 Implementar layout de grupo
- [ ] 0.4.3.3 Implementar componente `DocumentoItem`
- [ ] 0.4.3.4 Implementar input de archivo con drag & drop
- [ ] 0.4.3.5 Mostrar preview de archivos seleccionados
- [ ] 0.4.3.6 Implementar selector de fecha de vencimiento

#### 0.4.4 Componente ListaClientes

**Archivo**: `apps/frontend/src/features/equipos/components/ListaClientes.tsx`

**Props**:
```typescript
interface ListaClientesProps {
  clientes: Array<{ id: number; nombre: string }>;
  onRemove: (clienteId: number) => void;
  onAdd: (clienteId: number) => void;
  clientesDisponibles: Array<{ id: number; nombre: string }>;
  minClientes?: number; // default 1
}
```

**Funcionalidad**:
- Listar clientes actuales
- Botón "Quitar" (deshabilitado si es el último)
- Botón "Agregar cliente" que abre modal de selección
- Mostrar advertencia de nuevos requisitos al agregar

**Subtareas**:
- [ ] 0.4.4.1 Crear archivo `ListaClientes.tsx`
- [ ] 0.4.4.2 Implementar lista de clientes con botón quitar
- [ ] 0.4.4.3 Deshabilitar quitar si es el último
- [ ] 0.4.4.4 Implementar modal de agregar cliente
- [ ] 0.4.4.5 Mostrar requisitos del cliente a agregar
- [ ] 0.4.4.6 Confirmar agregado solo si usuario acepta

#### 0.4.5 Hook useEquipoEdit

**Archivo**: `apps/frontend/src/features/equipos/hooks/useEquipoEdit.ts`

```typescript
interface UseEquipoEditReturn {
  equipo: Equipo | null;
  loading: boolean;
  error: string | null;
  
  // Estado de edición
  cambios: {
    choferId?: number;
    camionId?: number;
    acopladoId?: number;
    empresaTransportistaId?: number;
    clientesAgregar: number[];
    clientesQuitar: number[];
  };
  archivosNuevos: Map<string, { file: File; expiresAt?: string }>; // key: `${entityType}-${entityId}-${templateId}`
  
  // Validación
  requisitosConsolidados: Requisito[];
  documentosFaltantes: DocumentoFaltante[];
  puedeGuardar: boolean;
  
  // Acciones
  cambiarEntidad: (tipo: string, nuevoId: number) => void;
  agregarCliente: (clienteId: number) => void;
  quitarCliente: (clienteId: number) => void;
  agregarArchivo: (templateId: number, entityType: string, entityId: number, file: File, expiresAt?: string) => void;
  quitarArchivo: (templateId: number, entityType: string, entityId: number) => void;
  guardar: () => Promise<boolean>;
  resetear: () => void;
}

function useEquipoEdit(equipoId: number): UseEquipoEditReturn;
```

**Subtareas**:
- [ ] 0.4.5.1 Crear archivo `useEquipoEdit.ts`
- [ ] 0.4.5.2 Implementar carga inicial del equipo
- [ ] 0.4.5.3 Implementar estado de cambios
- [ ] 0.4.5.4 Implementar cálculo dinámico de requisitos
- [ ] 0.4.5.5 Implementar validación de documentos faltantes
- [ ] 0.4.5.6 Implementar función guardar con FormData
- [ ] 0.4.5.7 Manejar respuesta y errores

---

### 0.5 Frontend - Integración

#### 0.5.1 Agregar botón "Editar" en listado de equipos

**Archivo**: `apps/frontend/src/features/equipos/pages/EquiposPage.tsx`

**Subtareas**:
- [ ] 0.5.1.1 Agregar columna de acciones en tabla
- [ ] 0.5.1.2 Agregar botón "Editar" que navega a `/equipos/:id/editar`
- [ ] 0.5.1.3 Mostrar botón solo si usuario tiene permiso

#### 0.5.2 Agregar ruta de edición

**Archivo**: `apps/frontend/src/App.tsx` o router correspondiente

**Subtareas**:
- [ ] 0.5.2.1 Agregar ruta `/equipos/:id/editar`
- [ ] 0.5.2.2 Proteger ruta con autenticación
- [ ] 0.5.2.3 Verificar permisos (dador de carga o admin)

---

### 0.6 Pruebas Fase 0

#### 0.6.1 Tests de Backend

**Subtareas**:
- [ ] 0.6.1.1 Test: Actualizar equipo - cambio de chofer con docs vigentes
- [ ] 0.6.1.2 Test: Actualizar equipo - cambio de chofer sin docs (debe fallar)
- [ ] 0.6.1.3 Test: Actualizar equipo - cambio de chofer con docs nuevos
- [ ] 0.6.1.4 Test: Agregar cliente - con todos los docs
- [ ] 0.6.1.5 Test: Agregar cliente - sin docs requeridos (debe fallar)
- [ ] 0.6.1.6 Test: Quitar cliente - con más de 1 cliente
- [ ] 0.6.1.7 Test: Quitar cliente - último cliente (debe fallar)
- [ ] 0.6.1.8 Test: Quitar cliente - verificar archivado de docs
- [ ] 0.6.1.9 Test: Transferir equipo - como admin
- [ ] 0.6.1.10 Test: Transferir equipo - como no-admin (debe fallar)
- [ ] 0.6.1.11 Test: Auditoría - verificar registro de cambios

#### 0.6.2 Tests de Frontend

**Subtareas**:
- [ ] 0.6.2.1 Test: Carga de página de edición
- [ ] 0.6.2.2 Test: Cambio de entidad actualiza requisitos
- [ ] 0.6.2.3 Test: Botón guardar deshabilitado si faltan docs
- [ ] 0.6.2.4 Test: Subir archivo habilita botón guardar
- [ ] 0.6.2.5 Test: Quitar último cliente deshabilitado
- [ ] 0.6.2.6 Test: Sección admin visible solo para admins

---

## Fase 1: Sistema de Roles y Permisos

### Duración Estimada: 1-2 semanas

---

### 1.1 Base de Datos

#### 1.1.1 Revisar/actualizar modelo de roles

**Archivo**: `apps/documentos/prisma/schema.prisma`

Verificar que existe:
```prisma
enum UserRole {
  ADMIN_INTERNO      // Control total
  DADOR_CARGA        // Gestiona equipos, aprueba docs
  TRANSPORTISTA      // Carga docs, edita equipos propios
  CLIENTE            // Solo lectura
}

model Usuario {
  id                    Int       @id @default(autoincrement())
  email                 String    @unique
  password              String
  role                  UserRole
  
  // Relaciones según rol
  dadorCargaId          Int?      // Si es TRANSPORTISTA, a qué dador pertenece
  clienteId             Int?      // Si es CLIENTE, a qué cliente pertenece
  empresaTransportistaId Int?     // Si es TRANSPORTISTA, qué empresa representa
  
  // ... otros campos
}
```

**Subtareas**:
- [ ] 1.1.1.1 Verificar enum `UserRole` existe
- [ ] 1.1.1.2 Agregar campos de relación si no existen
- [ ] 1.1.1.3 Crear migración si hay cambios
- [ ] 1.1.1.4 Actualizar seed con usuarios de prueba por rol

#### 1.1.2 Tabla de permisos granulares (opcional)

```prisma
model Permission {
  id          Int      @id @default(autoincrement())
  name        String   @unique  // 'equipos.crear', 'equipos.editar', 'docs.aprobar', etc.
  description String?
}

model RolePermission {
  id           Int        @id @default(autoincrement())
  role         UserRole
  permissionId Int
  permission   Permission @relation(fields: [permissionId], references: [id])
  
  @@unique([role, permissionId])
}
```

**Subtareas**:
- [ ] 1.1.2.1 Evaluar si permisos granulares son necesarios ahora
- [ ] 1.1.2.2 Si sí, crear modelos y migración
- [ ] 1.1.2.3 Seed de permisos por rol

---

### 1.2 Backend - Middleware de Autorización

#### 1.2.1 Middleware de verificación de rol

**Archivo**: `apps/documentos/src/middlewares/authorize.middleware.ts`

```typescript
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    next();
  };
}
```

**Subtareas**:
- [ ] 1.2.1.1 Crear archivo `authorize.middleware.ts`
- [ ] 1.2.1.2 Implementar función `authorize`
- [ ] 1.2.1.3 Agregar tipado para `req.user`

#### 1.2.2 Middleware de verificación de propiedad

**Archivo**: `apps/documentos/src/middlewares/ownership.middleware.ts`

```typescript
export function ownsEquipo() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const equipoId = parseInt(req.params.id);
    
    if (user.role === 'ADMIN_INTERNO') {
      return next(); // Admin puede todo
    }
    
    const equipo = await db.equipo.findUnique({
      where: { id: equipoId },
      select: { dadorCargaId: true, empresaTransportistaId: true }
    });
    
    if (!equipo) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    
    // Dador de carga puede si es su equipo
    if (user.role === 'DADOR_CARGA' && equipo.dadorCargaId === user.dadorCargaId) {
      return next();
    }
    
    // Transportista puede si es su empresa
    if (user.role === 'TRANSPORTISTA' && equipo.empresaTransportistaId === user.empresaTransportistaId) {
      return next();
    }
    
    return res.status(403).json({ error: 'No autorizado para este equipo' });
  };
}
```

**Subtareas**:
- [ ] 1.2.2.1 Crear archivo `ownership.middleware.ts`
- [ ] 1.2.2.2 Implementar `ownsEquipo`
- [ ] 1.2.2.3 Implementar `ownsDocument` (similar lógica)
- [ ] 1.2.2.4 Implementar `canViewEquipo` (incluye clientes)

#### 1.2.3 Aplicar middlewares a rutas existentes

**Archivo**: `apps/documentos/src/routes/*.routes.ts`

**Subtareas**:
- [ ] 1.2.3.1 Revisar todas las rutas de equipos
- [ ] 1.2.3.2 Agregar `authorize()` según matriz de permisos
- [ ] 1.2.3.3 Agregar `ownsEquipo()` donde corresponda
- [ ] 1.2.3.4 Revisar rutas de documentos
- [ ] 1.2.3.5 Revisar rutas de aprobación

---

### 1.3 Backend - Filtrado por Rol

#### 1.3.1 Servicio de filtrado de datos

**Archivo**: `apps/documentos/src/services/data-filter.service.ts`

```typescript
class DataFilterService {
  static getEquiposFilter(user: User): Prisma.EquipoWhereInput {
    switch (user.role) {
      case 'ADMIN_INTERNO':
        return {}; // Sin filtro
      case 'DADOR_CARGA':
        return { dadorCargaId: user.dadorCargaId };
      case 'TRANSPORTISTA':
        return { empresaTransportistaId: user.empresaTransportistaId };
      case 'CLIENTE':
        return { clientes: { some: { clienteId: user.clienteId } } };
    }
  }
  
  static getDocumentosFilter(user: User): Prisma.DocumentWhereInput {
    // Similar lógica
  }
}
```

**Subtareas**:
- [ ] 1.3.1.1 Crear archivo `data-filter.service.ts`
- [ ] 1.3.1.2 Implementar `getEquiposFilter`
- [ ] 1.3.1.3 Implementar `getDocumentosFilter`
- [ ] 1.3.1.4 Implementar `getEntidadesFilter` (choferes, camiones, etc.)

#### 1.3.2 Aplicar filtros en controladores

**Subtareas**:
- [ ] 1.3.2.1 Modificar `getEquipos` para usar filtro
- [ ] 1.3.2.2 Modificar `getDocumentos` para usar filtro
- [ ] 1.3.2.3 Modificar endpoints de compliance
- [ ] 1.3.2.4 Modificar endpoints de aprobación

---

### 1.4 Frontend - Contexto de Usuario

#### 1.4.1 Actualizar AuthContext

**Archivo**: `apps/frontend/src/context/AuthContext.tsx`

```typescript
interface AuthUser {
  id: number;
  email: string;
  role: 'ADMIN_INTERNO' | 'DADOR_CARGA' | 'TRANSPORTISTA' | 'CLIENTE';
  dadorCargaId?: number;
  empresaTransportistaId?: number;
  clienteId?: number;
  nombre: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  
  // Helpers de permisos
  canApprove: boolean;
  canEdit: boolean;
  canCreate: boolean;
  isAdmin: boolean;
}
```

**Subtareas**:
- [ ] 1.4.1.1 Actualizar interfaz `AuthUser`
- [ ] 1.4.1.2 Agregar helpers de permisos
- [ ] 1.4.1.3 Actualizar lógica de login para obtener datos completos

#### 1.4.2 Hook usePermissions

**Archivo**: `apps/frontend/src/hooks/usePermissions.ts`

```typescript
function usePermissions() {
  const { user } = useAuth();
  
  return {
    canViewEquipo: (equipo: Equipo) => boolean,
    canEditEquipo: (equipo: Equipo) => boolean,
    canApproveDocument: (document: Document) => boolean,
    canUploadDocument: (entityType: string, entityId: number) => boolean,
    // etc.
  };
}
```

**Subtareas**:
- [ ] 1.4.2.1 Crear archivo `usePermissions.ts`
- [ ] 1.4.2.2 Implementar cada función de permiso
- [ ] 1.4.2.3 Usar en componentes existentes

---

### 1.5 Frontend - Redirección por Rol

#### 1.5.1 Página de redirección post-login

**Archivo**: `apps/frontend/src/pages/RedirectPage.tsx`

```typescript
function RedirectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    switch (user.role) {
      case 'ADMIN_INTERNO':
        navigate('/admin/dashboard');
        break;
      case 'DADOR_CARGA':
        navigate('/dador/dashboard');
        break;
      case 'TRANSPORTISTA':
        navigate('/transportista/dashboard');
        break;
      case 'CLIENTE':
        navigate('/cliente/dashboard');
        break;
    }
  }, [user, navigate]);
  
  return <LoadingSpinner />;
}
```

**Subtareas**:
- [ ] 1.5.1.1 Crear `RedirectPage.tsx`
- [ ] 1.5.1.2 Configurar como página post-login
- [ ] 1.5.1.3 Crear estructura de carpetas por rol

#### 1.5.2 Rutas protegidas por rol

**Archivo**: `apps/frontend/src/components/ProtectedRoute.tsx`

```typescript
interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" />;
  
  return <>{children}</>;
}
```

**Subtareas**:
- [ ] 1.5.2.1 Crear/actualizar `ProtectedRoute.tsx`
- [ ] 1.5.2.2 Aplicar a todas las rutas del router
- [ ] 1.5.2.3 Crear página `/unauthorized`

---

### 1.6 Pruebas Fase 1

**Subtareas**:
- [ ] 1.6.1 Test: Login como cada rol
- [ ] 1.6.2 Test: Redirección correcta por rol
- [ ] 1.6.3 Test: Acceso denegado a rutas no permitidas
- [ ] 1.6.4 Test: Filtrado de datos por rol
- [ ] 1.6.5 Test: Middleware de ownership

---

## Fase 2: Portal Cliente (Solo Lectura)

### Duración Estimada: 1 semana

---

### 2.1 Backend - Endpoints para Cliente

#### 2.1.1 GET `/api/cliente/equipos` - Listar equipos asignados

**Archivo**: `apps/documentos/src/controllers/cliente.controller.ts`

**Response**:
```typescript
interface ClienteEquiposResponse {
  equipos: Array<{
    id: number;
    identificador: string;
    camion: { patente: string };
    acoplado: { patente: string };
    chofer: { nombre: string; apellido: string };
    empresaTransportista: { nombre: string };
    estadoCompliance: 'VIGENTE' | 'PROXIMO_VENCER' | 'VENCIDO' | 'INCOMPLETO';
    proximoVencimiento?: string;
  }>;
  resumen: {
    total: number;
    vigentes: number;
    proximosVencer: number;
    vencidos: number;
  };
}
```

**Subtareas**:
- [ ] 2.1.1.1 Crear archivo `cliente.controller.ts`
- [ ] 2.1.1.2 Implementar `getEquiposAsignados`
- [ ] 2.1.1.3 Calcular estado de compliance por equipo
- [ ] 2.1.1.4 Agregar ruta con middleware `authorize(['CLIENTE'])`

#### 2.1.2 GET `/api/cliente/equipos/:id` - Detalle de equipo

**Response**:
```typescript
interface ClienteEquipoDetalleResponse {
  equipo: {
    id: number;
    // ... datos básicos
  };
  documentos: Array<{
    id: number;
    templateName: string;
    entityType: string;
    entityName: string;
    status: string;
    expiresAt?: string;
    estado: 'VIGENTE' | 'PROXIMO_VENCER' | 'VENCIDO';
    downloadUrl: string;
  }>;
}
```

**Subtareas**:
- [ ] 2.1.2.1 Implementar `getEquipoDetalle`
- [ ] 2.1.2.2 Incluir solo documentos aprobados
- [ ] 2.1.2.3 Generar URLs de descarga con token temporal
- [ ] 2.1.2.4 Agregar ruta

#### 2.1.3 GET `/api/cliente/equipos/:id/documentos/download` - Descargar ZIP

**Subtareas**:
- [ ] 2.1.3.1 Implementar `downloadEquipoDocumentos`
- [ ] 2.1.3.2 Generar ZIP con todos los documentos vigentes
- [ ] 2.1.3.3 Nombrar archivos de forma descriptiva
- [ ] 2.1.3.4 Streaming de respuesta para archivos grandes

---

### 2.2 Frontend - Vistas de Cliente

#### 2.2.1 Dashboard Cliente

**Archivo**: `apps/frontend/src/features/cliente/pages/ClienteDashboard.tsx`

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  PORTAL CLIENTE                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ Resumen ───────────────────────────────────────────────┐   │
│  │  [Total] [Vigentes ✅] [Próx. vencer ⚠️] [Vencidos 🔴]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ Equipos Asignados ─────────────────────────────────────┐   │
│  │  [Buscar...] [Filtrar por estado ▼]                     │   │
│  │                                                         │   │
│  │  Lista de equipos con semáforo                          │   │
│  │  Cada equipo: [Ver documentos]                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Subtareas**:
- [ ] 2.2.1.1 Crear carpeta `features/cliente`
- [ ] 2.2.1.2 Crear `ClienteDashboard.tsx`
- [ ] 2.2.1.3 Implementar tarjetas de resumen
- [ ] 2.2.1.4 Implementar lista de equipos
- [ ] 2.2.1.5 Implementar filtros y búsqueda

#### 2.2.2 Detalle de Equipo para Cliente

**Archivo**: `apps/frontend/src/features/cliente/pages/ClienteEquipoDetalle.tsx`

**Subtareas**:
- [ ] 2.2.2.1 Crear `ClienteEquipoDetalle.tsx`
- [ ] 2.2.2.2 Mostrar información del equipo
- [ ] 2.2.2.3 Listar documentos agrupados por entidad
- [ ] 2.2.2.4 Botón descargar individual
- [ ] 2.2.2.5 Botón descargar todos (ZIP)
- [ ] 2.2.2.6 Vista previa de documentos (opcional)

#### 2.2.3 Navegación Cliente

**Archivo**: `apps/frontend/src/features/cliente/components/ClienteNavbar.tsx`

**Subtareas**:
- [ ] 2.2.3.1 Crear navbar simplificado para cliente
- [ ] 2.2.3.2 Solo mostrar: Dashboard, Mi cuenta, Salir
- [ ] 2.2.3.3 Mostrar nombre del cliente logueado

---

### 2.3 Pruebas Fase 2

**Subtareas**:
- [ ] 2.3.1 Test: Cliente ve solo equipos asignados a él
- [ ] 2.3.2 Test: Cliente NO ve equipos de otros clientes
- [ ] 2.3.3 Test: Cliente puede descargar documentos
- [ ] 2.3.4 Test: Cliente NO puede editar nada
- [ ] 2.3.5 Test: Cliente NO puede aprobar nada

---

## Fase 3: Separación Dador/Transportista

### Duración Estimada: 2 semanas

---

### 3.1 Backend - Ajustes para Transportista

#### 3.1.1 Restricción de aprobación

**Archivo**: `apps/documentos/src/controllers/approval.controller.ts`

**Subtareas**:
- [ ] 3.1.1.1 Modificar `approveDocument` para rechazar si es TRANSPORTISTA
- [ ] 3.1.1.2 Modificar `rejectDocument` para rechazar si es TRANSPORTISTA
- [ ] 3.1.1.3 Agregar mensaje de error descriptivo

#### 3.1.2 Endpoint de "mis entidades" para Transportista

**Archivo**: `apps/documentos/src/controllers/transportista.controller.ts`

```typescript
// GET /api/transportista/entidades
interface MisEntidadesResponse {
  empresa: EmpresaTransportista;
  choferes: Chofer[];
  camiones: Camion[];
  acoplados: Acoplado[];
  documentosPendientes: number;
  documentosRechazados: number;
  documentosPorVencer: number;
}
```

**Subtareas**:
- [ ] 3.1.2.1 Crear `transportista.controller.ts`
- [ ] 3.1.2.2 Implementar `getMisEntidades`
- [ ] 3.1.2.3 Calcular contadores de documentos
- [ ] 3.1.2.4 Agregar rutas

#### 3.1.3 Endpoint de documentos rechazados

```typescript
// GET /api/transportista/documentos/rechazados
interface DocumentosRechazadosResponse {
  documentos: Array<{
    id: number;
    templateName: string;
    entityType: string;
    entityName: string;
    rechazadoAt: string;
    motivoRechazo: string;
  }>;
}
```

**Subtareas**:
- [ ] 3.1.3.1 Implementar `getDocumentosRechazados`
- [ ] 3.1.3.2 Filtrar por empresa transportista del usuario
- [ ] 3.1.3.3 Incluir motivo de rechazo

---

### 3.2 Frontend - Vistas de Transportista

#### 3.2.1 Dashboard Transportista

**Archivo**: `apps/frontend/src/features/transportista/pages/TransportistaDashboard.tsx`

**Subtareas**:
- [ ] 3.2.1.1 Crear carpeta `features/transportista`
- [ ] 3.2.1.2 Crear `TransportistaDashboard.tsx`
- [ ] 3.2.1.3 Sección "Atención Requerida" (rechazados, faltantes, por vencer)
- [ ] 3.2.1.4 Sección "Mis Entidades" (acceso rápido)
- [ ] 3.2.1.5 Sección "Mis Equipos"

#### 3.2.2 Página de Documentos Rechazados

**Archivo**: `apps/frontend/src/features/transportista/pages/DocumentosRechazados.tsx`

**Subtareas**:
- [ ] 3.2.2.1 Crear `DocumentosRechazados.tsx`
- [ ] 3.2.2.2 Listar documentos rechazados con motivo
- [ ] 3.2.2.3 Botón "Resubir" por cada documento
- [ ] 3.2.2.4 Modal/página de resubida

#### 3.2.3 Página de Mis Entidades

**Archivo**: `apps/frontend/src/features/transportista/pages/MisEntidades.tsx`

**Subtareas**:
- [ ] 3.2.3.1 Crear `MisEntidades.tsx`
- [ ] 3.2.3.2 Tabs: Choferes | Camiones | Acoplados
- [ ] 3.2.3.3 Por cada entidad: ver documentos, estado, subir
- [ ] 3.2.3.4 Indicador visual de docs faltantes/vencidos

#### 3.2.4 Ocultar funciones de aprobación

**Subtareas**:
- [ ] 3.2.4.1 En ApprovalQueuePage, mostrar solo si NO es transportista
- [ ] 3.2.4.2 En detalle de documento, ocultar botones aprobar/rechazar
- [ ] 3.2.4.3 Revisar todos los componentes con acciones de aprobación

---

### 3.3 Frontend - Vistas de Dador de Carga

#### 3.3.1 Dashboard Dador de Carga

**Archivo**: `apps/frontend/src/features/dador/pages/DadorDashboard.tsx`

**Subtareas**:
- [ ] 3.3.1.1 Crear carpeta `features/dador`
- [ ] 3.3.1.2 Crear `DadorDashboard.tsx`
- [ ] 3.3.1.3 Sección "Pendientes de Aprobación"
- [ ] 3.3.1.4 Sección "Menú Principal" (accesos rápidos)
- [ ] 3.3.1.5 Sección "Actividad Reciente"
- [ ] 3.3.1.6 Sección "Semáforo de Equipos"

#### 3.3.2 Página de Transportistas del Dador

**Archivo**: `apps/frontend/src/features/dador/pages/MisTransportistas.tsx`

**Subtareas**:
- [ ] 3.3.2.1 Crear `MisTransportistas.tsx`
- [ ] 3.3.2.2 Listar empresas transportistas vinculadas
- [ ] 3.3.2.3 Por cada una: ver equipos, estado de compliance
- [ ] 3.3.2.4 Acceso a documentación de cada transportista

#### 3.3.3 Navegación Dador de Carga

**Archivo**: `apps/frontend/src/features/dador/components/DadorNavbar.tsx`

**Subtareas**:
- [ ] 3.3.3.1 Crear navbar para dador de carga
- [ ] 3.3.3.2 Menú: Dashboard, Equipos, Aprobaciones, Transportistas, Compliance
- [ ] 3.3.3.3 Indicador de pendientes de aprobación

---

### 3.4 Pruebas Fase 3

**Subtareas**:
- [ ] 3.4.1 Test: Transportista NO puede aprobar documentos
- [ ] 3.4.2 Test: Transportista puede subir documentos
- [ ] 3.4.3 Test: Transportista puede editar equipos propios
- [ ] 3.4.4 Test: Dador puede aprobar documentos de sus transportistas
- [ ] 3.4.5 Test: Dador ve todos los equipos de sus transportistas
- [ ] 3.4.6 Test: Navegación diferenciada por rol

---

## Fase 4: Flujo de Aprobación con Rechazos

### Duración Estimada: 1 semana

---

### 4.1 Base de Datos

#### 4.1.1 Agregar campos de rechazo a documentos

**Archivo**: `apps/documentos/prisma/schema.prisma`

```prisma
model Document {
  // ... campos existentes ...
  
  // Campos de rechazo
  rejectedAt      DateTime?
  rejectedBy      Int?
  rejectionReason String?
  rejectionCount  Int       @default(0)  // Contador de rechazos
  
  // Relación con usuario que rechazó
  rejectedByUser  Usuario?  @relation("DocumentRejections", fields: [rejectedBy], references: [id])
}
```

**Subtareas**:
- [ ] 4.1.1.1 Agregar campos al schema
- [ ] 4.1.1.2 Crear migración
- [ ] 4.1.1.3 Actualizar tipos de TypeScript

---

### 4.2 Backend - Lógica de Rechazo

#### 4.2.1 Endpoint de rechazo con motivo

**Archivo**: `apps/documentos/src/controllers/approval.controller.ts`

```typescript
// POST /api/approval/:id/reject
interface RejectDocumentRequest {
  motivo: string;  // Obligatorio
}
```

**Subtareas**:
- [ ] 4.2.1.1 Modificar/crear `rejectDocument`
- [ ] 4.2.1.2 Validar que motivo no esté vacío
- [ ] 4.2.1.3 Guardar fecha, usuario y motivo
- [ ] 4.2.1.4 Incrementar contador de rechazos
- [ ] 4.2.1.5 Cambiar status a 'RECHAZADO'

#### 4.2.2 Endpoint de resubida

**Archivo**: `apps/documentos/src/controllers/documents.controller.ts`

```typescript
// POST /api/documents/:id/resubmit
// Mismo que upload pero asociado a documento existente
```

**Subtareas**:
- [ ] 4.2.2.1 Implementar `resubmitDocument`
- [ ] 4.2.2.2 Validar que documento esté en estado RECHAZADO
- [ ] 4.2.2.3 Subir nuevo archivo
- [ ] 4.2.2.4 Cambiar status a PENDIENTE
- [ ] 4.2.2.5 Mantener historial de versiones (opcional)

---

### 4.3 Frontend - UI de Rechazo

#### 4.3.1 Modal de rechazo

**Archivo**: `apps/frontend/src/features/documentos/components/RejectModal.tsx`

**Subtareas**:
- [ ] 4.3.1.1 Crear `RejectModal.tsx`
- [ ] 4.3.1.2 Campo de texto obligatorio para motivo
- [ ] 4.3.1.3 Sugerencias de motivos comunes (dropdown + texto libre)
- [ ] 4.3.1.4 Botón confirmar rechazo

#### 4.3.2 UI de resubida

**Archivo**: `apps/frontend/src/features/documentos/components/ResubmitDocument.tsx`

**Subtareas**:
- [ ] 4.3.2.1 Crear `ResubmitDocument.tsx`
- [ ] 4.3.2.2 Mostrar motivo de rechazo anterior
- [ ] 4.3.2.3 Input de archivo
- [ ] 4.3.2.4 Vista previa del nuevo archivo
- [ ] 4.3.2.5 Botón enviar

---

### 4.4 Pruebas Fase 4

**Subtareas**:
- [ ] 4.4.1 Test: Rechazar documento requiere motivo
- [ ] 4.4.2 Test: Documento rechazado aparece en lista de rechazados
- [ ] 4.4.3 Test: Transportista puede resubir documento rechazado
- [ ] 4.4.4 Test: Resubida cambia estado a pendiente
- [ ] 4.4.5 Test: Contador de rechazos se incrementa

---

## Fase 5: Dashboards Diferenciados

### Duración Estimada: 1 semana

---

### 5.1 Componentes Compartidos

#### 5.1.1 Tarjeta de estadística

**Archivo**: `apps/frontend/src/components/ui/StatCard.tsx`

```typescript
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  onClick?: () => void;
}
```

**Subtareas**:
- [ ] 5.1.1.1 Crear `StatCard.tsx`
- [ ] 5.1.1.2 Estilos por color
- [ ] 5.1.1.3 Animación de hover

#### 5.1.2 Timeline de actividad

**Archivo**: `apps/frontend/src/components/ui/ActivityTimeline.tsx`

**Subtareas**:
- [ ] 5.1.2.1 Crear `ActivityTimeline.tsx`
- [ ] 5.1.2.2 Mostrar eventos con timestamp
- [ ] 5.1.2.3 Iconos por tipo de evento
- [ ] 5.1.2.4 Scroll infinito o paginación

#### 5.1.3 Semáforo compacto

**Archivo**: `apps/frontend/src/components/ui/ComplianceBadge.tsx`

**Subtareas**:
- [ ] 5.1.3.1 Crear `ComplianceBadge.tsx`
- [ ] 5.1.3.2 Estados: vigente, próximo, vencido, incompleto
- [ ] 5.1.3.3 Tooltip con detalle

---

### 5.2 Backend - Endpoints de Dashboard

#### 5.2.1 GET `/api/dashboard/stats`

**Response por rol**:
```typescript
// ADMIN_INTERNO
interface AdminDashboardStats {
  totalEquipos: number;
  totalDocumentos: number;
  pendientesAprobacion: number;
  vencidosHoy: number;
  usuariosActivos: number;
}

// DADOR_CARGA
interface DadorDashboardStats {
  misEquipos: number;
  pendientesAprobacion: number;
  proximosVencer: number;
  transportistasActivos: number;
}

// TRANSPORTISTA
interface TransportistaDashboardStats {
  misEquipos: number;
  documentosRechazados: number;
  documentosFaltantes: number;
  proximosVencer: number;
}

// CLIENTE
interface ClienteDashboardStats {
  equiposAsignados: number;
  vigentes: number;
  proximosVencer: number;
  vencidos: number;
}
```

**Subtareas**:
- [ ] 5.2.1.1 Crear `dashboard.controller.ts`
- [ ] 5.2.1.2 Implementar stats por rol
- [ ] 5.2.1.3 Optimizar queries con agregaciones

#### 5.2.2 GET `/api/dashboard/activity`

**Subtareas**:
- [ ] 5.2.2.1 Implementar `getRecentActivity`
- [ ] 5.2.2.2 Filtrar por rol (solo actividad relevante)
- [ ] 5.2.2.3 Paginación

---

### 5.3 Frontend - Dashboards Finales

#### 5.3.1 Dashboard Admin Interno

**Subtareas**:
- [ ] 5.3.1.1 Stats generales del sistema
- [ ] 5.3.1.2 Gráfico de documentos por estado
- [ ] 5.3.1.3 Equipos con problemas (vencidos)
- [ ] 5.3.1.4 Actividad reciente del sistema

#### 5.3.2 Dashboard Dador de Carga (ya cubierto en 3.3.1)

**Subtareas**:
- [ ] 5.3.2.1 Refinar con datos reales
- [ ] 5.3.2.2 Agregar gráficos si aplica

#### 5.3.3 Dashboard Transportista (ya cubierto en 3.2.1)

**Subtareas**:
- [ ] 5.3.3.1 Refinar con datos reales
- [ ] 5.3.3.2 Priorizar acciones pendientes

#### 5.3.4 Dashboard Cliente (ya cubierto en 2.2.1)

**Subtareas**:
- [ ] 5.3.4.1 Refinar con datos reales

---

### 5.4 Pruebas Fase 5

**Subtareas**:
- [ ] 5.4.1 Test: Dashboard admin muestra stats correctas
- [ ] 5.4.2 Test: Dashboard dador muestra solo sus datos
- [ ] 5.4.3 Test: Dashboard transportista muestra rechazados
- [ ] 5.4.4 Test: Dashboard cliente muestra equipos asignados
- [ ] 5.4.5 Test: Actividad reciente filtrada por rol

---

## Pruebas

### Tests Unitarios

**Backend**:
- [ ] Tests de servicios de auditoría
- [ ] Tests de servicios de archivado
- [ ] Tests de validación de requisitos
- [ ] Tests de filtrado por rol

**Frontend**:
- [ ] Tests de hooks de permisos
- [ ] Tests de componentes de formulario
- [ ] Tests de redirección por rol

### Tests de Integración

- [ ] Flujo completo: crear equipo → subir docs → aprobar
- [ ] Flujo completo: editar equipo → cambiar chofer → subir docs
- [ ] Flujo completo: rechazar doc → resubir → aprobar
- [ ] Flujo completo: agregar cliente → subir docs faltantes

### Tests E2E

- [ ] Login como cada rol y verificar acceso
- [ ] Operaciones CRUD por rol
- [ ] Descarga de documentos como cliente

---

## Despliegue

### Pre-despliegue

- [ ] Backup de base de datos
- [ ] Ejecutar migraciones en staging
- [ ] Verificar rollback de migraciones
- [ ] Tests en staging

### Despliegue

- [ ] Ejecutar migraciones en producción
- [ ] Desplegar backend
- [ ] Desplegar frontend
- [ ] Verificar health checks

### Post-despliegue

- [ ] Monitorear logs por errores
- [ ] Verificar métricas de performance
- [ ] Crear usuarios de prueba por rol
- [ ] Documentar cambios en CHANGELOG

---

## Apéndice: Estructura de Carpetas Propuesta

```
apps/frontend/src/
├── features/
│   ├── admin/
│   │   ├── pages/
│   │   │   └── AdminDashboard.tsx
│   │   └── components/
│   │       └── AdminNavbar.tsx
│   ├── dador/
│   │   ├── pages/
│   │   │   ├── DadorDashboard.tsx
│   │   │   └── MisTransportistas.tsx
│   │   └── components/
│   │       └── DadorNavbar.tsx
│   ├── transportista/
│   │   ├── pages/
│   │   │   ├── TransportistaDashboard.tsx
│   │   │   ├── MisEntidades.tsx
│   │   │   └── DocumentosRechazados.tsx
│   │   └── components/
│   │       └── TransportistaNavbar.tsx
│   ├── cliente/
│   │   ├── pages/
│   │   │   ├── ClienteDashboard.tsx
│   │   │   └── ClienteEquipoDetalle.tsx
│   │   └── components/
│   │       └── ClienteNavbar.tsx
│   └── equipos/
│       ├── pages/
│       │   ├── EquiposPage.tsx
│       │   ├── EditarEquipoPage.tsx
│       │   └── NuevoEquipoPage.tsx
│       ├── components/
│       │   ├── SelectorEntidad.tsx
│       │   ├── ListaClientes.tsx
│       │   └── GrupoDocumentos.tsx
│       └── hooks/
│           └── useEquipoEdit.ts
├── components/
│   ├── ui/
│   │   ├── StatCard.tsx
│   │   ├── ActivityTimeline.tsx
│   │   └── ComplianceBadge.tsx
│   └── ProtectedRoute.tsx
├── hooks/
│   └── usePermissions.ts
└── context/
    └── AuthContext.tsx

apps/documentos/src/
├── controllers/
│   ├── equipos.controller.ts
│   ├── approval.controller.ts
│   ├── documents.controller.ts
│   ├── dashboard.controller.ts
│   ├── cliente.controller.ts
│   └── transportista.controller.ts
├── services/
│   ├── audit.service.ts
│   ├── document-archive.service.ts
│   ├── requisitos-validation.service.ts
│   └── data-filter.service.ts
├── middlewares/
│   ├── authenticate.middleware.ts
│   ├── authorize.middleware.ts
│   └── ownership.middleware.ts
└── routes/
    ├── equipos.routes.ts
    ├── approval.routes.ts
    ├── documents.routes.ts
    ├── dashboard.routes.ts
    ├── cliente.routes.ts
    └── transportista.routes.ts
```

---

## Notas Finales

1. **Prioridad**: Las fases están ordenadas por dependencia. La Fase 0 es fundacional.

2. **Iteración**: Cada fase puede dividirse en sprints más pequeños si es necesario.

3. **Flexibilidad**: Este plan puede ajustarse según feedback durante el desarrollo.

4. **Documentación**: Actualizar README y ADR después de cada fase.

5. **Commits**: Usar Conventional Commits para cada subtarea completada.

