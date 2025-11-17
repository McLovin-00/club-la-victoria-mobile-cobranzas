# Plan: Implementación Completa de Campos "Alta de Empresa de Transporte, Choferes y Unidades"

## 📋 Objetivo

Implementar formulario completo para "Alta inicial" con **30 documentos obligatorios** organizados en 3 secciones:
1. **Empresa Transportista** (7 documentos)
2. **Choferes** (9 documentos)
3. **Unidades - Tractor y Semi** (14 documentos)

El formulario debe ser **visualmente idéntico** a la imagen proporcionada y seguir el flujo atómico (todos los documentos completos antes de activar el equipo).

---

## 🎯 Análisis de la imagen de referencia

### Sección 1: EMPRESA TRANSPORTISTA (7 documentos)
1. ✅ **CONSTANCIA DE INSCRIPCIÓN EN INGRESOS BRUTOS** - Archivo requerido
2. ✅ **FORMULARIO 931 / AFIP (CONSTANCIA DE PAGO)** - Archivo requerido
3. ✅ **RECIBO DE SUELDO** - Archivo requerido
4. ✅ **BOLETA SINDICAL** - Archivo requerido

### Sección 2: CHOFERES (9 documentos)
5. **NOMBRE COMPLETO** - Campo de texto (Nombre + Apellido)
6. ✅ **ACTA TEMPRANA EN ARCA o CONSTANCIA DE INSCRIPCIÓN EN ARCA** - Archivo requerido
7. ✅ **DNI (frente y dorso)** - Archivo requerido + campo DNI obligatorio
8. **VENCIMIENTO** - Fecha (ejemplo: January 1, 2025)
9. ✅ **LICENCIA NACIONAL DE CONDUCIR (frente y dorso)** - Archivo requerido
10. **VENCIMIENTO** - Fecha
11. ✅ **PÓLIZA DE A.R.T. con NÓMINA, que incluya CLÁUSULA DE NO REPETICIÓN a favor de PROPLISA. (30-71781676-2)** - Archivo requerido
12. ✅ **PÓLIZA DE SEGURO DE VIDA OBLIGATORIO** - Archivo requerido
13. **VENCIMIENTO** - Fecha

### Sección 3: UNIDADES - DOCUMENTACIÓN TRACTOR Y SEMI (14 documentos)
14. ✅ **TRACTOR - PATENTE** - Campo de texto obligatorio
15. ✅ **TRACTOR - TÍTULO o CONTRATO DE ALQUILER CERTIFICADO** - Archivo requerido
16. ✅ **TRACTOR - CÉDULA** - Archivo requerido
17. ✅ **TRACTOR - RTO - REVISIÓN TÉCNICA OBLIGATORIA** - Archivo requerido
18. **VENCIMIENTO** - Fecha
19. ✅ **TRACTOR - PÓLIZA DE SEGURO, que incluya CLÁUSULA DE NO REPETICIÓN a favor de PROPLISA. (30-71781676-2)** - Archivo requerido
20. ✅ **TRACTOR - SEGURO: Certificado de libre deuda y Comprobante de pago correspondiente al mes vigente** - Archivo requerido
21. ✅ **SEMI - PATENTE** - Campo de texto obligatorio
22. ✅ **SEMI - TÍTULO o CONTRATO DE ALQUILER CERTIFICADO** - Archivo requerido
23. ✅ **SEMI - CÉDULA** - Archivo requerido
24. ✅ **SEMI - RTO - REVISIÓN TÉCNICA OBLIGATORIA** - Archivo requerido
25. **VENCIMIENTO** - Fecha
26. ✅ **SEMI - PÓLIZA DE SEGURO, que incluya CLÁUSULA DE NO REPETICIÓN a favor de PROPLISA. (30-71781676-2)** - Archivo requerido
27. ✅ **SEMI - SEGURO: Certificado de libre deuda y Comprobante de pago correspondiente al mes vigente** - Archivo requerido

---

## 🗂️ Mapeo a Sistema de Templates

### 🔹 Paso 1: Crear Templates en Base de Datos

Necesitamos crear 30 templates en `document_templates` (microservicio `documentos`). 

#### A. Templates para EMPRESA_TRANSPORTISTA (4 templates)

```sql
-- 1. Constancia de Inscripción en Ingresos Brutos
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Constancia de Inscripción IIBB', 'EMPRESA_TRANSPORTISTA', true, NOW(), NOW());

-- 2. Formulario 931 / AFIP
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Formulario 931 AFIP', 'EMPRESA_TRANSPORTISTA', true, NOW(), NOW());

-- 3. Recibo de Sueldo
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Recibo de Sueldo', 'EMPRESA_TRANSPORTISTA', true, NOW(), NOW());

-- 4. Boleta Sindical
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Boleta Sindical', 'EMPRESA_TRANSPORTISTA', true, NOW(), NOW());
```

