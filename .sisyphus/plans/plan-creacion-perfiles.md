# Plan de Pruebas: Creación de Perfiles Básicos

> **Quick Summary**: 3 casos simples con pasos directos para crear chofer, transportista, dador de carga
> **Deliverables**: Checklist de pasos para cada caso
> **Estimated Effort**: Small
> **Parallel Execution**: NO - sequential (un caso a la vez)
> **Critical Path**: Caso 1 → Caso 2 → Caso 3

---

## Caso 1: Crear Chofer

### Objetivo
Crear un chofer nuevo desde el frontend con los campos requeridos del sistema.

### Campos Requeridos del Sistema
Basado en el schema de Prisma:

**Modelo: Chofer**
```typescript
{
  dadorCargaId: number,      // Requerido: ID del dador de carga
  tenantEmpresaId: number,     // Requerido: ID del tenant
  dni: string,                // Requerido: Mín 6, Máx 32 caracteres
  nombre: string,              // Opcional: Máx 120 caracteres
  apellido: string,            // Opcional: Máx 120 caracteres
  phones: string[],            // Opcional: Array de hasta 3 teléfonos (formato: +54 9XX XXXX)
  activo: boolean              // Opcional: true/false
}
```

### Pasos

1. **Login como usuario con permisos**
   - Email: `admin.01@bca.com` (o usuario con rol ADMIN/SUPERADMIN)
   - Password: `Admin2024!`
   - Resultado esperado: Login exitoso

2. **Navegar a la sección de choferes**
   - Menú: Entidades o Choferes
   - Click en "Crear Chofer" o "Nuevo Chofer"

3. **Completar el formulario**
   - **Dador de Carga**: Seleccionar un dador existente del dropdown
   - **DNI**: `12345678` (8 dígitos sin guiones ni puntos)
   - **Nombre**: `Juan`
   - **Apellido**: `Pérez`
   - **Teléfonos**: `+54 9 11 1234 5678` (opcional, hasta 3)
   - **Activo**: ✅ Marcar como activo
   - Click en "Guardar"

4. **Verificar confirmación**
   - Debe aparecer: "Chofer creado exitosamente"
   - Debe ver el ID del chofer creado

### Resultado Esperado
- [ ] Login exitoso
- [ ] Navegación correcta a sección de choferes
- [ ] Chofer creado con DNI: 12345678
- [ ] Confirmación visible en pantalla

---

## Caso 2: Crear Transportista

### Objetivo
Crear una empresa transportista nueva desde el frontend.

### Campos Requeridos del Sistema

**Modelo: EmpresaTransportista**
```typescript
{
  dadorCargaId: number,         // Requerido: ID del dador de carga
  tenantEmpresaId: number,         // Requerido: ID del tenant
  razonSocial: string,             // Requerido: Mín 2, Máx 200 caracteres
  cuit: string,                   // Requerido: 11 dígitos (formato: XX-XXXXXXXX-X)
  activo: boolean,                // Opcional: true/false
  notas: string,                   // Opcional: Máx 2000 caracteres
}
```

### Pasos

1. **Login como usuario con permisos**
   - Email: `admin.01@bca.com` (o usuario con rol ADMIN/SUPERADMIN)
   - Password: `Admin2024!`
   - Resultado esperado: Login exitoso

2. **Navegar a la sección de transportistas**
   - Menú: Entidades o Empresas Transportistas
   - Click en "Crear Empresa" o "Nueva Empresa"

3. **Completar el formulario**
   - **Dador de Carga**: Seleccionar del dropdown
   - **Razón Social**: `Transportes Rápidos S.A.` (Mín 2, Máx 200 caracteres)
   - **CUIT**: `30-12345678-9` (11 dígitos con guiones: XX-XXXXXXXX-X)
   - **Activo**: ✅ Marcar como activo
   - **Notas**: `Empresa de prueba para validación` (opcional)
   - Click en "Guardar"

4. **Verificar confirmación**
   - Debe aparecer: "Empresa transportista creada exitosamente"
   - Debe ver el ID de la empresa creada

### Resultado Esperado
- [ ] Login exitoso
- [ ] Navegación correcta a sección de empresas transportistas
- [ ] Empresa creada con CUIT: 30-12345678-9
- [ ] Confirmación visible en pantalla

