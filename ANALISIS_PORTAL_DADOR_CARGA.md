# Análisis: Portal de Dador de Carga - Gestión Completa y Autónoma

## 📋 Resumen del Requerimiento

El **dador de carga** necesita autonomía completa para gestionar sus propios equipos y documentación:

1. **Cargar documentos** solo de sus equipos, empresas transportistas, choferes, camiones y acoplados
2. **Aprobar documentos** que hayan sido clasificados por IA (actualmente solo ADMIN puede)
3. **Consultar** solo sus propias entidades:
   - Empresas transportistas
   - Choferes
   - Camiones
   - Acoplados
   - Equipos
4. **Búsqueda por patentes** similar a la del portal del cliente
5. **Control de acceso estricto**: Solo ver/modificar lo que le pertenece

---

## ✅ Funcionalidades Existentes

### Backend (Microservicio Documentos)

#### **Modelos de Datos con Relación a Dador**
```
DadorCarga (tabla principal)
├── EmpresaTransportista (FK: dadorCargaId)
├── Chofer (FK: dadorCargaId)
├── Camion (FK: dadorCargaId)
├── Acoplado (FK: dadorCargaId)
├── Equipo (FK: dadorCargaId)
└── Document (FK: dadorCargaId)
```

✅ Todos los modelos principales tienen `dadorCargaId` y `tenantEmpresaId` para control de acceso.

#### **Endpoints Disponibles para Dadores**

| Endpoint | Método | Autorización Actual | Funcionalidad |
|----------|--------|---------------------|---------------|
| `/api/docs/dadores` | GET | ✅ Autenticado | Listar dadores |
| `/api/docs/dadores` | POST | ❌ ADMIN/SUPERADMIN | Crear dador |
| `/api/docs/dadores/:id` | PUT | ❌ ADMIN/SUPERADMIN | Actualizar dador |
| `/api/docs/dadores/:id` | DELETE | ❌ ADMIN/SUPERADMIN | Eliminar dador |
| `/api/docs/equipos/minimal` | POST | ❌ ADMIN/SUPERADMIN | Crear equipo mínimo |
| `/api/docs/equipos/:id/check-missing-now` | POST | ❌ ADMIN/SUPERADMIN | Revisar faltantes |
| `/api/docs/equipos/:id/request-missing` | POST | ❌ ADMIN/SUPERADMIN | Solicitar docs al chofer |
| `/api/docs/documents/upload` | POST | ❌ ADMIN/SUPERADMIN | Subir documento |
| `/api/docs/approval/pending` | GET | ❌ ADMIN/SUPERADMIN | Listar docs pendientes |
| `/api/docs/approval/pending/:id/approve` | POST | ❌ ADMIN/SUPERADMIN | Aprobar documento |
| `/api/docs/approval/pending/:id/reject` | POST | ❌ ADMIN/SUPERADMIN | Rechazar documento |

**Problema**: Todos los endpoints de gestión requieren ADMIN/SUPERADMIN.

#### **Servicios Existentes**
- ✅ `DadorService` - CRUD de dadores
- ✅ `EquipoService` - Gestión de equipos
- ✅ `ComplianceService` - Evaluación de cumplimiento
- ✅ `DocumentsService` - Gestión de documentos
- ✅ `ApprovalService` - Aprobación de documentos
- ✅ `NotificationService` - Notificaciones WhatsApp

### Frontend

#### **Páginas Existentes**
- ✅ `DadoresPortalPage` - Portal con funcionalidades:
  - Alta rápida de equipo (DNI + patente tractor + acoplado)
  - Importación CSV de equipos masiva
  - Carga masiva de documentos con IA
  - Acciones por equipo (revisar faltantes, solicitar docs, descargar ZIP)

#### **Limitaciones Actuales**
- ❌ No hay rol específico de EndUser para dadores
- ❌ Dadores operan a través de usuarios ADMIN de plataforma
- ❌ No pueden aprobar sus propios documentos
- ❌ No hay vistas filtradas automáticamente por dadorId
- ❌ No hay búsqueda masiva por patentes para dadores
- ❌ No pueden consultar maestros (empresas, choferes, etc.) de forma autónoma

---

## ❌ Funcionalidades Faltantes