#### B. Templates para CHOFER (5 templates)

```sql
-- 5. Acta Temprana / Constancia ARCA
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Acta Temprana ARCA', 'CHOFER', true, NOW(), NOW());

-- 6. DNI (frente y dorso)
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('DNI (frente y dorso)', 'CHOFER', true, NOW(), NOW());

-- 7. Licencia Nacional de Conducir
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Licencia Nacional de Conducir', 'CHOFER', true, NOW(), NOW());

-- 8. Póliza A.R.T. con Cláusula NO REPETICIÓN
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Póliza A.R.T. (Cláusula NO REPETICIÓN)', 'CHOFER', true, NOW(), NOW());

-- 9. Póliza Seguro de Vida Obligatorio
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Póliza Seguro de Vida Obligatorio', 'CHOFER', true, NOW(), NOW());
```

#### C. Templates para CAMION (Tractor) (6 templates)

```sql
-- 10. Tractor - Título o Contrato Alquiler
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Tractor: Título o Contrato Alquiler', 'CAMION', true, NOW(), NOW());

-- 11. Tractor - Cédula
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Tractor: Cédula', 'CAMION', true, NOW(), NOW());

-- 12. Tractor - RTO
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Tractor: RTO', 'CAMION', true, NOW(), NOW());

-- 13. Tractor - Póliza Seguro con Cláusula NO REPETICIÓN
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Tractor: Póliza Seguro (NO REPETICIÓN)', 'CAMION', true, NOW(), NOW());

-- 14. Tractor - Certificado Libre Deuda + Comprobante Pago
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Tractor: Seguro Certificado Libre Deuda', 'CAMION', true, NOW(), NOW());
```

#### D. Templates para ACOPLADO (Semi) (6 templates)

```sql
-- 15. Semi - Título o Contrato Alquiler
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Semi: Título o Contrato Alquiler', 'ACOPLADO', true, NOW(), NOW());

-- 16. Semi - Cédula
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Semi: Cédula', 'ACOPLADO', true, NOW(), NOW());

-- 17. Semi - RTO
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Semi: RTO', 'ACOPLADO', true, NOW(), NOW());

-- 18. Semi - Póliza Seguro con Cláusula NO REPETICIÓN
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Semi: Póliza Seguro (NO REPETICIÓN)', 'ACOPLADO', true, NOW(), NOW());

-- 19. Semi - Certificado Libre Deuda + Comprobante Pago
INSERT INTO documentos.document_templates (name, entity_type, active, created_at, updated_at)
VALUES ('Semi: Seguro Certificado Libre Deuda', 'ACOPLADO', true, NOW(), NOW());
```

---

## 🏗️ Arquitectura de Solución

### Componentes a Modificar/Crear

#### 1. **Backend - Microservicio Documentos**
- ✅ Templates ya soportados en schema
- ✅ `Document` model ya tiene `expiresAt`
- 🔧 **Crear endpoint** para obtener templates agrupados por sección
- 🔧 **Endpoint de validación atómica**: verificar que todos los templates obligatorios estén cubiertos antes de activar equipo

**Archivos:**
- `apps/documentos/src/routes/templates.routes.ts` (nuevo o existente)
- `apps/documentos/src/services/equipoAssembly.service.ts` (validación atómica)

#### 2. **Backend - Microservicio Platform**
- 🔧 **Endpoint GET `/api/equipos/templates-form`**: devolver estructura de templates agrupados por sección para renderizar en frontend

**Archivos:**
- `apps/backend/src/routes/equipos.routes.ts`
- `apps/backend/src/services/equipos.service.ts`

#### 3. **Frontend - Nueva Página `AltaEquipoPage.tsx`**

**Estructura del formulario:**

