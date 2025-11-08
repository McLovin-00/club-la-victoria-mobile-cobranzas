# 📋 RESUMEN COMPLETO: Solución de Compromiso - Sistema de Gestión de Equipos

> **Rama**: `Solucion_de_compromiso`
> **Documento Base**: `ESPECIFICACION_PANTALLA_CARGA_ADMIN_EXTERNO.md`

---

## 🎯 OBJETIVO GENERAL

Sistema multi-rol para la gestión completa de equipos de transporte (Empresa + Chofer + Camión + Acoplado) con documentación, asignación a múltiples clientes, workflow de aprobación y consulta para clientes.

**Origen**: Replicar y mejorar el formulario "QUEBRACHO BLANCO S.R.L. - BASE DE DATOS PROSIL S.A."

---

## 🏗️ MODELO DE NEGOCIO

### Jerarquía:
```
CLIENTES (Ej: PROSIL S.A.)
  ↓ contratan viajes a
GRUPO BCA / QUEBRACHO BLANCO (Dueño de la plataforma)
  ↓ coordina equipos con
DADORES DE CARGA (Intermediarios: Ej: Leandro Castro, o QB actuando como dador)
  ↓ que proveen equipos de
EMPRESAS TRANSPORTISTAS (Tienen flota + choferes)
  ↓ conforman
EQUIPOS = Empresa + Chofer + Camión + Acoplado
  ↓ asignados a
CLIENTES (múltiples clientes por equipo)
```

### Identificadores Únicos:
- **Empresa Transportista** → CUIT (único)
- **Chofer** → DNI (único)
- **Camión** → Patente (única, normalizada)
- **Acoplado** → Patente (única, normalizada)
- **Equipo** → Combinación única de los 4

---

## 👥 ROLES DEL SISTEMA

### 1. **SUPERADMIN / ADMIN**
   - Control total del sistema

### 2. **ADMIN_INTERNO** (Personal Quebracho/Microsyst)
   - Puede cargar equipos para cualquier dador
   - Selector de dador al inicio
   - Acceso a todos los equipos

### 3. **DADOR_DE_CARGA** (Intermediarios como Leandro Castro)
   - Coordina múltiples empresas transportistas
   - Carga equipos para su propio scope
   - **Puede cargar documentos** (nuevos o renovaciones) para cualquier entidad de su scope:
     - ✅ Empresas transportistas que coordina
     - ✅ Choferes de esas empresas
     - ✅ Unidades (camiones y acoplados)
   - **Documentos que él carga** → También pasan por aprobación (ADMIN_INTERNO puede aprobar)
   - **Aprueba/rechaza documentos** cargados por TRANSPORTISTAS/CHOFERES
   - Ve listado de sus equipos con semáforo
   - Quebracho Blanco puede operar como dador

### 4. **TRANSPORTISTA** (Empresa de transporte)
   - Gestiona su propia flota
   - Carga/edita choferes de su empresa
   - Carga/edita unidades (camiones/acoplados)
   - Crea equipos con sus recursos
   - **Puede cargar documentos** (nuevos o renovaciones) para:
     - ✅ Su empresa (constancia ARCA, ingresos brutos, F931, recibos, boleta sindical)
     - ✅ Sus choferes
     - ✅ Sus camiones y acoplados
   - **Todos los documentos cargados** → Estado `PENDIENTE_APROBACION` (🔵 azul)
   - **Esperan aprobación** del DADOR_DE_CARGA
   - Ve listado de sus equipos con semáforo
   - NO aprueba documentos (solo DADOR_DE_CARGA puede aprobar)

### 5. **CHOFER** (Conductor)
   - **Puede cargar documentos** (nuevos o renovaciones) para:
     - ✅ Sus propios documentos personales (DNI, licencia, carnet salud, curso traslado, seguro vida, ART)
     - ✅ Documentos del camión de su equipo (cédula verde, RTO, póliza, certificado GNC)
     - ✅ Documentos del acoplado de su equipo (cédula verde, RTO, póliza, SENASA)
   - **Todos los documentos cargados** → Estado `PENDIENTE_APROBACION` (🔵 azul)
   - **Esperan aprobación** del DADOR_DE_CARGA
   - NO puede cambiar de equipo (solo TRANSPORTISTA/DADOR)
   - Ve solo su equipo
   - Ve documentos rechazados con motivo y comentario
   - Puede re-cargar documentos rechazados (quedan nuevamente en azul)

### 6. **OPERADOR_INTERNO**
   - Personal operativo interno

### 7. **CLIENTE** (Ej: PROSIL S.A.)
   - **Solo lectura**
   - Ve equipos asignados a él
   - Mismo sistema de semáforo
   - Búsqueda por patentes
   - Descarga individual y masiva con filtros
   - NO puede editar nada

---

## 🔑 MATRIZ COMPLETA DE PERMISOS

| Acción | ADMIN_INTERNO | DADOR | TRANSP | CHOFER | CLIENTE |
|--------|---------------|-------|--------|--------|---------|
| **GENERAL** |
| Seleccionar dador al cargar | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver todos los equipos | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver equipos de su dador | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver equipos de su empresa | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver solo su equipo | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ver equipos asignados a él | ✅ | ❌ | ❌ | ❌ | ✅ |
| **EMPRESAS Y EQUIPOS** |
| Cargar múltiples empresas | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cargar solo su empresa | ✅ | ✅ | ✅ | ❌ | ❌ |
| Agregar/editar choferes | ✅ | ✅ | ✅ | ❌ | ❌ |
| Agregar/editar unidades | ✅ | ✅ | ✅ | ❌ | ❌ |
| Crear equipos | ✅ | ✅ | ✅ | ❌ | ❌ |
| Seleccionar clientes | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cambiar chofer de equipo | ✅ | ✅ | ✅ | ❌ | ❌ |
| **DOCUMENTOS PROPIOS** |
| Editar sus propios datos | ✅ | ✅ | ✅ | ✅ | ❌ |
| Cargar/actualizar docs propios | ✅ | ✅ | ✅ | ✅ | ❌ |
| **DOCUMENTOS DEL EQUIPO DEL CHOFER** |
| Editar datos camión equipo | ✅ | ✅ | ✅ | ✅ | ❌ |
| Cargar/actualizar docs camión | ✅ | ✅ | ✅ | ✅ | ❌ |
| Editar datos acoplado equipo | ✅ | ✅ | ✅ | ✅ | ❌ |
| Cargar/actualizar docs acoplado | ✅ | ✅ | ✅ | ✅ | ❌ |
| **APROBACIÓN** |
| Aprobar documentos | ✅ | ❌ | ❌ | ❌ | ❌ |
| Rechazar documentos | ✅ | ❌ | ❌ | ❌ | ❌ |
| **CONSULTA CLIENTE** |
| Ver equipos (solo lectura) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Descargar docs individuales | ❌ | ❌ | ❌ | ❌ | ✅ |
| Descargar ZIP con filtros | ❌ | ❌ | ❌ | ❌ | ✅ |
| Búsqueda por patentes | ❌ | ❌ | ❌ | ❌ | ✅ |
| Ver resumen de estados | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🚦 SISTEMA DE SEMÁFORO (ESTADOS)

### Estados del Equipo:

| Indicador | Estado | Condición |
|-----------|--------|-----------|
| 🟢 Verde | `COMPLETO_AL_DIA` | Todos los docs obligatorios cargados + aprobados + ninguno vencido/por vencer |
| 🟡 Amarillo | `POR_VENCER` | Docs obligatorios completos + al menos uno vence en < 7 días |
| 🔴 Rojo | `VENCIDO` | Al menos un documento vencido |
| ⚪ Gris | `INCOMPLETO` | Faltan documentos obligatorios |
| 🔵 Azul | `PENDIENTE_APROBACION` | Hay documentos nuevos/actualizados pendientes de aprobación |
| 🔴🔵 Rojo+Azul | `RECHAZADO_Y_PENDIENTE` | Tiene documentos rechazados que necesitan recarga |

### Estados de Documento Individual:

| Indicador | Estado | Condición |
|-----------|--------|-----------|
| ⚪ Gris | `NO_CARGADO` | No se ha cargado aún |
| 🔵 Azul | `PENDIENTE_APROBACION` | Cargado/actualizado, esperando aprobación |
| 🟢 Verde | `APROBADO` | Aprobado por el dador, válido |
| 🔴🔵 Rojo+Azul | `RECHAZADO` | Rechazado por el dador, necesita recarga |
| 🔴 Rojo | `VENCIDO` | Vencido (fecha pasada) |
| 🟡 Amarillo | `POR_VENCER` | Por vencer (< 7 días) |

### Reglas de Semáforo:

1. **Prioridad de estados** (de mayor a menor):
   - INCOMPLETO (gris) → Si falta algún doc obligatorio
   - VENCIDO (rojo) → Si hay al menos 1 doc vencido
   - RECHAZADO_Y_PENDIENTE (rojo+azul) → Si hay docs rechazados
   - PENDIENTE_APROBACION (azul) → Si hay docs nuevos sin aprobar
   - POR_VENCER (amarillo) → Si hay docs que vencen < 7 días
   - COMPLETO_AL_DIA (verde) → Todo OK

2. **Cálculo automático en tiempo real**

3. **Visible en**:
   - Listado de equipos (DADOR/TRANSPORTISTA/CHOFER)
   - Listado de equipos (CLIENTE)
   - Detalle de cada documento en pantalla de carga

---

## 🚫 DOCUMENTOS OBLIGATORIOS

### Regla Crítica:
> **NO SE PUEDE GUARDAR UN EQUIPO SIN TODOS LOS DOCUMENTOS OBLIGATORIOS CARGADOS**

### Documentos Obligatorios por Categoría:

#### 🏢 Empresa Transportista (5):
1. Constancia ARCA
2. Constancia Ingresos Brutos
3. Formulario 931
4. Recibos de Sueldo (último mes)
5. Boleta Sindical

#### 👤 Chofer (6):
1. DNI
2. Licencia de Conducir
3. Carnet de Salud
4. Curso de Traslado
5. Seguro de Vida
6. ART

#### 🚜 Tractor/Camión (4):
1. Cédula Verde
2. RTO (Revisión Técnica Obligatoria)
3. Póliza de Seguro
4. Certificado GNC (si corresponde)

#### 🚛 Semi/Acoplado (4):
1. Cédula Verde
2. RTO
3. Póliza de Seguro
4. SENASA

**Total**: 19 documentos obligatorios mínimo

### Validación:
- **Frontend**: Botón "Guardar" deshabilitado si faltan docs
- **Backend**: Endpoint rechaza con HTTP 400 si faltan docs
- **Mensaje claro**: Lista de documentos faltantes

---

## 🔵 WORKFLOW DE APROBACIÓN DE DOCUMENTOS

### Flujo Completo:

```
1. DADOR_DE_CARGA / TRANSPORTISTA / CHOFER carga documento (NUEVO o RENOVACIÓN)
   ↓
   Documentos que puede cargar cada rol:
   
   DADOR_DE_CARGA:
   - Cualquier documento de empresas/choferes/unidades de su scope
   
   TRANSPORTISTA:
   - Documentos de su empresa (ARCA, ingresos brutos, F931, recibos, boleta sindical)
   - Documentos de sus choferes
   - Documentos de sus camiones y acoplados
   
   CHOFER:
   - Sus propios: DNI, licencia, carnet salud, curso traslado, seguro vida, ART
   - Camión de su equipo: cédula verde, RTO, póliza, certificado GNC
   - Acoplado de su equipo: cédula verde, RTO, póliza, SENASA
   ↓
2. Documento queda con estado: PENDIENTE_APROBACION (🔵)
   - Si es documento nuevo → 🔵 azul
   - Si es renovación → 🔵 azul (reemplaza al anterior)
   ↓
3. Equipo muestra indicador 🔵 azul en listado
   ↓
4. DADOR_DE_CARGA ve equipos con pendientes
   (Si el DADOR cargó el doc, ADMIN_INTERNO debe aprobar)
   ↓
5. DADOR (o ADMIN_INTERNO) entra a revisar documentos:
   
   Opción A: APROBAR
   ↓
   - Estado pasa a APROBADO (🟢)
   - Indicador azul desaparece
   - Se registra: quién aprobó + fecha
   
   Opción B: RECHAZAR
   ↓
   - Modal con motivos predefinidos + comentario
   - Estado pasa a RECHAZADO (🔴🔵)
   - Indicador rojo+azul en equipo
   - Se notifica al CHOFER (email/WhatsApp opcional)
   - Se registra: quién rechazó + fecha + motivo + comentario

6. Si rechazado, CHOFER:
   - Ve documento con 🔴🔵 + motivo/comentario
   - Re-carga documento
   - Vuelve a estado PENDIENTE_APROBACION (🔵)
   - Ciclo se repite hasta aprobar

7. Historial completo de versiones y acciones
```

### Características:

- **Indicador azul persiste** hasta que el dador apruebe
- **Motivos de rechazo predefinidos**:
  - Documento ilegible
  - Documento vencido
  - Documento incorrecto
  - Datos no coinciden
  - Otro (requiere comentario)
- **Notificación automática** al chofer por rechazo
- **Aprobación masiva**: Botón "Aprobar todos los pendientes" por equipo
- **Historial**: Tabla `DocumentHistorial` con todas las acciones

### Carga de Documentos: Nuevo vs Renovación

> **Aplicable para**: DADOR_DE_CARGA, TRANSPORTISTA y CHOFER

#### Documento Nuevo (Primera Carga):
```typescript
// Cualquier usuario autorizado carga por primera vez un documento
POST /api/documentos/upload
{
  tipoDocumento: 'dni',
  choferId: 123,              // O empresaId, camionId, acopladoId según corresponda
  file: <archivo>,
  fechaVencimiento: '2030-01-01',
}

Resultado:
- Se crea documento con estadoAprobacion: PENDIENTE_APROBACION
- Equipo muestra indicador 🔵 azul
- Requiere aprobación antes de que cuente como válido:
  * Si cargó CHOFER o TRANSPORTISTA → DADOR_DE_CARGA debe aprobar
  * Si cargó DADOR_DE_CARGA → ADMIN_INTERNO debe aprobar
```

#### Renovación (Actualización de Documento Existente):
```typescript
// Cualquier usuario autorizado carga una nueva versión de un documento
POST /api/documentos/:id/renovar
{
  file: <archivo_nuevo>,
  fechaVencimiento: '2031-01-01',
}

Resultado:
- Se crea NUEVO documento vinculado al anterior
- Campo esActualizacion: true
- Campo documentoAnteriorId: <id del documento anterior>
- Documento anterior se mantiene (historial)
- Nuevo documento: estadoAprobacion: PENDIENTE_APROBACION
- Equipo muestra indicador 🔵 azul
- Requiere aprobación:
  * Si cargó CHOFER o TRANSPORTISTA → DADOR_DE_CARGA debe aprobar
  * Si cargó DADOR_DE_CARGA → ADMIN_INTERNO debe aprobar

// Versionado (cadena de versiones)
Document 1 (original) ← documentoAnteriorId
  └─→ Document 2 (renovación 1) ← documentoAnteriorId
        └─→ Document 3 (renovación 2)
```

#### Flujo de Renovación Completo (Ejemplo):

```
1. DNI actual: Doc #100 (APROBADO 🟢, vence 15/01/2026)
   ↓
2. Hoy: 10/11/2025 (falta 66 días para vencer)
   ↓
3. Usuario autorizado (CHOFER/TRANSPORTISTA/DADOR) carga DNI renovado (vence 15/01/2031)
   ↓
4. Sistema crea Doc #101:
   - estadoAprobacion: PENDIENTE_APROBACION
   - documentoAnteriorId: 100
   - esActualizacion: true
   ↓
5. Equipo muestra:
   - Indicador 🔵 azul (hay doc pendiente)
   - En detalle: DNI con 🔵 (Doc #101 pendiente)
   ↓
6. Aprobador revisa y APRUEBA Doc #101:
   - Si cargó CHOFER/TRANSPORTISTA → DADOR_DE_CARGA aprueba
   - Si cargó DADOR_DE_CARGA → ADMIN_INTERNO aprueba
   ↓
7. Doc #101 pasa a APROBADO
   - Doc #100 queda como historial (no se elimina)
   - Ahora el DNI "activo" es Doc #101
   - Indicador 🔵 desaparece
   - Equipo vuelve a 🟢 verde (si todo OK)
```

### Versionado y Rollback:

- **Todos los documentos históricos se mantienen**
- Campo `documentoAnterior` crea cadena de versiones
- Se puede ver historial completo: Doc #100 → Doc #101 → Doc #102
- Si se rechaza Doc #101, Doc #100 sigue siendo el válido
- NO hay rollback automático
- El usuario que cargó puede volver a cargar (manual)

### Matriz de Carga y Aprobación:

| Rol que CARGA | ¿Puede cargar docs nuevos/renovaciones? | ¿Quién APRUEBA? | Estado inicial |
|---------------|----------------------------------------|-----------------|----------------|
| **ADMIN_INTERNO** | ✅ Cualquier documento | Auto-aprobado o no requiere | `APROBADO` o `APROBADO_AUTOMATICO` |
| **DADOR_DE_CARGA** | ✅ Docs de su scope (empresas/choferes/unidades) | ADMIN_INTERNO | `PENDIENTE_APROBACION` 🔵 |
| **TRANSPORTISTA** | ✅ Docs de su empresa, sus choferes, sus unidades | DADOR_DE_CARGA | `PENDIENTE_APROBACION` 🔵 |
| **CHOFER** | ✅ Docs propios, de su camión, de su acoplado | DADOR_DE_CARGA | `PENDIENTE_APROBACION` 🔵 |
| **CLIENTE** | ❌ No puede cargar | N/A | N/A |