### 1. **Rol y Autenticación de Dadores** 🔴

**Requerimiento**: Los dadores deben poder autenticarse con su propio usuario (EndUser) y tener permisos específicos.

**Estado Actual**: 
- Existe modelo `EndUser` con roles `CLIENT` y `CONTACT`
- No existe rol `DADOR` en EndUserRole
- Los dadores operan a través de usuarios de plataforma (User con rol ADMIN)

**Necesidad**:

#### **Opción A: Agregar Rol DADOR a EndUser** (Recomendado)
```typescript
// apps/backend/prisma/schema.prisma
enum EndUserRole {
  CLIENT
  CONTACT
  DADOR  // ← Nuevo rol
}

// apps/documentos/src/prisma/schema.prisma
// No tiene EndUser, pero puede usar el sistema de auth del backend principal
```

**Ventajas**:
- Separación clara entre usuarios de plataforma (ADMIN) y usuarios finales (DADOR)
- Control de acceso más granular
- Auditoría clara de quién hace qué
- Los dadores pueden tener su propio login/password

**Desventajas**:
- Requiere migración de base de datos
- Requiere actualizar sistema de autenticación

#### **Opción B: Middleware de Control por DadorId** (Más rápida)
```typescript
// Middleware que resuelve dadorId desde el user autenticado
export const resolveDadorFromUser = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
) => {
  const user = req.user;
  
  // Si el user tiene metadata con dadorCargaId
  if (user.metadata?.dadorCargaId) {
    req.dadorId = user.metadata.dadorCargaId;
  }
  
  next();
};

// Middleware que filtra por dadorId automáticamente
export const scopeToDador = (req: AuthRequest) => {
  // Agregar filtro a todas las queries
  return { dadorCargaId: req.dadorId };
};
```

**Ventajas**:
- No requiere cambios en base de datos
- Implementación más rápida
- Usa infraestructura existente

**Desventajas**:
- Menos elegante
- Más difícil de mantener
- No escala bien si se agregan más roles

---

### 2. **Permisos de Aprobación para Dadores** 🔴

**Requerimiento**: Los dadores deben poder aprobar documentos que fueron clasificados por IA.

**Estado Actual**:
- Solo ADMIN/SUPERADMIN pueden aprobar (endpoints en `approval.routes.ts`)
- Servicio de aprobación ya existe (`ApprovalService`)

**Necesidad**:

```typescript
// Nuevo middleware para permitir aprobación a dadores
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
  if (user.role === 'DADOR' || req.dadorId) {
    const docId = Number(req.params.id);
    const doc = await prisma.document.findUnique({
      where: { id: docId },
      select: { dadorCargaId: true },
    });
    
    if (!doc) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }
    
    // Verificar que el documento pertenece al dador
    const dadorId = req.dadorId || user.metadata?.dadorCargaId;
    if (doc.dadorCargaId === dadorId) {
      return next();
    }
  }
  
  return res.status(403).json({ message: 'No tienes permisos para aprobar este documento' });
};
```

**Actualización de rutas**:
```typescript
// apps/documentos/src/routes/approval.routes.ts

// ANTES:
router.post('/pending/:id/approve', 
  authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), 
  ApprovalController.approveDocument
);

// DESPUÉS:
router.post('/pending/:id/approve', 
  authorizeDadorOrAdmin,  // ← Nuevo middleware
  ApprovalController.approveDocument
);
```

---

### 3. **Vistas Filtradas por Dador** 🟡

**Requerimiento**: Los dadores solo deben ver sus propias entidades.

**Estado Actual**:
- Los endpoints existen pero no filtran automáticamente por dadorId
- Se requiere pasar `?dadorCargaId=X` manualmente

**Necesidad**:

```typescript
// Middleware que agrega filtro automático por dadorId
export const autoFilterByDador = (req: AuthRequest, res: Response, next: NextFunction) => {
  const dadorId = req.dadorId || req.user?.metadata?.dadorCargaId;
  
  if (dadorId) {
    // Agregar filtro a la query
    req.query.dadorCargaId = String(dadorId);
  }
  
  next();
};
```

