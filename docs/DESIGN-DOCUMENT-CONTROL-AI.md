# Diseño: Control de Documentación con IA

> **Objetivo**: Implementar validación automática de documentos con Flowise, extracción de datos, detección de disparidades y renombrado estandarizado.

---

## 📋 Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Contexto: Datos Precargados](#2-contexto-datos-precargados)
3. [Plantillas de Documentos Actuales](#3-plantillas-de-documentos-actuales)
4. [Campos Obligatorios por Entidad](#4-campos-obligatorios-por-entidad)
5. [Arquitectura de Validación](#5-arquitectura-de-validación)
6. [Flows de Flowise Requeridos](#6-flows-de-flowise-requeridos)
7. [Estructura de Datos a Extraer](#7-estructura-de-datos-a-extraer)
8. [Detección de Disparidades](#8-detección-de-disparidades)
9. [Renombrado de Archivos](#9-renombrado-de-archivos)
10. [Cambios en Base de Datos](#10-cambios-en-base-de-datos)
11. [UI de Aprobación con Disparidades](#11-ui-de-aprobación-con-disparidades)
12. [Implementación por Fases](#12-implementación-por-fases)

---

## 1. Resumen Ejecutivo

### Contexto Importante

**La documentación se carga a través de la planilla de Alta Completa**, lo que significa que al momento de subir un documento ya tenemos información precargada:

| Dato | Fuente | Ejemplo |
|------|--------|---------|
| Tipo de documento | Selección de plantilla | "DNI", "Licencia", "RTO Tractor" |
| Entidad destino | Asociación en formulario | Chofer ID: 123, Camión ID: 456 |
| Identificador | Datos de la entidad en BD | DNI: 25402740, Patente: DHO180 |
| Fecha vencimiento | Configuración o manual | 2025-06-15 |

**Por lo tanto, la IA NO clasifica el documento, sino que:**
1. ✅ **Confirma** que el documento corresponde al tipo declarado
2. ✅ **Valida** que los datos coinciden con la entidad asociada
3. ✅ **Extrae** información adicional para enriquecer la BD
4. ✅ **Detecta disparidades** entre lo declarado y lo real

### Objetivos

1. **Validar** que el documento cargado corresponda al tipo declarado (plantilla)
2. **Verificar** fechas de vencimiento (comparar con la precargada si existe)
3. **Extraer** información de la entidad desde el documento
4. **Detectar disparidades** entre datos del documento vs datos en BD
5. **Renombrar** archivos con formato estandarizado antes de guardar en MinIO

### Flujo General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FLUJO DE VALIDACIÓN DE DOCUMENTO                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DATOS PRECARGADOS (del formulario de carga)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ • Plantilla: "Licencia"                                             │    │
│  │ • Entidad: CHOFER (ID: 123)                                         │    │
│  │ • Identificador en BD: DNI 25402740, Nombre: MARIO SOSA             │    │
│  │ • Vencimiento precargado: 2025-06-15                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐       │
│  │  Renombrar      │────▶│  Guardar en      │────▶│  Encolar job    │       │
│  │  archivo        │     │  MinIO           │     │  de validación  │       │
│  └─────────────────┘     └──────────────────┘     └────────┬────────┘       │
│                                                            │                │
│  25402740_licencia.pdf                                     ▼                │
│                                                   ┌────────────────┐        │
│                                                   │  BullMQ Worker │        │
│                                                   └────────┬───────┘        │
│                                                            │                │
│  SE ENVÍA A FLOWISE:                                       ▼                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ {                                                                   │    │
│  │   "imagen": [base64 del documento],                                 │    │
│  │   "tipoDocumento": "Licencia",                                      │    │
│  │   "entidadTipo": "CHOFER",                                          │    │
│  │   "datosEntidad": {                                                 │    │
│  │     "dni": "25402740",                                              │    │
│  │     "nombre": "MARIO",                                              │    │
│  │     "apellido": "SOSA"                                              │    │
│  │   },                                                                │    │
│  │   "vencimientoPrecargado": "2025-06-15"                             │    │
│  │ }                                                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│                     ┌────────────────┐                                      │
│                     │    Flowise     │                                      │
│                     │ Control de Doc │                                      │
│                     └────────┬───────┘                                      │
│                              │                                              │
│              ┌───────────────┼───────────────┐                              │
│              ▼               ▼               ▼                              │
│     ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                │
│     │ ✅ Validación  │ │ ⚠️ Disparidades│ │ ❌ Doc Inválido│                │
│     │ OK             │ │ Detectadas     │ │ (no es Licencia)│               │
│     └────────────────┘ └────────────────┘ └────────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Contexto: Datos Precargados

### Información Disponible al Momento de Carga

Cuando un usuario sube un documento a través de la planilla de Alta Completa o la sección de documentos, el sistema ya conoce:

```typescript
interface ContextoCarga {
  // Del formulario de carga
  templateId: number;           // ID de la plantilla seleccionada
  templateName: string;         // "DNI", "Licencia", "RTO Tractor", etc.
  entityType: EntityType;       // CHOFER, CAMION, ACOPLADO, EMPRESA_TRANSPORTISTA
  entityId: number;             // ID de la entidad en BD
  
  // Vencimiento (puede venir de varias fuentes)
  expiresAt?: Date;             // Fecha precargada o null
  expiresAtSource: 'manual' | 'config' | 'documento' | null;
  
  // Datos de la entidad desde BD (para contrastar)
  datosEntidad: DatosEntidadBD;
}

interface DatosEntidadBD {
  // Para CHOFER
  dni?: string;
  nombre?: string;
  apellido?: string;
  phones?: string[];
  empresaTransportistaCuit?: string;
  
  // Para CAMION/ACOPLADO
  patente?: string;
  marca?: string;
  modelo?: string;
  
  // Para EMPRESA_TRANSPORTISTA
  cuit?: string;
  razonSocial?: string;
}
```

### Flujo de Obtención de Datos de Contexto

```typescript
async function obtenerContextoCarga(
  templateId: number,
  entityType: EntityType,
  entityId: number,
  expiresAt?: Date
): Promise<ContextoCarga> {
  
  const template = await prisma.documentTemplate.findUnique({
    where: { id: templateId }
  });
  
  // Obtener datos de la entidad según tipo
  let datosEntidad: DatosEntidadBD = {};
  
  switch (entityType) {
    case 'CHOFER':
      const chofer = await prisma.chofer.findUnique({
        where: { id: entityId },
        include: { empresaTransportista: true }
      });
      datosEntidad = {
        dni: chofer?.dni,
        nombre: chofer?.nombre,
        apellido: chofer?.apellido,
        phones: chofer?.phones,
        empresaTransportistaCuit: chofer?.empresaTransportista?.cuit
      };
      break;
      
    case 'CAMION':
      const camion = await prisma.camion.findUnique({ where: { id: entityId } });
      datosEntidad = {
        patente: camion?.patente,
        marca: camion?.marca,
        modelo: camion?.modelo
      };
      break;
      
    case 'ACOPLADO':
      const acoplado = await prisma.acoplado.findUnique({ where: { id: entityId } });
      datosEntidad = {
        patente: acoplado?.patente,
        tipo: acoplado?.tipo
      };
      break;
      
    case 'EMPRESA_TRANSPORTISTA':
      const empresa = await prisma.empresaTransportista.findUnique({ where: { id: entityId } });
      datosEntidad = {
        cuit: empresa?.cuit,
        razonSocial: empresa?.razonSocial
      };
      break;
  }
  
  return {
    templateId,
    templateName: template?.name || '',
    entityType,
    entityId,
    expiresAt,
    expiresAtSource: expiresAt ? 'manual' : null,
    datosEntidad
  };
}
```

### Beneficios de Este Enfoque

| Aspecto | Sin Contexto | Con Contexto Precargado |
|---------|--------------|-------------------------|
| Prompt a IA | "¿Qué tipo de documento es?" | "¿Este documento es una Licencia de conducir?" |
| Validación | Clasificar + Identificar entidad | Confirmar tipo + Validar datos |
| Precisión | Puede fallar en clasificación | Solo valida coincidencia |
| Velocidad | Más procesamiento | Más rápido y directo |
| Disparidades | No puede detectar | Compara con datos conocidos |

---

## 3. Plantillas de Documentos Actuales

### EMPRESA_TRANSPORTISTA
| Plantilla | Tiene Vencimiento | Datos a Extraer |
|-----------|-------------------|-----------------|
| Constancia de ARCA Empresa | No (se pone mensual por config) | CUIT, Razón Social, Condición IVA, Domicilio Fiscal |
| Constancia IIBB de Empresa | Según jurisdicción | CUIT, Inscripciones CM |
| F.931 (DDJJ mensual) | Mensual (config) | CUIT, Cantidad Empleados, ART |

### CHOFER
| Plantilla | Tiene Vencimiento | Datos a Extraer |
|-----------|-------------------|-----------------|
| DNI | No (fecha nacimiento) | DNI, Nombre, Apellido, Fecha Nacimiento, Nacionalidad |
| Licencia | Sí (en documento) | Nº Licencia, Clases, Vencimiento, Jurisdicción |
| Alta Temprana | No | CUIL, Fecha Alta, Empleador CUIT |
| ART | Mensual (config) | ART, Póliza, Cobertura |
| Seguro de Vida Obligatorio | Anual (en documento) | Aseguradora, Póliza, Vencimiento |

### CAMIÓN (Tractor)
| Plantilla | Tiene Vencimiento | Datos a Extraer |
|-----------|-------------------|-----------------|
| Titulo Tractor | No | Patente, Marca, Modelo, Año, Nº Motor, Nº Chasis, Titular |
| Cedula Tractor | Sí | Patente, Titular, Vencimiento |
| Seguro Tractor | Sí (en documento) | Patente, Aseguradora, Póliza, Vigencia, Monto RC |
| RTO Tractor | Sí (en documento) | Patente, Resultado, Vencimiento, Dimensiones |

### ACOPLADO (Semirremolque)
| Plantilla | Tiene Vencimiento | Datos a Extraer |
|-----------|-------------------|-----------------|
| Titulo Semirremolque | No | Patente, Marca, Modelo, Año, Tipo |
| Cedula Semirremolque | Sí | Patente, Titular, Vencimiento |
| Seguro Acoplado | Sí (en documento) | Patente, Aseguradora, Póliza, Vigencia |
| RTO Semirremolque | Sí (en documento) | Patente, Resultado, Vencimiento |

---

## 4. Campos Obligatorios por Entidad

Basado en el schema de Alta Completa (`createCompletoSchema`):

### Empresa Transportista
| Campo | Obligatorio | Fuente |
|-------|-------------|--------|
| CUIT (11 dígitos) | ✅ Sí | Alta Completa |
| Razón Social | ✅ Sí | Alta Completa |
| Condición IVA | ❌ No | Documento |
| Domicilio Fiscal | ❌ No | Documento |
| Cantidad Empleados | ❌ No | F.931 |
| ART | ❌ No | Documento |

### Chofer
| Campo | Obligatorio | Fuente |
|-------|-------------|--------|
| DNI | ✅ Sí | Alta Completa |
| Nombre | ❌ No (recomendado) | Alta Completa / Documento |
| Apellido | ❌ No (recomendado) | Alta Completa / Documento |
| CUIL | ❌ No | Documento |
| Fecha Nacimiento | ❌ No | Documento |
| Nº Licencia | ❌ No | Documento |
| Clases Licencia | ❌ No | Documento |
| Vencimiento Licencia | ❌ No | Documento |

### Camión
| Campo | Obligatorio | Fuente |
|-------|-------------|--------|
| Patente | ✅ Sí | Alta Completa |
| Marca | ❌ No | Alta Completa / Documento |
| Modelo | ❌ No | Alta Completa / Documento |
| Año | ❌ No | Documento |
| Nº Motor | ❌ No | Documento |
| Nº Chasis | ❌ No | Documento |
| Titular | ❌ No | Documento |

### Acoplado
| Campo | Obligatorio | Fuente |
|-------|-------------|--------|
| Patente | ✅ Sí (si hay acoplado) | Alta Completa |
| Tipo | ❌ No | Alta Completa / Documento |
| Marca | ❌ No | Documento |
| Modelo | ❌ No | Documento |

---

## 5. Arquitectura de Validación

### Estados del Documento (ampliados)

```
PENDIENTE
    │
    ▼
CLASIFICANDO (IA trabajando)
    │
    ├─── Clasificación OK ──────▶ PENDIENTE_APROBACION
    │                                    │
    │                            ┌───────┴───────┐
    │                            ▼               ▼
    │                    Sin disparidades   Con disparidades
    │                            │               │
    │                            ▼               ▼
    │                       APROBADO       Revisar manualmente
    │
    └─── Clasificación FAIL ───▶ RECHAZADO (doc no corresponde)
```

### Nuevo Campo en DocumentClassification

```prisma
model DocumentClassification {
  // ... campos existentes ...
  
  // Nuevos campos para control de documento
  documentoEsValido     Boolean?  @map("documento_es_valido")
  motivoInvalidez       String?   @map("motivo_invalidez") @db.Text
  
  // Datos extraídos del documento
  datosExtraidos        Json?     @map("datos_extraidos")
  
  // Disparidades detectadas (comparación con BD)
  disparidades          Json?     @map("disparidades")
  tieneDisparidades     Boolean   @default(false) @map("tiene_disparidades")
  
  // Vencimiento
  vencimientoDetectado  DateTime? @map("vencimiento_detectado")
  vencimientoOrigen     String?   @map("vencimiento_origen") @db.VarChar(20) // 'documento' | 'config'
}
```

---

## 6. Flows de Flowise Requeridos

### Flow Principal: Control de Documento

**Concepto**: Un único Flow que recibe contexto completo y valida/extrae.

**Input enviado desde el microservicio**:
```json
{
  "question": "Valida este documento y extrae los datos",
  "uploads": [
    {
      "type": "file:full",
      "name": "documento.pdf",
      "data": "data:image/png;base64,..."
    }
  ],
  "overrideConfig": {
    "templateName": "Licencia",
    "entityType": "CHOFER",
    "datosEntidad": {
      "dni": "25402740",
      "nombre": "MARIO",
      "apellido": "SOSA"
    },
    "vencimientoPrecargado": "2025-06-15"
  }
}
```

**Prompt del Flow (System Message)**:

```markdown
Eres un asistente experto en validación de documentos de transporte argentino.

Tu tarea es:
1. CONFIRMAR si el documento corresponde al tipo indicado
2. EXTRAER todos los datos visibles del documento
3. COMPARAR los datos extraídos con los datos de la entidad proporcionados
4. IDENTIFICAR disparidades entre ambos

## Datos del Sistema (lo que tenemos en base de datos):

- **Tipo de documento esperado**: {{templateName}}
- **Tipo de entidad**: {{entityType}}
- **Datos de la entidad en BD**: {{datosEntidad}}
- **Vencimiento precargado**: {{vencimientoPrecargado}} (puede ser null)

## Instrucciones:

1. Analiza la imagen del documento
2. Determina si ES o NO el tipo de documento esperado ({{templateName}})
3. Extrae TODOS los datos legibles del documento
4. Compara cada dato extraído con los datos de la entidad en BD
5. Si hay diferencias, clasifícalas como:
   - **critica**: DNI, CUIT o Patente no coinciden (documento en entidad incorrecta)
   - **advertencia**: Nombre, apellido, marca, modelo difieren
   - **info**: Datos nuevos que no están en BD

## Responde ÚNICAMENTE con JSON válido:

{
  "esDocumentoCorrecto": true,
  "tipoDocumentoDetectado": "Licencia Nacional de Conducir",
  "confianza": 0.95,
  "motivoSiIncorrecto": null,
  
  "datosExtraidos": {
    "dni": "25402740",
    "nombre": "MARIO ALBERTO",
    "apellido": "SOSA",
    "numeroLicencia": "MZA-123456",
    "clases": ["B1", "C3", "E1"],
    "vencimiento": "2025-06-15",
    "jurisdiccion": "MENDOZA"
  },
  
  "vencimientoEnDocumento": "2025-06-15",
  "coincideVencimientoPrecargado": true,
  
  "disparidades": [
    {
      "campo": "nombre",
      "valorEnBD": "MARIO",
      "valorEnDocumento": "MARIO ALBERTO",
      "severidad": "advertencia",
      "mensaje": "El documento muestra segundo nombre no registrado en BD"
    }
  ],
  
  "datosNuevos": {
    "numeroLicencia": "MZA-123456",
    "clases": ["B1", "C3", "E1"],
    "jurisdiccion": "MENDOZA"
  }
}
```

### Variantes del Prompt por Tipo de Documento

#### Para DNI (CHOFER)
```
Campos a extraer: DNI, Nombre, Apellido, Fecha Nacimiento, Sexo, Nacionalidad, Domicilio
Campos críticos para comparar: DNI
Campos de advertencia: Nombre, Apellido
```

#### Para Licencia (CHOFER)
```
Campos a extraer: Nº Licencia, Titular, DNI, Clases, Vencimiento, Jurisdicción
Campos críticos para comparar: DNI
Campos de advertencia: Nombre (como titular)
Vencimiento: SÍ extraer del documento
```

#### Para Constancia ARCA (EMPRESA_TRANSPORTISTA)
```
Campos a extraer: CUIT, Razón Social, Condición IVA, Domicilio Fiscal, Actividad Principal
Campos críticos para comparar: CUIT
Campos de advertencia: Razón Social
Vencimiento: NO tiene (mensual por config)
```

#### Para RTO (CAMION/ACOPLADO)
```
Campos a extraer: Patente, Resultado, Vencimiento, Dimensiones (si aplica)
Campos críticos para comparar: Patente
Vencimiento: SÍ extraer del documento
```

#### Para Seguro (CAMION/ACOPLADO)
```
Campos a extraer: Patente, Aseguradora, Póliza, Vigencia, Monto RC, Cláusula No Repetición
Campos críticos para comparar: Patente
Vencimiento: SÍ extraer del documento (vigencia hasta)
```

### Mapeo de Datos a Extraer por Plantilla

#### DNI (CHOFER)
```json
{
  "dni": "25402740",
  "nombre": "MARIO ALBERTO",
  "apellido": "SOSA",
  "fechaNacimiento": "1975-03-15",
  "sexo": "M",
  "nacionalidad": "ARGENTINO",
  "domicilio": "CALLE 123, MENDOZA"
}
```

#### Licencia (CHOFER)
```json
{
  "numeroLicencia": "123456789",
  "titular": "SOSA, MARIO ALBERTO",
  "dni": "25402740",
  "clases": ["B1", "C3", "E1"],
  "vencimiento": "2026-05-20",
  "jurisdiccion": "MENDOZA"
}
```

#### Alta Temprana (CHOFER)
```json
{
  "cuil": "20-25402740-3",
  "nombre": "MARIO ALBERTO SOSA",
  "fechaAlta": "2024-01-15",
  "empleadorCuit": "20-13400221-3",
  "empleadorNombre": "Jorge Natalio Santiago Fior",
  "modalidad": "Período de prueba",
  "categoria": "1° Categoría"
}
```

#### Constancia ARCA (EMPRESA_TRANSPORTISTA)
```json
{
  "cuit": "20-13400221-3",
  "razonSocial": "FIOR JORGE NATALIO SANTIAGO",
  "condicionIva": "Responsable Inscripto",
  "domicilioFiscal": {
    "calle": "AV. SAN MARTIN 1234",
    "localidad": "MENDOZA",
    "provincia": "MENDOZA",
    "cp": "5500"
  },
  "actividadPrincipal": {
    "codigo": "492290",
    "descripcion": "Transporte de cargas n.c.p."
  }
}
```

#### F.931 DDJJ (EMPRESA_TRANSPORTISTA)
```json
{
  "cuit": "20-13400221-3",
  "razonSocial": "FIOR JORGE NATALIO SANTIAGO",
  "periodo": "2024-12",
  "cantidadEmpleados": 3,
  "convenioColectivo": "0040/89 - Camioneros",
  "art": {
    "nombre": "Prevención ART",
    "poliza": "123456"
  }
}
```

#### Título Tractor (CAMION)
```json
{
  "patente": "DHO180",
  "marca": "MERCEDES-BENZ",
  "modelo": "LS 1938",
  "anio": 2000,
  "numeroMotor": "OM457LA0012345",
  "numeroChasis": "8AJ3540B3WP012345",
  "titular": "FIOR JORGE NATALIO SANTIAGO",
  "titularDni": "13400221"
}
```

#### RTO Tractor (CAMION)
```json
{
  "patente": "DHO180",
  "resultado": "APTO",
  "vencimiento": "2025-06-15",
  "dimensiones": {
    "largo": 12.5,
    "ancho": 2.6,
    "alto": 4.0
  }
}
```

#### Seguro Tractor (CAMION)
```json
{
  "patente": "DHO180",
  "aseguradora": "Federación Patronal",
  "poliza": "AP-123456",
  "vigenciaDesde": "2024-01-01",
  "vigenciaHasta": "2025-01-01",
  "montoRC": 50000000,
  "tieneClausulaNoRepeticion": true,
  "beneficiarioClausula": "PROSIL S.A."
}
```

---

## 7. Estructura de Datos a Extraer

### Interface TypeScript para Datos Extraídos

```typescript
// Base para todos los tipos
interface DatosExtraidosBase {
  confianza: number;
  camposDetectados: string[];
  errores?: string[];
}

// Por entidad
interface DatosChofer extends DatosExtraidosBase {
  dni?: string;
  cuil?: string;
  nombre?: string;
  apellido?: string;
  fechaNacimiento?: string;
  nacionalidad?: string;
  domicilio?: string;
  // Licencia
  numeroLicencia?: string;
  clasesLicencia?: string[];
  vencimientoLicencia?: string;
  jurisdiccionLicencia?: string;
  // Laboral
  fechaAlta?: string;
  empleadorCuit?: string;
  empleadorNombre?: string;
  modalidadContratacion?: string;
  categoriaProfesional?: string;
  obraSocial?: string;
  remuneracion?: number;
}

interface DatosEmpresaTransportista extends DatosExtraidosBase {
  cuit?: string;
  razonSocial?: string;
  condicionIva?: string;
  domicilioFiscal?: {
    calle?: string;
    localidad?: string;
    provincia?: string;
    cp?: string;
  };
  actividadPrincipal?: {
    codigo?: string;
    descripcion?: string;
  };
  cantidadEmpleados?: number;
  convenioColectivo?: string;
  art?: {
    nombre?: string;
    poliza?: string;
  };
  inscripcionesCM?: string[];
}

interface DatosCamion extends DatosExtraidosBase {
  patente?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  numeroMotor?: string;
  numeroChasis?: string;
  titular?: string;
  titularDni?: string;
  // RTO
  rtoResultado?: string;
  rtoVencimiento?: string;
  dimensiones?: {
    largo?: number;
    ancho?: number;
    alto?: number;
  };
  // Seguro
  aseguradora?: string;
  poliza?: string;
  vigenciaDesde?: string;
  vigenciaHasta?: string;
  montoRC?: number;
  clausulaNoRepeticion?: boolean;
  beneficiarioClausula?: string;
}

interface DatosAcoplado extends DatosExtraidosBase {
  patente?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  tipo?: string;
  configuracionEjes?: string;
  // Similar a camión para RTO y seguro
}
```

---

## 8. Detección de Disparidades

### Tipos de Disparidad

| Severidad | Descripción | Acción |
|-----------|-------------|--------|
| **Crítica** | Identificador no coincide (DNI, CUIT, Patente) | Bloquear aprobación |
| **Advertencia** | Datos secundarios difieren (nombre, marca) | Mostrar alerta |
| **Info** | Datos nuevos extraídos no presentes en BD | Sugerir actualización |

### Lógica de Comparación

```typescript
interface Disparidad {
  campo: string;           // Nombre del campo
  valorEnBD: any;          // Valor actual en base de datos
  valorEnDocumento: any;   // Valor extraído del documento
  severidad: 'critica' | 'advertencia' | 'info';
  mensaje: string;         // Descripción legible
  sugerirActualizacion: boolean;
}

// Ejemplo de disparidades
const disparidades: Disparidad[] = [
  {
    campo: 'nombre',
    valorEnBD: 'MARIO',
    valorEnDocumento: 'MARIO ALBERTO',
    severidad: 'advertencia',
    mensaje: 'El nombre en el documento tiene segundo nombre',
    sugerirActualizacion: true
  },
  {
    campo: 'dni',
    valorEnBD: '25402740',
    valorEnDocumento: '25402741',  // ¡Diferente!
    severidad: 'critica',
    mensaje: 'El DNI del documento no coincide con el registrado',
    sugerirActualizacion: false
  }
];
```

### Reglas de Comparación por Campo

| Campo | Normalización | Severidad si Difiere |
|-------|---------------|---------------------|
| DNI | Solo dígitos | Crítica |
| CUIT | Solo dígitos | Crítica |
| Patente | Mayúsculas, sin guiones | Crítica |
| Nombre | Mayúsculas, trim | Advertencia |
| Apellido | Mayúsculas, trim | Advertencia |
| Marca | Mayúsculas | Info |
| Modelo | Mayúsculas | Info |
| Fecha Vencimiento | YYYY-MM-DD | Advertencia |

---

## 9. Renombrado de Archivos

### Formato Estándar

```
{IDENTIFICADOR}_{PLANTILLA_NORMALIZADA}.{ext}
```

### Reglas de Normalización

1. **Identificador**: 
   - CUIT: sin guiones (ej: `20134002213`)
   - DNI: sin puntos (ej: `25402740`)
   - Patente: mayúsculas sin guiones (ej: `DHO180`, `AF793HH`)

2. **Plantilla**: 
   - Minúsculas
   - Espacios → guiones bajos
   - Sin tildes ni caracteres especiales

3. **Extensión**: 
   - Mantener original (`.pdf`, `.jpg`, `.png`)

### Ejemplos de Renombrado

| Entidad | Plantilla | Archivo Original | Archivo Renombrado |
|---------|-----------|------------------|-------------------|
| Empresa | Constancia de ARCA Empresa | scan001.pdf | `20134002213_constancia_de_arca_empresa.pdf` |
| Empresa | F.931 | doc.pdf | `20134002213_f931_ddjj.pdf` |
| Chofer | DNI | foto_dni.jpg | `25402740_dni.jpg` |
| Chofer | Licencia | lic.pdf | `25402740_licencia.pdf` |
| Chofer | Alta Temprana | alta.pdf | `25402740_alta_temprana.pdf` |
| Camión | Titulo Tractor | titulo.pdf | `DHO180_titulo_tractor.pdf` |
| Camión | RTO Tractor | rto.pdf | `DHO180_rto_tractor.pdf` |
| Camión | Seguro Tractor | poliza.pdf | `DHO180_seguro_tractor.pdf` |
| Acoplado | Titulo Semirremolque | titulo.pdf | `AF793HH_titulo_semirremolque.pdf` |

### Implementación

```typescript
function generarNombreArchivo(
  entityType: EntityType,
  entityId: number,
  templateName: string,
  originalExtension: string
): string {
  // Obtener identificador según tipo de entidad
  const identificador = await obtenerIdentificador(entityType, entityId);
  
  // Normalizar nombre de plantilla
  const plantillaNorm = templateName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Quitar tildes
    .replace(/[^a-z0-9]/g, '_')        // Solo alfanuméricos
    .replace(/_+/g, '_')               // Colapsar guiones
    .replace(/^_|_$/g, '');            // Trim guiones
  
  return `${identificador}_${plantillaNorm}${originalExtension}`;
}

async function obtenerIdentificador(entityType: EntityType, entityId: number): Promise<string> {
  switch (entityType) {
    case 'EMPRESA_TRANSPORTISTA':
      const empresa = await prisma.empresaTransportista.findUnique({ where: { id: entityId } });
      return empresa?.cuit.replace(/\D/g, '') || `empresa_${entityId}`;
    
    case 'CHOFER':
      const chofer = await prisma.chofer.findUnique({ where: { id: entityId } });
      return chofer?.dni.replace(/\D/g, '') || `chofer_${entityId}`;
    
    case 'CAMION':
      const camion = await prisma.camion.findUnique({ where: { id: entityId } });
      return camion?.patente.toUpperCase().replace(/[^A-Z0-9]/g, '') || `camion_${entityId}`;
    
    case 'ACOPLADO':
      const acoplado = await prisma.acoplado.findUnique({ where: { id: entityId } });
      return acoplado?.patente.toUpperCase().replace(/[^A-Z0-9]/g, '') || `acoplado_${entityId}`;
    
    default:
      return `unknown_${entityId}`;
  }
}
```

---

## 10. Cambios en Base de Datos

### 10.1 Nueva Tabla: EntityExtractedData (Datos Extraídos por Entidad)

Esta tabla almacena los datos enriquecidos que la IA extrae de los documentos, asociados a cada entidad.

**Características:**
- Almacena datos por entidad (no por documento)
- Consolida información de múltiples documentos
- Solo visible para SUPERADMIN y ADMIN_INTERNO
- Historial de actualizaciones

```prisma
// =================================
// DATOS EXTRAÍDOS POR IA (solo visible para admins)
// =================================

model EntityExtractedData {
  id              Int        @id @default(autoincrement())
  tenantEmpresaId Int        @map("tenant_empresa_id")
  dadorCargaId    Int        @map("dador_carga_id")
  
  // Referencia a la entidad
  entityType      EntityType @map("entity_type")
  entityId        Int        @map("entity_id")
  
  // Datos extraídos (JSON flexible por tipo de entidad)
  datosExtraidos  Json       @map("datos_extraidos")
  
  // Metadatos de la última extracción
  ultimaExtraccionAt    DateTime   @map("ultima_extraccion_at")
  ultimoDocumentoId     Int?       @map("ultimo_documento_id")
  ultimoDocumentoTipo   String?    @map("ultimo_documento_tipo") @db.VarChar(100)
  confianzaPromedio     Float      @default(0.0) @map("confianza_promedio")
  
  // Campos consolidados (más frecuentes, para consulta rápida)
  // CHOFER
  cuil              String?  @db.VarChar(20)
  fechaNacimiento   DateTime? @map("fecha_nacimiento")
  nacionalidad      String?  @db.VarChar(50)
  numeroLicencia    String?  @map("numero_licencia") @db.VarChar(50)
  clasesLicencia    String[] @default([]) @map("clases_licencia")
  vencimientoLicencia DateTime? @map("vencimiento_licencia")
  
  // CAMION / ACOPLADO
  anioFabricacion   Int?     @map("anio_fabricacion")
  numeroMotor       String?  @map("numero_motor") @db.VarChar(50)
  numeroChasis      String?  @map("numero_chasis") @db.VarChar(50)
  titular           String?  @db.VarChar(200)
  titularDni        String?  @map("titular_dni") @db.VarChar(20)
  
  // EMPRESA_TRANSPORTISTA
  condicionIva      String?  @map("condicion_iva") @db.VarChar(50)
  domicilioFiscal   Json?    @map("domicilio_fiscal")
  actividadPrincipal Json?   @map("actividad_principal")
  cantidadEmpleados Int?     @map("cantidad_empleados")
  artNombre         String?  @map("art_nombre") @db.VarChar(100)
  artPoliza         String?  @map("art_poliza") @db.VarChar(50)
  
  // Timestamps
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@unique([tenantEmpresaId, entityType, entityId])
  @@index([tenantEmpresaId, dadorCargaId, entityType])
  @@index([entityType, entityId])
  @@map("entity_extracted_data")
}

// Historial de extracciones (auditoría)
model EntityExtractionLog {
  id              Int        @id @default(autoincrement())
  tenantEmpresaId Int        @map("tenant_empresa_id")
  
  // Referencia
  entityType      EntityType @map("entity_type")
  entityId        Int        @map("entity_id")
  documentId      Int        @map("document_id")
  templateName    String     @map("template_name") @db.VarChar(100)
  
  // Resultado de la extracción
  datosExtraidos  Json       @map("datos_extraidos")
  disparidades    Json?      @map("disparidades")
  esValido        Boolean    @map("es_valido")
  confianza       Float      @default(0.0)
  
  // Quién solicitó el análisis
  solicitadoPor   Int?       @map("solicitado_por")
  esRechequeo     Boolean    @default(false) @map("es_rechequeo")
  
  createdAt       DateTime   @default(now()) @map("created_at")

  @@index([tenantEmpresaId, entityType, entityId])
  @@index([documentId])
  @@index([createdAt])
  @@map("entity_extraction_log")
}
```

### Estructura de datosExtraidos por EntityType

#### CHOFER
```json
{
  "dni": "25402740",
  "cuil": "20-25402740-3",
  "nombre": "MARIO ALBERTO",
  "apellido": "SOSA",
  "fechaNacimiento": "1975-03-15",
  "sexo": "M",
  "nacionalidad": "ARGENTINA",
  "domicilio": "AV. SAN MARTIN 1234, MENDOZA",
  "licencia": {
    "numero": "MZA-123456",
    "clases": ["B1", "C3", "E1"],
    "vencimiento": "2025-06-15",
    "jurisdiccion": "MENDOZA"
  },
  "laboral": {
    "fechaAlta": "2024-01-15",
    "empleadorCuit": "20134002213",
    "modalidad": "Período de prueba",
    "categoria": "1° Categoría",
    "obraSocial": "O.S. Conductores Camioneros"
  },
  "art": {
    "nombre": "Prevención ART",
    "poliza": "123456",
    "cobertura": "Ley 24.557"
  },
  "seguroVida": {
    "aseguradora": "San Cristóbal",
    "poliza": "SV-789012",
    "vigencia": "2025-01-01"
  }
}
```

#### CAMION
```json
{
  "patente": "DHO180",
  "marca": "MERCEDES-BENZ",
  "modelo": "LS 1938",
  "anio": 2000,
  "numeroMotor": "OM457LA0012345",
  "numeroChasis": "8AJ3540B3WP012345",
  "titular": {
    "nombre": "FIOR JORGE NATALIO SANTIAGO",
    "dni": "13400221",
    "cuit": "20134002213"
  },
  "rto": {
    "resultado": "APTO",
    "vencimiento": "2025-06-15",
    "planta": "RTO MENDOZA S.A.",
    "oblea": "A-123456789",
    "dimensiones": {
      "largo": 12.50,
      "ancho": 2.60,
      "alto": 4.00
    }
  },
  "seguro": {
    "aseguradora": "Federación Patronal",
    "poliza": "AP-2024-123456",
    "vigencia": "2025-01-01",
    "montoRC": 50000000,
    "clausulaNoRepeticion": {
      "tiene": true,
      "beneficiario": "PROSIL S.A."
    }
  }
}
```

#### ACOPLADO
```json
{
  "patente": "AF793HH",
  "marca": "HELVETICA",
  "modelo": "SR 3E 1+2 BV",
  "anio": 2023,
  "tipo": "Semi remolque baranda 3 ejes",
  "configuracionEjes": "1+2",
  "titular": {
    "nombre": "FIOR JORGE NATALIO SANTIAGO",
    "cuit": "20134002213"
  },
  "rto": {
    "resultado": "APTO",
    "vencimiento": "2025-06-15"
  },
  "seguro": {
    "aseguradora": "Federación Patronal",
    "poliza": "AP-2024-789012",
    "vigencia": "2025-01-01"
  }
}
```

#### EMPRESA_TRANSPORTISTA
```json
{
  "cuit": "20134002213",
  "razonSocial": "FIOR JORGE NATALIO SANTIAGO",
  "condicionIva": "Responsable Inscripto",
  "domicilioFiscal": {
    "calle": "AV. SAN MARTIN 1234",
    "localidad": "MENDOZA",
    "provincia": "MENDOZA",
    "cp": "5500"
  },
  "actividadPrincipal": {
    "codigo": "492290",
    "descripcion": "Transporte automotor de cargas n.c.p."
  },
  "actividadesSecundarias": [],
  "inscripcionesIIBB": [
    { "jurisdiccion": "MENDOZA", "numero": "12345" },
    { "jurisdiccion": "BUENOS AIRES", "numero": "67890" }
  ],
  "empleados": {
    "cantidad": 3,
    "convenio": "0040/89 - Camioneros"
  },
  "art": {
    "nombre": "Prevención ART",
    "poliza": "ART-123456"
  }
}
```

### Control de Acceso

```typescript
// Roles que pueden ver EntityExtractedData
const ROLES_VIEW_EXTRACTED_DATA = ['SUPERADMIN', 'ADMIN_INTERNO'];

// Middleware para proteger endpoints
export function canViewExtractedData() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !ROLES_VIEW_EXTRACTED_DATA.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden ver datos extraídos por IA',
        code: 'EXTRACTED_DATA_FORBIDDEN'
      });
    }
    next();
  };
}
```

### Endpoints Protegidos

```typescript
// GET /api/docs/entities/:entityType/:entityId/extracted-data
router.get(
  '/entities/:entityType/:entityId/extracted-data',
  authenticate,
  canViewExtractedData(),
  EntityExtractedDataController.get
);

// GET /api/docs/entities/:entityType/:entityId/extraction-history
router.get(
  '/entities/:entityType/:entityId/extraction-history',
  authenticate,
  canViewExtractedData(),
  EntityExtractedDataController.getHistory
);
```

### Migración: Agregar campos a DocumentClassification

```sql
-- Agregar campos para control de documento
ALTER TABLE document_classifications
ADD COLUMN documento_es_valido BOOLEAN,
ADD COLUMN motivo_invalidez TEXT,
ADD COLUMN datos_extraidos JSONB,
ADD COLUMN disparidades JSONB,
ADD COLUMN tiene_disparidades BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN vencimiento_detectado TIMESTAMP,
ADD COLUMN vencimiento_origen VARCHAR(20);

-- Índice para filtrar documentos con disparidades
CREATE INDEX idx_classifications_disparidades 
ON document_classifications (tiene_disparidades) 
WHERE tiene_disparidades = TRUE;
```

### Agregar campo para nombre original en Document

```sql
ALTER TABLE documents
ADD COLUMN original_file_name VARCHAR(255),
ADD COLUMN standardized_file_name VARCHAR(255);
```

### Schema Prisma Actualizado

```prisma
model DocumentClassification {
  id                    Int         @id @default(autoincrement())
  documentId            Int         @unique @map("document_id")
  
  // Clasificación existente
  detectedEntityType    EntityType? @map("detected_entity_type")
  detectedEntityId      String?     @map("detected_entity_id") @db.VarChar(100)
  detectedExpiration    DateTime?   @map("detected_expiration")
  detectedDocumentType  String?     @map("detected_document_type") @db.VarChar(100)
  confidence            Float       @default(0.0)
  aiResponse            Json?       @map("ai_response")
  
  // Nuevos campos - Control de Documento
  documentoEsValido     Boolean?    @map("documento_es_valido")
  motivoInvalidez       String?     @map("motivo_invalidez") @db.Text
  datosExtraidos        Json?       @map("datos_extraidos")
  disparidades          Json?       @map("disparidades")
  tieneDisparidades     Boolean     @default(false) @map("tiene_disparidades")
  vencimientoDetectado  DateTime?   @map("vencimiento_detectado")
  vencimientoOrigen     String?     @map("vencimiento_origen") @db.VarChar(20)
  
  // Revisión
  reviewedAt            DateTime?   @map("reviewed_at")
  reviewedBy            Int?        @map("reviewed_by")
  reviewNotes           String?     @map("review_notes") @db.Text
  createdAt             DateTime    @default(now()) @map("created_at")
  updatedAt             DateTime    @updatedAt @map("updated_at")

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([detectedEntityType, confidence])
  @@index([reviewedAt])
  @@index([tieneDisparidades])
  @@map("document_classifications")
}

model Document {
  // ... campos existentes ...
  
  // Nuevos campos para renombrado
  originalFileName      String?     @map("original_file_name") @db.VarChar(255)
  standardizedFileName  String?     @map("standardized_file_name") @db.VarChar(255)
}
```

---

## 11. UI de Aprobación con Disparidades

### Vista de Documento Pendiente de Aprobación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📄 DNI - Mario Alberto Sosa                                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Estado: PENDIENTE_APROBACION        [🔄 Rechequear con IA]         │    │
│  │          ══════════════════                    ↑                    │    │
│  │                                     Botón para re-ejecutar          │    │
│  │                                     validación con Flowise          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────────────────────────┐ │
│  │                          │  │  📊 Datos Extraídos por IA               │ │
│  │                          │  │                                          │ │
│  │    [Previsualización     │  │  DNI: 25402740           ✓ Coincide      │ │
│  │     del Documento]       │  │  Nombre: MARIO ALBERTO   ⚠️ Difiere      │ │
│  │                          │  │  Apellido: SOSA          ✓ Coincide      │ │
│  │    (PDF/Imagen)          │  │  F. Nac: 15/03/1975      ℹ️ Nuevo        │ │
│  │                          │  │  Nacionalidad: ARGENTINO ℹ️ Nuevo        │ │
│  │                          │  │                                          │ │
│  │                          │  │  Confianza IA: 95%  ████████████░░       │ │
│  └──────────────────────────┘  └──────────────────────────────────────────┘ │
│                                                                             │
│  ⚠️ DISPARIDADES DETECTADAS (1)                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  Campo     │ En Base de Datos │ En Documento    │ Severidad  │ Acción  ││
│  ├────────────┼──────────────────┼─────────────────┼────────────┼─────────┤│
│  │  Nombre    │ MARIO            │ MARIO ALBERTO   │ ⚠️ Advert. │[Actualiz]││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ℹ️ DATOS NUEVOS EXTRAÍDOS (2)                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  Campo          │ Valor Extraído     │ Acción                          ││
│  ├─────────────────┼────────────────────┼─────────────────────────────────┤│
│  │  Fecha Nac.     │ 15/03/1975         │ [Guardar en BD]                 ││
│  │  Nacionalidad   │ ARGENTINO          │ [Guardar en BD]                 ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  📅 Vencimiento                                                         ││
│  │                                                                         ││
│  │  Origen: Sin vencimiento (documento de identidad)                       ││
│  │  [  ] Establecer vencimiento manual: [___________]                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                         ││
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────────┐  ││
│  │  │  ✅ Aprobar    │  │  ❌ Rechazar   │  │ ✅ Aprobar + Actualizar  │  ││
│  │  │               │  │               │  │    BD con datos doc      │  ││
│  │  └────────────────┘  └────────────────┘  └──────────────────────────┘  ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Botón "Rechequear con IA"

**Ubicación**: Junto al estado del documento, en la cabecera de la vista de aprobación.

**Comportamiento**:
1. Al hacer clic, muestra spinner de carga
2. Re-encola el documento en BullMQ para análisis
3. Flowise procesa nuevamente con los datos actuales de BD
4. Al completar, actualiza la vista con nuevos resultados
5. Si hay errores, muestra notificación

**Visibilidad**: Solo para roles que pueden aprobar (ADMIN_INTERNO, DADOR_DE_CARGA, SUPERADMIN)

**Estados del botón**:
```
┌────────────────────────┐
│  🔄 Rechequear con IA  │  ← Normal (habilitado)
└────────────────────────┘

┌────────────────────────┐
│  ⏳ Procesando...      │  ← En proceso (deshabilitado, spinner)
└────────────────────────┘

┌────────────────────────┐
│  ✓ Análisis completo   │  ← Éxito (temporal, vuelve a normal)
└────────────────────────┘
```

### Implementación del Endpoint

```typescript
// POST /api/docs/approval/pending/:id/recheck
router.post(
  '/pending/:id/recheck',
  authenticate,
  authorize(['SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA']),
  async (req, res) => {
    const documentId = Number(req.params.id);
    
    // Verificar que el documento existe y está pendiente
    const doc = await prisma.document.findFirst({
      where: { 
        id: documentId, 
        status: 'PENDIENTE_APROBACION',
        tenantEmpresaId: req.tenantId
      }
    });
    
    if (!doc) {
      return res.status(404).json({ 
        success: false, 
        message: 'Documento no encontrado o no está pendiente' 
      });
    }
    
    // Encolar para re-análisis
    const jobId = await queueService.addValidationJob({
      documentId: doc.id,
      recheck: true,  // Flag para indicar que es rechequeo
      requestedBy: req.user.id
    });
    
    // Registrar en auditoría
    await AuditService.log({
      action: 'DOCUMENT_RECHECK_REQUESTED',
      documentId,
      userId: req.user.id
    });
    
    res.json({
      success: true,
      message: 'Documento encolado para rechequeo con IA',
      data: { documentId, jobId }
    });
  }
);
```

### Componente React del Botón

```tsx
function RecheckButton({ documentId, onComplete }: { 
  documentId: number; 
  onComplete: () => void;
}) {
  const [recheckDocument, { isLoading }] = useRecheckDocumentMutation();
  const { role } = useAuth();
  
  // Solo visible para roles con permiso de aprobar
  const canRecheck = ['SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA'].includes(role);
  
  if (!canRecheck) return null;
  
  const handleRecheck = async () => {
    try {
      await recheckDocument(documentId).unwrap();
      toast.success('Rechequeo iniciado. Los resultados se actualizarán automáticamente.');
      
      // Polling o WebSocket para detectar cuando termina
      // onComplete() se llama cuando el análisis finaliza
    } catch (error) {
      toast.error('Error al iniciar rechequeo');
    }
  };
  
  return (
    <button
      onClick={handleRecheck}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg
        ${isLoading 
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
        }
      `}
    >
      {isLoading ? (
        <>
          <Spinner className="w-4 h-4 animate-spin" />
          Procesando...
        </>
      ) : (
        <>
          <ArrowPathIcon className="w-4 h-4" />
          Rechequear con IA
        </>
      )}
    </button>
  );
}
```

### Estados Visuales de Disparidad

| Severidad | Color | Icono | Acción Sugerida |
|-----------|-------|-------|-----------------|
| Crítica | 🔴 Rojo | ❌ | No permitir aprobar sin resolver |
| Advertencia | 🟡 Amarillo | ⚠️ | Botón "Actualizar BD" opcional |
| Info | 🔵 Azul | ℹ️ | Solo informativo |

---

## 12. Implementación por Fases

### Fase 1: Infraestructura Base (1-2 días)
- [ ] Migración de base de datos (nuevos campos)
- [ ] Función de renombrado de archivos
- [ ] Modificar upload para usar nuevo nombre

### Fase 2: Integración Flowise (2-3 días)
- [ ] Crear/configurar Flow de Control de Documento
- [ ] Modificar worker para enviar datos de entidad
- [ ] Parsear respuesta con disparidades

### Fase 3: Detección de Disparidades (1-2 días)
- [ ] Implementar lógica de comparación
- [ ] Guardar disparidades en BD
- [ ] Tests unitarios

### Fase 4: UI de Aprobación (2-3 días)
- [ ] Mostrar disparidades en pantalla de aprobación
- [ ] Botón "Actualizar BD con datos del documento"
- [ ] Bloquear aprobación si hay disparidad crítica

### Fase 5: Testing y Ajustes (1-2 días)
- [ ] Probar con documentos reales
- [ ] Ajustar prompts de Flowise
- [ ] Documentar

---

## 📌 Notas Importantes

1. **Vencimientos sin fecha en documento**: El sistema aplica vencimiento por configuración (ej: F.931 mensual)

2. **Disparidad crítica**: Si el DNI/CUIT/Patente no coincide, el documento probablemente fue cargado en la entidad incorrecta

3. **Actualización de BD**: Al aprobar con disparidades de advertencia, el operador puede elegir actualizar los datos de la entidad con los valores del documento

4. **Histórico**: Guardar siempre el nombre original del archivo para trazabilidad

---

*Documento creado: $(date)*
*Última actualización: Por determinar*