#### Reglas de Aprobación:

1. **CHOFER carga** → DADOR_DE_CARGA debe aprobar
2. **TRANSPORTISTA carga** → DADOR_DE_CARGA debe aprobar
3. **DADOR_DE_CARGA carga** → ADMIN_INTERNO debe aprobar
4. **ADMIN_INTERNO carga** → Auto-aprobado o no requiere aprobación

#### Ejemplo de Flujo Jerárquico:

```
ADMIN_INTERNO
    ↓ (puede aprobar)
DADOR_DE_CARGA (carga docs)
    ↓ (puede aprobar)
TRANSPORTISTA (carga docs)
    ↓ (NO puede aprobar)
CHOFER (carga docs)
```

### Modelo de Datos:

```prisma
model Document {
  // ... campos existentes
  estadoAprobacion    EstadoAprobacion @default(PENDIENTE_APROBACION)
  aprobadoPorId       Int?
  aprobadoPor         User?            @relation("AprobadoPor")
  fechaAprobacion     DateTime?
  rechazadoPorId      Int?
  rechazadoPor        User?            @relation("RechazadoPor")
  fechaRechazo        DateTime?
  motivoRechazo       String?
  comentarioRechazo   String?
  notificarChofer     Boolean          @default(true)
  esActualizacion     Boolean          @default(false)
  documentoAnteriorId Int?
  documentoAnterior   Document?        @relation("VersionAnterior")
  versiones           Document[]       @relation("VersionAnterior")
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

### Endpoints Backend:

```
POST   /api/documentos/aprobacion/:id/aprobar
POST   /api/documentos/aprobacion/:id/rechazar
POST   /api/equipos/:id/aprobar-todos
GET    /api/equipos/:id/documentos-pendientes
GET    /api/equipos/listado-con-pendientes
GET    /api/documentos/:id/historial
```

---

## 👁️ PORTAL DEL CLIENTE (Solo Lectura)

### Funcionalidades Completas:

#### 1. **Listado de Equipos Asignados**
- Mismo sistema de semáforo (🟢🟡🔴⚪🔵🔴🔵)
- Información visible:
  - Empresa transportista
  - Chofer (nombre + DNI)
  - Patente camión
  - Patente acoplado
  - Estado general del equipo
  - Detalle de problemas (docs vencidos, por vencer, faltantes)
- **Resumen estadístico**:
  - 🟢 Equipos aptos: X (%)
  - 🟡 Por vencer: X (%)
  - 🔴 No aptos: X (%)
  - ⚪ Incompletos: X (%)
  - 🔵 Pendientes: X (%)

#### 2. **Vista Detalle de Equipo (Solo Lectura)**
- Información completa del equipo
- Documentos agrupados por categoría (Empresa/Chofer/Tractor/Semi)
- Estado de cada documento con indicador
- Fecha de vencimiento visible
- Información de aprobación (quién + cuándo)
- **Botones por documento**:
  - 👁️ Ver (preview)
  - 📥 Descargar
- **Botones generales**:
  - 📥 Descargar todos los documentos del equipo
  - 📄 Ver historial completo

#### 3. **🔍 Búsqueda por Patentes**
- Input de texto (una patente por línea)
- O cargar archivo CSV/TXT
- Filtrar equipos solo a esas patentes
- Ejemplo:
  ```
  AB123CD
  EF456GH
  MN345OP
  ```

#### 4. **📥 Descarga Masiva en ZIP**

##### Opciones de Filtro Temporal:
- Toda la documentación
- Solo documentos renovados en última **semana**
- Solo documentos renovados en última **quincena**
- Solo documentos renovados en último **mes**
- Solo documentos renovados en último **año**

##### Estructura del ZIP:
```
PROSIL_SA_Documentacion_07-11-2025/
├── Equipo_AB123CD/              ← Solo patente del camión
│   ├── Empresa/
│   │   ├── Constancia_ARCA.pdf
│   │   ├── Constancia_Ingresos_Brutos.pdf
│   │   ├── Formulario_931.pdf
│   │   ├── Recibos_Sueldo.pdf
│   │   └── Boleta_Sindical.pdf
│   ├── Chofer/
│   │   ├── DNI.pdf
│   │   ├── Licencia_Conducir.pdf
│   │   ├── Carnet_Salud.pdf
│   │   ├── Curso_Traslado.pdf
│   │   ├── Seguro_Vida.pdf
│   │   └── ART.pdf
│   ├── Tractor/
│   │   ├── Cedula_Verde.pdf
│   │   ├── RTO.pdf
│   │   ├── Poliza_Seguro.pdf
│   │   └── Certificado_GNC.pdf
│   └── Semi/
│       ├── Cedula_Verde.pdf
│       ├── RTO.pdf
│       ├── Poliza_Seguro.pdf
│       └── SENASA.pdf
├── Equipo_EF456GH/
│   └── ...
└── Resumen.xlsx                 ← Excel con toda la info
```

##### Resumen Excel Incluido:
- Columnas:
  - Equipo (patente camión)
  - Transportista
  - Chofer
  - DNI Chofer
  - Documento
  - Fecha Vencimiento
  - Estado
  - Aprobado Por
- **Formato condicional automático**:
  - 🔴 Rojo: documentos vencidos
  - 🟡 Amarillo: documentos por vencer (< 7 días)
- Ordenado por equipo y documento

##### Opciones Adicionales:
- ☑️ Incluir resumen Excel con vencimientos
- ☑️ Incluir solo documentos aprobados
- ☐ Incluir historial de aprobaciones

### Implementación Técnica Portal Cliente:

#### Backend:
- **Service**: `ClientePortalService`
  - `listarEquiposCliente(clienteId, patentes?)`
  - `obtenerEquipoDetalle(equipoId, clienteId)`
  - Verificación de acceso por `EquipoCliente`

- **Service**: `DocumentZipService`
  - `generarZipEquipos(equipoIds, clienteNombre, options)`
  - `agruparDocumentosPorCategoria(documentos)`
  - `generarResumenExcel(equipos)`
  - Streaming para eficiencia

- **Controller**: `ClientePortalController`
  - `GET /api/cliente/equipos`
  - `GET /api/cliente/equipos/:id`
  - `POST /api/cliente/descargar-zip`
  - Autorización: solo rol `CLIENTE`

#### Frontend:
- **Component**: `ClienteEquiposList.tsx`
  - Panel de búsqueda por patentes
  - Resumen de estados
  - Selector de filtro temporal
  - Descarga individual o masiva

#### Dependencias:
```json
{
  "dependencies": {
    "archiver": "^6.0.1",      // Generación de ZIP
    "exceljs": "^4.4.0"        // Generación de Excel
  }
}
```

---

## 📄 VISTA PREVIA DE DOCUMENTOS

### Características:

#### 1. **Vista Previa Completa (Modal)**
- **Layout lado a lado**:
  - Izquierda: Visor de documento
  - Derecha: Datos del formulario
- **Tipos de archivo soportados**:
  - PDF (con zoom, paginación)
  - Imágenes (JPG, PNG, WEBP)
  - Otros formatos (icono + botón descargar)
- **Controles**:
  - Zoom in/out
  - Navegación páginas (si PDF)
  - Rotación
  - Descargar original

#### 2. **Thumbnails (Miniaturas)**
- Vista previa pequeña al lado de cada documento cargado
- Generación automática en backend
- Click para abrir vista completa

#### 3. **Quick Preview (Vista Rápida)**
- Hover sobre thumbnail → tooltip con preview más grande
- Sin abrir modal completo

### Seguridad:
- **URLs firmadas con expiración**
- Token temporal (1 hora)
- Verificación de permisos por rol
- No exposición de rutas reales

### Implementación:

#### Backend:
- **Service**: `ThumbnailService`
  - Genera thumbnails de PDF (primera página)
  - Genera thumbnails de imágenes (redimensión)
  - Guarda en directorio separado

- **Service**: `SignedURLService`
  - Genera URLs con JWT temporal
  - Expiración configurable (default 1h)

- **Service**: `DocumentPreviewService`
  - `getPreviewUrl(documentId, userId)`
  - Verifica permisos
  - Retorna URL firmada + thumbnail

#### Frontend:
- **Component**: `DocumentPreview.tsx`
- **Component**: `DocumentThumbnail.tsx`
- **Component**: `QuickPreview.tsx`
- **Hook**: `useDocumentPreview(documentId)`

#### Librerías:
```json
{
  "backend": {
    "sharp": "^0.32.0",          // Redimensión de imágenes
    "pdf-lib": "^1.17.1",        // Manipulación PDF
    "pdf2pic": "^3.0.0"          // PDF → Imagen
  },
  "frontend": {
    "react-pdf": "^7.5.0",       // Visor PDF
    "react-image-lightbox": "^5.1.4"  // Visor imágenes
  }
}
```

---

## 🎨 DISEÑO DE LA PANTALLA DE CARGA

### Estructura General (Accordions):

```
┌─────────────────────────────────────────────────────────┐
│ 📋 Cargar Equipo                         [Usuario][🔔]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ [← Volver al Listado]              [💾 Guardar] [❌]    │
│                                                          │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓    │
│ ┃ 🏢 EMPRESA TRANSPORTISTA                    [▼] ┃    │
│ ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫    │
│ ┃                                                  ┃    │
│ ┃ CUIT: [___________]  Nombre: [________________] ┃    │
│ ┃                                                  ┃    │
│ ┃ 📄 Documentos:                                   ┃    │
│ ┃   🟢 Constancia ARCA         [👁️][📥][🔄]       ┃    │
│ ┃   🟡 Const. Ingresos Brutos  [👁️][📥][🔄]       ┃    │
│ ┃   ⚪ Formulario 931           [📤 Cargar]        ┃    │
│ ┃   ...                                            ┃    │
│ ┃                                                  ┃    │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛    │
│                                                          │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓    │
│ ┃ 👤 CHOFER                                   [▼] ┃    │
│ ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫    │
│ ┃                                                  ┃    │
│ ┃ DNI: [________]  Nombre: [_____] Apellido: [__] ┃    │
│ ┃                                                  ┃    │
│ ┃ 📄 Documentos:                                   ┃    │
│ ┃   🟢 DNI                     [👁️][📥][🔄]       ┃    │
│ ┃   🔴 Licencia de Conducir    [👁️][📥][🔄]       ┃    │
│ ┃   🔵 Carnet de Salud         [👁️][Aprobar]     ┃    │ ← Pendiente
│ ┃   ⚪ Curso de Traslado        [📤 Cargar]        ┃    │
│ ┃   ...                                            ┃    │
│ ┃                                                  ┃    │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛    │
│                                                          │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓    │
│ ┃ 🚜 TRACTOR                                  [▼] ┃    │
│ ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫    │
│ ┃ Patente: [______] Marca: [_____] Modelo: [___]  ┃    │
│ ┃ ... documentos ...                               ┃    │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛    │
│                                                          │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓    │
│ ┃ 🚛 SEMI/ACOPLADO                            [▼] ┃    │
│ ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫    │
│ ┃ Patente: [______] Marca: [_____] Modelo: [___]  ┃    │
│ ┃ ... documentos ...                               ┃    │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛    │
│                                                          │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓    │
│ ┃ 🎯 CLIENTES ASIGNADOS                       [▼] ┃    │
│ ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫    │
│ ┃                                                  ┃    │
│ ┃ Seleccione clientes para este equipo:           ┃    │
│ ┃                                                  ┃    │
│ ┃ ☑️ PROSIL S.A.                                   ┃    │
│ ┃ ☐ UNILEVER                                      ┃    │
│ ┃ ☐ COCA-COLA                                     ┃    │
│ ┃ ☑️ ARCOR                                         ┃    │
│ ┃                                                  ┃    │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛    │
│                                                          │
│ ⚠️ Faltan 3 documentos obligatorios                     │
│                                                          │
│ [← Volver]              [💾 Guardar (Deshabilitado)]    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Elementos Clave:

1. **Accordions expandibles/colapsables**
2. **Indicadores de color** al lado de cada documento
3. **Botones contextuales** según estado y rol
4. **Validación en tiempo real** (contador de docs faltantes)
5. **Selector de clientes** (multi-select)
6. **Botón Guardar deshabilitado** si faltan docs obligatorios

---

## 📊 LISTADO DE EQUIPOS CON SEMÁFORO

### Vista para DADOR/TRANSPORTISTA:

```
┌──────────────────────────────────────────────────────────────┐
│ 📋 Mis Equipos                             [Usuario] [Salir] │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  [🔍 Buscar]  [➕ Nuevo Equipo]  [Filtros ▼]                 │
│                                                               │
│  Mostrando 3 de 45 equipos                                   │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ 🟢  Equipo #1                      [✏️ Editar] [📄 Docs] ││
│  │     🏢 Transportes Pérez S.A.                            ││
│  │     👤 Juan Pérez (DNI: 12.345.678)                      ││
│  │     🚜 AB123CD + 🚛 XY789ZW                              ││
│  │     👥 Clientes: PROSIL, ARCOR                           ││
│  │     ✅ Todos los documentos al día                       ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ 🟡  Equipo #2                      [✏️ Editar] [📄 Docs] ││
│  │     🏢 Transportes Pérez S.A.                            ││
│  │     👤 María López (DNI: 87.654.321)                     ││
│  │     🚜 EF456GH + 🚛 IJ012KL                              ││
│  │     👥 Clientes: PROSIL                                  ││
│  │     ⚠️  2 documentos vencen en menos de 7 días           ││
│  │         • RTO Camión (vence 10/11/2025)                  ││
│  │         • Licencia Chofer (vence 12/11/2025)             ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ 🔵  Equipo #3                      [✏️ Editar] [📄 Docs] ││
│  │     🏢 Transportes Gómez S.R.L.                          ││
│  │     👤 Pedro Ruiz (DNI: 11.222.333)                      ││
│  │     🚜 MN345OP + 🚛 QR678ST                              ││
│  │     👥 Clientes: UNILEVER                                ││
│  │     🔵 3 documentos pendientes de aprobación             ││
│  │         • Seguro de Vida Chofer                          ││
│  │         • RTO Semi                                       ││
│  │         • Póliza Camión                                  ││
│  │     [🔍 Revisar Documentos]                              ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Vista para CHOFER (Solo su equipo):

```
┌──────────────────────────────────────────────────────────────┐
│ 📋 Mi Equipo                               [Usuario] [Salir] │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  🔴🔵  Tu Equipo - Requiere Atención                         │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ 🏢 Transportes Pérez S.A.                                ││
│  │ 👤 Juan Pérez (Tú)                                       ││
│  │ 🚜 AB123CD + 🚛 XY789ZW                                  ││
│  │ 👥 Clientes: PROSIL, ARCOR                               ││
│  │                                                           ││
│  │ ⚠️ Estado: 2 documentos rechazados                       ││
│  │                                                           ││
│  │ Documentos rechazados:                                   ││
│  │                                                           ││
│  │ 🔴🔵 Licencia de Conducir                                ││
│  │      Motivo: Documento vencido                           ││
│  │      Comentario: "La licencia presentada venció el       ││
│  │      15/10/2025. Por favor cargar la renovación."        ││
│  │      Rechazado por: María González (01/11/2025)          ││
│  │      [📤 Cargar Nueva Versión]                           ││
│  │                                                           ││
│  │ 🔴🔵 Carnet de Salud                                     ││
│  │      Motivo: Documento ilegible                          ││
│  │      Comentario: "No se pueden leer los datos. Por favor││
│  │      escanear con mejor calidad."                        ││
│  │      Rechazado por: María González (01/11/2025)          ││
│  │      [📤 Cargar Nueva Versión]                           ││
│  │                                                           ││
│  │ [✏️ Ir a Pantalla de Carga]                              ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🛠️ ARQUITECTURA TÉCNICA

### Frontend (React + TypeScript):

#### Componentes Principales:
```
src/
├── pages/
│   ├── EquiposList.tsx                   // Listado con semáforo
│   ├── EquipoForm.tsx                    // Pantalla de carga
│   ├── ClienteEquiposList.tsx            // Portal cliente
│   └── ClienteEquipoDetail.tsx           // Detalle cliente
├── components/
│   ├── SeccionEmpresa.tsx                // Accordion empresa
│   ├── SeccionChofer.tsx                 // Accordion chofer
│   ├── SeccionUnidades.tsx               // Accordion unidades
│   ├── SeccionClientes.tsx               // Selector clientes
│   ├── DocumentUploader.tsx              // Subida de docs
│   ├── DocumentCard.tsx                  // Card de documento
│   ├── DocumentPreview.tsx               // Modal preview
│   ├── DocumentThumbnail.tsx             // Miniatura
│   ├── EquipoEstadoBadge.tsx             // Badge de estado
│   ├── AprobacionModal.tsx               // Modal aprobar/rechazar
│   └── RechazoModal.tsx                  // Modal con motivos
├── hooks/
│   ├── useEquipoEstado.ts                // Cálculo de estados
│   ├── useDocumentPreview.ts             // Vista previa
│   ├── useDocumentUpload.ts              // Subida
│   └── useAprobacion.ts                  // Workflow aprobación
└── services/
    ├── equipoService.ts                  // CRUD equipos
    ├── documentService.ts                // CRUD documentos
    ├── aprobacionService.ts              // Aprobación
    └── clientePortalService.ts           // Portal cliente
```

### Backend (Node.js + Express + Prisma):