**Endpoints a actualizar**:
```typescript
// apps/documentos/src/routes/maestros.routes.ts

router.use(authenticate);
router.use(autoFilterByDador);  // ← Agregar middleware

// Ahora todos los listados se filtran automáticamente:
router.get('/empresas', ...);  // Solo muestra empresas del dador
router.get('/choferes', ...);  // Solo muestra choferes del dador
router.get('/camiones', ...);  // Solo muestra camiones del dador
router.get('/acoplados', ...);  // Solo muestra acoplados del dador
```

---

### 4. **Búsqueda Masiva por Patentes** 🟡

**Requerimiento**: Similar al portal del cliente, poder pegar listado de patentes y ver estado de documentación.

**Estado Actual**:
- Existe endpoint `/api/docs/search` pero solo búsqueda individual
- Existe endpoint `/api/docs/equipos/search/dnis` para búsqueda masiva por DNI

**Necesidad**:

```typescript
// Nuevo endpoint: POST /api/docs/equipos/search/patentes
router.post('/search/patentes', async (req: AuthRequest, res) => {
  const { patentes } = req.body;
  const dadorId = req.dadorId;
  
  // Normalizar patentes
  const normalized = patentes.map(normalizePlate);
  
  // Buscar camiones por patentes
  const camiones = await prisma.camion.findMany({
    where: {
      tenantEmpresaId: req.tenantId,
      dadorCargaId: dadorId,  // ← Filtro por dador
      patenteNorm: { in: normalized },
    },
  });
  
  // Buscar equipos asociados
  // ...
  
  res.json({ success: true, data: equipos });
});
```

---

### 5. **Portal de Consultas de Maestros** 🟢

**Requerimiento**: El dador debe poder consultar sus propias empresas transportistas, choferes, camiones y acoplados.

**Estado Actual**:
- Endpoints existen pero requieren ADMIN/SUPERADMIN para escritura
- Frontend no tiene vistas de consulta

**Necesidad**:

**Backend**: Actualizar permisos de lectura (ya funcionan con middleware de autofiltro)