```tsx
// Sección 1: Datos básicos
- Modo: Alta inicial / Renovación (radio buttons)
- Empresa Transportista: CUIT (input)
- Dador de Carga: Dropdown (si ADMIN)
- Cliente: Dropdown (opcional, si ADMIN asigna)

// Sección 2: Chofer
- Nombre (input)
- Apellido (input)
- DNI (input obligatorio)
- Teléfono (input opcional)

// Sección 3: Tractor
- Patente (input obligatorio)
- Marca (input opcional)
- Modelo (input opcional)

// Sección 4: Semi (opcional)
- Patente (input)
- Tipo (input opcional)

// Sección 5: Documentos Empresa Transportista
[Lista de 4 templates, cada uno con:]
- Label del template
- Input file (PDF/imagen)
- Campo "Vencimiento" (date) si aplica
- Estado: "Pendiente" / "Subido" con ícono

// Sección 6: Documentos Chofer
[Lista de 5 templates, cada uno con:]
- Label del template
- Input file
- Campo "Vencimiento" (date) para DNI, Licencia, Seguro Vida
- Estado

// Sección 7: Documentos Tractor
[Lista de 5 templates + patente ya capturada arriba]
- Label del template
- Input file
- Campo "Vencimiento" para RTO
- Estado

// Sección 8: Documentos Semi (si patente semi completada)
[Lista de 5 templates]
- Label del template
- Input file
- Campo "Vencimiento" para RTO
- Estado

// Botón Final
- "Crear Equipo" (disabled hasta que TODOS los documentos obligatorios estén subidos)
```

**Archivos a crear:**
- `apps/frontend/src/features/equipos/pages/AltaEquipoPage.tsx`
- `apps/frontend/src/features/equipos/components/SeccionDocumentos.tsx`
- `apps/frontend/src/features/equipos/components/DocumentoUploadField.tsx`
- `apps/frontend/src/features/equipos/api/equiposApiSlice.ts` (RTK Query)

#### 4. **Validaciones Frontend + Backend**

**Frontend (React Hook Form + Zod):**
- CUIT: 11 dígitos
- DNI: numérico
- Patente Tractor: obligatorio
- Patente Semi: opcional, pero si se llena, requiere documentos de Semi
- Archivos: PDF o imagen, max 10MB
- Vencimientos: fecha futura para documentos nuevos

**Backend:**
- Verificar que existan las entidades (Chofer, Camion, Acoplado) con DNI/patentes normalizados
- Si no existen, crearlos en transacción
- Validar que TODOS los templates obligatorios tengan al menos 1 archivo con `status != RECHAZADO`
- Solo entonces crear el `Equipo` con `estado = activa`

---

## 📝 Plan de Implementación - Paso a Paso

### **FASE 1: Backend - Templates y Endpoints (2-3 horas)**

#### Tarea 1.1: Seed de Templates
- Archivo: `apps/documentos/src/prisma/seeds/templates.seed.ts`
- Crear script que inserte los 21 templates (4 empresa + 5 chofer + 6 tractor + 6 semi)
- Ejecutar seed: `npm run seed:templates`

#### Tarea 1.2: Endpoint GET `/api/documentos/templates/grouped`
- Retorna templates agrupados por `entityType`:
```json
{
  "EMPRESA_TRANSPORTISTA": [
    { "id": 1, "name": "Constancia IIBB", "requiresExpiry": false },
    ...
  ],
  "CHOFER": [
    { "id": 5, "name": "DNI", "requiresExpiry": true },
    ...
  ],
  "CAMION": [...],
  "ACOPLADO": [...]
}
```

#### Tarea 1.3: Endpoint POST `/api/documentos/equipos/assemble`
- Payload:
```json
{
  "empresaTransportista": { "cuit": "...", "razonSocial": "..." },
  "chofer": { "dni": "...", "nombre": "...", "apellido": "..." },
  "tractor": { "patente": "...", "marca": "...", "modelo": "..." },
  "semi": { "patente": "..." } // opcional,
  "dadorCargaId": 1,
  "tenantEmpresaId": 1,
  "clienteIds": [1, 2] // opcional,
  "documents": [
    {
      "templateId": 1,
      "entityType": "EMPRESA_TRANSPORTISTA",
      "files": ["presigned_url_1"],
      "expiresAt": "2026-01-01"
    },
    ...
  ]
}
```
- Validaciones:
  - Crear/recuperar `EmpresaTransportista`
  - Crear/recuperar `Chofer`, `Camion`, `Acoplado`
  - Verificar que TODOS los templates obligatorios estén presentes
  - Crear registros `Document` con `status=PENDIENTE`
  - Crear `Equipo` con `estado=activa`
  - Crear `EquipoCliente` si se asignan clientes
- Transacción atómica

#### Tarea 1.4: Endpoint POST `/api/documentos/presign-urls`
- Para subida directa a MinIO
- Payload:
```json
{
  "files": [
    { "fileName": "dni_frente.pdf", "mimeType": "application/pdf" },
    ...
  ]
}
```
- Retorna array de presigned URLs

