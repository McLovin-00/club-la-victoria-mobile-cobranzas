# API ENDPOINTS - REFERENCIA RÁPIDA

> **Monorepo BCA - Endpoints de las APIs**  
> **Fecha**: 14 Enero 2026  
> Para testing: Usar Postman o cURL con token JWT en header `Authorization: Bearer <token>`

---

## 🔐 AUTENTICACIÓN

### Base URL (dev): `http://localhost:4800/api`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login con email/password | No |
| POST | `/auth/register` | Registro de nuevo usuario | No |
| POST | `/auth/refresh` | Refresh token | Refresh Token |
| POST | `/auth/logout` | Logout (invalida tokens) | Sí |
| GET | `/auth/me` | Obtener usuario actual | Sí |

**Request Login**:
```json
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response Login**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "role": "ADMIN",
      "empresaId": 1
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

---

## 👥 USUARIOS (PLATFORM)

### Base URL (dev): `http://localhost:4800/api`

| Método | Endpoint | Descripción | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/users` | Listar usuarios (filtros: role, empresaId) | Sí | ADMIN+ |
| GET | `/users/:id` | Obtener usuario por ID | Sí | ADMIN+ |
| POST | `/users` | Crear usuario | Sí | ADMIN+ |
| PUT | `/users/:id` | Actualizar usuario | Sí | ADMIN+ |
| DELETE | `/users/:id` | Eliminar usuario | Sí | SUPERADMIN |
| GET | `/usuarios/:id/permisos` | Permisos del usuario | Sí | ADMIN+ |

**Nota**: Los endpoints de usuarios ahora están en `/api/usuarios` para platform users y `/api/end-users` para end users (legacy clients).

**Query Params**:
- `?role=ADMIN` - Filtrar por rol
- `?empresaId=1` - Filtrar por empresa
- `?page=1&limit=20` - Paginación

---

## 🏢 EMPRESAS

| Método | Endpoint | Descripción | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/empresas` | Listar empresas | Sí | ADMIN+ |
| GET | `/empresas/:id` | Obtener empresa por ID | Sí | USER+ |
| POST | `/empresas` | Crear empresa | Sí | SUPERADMIN |
| PUT | `/empresas/:id` | Actualizar empresa | Sí | ADMIN+ |
| DELETE | `/empresas/:id` | Eliminar empresa | Sí | SUPERADMIN |
| GET | `/empresas/:id/usuarios` | Usuarios de la empresa | Sí | ADMIN+ |
| GET | `/empresas/:id/instancias` | Instancias de la empresa | Sí | ADMIN+ |

---

## 🔧 SERVICIOS E INSTANCIAS

| Método | Endpoint | Descripción | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/services` | Listar servicios disponibles | Sí | USER+ |
| GET | `/services/:id` | Obtener servicio por ID | Sí | USER+ |
| POST | `/services` | Crear servicio | Sí | SUPERADMIN |
| PUT | `/services/:id` | Actualizar servicio | Sí | SUPERADMIN |
| GET | `/instances` | Listar instancias (filtro: empresaId, serviceId) | Sí | ADMIN+ |
| GET | `/instances/:id` | Obtener instancia por ID | Sí | USER+ |
| POST | `/instances` | Crear instancia | Sí | ADMIN+ |
| PUT | `/instances/:id` | Actualizar instancia | Sí | ADMIN+ |
| DELETE | `/instances/:id` | Eliminar instancia | Sí | ADMIN+ |

---

## 🔑 PERMISOS

| Método | Endpoint | Descripción | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/permisos` | Listar permisos (filtros: userId, instanciaId) | Sí | ADMIN+ |
| GET | `/permisos/:id` | Obtener permiso por ID | Sí | ADMIN+ |
| POST | `/permisos` | Crear permiso | Sí | ADMIN+ |
| PUT | `/permisos/:id` | Actualizar permiso | Sí | ADMIN+ |
| DELETE | `/permisos/:id` | Eliminar permiso | Sí | ADMIN+ |
| POST | `/permisos/:id/resetear` | Resetear consumo del permiso | Sí | ADMIN+ |
| GET | `/permisos/check` | Verificar permiso (userId, instanciaId) | Sí | USER+ |

---

## 📋 AUDIT LOGS

| Método | Endpoint | Descripción | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/audit-logs` | Listar logs (filtros: instanciaId, fecha) | Sí | ADMIN+ |
| GET | `/audit-logs/:id` | Obtener log por ID | Sí | ADMIN+ |

**Query Params**:
- `?instanciaId=1`
- `?from=2026-01-01&to=2026-01-31`
- `?accion=login`

---

## 🩺 HEALTH CHECK

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check del backend | No |

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-14T10:00:00Z",
  "uptime": 86400,
  "database": "connected",
  "redis": "connected",
  "version": "1.0.0"
}
```

