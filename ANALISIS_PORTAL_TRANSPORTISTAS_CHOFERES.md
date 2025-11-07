# Análisis: Portal de Transportistas y Choferes - Acceso Compartido

## 📋 Resumen del Requerimiento

**Empresas Transportistas** y **Choferes** compartirán el mismo nivel de acceso al sistema, permitiéndoles:

1. **Ver solo SUS propios equipos** (los que tienen asociados)
2. **Subir documentos** de sus equipos, choferes, camiones y acoplados
3. **Consultar estado** de su documentación
4. **Ver solo SUS maestros** (choferes, camiones, acoplados propios)
5. **Descargar** su propia documentación

**NO podrán**:
- ❌ Aprobar documentos (eso lo hace el dador o admin)
- ❌ Ver equipos de otros transportistas/choferes
- ❌ Ver datos de otros dadores
- ❌ Modificar configuración global
- ❌ Eliminar documentos

---

## 🔑 Modelo de Datos: Relaciones Clave

### EmpresaTransportista
```typescript
model EmpresaTransportista {
  id              Int      @id
  dadorCargaId    Int      // Pertenece a UN dador
  tenantEmpresaId Int      // Pertenece a UN tenant
  cuit            String   // Identificador único
  razonSocial     String
  
  // Relaciones
  dador     DadorCarga
  choferes  Chofer[]     // Choferes de esta empresa
  camiones  Camion[]     // Camiones de esta empresa
  acoplados Acoplado[]   // Acoplados de esta empresa
  equipos   Equipo[]     // Equipos formados por esta empresa
}
```

### Chofer
```typescript
model Chofer {
  id                     Int      @id
  dadorCargaId          Int       // Pertenece a UN dador
  empresaTransportistaId Int?      // OPCIONAL: puede pertenecer a una empresa
  tenantEmpresaId        Int       // Pertenece a UN tenant
  dni                    String    // Identificador único
  dniNorm                String    // DNI normalizado
  phones                 String[]  // Teléfonos WhatsApp
  
  // Relaciones
  dador                DadorCarga
  empresaTransportista EmpresaTransportista? // Puede o no tener empresa
}
```

### Relaciones con Equipos
```typescript
model Equipo {
  id                     Int
  dadorCargaId          Int       // Pertenece al dador
  empresaTransportistaId Int?      // OPCIONAL: empresa que opera el equipo
  driverId              Int       // Chofer del equipo
  truckId               Int       // Camión del equipo
  trailerId             Int?      // Acoplado (opcional)
}
```

---

## 📊 Jerarquía de Pertenencia

```
Tenant (Empresa dueña de la plataforma)
  ↓
DadorCarga
  ↓
  ├── EmpresaTransportista (opcional)
  │   ├── Chofer (con empresaTransportistaId)
  │   ├── Camion (con empresaTransportistaId)
  │   ├── Acoplado (con empresaTransportistaId)
  │   └── Equipo (con empresaTransportistaId)
  │
  └── Chofer independiente (sin empresaTransportistaId)
      ├── Camion (propio)
      ├── Acoplado (propio)
      └── Equipo (propio)
```

---

## ✅ Funcionalidades Existentes

### Backend

#### Endpoints de Empresas Transportistas
| Endpoint | Método | Funcionalidad | Roles Actuales |
|----------|--------|---------------|----------------|
| `/api/docs/empresas-transportistas` | GET | Listar empresas | ADMIN, SUPERADMIN |
| `/api/docs/empresas-transportistas` | POST | Crear empresa | ADMIN, SUPERADMIN |
| `/api/docs/empresas-transportistas/:id` | GET | Ver detalles | ADMIN, SUPERADMIN, OPERATOR |
| `/api/docs/empresas-transportistas/:id` | PUT | Actualizar empresa | ADMIN, SUPERADMIN |
| `/api/docs/empresas-transportistas/:id` | DELETE | Eliminar empresa | ADMIN, SUPERADMIN |
| `/api/docs/empresas-transportistas/:id/choferes` | GET | Choferes de empresa | ADMIN, SUPERADMIN, OPERATOR |
| `/api/docs/empresas-transportistas/:id/equipos` | GET | Equipos de empresa | ADMIN, SUPERADMIN, OPERATOR |

#### Endpoints de Transportistas/Choferes
| Endpoint | Método | Funcionalidad | Estado |
|----------|--------|---------------|--------|
| `/api/docs/transportistas/mis-equipos` | GET | Equipos del chofer | ✅ Existe (mapea por DNI) |
| `/api/docs/batch/transportistas/documentos/batch` | POST | Carga masiva docs | ✅ Existe (usa dador por defecto) |