**Frontend**: Crear nueva página o sección:
```typescript
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

---

## 🎯 Plan de Implementación

### **Fase 1: Control de Acceso y Permisos** (Prioridad Alta 🔥)

#### Opción A: Rol EndUser DADOR (Recomendado - 10-12 horas)

1. **Migración de Base de Datos**
   ```sql
   -- Agregar rol DADOR a EndUserRole
   ALTER TYPE "EndUserRole" ADD VALUE 'DADOR';
   ```

2. **Crear EndUsers para Dadores**
   ```typescript
   // Script de migración: crear EndUser por cada DadorCarga
   for (const dador of dadores) {
     await prisma.endUser.create({
       data: {
         email: dador.email,  // Requiere agregar email a DadorCarga
         role: 'DADOR',
         empresaId: dador.tenantEmpresaId,
         metadata: { dadorCargaId: dador.id },
       },
     });
   }
   ```

3. **Middleware de Autenticación Específico**
   ```typescript
   // apps/documentos/src/middlewares/dador-auth.middleware.ts
   export const authenticateDador = async (req, res, next) => {
     // Similar a authenticate pero verifica rol DADOR
     // Resuelve dadorId desde metadata del EndUser
   };
   ```

4. **Actualizar Rutas con Nuevo Rol**

#### Opción B: Metadata en User (Más Rápida - 4-5 horas)

1. **Agregar DadorId a Metadata de User**
   ```typescript
   // Actualizar usuarios existentes
   await prisma.user.update({
     where: { id: userId },
     data: {
       metadata: { dadorCargaId: 1 },
     },
   });
   ```

2. **Middleware de Resolución**
   ```typescript
   // apps/documentos/src/middlewares/dador-resolver.middleware.ts
   export const resolveDadorId = (req, res, next) => {
     req.dadorId = req.user?.metadata?.dadorCargaId;
     next();
   };
   ```

3. **Aplicar Middleware Globalmente**
   ```typescript
   router.use(authenticate);
   router.use(resolveDadorId);
   ```

---

### **Fase 2: Permisos de Aprobación** (Prioridad Alta 🔥) - 2-3 horas

1. **Crear Middleware de Autorización Flexible**
   - `authorizeDadorOrAdmin` para aprobación de documentos
   - Verificar que documento pertenece al dador

2. **Actualizar Rutas de Aprobación**
   - `/api/docs/approval/pending/:id/approve`
   - `/api/docs/approval/pending/:id/reject`
   - `/api/docs/approval/pending` (listar solo sus docs pendientes)

3. **Actualizar Frontend**
   - Mostrar cola de aprobación en `DadoresPortalPage`
   - Botones "Aprobar" / "Rechazar"
   - Vista previa de documentos

---

### **Fase 3: Autofiltro y Vistas** (Prioridad Media 🟡) - 3-4 horas

1. **Middleware de Autofiltro**
   ```typescript
   export const autoFilterByDador = (req, res, next) => {
     if (req.dadorId) {
       req.query.dadorCargaId = String(req.dadorId);
     }
     next();
   };
   ```

2. **Aplicar a Rutas de Maestros**
   - `/api/docs/maestros/empresas`
   - `/api/docs/maestros/choferes`
   - `/api/docs/maestros/camiones`
   - `/api/docs/maestros/acoplados`

3. **Actualizar Servicios**
   - Verificar que filtros se aplican correctamente
   - Evitar que dador A vea datos de dador B

---

### **Fase 4: Búsqueda Masiva** (Prioridad Media 🟡) - 3-4 horas

1. **Nuevo Endpoint de Búsqueda Masiva por Patentes**
   - `POST /api/docs/dadores/bulk-search`
   - Similar al de clientes pero con filtro por dadorId

2. **Componente de Búsqueda en Frontend**
   - Reutilizar `BulkPatentesSearch` del cliente
   - Adaptar para dadores

3. **Endpoint de ZIP Estructurado**
   - `POST /api/docs/dadores/bulk-zip`
   - Generar ZIP con misma estructura que cliente

---

### **Fase 5: Portal de Maestros** (Prioridad Baja 🟢) - 4-5 horas

1. **Nueva Página de Consultas**
   - `DadorMaestrosPage.tsx`
   - Tabs para cada tipo de entidad
   - Tablas con búsqueda y filtros

2. **Integración en Menú**
   - Agregar link en `DadoresPortalPage`
   - Configurar ruta en App.tsx

---

## 📦 Archivos a Crear/Modificar

### Opción A: Rol EndUser DADOR

#### Backend
```
apps/backend/
├── prisma/
│   ├── migrations/
│   │   └── add_dador_role_to_enduser/
│   │       └── migration.sql (CREAR)
│   └── schema.prisma (MODIFICAR - agregar DADOR a EndUserRole)
└── src/
    └── scripts/
        └── migrate-dadores-to-endusers.ts (CREAR)

apps/documentos/
└── src/
    ├── middlewares/
    │   ├── dador-auth.middleware.ts (CREAR)
    │   └── dador-resolver.middleware.ts (CREAR)
    ├── routes/
    │   ├── approval.routes.ts (MODIFICAR)
    │   ├── maestros.routes.ts (MODIFICAR)
    │   └── dadores.routes.ts (MODIFICAR)
    └── controllers/
        └── approval.controller.ts (MODIFICAR)
```

#### Frontend
```
apps/frontend/
└── src/
    ├── pages/
    │   └── DadoresPortalPage.tsx (MODIFICAR)
    ├── features/documentos/
    │   ├── pages/
    │   │   └── DadorMaestrosPage.tsx (CREAR)
    │   └── components/
    │       ├── DadorApprovalQueue.tsx (CREAR)
    │       └── DadorBulkSearch.tsx (CREAR)
    └── App.tsx (MODIFICAR - agregar rutas)
```

### Opción B: Metadata en User

#### Backend
```
apps/documentos/
└── src/
    ├── middlewares/
    │   ├── dador-resolver.middleware.ts (CREAR)
    │   └── auto-filter.middleware.ts (CREAR)
    └── routes/
        ├── approval.routes.ts (MODIFICAR)
        └── maestros.routes.ts (MODIFICAR)