---

## Caso 3: Crear Dador de Carga

### Objetivo
Crear un dador de carga nuevo desde el frontend.

### Campos Requeridos del Sistema

**Modelo: DadorCarga**
```typescript
{
  tenantEmpresaId: number,    // Requerido: ID del tenant
  razonSocial: string,        // Requerido: Mín 2, Máx 200 caracteres
  cuit: string,              // Requerido: 11 dígitos (formato: XX-XXXXXXXX-X)
  activo: boolean,             // Opcional: true/false
  notas: string,              // Opcional: Máx 2000 caracteres
  phones: string[],            // Opcional: Array de hasta 5 teléfonos (formato: +54 9XX XXXX)
}
```

### Pasos

1. **Login como SUPERADMIN**
   - Email: `admin@bca.com` (debe ser SUPERADMIN)
   - Password: `Admin2024!`
   - Resultado esperado: Login exitoso

2. **Navegar a la sección de dadores de carga**
   - Menú: Entidades o Dadores de Carga
   - Click en "Crear Dador" o "Nuevo Dador"

3. **Completar el formulario**
   - **Razón Social**: `Puech y Cía S.A.` (Mín 2, Máx 200 caracteres)
   - **CUIT**: `30-23456789-0` (11 dígitos con guiones: XX-XXXXXXXX-X)
   - **Activo**: ✅ Marcar como activo
   - **Teléfonos**: `+54 9 11 2222 3333` (opcional)
   - Click en "Guardar"

4. **Verificar confirmación**
   - Debe aparecer: "Dador de carga creado exitosamente"
   - Debe ver el ID del dador creado

### Resultado Esperado
- [ ] Login como SUPERADMIN exitoso
- [ ] Navegación correcta a sección de dadores de carga
- [ ] Dador creado con CUIT: 30-23456789-0
- [ ] Confirmación visible en pantalla

---

## Credenciales de Prueba

| Rol | Email | Password | Notas |
|------|--------|----------|--------|
| ADMIN | admin.01@bca.com | Admin2024! | Para crear perfiles |
| SUPERADMIN | admin@bca.com | Admin2024! | Solo SUPERADMIN puede crear dadores |

**Nota**: Si los usuarios no existen, crearlos antes de ejecutar los casos de uso.

---

## Estructura de URLs (Testing)

- **Frontend**: http://10.3.0.246:8560
- **Backend**: http://10.3.0.246 (puerto backend)
- **Documentos API**: http://10.3.0.246:4802

---

## Resumen

- **3 casos simples**: Crear Chofer, Crear Transportista, Crear Dador
- **Cada caso con 3-4 pasos directos**
- **Cada paso indica campos específicos del formulario**
- **Basado en schemas reales del sistema**

---

## Tips de Depuración

Si algo falla:
1. **Abrir DevTools del navegador** (F12)
2. **Ver la pestaña Network** para ver el request/response
3. **Ver el endpoint que se está llamando**:
   - Chofer: POST `/api/dadores?dadorCargaId=X&...` (backend crea usuario)
   - Transportista: POST `/api/empresas-transportistas?dadorCargaId=X&...`
   - Dador: POST `/api/dadores?...` (solo SUPERADMIN)

4. **Ver el payload del request**:
   - Headers: `Authorization: Bearer <token>`
   - Body: JSON con los campos del formulario

---

## Referencias Técnicas

**Schemas de Validación** (apps/documentos/src/schemas/validation.schemas.ts):
- `createChoferSchema`: Líneas 324-336 (campos de chofer)
- `createEmpresaTransportistaSchema`: Líneas 597-604 (campos de empresa transportista)
- `createDadorSchema`: Líneas 245-256 (campos de dador)

**Endpoints**:
- Choferes: POST `/api/dadores` (crea chofer via DadorService)
- Empresas Transportistas: POST `/api/empresas-transportistas`
- Dadores de Carga: POST `/api/dadores` (solo roles ADMIN, SUPERADMIN, ADMIN_INTERNO)

---

## Time Estimate

- **Caso 1 (Chofer)**: 5-10 minutos
- **Caso 2 (Transportista)**: 5-10 minutos
- **Caso 3 (Dador)**: 5-10 minutos

**Total**: ~15-30 minutos para los 3 casos