#### Endpoints de Maestros
| Endpoint | Método | Filtro Actual | Acceso Transportista |
|----------|--------|---------------|---------------------|
| `/api/docs/maestros/choferes` | GET | Por dadorCargaId | ⚠️ Necesita filtro adicional |
| `/api/docs/maestros/camiones` | GET | Por dadorCargaId | ⚠️ Necesita filtro adicional |
| `/api/docs/maestros/acoplados` | GET | Por dadorCargaId | ⚠️ Necesita filtro adicional |

### Frontend

#### TransportistasPortalPage (Existente)
✅ **Ya implementado**:
- Dashboard de cumplimiento
- Alta rápida de equipos
- Carga masiva de documentos con IA
- Ver "mis equipos"
- Calendario inteligente
- Perfil móvil

❌ **Falta implementar**:
- Búsqueda por patentes (limitada a sus equipos)
- Consulta de maestros (choferes, camiones, acoplados propios)
- Vista de documentación por equipo
- Descarga estructurada (ZIP)

---

## ❌ Funcionalidades Faltantes

### 1. **Nuevos Roles** ❌

**Requerimiento**: Diferenciar entre empresa transportista y chofer individual.

**Propuesta**:
```typescript
export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  DADOR_CARGA = 'DADOR_CARGA',
  TRANSPORTISTA = 'TRANSPORTISTA',  // NUEVO (empresa o chofer)
}
```

**Alternativa con 2 roles**:
```typescript
export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  DADOR_CARGA = 'DADOR_CARGA',
  EMPRESA_TRANSPORTISTA = 'EMPRESA_TRANSPORTISTA',  // NUEVO
  CHOFER = 'CHOFER',                                 // NUEVO
}
```

**✅ Recomendación**: Un solo rol `TRANSPORTISTA` ya que comparten el mismo acceso.

---

### 2. **Middleware de Autorización** ❌

**Requerimiento**: Validar que transportistas/choferes solo accedan a sus datos.

**Necesidad**:
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
    // Validar según tipo:
    // - Si es empresa: filtrar por empresaTransportistaId
    // - Si es chofer: filtrar por choferId o DNI
    
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
    req.body.transportistaId = transportistaId;
    req.body.choferId = choferId;
    req.body.choferDni = choferDni;
    
    next();
    return;
  }
  
  res.status(403).json({ success: false, message: 'Permisos insuficientes' });
};
```

---

### 3. **Filtrado de Equipos por Transportista** ❌

**Requerimiento**: Transportistas solo ven equipos donde ellos están involucrados.

**Implementación**:
```typescript
// Equipos donde el transportista está involucrado
// Puede ser por:
// 1. empresaTransportistaId en el equipo
// 2. choferId como driver del equipo
// 3. camionId que pertenece al transportista
// 4. acopladoId que pertenece al transportista

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
  
  // Si es chofer por DNI: buscar por DNI normalizado
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
      clientes: true,
    },
    orderBy: { validFrom: 'desc' },
  });
}
```

---

### 4. **Filtrado de Maestros por Transportista** ❌

**Requerimiento**: Transportistas solo ven choferes/camiones/acoplados que les pertenecen.

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

// Camiones del transportista
static async getCamionesByTransportista(
  tenantId: number,
  empresaTransportistaId?: number,
  choferId?: number
): Promise<Camion[]> {
  const where: any = {
    tenantEmpresaId: tenantId,
    activo: true,
  };
  
  if (empresaTransportistaId) {
    // Empresa: todos sus camiones
    where.empresaTransportistaId = empresaTransportistaId;
  } else if (choferId) {
    // Chofer: camiones que usa en sus equipos
    const equipos = await prisma.equipo.findMany({
      where: { driverId: choferId },
      select: { truckId: true },
    });
    where.id = { in: equipos.map(e => e.truckId) };
  }
  
  return await prisma.camion.findMany({ where });
}

// Similar para acoplados...
```

---

### 5. **Búsqueda por Patentes (Transportistas)** ❌

**Requerimiento**: Buscar por patentes pero solo en sus propios equipos.

**Endpoint**: `POST /api/docs/transportistas/bulk-search`

