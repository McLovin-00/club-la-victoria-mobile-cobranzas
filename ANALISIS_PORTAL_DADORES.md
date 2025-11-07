# Análisis: Portal de Dadores de Carga - Gestión Autónoma de Documentación

## 📋 Resumen del Requerimiento

Los **Dadores de Carga** necesitan poder gestionar de forma autónoma:

1. **Cargar documentos** solo de sus propios equipos, choferes, camiones, acoplados y empresas transportistas
2. **Aprobar documentos** que hayan subido (control de calidad propio)
3. **Consultar maestros** (empresas transportistas, choferes, camiones, acoplados) que pertenezcan al dador
4. **Búsqueda por patentes** similar al cliente, pero limitada a sus equipos
5. **Descarga masiva** de documentación organizada por equipo

---

## ✅ Funcionalidades Existentes

### Backend (Microservicio Documentos)

#### **Modelos de Datos**
- ✅ `DadorCarga` - Dadores con CUIT, razón social, tenant
- ✅ `EmpresaTransportista` - Empresas asociadas a dadores
- ✅ `Chofer` - Choferes con `dadorCargaId` y `empresaTransportistaId`
- ✅ `Camion` - Camiones con `dadorCargaId` y `empresaTransportistaId`
- ✅ `Acoplado` - Acoplados con `dadorCargaId` y `empresaTransportistaId`
- ✅ `Equipo` - Equipos con `dadorCargaId` y `empresaTransportistaId`
- ✅ `Document` - Documentos con `dadorCargaId` y `tenantEmpresaId`

#### **Endpoints Disponibles**

| Endpoint | Método | Funcionalidad | Roles Autorizados | Filtro por Dador |
|----------|--------|---------------|-------------------|------------------|
| `/api/docs/dadores` | GET | Listar dadores de carga | ADMIN, SUPERADMIN | ❌ No filtra |
| `/api/docs/dadores` | POST | Crear dador de carga | ADMIN, SUPERADMIN | N/A |
| `/api/docs/dadores/:id` | PUT | Actualizar dador | ADMIN, SUPERADMIN | N/A |
| `/api/docs/dadores/:id` | DELETE | Eliminar dador | ADMIN, SUPERADMIN | N/A |
| `/api/docs/equipos` | GET | Listar equipos | Todos autenticados | ✅ Query param |
| `/api/docs/equipos/minimal` | POST | Crear equipo (alta rápida) | ADMIN, SUPERADMIN | ✅ Body param |
| `/api/docs/equipos/:id` | PUT/DELETE | Modificar/eliminar equipo | ADMIN, SUPERADMIN | ❌ |
| `/api/docs/equipos/:id/check-missing-now` | POST | Revisar faltantes | ADMIN, SUPERADMIN | ❌ |
| `/api/docs/equipos/:id/request-missing` | POST | Solicitar docs | ADMIN, SUPERADMIN | ❌ |
| `/api/docs/equipos/search/dnis` | POST | Buscar por DNIs | Todos autenticados | ❌ |
| `/api/docs/equipos/download/vigentes` | POST | ZIP masivo | ADMIN, SUPERADMIN | ❌ |
| `/api/docs/maestros/empresas` | GET | Listar empresas transportistas | Todos autenticados | ⚠️ No filtrado |
| `/api/docs/maestros/choferes` | GET | Listar choferes | Todos autenticados | ✅ Query param |
| `/api/docs/maestros/camiones` | GET | Listar camiones | Todos autenticados | ✅ Query param |
| `/api/docs/maestros/acoplados` | GET | Listar acoplados | Todos autenticados | ✅ Query param |
| `/api/docs/batch/dadores/:dadorId/documentos/batch` | POST | Carga masiva de docs | ADMIN, SUPERADMIN | ✅ URL param |
| `/api/docs/documents/upload` | POST | Subir documento | ADMIN, SUPERADMIN, OPERATOR | ⚠️ Body param |
| `/api/docs/documents/:id/download` | GET | Descargar documento | ADMIN, SUPERADMIN, OPERATOR | ❌ |
| `/api/docs/documents/:id/preview` | GET | Preview de documento | ADMIN, SUPERADMIN, OPERATOR | ❌ |
| `/api/docs/approval/pending` | GET | Docs pendientes aprobación | ADMIN, SUPERADMIN | ⚠️ Sin filtro |
| `/api/docs/approval/pending/:id/approve` | POST | Aprobar documento | ADMIN, SUPERADMIN | ❌ |
| `/api/docs/approval/pending/:id/reject` | POST | Rechazar documento | ADMIN, SUPERADMIN | ❌ |
| `/api/docs/search` | GET | Buscar equipos | Todos autenticados | ❌ |

