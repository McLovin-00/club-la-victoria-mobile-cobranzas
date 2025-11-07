# Matriz de Permisos y Roles del Sistema

## 🎯 Principio Fundamental

> **Los roles ADMIN y SUPERADMIN conservan TODO el acceso que tenían antes.**  
> **Solo estamos AGREGANDO el rol DADOR_CARGA con permisos limitados.**

---

## 📊 Matriz Completa de Permisos

### Leyenda
- ✅ **Acceso total** (sin restricciones)
- 🟢 **Acceso limitado** (solo a sus propios datos)
- ❌ **Sin acceso**

---

## 1. Gestión de Dadores de Carga

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | DADOR_CARGA |
|--------------|------------|-------|----------|-------------|
| **Listar todos los dadores** | ✅ | ✅ | ✅ | ❌ |
| **Ver datos de cualquier dador** | ✅ | ✅ | ❌ | 🟢 Solo propio |
| **Crear dador** | ✅ | ✅ | ❌ | ❌ |
| **Modificar cualquier dador** | ✅ | ✅ | ❌ | ❌ |
| **Eliminar cualquier dador** | ✅ | ✅ | ❌ | ❌ |

---

## 2. Gestión de Equipos

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | DADOR_CARGA |
|--------------|------------|-------|----------|-------------|
| **Listar equipos de TODOS los dadores** | ✅ | ✅ | ✅ | ❌ |
| **Listar equipos de SU dador** | ✅ | ✅ | ✅ | 🟢 |
| **Crear equipo en CUALQUIER dador** | ✅ | ✅ | ✅ | ❌ |
| **Crear equipo en SU dador** | ✅ | ✅ | ✅ | 🟢 |
| **Modificar equipo de CUALQUIER dador** | ✅ | ✅ | ✅ | ❌ |
| **Modificar equipo de SU dador** | ✅ | ✅ | ✅ | 🟢 |
| **Eliminar equipo de CUALQUIER dador** | ✅ | ✅ | ❌ | ❌ |
| **Buscar por patentes (todos los dadores)** | ✅ | ✅ | ✅ | ❌ |
| **Buscar por patentes (su dador)** | ✅ | ✅ | ✅ | 🟢 |

---

## 3. Maestros (Empresas, Choferes, Camiones, Acoplados)

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | DADOR_CARGA |
|--------------|------------|-------|----------|-------------|
| **Ver maestros de TODOS los dadores** | ✅ | ✅ | ✅ | ❌ |
| **Ver maestros de SU dador** | ✅ | ✅ | ✅ | 🟢 |
| **Crear/Modificar maestros de CUALQUIER dador** | ✅ | ✅ | ✅ | ❌ |
| **Crear/Modificar maestros de SU dador** | ✅ | ✅ | ✅ | 🟢 |
| **Eliminar maestros de CUALQUIER dador** | ✅ | ✅ | ❌ | ❌ |

---

## 4. Documentos

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | DADOR_CARGA |
|--------------|------------|-------|----------|-------------|
| **Subir documentos de CUALQUIER dador** | ✅ | ✅ | ✅ | ❌ |
| **Subir documentos de SU dador** | ✅ | ✅ | ✅ | 🟢 |
| **Ver documentos de CUALQUIER dador** | ✅ | ✅ | ✅ | ❌ |
| **Ver documentos de SU dador** | ✅ | ✅ | ✅ | 🟢 |
| **Descargar documentos de CUALQUIER dador** | ✅ | ✅ | ✅ | ❌ |
| **Descargar documentos de SU dador** | ✅ | ✅ | ✅ | 🟢 |
| **Eliminar documentos de CUALQUIER dador** | ✅ | ✅ | ❌ | ❌ |
| **Carga masiva con IA (cualquier dador)** | ✅ | ✅ | ✅ | ❌ |
| **Carga masiva con IA (su dador)** | ✅ | ✅ | ✅ | 🟢 |

---

## 5. Aprobación de Documentos

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | DADOR_CARGA |
|--------------|------------|-------|----------|-------------|
| **Ver cola de aprobación (todos los dadores)** | ✅ | ✅ | ❌ | ❌ |
| **Ver cola de aprobación (su dador)** | ✅ | ✅ | ❌ | 🟢 |
| **Aprobar docs de CUALQUIER dador** | ✅ | ✅ | ❌ | ❌ |
| **Aprobar docs de SU dador** | ✅ | ✅ | ❌ | 🟢 |
| **Rechazar docs de CUALQUIER dador** | ✅ | ✅ | ❌ | ❌ |
| **Rechazar docs de SU dador** | ✅ | ✅ | ❌ | 🟢 |
| **Aprobación en lote (cualquier dador)** | ✅ | ✅ | ❌ | ❌ |
| **Aprobación en lote (su dador)** | ✅ | ✅ | ❌ | 🟢 |