```typescript
static async bulkSearchByPatentesTransportista(
  tenantId: number,
  patentes: string[],
  empresaTransportistaId?: number,
  choferId?: number
): Promise<{ equipos: any[]; notFound: string[] }> {
  const normalizedPatentes = patentes.map(p => normalizePlate(p));
  const uniquePatentes = [...new Set(normalizedPatentes)];
  
  // Buscar camiones del transportista que coincidan con las patentes
  const camionesWhere: any = {
    tenantEmpresaId: tenantId,
    patenteNorm: { in: uniquePatentes },
    activo: true,
  };
  
  if (empresaTransportistaId) {
    camionesWhere.empresaTransportistaId = empresaTransportistaId;
  } else if (choferId) {
    // Buscar camiones que el chofer usa
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
  const camionIds = camiones.map(c => c.id);
  const equipos = await prisma.equipo.findMany({
    where: {
      tenantEmpresaId: tenantId,
      truckId: { in: camionIds },
      OR: [
        { validTo: null },
        { validTo: { gte: new Date() } },
      ],
    },
    include: {
      empresaTransportista: true,
      clientes: true,
    },
  });
  
  // Enriquecer con documentos
  // ... (similar a dador/cliente)
  
  return { equipos, notFound };
}
```

---

### 6. **Descarga de ZIP (Transportistas)** ❌

**Requerimiento**: Descargar documentación de sus equipos en formato estructurado.

**Endpoint**: `POST /api/docs/transportistas/bulk-zip`

**Estructura**: Similar a dador/cliente pero limitado a sus equipos.

---

### 7. **Dashboard de Estado de Documentación** ⚠️

**Estado**: Parcialmente implementado en `DashboardCumplimiento`.

**Necesidad**: Completar con:
- Estado global de cumplimiento
- Alertas de vencimientos
- Documentos faltantes
- Gráficos de estado por equipo

---

## 📊 Matriz de Permisos: Transportistas vs Otros Roles

| Funcionalidad | ADMIN | DADOR_CARGA | TRANSPORTISTA |
|--------------|-------|-------------|---------------|
| **Ver equipos de cualquier dador** | ✅ | ❌ | ❌ |
| **Ver equipos de su dador** | ✅ | 🟢 | ❌ |
| **Ver SUS propios equipos** | ✅ | ✅ | 🟢 |
| **Subir documentos de cualquier equipo** | ✅ | ❌ | ❌ |
| **Subir documentos de su dador** | ✅ | 🟢 | ❌ |
| **Subir documentos de SUS equipos** | ✅ | ✅ | 🟢 |
| **Aprobar documentos** | ✅ | 🟢 | ❌ |
| **Ver maestros de cualquier dador** | ✅ | ❌ | ❌ |
| **Ver maestros de su dador** | ✅ | 🟢 | ❌ |
| **Ver SUS propios maestros** | ✅ | ✅ | 🟢 |
| **Búsqueda masiva (todos)** | ✅ | ❌ | ❌ |
| **Búsqueda masiva (su dador)** | ✅ | 🟢 | ❌ |
| **Búsqueda masiva (sus equipos)** | ✅ | ✅ | 🟢 |
| **Crear/modificar equipos** | ✅ | 🟢 | 🟢 Alta rápida |
| **Eliminar equipos** | ✅ | ✅ | ❌ |

---

## 🎯 Plan de Implementación

### Fase 1: Backend - Roles y Autorización (6-8 horas)

#### 1. Implementar Rol TRANSPORTISTA
- Agregar al enum `UserRole`
- Decidir si usar `metadata` para almacenar:
  - `empresaTransportistaId` (si es empresa)
  - `choferId` o `choferDni` (si es chofer)

#### 2. Implementar Middleware `authorizeTransportista`
- Validar rol TRANSPORTISTA
- Inyectar filtros automáticos
- Permitir a ADMIN/DADOR acceder sin restricciones

#### 3. Aplicar a Endpoints Existentes
- `/api/docs/maestros/*`
- `/api/docs/equipos/*`
- `/api/docs/documents/*`

---

### Fase 2: Backend - Nuevos Endpoints (8-10 horas)

#### 4. Endpoint de Equipos del Transportista
`GET /api/docs/transportistas/mis-equipos` (actualizar existente)

#### 5. Endpoint de Maestros del Transportista
- `GET /api/docs/transportistas/mis-choferes`
- `GET /api/docs/transportistas/mis-camiones`
- `GET /api/docs/transportistas/mis-acoplados`

#### 6. Endpoint de Búsqueda Masiva
`POST /api/docs/transportistas/bulk-search`

#### 7. Endpoint de ZIP
`POST /api/docs/transportistas/bulk-zip`

#### 8. Endpoint de Estado de Documentación
`GET /api/docs/transportistas/compliance-summary`

---

### Fase 3: Frontend - Mejoras en Portal (6-8 horas)