**Leyenda**:
- ✅ = Filtro implementado
- ⚠️ = Filtro parcial o requiere parámetros específicos
- ❌ = Sin filtro automático por dador

### Frontend

#### **Páginas Existentes**
- ✅ `DadoresPortalPage` - Portal del dador con funcionalidades de:
  - Alta rápida de equipos (DNI + patentes)
  - Importación CSV masiva de equipos
  - Carga masiva de documentos con IA
  - Centro de control de equipos (revisar faltantes, solicitar, descargar ZIP)

#### **Componentes y Funcionalidades**
- ✅ Formulario de alta rápida de equipos
- ✅ Uploader de CSV con plantilla
- ✅ Uploader de documentos con procesamiento IA
- ✅ Progreso en tiempo real de procesamiento
- ✅ Reportes de resultados (CSV, visualización)
- ✅ Selector de dador de carga
- ✅ Acciones por equipo (check missing, request docs, download ZIP)

---

## ❌ Funcionalidades Faltantes

### 1. **Rol Específico para Dadores** ❌

**Requerimiento**: Los dadores deben tener su propio rol con permisos limitados a sus propios datos.

**Estado**: No existe. Actualmente los dadores usan roles ADMIN/SUPERADMIN.

**Necesidad**:
- **Nuevo rol**: `DADOR_CARGA` en el enum `UserRole`
- **Middleware de autorización**: `authorizeDador` que valide:
  - Usuario tiene rol `DADOR_CARGA`
  - Usuario solo puede acceder a datos de su `dadorCargaId`
- **Campo adicional** en User/EndUser: `dadorCargaId` (opcional, solo para rol DADOR_CARGA)

```typescript
// apps/documentos/src/types/roles.ts
export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  DADOR_CARGA = 'DADOR_CARGA', // NUEVO
}

// apps/documentos/src/middlewares/auth.middleware.ts
export const authorizeDador = (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  const targetDadorId = Number(req.params.dadorId || req.body.dadorCargaId || req.query.dadorCargaId);
  
  if (user.role === 'DADOR_CARGA') {
    if (!user.dadorCargaId) {
      return res.status(403).json({ success: false, message: 'Dador no asociado' });
    }
    if (user.dadorCargaId !== targetDadorId) {
      return res.status(403).json({ success: false, message: 'Acceso denegado al dador' });
    }
  }
  
  next();
};
```

---

### 2. **Endpoints de Maestros Filtrados Automáticamente** ⚠️

**Requerimiento**: Los dadores deben consultar solo sus maestros (empresas, choferes, camiones, acoplados).

**Estado**: Parcialmente implementado. Los endpoints requieren `dadorCargaId` como query param, pero no validan que el usuario tenga acceso.

**Necesidad**:
- Agregar middleware `authorizeDador` a todos los endpoints de maestros
- Inyectar automáticamente `dadorCargaId` del usuario si tiene rol `DADOR_CARGA`
- Endpoint específico para listar empresas transportistas del dador:

```typescript
// apps/documentos/src/routes/maestros.routes.ts
router.get('/empresas', 
  authenticate, 
  authorizeDador,  // NUEVO
  validate(empresaDocListQuerySchema), 
  MaestrosController.listEmpresas
);

// apps/documentos/src/controllers/maestros.controller.ts
async listEmpresas(req: AuthRequest, res: Response) {
  // Si es dador, inyectar su dadorCargaId
  const dadorCargaId = req.user.role === 'DADOR_CARGA' 
    ? req.user.dadorCargaId 
    : Number(req.query.dadorCargaId) || undefined;
  
  const { data, total } = await MaestrosService.listEmpresas(
    req.tenantId!,
    dadorCargaId,
    req.query.q as string,
    req.query.activo === 'true',
    Number(req.query.page) || 1,
    Number(req.query.limit) || 10
  );
  
  res.json({ success: true, data, pagination: { total } });
}
```

---

### 3. **Aprobación de Documentos por Dador** ❌

**Requerimiento**: Los dadores deben poder aprobar/rechazar sus propios documentos.

**Estado**: No existe. Solo ADMIN/SUPERADMIN pueden aprobar.

**Necesidad**:
- **Agregar rol** `DADOR_CARGA` a los endpoints de aprobación
- **Filtrar documentos** pendientes por `dadorCargaId`
- **Validar acceso** en approve/reject