---

### **FASE 2: Frontend - UI del Formulario (4-5 horas)**

#### Tarea 2.1: Crear `AltaEquipoPage.tsx`
- Layout general con 8 secciones (acordeón o tabs)
- State management con `React Hook Form`
- Schema Zod para validaciones

#### Tarea 2.2: Componente `SeccionDocumentos.tsx`
- Props: `entityType`, `templates[]`, `onUpload`, `uploadedDocs[]`
- Itera sobre templates y renderiza `DocumentoUploadField` por cada uno

#### Tarea 2.3: Componente `DocumentoUploadField.tsx`
- Input file + preview
- Campo fecha si `requiresExpiry`
- Estado visual: pendiente/subiendo/completado/error
- Subida a MinIO via presigned URL

#### Tarea 2.4: RTK Query - `equiposApiSlice.ts`
```ts
export const equiposApi = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getTemplatesGrouped: builder.query<TemplatesGrouped, void>({
      query: () => '/documentos/templates/grouped',
    }),
    getPresignedUrls: builder.mutation<PresignedUrl[], FileRequest[]>({
      query: (files) => ({ url: '/documentos/presign-urls', method: 'POST', body: files }),
    }),
    assembleEquipo: builder.mutation<EquipoResponse, AssembleEquipoRequest>({
      query: (data) => ({ url: '/documentos/equipos/assemble', method: 'POST', body: data }),
    }),
  }),
});
```

#### Tarea 2.5: Flujo de Carga
1. Usuario llena datos básicos (CUIT, DNI, patentes)
2. Por cada documento:
   - Selecciona archivo
   - (Opcional) Ingresa fecha vencimiento
   - Botón "Subir" → request presigned URL → upload directo a MinIO → marca como "Subido"
3. Cuando TODOS los documentos estén "Subidos" → habilita botón "Crear Equipo"
4. Click en "Crear Equipo" → POST `/equipos/assemble` → navegación a dashboard con mensaje de éxito

---

### **FASE 3: Validaciones y Testing (2-3 horas)**

#### Tarea 3.1: Tests Unitarios Backend
- `equipoAssembly.service.spec.ts`: validar que rechaza si faltan documentos
- Mock de Prisma para transacciones

#### Tarea 3.2: Tests E2E Frontend
- Playwright: flujo completo de alta de equipo
- Verificar que botón "Crear Equipo" esté disabled hasta completar todos los uploads

#### Tarea 3.3: Tests de Integración
- Curl a endpoints de backend
- Verificar estructura de respuesta

---

### **FASE 4: Autorización y Roles (1-2 horas)**

#### Reglas según rol (middleware `apps/backend/src/middlewares/platformAuth.middleware.ts`):

| Rol | Puede crear Equipo | Puede asignar Clientes | Puede ver Equipos |
|-----|-------------------|----------------------|------------------|
| **ADMIN** | ✅ Todos | ✅ Cualquier cliente | ✅ Todos |
| **DADOR** | ✅ Solo sus equipos | ❌ No puede asignar | ✅ Solo sus equipos |
| **TRANSPORTISTA** | ✅ Solo sus equipos | ❌ No puede asignar | ✅ Solo sus equipos |

#### Implementación:
- En `AltaEquipoPage.tsx`:
  - Si `role === 'ADMIN'`: mostrar dropdown "Dador de Carga" y "Clientes"
  - Si `role === 'DADOR'`: `dadorCargaId` autocompletado desde `user.empresaId`, sin dropdown clientes
  - Si `role === 'TRANSPORTISTA'`: `empresaTransportistaId` autocompletado, sin dropdown clientes

- En backend `/equipos/assemble`:
  - Verificar que `req.user.role` y `req.user.empresaId` correspondan con el `dadorCargaId` o `empresaTransportistaId` del payload
  - Si `role !== 'ADMIN'`: rechazar si intenta asignar `clienteIds`

---

### **FASE 5: Mejoras Visuales y UX (1-2 horas)**

#### Tarea 5.1: Progress Bar Global
- Calcular `(documentosSubidos / totalDocumentosObligatorios) * 100`
- Mostrar en top del formulario

#### Tarea 5.2: Validación Visual
- ❌ Campo CUIT inválido → borde rojo
- ✅ Documento subido → ícono verde
- ⏳ Subiendo → spinner
- ⚠️ Vencimiento próximo (< 30 días) → warning

#### Tarea 5.3: Guardar Borrador
- Opcional: permitir guardar estado intermedio en `localStorage` o en backend como "sesión de carga"

---