---

## 📄 MICROSERVICIO DOCUMENTOS

### Base URL (dev): `http://localhost:4802/api/docs`

### Templates de Documentos

| Método | Endpoint | Descripción | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/templates` | Listar templates disponibles | Sí | USER+ |
| GET | `/templates/:id` | Obtener template por ID | Sí | USER+ |
| POST | `/templates` | Crear template | Sí | ADMIN+ |
| PUT | `/templates/:id` | Actualizar template | Sí | ADMIN+ |
| DELETE | `/templates/:id` | Eliminar template | Sí | ADMIN+ |

### Documentos

| Método | Endpoint | Descripción | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/upload` | Subir documento (multipart/form-data) | Sí | USER+ |
| GET | `/:id` | Obtener documento por ID | Sí | USER+ |
| GET | `/entity/:entityType/:entityId` | Documentos por entidad | Sí | USER+ |
| GET | `/dador/:dadorId` | Documentos de un dador | Sí | ADMIN+ |
| PUT | `/:id` | Actualizar documento | Sí | ADMIN+ |
| DELETE | `/:id` | Eliminar documento | Sí | ADMIN+ |
| GET | `/:id/download` | Descargar documento | Sí | USER+ |
| GET | `/:id/preview` | Preview de documento | Sí | USER+ |

### Clasificación y Validación (IA)

| Método | Endpoint | Descripción | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/:id/classify` | Clasificar documento con IA | Sí | ADMIN+ |
| GET | `/:id/classification` | Obtener resultado de clasificación | Sí | USER+ |
| POST | `/:id/approve` | Aprobar documento | Sí | ADMIN+ |
| POST | `/:id/reject` | Rechazar documento | Sí | ADMIN+ |

### Maestros (Choferes, Camiones, Acoplados)

**Ruta**: `/maestros`

| Método | Endpoint | Descripción | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/maestros/choferes` | Listar choferes | Sí | USER+ |
| GET | `/maestros/choferes/:id` | Obtener chofer por ID | Sí | USER+ |
| POST | `/maestros/choferes` | Crear chofer | Sí | DADOR_DE_CARGA+ |
| PUT | `/maestros/choferes/:id` | Actualizar chofer | Sí | DADOR_DE_CARGA+ |
| DELETE | `/maestros/choferes/:id` | Eliminar chofer | Sí | ADMIN+ |
| GET | `/maestros/camiones` | Listar camiones | Sí | USER+ |
| GET | `/maestros/camiones/:id` | Obtener camión por ID | Sí | USER+ |
| POST | `/maestros/camiones` | Crear camión | Sí | DADOR_DE_CARGA+ |
| PUT | `/maestros/camiones/:id` | Actualizar camión | Sí | DADOR_DE_CARGA+ |
| DELETE | `/maestros/camiones/:id` | Eliminar camión | Sí | ADMIN+ |
| GET | `/maestros/acoplados` | Listar acoplados | Sí | USER+ |
| GET | `/maestros/acoplados/:id` | Obtener acoplado por ID | Sí | USER+ |
| POST | `/maestros/acoplados` | Crear acoplado | Sí | DADOR_DE_CARGA+ |
| PUT | `/maestros/acoplados/:id` | Actualizar acoplado | Sí | DADOR_DE_CARGA+ |
| DELETE | `/maestros/acoplados/:id` | Eliminar acoplado | Sí | ADMIN+ |

### Dadores de Carga

**Ruta**: `/dadores`

| Método | Endpoint | Descripción | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/dadores` | Listar dadores de carga | Sí | ADMIN+ |
| GET | `/dadores/:id` | Obtener dador por ID | Sí | USER+ |
| POST | `/dadores` | Crear dador de carga | Sí | ADMIN_INTERNO+ |
| PUT | `/dadores/:id` | Actualizar dador | Sí | ADMIN_INTERNO+ |
| DELETE | `/dadores/:id` | Eliminar dador | Sí | ADMIN+ |

### Empresas Transportistas

**Ruta**: `/empresas-transportistas`

| Método | Endpoint | Descripción | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/empresas-transportistas` | Listar empresas transportistas | Sí | DADOR_DE_CARGA+ |
| GET | `/empresas-transportistas/:id` | Obtener empresa por ID | Sí | DADOR_DE_CARGA+ |
| POST | `/empresas-transportistas` | Crear empresa transportista | Sí | DADOR_DE_CARGA+ |
| PUT | `/empresas-transportistas/:id` | Actualizar empresa | Sí | DADOR_DE_CARGA+ |
| DELETE | `/empresas-transportistas/:id` | Eliminar empresa | Sí | ADMIN+ |