```typescript
// apps/documentos/src/routes/approval.routes.ts
router.get('/pending', 
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DADOR_CARGA]), // AGREGADO
  authorizeDador, // NUEVO
  validate(pendingDocumentsQuerySchema), 
  ApprovalController.getPendingDocuments
);

router.post('/pending/:id/approve', 
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DADOR_CARGA]), // AGREGADO
  authorizeDador, // NUEVO
  approvalRateLimit, 
  validate(approveDocumentSchema), 
  ApprovalController.approveDocument
);

// apps/documentos/src/controllers/approval.controller.ts
static async getPendingDocuments(req: Request, res: Response): Promise<void> {
  const tenantEmpresaId = (req as any).tenantId as number;
  const user = (req as any).user;
  
  // Filtrar por dadorCargaId si es rol DADOR_CARGA
  const dadorCargaId = user.role === 'DADOR_CARGA' 
    ? user.dadorCargaId 
    : undefined;
  
  const result = await ApprovalService.getPendingDocuments(tenantEmpresaId, {
    dadorCargaId, // NUEVO PARÁMETRO
    entityType: req.query.entityType,
    minConfidence: req.query.minConfidence ? parseFloat(req.query.minConfidence) : undefined,
    maxConfidence: req.query.maxConfidence ? parseFloat(req.query.maxConfidence) : undefined,
    page: req.query.page ? parseInt(req.query.page, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
  });
  
  res.json({ success: true, ...result });
}
```

---

### 4. **Búsqueda Masiva por Patentes (Dadores)** ❌

**Requerimiento**: Similar al portal de clientes, los dadores deben buscar por patentes.

**Estado**: No existe endpoint específico.

**Necesidad**:
- **Nuevo endpoint**: `POST /api/docs/dadores/:dadorId/bulk-search`
- Filtrado automático por `dadorCargaId`
- Retorna equipos del dador que coincidan con las patentes

```typescript
// apps/documentos/src/routes/dadores.routes.ts
router.post('/:dadorId/bulk-search',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DADOR_CARGA]),
  authorizeDador,
  validate(bulkSearchSchema),
  DadoresController.bulkSearch
);
```

---

### 5. **ZIP Estructurado por Patentes (Dadores)** ❌

**Requerimiento**: Descargar documentación de múltiples equipos en un ZIP organizado.

**Estado**: Existe `/api/docs/equipos/download/vigentes` pero no filtra por dador ni tiene estructura específica.

**Necesidad**:
- **Nuevo endpoint**: `POST /api/docs/dadores/:dadorId/bulk-zip`
- Estructura similar al portal de clientes
- Filtrado automático por `dadorCargaId`

---

### 6. **Frontend: Portal de Consulta de Maestros** ❌

**Requerimiento**: Interfaz para consultar empresas transportistas, choferes, camiones, acoplados.

**Estado**: No existe en DadoresPortalPage.

**Necesidad**:
- **Nueva sección** o página: `DadoresMaestrosPage`
- Tabs para: Empresas Transportistas, Choferes, Camiones, Acoplados
- Tablas con paginación
- Filtros por nombre, DNI, patente, CUIT
- Links a documentación de cada entidad

---

### 7. **Frontend: Interface de Aprobación** ❌

**Requerimiento**: Interfaz para que dadores aprueben/rechacen sus documentos.

**Estado**: No existe para dadores (solo hay ApprovalQueuePage para ADMIN/SUPERADMIN).

**Necesidad**:
- **Nueva sección** en DadoresPortalPage o nueva página
- Lista de documentos PENDIENTE_APROBACION del dador
- Modal de preview
- Botones de aprobar/rechazar
- Formulario de confirmación de datos (entityType, entityId, expiration)

---

### 8. **Frontend: Búsqueda Masiva por Patentes** ❌

**Requerimiento**: Componente similar al de clientes para búsqueda por patentes.

**Estado**: No existe.

**Necesidad**:
- Reutilizar componente `BulkPatentesSearch` (a crear)
- Adaptar para usar endpoint de dadores
- Integrar en DadoresPortalPage

---

### 9. **Frontend: Preview de Documentos** ❌

**Requerimiento**: Modal para visualizar documentos sin descargar.

**Estado**: No existe.

**Necesidad**:
- Reutilizar componente `DocumentPreviewModal` (a crear)
- Integrar en listado de documentos
- Integrar en interfaz de aprobación

---

## 📦 Resumen de Cambios Necesarios

### Cambios en Base de Datos
- ⚠️ **OPCIONAL**: Agregar campo `dadorCargaId` a tabla `platform_users` (si queremos asociar usuarios del backend principal a dadores)
- ⚠️ **OPCIONAL**: Agregar campo `dadorCargaId` a tabla `end_users` (si queremos que end users sean dadores)
- ✅ **Alternativa recomendada**: Usar campo `metadata` JSON existente para almacenar `{ dadorCargaId: number }`