## 📊 Estimación de Tiempo Total

| Fase | Tiempo Estimado |
|------|----------------|
| 1. Backend Templates + Endpoints | 2-3 horas |
| 2. Frontend UI del Formulario | 4-5 horas |
| 3. Validaciones y Testing | 2-3 horas |
| 4. Autorización y Roles | 1-2 horas |
| 5. Mejoras Visuales y UX | 1-2 horas |
| **TOTAL** | **10-15 horas** |

---

## ✅ Checklist de Implementación

### Backend
- [ ] Crear seed de 21 templates en `documentos`
- [ ] Endpoint GET `/api/documentos/templates/grouped`
- [ ] Endpoint POST `/api/documentos/presign-urls`
- [ ] Endpoint POST `/api/documentos/equipos/assemble` con validaciones atómicas
- [ ] Middleware de autorización (ADMIN/DADOR/TRANSPORTISTA)
- [ ] Tests unitarios de servicio `equipoAssembly.service.ts`

### Frontend
- [ ] Página `AltaEquipoPage.tsx` con 8 secciones
- [ ] Componente `SeccionDocumentos.tsx`
- [ ] Componente `DocumentoUploadField.tsx` con estado visual
- [ ] RTK Query `equiposApiSlice.ts` con 3 endpoints
- [ ] Schema Zod para validación de formulario
- [ ] Progress bar global
- [ ] Condicionales de UI según rol (ADMIN ve más campos)
- [ ] Botón "Crear Equipo" disabled hasta completar todos los uploads

### Testing
- [ ] E2E Playwright: flujo completo alta de equipo
- [ ] Tests unitarios backend: validación atómica
- [ ] Curl manual a endpoints para verificar payloads

### Documentación
- [ ] Actualizar `PLAN_EQUIPOS_CARGA.md` con referencias a templates específicos
- [ ] Agregar comentarios en código sobre reglas de negocio (atomicidad)
- [ ] README en `apps/frontend/src/features/equipos/` explicando estructura

---

## 🚀 Orden de Implementación Recomendado

1. **Día 1 (Backend):**
   - Crear seed de templates ✅
   - Implementar endpoints `/templates/grouped`, `/presign-urls`, `/equipos/assemble` ✅
   - Tests unitarios ✅

2. **Día 2 (Frontend Core):**
   - Crear `AltaEquipoPage.tsx` con estructura básica ✅
   - Implementar `SeccionDocumentos` y `DocumentoUploadField` ✅
   - RTK Query ✅

3. **Día 3 (Integración):**
   - Conectar frontend con backend ✅
   - Validaciones y manejo de errores ✅
   - Autorización por roles ✅

4. **Día 4 (Testing y Polish):**
   - E2E tests ✅
   - Mejoras visuales (progress bar, iconos) ✅
   - Documentación ✅

---

## 📌 Notas Importantes

1. **Atomicidad**: NO crear el `Equipo` hasta que TODOS los documentos obligatorios estén subidos y tengan `status != RECHAZADO`.

2. **Presigned URLs**: La subida debe ser directa a MinIO desde el navegador (no pasar por backend) para performance.

3. **Vencimientos**: Los documentos con vencimiento (DNI, Licencia, RTO, Seguros) deben tener `expiresAt` poblado. El sistema debe enviar alertas cuando `expiresAt - NOW() < 30 días`.

4. **Reuso**: Reutilizar componentes existentes:
   - `DocumentUploadModal.tsx` como referencia
   - `useUploadDocumentMutation` existente (adaptar para presigned URLs)
   - Validadores existentes de CUIT/patente/DNI

5. **UI/UX**: La interfaz debe ser **visualmente idéntica** a la imagen proporcionada:
   - Secciones con títulos en negrita
   - Documentos numerados
   - Campos de fecha con formato "Month Day, Year"
   - Botones de "Choose Files" con texto "No file chosen" / "Files submitted"

6. **Compatibilidad**: No romper la página actual `CargaDocumentosPage.tsx` (modo renovación). La nueva página `AltaEquipoPage.tsx` es para **alta inicial completa**.

---

## 🔗 Referencias

- **Imagen de referencia**: Google Form con 30 campos documentados
- **Schema actual**: `apps/documentos/src/prisma/schema.prisma`
- **Componente existente**: `apps/frontend/src/features/documentos/pages/CargaDocumentosPage.tsx`
- **Plan estratégico**: `docs/PLAN_EQUIPOS_CARGA.md`

---

**Siguiente paso**: Ejecutar FASE 1 - Crear seed de templates y endpoints backend.