#### Estructura:
```
apps/backend/src/
├── controllers/
│   ├── EquipoController.ts               // CRUD equipos
│   ├── DocumentController.ts             // CRUD documentos
│   ├── AprobacionController.ts           // Workflow aprobación
│   └── ClientePortalController.ts        // Portal cliente
├── services/
│   ├── EquipoService.ts
│   ├── EquipoEstadoService.ts            // Cálculo semáforo
│   ├── EquipoValidationService.ts        // Docs obligatorios
│   ├── DocumentoAprobacionService.ts     // Aprobación
│   ├── ThumbnailService.ts               // Generación thumbnails
│   ├── SignedURLService.ts               // URLs firmadas
│   ├── DocumentPreviewService.ts         // Preview
│   ├── ClientePortalService.ts           // Consulta cliente
│   └── DocumentZipService.ts             // Generación ZIP
├── middleware/
│   ├── auth.ts                           // JWT
│   ├── authorize.ts                      // RBAC por rol
│   ├── resolveUserScope.ts               // Scope por usuario
│   └── canAccessResource.ts              // Permisos granulares
├── routes/
│   ├── equipos.routes.ts
│   ├── documentos.routes.ts
│   ├── aprobacion.routes.ts
│   └── clientePortal.routes.ts
└── validators/
    ├── equipoValidator.ts
    └── documentValidator.ts
```

### Base de Datos (Prisma):

#### Modelos Clave:
```prisma
model User {
  id       Int      @id @default(autoincrement())
  email    String   @unique
  role     UserRole
  // ... otros campos
}

enum UserRole {
  SUPERADMIN
  ADMIN
  ADMIN_INTERNO
  DADOR_DE_CARGA
  TRANSPORTISTA
  CHOFER
  OPERADOR_INTERNO
  CLIENTE
  USER
}

model EmpresaTransportista {
  id              Int      @id @default(autoincrement())
  cuit            String   @unique
  nombre          String
  dadorDeCargaId  Int?
  dadorDeCarga    User?    @relation("DadorEquipos")
  // ...
  equipos         Equipo[]
  documentos      Document[]
}

model Chofer {
  id                  Int      @id @default(autoincrement())
  dni                 String   @unique
  nombre              String
  apellido            String
  empresaId           Int
  empresa             EmpresaTransportista @relation(...)
  equipos             Equipo[]
  documentos          Document[]
}

model Camion {
  id         Int      @id @default(autoincrement())
  patente    String   @unique
  marca      String
  modelo     String
  empresaId  Int
  empresa    EmpresaTransportista @relation(...)
  equipos    Equipo[]
  documentos Document[]
}

model Acoplado {
  id         Int      @id @default(autoincrement())
  patente    String   @unique
  marca      String
  modelo     String
  empresaId  Int
  empresa    EmpresaTransportista @relation(...)
  equipos    Equipo[]
  documentos Document[]
}

model Equipo {
  id             Int      @id @default(autoincrement())
  empresaId      Int
  empresa        EmpresaTransportista @relation(...)
  choferId       Int      @unique  // Un chofer = 1 equipo
  chofer         Chofer   @relation(...)
  camionId       Int
  camion         Camion   @relation(...)
  acoplado       Int
  acoplado       Acoplado @relation(...)
  
  equiposClientes EquipoCliente[]  // Múltiples clientes
  
  @@unique([empresaId, choferId, camionId, acopladoId])
}

model EquipoCliente {
  id        Int      @id @default(autoincrement())
  equipoId  Int
  clienteId Int
  createdAt DateTime @default(now())
  
  equipo   Equipo @relation(...)
  cliente  User   @relation("ClienteEquipos", ...)
  
  @@unique([equipoId, clienteId])
  @@index([clienteId])
  @@index([equipoId])
}

model Document {
  id                  Int               @id @default(autoincrement())
  tipoDocumento       String
  fileName            String
  filePath            String
  fileSize            Int
  mimeType            String
  fechaVencimiento    DateTime?
  
  // Relaciones polimórficas
  empresaId           Int?
  empresa             EmpresaTransportista? @relation(...)
  choferId            Int?
  chofer              Chofer?           @relation(...)
  camionId            Int?
  camion              Camion?           @relation(...)
  acopladoId          Int?
  acoplado            Acoplado?         @relation(...)
  
  // Workflow de aprobación
  estadoAprobacion    EstadoAprobacion  @default(PENDIENTE_APROBACION)
  aprobadoPorId       Int?
  aprobadoPor         User?             @relation("AprobadoPor", ...)
  fechaAprobacion     DateTime?
  rechazadoPorId      Int?
  rechazadoPor        User?             @relation("RechazadoPor", ...)
  fechaRechazo        DateTime?
  motivoRechazo       String?
  comentarioRechazo   String?
  notificarChofer     Boolean           @default(true)
  
  // Versionado
  esActualizacion     Boolean           @default(false)
  documentoAnteriorId Int?
  documentoAnterior   Document?         @relation("VersionAnterior", ...)
  versiones           Document[]        @relation("VersionAnterior")
  
  // Metadata
  uploadedById        Int
  uploadedBy          User              @relation("UploadedBy", ...)
  isDeleted           Boolean           @default(false)
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  
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
  accion            String   // 'subido' | 'aprobado' | 'rechazado' | 'reemplazado' | 'actualizado'
  userId            Int
  motivoRechazo     String?
  comentarioRechazo String?
  metadata          Json?
  createdAt         DateTime @default(now())
  
  document   Document @relation(...)
  user       User     @relation(...)
  
  @@index([documentId])
  @@index([documentId, createdAt])
}
```

---

## 🚀 ENDPOINTS API COMPLETOS

### Equipos:
```
GET    /api/equipos                       // Listar (según rol)
GET    /api/equipos/:id                   // Detalle
POST   /api/equipos                       // Crear
PUT    /api/equipos/:id                   // Actualizar
DELETE /api/equipos/:id                   // Eliminar
GET    /api/equipos/:id/documentos        // Docs del equipo
GET    /api/equipos/:id/estado            // Estado con semáforo
POST   /api/equipos/:id/validar           // Validar docs obligatorios
```

### Documentos:
```
POST   /api/documentos/upload             // Subir documento
GET    /api/documentos/:id                // Detalle
GET    /api/documentos/:id/download       // Descargar
PUT    /api/documentos/:id                // Actualizar metadata
DELETE /api/documentos/:id                // Eliminar (soft delete)
GET    /api/documentos/:id/preview        // URL firmada preview
GET    /api/documentos/:id/thumbnail      // Thumbnail
GET    /api/documentos/:id/historial      // Historial de acciones
```

### Aprobación:
```
POST   /api/documentos/aprobacion/:id/aprobar           // Aprobar documento
POST   /api/documentos/aprobacion/:id/rechazar          // Rechazar documento
POST   /api/equipos/:id/aprobar-todos                   // Aprobar todos pendientes
GET    /api/equipos/:id/documentos-pendientes           // Listar pendientes de equipo
GET    /api/equipos/listado-con-pendientes              // Equipos con pendientes
```

### Portal Cliente:
```
GET    /api/cliente/equipos                             // Listar equipos asignados
GET    /api/cliente/equipos/:id                         // Detalle equipo (RO)
POST   /api/cliente/descargar-zip                       // Generar ZIP con filtros
```

### Empresas:
```
GET    /api/empresas                      // Listar
POST   /api/empresas                      // Crear
PUT    /api/empresas/:id                  // Actualizar
GET    /api/empresas/:id/documentos       // Docs empresa
```

### Choferes:
```
GET    /api/choferes                      // Listar
POST   /api/choferes                      // Crear
PUT    /api/choferes/:id                  // Actualizar
GET    /api/choferes/:id/documentos       // Docs chofer
```

### Unidades:
```
GET    /api/unidades/camiones             // Listar camiones
POST   /api/unidades/camiones             // Crear camión
GET    /api/unidades/acoplados            // Listar acoplados
POST   /api/unidades/acoplados            // Crear acoplado
```

---

## 🔐 SEGURIDAD

### Autenticación:
- JWT con RS256
- Refresh tokens
- Expiración configurable

### Autorización:
- **Middleware `authenticate`**: Verifica JWT
- **Middleware `authorize([roles])`**: Verifica rol
- **Middleware `resolveUserScope`**: Determina scope (dadorId, empresaId, choferId)
- **Middleware `canAccessResource`**: Verifica acceso granular a recursos

### Validación de Archivos:
- Tipos permitidos: PDF, JPG, PNG, WEBP
- Tamaño máximo: 10 MB por archivo
- Escaneo de virus (opcional con ClamAV)
- Normalización de nombres

### Protección de Datos:
- URLs firmadas con expiración
- No exposición de rutas reales
- Logging de accesos
- Sin PII en logs

### Rate Limiting:
- Por endpoint
- Por usuario
- Configurable según .env

---

## 📱 RESPONSIVIDAD

### Desktop (> 1024px):
- Layout 2 columnas
- Accordions lado a lado
- Modals grandes

### Tablet (768px - 1024px):
- Layout 1 columna
- Accordions apilados
- Modals medianos