### Equipos (Chofer + Camión + Acoplado)

**Ruta**: `/equipos`

| Método | Endpoint | Descripción | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/equipos` | Listar equipos | Sí | USER+ |
| GET | `/equipos/:id` | Obtener equipo por ID | Sí | USER+ |
| POST | `/equipos` | Crear equipo | Sí | DADOR_DE_CARGA+ |
| PUT | `/equipos/:id` | Actualizar equipo | Sí | DADOR_DE_CARGA+ |
| DELETE | `/equipos/:id` | Eliminar equipo | Sí | ADMIN+ |
| POST | `/equipos/:id/vincular-cliente` | Vincular equipo a cliente | Sí | DADOR_DE_CARGA+ |
| POST | `/equipos/:id/desvincular-cliente` | Desvincular equipo de cliente | Sí | DADOR_DE_CARGA+ |
| GET | `/equipos/:id/historial` | Historial de cambios del equipo | Sí | USER+ |
| GET | `/equipos/:id/compliance` | Estado de cumplimiento documental | Sí | USER+ |

### Clientes

**Ruta**: `/clients`

| Método | Endpoint | Descripción | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/clients` | Listar clientes | Sí | ADMIN+ |
| GET | `/clients/:id` | Obtener cliente por ID | Sí | USER+ |
| POST | `/clients` | Crear cliente | Sí | ADMIN_INTERNO+ |
| PUT | `/clients/:id` | Actualizar cliente | Sí | ADMIN_INTERNO+ |
| DELETE | `/clients/:id` | Eliminar cliente | Sí | ADMIN+ |
| GET | `/clients/:id/requisitos` | Requisitos documentales del cliente | Sí | USER+ |
| POST | `/clients/:id/requisitos` | Agregar requisito documental | Sí | ADMIN_INTERNO+ |
| DELETE | `/clients/:id/requisitos/:reqId` | Eliminar requisito | Sí | ADMIN_INTERNO+ |

### Portales Específicos

**Portal Transportista** (`/portal-transportista`):
- Vista simplificada para rol TRANSPORTISTA
- Gestión de su flota, choferes, documentos propios

**Portal Cliente** (`/portal-cliente`):
- Vista para rol CLIENTE
- Validación de cumplimiento de equipos asignados
- Consulta de requisitos documentales

### Datos Extraídos por IA

**Ruta**: `/entities`

| Método | Endpoint | Descripción | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/entities/:entityType/:entityId` | Datos consolidados extraídos por IA | Sí | ADMIN+ |
| POST | `/entities/:entityType/:entityId/rechequeo` | Solicitar rechequeo de datos con IA | Sí | ADMIN+ |
| GET | `/entities/:entityType/:entityId/extraction-log` | Historial de extracciones | Sí | ADMIN+ |

### Notificaciones

| Método | Endpoint | Descripción | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/notifications` | Listar notificaciones (filtros: tipo, leido) | Sí | USER+ |
| GET | `/notifications/:id` | Obtener notificación por ID | Sí | USER+ |
| PUT | `/notifications/:id/read` | Marcar notificación como leída | Sí | USER+ |
| DELETE | `/notifications/:id` | Eliminar notificación | Sí | USER+ |

### Health Check

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check del microservicio | No |
| GET | `/health/ready` | Readiness check (incluye deps) | No |

**Response Health**:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "minio": "connected",
  "flowise": "connected"
}
```

---

## 📦 MICROSERVICIO REMITOS (EN DESARROLLO)

### Base URL (dev): `http://localhost:4803/api/remitos`

| Método | Endpoint | Descripción | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/upload` | Subir remito (imagen) | Sí | USER+ |
| GET | `/:id` | Obtener remito por ID | Sí | USER+ |
| POST | `/:id/analyze` | Analizar remito con IA (OCR) | Sí | ADMIN+ |
| GET | `/:id/data` | Datos extraídos del remito | Sí | USER+ |
| PUT | `/:id/approve` | Aprobar remito | Sí | ADMIN+ |
| GET | `/health` | Health check | No |

---

## 🔌 WEBSOCKETS (SOCKET.IO)

### Microservicio Documentos

**URL**: `ws://localhost:4802` (dev) / `wss://api.microsyst.com.ar/docs` (prod)