#### 9. Dashboard de Cumplimiento
- Mejorar visualización de estado
- Agregar alertas de vencimientos
- Mostrar documentos faltantes

#### 10. Búsqueda por Patentes
- Reutilizar componente `BulkPatentesSearch`
- Adaptar para transportistas

#### 11. Vista de Maestros
- Choferes propios
- Camiones propios
- Acoplados propios

#### 12. Preview y Descarga
- Reutilizar `DocumentPreviewModal`
- Botón de descarga masiva (ZIP)

---

## 📦 Archivos a Crear/Modificar

### Backend

**Crear**:
```
apps/documentos/src/
├── services/
│   └── transportista.service.ts (NUEVO)
└── middlewares/
    └── auth.middleware.ts (MODIFICAR - agregar authorizeTransportista)
```

**Modificar**:
```
apps/documentos/src/
├── types/
│   └── roles.ts (agregar TRANSPORTISTA)
├── routes/
│   ├── transportistas.routes.ts (expandir)
│   └── maestros.routes.ts (aplicar middleware)
└── schemas/
    └── validation.schemas.ts (agregar schemas)
```

### Frontend

**Crear**:
```
apps/frontend/src/features/documentos/
├── components/
│   └── TransportistaMaestros.tsx (NUEVO)
└── pages/
    └── TransportistasPortalPage.tsx (MODIFICAR)
```

---

## 🔒 Consideraciones de Seguridad

### 1. Aislamiento Estricto
- Transportista solo ve equipos donde está involucrado
- No puede ver equipos de otros transportistas
- No puede ver datos de otros dadores

### 2. Validación de Pertenencia
- Al subir documento: validar que el equipo le pertenece
- Al consultar maestros: validar que le pertenecen
- Al descargar: validar que tiene acceso

### 3. Rate Limiting
```typescript
{
  bulkSearch: 20 patentes/request (menos que dador),
  bulkZip: 20 equipos/request (menos que dador),
  uploadBatch: 20 documentos/request
}
```

---

## 🧪 Plan de Testing

### Tests Unitarios
- Middleware `authorizeTransportista`
- Filtrado por empresaTransportistaId
- Filtrado por choferId
- Validación de pertenencia

### Tests de Integración
- Transportista A no ve equipos de Transportista B
- Chofer solo ve sus equipos
- Empresa ve todos sus choferes/camiones/acoplados
- Admin accede a cualquier transportista

---

## 📈 Estimación de Esfuerzo

| Fase | Componente | Complejidad | Tiempo |
|------|-----------|-------------|--------|
| **1** | Rol + Middleware | Media | 6-8h |
| **2** | Nuevos Endpoints | Alta | 8-10h |
| **3** | Frontend Mejoras | Media | 6-8h |
| **Total** | - | - | **20-26 horas** |

---

## 🎓 Decisiones de Diseño

### ¿Un rol o dos roles?

**Opción A: Un rol `TRANSPORTISTA`**
```typescript
// Usuario puede ser empresa o chofer
user.role = 'TRANSPORTISTA';
user.metadata = {
  type: 'empresa' | 'chofer',
  empresaTransportistaId?: 5,
  choferId?: 10,
  choferDni?: '12345678'
};
```

**Opción B: Dos roles**
```typescript
user.role = 'EMPRESA_TRANSPORTISTA'; // o 'CHOFER'
user.metadata = {
  empresaTransportistaId: 5  // o choferId: 10
};
```

**✅ Recomendación**: **Opción A** (un solo rol) porque:
- Comparten el mismo acceso
- Más simple de mantener
- Menos código duplicado
- El `metadata.type` permite diferenciar cuando sea necesario

---

## 💡 Notas Importantes

### Compatibilidad con Portal Existente
- ✅ `TransportistasPortalPage` ya existe y funciona
- ✅ Carga masiva de documentos ya funciona
- ✅ Endpoint `/mis-equipos` ya existe
- 🟢 Solo necesitamos **agregar** funcionalidades, no reemplazar

### Diferencias con Dador
| Aspecto | Dador | Transportista |
|---------|-------|---------------|
| **Alcance** | Todos sus equipos del dador | Solo equipos donde participa |
| **Aprobación** | ✅ Puede aprobar | ❌ No puede aprobar |
| **Maestros** | Ve todos del dador | Solo los propios |
| **Clientes** | Ve todos | ❌ No ve clientes |
| **Configuración** | Puede modificar notif | ❌ No modifica nada |

---

**Fecha de Análisis**: 6 de Noviembre, 2025  
**Versión del Documento**: 1.0  
**Estado**: ✅ Análisis Completo