### Mobile (< 768px):
- Layout vertical
- Acordeons colapsados por defecto
- Modals fullscreen
- Botones táctiles grandes

---

## 📊 PLAN DE IMPLEMENTACIÓN (6 FASES)

### **Fase 1: Setup y Roles** (2-3 días)
- [ ] Agregar roles a enum `UserRole`
- [ ] Crear middleware de autorización
- [ ] Tests de permisos
- [ ] Migración BD

### **Fase 2: Sección Empresa** (2-3 días)
- [ ] Backend: CRUD empresa
- [ ] Backend: Endpoints documentos empresa
- [ ] Frontend: `SeccionEmpresa.tsx`
- [ ] Frontend: `DocumentUploader.tsx`
- [ ] Validación de CUIT

### **Fase 3: Sección Choferes** (3-4 días)
- [ ] Backend: CRUD choferes
- [ ] Backend: Endpoints documentos chofer
- [ ] Frontend: `SeccionChoferes.tsx`
- [ ] Frontend: Modal de chofer
- [ ] Validación DNI único
- [ ] Restricción: 1 chofer = 1 equipo

### **Fase 4: Sección Unidades** (3-4 días)
- [ ] Backend: CRUD camiones/acoplados
- [ ] Backend: Endpoints documentos unidades
- [ ] Frontend: `SeccionUnidades.tsx`
- [ ] Frontend: Tabs Tractor/Semi
- [ ] Normalización de patentes
- [ ] Validación patente única

### **Fase 5: Dashboard y Sistema de Semáforo** (2 días)
- [ ] Backend: `EquipoEstadoService` (cálculo)
- [ ] Backend: Endpoint `/equipos/:id/estado`
- [ ] Backend: `EquipoValidationService` (docs obligatorios)
- [ ] Frontend: `EquiposList.tsx` con semáforo
- [ ] Frontend: `EquipoEstadoBadge.tsx`
- [ ] Validación "Guardar" deshabilitado

### **Fase 6: Workflow de Aprobación** (3-4 días)
- [ ] Backend: `DocumentoAprobacionService`
- [ ] Backend: `AprobacionController`
- [ ] Backend: Endpoints aprobar/rechazar
- [ ] Backend: `DocumentHistorial` model
- [ ] Frontend: `AprobacionModal.tsx`
- [ ] Frontend: `RechazoModal.tsx` con motivos
- [ ] Notificaciones email/WhatsApp
- [ ] Indicadores azules

### **Fase 7: Vista Previa de Documentos** (2-3 días)
- [ ] Backend: `ThumbnailService`
- [ ] Backend: `SignedURLService`
- [ ] Backend: `DocumentPreviewService`
- [ ] Frontend: `DocumentPreview.tsx` (modal)
- [ ] Frontend: `DocumentThumbnail.tsx`
- [ ] Frontend: `QuickPreview.tsx`
- [ ] Visor PDF/imágenes

### **Fase 8: Portal del Cliente** (3-4 días)
- [ ] Backend: `ClientePortalService`
- [ ] Backend: `DocumentZipService`
- [ ] Backend: `ClientePortalController`
- [ ] Backend: Generación Excel con exceljs
- [ ] Frontend: `ClienteEquiposList.tsx`
- [ ] Frontend: `ClienteEquipoDetail.tsx`
- [ ] Búsqueda por patentes
- [ ] Descarga ZIP con filtros temporales

### **Fase 9: Tests y Pulido** (2 días)
- [ ] Tests unitarios servicios
- [ ] Tests integración endpoints
- [ ] Tests E2E flujos críticos
- [ ] Linting y formato
- [ ] Documentación API (Swagger)

---

## ⏱️ ESTIMACIÓN TOTAL

| Fase | Días | Acumulado |
|------|------|-----------|
| Fase 1: Setup y Roles | 2-3 | 3 |
| Fase 2: Empresa | 2-3 | 6 |
| Fase 3: Choferes | 3-4 | 10 |
| Fase 4: Unidades | 3-4 | 14 |
| Fase 5: Dashboard | 2 | 16 |
| Fase 6: Aprobación | 3-4 | 20 |
| Fase 7: Vista Previa | 2-3 | 23 |
| Fase 8: Portal Cliente | 3-4 | 27 |
| Fase 9: Tests | 2 | 29 |

**Total: 25-30 días hábiles** (~5-6 semanas)

---

## 🎯 REGLAS DE NEGOCIO CRÍTICAS

1. ✅ **Un chofer solo puede estar en 1 equipo a la vez**
2. ✅ **Un equipo puede trabajar para múltiples clientes**
3. ✅ **El chofer NO puede auto-asignarse a otro equipo**
4. ✅ **Cada entidad se identifica por clave única** (CUIT, DNI, Patentes)
5. ✅ **NO se puede guardar sin documentos obligatorios completos**
6. ✅ **Los clientes tienen acceso de SOLO LECTURA**
7. ✅ **Solo DADOR_DE_CARGA puede aprobar/rechazar documentos**
8. ✅ **Indicador azul persiste hasta aprobación del dador**
9. ✅ **Equipos se identifican por patente del camión en ZIP**

---

## 🔄 MEJORAS FUTURAS (Post-MVP)

### No incluidas en esta fase pero consideradas:

1. **Notificaciones automáticas**:
   - Email alertas de vencimiento (7 días antes)
   - WhatsApp recordatorios
   - Push notifications en app móvil

2. **Dashboard de estadísticas**:
   - Gráficos de equipos por estado
   - Tendencias de vencimientos
   - Ranking de transportistas

3. **Búsqueda y filtros avanzados**:
   - Filtro por cliente
   - Filtro por estado
   - Filtro por fecha de carga
   - Búsqueda full-text

4. **Exportación de datos**:
   - Excel con todo el listado
   - PDF de ficha de equipo
   - CSV para integraciones

5. **Integración con APIs externas**:
   - AFIP (validación CUIT)
   - ANSES (validación DNI)
   - Registro de Conductores

6. **Aplicación móvil**:
   - App nativa iOS/Android
   - Cámara para escanear docs
   - Notificaciones push

7. **Audit log completo**:
   - Registro de todos los cambios
   - Quién hizo qué y cuándo
   - Exportable

8. **Firma digital de documentos**:
   - Firma electrónica de aprobaciones
   - Certificados digitales

---

## ✅ FUNCIONALIDADES COMPLETAMENTE ESPECIFICADAS

### ✅ 1. Sistema Multi-Rol (8 roles)
### ✅ 2. Pantalla de Carga Completa (4 secciones)
### ✅ 3. Validación Documentos Obligatorios (19 docs)
### ✅ 4. Sistema de Semáforo (6 estados)
### ✅ 5. Workflow de Aprobación (con indicadores azules)
### ✅ 6. Vista Previa de Documentos (PDF + imágenes)
### ✅ 7. Portal del Cliente (consulta + descarga ZIP)
### ✅ 8. Búsqueda por Patentes
### ✅ 9. Descarga Masiva con Filtros Temporales
### ✅ 10. Generación de Excel con Resumen
### ✅ 11. Historial de Documentos
### ✅ 12. Notificaciones por Rechazo
### ✅ 13. URLs Firmadas para Seguridad
### ✅ 14. Thumbnails Automáticos
### ✅ 15. Listado de Equipos con Estados
### ✅ 16. Asignación Múltiple a Clientes
### ✅ 17. Restricción 1 Chofer = 1 Equipo
### ✅ 18. Identificadores Únicos (CUIT, DNI, Patentes)
### ✅ 19. Arquitectura Backend Completa
### ✅ 20. Arquitectura Frontend Completa

---

## ✅ FUNCIONALIDADES CONFIRMADAS (Respuestas del Cliente)

### 1. ✅ **Gestión de Usuarios**
**Decisión**: Los ADMIN_INTERNO utilizarán el **sistema de gestión de usuarios existente** en el monorepo.
- No se crea pantalla nueva de administración
- Los admins crean usuarios con los roles necesarios (DADOR_DE_CARGA, TRANSPORTISTA, CHOFER, CLIENTE)
- NO hay auto-registro

### 2. ✅ **Sistema de Notificaciones** (A IMPLEMENTAR)
**Decisión**: Preparar sistema de notificaciones **no bloqueante**.

#### Características:
- **Email**: Si el usuario tiene email configurado
- **WhatsApp**: Si el usuario tiene teléfono + opt-in
- **No bloqueante**: Si faltan datos, el sistema sigue funcionando
- **Eventos a notificar**:
  - Documento rechazado (al CHOFER)
  - Documento por vencer en 7 días (al CHOFER + TRANSPORTISTA + DADOR)
  - Documento vencido (al CHOFER + TRANSPORTISTA + DADOR)
  - Documento aprobado (al CHOFER)
  - Equipo completo y apto (al DADOR + CLIENTE)