### Cambios en Backend

#### 1. Nuevo Rol
```typescript
// apps/documentos/src/types/roles.ts
export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  DADOR_CARGA = 'DADOR_CARGA', // NUEVO
}
```

#### 2. Nuevo Middleware
```typescript
// apps/documentos/src/middlewares/auth.middleware.ts
export const authorizeDador = (req, res, next) => { ... }
```

#### 3. Modificar Endpoints Existentes
| Endpoint | Cambio |
|----------|--------|
| `/api/docs/maestros/empresas` | Agregar filtro por dadorCargaId, middleware authorizeDador |
| `/api/docs/maestros/choferes` | Agregar middleware authorizeDador |
| `/api/docs/maestros/camiones` | Agregar middleware authorizeDador |
| `/api/docs/maestros/acoplados` | Agregar middleware authorizeDador |
| `/api/docs/equipos` | Agregar middleware authorizeDador |
| `/api/docs/approval/pending` | Agregar rol DADOR_CARGA, filtro por dadorId |
| `/api/docs/approval/pending/:id/approve` | Agregar rol DADOR_CARGA, validación de acceso |
| `/api/docs/approval/pending/:id/reject` | Agregar rol DADOR_CARGA, validación de acceso |

#### 4. Nuevos Endpoints
- `POST /api/docs/dadores/:dadorId/bulk-search` - Búsqueda masiva por patentes
- `POST /api/docs/dadores/:dadorId/bulk-zip` - ZIP estructurado
- `GET /api/docs/dadores/:dadorId/equipos` - Listar equipos del dador
- `GET /api/docs/dadores/:dadorId/documentos/pending` - Docs pendientes del dador

### Cambios en Frontend

#### 1. Nuevos Componentes
```
apps/frontend/src/features/documentos/components/
├── BulkPatentesSearch.tsx (NUEVO - reutilizable cliente/dador)
├── DocumentPreviewModal.tsx (NUEVO - reutilizable)
└── DadorApprovalQueue.tsx (NUEVO - específico dador)
```

#### 2. Nuevas Páginas
```
apps/frontend/src/features/documentos/pages/
└── DadoresMaestrosPage.tsx (NUEVO)
```

#### 3. Modificar DadoresPortalPage
- Agregar sección de búsqueda masiva
- Agregar sección de aprobación de documentos
- Agregar link a página de maestros
- Agregar preview de documentos

---

## 🎯 Plan de Implementación

### Fase 1: Backend - Roles y Autorización (4-6 horas)

#### 1. Implementar Rol DADOR_CARGA
- Agregar al enum `UserRole`
- Actualizar validaciones y tipos
- Agregar campo `dadorCargaId` en `metadata` del usuario

#### 2. Implementar Middleware `authorizeDador`
- Validar rol DADOR_CARGA
- Validar acceso a dadorCargaId
- Inyectar dadorCargaId automáticamente

#### 3. Aplicar Middleware a Endpoints Existentes
- Maestros (empresas, choferes, camiones, acoplados)
- Equipos
- Documentos
- Aprobación

---

### Fase 2: Backend - Nuevos Endpoints (6-8 horas)

#### 4. Endpoint de Búsqueda Masiva
`POST /api/docs/dadores/:dadorId/bulk-search`

#### 5. Endpoint de ZIP Estructurado
`POST /api/docs/dadores/:dadorId/bulk-zip`

#### 6. Endpoints Auxiliares
- `GET /api/docs/dadores/:dadorId/equipos`
- `GET /api/docs/dadores/:dadorId/documentos/pending`

---

### Fase 3: Frontend - Componentes Reutilizables (4-6 horas)

#### 7. Componente de Búsqueda Masiva
`BulkPatentesSearch.tsx` (reutilizable cliente/dador)

#### 8. Componente de Preview
`DocumentPreviewModal.tsx`

#### 9. Componente de Aprobación para Dador
`DadorApprovalQueue.tsx`

---

### Fase 4: Frontend - Integración en Portal Dador (4-6 horas)

#### 10. Actualizar DadoresPortalPage
- Integrar búsqueda masiva
- Integrar aprobación de documentos
- Agregar preview de documentos

#### 11. Nueva Página de Maestros
`DadoresMaestrosPage.tsx`

---

## 📊 Estimación de Esfuerzo

| Fase | Componente | Complejidad | Tiempo |
|------|-----------|-------------|--------|
| **1** | Rol + Middleware | Media | 4-6h |
| **2** | Nuevos Endpoints | Alta | 6-8h |
| **3** | Componentes Frontend | Media | 4-6h |
| **4** | Integración Portal | Media | 4-6h |
| **Total** | - | - | **18-26 horas** |