**Autenticación**: Token JWT en handshake query param
```javascript
const socket = io('ws://localhost:4802', {
  query: { token: 'eyJhbGc...' }
});
```

**Eventos del Cliente (emitir)**:
- `join:dador` - Unirse a sala de un dador
  ```javascript
  socket.emit('join:dador', { dadorCargaId: 1 });
  ```

- `leave:dador` - Salir de sala de un dador
  ```javascript
  socket.emit('leave:dador', { dadorCargaId: 1 });
  ```

**Eventos del Servidor (escuchar)**:
- `document:uploaded` - Documento subido
  ```javascript
  socket.on('document:uploaded', (data) => {
    console.log('Documento subido:', data);
  });
  ```

- `document:classified` - Documento clasificado
  ```javascript
  socket.on('document:classified', (data) => {
    console.log('Documento clasificado:', data);
  });
  ```

- `document:approved` - Documento aprobado
- `document:rejected` - Documento rechazado
- `document:expiring` - Documento por vencer
- `notification:new` - Nueva notificación

---

## 📝 FORMATO DE RESPUESTAS

### Éxito
```json
{
  "success": true,
  "data": { ... },
  "message": "Operación exitosa"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descripción del error",
    "details": [ ... ]
  }
}
```

### Paginación
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 🔑 CÓDIGOS DE ERROR COMUNES

| Código HTTP | Significado |
|-------------|-------------|
| 200 | OK - Éxito |
| 201 | Created - Recurso creado |
| 400 | Bad Request - Validación falló |
| 401 | Unauthorized - No autenticado |
| 403 | Forbidden - No autorizado (permisos) |
| 404 | Not Found - Recurso no encontrado |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Error del servidor |

### Códigos de Error Custom

| Código | Descripción |
|--------|-------------|
| `VALIDATION_ERROR` | Validación de input falló (Zod) |
| `AUTH_INVALID_CREDENTIALS` | Email/password incorrectos |
| `AUTH_TOKEN_EXPIRED` | Access token expirado |
| `AUTH_TOKEN_INVALID` | Token inválido o malformado |
| `PERMISSION_DENIED` | Usuario sin permisos suficientes |
| `RESOURCE_NOT_FOUND` | Recurso no encontrado |
| `DUPLICATE_ENTRY` | Ya existe un recurso con esos datos |
| `UPLOAD_FILE_TOO_LARGE` | Archivo supera límite (50MB) |
| `UPLOAD_INVALID_TYPE` | Tipo de archivo no permitido |
| `MINIO_CONNECTION_ERROR` | Error de conexión a MinIO |
| `DATABASE_ERROR` | Error de base de datos |
| `FLOWISE_ERROR` | Error de clasificación IA |

---

## 🧪 TESTING CON CURL

### Login
```bash
curl -X POST http://localhost:4800/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

### Request con Token
```bash
TOKEN="eyJhbGc..."

curl -X GET http://localhost:4800/api/users \
  -H "Authorization: Bearer $TOKEN"
```

### Upload de Documento
```bash
curl -X POST http://localhost:4802/api/docs/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "templateId=1" \
  -F "entityType=CHOFER" \
  -F "entityId=5" \
  -F "dadorCargaId=1" \
  -F "tenantEmpresaId=1"
```

---

## 🧰 TESTING CON POSTMAN

### Variables de Entorno

**Local**:
```
base_url: http://localhost:4800/api
docs_url: http://localhost:4802/api/docs
token: {{accessToken}}
```

**Staging**:
```
base_url: https://api.staging.microsyst.com.ar/api
docs_url: https://api.staging.microsyst.com.ar/api/docs
token: {{accessToken}}
```

### Pre-request Script (Login automático)
```javascript
// En Tests del endpoint de login:
const response = pm.response.json();
pm.environment.set('accessToken', response.data.accessToken);
pm.environment.set('refreshToken', response.data.refreshToken);
```

### Authorization Header (Collection level)
```
Type: Bearer Token
Token: {{accessToken}}
```

---

## 📚 DOCUMENTACIÓN ADICIONAL

### OpenAPI / Swagger

**Microservicio Documentos**:
- Archivo: `apps/documentos/openapi.yaml`
- UI: `http://localhost:4802/docs` (si Swagger UI está habilitado)

### Colecciones Postman
- Ubicación: `docs/postman/` (si existen)
- Importar en Postman para testing completo

### Scripts de Testing
- `scripts/test-proxy-routes.sh` - Test de rutas del proxy

---

**Última actualización**: 14 Enero 2026  
**Nota**: Los endpoints pueden variar. Verificar documentación específica de cada microservicio o consultar código fuente en `apps/*/src/routes/`.