```

---

## 🔒 Matriz de Permisos

| Acción | ADMIN | SUPERADMIN | DADOR | CLIENTE |
|--------|-------|------------|-------|---------|
| Ver sus propios dadores | ✅ | ✅ | ✅ | ❌ |
| Ver sus propias empresas | ✅ | ✅ | ✅ | ❌ |
| Ver sus propios choferes | ✅ | ✅ | ✅ | ❌ |
| Ver sus propios camiones | ✅ | ✅ | ✅ | ✅ |
| Ver sus propios acoplados | ✅ | ✅ | ✅ | ✅ |
| Ver sus propios equipos | ✅ | ✅ | ✅ | ✅ |
| Crear equipo | ✅ | ✅ | ✅ | ❌ |
| Subir documentos propios | ✅ | ✅ | ✅ | ❌ |
| Aprobar documentos propios | ✅ | ✅ | ✅ | ❌ |
| Rechazar documentos propios | ✅ | ✅ | ✅ | ❌ |
| Ver documentos de otros dadores | ✅ | ✅ | ❌ | ❌ |
| Aprobar docs de otros dadores | ✅ | ✅ | ❌ | ❌ |
| Crear dador | ✅ | ✅ | ❌ | ❌ |
| Eliminar dador | ❌ | ✅ | ❌ | ❌ |
| Configurar sistema | ❌ | ✅ | ❌ | ❌ |

---

## 📊 Estimación de Esfuerzo

| Fase | Tarea | Complejidad | Tiempo |
|------|-------|-------------|--------|
| **Fase 1A** | Migración rol DADOR | Alta | 6-8h |
| **Fase 1B** | Metadata en User | Media | 4-5h |
| **Fase 2** | Permisos de aprobación | Media | 2-3h |
| **Fase 3** | Autofiltro y vistas | Media | 3-4h |
| **Fase 4** | Búsqueda masiva | Media | 3-4h |
| **Fase 5** | Portal de maestros | Media | 4-5h |

### Opción A (Rol DADOR): **18-24 horas**
### Opción B (Metadata): **16-21 horas**

---

## 🚦 Recomendación

### **Implementar Opción B (Metadata)** para MVP rápido

**Razones**:
1. ✅ No requiere cambios en base de datos
2. ✅ Implementación más rápida (16-21h vs 18-24h)
3. ✅ Menos riesgo de bugs en migración
4. ✅ Fácil de revertir si hay problemas

**Migrar a Opción A (Rol DADOR)** en futuro cuando:
- Se necesite escalar a más roles
- Se requiera auditoría más granular
- Se agreguen más tipos de usuarios finales

---

## 💡 Consideraciones de Seguridad

### Control de Acceso
1. **Verificación doble**: Siempre validar `tenantEmpresaId` Y `dadorCargaId`
2. **Filtrado en queries**: Nunca confiar solo en frontend, filtrar en backend
3. **Logs de auditoría**: Loggear todas las aprobaciones/rechazos
4. **Rate limiting**: Aplicar límites más estrictos a aprobaciones masivas

### Validaciones
```typescript
// Siempre validar que el dador tenga acceso
const canAccess = async (dadorId: number, resourceId: number, resourceType: string) => {
  const resource = await prisma[resourceType].findUnique({
    where: { id: resourceId },
    select: { dadorCargaId: true, tenantEmpresaId: true },
  });
  
  return resource?.dadorCargaId === dadorId;
};
```

---

## 🧪 Plan de Testing

### Tests de Seguridad
```typescript
describe('Dador Access Control', () => {
  it('should NOT allow dador A to approve documents of dador B', async () => {
    // Test cross-dador access
  });
  
  it('should filter equipos by dadorId automatically', async () => {
    // Test autofiltro
  });
  
  it('should allow dador to approve their own documents', async () => {
    // Test aprobación propia
  });
});
```

### Tests de Integración
- Flujo completo: subir → clasificar → aprobar → descargar
- Búsqueda masiva por patentes
- Generación de ZIP

---

## 📝 Próximos Pasos

1. **Decidir**: Opción A (Rol DADOR) vs Opción B (Metadata)
2. **Sprint 1** (Semana 1): Control de acceso (Fase 1 + 2)
3. **Sprint 2** (Semana 2): Vistas y búsqueda (Fase 3 + 4)
4. **Sprint 3** (Semana 3): Portal maestros + testing (Fase 5)

---

**Fecha de Análisis**: 6 de Noviembre, 2025  
**Versión del Documento**: 1.0  
**Estado**: ✅ Análisis Completo

