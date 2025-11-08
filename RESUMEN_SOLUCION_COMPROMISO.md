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
   - **Aprueba/rechaza documentos** cargados por transportistas/choferes
   - Ve listado de sus equipos con semáforo
   - Quebracho Blanco puede operar como dador

### 4. **TRANSPORTISTA** (Empresa de transporte)
   - Gestiona su propia flota
   - Carga/edita choferes de su empresa
   - Carga/edita unidades (camiones/acoplados)
   - Crea equipos con sus recursos
   - Ve listado de sus equipos con semáforo
   - NO aprueba documentos (solo DADOR_DE_CARGA)

### 5. **CHOFER** (Conductor)
   - Solo puede editar:
     - Sus propios datos personales y documentos (DNI, licencia, etc.)
     - Datos del camión de su equipo
     - Datos del acoplado de su equipo
   - NO puede cambiar de equipo (solo TRANSPORTISTA/DADOR)
   - Ve solo su equipo
   - Ve documentos rechazados con motivo y comentario
   - Puede re-cargar documentos rechazados

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
| Editar docs propios | ✅ | ✅ | ✅ | ✅ | ❌ |
| **DOCUMENTOS DEL EQUIPO DEL CHOFER** |
| Editar datos camión equipo | ✅ | ✅ | ✅ | ✅ | ❌ |
| Editar docs camión equipo | ✅ | ✅ | ✅ | ✅ | ❌ |
| Editar datos acoplado equipo | ✅ | ✅ | ✅ | ✅ | ❌ |
| Editar docs acoplado equipo | ✅ | ✅ | ✅ | ✅ | ❌ |
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
1. CHOFER/TRANSPORTISTA carga documento
   ↓
2. Documento queda con estado: PENDIENTE_APROBACION (🔵)
   ↓
3. Equipo muestra indicador 🔵 azul en listado
   ↓
4. DADOR_DE_CARGA ve equipos con pendientes
   ↓
5. DADOR entra a revisar documentos:
   
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

## ❓ POSIBLES FUNCIONALIDADES FALTANTES

### A confirmar con el usuario:

1. **Gestión de Usuarios**:
   - ¿Hay pantalla de administración de usuarios?
   - ¿Cómo se crean cuentas de DADOR_DE_CARGA, TRANSPORTISTA, CHOFER, CLIENTE?
   - ¿Hay auto-registro o solo admin crea?

2. **Notificaciones**:
   - ¿Se implementan notificaciones automáticas por vencimiento?
   - ¿Email o WhatsApp?
   - ¿Configurables por usuario?

3. **Historial de Equipos**:
   - ¿Se guarda historial de cambios de chofer en un equipo?
   - ¿Se puede ver equipos anteriores de un chofer?

4. **Reportes**:
   - ¿Hay reportes/estadísticas más allá del resumen?
   - ¿Dashboard con gráficos?

5. **Integraciones**:
   - ¿Integración con AFIP/ANSES para validación?
   - ¿API para sistemas externos?

6. **Auditoría**:
   - ¿Nivel de detalle de audit log?
   - ¿Quién puede ver el historial completo?

7. **Configuración**:
   - ¿Hay pantalla de configuración del sistema?
   - ¿Se pueden personalizar documentos obligatorios por cliente?
   - ¿Días de alerta de vencimiento configurables?

8. **Flujo de Onboarding**:
   - ¿Cómo se da de alta un transportista nuevo?
   - ¿Wizard o formulario libre?

9. **Permisos Granulares**:
   - ¿Hay sub-roles o permisos adicionales?
   - ¿Un TRANSPORTISTA puede tener múltiples usuarios?

10. **Backup/Recovery**:
    - ¿Política de respaldos de documentos?
    - ¿Soft delete permanente o temporal?

---

## 📝 CONCLUSIÓN

Esta especificación cubre un **sistema completo de gestión de equipos de transporte** con:

- ✅ **8 roles diferentes** con permisos granulares
- ✅ **Sistema de estados con 6 indicadores** (semáforo)
- ✅ **Validación estricta** de 19 documentos obligatorios
- ✅ **Workflow de aprobación** completo con indicadores azules
- ✅ **Portal del cliente** con descarga masiva y filtros
- ✅ **Vista previa** de documentos PDF/imágenes
- ✅ **Seguridad robusta** con JWT, RBAC, URLs firmadas
- ✅ **Arquitectura escalable** Backend + Frontend + BD

La solución está **lista para implementar** en 25-30 días hábiles.

---

**¿Falta algo? ¿Hay alguna funcionalidad que deberíamos agregar antes de empezar?**