#### Implementación:
```typescript
// Servicio de notificaciones
interface NotificationService {
  // Email
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  
  // WhatsApp (usando API de Twilio o similar)
  sendWhatsApp(to: string, message: string): Promise<void>;
  
  // Método genérico
  notifyUser(userId: number, event: NotificationEvent, data: any): Promise<void>;
}

// Eventos
enum NotificationEvent {
  DOCUMENTO_RECHAZADO = 'documento_rechazado',
  DOCUMENTO_POR_VENCER = 'documento_por_vencer',
  DOCUMENTO_VENCIDO = 'documento_vencido',
  DOCUMENTO_APROBADO = 'documento_aprobado',
  EQUIPO_COMPLETO = 'equipo_completo',
}

// Modelo para preferencias
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

#### Cron Job para alertas automáticas:
```typescript
// Ejecutar diariamente a las 8 AM
cron.schedule('0 8 * * *', async () => {
  // Buscar documentos que vencen en 7 días
  const documentosPorVencer = await prisma.document.findMany({
    where: {
      fechaVencimiento: {
        gte: new Date(),
        lte: add(new Date(), { days: 7 }),
      },
      estadoAprobacion: 'APROBADO',
    },
    include: { 
      chofer: true, 
      empresa: { include: { transportista: true, dadorDeCarga: true } }
    },
  });
  
  // Notificar a cada chofer/transportista/dador
  for (const doc of documentosPorVencer) {
    await notificationService.notifyUser(
      doc.chofer.userId,
      NotificationEvent.DOCUMENTO_POR_VENCER,
      doc
    );
  }
});
```

### 3. ❌ **Historial de Equipos**
**Decisión**: NO se implementa historial de equipos anteriores por chofer.
- No se rastrean cambios de equipo del chofer
- No se puede ver equipos anteriores

### 4. ❌ **Reportes/Dashboard Adicionales**
**Decisión**: NO se implementan reportes ni dashboards con gráficos.
- Solo el resumen básico de estados en listado
- Sin gráficos estadísticos

### 5. ❌ **Integraciones Externas**
**Decisión**: NO se integran APIs externas (AFIP, ANSES, etc.)
- Validación manual de CUIT/DNI
- Sin consulta automática a organismos

### 6. ✅ **Sistema de Auditoría Completo** (A IMPLEMENTAR)
**Decisión**: **LOGS COMPLETOS de todas las acciones**.

#### Acciones a loggear:
- ✅ Carga de documento
- ✅ Descarga de documento
- ✅ Actualización/reemplazo de documento
- ✅ Eliminación de documento
- ✅ Aprobación de documento
- ✅ Rechazo de documento
- ✅ Creación de equipo
- ✅ Actualización de equipo
- ✅ Eliminación de equipo
- ✅ Asignación de equipo a cliente
- ✅ Desasignación de equipo de cliente
- ✅ Descarga de ZIP por cliente
- ✅ Cambio de chofer en equipo
- ✅ Login/logout de usuario

#### Implementación:
```prisma
// Modelo genérico de audit log
model AuditLog {
  id           Int      @id @default(autoincrement())
  
  // Quién
  userId       Int
  user         User     @relation(...)
  userRole     UserRole
  userEmail    String
  
  // Qué
  action       String   // 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'DOWNLOAD' | 'UPLOAD'
  entityType   String   // 'Document' | 'Equipo' | 'EmpresaTransportista' | 'Chofer' | 'Camion' | 'Acoplado'
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

#### Servicio de Auditoría:
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
  }): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { role: true, email: true },
    });
    
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userRole: user.role,
        userEmail: user.email,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changes: params.changes,
        metadata: params.metadata,
        ipAddress: params.req?.ip,
        userAgent: params.req?.headers['user-agent'],
      },
    });
  }
  
  // Consultar logs
  async getLogs(filters: {
    userId?: number;
    entityType?: string;
    entityId?: number;
    action?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    pageSize?: number;
  }) {
    return prisma.auditLog.findMany({
      where: {
        userId: filters.userId,
        entityType: filters.entityType,
        entityId: filters.entityId,
        action: filters.action,
        createdAt: {
          gte: filters.dateFrom,
          lte: filters.dateTo,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (filters.page || 0) * (filters.pageSize || 50),
      take: filters.pageSize || 50,
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
      },
    });
  }
}
```

#### Middleware de Auditoría:
```typescript
// Middleware que se aplica a todos los endpoints
export const auditMiddleware = (action: AuditAction, entityType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    
    res.json = (body: any) => {
      // Log después de respuesta exitosa
      if (res.statusCode < 400) {
        auditService.log({
          userId: req.user!.id,
          action,
          entityType,
          entityId: req.params.id ? parseInt(req.params.id) : undefined,
          changes: req.body,
          metadata: { params: req.params, query: req.query },
          req,
        }).catch(err => console.error('Audit log error:', err));
      }
      
      return originalJson(body);
    };
    
    next();
  };
};

// Uso en rutas
router.post(
  '/equipos',
  authenticate,
  authorize(['ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA']),
  auditMiddleware('CREATE', 'Equipo'),
  equipoController.create
);

router.put(
  '/equipos/:id',
  authenticate,
  authorize(['ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA']),
  auditMiddleware('UPDATE', 'Equipo'),
  equipoController.update
);
```

#### Endpoints de Auditoría:
```
GET /api/audit/logs                  // Listar todos (solo ADMIN)
GET /api/audit/logs/entity/:type/:id // Logs de una entidad específica
GET /api/audit/logs/user/:userId     // Logs de un usuario
GET /api/audit/logs/export           // Exportar CSV
```

### 7. ✅ **Documentos Obligatorios**
**Decisión**: Los documentos obligatorios son **FIJOS**, los mismos que aparecen en el formulario original.

#### Lista Final de Documentos Obligatorios (19):

**🏢 Empresa Transportista (5)**:
1. Constancia ARCA
2. Constancia Ingresos Brutos
3. Formulario 931
4. Recibos de Sueldo (último mes)
5. Boleta Sindical

**👤 Chofer (6)**:
1. DNI
2. Licencia de Conducir
3. Carnet de Salud
4. Curso de Traslado de Sustancias Alimenticias
5. Seguro de Vida
6. ART (Aseguradora de Riesgos del Trabajo)

**🚜 Tractor/Camión (4)**:
1. Cédula Verde
2. RTO (Revisión Técnica Obligatoria)
3. Póliza de Seguro
4. Certificado GNC (si aplica)

**🚛 Semi/Acoplado (4)**:
1. Cédula Verde
2. RTO
3. Póliza de Seguro
4. SENASA

**NO configurable por cliente** - Todos los clientes requieren los mismos 19 documentos.

### 8. ❌ **Wizard de Onboarding**
**Decisión**: NO se implementa wizard de onboarding.
- Formulario libre estándar
- Sin pasos guiados

### 9. ❌ **Permisos Granulares Adicionales**
**Decisión**: NO se agregan sub-roles ni permisos adicionales.
- Los 8 roles definidos son suficientes
- Un TRANSPORTISTA = 1 usuario (no múltiples usuarios por empresa)

### 10. ✅ **Política de Backup y Recovery** (PROPUESTA)

#### 🔄 Propuesta de Backup/Recovery:

##### **A. Backup de Base de Datos**

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
    └── Retención: Indefinida (hasta confirmar éxito)
```

**Implementación**:
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
if [ $? -eq 0 ]; then
  echo "✅ Backup exitoso: $TIMESTAMP"
else
  echo "❌ Backup FALLÓ: $TIMESTAMP" | mail -s "ALERTA: Backup Falló" admin@example.com
fi
```

##### **B. Backup de Documentos (Archivos)**

**Estrategia**:
- Documentos en filesystem o S3
- Sincronización automática a bucket de respaldo
- Versionado habilitado en S3

**Opciones**:

**Opción 1: Filesystem Local**
```bash
#!/bin/bash
# Backup de archivos (crontab: 0 3 * * *)

DOCS_DIR="/var/www/monorepo-bca/uploads"
BACKUP_DIR="/backups/documentos"
TIMESTAMP=$(date +%Y%m%d)
S3_BUCKET="s3://bca-backups/documentos"

# Rsync incremental
rsync -av --delete \
  "$DOCS_DIR/" \
  "$BACKUP_DIR/$TIMESTAMP/"

# Sync a S3
aws s3 sync "$DOCS_DIR" "$S3_BUCKET" --delete