---

## 🔒 Consideraciones de Seguridad

### 1. Aislamiento por Dador
- ✅ Todos los endpoints deben validar que el usuario solo acceda a sus datos
- ✅ Inyectar automáticamente `dadorCargaId` para usuarios con rol DADOR_CARGA
- ✅ Validar que documentos, equipos y maestros pertenezcan al dador

### 2. Aprobación de Documentos
- ⚠️ Los dadores solo pueden aprobar documentos de estado `PENDIENTE_APROBACION`
- ⚠️ Los dadores NO pueden cambiar el `templateId` ni `entityType` sin validación
- ⚠️ Registrar en audit log quién aprobó (userId + dadorId)

### 3. Rate Limiting
- ✅ Aplicar límites más estrictos a operaciones masivas
- ✅ Búsqueda masiva: máximo 100 patentes
- ✅ ZIP masivo: máximo 100 equipos
- ✅ Aprobación batch: máximo 100 documentos

### 4. Auditoría
- ✅ Loggear todas las aprobaciones con userId, dadorId, documentId
- ✅ Loggear búsquedas masivas
- ✅ Loggear generación de ZIPs
- ✅ Loggear accesos a maestros

---

## 🧪 Plan de Testing

### Tests Unitarios
- ✅ Middleware `authorizeDador`
- ✅ Filtrado automático por dadorCargaId
- ✅ Validación de permisos en aprobación

### Tests de Integración
- ✅ DADOR_CARGA solo ve sus equipos
- ✅ DADOR_CARGA solo ve sus choferes/camiones/acoplados
- ✅ DADOR_CARGA solo aprueba sus documentos
- ✅ ADMIN puede acceder a cualquier dador
- ✅ SUPERADMIN puede acceder a cualquier dador

### Tests E2E
- ✅ Búsqueda masiva por patentes (dador A no ve equipos de dador B)
- ✅ Generación de ZIP (dador A solo descarga sus documentos)
- ✅ Aprobación de documentos (dador A no aprueba docs de dador B)
- ✅ Consulta de maestros (dador A solo ve sus maestros)

---

## 📝 Notas Importantes

### Compatibilidad con Portal de Clientes
- Los componentes `BulkPatentesSearch` y `DocumentPreviewModal` deben ser **reutilizables**
- Los endpoints de dadores deben seguir la misma estructura que los de clientes
- Los ZIPs deben tener la misma estructura organizativa

### Migración de Usuarios Existentes
Si existen usuarios que actualmente usan ADMIN/SUPERADMIN y deberían ser DADOR_CARGA:

```sql
-- Migración de usuarios a rol DADOR_CARGA
UPDATE platform_users 
SET role = 'DADOR_CARGA', 
    metadata = jsonb_set(COALESCE(metadata, '{}'), '{dadorCargaId}', '1') 
WHERE email IN ('dador1@example.com', 'dador2@example.com');
```

### Alternativa: EndUsers como Dadores
Si los dadores son EndUsers (no Users del backend):

```typescript
// Usar EndUserRole
export enum EndUserRole {
  CLIENT = 'CLIENT',
  CONTACT = 'CONTACT',
  DADOR = 'DADOR', // NUEVO
}
```

---

## 🚀 Próximos Pasos

1. **Decidir**: ¿Los dadores serán `User` (platform_users) o `EndUser` (end_users)?
2. **Aprobar** plan de implementación
3. **Priorizar** fases según urgencia
4. **Implementar** en orden:
   - Fase 1: Roles y autorización (crítico)
   - Fase 2: Endpoints (necesario)
   - Fase 3: Componentes frontend (deseable)
   - Fase 4: Integración portal (deseable)
5. **Testing** exhaustivo de aislamiento entre dadores

---

## 📈 Beneficios

### Para Dadores
- ✅ Autonomía en gestión de documentación
- ✅ Aprobación rápida sin depender de ADMIN
- ✅ Visibilidad total de sus equipos y maestros
- ✅ Descargas masivas organizadas

### Para Administradores
- ✅ Menos carga operativa (dadores se autogestiona)
- ✅ Mejor seguridad (dadores aislados entre sí)
- ✅ Auditoría clara de quién aprobó qué

### Para el Sistema
- ✅ Escalabilidad (cada dador gestiona lo suyo)
- ✅ Seguridad (aislamiento estricto)
- ✅ Trazabilidad (logs de todas las operaciones)

---

**Fecha de Análisis**: 6 de Noviembre, 2025  
**Versión del Documento**: 1.0  
**Estado**: ✅ Análisis Completo