---

## 6. Búsqueda y Consultas

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | DADOR_CARGA |
|--------------|------------|-------|----------|-------------|
| **Búsqueda masiva por patentes (todos)** | ✅ | ✅ | ✅ | ❌ |
| **Búsqueda masiva por patentes (su dador)** | ✅ | ✅ | ✅ | 🟢 |
| **Búsqueda por DNI (todos)** | ✅ | ✅ | ✅ | ❌ |
| **Búsqueda por DNI (su dador)** | ✅ | ✅ | ✅ | 🟢 |
| **Consulta compliance (todos los equipos)** | ✅ | ✅ | ✅ | ❌ |
| **Consulta compliance (equipos de su dador)** | ✅ | ✅ | ✅ | 🟢 |

---

## 7. Descarga Masiva (ZIP)

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | DADOR_CARGA |
|--------------|------------|-------|----------|-------------|
| **ZIP de equipos de CUALQUIER dador** | ✅ | ✅ | ✅ | ❌ |
| **ZIP de equipos de SU dador** | ✅ | ✅ | ✅ | 🟢 |
| **ZIP estructurado (cualquier dador)** | ✅ | ✅ | ❌ | ❌ |
| **ZIP estructurado (su dador)** | ✅ | ✅ | ❌ | 🟢 |

---

## 8. Clientes

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | DADOR_CARGA |
|--------------|------------|-------|----------|-------------|
| **Ver todos los clientes** | ✅ | ✅ | ✅ | ❌ |
| **Crear/Modificar clientes** | ✅ | ✅ | ❌ | ❌ |
| **Eliminar clientes** | ✅ | ✅ | ❌ | ❌ |
| **Gestionar requisitos de clientes** | ✅ | ✅ | ❌ | ❌ |

---

## 9. Configuración del Sistema

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | DADOR_CARGA |
|--------------|------------|-------|----------|-------------|
| **Ver configuración global** | ✅ | ✅ | ❌ | ❌ |
| **Modificar configuración global** | ✅ | ❌ | ❌ | ❌ |
| **Ver templates de documentos** | ✅ | ✅ | ✅ | ✅ |
| **Crear/Modificar templates** | ✅ | ✅ | ❌ | ❌ |
| **Ver configuración de notificaciones** | ✅ | ✅ | ❌ | 🟢 Solo propio |
| **Modificar configuración de notificaciones** | ✅ | ✅ | ❌ | 🟢 Solo propio |

---

## 🔐 Implementación en Código

### Middleware `authorizeDador`

```typescript
export const authorizeDador = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const user = req.user;
  const targetDadorId = Number(req.params.dadorId || req.body.dadorCargaId || req.query.dadorCargaId);

  // ✅ CRÍTICO: SUPERADMIN y ADMIN tienen acceso TOTAL
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
    next(); // <-- PERMISO TOTAL, SIN RESTRICCIONES
    return;
  }

  // ✅ OPERATOR tiene acceso según la lógica específica del endpoint
  if (user.role === 'OPERATOR') {
    next(); // <-- En la mayoría de endpoints, OPERATOR tiene acceso
    return;
  }

  // 🟢 DADOR_CARGA: SOLO puede acceder a su propio dadorCargaId
  if (user.role === 'DADOR_CARGA') {
    const userDadorId = user.metadata?.dadorCargaId;

    if (!userDadorId) {
      res.status(403).json({ 
        success: false, 
        message: 'Usuario sin dador asociado', 
        code: 'NO_DADOR_ASSOCIATED' 
      });
      return;
    }

    // Si no se especificó dadorId, inyectar el del usuario
    if (!targetDadorId) {
      req.body.dadorCargaId = userDadorId;
      req.query.dadorCargaId = String(userDadorId);
      next();
      return;
    }

    // Validar que el dadorId coincida con el del usuario
    if (userDadorId !== targetDadorId) {
      res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado al dador solicitado', 
        code: 'DADOR_ACCESS_DENIED' 
      });
      return;
    }

    next();
    return;
  }

  // Otros roles no tienen acceso
  res.status(403).json({ 
    success: false, 
    message: 'Permisos insuficientes', 
    code: 'INSUFFICIENT_PERMISSIONS' 
  });
};
```

---

## 📝 Ejemplos de Uso

### Ejemplo 1: Admin accede a equipos de cualquier dador

```bash
# Admin puede ver equipos del dador 5
curl -X GET /api/docs/equipos?dadorCargaId=5 \
  -H "Authorization: Bearer TOKEN_ADMIN"
# ✅ Respuesta: 200 OK (todos los equipos del dador 5)

# Admin puede ver equipos del dador 10
curl -X GET /api/docs/equipos?dadorCargaId=10 \
  -H "Authorization: Bearer TOKEN_ADMIN"
# ✅ Respuesta: 200 OK (todos los equipos del dador 10)
```

