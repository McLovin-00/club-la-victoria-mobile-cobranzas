# 🏢 Plataforma de Clientes - Especificación Funcional Completa

> **Sistema de Gestión Documental para Clientes**  
> Control de Compliance de Transportistas en Tiempo Real

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Módulos Funcionales](#módulos-funcionales)
4. [Especificación Detallada por Módulo](#especificación-detallada-por-módulo)
5. [Priorización y Roadmap](#priorización-y-roadmap)
6. [Integraciones Técnicas](#integraciones-técnicas)
7. [Seguridad y Compliance](#seguridad-y-compliance)

---

## 🎯 Introducción

### Contexto del Sistema

El sistema actual gestiona documentación de transportistas (choferes, camiones, acoplados) para empresas clientes que requieren **compliance documental** antes de permitir el ingreso de equipos a sus instalaciones o realizar operaciones de carga.

### Objetivo de la Plataforma de Clientes

Proveer a las empresas cliente una **interfaz completa y profesional** para:

- ✅ Configurar sus requisitos documentales específicos
- ✅ Consultar el estado de compliance de equipos en tiempo real
- ✅ Gestionar autorizaciones de acceso
- ✅ Generar reportes y analíticas
- ✅ Comunicarse con transportistas
- ✅ Mantener auditoría y trazabilidad completa

### Usuarios Objetivo

- **Responsables de Seguridad**: Control de acceso
- **Jefes de Operaciones**: Gestión de flota autorizada
- **Administrativos**: Configuración y reportes
- **Auditores**: Compliance y trazabilidad

---

## 🏗️ Arquitectura del Sistema

### Componentes Actuales

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React 18)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Portal Admin  │  │Portal Cliente│  │Portal Trans. │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Express + Node 20)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Principal (JWT RS256)                            │  │
│  │  - Empresas, Usuarios, Instancias, Permisos          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         MICROSERVICIO DOCUMENTOS (Express + Node 20)         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  - Gestión Documental Completa                        │  │
│  │  - IA para Clasificación (Flowise)                    │  │
│  │  - Notificaciones (WhatsApp)                          │  │
│  │  - Storage (MinIO)                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              BASE DE DATOS (PostgreSQL 16)                   │
│  ┌──────────────┐              ┌──────────────┐           │
│  │Schema Platform│              │Schema Docs   │           │
│  │- Empresas     │              │- Templates   │           │
│  │- Usuarios     │              │- Documentos  │           │
│  │- Instancias   │              │- Equipos     │           │
│  │- Permisos     │              │- Clientes    │           │
│  └──────────────┘              └──────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Nueva Plataforma de Clientes

La **Plataforma de Clientes** se construirá sobre el microservicio de documentos existente, agregando endpoints y funcionalidades específicas para empresas cliente.

---

## 📦 Módulos Funcionales

### Resumen de Módulos

| # | Módulo | Prioridad | Complejidad | Descripción |
|---|--------|-----------|-------------|-------------|
| I | Perfil y Empresa | 🔴 Crítica | Baja | Gestión de datos del cliente |
| II | Requisitos Documentales | 🔴 Crítica | Media | Configuración de compliance |
| III | Gestión de Equipos | 🔴 Crítica | Alta | Consulta y autorización |
| IV | Documentación | 🔴 Crítica | Media | Visualización y descarga |
| V | Dashboard y Reportes | 🔴 Crítica | Alta | Analytics y KPIs |
| VI | Notificaciones | 🟡 Alta | Media | Alertas y comunicaciones |
| VII | Búsquedas Avanzadas | 🟡 Alta | Media | Consultas multi-criterio |
| VIII | Calendario | 🟡 Alta | Media | Vencimientos y operaciones |
| IX | Gestión de Proveedores | 🟢 Media | Baja | Transportistas y dadores |
| X | Seguridad y Acceso | 🔴 Crítica | Alta | Control de usuarios |
| XI | Configuración | 🟡 Alta | Media | Parámetros del sistema |
| XII | Móvil | 🟢 Baja | Alta | App móvil nativa |
| XIII | Analytics Avanzado | 🟢 Baja | Alta | IA y predicciones |
| XIV | Soporte | 🟡 Alta | Baja | Centro de ayuda |

---

## 📖 Especificación Detallada por Módulo

## I. MÓDULO DE GESTIÓN DE PERFIL Y EMPRESA CLIENTE

### Objetivo
Permitir al cliente gestionar su información corporativa y usuarios internos.

### Funcionalidades

#### 1.1 Perfil del Cliente

**Datos de la Empresa**
- Razón Social (solo lectura, configurado por admin)
- CUIT (solo lectura)
- Dirección completa
- Teléfonos de contacto (múltiples)
- Email corporativo
- Sitio web

**Gestión de Usuarios del Cliente**
```typescript
interface ClienteUsuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  role: 'ADMIN' | 'GESTOR' | 'CONSULTOR' | 'PORTERIA';
  activo: boolean;
  ultimoAcceso: Date;
}
```

**Roles y Permisos**:
- **ADMIN**: Configuración completa, gestión de usuarios
- **GESTOR**: Operaciones diarias, solicitudes, aprobaciones
- **CONSULTOR**: Solo lectura, reportes
- **PORTERIA**: Validación de acceso en tiempo real

**Endpoints**:
```
GET    /api/docs/clients/me/profile
PUT    /api/docs/clients/me/profile
GET    /api/docs/clients/me/users
POST   /api/docs/clients/me/users
PUT    /api/docs/clients/me/users/:id
DELETE /api/docs/clients/me/users/:id
```

#### 1.2 Configuración de Notificaciones

**Preferencias Individuales**
```typescript
interface NotificationPreferences {
  vencimientosProximos: boolean;
  documentosVencidos: boolean;
  documentosFaltantes: boolean;
  nuevosEquipos: boolean;
  cambiosEquipos: boolean;
  frecuencia: 'INMEDIATA' | 'DIARIA' | 'SEMANAL';
  canales: {
    email: boolean;
    plataforma: boolean;
    whatsapp: boolean;
  };
}
```

---

## II. MÓDULO DE REQUISITOS DOCUMENTALES

### Objetivo
Configurar qué documentos son obligatorios para cada tipo de entidad (chofer, camión, acoplado, empresa).

### Funcionalidades

#### 2.1 Configuración de Requisitos

**Modelo de Requisito**
```typescript
interface ClienteDocumentRequirement {
  id: number;
  clienteId: number;
  templateId: number; // Referencia a DocumentTemplate
  entityType: 'CHOFER' | 'CAMION' | 'ACOPLADO' | 'EMPRESA_TRANSPORTISTA';
  obligatorio: boolean;
  diasAnticipacion: number; // Días antes del vencimiento para alertar
  visibleChofer: boolean; // Si el chofer puede verlo en su portal
  template: {
    id: number;
    name: string; // Ej: "Licencia de Conducir", "VTV", "Seguro"
    entityType: string;
  };
}
```

**Pantallas UI**:

1. **Lista de Requisitos por Entidad**
   - Tabs: Choferes | Camiones | Acoplados | Empresas
   - Tabla con requisitos configurados
   - Agregar nuevo requisito
   - Editar/Eliminar requisito

2. **Formulario de Requisito**
   - Seleccionar tipo de documento (desde plantillas globales)
   - Marcar como obligatorio
   - Configurar días de anticipación
   - Definir visibilidad para chofer

**Endpoints**:
```
GET    /api/docs/clients/:clienteId/requirements
GET    /api/docs/clients/:clienteId/requirements?entityType=CHOFER
POST   /api/docs/clients/:clienteId/requirements
PUT    /api/docs/clients/:clienteId/requirements/:id
DELETE /api/docs/clients/:clienteId/requirements/:id
```

#### 2.2 Gestión de Plantillas Disponibles

**Consulta de Plantillas Globales**
```
GET /api/docs/templates
GET /api/docs/templates?entityType=CHOFER&active=true
```

**Solicitud de Nuevas Plantillas** (Ticket al admin)
```
POST /api/docs/clients/me/template-requests
{
  "name": "Certificado de Manipulación de Alimentos",
  "entityType": "CHOFER",
  "justificacion": "Requerido por normativa sanitaria"
}
```

---

## III. MÓDULO DE GESTIÓN DE EQUIPOS AUTORIZADOS

### Objetivo
**Núcleo de la plataforma**: Consultar equipos, verificar compliance, gestionar autorizaciones.

### Funcionalidades

#### 3.1 Consulta de Equipos

**Modelo de Equipo con Compliance**
```typescript
interface EquipoConCompliance {
  equipo: {
    id: number;
    dadorCargaId: number;
    empresaTransportistaId: number;
    chofer: {
      dniNorm: string;
      nombre: string;
      apellido: string;
      phones: string[];
    };
    camion: {
      patenteNorm: string;
      marca: string;
      modelo: string;
    };
    acoplado?: {
      patenteNorm: string;
      tipo: string;
    };
    estado: 'ACTIVO' | 'FINALIZADO';
    validFrom: Date;
    validTo?: Date;
  };
  compliance: {
    estado: 'VIGENTE' | 'ALERTA' | 'CRITICO';
    porcentajeCumplimiento: number;
    documentosRequeridos: number;
    documentosVigentes: number;
    documentosPorVencer: number;
    documentosVencidos: number;
    documentosFaltantes: number;
    detalleDocumentos: Array<{
      templateId: number;
      templateName: string;
      entityType: string;
      obligatorio: boolean;
      status: 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'FALTANTE' | 'PENDIENTE' | 'RECHAZADO';
      document?: {
        id: number;
        fileName: string;
        uploadedAt: Date;
        expiresAt?: Date;
        diasRestantes?: number;
      };
    }>;
  };
  autorizado: boolean; // Si puede operar o ingresar
}
```

**Pantallas UI**:

1. **Lista de Equipos**
   - Tabla con semáforo visual (🟢🟡🔴)
   - Filtros:
     - Por estado de compliance
     - Por dador de carga
     - Por empresa transportista
     - Por estado del equipo (activo/finalizado)
   - Búsqueda rápida: DNI, patente camión, patente acoplado
   - Paginación: 20, 50, 100 por página
   - Ordenamiento: Por fecha, por estado, por nombre

2. **Detalle de Equipo**
   - Información completa
   - Semáforo grande de estado
   - Tabla de documentos con estado individual
   - Acciones:
     - Ver documento
     - Descargar ZIP con toda la documentación
     - Solicitar documento faltante
     - Autorizar/Bloquear equipo manualmente
     - Ver historial

**Endpoints**:
```
GET /api/docs/clients/:clienteId/equipos
GET /api/docs/clients/:clienteId/equipos/:id
GET /api/docs/clients/:clienteId/equipos/:id/compliance
GET /api/docs/clients/:clienteId/equipos/:id/documents
GET /api/docs/clients/:clienteId/equipos/:id/history
POST /api/docs/clients/:clienteId/equipos/:id/authorize
POST /api/docs/clients/:clienteId/equipos/:id/block
GET /api/docs/clients/:clienteId/equipos/:id/zip (descarga)
```

#### 3.2 Control de Compliance

**Lógica de Semáforo**:

```typescript
function calcularEstadoCompliance(equipo: Equipo, requisitos: Requirement[]): ComplianceState {
  const documentosObligatorios = requisitos.filter(r => r.obligatorio);
  
  const faltantes = documentosObligatorios.filter(r => !tieneDocumento(equipo, r));
  const vencidos = documentosObligatorios.filter(r => documentoVencido(equipo, r));
  const rechazados = documentosObligatorios.filter(r => documentoRechazado(equipo, r));
  
  // 🔴 CRÍTICO: Faltantes, vencidos o rechazados
  if (faltantes.length > 0 || vencidos.length > 0 || rechazados.length > 0) {
    return {
      estado: 'CRITICO',
      autorizado: false,
      motivo: `${faltantes.length} faltantes, ${vencidos.length} vencidos, ${rechazados.length} rechazados`
    };
  }
  
  const porVencer = documentosObligatorios.filter(r => {
    const doc = getDocumento(equipo, r);
    return doc && diasHastaVencimiento(doc) <= r.diasAnticipacion;
  });
  
  // 🟡 ALERTA: Por vencer próximamente
  if (porVencer.length > 0) {
    return {
      estado: 'ALERTA',
      autorizado: true,
      motivo: `${porVencer.length} documentos por vencer`
    };
  }
  
  // 🟢 VIGENTE: Todo OK
  return {
    estado: 'VIGENTE',
    autorizado: true,
    motivo: 'Todos los documentos vigentes'
  };
}
```

#### 3.3 Búsqueda Avanzada

**Formulario de Búsqueda**:
```typescript
interface EquipoSearchFilters {
  // Búsqueda de texto
  dniChofer?: string;
  patenteCamion?: string;
  patenteAcoplado?: string;
  
  // Filtros
  dadorCargaId?: number;
  empresaTransportistaId?: number;
  estadoCompliance?: 'VIGENTE' | 'ALERTA' | 'CRITICO';
  estadoEquipo?: 'ACTIVO' | 'FINALIZADO';
  
  // Rango de fechas
  fechaRegistroDesde?: Date;
  fechaRegistroHasta?: Date;
  
  // Paginación
  page?: number;
  limit?: number;
  sortBy?: 'fecha' | 'estado' | 'chofer';
  sortOrder?: 'asc' | 'desc';
}
```

**Endpoint**:
```
GET /api/docs/clients/:clienteId/equipos/search?dniChofer=12345678&estadoCompliance=CRITICO
```

---

## IV. MÓDULO DE DOCUMENTACIÓN

### Objetivo
Visualizar, descargar y solicitar documentos de los equipos.

### Funcionalidades

#### 4.1 Visualización de Documentos

**Visor de Documentos**:
- Preview en línea (PDF, imágenes)
- Zoom, rotación
- Navegación entre páginas
- Metadatos: tamaño, fecha de carga, usuario que subió, fecha de aprobación

**Endpoints**:
```
GET /api/docs/storage/view/:documentId (stream del archivo)
GET /api/docs/documents/:id (metadata)
```

#### 4.2 Descarga de Documentos

**Individual**:
```
GET /api/docs/documents/:id/download
```

**Por Equipo (ZIP)**:
```
GET /api/docs/clients/:clienteId/equipos/:equipoId/zip
Content-Type: application/zip
Content-Disposition: attachment; filename="equipo_123_20250105.zip"
```

**Masiva (Lista de Equipos)**:
```
POST /api/docs/clients/:clienteId/equipos/bulk-download
{
  "equipoIds": [101, 102, 103]
}
→ Genera ZIP con estructura:
  equipo_101/
    chofer/
      licencia.pdf
      libreta_sanitaria.pdf
    camion/
      vtv.pdf
      seguro.pdf
  equipo_102/
    ...
```

#### 4.3 Solicitud de Documentación

**Solicitar a Transportista**:
```
POST /api/docs/clients/:clienteId/equipos/:equipoId/request-documents
{
  "templateIds": [1, 2, 5], // IDs de plantillas faltantes
  "message": "Por favor, completar documentación antes del ingreso del 10/01/2025",
  "notificarChofer": true,
  "notificarDador": true
}
```

**Sistema de Notificaciones**:
- WhatsApp al chofer (vía Evolution API)
- Email al dador de carga
- Registro en `notification_log`

---

## V. MÓDULO DE DASHBOARD Y REPORTES

### Objetivo
Proveer visibilidad ejecutiva del estado de compliance con KPIs y reportes exportables.

### Funcionalidades

#### 5.1 Dashboard Ejecutivo

**KPIs Principales**:
```typescript
interface ClienteDashboard {
  totales: {
    equiposRegistrados: number;
    equiposActivos: number;
    equiposFinalizados: number;
  };
  compliance: {
    vigentes: number;      // 🟢
    alertas: number;       // 🟡
    criticos: number;      // 🔴
    tasaCumplimiento: number; // Porcentaje (0-100)
  };
  documentos: {
    total: number;
    vigentes: number;
    porVencer7dias: number;
    porVencer15dias: number;
    porVencer30dias: number;
    vencidos: number;
    faltantes: number;
  };
  tendencias: {
    evolucionCumplimiento: Array<{
      fecha: Date;
      tasaCumplimiento: number;
    }>;
    vencimientosMensuales: Array<{
      mes: string;
      cantidad: number;
    }>;
  };
}
```

**Gráficos**:
1. Gauge de tasa de compliance
2. Torta: Distribución verde/amarillo/rojo
3. Barras: Vencimientos por mes
4. Línea: Evolución temporal de compliance
5. Top 10 transportistas por cumplimiento

**Endpoints**:
```
GET /api/docs/clients/:clienteId/dashboard
GET /api/docs/clients/:clienteId/dashboard/trends?period=30d
```

#### 5.2 Reportes Predefinidos

**1. Reporte de Compliance General**
```
GET /api/docs/clients/:clienteId/reports/compliance
→ Excel con:
  - Estado de todos los equipos
  - Porcentaje de cumplimiento
  - Equipos críticos destacados
  - Resumen por transportista
```

**2. Reporte de Vencimientos**
```
GET /api/docs/clients/:clienteId/reports/vencimientos?dias=30
→ Excel con:
  - Documentos que vencen en los próximos X días
  - Ordenado por fecha de vencimiento
  - Agrupado por equipo y tipo de documento
```

**3. Reporte de Faltantes**
```
GET /api/docs/clients/:clienteId/reports/faltantes
→ Excel con:
  - Equipos con documentación incompleta
  - Listado de documentos faltantes
  - Contacto del responsable (transportista)
```

**4. Reporte de Actividad**
```
GET /api/docs/clients/:clienteId/reports/actividad?desde=2025-01-01&hasta=2025-01-31
→ Excel con:
  - Documentos subidos
  - Documentos aprobados/rechazados
  - Nuevos equipos registrados
  - Timeline de eventos
```

**5. Reporte de Transportistas**
```
GET /api/docs/clients/:clienteId/reports/transportistas
→ Excel con:
  - Ranking por cumplimiento
  - Equipos por transportista
  - Estadísticas de calidad documental
  - Tiempos de respuesta
```

#### 5.3 Exportación Personalizada

**Constructor de Reportes**:
```
POST /api/docs/clients/:clienteId/reports/custom
{
  "titulo": "Reporte Mensual Enero 2025",
  "campos": ["chofer", "patenteCamion", "estadoCompliance", "documentosVencidos"],
  "filtros": {
    "estadoCompliance": ["CRITICO", "ALERTA"],
    "fechaDesde": "2025-01-01",
    "fechaHasta": "2025-01-31"
  },
  "formato": "xlsx" | "pdf" | "csv",
  "incluirGraficos": true
}
```

---

## VI. MÓDULO DE NOTIFICACIONES Y ALERTAS

### Objetivo
Mantener informado al cliente sobre eventos críticos y próximos vencimientos.

### Funcionalidades

#### 6.1 Configuración de Alertas

**Tipos de Alertas**:
```typescript
enum AlertType {
  VENCIMIENTO_PROXIMO = 'VENCIMIENTO_PROXIMO',
  DOCUMENTO_VENCIDO = 'DOCUMENTO_VENCIDO',
  DOCUMENTO_FALTANTE = 'DOCUMENTO_FALTANTE',
  DOCUMENTO_RECHAZADO = 'DOCUMENTO_RECHAZADO',
  NUEVO_EQUIPO = 'NUEVO_EQUIPO',
  CAMBIO_EQUIPO = 'CAMBIO_EQUIPO',
  INTENTO_ACCESO_BLOQUEADO = 'INTENTO_ACCESO_BLOQUEADO'
}
```

**Configuración Global del Cliente**:
```typescript
interface ClienteNotificationConfig {
  alertas: {
    [key in AlertType]: {
      activa: boolean;
      canales: ('EMAIL' | 'PLATAFORMA' | 'WHATSAPP')[];
      destinatarios: string[]; // Emails o teléfonos
      frecuencia: 'INMEDIATA' | 'RESUMEN_DIARIO' | 'RESUMEN_SEMANAL';
    };
  };
  diasAnticipacionGlobal: number; // Puede sobreescribirse por requisito
}
```

**Endpoints**:
```
GET /api/docs/clients/:clienteId/notifications/config
PUT /api/docs/clients/:clienteId/notifications/config
```

#### 6.2 Centro de Notificaciones

**Lista de Notificaciones**:
```
GET /api/docs/clients/:clienteId/notifications?page=1&limit=20&leido=false
```

**Marcar como Leída**:
```
PUT /api/docs/clients/:clienteId/notifications/:notificationId/read
```

**Acciones Rápidas desde Notificación**:
- Ir a equipo
- Solicitar documento
- Ver documento
- Descartar/Archivar

---

## VII. MÓDULO DE BÚSQUEDAS AVANZADAS Y CONSULTAS

### Objetivo
Permitir búsquedas complejas y consultas masivas.

### Funcionalidades

#### 7.1 Búsqueda Multi-Criterio

Ya cubierto en módulo III.

#### 7.2 Consultas Masivas

**Importación CSV para Verificación**:
```
POST /api/docs/clients/:clienteId/equipos/bulk-search
Content-Type: multipart/form-data
file: equipos.csv

CSV Format:
dniChofer,patenteCamion,patenteAcoplado
12345678,AB123CD,AC456EF
87654321,XY987ZW,

→ Responde con JSON con estado de cada uno
```

#### 7.3 Guardado de Búsquedas

**Favoritos**:
```
POST /api/docs/clients/:clienteId/saved-searches
{
  "nombre": "Equipos Críticos - Dador A",
  "filtros": {
    "dadorCargaId": 1,
    "estadoCompliance": "CRITICO"
  }
}

GET /api/docs/clients/:clienteId/saved-searches
GET /api/docs/clients/:clienteId/saved-searches/:id/execute
```

---

## VIII. MÓDULO DE CALENDARIO Y PROGRAMACIÓN

### Objetivo
Visualizar vencimientos y programar operaciones.

### Funcionalidades

#### 8.1 Calendario de Vencimientos

**Vista de Calendario**:
```
GET /api/docs/clients/:clienteId/calendar/vencimientos?mes=2025-01
→ Responde con eventos por día:
{
  "2025-01-15": [
    {
      "equipoId": 101,
      "documentoId": 500,
      "templateName": "Licencia de Conducir",
      "chofer": "Juan Pérez",
      "diasRestantes": 5,
      "criticidad": "ALERTA"
    }
  ]
}
```

**Filtros**:
- Por tipo de documento
- Por criticidad
- Por transportista

#### 8.2 Programación de Ingresos

**Registro de Turnos**:
```
POST /api/docs/clients/:clienteId/turnos
{
  "equipoId": 101,
  "fechaHora": "2025-01-10T08:00:00Z",
  "destino": "Planta Norte",
  "observaciones": "Carga de cereales"
}
```

**Validación Pre-Turno**:
```
GET /api/docs/clients/:clienteId/turnos/:id/validate
→ Verifica si el equipo está autorizado en esa fecha
```

---

## IX. MÓDULO DE GESTIÓN DE PROVEEDORES

### Objetivo
Evaluar y comunicarse con transportistas y dadores de carga.

### Funcionalidades

#### 9.1 Directorio de Transportistas

**Lista de Transportistas**:
```
GET /api/docs/clients/:clienteId/transportistas
→ Lista de empresas transportistas que operan con el cliente
```

**Detalle**:
```
GET /api/docs/clients/:clienteId/transportistas/:id
{
  "id": 1,
  "razonSocial": "Transportes del Norte SA",
  "cuit": "30-12345678-9",
  "equiposActivos": 15,
  "tasaCumplimiento": 85,
  "documentosVencidos": 3,
  "documentosPorVencer": 5
}
```

#### 9.2 Evaluación de Performance

**Métricas por Transportista**:
```
GET /api/docs/clients/:clienteId/transportistas/:id/metrics
{
  "cumplimiento": {
    "tasa": 85,
    "tendencia": "MEJORANDO",
    "historico": [...]
  },
  "tiempoRespuesta": {
    "promedioHoras": 24,
    "solicitudesPendientes": 2
  },
  "calidadDocumental": {
    "tasaRechazo": 5,
    "motivosRechazo": [...]
  }
}
```

**Ranking**:
```
GET /api/docs/clients/:clienteId/transportistas/ranking?sortBy=cumplimiento&order=desc
```

---

## X. MÓDULO DE SEGURIDAD Y CONTROL DE ACCESO

### Objetivo
Gestionar usuarios internos y control de acceso físico.

### Funcionalidades

#### 10.1 Gestión de Usuarios Internos

Ya cubierto en módulo I.

#### 10.2 Control de Acceso Físico

**API de Validación en Tiempo Real**:
```
POST /api/docs/clients/:clienteId/access/validate
{
  "dniChofer": "12345678",
  "patenteCamion": "AB123CD",
  "patenteAcoplado": "AC456EF" // opcional
}
→ Responde en < 500ms:
{
  "autorizado": true|false,
  "estadoCompliance": "VIGENTE"|"ALERTA"|"CRITICO",
  "motivo": "Todos los documentos vigentes",
  "equipo": {...},
  "documentosFaltantes": []
}
```

**Registro de Accesos**:
```
POST /api/docs/clients/:clienteId/access/log
{
  "equipoId": 101,
  "autorizado": true,
  "timestamp": "2025-01-10T08:15:00Z",
  "puerta": "Acceso Norte",
  "operador": "Juan Seguridad"
}
```

**Consulta de Log**:
```
GET /api/docs/clients/:clienteId/access/log?desde=2025-01-01&hasta=2025-01-31
```

#### 10.3 Generación de Códigos QR

**Generar QR para Equipo**:
```
GET /api/docs/clients/:clienteId/equipos/:equipoId/qr
→ Imagen PNG del QR code que contiene:
{
  "equipoId": 101,
  "clienteId": 5,
  "validUntil": "2025-01-31T23:59:59Z",
  "signature": "SHA256_HASH"
}
```

**Escanear QR en Portería**:
```
POST /api/docs/clients/:clienteId/access/scan-qr
{
  "qrData": "base64_encoded_qr_content"
}
→ Valida firma y responde con autorización
```

---

## XI. MÓDULO DE CONFIGURACIÓN Y ADMINISTRACIÓN

### Objetivo
Configurar parámetros del cliente e integraciones.

### Funcionalidades

#### 11.1 Configuración General

**Parámetros del Cliente**:
```
GET /api/docs/clients/:clienteId/config
PUT /api/docs/clients/:clienteId/config
{
  "diasAnticipacionDefault": 15,
  "horarioOperacion": {
    "inicio": "07:00",
    "fin": "18:00",
    "diasLaborables": ["L", "M", "X", "J", "V"]
  },
  "logoUrl": "https://...",
  "colorPrimario": "#0066CC",
  "idioma": "es"
}
```

#### 11.2 Integraciones

**Webhooks**:
```
POST /api/docs/clients/:clienteId/webhooks
{
  "evento": "EQUIPO_CAMBIO_ESTADO",
  "url": "https://cliente.com/api/webhook/compliance",
  "secret": "shared_secret_for_signature"
}
```

**Eventos disponibles**:
- `EQUIPO_CAMBIO_ESTADO`: Cambio de verde/amarillo/rojo
- `DOCUMENTO_VENCIDO`: Documento venció
- `DOCUMENTO_APROBADO`: Documento aprobado
- `NUEVO_EQUIPO`: Alta de equipo

**API Key**:
```
POST /api/docs/clients/:clienteId/api-keys
{
  "nombre": "Integración ERP",
  "scopes": ["read:equipos", "read:documents"]
}
→ Genera API Key para uso programático
```

---

## XII. MÓDULO MÓVIL Y RESPONSIVE

### Objetivo
Acceso desde cualquier dispositivo.

### Funcionalidades

#### 12.1 Web Responsive

- Diseño adaptativo para tablet y móvil
- Interfaz touch-friendly
- Modo offline básico (caché de equipos)

#### 12.2 App Móvil Nativa (Fase 3)

- **React Native**: iOS y Android
- Funcionalidades principales:
  - Búsqueda rápida de equipos
  - Scanner QR
  - Validación en portería
  - Notificaciones push
  - Acceso offline

---

## XIII. MÓDULO DE ANALYTICS AVANZADO

### Objetivo
IA y predicciones para mejora continua.

### Funcionalidades

#### 13.1 Predicción de Vencimientos

**Machine Learning**:
```
GET /api/docs/clients/:clienteId/analytics/predictions
→ Predice:
  - Probabilidad de que un equipo llegue a rojo
  - Transportistas con riesgo de incumplimiento
  - Documentos más problemáticos
```

#### 13.2 Optimización de Requisitos

**Sugerencias**:
```
GET /api/docs/clients/:clienteId/analytics/optimization
→ Analiza histórico y sugiere:
  - Reducir días de anticipación si nunca hubo problemas
  - Aumentar si hay muchos vencimientos
  - Documentos opcionales que deberían ser obligatorios
```

---

## XIV. MÓDULO DE SOPORTE Y AYUDA

### Funcionalidades

#### 14.1 Centro de Ayuda

**Base de Conocimiento**:
```
GET /api/docs/help/articles
GET /api/docs/help/articles/:id
GET /api/docs/help/search?q=como+solicitar+documento
```

#### 14.2 Soporte Técnico

**Sistema de Tickets**:
```
POST /api/docs/clients/:clienteId/support/tickets
{
  "asunto": "No puedo ver documentos de un equipo",
  "descripcion": "...",
  "prioridad": "MEDIA",
  "adjuntos": [...]
}

GET /api/docs/clients/:clienteId/support/tickets
GET /api/docs/clients/:clienteId/support/tickets/:id
```

---

## 🚦 Priorización y Roadmap

### Fase 1: MVP (2-3 meses)

**Funcionalidades Críticas**:
- ✅ Módulo I: Perfil y usuarios básico
- ✅ Módulo II: Configuración de requisitos
- ✅ Módulo III: Gestión de equipos (consulta, búsqueda)
- ✅ Módulo IV: Visualización y descarga de documentos
- ✅ Módulo V: Dashboard básico con KPIs principales
- ✅ Módulo VI: Notificaciones por email
- ✅ Módulo X: Gestión de usuarios y roles

**Endpoints MVP**:
```
# Perfil
GET/PUT /api/docs/clients/me/profile
GET/POST/PUT/DELETE /api/docs/clients/me/users

# Requisitos
GET/POST/PUT/DELETE /api/docs/clients/:id/requirements

# Equipos
GET /api/docs/clients/:id/equipos
GET /api/docs/clients/:id/equipos/:equipoId
GET /api/docs/clients/:id/equipos/:equipoId/compliance
GET /api/docs/clients/:id/equipos/:equipoId/zip

# Dashboard
GET /api/docs/clients/:id/dashboard

# Notificaciones
GET /api/docs/clients/:id/notifications
PUT /api/docs/clients/:id/notifications/:notifId/read
```

### Fase 2: Funcionalidades Avanzadas (2-3 meses)

- ✅ Módulo V: Reportes completos y exportación
- ✅ Módulo VI: Notificaciones multi-canal (WhatsApp)
- ✅ Módulo VII: Búsquedas avanzadas y guardadas
- ✅ Módulo VIII: Calendario de vencimientos
- ✅ Módulo IX: Evaluación de transportistas
- ✅ Módulo X: Control de acceso físico y QR
- ✅ Módulo XI: Webhooks e integraciones

### Fase 3: Innovación (3-4 meses)

- ✅ Módulo XII: App móvil nativa
- ✅ Módulo XIII: Analytics con IA
- ✅ Optimización de performance
- ✅ Personalización avanzada

---

## 🔐 Seguridad y Compliance

### Autenticación y Autorización

**JWT RS256**:
- Token de acceso (15 min)
- Refresh token (7 días)
- Firma con clave privada RSA

**Middleware de Autenticación**:
```typescript
import { authenticate, tenantResolver } from '../middlewares/auth.middleware';

router.use('/api/docs/clients', authenticate, tenantResolver);
```

**Control de Acceso**:
```typescript
// Usuario debe pertenecer al cliente para acceder a sus datos
function authorizeCliente(req, res, next) {
  const { clienteId } = req.params;
  const user = req.user;
  
  if (user.clienteId !== parseInt(clienteId) && user.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}
```

### Auditoría

**Log de Acciones**:
```typescript
await db.auditLog.create({
  clienteId: user.clienteId,
  userId: user.id,
  action: 'EQUIPO_CONSULTA',
  entityType: 'EQUIPO',
  entityId: equipoId,
  metadata: { ip: req.ip, userAgent: req.get('User-Agent') }
});
```

### RGPD / Protección de Datos

- ✅ Consentimiento explícito para procesamiento de datos
- ✅ Derecho al olvido (eliminación de datos)
- ✅ Exportación de datos (portabilidad)
- ✅ Logs sin PII (datos personales enmascarados)

---

## 📊 Métricas de Éxito

### KPIs de la Plataforma

1. **Tasa de Adopción**: % de clientes que usan activamente la plataforma
2. **Frecuencia de Uso**: Logins por semana
3. **Tasa de Compliance**: % promedio de equipos en verde
4. **Tiempo de Respuesta**: Latencia de endpoints críticos
5. **Satisfacción**: NPS (Net Promoter Score)
6. **Reducción de Incidentes**: Menos intentos de acceso bloqueados

### Métricas Técnicas

- Disponibilidad: > 99.5%
- Latencia p95: < 500ms
- Tasa de error: < 1%
- Tiempo de build/deploy: < 10 min

---

## 📚 Documentación Técnica

### Stack Tecnológico

**Frontend**:
- React 18 + TypeScript
- Vite
- Tailwind CSS + Shadcn/UI
- Redux Toolkit
- React Query
- Recharts (gráficos)

**Backend**:
- Node.js 20 + TypeScript
- Express
- Prisma (PostgreSQL)
- JWT RS256
- Winston (logging)
- BullMQ (jobs)

**Infraestructura**:
- Docker + Docker Swarm
- PostgreSQL 16
- Redis 7
- MinIO (S3)
- Nginx (reverse proxy)

### Estructura de Archivos

```
apps/
├── backend/
│   └── src/
│       └── routes/
│           └── docs.routes.ts (actualizar con endpoints de cliente)
├── documentos/
│   └── src/
│       ├── routes/
│       │   └── clients.routes.ts (NUEVO)
│       ├── controllers/
│       │   └── clients.controller.ts (NUEVO)
│       └── services/
│           └── clients.service.ts (NUEVO)
└── frontend/
    └── src/
        └── pages/
            └── ClientePortalPage.tsx (NUEVO, actualmente existe)
```

---

## 🎯 Conclusión

Esta especificación define una **plataforma completa, profesional y escalable** para que empresas cliente puedan:

1. **Configurar** sus requisitos documentales específicos
2. **Consultar** en tiempo real el estado de compliance de equipos
3. **Gestionar** autorizaciones de acceso de manera inteligente
4. **Comunicarse** eficientemente con transportistas
5. **Analizar** tendencias y tomar decisiones basadas en datos
6. **Integrar** con sus sistemas propios (ERP, WMS, TMS, control de acceso)

La implementación por fases permite entregar valor rápidamente (MVP en 2-3 meses) mientras se construye una solución robusta y completa.

---

**Documento generado**: 2025-01-05  
**Versión**: 1.0  
**Autor**: Tech Lead - Monorepo BCA  
**Próxima revisión**: Después de aprobación de stakeholders