# Limpiar backups locales > 7 días
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
```

**Opción 2: S3 con Versionado** (RECOMENDADO)
```typescript
// Configurar bucket S3 con versionado
const s3Config = {
  bucket: 'bca-documentos',
  region: 'us-east-1',
  versioning: true,              // ✅ Versionado automático
  lifecycleRules: [
    {
      // Mover versiones antiguas a Glacier después de 90 días
      transitions: [
        { days: 90, storageClass: 'GLACIER' },
      ],
      // Eliminar versiones > 1 año
      expiration: { days: 365 },
    },
  ],
  replication: {
    // Replicar a otra región
    destinationBucket: 'bca-documentos-replica',
    destinationRegion: 'us-west-2',
  },
};
```

##### **C. Soft Delete de Documentos**

**Decisión**: Soft delete **temporal** con purga automática.

```prisma
model Document {
  // ... campos existentes
  
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?
  deletedById Int?
  deletedBy   User?     @relation("DeletedBy", ...)
  
  // Auto-purga después de 90 días
  purgeAt     DateTime? // Calculado como deletedAt + 90 días
}
```

**Lógica**:
```typescript
// Soft delete
async deleteDocument(id: number, userId: number) {
  const purgeDate = add(new Date(), { days: 90 });
  
  await prisma.document.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedById: userId,
      purgeAt: purgeDate,
    },
  });
  
  // Audit log
  await auditService.log({
    userId,
    action: 'DELETE',
    entityType: 'Document',
    entityId: id,
    metadata: { softDelete: true, purgeAt: purgeDate },
  });
}

// Cron job para purga automática (diario)
cron.schedule('0 4 * * *', async () => {
  const documentosPorPurgar = await prisma.document.findMany({
    where: {
      isDeleted: true,
      purgeAt: { lte: new Date() },
    },
  });
  
  for (const doc of documentosPorPurgar) {
    // Eliminar archivo físico
    await fs.unlink(doc.filePath);
    
    // Hard delete de BD
    await prisma.document.delete({ where: { id: doc.id } });
    
    console.log(`Purgado documento ${doc.id} después de 90 días`);
  }
});
```

**Recuperación** (dentro de 90 días):
```typescript
async restoreDocument(id: number, userId: number) {
  await prisma.document.update({
    where: { id },
    data: {
      isDeleted: false,
      deletedAt: null,
      deletedById: null,
      purgeAt: null,
    },
  });
  
  await auditService.log({
    userId,
    action: 'RESTORE',
    entityType: 'Document',
    entityId: id,
  });
}
```

##### **D. Disaster Recovery Plan**

**RTO (Recovery Time Objective)**: 4 horas
**RPO (Recovery Point Objective)**: 6 horas (último backup incremental)

**Procedimiento de Recuperación**:

1. **Restaurar Base de Datos**:
```bash
# 1. Descargar último backup
aws s3 cp s3://bca-backups/postgres/backup_latest.dump.gz /tmp/

# 2. Descomprimir
gunzip /tmp/backup_latest.dump.gz

# 3. Restaurar
pg_restore -d monorepo_bca_recovered /tmp/backup_latest.dump

# 4. Verificar
psql -d monorepo_bca_recovered -c "SELECT COUNT(*) FROM \"Document\";"
```

2. **Restaurar Documentos**:
```bash
# Desde S3
aws s3 sync s3://bca-backups/documentos /var/www/monorepo-bca/uploads
```

3. **Verificar Integridad**:
```typescript
// Script de verificación
async function verifyIntegrity() {
  const documents = await prisma.document.findMany({
    where: { isDeleted: false },
  });
  
  let missing = 0;
  for (const doc of documents) {
    if (!fs.existsSync(doc.filePath)) {
      console.error(`❌ Archivo faltante: ${doc.id} - ${doc.filePath}`);
      missing++;
    }
  }
  
  console.log(`✅ Verificados: ${documents.length - missing}`);
  console.log(`❌ Faltantes: ${missing}`);
}
```

##### **E. Monitoreo de Backups**

**Alertas**:
- ❌ Backup falló → Email + SMS a admin
- ⚠️ Backup tardó más de 2 horas → Email
- ✅ Backup exitoso → Log silencioso

**Dashboard**:
- Último backup exitoso
- Tamaño de backups
- Tiempo de ejecución
- Espacio disponible en disco/S3

**Healthcheck**:
```typescript
// Endpoint para monitoreo
app.get('/api/health/backups', async (req, res) => {
  const lastBackup = await getLastBackupInfo();
  const horasSinBackup = (Date.now() - lastBackup.timestamp) / (1000 * 60 * 60);
  
  if (horasSinBackup > 24) {
    return res.status(500).json({
      status: 'error',
      message: 'Sin backup en las últimas 24 horas',
      lastBackup,
    });
  }
  
  res.json({
    status: 'ok',
    lastBackup,
  });
});
```

##### **F. Costos Estimados**

**S3 Standard** (documentos activos):
- 100 GB × $0.023/GB = $2.30/mes

**S3 Glacier** (backups antiguos):
- 500 GB × $0.004/GB = $2.00/mes

**Total estimado**: ~$5-10/mes (depende del volumen)

##### **G. Recomendación Final**

**Configuración Recomendada**:
```yaml
backup:
  database:
    full: "0 2 * * *"           # Diario 2 AM
    incremental: "0 */6 * * *"  # Cada 6 horas
    retention: 30               # días
    
  documents:
    strategy: "s3-versioned"    # S3 con versionado
    replication: true           # Replicar a otra región
    retention:
      versions: 365             # días
      deleted: 90               # días (soft delete)
      
  monitoring:
    alerts:
      email: "admin@grupobbca.com"
      slack: "#ops-alerts"
      
  recovery:
    rto: 4                      # horas
    rpo: 6                      # horas
```

---

---

## 📝 CONCLUSIÓN FINAL

Esta especificación cubre un **sistema completo de gestión de equipos de transporte** con **TODAS las funcionalidades confirmadas y definidas**:

### ✅ Funcionalidades Core:
- ✅ **8 roles diferentes** con permisos granulares
- ✅ **Sistema de estados con 6 indicadores** (semáforo 🟢🟡🔴⚪🔵🔴🔵)
- ✅ **Validación estricta** de 19 documentos obligatorios (FIJOS)
- ✅ **Workflow de aprobación** completo con indicadores azules persistentes
- ✅ **Portal del cliente** con descarga masiva y filtros temporales
- ✅ **Vista previa** de documentos PDF/imágenes con thumbnails
- ✅ **Seguridad robusta** con JWT, RBAC, URLs firmadas

### ✅ Funcionalidades Adicionales Confirmadas:
- ✅ **Sistema de Notificaciones** (Email + WhatsApp, no bloqueante)
  - Alertas de vencimiento (7 días antes)
  - Notificación de rechazo
  - Notificación de aprobación
  - Cron job diario a las 8 AM
  
- ✅ **Sistema de Auditoría Completo** (14 acciones loggeadas)
  - Carga, descarga, actualización, eliminación
  - Aprobación, rechazo de documentos
  - Creación, actualización de equipos
  - Login/logout de usuarios
  - IP, User-Agent, cambios antes/después
  
- ✅ **Política de Backup y Recovery**
  - Backup BD: Diario (full) + Cada 6h (incremental)
  - Backup Docs: S3 con versionado + replicación
  - Soft delete temporal (90 días)
  - RTO: 4 horas, RPO: 6 horas
  - Monitoreo con alertas

### ✅ Integraciones:
- ✅ **Gestión de usuarios**: Sistema existente en monorepo (no crear nuevo)
- ✅ **Twilio**: WhatsApp notifications (opcional)
- ✅ **AWS S3**: Almacenamiento de documentos con versionado
- ✅ **ExcelJS**: Generación de Excel con colores automáticos
- ✅ **Archiver**: Generación de ZIP con estructura organizada

### 📊 Alcance Total:
- **20 funcionalidades** completamente especificadas
- **3 funcionalidades adicionales** agregadas (notificaciones, auditoría, backup)
- **10 preguntas** respondidas y resueltas
- **8 roles** con matriz de permisos completa
- **19 documentos obligatorios** fijos
- **15 endpoints API** backend
- **8 servicios** backend + **4 controllers**
- **15 componentes** frontend + **4 hooks**
- **6 modelos Prisma** nuevos/actualizados

### ⏱️ Estimación Actualizada:
- **Fase 1-5**: Setup, CRUD, Semáforo (16 días)
- **Fase 6**: Workflow Aprobación (4 días)
- **Fase 7**: Vista Previa (3 días)
- **Fase 8**: Portal Cliente (4 días)
- **Fase 9**: **NUEVO** - Notificaciones (2 días)
- **Fase 10**: **NUEVO** - Auditoría (2 días)
- **Fase 11**: **NUEVO** - Backup (2 días)
- **Fase 12**: Tests y Pulido (2 días)

**Total: 35-40 días hábiles** (~7-8 semanas) con las funcionalidades adicionales

### 🎯 Estado:
- ✅ **Todas las funcionalidades están definidas**
- ✅ **Todas las preguntas fueron respondidas**
- ✅ **Propuesta de backup aprobada**
- ✅ **Arquitectura completa especificada**
- ✅ **Plan de implementación actualizado**

### 🚀 Próximo Paso:
**EMPEZAR LA IMPLEMENTACIÓN** - Fase 1: Setup y Roles

---

**La especificación está COMPLETA y LISTA PARA IMPLEMENTAR** 🎉