### Ejemplo 2: Dador solo accede a sus propios equipos

```bash
# Dador 5 intenta ver equipos del dador 10
curl -X GET /api/docs/equipos?dadorCargaId=10 \
  -H "Authorization: Bearer TOKEN_DADOR_5"
# ❌ Respuesta: 403 Forbidden (acceso denegado)

# Dador 5 ve sus propios equipos
curl -X GET /api/docs/equipos?dadorCargaId=5 \
  -H "Authorization: Bearer TOKEN_DADOR_5"
# ✅ Respuesta: 200 OK (equipos del dador 5)

# Dador 5 sin especificar dadorId (se inyecta automáticamente)
curl -X GET /api/docs/equipos \
  -H "Authorization: Bearer TOKEN_DADOR_5"
# ✅ Respuesta: 200 OK (equipos del dador 5, inyectado automáticamente)
```

### Ejemplo 3: Admin aprueba documentos de cualquier dador

```bash
# Admin aprueba documento del dador 5
curl -X POST /api/docs/approval/pending/123/approve \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{}'
# ✅ Respuesta: 200 OK (documento aprobado)

# Admin aprueba documento del dador 10
curl -X POST /api/docs/approval/pending/456/approve \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{}'
# ✅ Respuesta: 200 OK (documento aprobado)
```

### Ejemplo 4: Dador solo aprueba sus documentos

```bash
# Dador 5 intenta aprobar documento del dador 10
curl -X POST /api/docs/approval/pending/456/approve \
  -H "Authorization: Bearer TOKEN_DADOR_5" \
  -H "Content-Type: application/json" \
  -d '{}'
# ❌ Respuesta: 403 Forbidden (documento no pertenece al dador 5)

# Dador 5 aprueba su propio documento
curl -X POST /api/docs/approval/pending/123/approve \
  -H "Authorization: Bearer TOKEN_DADOR_5" \
  -H "Content-Type: application/json" \
  -d '{}'
# ✅ Respuesta: 200 OK (documento aprobado)
```

---

## 🎯 Casos de Uso Reales

### Caso 1: Admin ayuda a un dador con problemas

**Escenario**: Dador "Logística SA" tiene problemas para aprobar un documento.

```typescript
// Admin puede:
// 1. Ver documentos pendientes del dador
GET /api/docs/approval/pending?dadorCargaId=5

// 2. Revisar el documento específico
GET /api/docs/approval/pending/123

// 3. Aprobarlo en nombre del dador
POST /api/docs/approval/pending/123/approve

// 4. Ver todos los equipos del dador
GET /api/docs/equipos?dadorCargaId=5

// ✅ Admin NO tiene restricciones
```

### Caso 2: Admin necesita generar reporte global

**Escenario**: Necesitan un reporte de cumplimiento de TODOS los dadores.

```typescript
// Admin puede:
// 1. Listar todos los dadores
GET /api/docs/dadores

// 2. Para cada dador, obtener equipos
GET /api/docs/equipos?dadorCargaId=1
GET /api/docs/equipos?dadorCargaId=2
GET /api/docs/equipos?dadorCargaId=3

// 3. Generar ZIP de cualquier dador
POST /api/docs/dadores/1/bulk-zip
POST /api/docs/dadores/2/bulk-zip

// ✅ Admin puede acceder a TODO
```

### Caso 3: Admin crea equipo para un dador

**Escenario**: Dador llama por teléfono y pide que le creen un equipo.

```typescript
// Admin puede:
// 1. Crear equipo en el dador 5
POST /api/docs/equipos/minimal
{
  "dadorCargaId": 5,
  "dniChofer": "12345678",
  "patenteTractor": "AA123BB",
  "patenteAcoplado": "CC456DD"
}

// ✅ Admin puede crear equipos en cualquier dador
```

---

## 🚨 Validaciones de Seguridad

### ✅ Lo que SÍ debe validarse:

1. **Usuario autenticado**: Todos los endpoints requieren JWT válido
2. **Rol autorizado**: Cada endpoint define qué roles pueden acceder
3. **Aislamiento entre dadores**: DADOR_CARGA solo ve sus datos
4. **Tenant correcto**: Validar que el usuario pertenece al tenant

### ❌ Lo que NO debe validarse para ADMIN/SUPERADMIN:

1. ❌ **NO validar** que el dadorId coincida con el del admin
2. ❌ **NO restringir** acceso a equipos de otros dadores
3. ❌ **NO limitar** aprobación de documentos de otros dadores
4. ❌ **NO impedir** creación/modificación en cualquier dador

---

## 📋 Checklist de Implementación

### Backend
- [ ] Middleware `authorizeDador` permite a ADMIN/SUPERADMIN pasar sin restricciones
- [ ] Todos los endpoints de maestros permiten a ADMIN acceder sin filtro por dador
- [ ] Aprobación de documentos permite a ADMIN aprobar docs de cualquier dador
- [ ] Búsqueda masiva permite a ADMIN buscar en todos los dadores
- [ ] ZIP masivo permite a ADMIN generar ZIPs de cualquier dador
- [ ] Tests validan que ADMIN puede acceder a múltiples dadores

### Frontend
- [ ] Portal de Admin muestra selector de dador (dropdown con todos los dadores)
- [ ] Portal de Dador NO muestra selector (automáticamente usa su dadorId)
- [ ] Admin puede navegar entre diferentes dadores
- [ ] Dador solo ve sus propios datos

---

## 🧪 Tests de Validación

### Test 1: Admin accede a múltiples dadores
```typescript
describe('Admin acceso total', () => {
  it('Admin puede ver equipos del dador 5', async () => {
    const res = await request(app)
      .get('/api/docs/equipos?dadorCargaId=5')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('Admin puede ver equipos del dador 10', async () => {
    const res = await request(app)
      .get('/api/docs/equipos?dadorCargaId=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('Admin puede aprobar documento de cualquier dador', async () => {
    const res = await request(app)
      .post('/api/docs/approval/pending/123/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(200);
  });
});
```

### Test 2: Dador con acceso limitado
```typescript
describe('Dador acceso limitado', () => {
  it('Dador 5 NO puede ver equipos del dador 10', async () => {
    const res = await request(app)
      .get('/api/docs/equipos?dadorCargaId=10')
      .set('Authorization', `Bearer ${dador5Token}`);
    expect(res.status).toBe(403);
  });

  it('Dador 5 puede ver sus propios equipos', async () => {
    const res = await request(app)
      .get('/api/docs/equipos?dadorCargaId=5')
      .set('Authorization', `Bearer ${dador5Token}`);
    expect(res.status).toBe(200);
  });

  it('Dador 5 NO puede aprobar documento de dador 10', async () => {
    const res = await request(app)
      .post('/api/docs/approval/pending/456/approve') // doc del dador 10
      .set('Authorization', `Bearer ${dador5Token}`)
      .send({});
    expect(res.status).toBe(403);
  });
});
```

---

## 🎓 Resumen de Principios

### 1. Jerarquía de Roles

```
SUPERADMIN  → Acceso TOTAL sin restricciones
    ↓
  ADMIN     → Acceso TOTAL sin restricciones
    ↓
 OPERATOR   → Acceso amplio (según endpoint)
    ↓
DADOR_CARGA → Acceso LIMITADO (solo su dadorId)
```

### 2. Regla de Oro

> **"Si no estás seguro si un rol debe tener acceso, pregúntate:**  
> **¿Es ADMIN o SUPERADMIN? → SÍ → Acceso total."**

### 3. Middleware Simplificado

```typescript
// Pseudocódigo del flujo
if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
  return ACCESO_TOTAL; // ← SIN VALIDACIONES ADICIONALES
}

if (user.role === 'DADOR_CARGA') {
  return validarDadorId(); // ← SOLO para dadores
}
```

---

## 📊 Comparación: Antes vs Después

### ANTES (sin rol DADOR_CARGA)
```
SUPERADMIN → Todo
ADMIN      → Todo
OPERATOR   → Todo (menos eliminar)
```

### DESPUÉS (con rol DADOR_CARGA)
```
SUPERADMIN  → Todo (SIN CAMBIOS)
ADMIN       → Todo (SIN CAMBIOS)
OPERATOR    → Todo menos eliminar (SIN CAMBIOS)
DADOR_CARGA → Solo su dadorId (NUEVO ROL LIMITADO)
```

**✅ Resultado: ADMIN y SUPERADMIN NO pierden ningún permiso.**

---

## 🚀 Conclusión

### ✅ Garantías

1. **ADMIN y SUPERADMIN conservan TODOS sus permisos**
2. **Pueden acceder a datos de CUALQUIER dador**
3. **Pueden realizar operaciones en CUALQUIER dador**
4. **No necesitan especificar su dadorId (tienen acceso total)**
5. **Pueden ayudar a cualquier dador cuando sea necesario**

### 🟢 Nuevo Rol DADOR_CARGA

1. **Solo accede a su propio dadorId**
2. **No puede ver datos de otros dadores**
3. **No puede modificar configuración global**
4. **Tiene autonomía en su propia gestión**

---

**Fecha de Documento**: 6 de Noviembre, 2025  
**Versión**: 1.0  
**Estado**: ✅ Especificación Completa

