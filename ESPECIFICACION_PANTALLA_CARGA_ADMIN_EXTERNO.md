# Especificación: Pantalla de Carga de Equipos

## 📋 Contexto

**Origen**: Replicar funcionalidad del formulario "QUEBRACHO BLANCO S.R.L. - BASE DE DATOS PROSIL S.A."

**Usuarios**: Sistema multi-rol para gestión de equipos de transporte

**Objetivo**: Permitir la carga y gestión de equipos (empresa transportista + chofer + camión + acoplado) con documentación completa, asignables a múltiples clientes.

---

## 🏗️ Modelo de Negocio

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
```typescript
EmpresaTransportista → CUIT (único)
Chofer → DNI (único)
Camion → Patente (única, normalizada)
Acoplado → Patente (única, normalizada)
Equipo → Combinación única de los 4
```

---

## 👥 Roles de Usuario

### Roles del Sistema

```typescript
enum UserRole {
  SUPERADMIN,
  ADMIN,
  ADMIN_INTERNO,      // Personal Quebracho/Microsyst
  DADOR_DE_CARGA,     // Intermediario (coordina múltiples transportistas)
  TRANSPORTISTA,      // Empresa Transportista (gestiona su flota)
  CHOFER,             // Conductor (administra sus datos + su equipo)
  OPERADOR_INTERNO,   // Personal operativo interno
  CLIENTE,            // Solo consulta equipos asignados
  USER,
}
```

### Matriz de Permisos Completa

| Acción | ADMIN_INTERNO | DADOR_DE_CARGA | TRANSPORTISTA | CHOFER | CLIENTE |
|--------|---------------|----------------|---------------|---------|---------|
| **Seleccionar dador al cargar** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ver todos los equipos** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ver equipos de su dador** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Ver equipos de su empresa** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Ver solo su equipo** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Ver equipos asignados a él** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Cargar múltiples empresas transp.** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Cargar solo su empresa** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Agregar/editar choferes** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Agregar/editar unidades** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Crear equipos** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Seleccionar clientes para equipo** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Editar sus propios datos** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Editar docs propios (DNI, licencia)** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Editar datos del camión de su equipo** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Editar docs del camión de su equipo** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Editar datos del acoplado de su equipo** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Editar docs del acoplado de su equipo** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Cambiar chofer de equipo** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Aprobar documentos** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Rechazar documentos** | ✅ | ❌ | ❌ | ❌ | ❌ |

### Reglas de Negocio

1. **Un chofer solo puede estar en 1 equipo a la vez**
2. **Un equipo puede trabajar para múltiples clientes simultáneamente**
3. **El chofer NO puede auto-asignarse a otro equipo** (solo TRANSPORTISTA/DADOR/ADMIN)
4. **Cada entidad se identifica por clave única** (CUIT, DNI, Patentes)

---

## 🎨 Diseño de la Pantalla de Carga

### Layout General según Rol

#### Vista: ADMIN_INTERNO

```
┌──────────────────────────────────────────────────────────┐
│ 🚛 Gestión de Equipos                  [Usuario] [Salir] │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Dador de Carga *                                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │ [Seleccionar dador] ▼                           │    │
│  │  - Leandro Castro                               │    │
│  │  - Quebracho Blanco (como dador)                │    │
│  │  - Otros dadores...                             │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  Cliente(s) para quien trabajará este equipo *           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ [☑] PROSIL S.A.                                 │    │
│  │ [☐] Cliente 2                                   │    │
│  │ [☐] Cliente 3                                   │    │
│  │ [☐] Otros...                                    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  📊 Progreso: ████████░░░░░░ 23/30 campos (77%)          │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [1. Empresa Transportista] ✅ Completo          │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [2. Chofer] ⚠️  Falta 1 documento               │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [3. Unidades (Tractor + Semi)] ❌ Incompleto    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  [Guardar Equipo]                                         │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

#### Vista: DADOR_DE_CARGA / TRANSPORTISTA

```
┌──────────────────────────────────────────────────────────┐
│ 🚛 Gestión de Equipos                  [Usuario] [Salir] │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Cliente(s) para quien trabajará este equipo *           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ [☑] PROSIL S.A.                                 │    │
│  │ [☐] Cliente 2                                   │    │
│  │ [☐] Cliente 3                                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  📊 Progreso: ████████░░░░░░ 23/30 campos (77%)          │
│                                                           │
│  [Secciones de carga...]                                  │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

#### Vista: CHOFER (Solo Edición de su Equipo)

```
┌──────────────────────────────────────────────────────────┐
│ 👤 Mi Equipo                           [Usuario] [Salir] │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Equipo asignado:                                         │
│  🏢 Transportes Pérez S.A.                               │
│  🚜 Tractor: AB123CD  +  🚛 Semi: XY789ZW                │
│  📋 Clientes: PROSIL S.A., Cliente 2                     │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [1. Mis Datos] ✅ Completo               [Editar]│   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [2. Tractor AB123CD] ⚠️ RTO vence en 15 días    │   │
│  │                                           [Editar]│   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [3. Semi XY789ZW] ✅ Completo            [Editar]│   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## 📋 Listado de Equipos con Sistema de Semáforo

### Vista: Listado Principal de Equipos

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🚛 Mis Equipos                                  [Usuario] [Salir]    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [🔍 Buscar...] [Filtros ▼] [+ Nuevo Equipo]                        │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 🟢  Equipo #1                                    [▶ Ver detalle]│ │
│  │     🏢 Transportes Pérez S.A.                                  │ │
│  │     👤 Juan Pérez (DNI: 12.345.678)                            │ │
│  │     🚜 AB123CD + 🚛 XY789ZW                                    │ │
│  │     📋 Clientes: PROSIL S.A., Cliente 2                        │ │
│  │     ✅ Todos los documentos al día                             │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 🟡  Equipo #2                                    [▶ Ver detalle]│ │
│  │     🏢 Transportes Pérez S.A.                                  │ │
│  │     👤 María López (DNI: 87.654.321)                           │ │
│  │     🚜 EF456GH + 🚛 IJ012KL                                    │ │
│  │     📋 Clientes: PROSIL S.A.                                   │ │
│  │     ⚠️  2 documentos vencen en menos de 7 días                 │ │
│  │         • RTO Camión (vence 10/11/2025)                        │ │
│  │         • Licencia Chofer (vence 12/11/2025)                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 🔴  Equipo #3                                    [▶ Ver detalle]│ │
│  │     🏢 Transportes Gómez S.R.L.                                │ │
│  │     👤 Pedro Ruiz (DNI: 11.222.333)                            │ │
│  │     🚜 MN345OP + 🚛 QR678ST                                    │ │
│  │     📋 Clientes: Cliente 3                                     │ │
│  │     ❌ 3 documentos vencidos                                    │ │
│  │         • Seguro de Vida Chofer (venció 01/11/2025)            │ │
│  │         • RTO Semi (venció 28/10/2025)                         │ │
│  │         • Póliza Camión (venció 15/10/2025)                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ⚪  Equipo #4 - INCOMPLETO                       [▶ Completar] │ │
│  │     🏢 Transportes Pérez S.A.                                  │ │
│  │     👤 Carlos Fernández (DNI: 44.555.666)                      │ │
│  │     🚜 PQ789RS + 🚛 TU012VW                                    │ │
│  │     📋 Clientes: (sin asignar)                                 │ │
│  │     ⬜ Faltan 8 documentos obligatorios                         │ │
│  │         • DNI Chofer                                           │ │
│  │         • Licencia de Conducir                                 │ │
│  │         • RTO Camión                                           │ │
│  │         • y 5 más...                                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 🔵  Equipo #5                                    [▶ Ver detalle]│ │
│  │     🏢 Transportes Rodríguez                                   │ │
│  │     👤 Ana Martínez (DNI: 33.444.555)                          │ │
│  │     🚜 ST456UV + 🚛 WX789YZ                                    │ │
│  │     📋 Clientes: PROSIL S.A.                                   │ │
│  │     🔵 3 documentos nuevos pendientes de aprobación            │ │
│  │         • DNI Chofer (cargado hoy a las 09:30)                 │ │
│  │         • RTO Camión (actualizado hoy a las 10:15)             │ │
│  │         • Póliza Seguro Semi (actualizado hoy a las 11:00)     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 🔴🔵  Equipo #6                                  [▶ Ver detalle]│ │
│  │     🏢 Transportes López                                       │ │
│  │     👤 Jorge Díaz (DNI: 22.333.444)                            │ │
│  │     🚜 AB890CD + 🚛 EF123GH                                    │ │
│  │     📋 Clientes: Cliente 2, Cliente 3                          │ │
│  │     🔴 1 documento rechazado + 🔵 pendiente de recarga          │ │
│  │         • Licencia Chofer (rechazada - foto borrosa)           │ │
│  │     🔴 2 documentos vencidos                                    │ │
│  │         • RTO Semi (venció 02/11/2025)                         │ │
│  │         • Seguro Vida (venció 05/11/2025)                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Mostrando 6 de 12 equipos                          [1] 2 3 [Sig >] │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Nota**: El indicador 🔵 (azul) aparece cuando hay documentos pendientes de aprobación. El indicador 🔴🔵 (rojo + azul) indica documentos rechazados que necesitan recarga.

### Lógica del Sistema de Semáforo

```typescript
// Estado del equipo según documentación
enum EquipoEstado {
  COMPLETO_AL_DIA = 'verde',           // 🟢 Todos los docs obligatorios + ninguno vencido/por vencer
  POR_VENCER = 'amarillo',             // 🟡 Docs obligatorios completos + alguno vence en < 7 días
  VENCIDO = 'rojo',                    // 🔴 Al menos un documento vencido
  INCOMPLETO = 'gris',                 // ⚪ Faltan documentos obligatorios
  PENDIENTE_APROBACION = 'azul',       // 🔵 Hay documentos nuevos/actualizados pendientes de aprobación
  RECHAZADO_Y_PENDIENTE = 'rojo_azul', // 🔴🔵 Tiene docs rechazados que necesitan resubir
}

// Estado de cada documento individual
enum DocumentoEstado {
  NO_CARGADO = 'gris',              // ⚪ No se ha cargado aún
  PENDIENTE_APROBACION = 'azul',    // 🔵 Cargado/actualizado, esperando aprobación del dador
  APROBADO = 'verde',               // 🟢 Aprobado por el dador, válido
  RECHAZADO = 'rojo_azul',          // 🔴🔵 Rechazado por el dador, necesita recargar
  VENCIDO = 'rojo',                 // 🔴 Vencido (fecha de vencimiento pasada)
  POR_VENCER = 'amarillo',          // 🟡 Por vencer (< 7 días)
}

interface DocumentoEstado {
  id: number;
  tipo: string;
  nombre: string;
  obligatorio: boolean;
  cargado: boolean;
  estado: 'verde' | 'amarillo' | 'rojo' | 'gris';
  fechaVencimiento?: Date;
  diasParaVencer?: number;
}

interface EquipoConEstado {
  id: number;
  empresa: string;
  chofer: string;
  camion: string;
  acoplado: string;
  clientes: string[];
  
  // Estado general
  estadoGeneral: EquipoEstado;
  
  // Contadores
  documentosObligatorios: number;
  documentosCargados: number;
  documentosFaltantes: number;
  documentosVencidos: number;
  documentosPorVencer: number;  // < 7 días
  
  // Detalle de problemas
  documentosConProblema: DocumentoEstado[];
}
```

### Cálculo de Estado

```typescript
// apps/documentos/src/services/equipo-estado.service.ts

export class EquipoEstadoService {
  
  calcularEstadoEquipo(equipo: Equipo): EquipoConEstado {
    const documentos = this.obtenerTodosLosDocumentos(equipo);
    const obligatorios = documentos.filter(d => d.obligatorio);
    
    // 1. Verificar documentos obligatorios faltantes
    const faltantes = obligatorios.filter(d => !d.cargado);
    
    if (faltantes.length > 0) {
      return {
        ...equipo,
        estadoGeneral: EquipoEstado.INCOMPLETO,
        documentosFaltantes: faltantes.length,
        documentosConProblema: faltantes,
      };
    }
    
    // 2. Verificar documentos vencidos
    const vencidos = documentos.filter(d => 
      d.cargado && d.fechaVencimiento && d.fechaVencimiento < new Date()
    );
    
    if (vencidos.length > 0) {
      return {
        ...equipo,
        estadoGeneral: EquipoEstado.VENCIDO,
        documentosVencidos: vencidos.length,
        documentosConProblema: vencidos,
      };
    }
    
    // 3. Verificar documentos por vencer (< 7 días)
    const porVencer = documentos.filter(d => {
      if (!d.cargado || !d.fechaVencimiento) return false;
      
      const diasParaVencer = this.calcularDiasParaVencer(d.fechaVencimiento);
      return diasParaVencer >= 0 && diasParaVencer <= 7;
    });
    
    if (porVencer.length > 0) {
      return {
        ...equipo,
        estadoGeneral: EquipoEstado.POR_VENCER,
        documentosPorVencer: porVencer.length,
        documentosConProblema: porVencer.map(d => ({
          ...d,
          diasParaVencer: this.calcularDiasParaVencer(d.fechaVencimiento!),
        })),
      };
    }
    
    // 4. Todo OK
    return {
      ...equipo,
      estadoGeneral: EquipoEstado.COMPLETO_AL_DIA,
      documentosConProblema: [],
    };
  }
  
  private calcularDiasParaVencer(fechaVencimiento: Date): number {
    const hoy = new Date();
    const diff = fechaVencimiento.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  
  private obtenerTodosLosDocumentos(equipo: Equipo): DocumentoEstado[] {
    // Documentos de la empresa
    const docsEmpresa = this.getDocumentosEmpresa(equipo.empresaTransportista);
    
    // Documentos del chofer
    const docsChofer = this.getDocumentosChofer(equipo.chofer);
    
    // Documentos del camión
    const docsCamion = this.getDocumentosCamion(equipo.camion);
    
    // Documentos del acoplado
    const docsAcoplado = this.getDocumentosAcoplado(equipo.acoplado);
    
    return [...docsEmpresa, ...docsChofer, ...docsCamion, ...docsAcoplado];
  }
}
```

### Pantalla de Carga con Semáforos por Documento

Al clickear en un equipo desde el listado:

```
┌──────────────────────────────────────────────────────────────────┐
│ 🚛 Equipo #2 - Edición                              [❌ Cerrar]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Estado General: 🟡 2 documentos por vencer                      │
│                                                                   │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 🏢 EMPRESA TRANSPORTISTA                               [▼] ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                             ┃  │
│  ┃ 🟢 Constancia ARCA             ✅ Al día (vence 30/12/26) ┃  │
│  ┃ 🟢 Constancia Ingresos Brutos  ✅ Al día (vence 15/03/26) ┃  │
│  ┃ 🟢 Formulario 931               ✅ Al día (sin vencimiento)┃  │
│  ┃ 🟢 Recibos de Sueldo            ✅ Al día (actualizado)    ┃  │
│  ┃ 🟢 Boleta Sindical              ✅ Al día (actualizado)    ┃  │
│  ┃                                                             ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                   │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 👤 CHOFER: María López                                 [▼] ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                             ┃  │
│  ┃ 🟢 DNI                          ✅ Al día (vence 01/01/30) ┃  │
│  ┃ 🟡 Licencia de Conducir         ⚠️  Vence en 5 días       ┃  │
│  ┃                                    (12/11/2025)            ┃  │
│  ┃ 🟢 Alta ARCA                    ✅ Al día                  ┃  │
│  ┃ 🟢 Póliza ART                   ✅ Al día (vence 30/12/25)┃  │
│  ┃ 🟢 Seguro de Vida               ✅ Al día (vence 15/02/26)┃  │
│  ┃                                                             ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                   │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 🚜 TRACTOR: EF456GH                                    [▼] ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                             ┃  │
│  ┃ 🟢 Título / Contrato Alquiler   ✅ Al día                  ┃  │
│  ┃ 🟢 Cédula                        ✅ Al día (vence 20/05/26)┃  │
│  ┃ 🟡 RTO                           ⚠️  Vence en 3 días       ┃  │
│  ┃                                    (10/11/2025)            ┃  │
│  ┃ 🟢 Póliza de Seguro              ✅ Al día (vence 25/01/26)┃  │
│  ┃ 🟢 Certificado Libre Deuda       ✅ Al día (actualizado)   ┃  │
│  ┃                                                             ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                   │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 🚛 SEMI: IJ012KL                                       [▼] ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                             ┃  │
│  ┃ 🟢 Título / Contrato Alquiler   ✅ Al día                  ┃  │
│  ┃ 🟢 Cédula                        ✅ Al día (vence 18/04/26)┃  │
│  ┃ 🟢 RTO                           ✅ Al día (vence 22/03/26)┃  │
│  ┃ 🟢 Póliza de Seguro              ✅ Al día (vence 28/12/25)┃  │
│  ┃ 🟢 Certificado Libre Deuda       ✅ Al día (actualizado)   ┃  │
│  ┃                                                             ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                   │
│  ⚠️  Advertencia: 2 documentos vencen en menos de 7 días        │
│                                                                   │
│                                       [Cancelar]  [Guardar]       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Pantalla con Documentos Pendientes de Aprobación (Vista Dador)

Al clickear en un equipo con indicador 🔵:

```
┌──────────────────────────────────────────────────────────────────┐
│ 🚛 Equipo #5 - REVISIÓN DE DOCUMENTOS            [❌ Cerrar]     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Estado General: 🔵 3 documentos pendientes de aprobación        │
│                                                                   │
│  🏢 Transportes Rodríguez                                        │
│  👤 Ana Martínez (DNI: 33.444.555)                               │
│  🚜 ST456UV + 🚛 WX789YZ                                         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 📋 DOCUMENTOS PENDIENTES DE APROBACIÓN                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 👤 CHOFER: Ana Martínez                                [▼] ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                             ┃  │
│  ┃ 🟢 Alta ARCA                    ✅ Aprobado                ┃  │
│  ┃                                                             ┃  │
│  ┃ 🔵 DNI (frente y dorso)         🆕 NUEVO - Pendiente       ┃  │
│  ┃    Cargado: 07/11/2025 09:30 por Chofer Ana Martínez      ┃  │
│  ┃    Vencimiento: 15/03/2035                                 ┃  │
│  ┃    [👁️ Ver Documento] [✅ Aprobar] [❌ Rechazar]            ┃  │
│  ┃                                                             ┃  │
│  ┃ 🟢 Licencia de Conducir         ✅ Aprobado                ┃  │
│  ┃ 🟢 Póliza ART                   ✅ Aprobado                ┃  │
│  ┃ 🟢 Seguro de Vida               ✅ Aprobado                ┃  │
│  ┃                                                             ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                   │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 🚜 TRACTOR: ST456UV                                    [▼] ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                             ┃  │
│  ┃ 🟢 Título / Contrato Alquiler   ✅ Aprobado                ┃  │
│  ┃ 🟢 Cédula                        ✅ Aprobado                ┃  │
│  ┃                                                             ┃  │
│  ┃ 🔵 RTO                           🔄 ACTUALIZADO - Pendiente┃  │
│  ┃    Anterior: rto_anterior.pdf (10/05/2025)                 ┃  │
│  ┃    Nuevo: rto_nuevo.pdf (07/11/2025 10:15)                ┃  │
│  ┃    Vencimiento: 10/11/2026                                 ┃  │
│  ┃    [👁️ Ver Anterior] [👁️ Ver Nuevo] [✅ Aprobar] [❌ Rechazar]┃  │
│  ┃                                                             ┃  │
│  ┃ 🟢 Póliza de Seguro              ✅ Aprobado                ┃  │
│  ┃ 🟢 Certificado Libre Deuda       ✅ Aprobado                ┃  │
│  ┃                                                             ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                   │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 🚛 SEMI: WX789YZ                                       [▼] ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                             ┃  │
│  ┃ 🟢 Título / Contrato Alquiler   ✅ Aprobado                ┃  │
│  ┃ 🟢 Cédula                        ✅ Aprobado                ┃  │
│  ┃ 🟢 RTO                           ✅ Aprobado                ┃  │
│  ┃                                                             ┃  │
│  ┃ 🔵 Póliza de Seguro              🔄 ACTUALIZADO - Pendiente┃  │
│  ┃    Anterior: poliza_anterior.pdf (vence 15/12/2025)        ┃  │
│  ┃    Nuevo: poliza_nueva.pdf (07/11/2025 11:00)             ┃  │
│  ┃    Vencimiento: 15/12/2026                                 ┃  │
│  ┃    [👁️ Ver Anterior] [👁️ Ver Nuevo] [✅ Aprobar] [❌ Rechazar]┃  │
│  ┃                                                             ┃  │
│  ┃ 🟢 Certificado Libre Deuda       ✅ Aprobado                ┃  │
│  ┃                                                             ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                   │
│  💡 Puede aprobar/rechazar documentos individualmente o todos    │
│     a la vez.                                                     │
│                                                                   │
│  [Rechazar Todos]  [Aprobar Todos Pendientes]  [Cerrar]         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Modal de Rechazo de Documento

Cuando el dador clickea "❌ Rechazar":

```
┌──────────────────────────────────────────────────┐
│ Rechazar Documento                        [❌]   │
├──────────────────────────────────────────────────┤
│                                                   │
│ Documento: DNI (frente y dorso)                  │
│ Chofer: Ana Martínez                             │
│                                                   │
│ Motivo del rechazo *                             │
│ ┌───────────────────────────────────────────────┐│
│ │ [Seleccione un motivo] ▼                      ││
│ │  - Foto borrosa o ilegible                    ││
│ │  - Documento incompleto                       ││
│ │  - Datos no coinciden                         ││
│ │  - Documento vencido                          ││
│ │  - Formato de archivo incorrecto              ││
│ │  - Otro (especificar)                         ││
│ └───────────────────────────────────────────────┘│
│                                                   │
│ Comentarios adicionales (opcional)               │
│ ┌───────────────────────────────────────────────┐│
│ │ Por favor, vuelva a subir el documento con   ││
│ │ mejor iluminación. La foto del dorso está    ││
│ │ muy oscura.                                   ││
│ │                                               ││
│ └───────────────────────────────────────────────┘│
│                                                   │
│ ☑️ Notificar al chofer por email                 │
│ ☑️ Notificar al chofer por WhatsApp (si está     │
│    configurado)                                   │
│                                                   │
│              [Cancelar]  [Rechazar Documento]     │
│                                                   │
└──────────────────────────────────────────────────┘
```

### Pantalla con Documento Rechazado (Vista Chofer)

```
┌──────────────────────────────────────────────────────────────────┐
│ 👤 Mi Equipo                           [Usuario] [Salir]         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Equipo asignado:                                                 │
│  🏢 Transportes Rodríguez                                        │
│  🚜 ST456UV + 🚛 WX789YZ                                         │
│                                                                   │
│  Estado: 🔴🔵 1 documento rechazado que necesita recarga          │
│                                                                   │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 👤 MIS DATOS                                            [▼] ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                             ┃  │
│  ┃ ┌─────────────────────────────────────────────────────────┐┃  │
│  ┃ │ 🔴🔵 DNI (frente y dorso) - RECHAZADO                   │┃  │
│  ┃ │                                                          │┃  │
│  ┃ │ ❌ Rechazado por: Transportes Rodríguez                 │┃  │
│  ┃ │    Fecha: 07/11/2025 14:30                              │┃  │
│  ┃ │                                                          │┃  │
│  ┃ │ Motivo: Foto borrosa o ilegible                         │┃  │
│  ┃ │ Comentario: "Por favor, vuelva a subir el documento    │┃  │
│  ┃ │ con mejor iluminación. La foto del dorso está muy      │┃  │
│  ┃ │ oscura."                                                │┃  │
│  ┃ │                                                          │┃  │
│  ┃ │ [👁️ Ver Documento Rechazado] [📎 Subir Nuevo Documento]│┃  │
│  ┃ └─────────────────────────────────────────────────────────┘┃  │
│  ┃                                                             ┃  │
│  ┃ 🟢 Licencia de Conducir         ✅ Aprobado                ┃  │
│  ┃ 🟢 Alta ARCA                    ✅ Aprobado                ┃  │
│  ┃ 🟢 Póliza ART                   ✅ Aprobado                ┃  │
│  ┃ 🟢 Seguro de Vida               ✅ Aprobado                ┃  │
│  ┃                                                             ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🚫 Validación de Documentos Obligatorios

### Regla Crítica: No se puede guardar sin documentos obligatorios

```typescript
// Lista de documentos obligatorios por entidad

const DOCUMENTOS_OBLIGATORIOS = {
  empresaTransportista: [
    'CONSTANCIA_ARCA',
    'CONSTANCIA_INGRESOS_BRUTOS',
    'FORMULARIO_931',
    'RECIBOS_SUELDO',
    'BOLETA_SINDICAL',
  ],
  chofer: [
    'DNI',
    'LICENCIA_CONDUCIR',
    'ALTA_ARCA',
    'POLIZA_ART',
    'SEGURO_VIDA',
  ],
  camion: [
    'TITULO_O_CONTRATO',
    'CEDULA',
    'RTO',
    'POLIZA_SEGURO',
    'CERTIFICADO_LIBRE_DEUDA',
  ],
  acoplado: [
    'TITULO_O_CONTRATO',
    'CEDULA',
    'RTO',
    'POLIZA_SEGURO',
    'CERTIFICADO_LIBRE_DEUDA',
  ],
};
```

### Pantalla con Documentos Faltantes (Botón Guardar Deshabilitado)

```
┌──────────────────────────────────────────────────────────────────┐
│ 🚛 Equipo #4 - INCOMPLETO                       [❌ Cerrar]      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Estado General: ⚪ Faltan 8 documentos obligatorios             │
│                                                                   │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 🏢 EMPRESA TRANSPORTISTA                               [▼] ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                             ┃  │
│  ┃ 🟢 Constancia ARCA             ✅ Al día                   ┃  │
│  ┃ ⚪ Constancia Ingresos Brutos  ❌ FALTA (OBLIGATORIO) *    ┃  │
│  ┃ 🟢 Formulario 931               ✅ Al día                   ┃  │
│  ┃ ⚪ Recibos de Sueldo            ❌ FALTA (OBLIGATORIO) *    ┃  │
│  ┃ 🟢 Boleta Sindical              ✅ Al día                   ┃  │
│  ┃                                                             ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                   │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 👤 CHOFER: Carlos Fernández                            [▼] ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                             ┃  │
│  ┃ ⚪ DNI                          ❌ FALTA (OBLIGATORIO) *    ┃  │
│  ┃ ⚪ Licencia de Conducir         ❌ FALTA (OBLIGATORIO) *    ┃  │
│  ┃ ⚪ Alta ARCA                    ❌ FALTA (OBLIGATORIO) *    ┃  │
│  ┃ ⚪ Póliza ART                   ❌ FALTA (OBLIGATORIO) *    ┃  │
│  ┃ ⚪ Seguro de Vida               ❌ FALTA (OBLIGATORIO) *    ┃  │
│  ┃                                                             ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                   │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 🚜 TRACTOR: PQ789RS                                    [▼] ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                             ┃  │
│  ┃ 🟢 Título / Contrato Alquiler   ✅ Al día                  ┃  │
│  ┃ ⚪ Cédula                        ❌ FALTA (OBLIGATORIO) *   ┃  │
│  ┃ 🟢 RTO                           ✅ Al día                  ┃  │
│  ┃ 🟢 Póliza de Seguro              ✅ Al día                  ┃  │
│  ┃ 🟢 Certificado Libre Deuda       ✅ Al día                  ┃  │
│  ┃                                                             ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                   │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 🚛 SEMI: TU012VW                                       [▼] ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                             ┃  │
│  ┃ 🟢 Título / Contrato Alquiler   ✅ Al día                  ┃  │
│  ┃ 🟢 Cédula                        ✅ Al día                  ┃  │
│  ┃ 🟢 RTO                           ✅ Al día                  ┃  │
│  ┃ 🟢 Póliza de Seguro              ✅ Al día                  ┃  │
│  ┃ 🟢 Certificado Libre Deuda       ✅ Al día                  ┃  │
│  ┃                                                             ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ❌ ERROR: No se puede guardar el equipo                 │   │
│  │                                                          │   │
│  │ Faltan los siguientes documentos obligatorios:          │   │
│  │  • Constancia Ingresos Brutos (Empresa)                 │   │
│  │  • Recibos de Sueldo (Empresa)                          │   │
│  │  • DNI (Chofer)                                         │   │
│  │  • Licencia de Conducir (Chofer)                        │   │
│  │  • Alta ARCA (Chofer)                                   │   │
│  │  • Póliza ART (Chofer)                                  │   │
│  │  • Seguro de Vida (Chofer)                              │   │
│  │  • Cédula (Tractor)                                     │   │
│  │                                                          │   │
│  │ Por favor, cargue todos los documentos marcados con     │   │
│  │ (*) para poder guardar el equipo.                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│                     [Cancelar]  [Guardar] (deshabilitado)        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Validación en Backend

```typescript
// apps/documentos/src/services/equipo-validation.service.ts

export class EquipoValidationService {
  
  async validateEquipoCompleto(equipoId: number): Promise<ValidationResult> {
    const equipo = await prisma.equipo.findUnique({
      where: { id: equipoId },
      include: {
        empresaTransportista: {
          include: { documentos: true },
        },
        chofer: {
          include: { documentos: true },
        },
        camion: {
          include: { documentos: true },
        },
        acoplado: {
          include: { documentos: true },
        },
      },
    });
    
    if (!equipo) {
      throw new Error('Equipo no encontrado');
    }
    
    const errors: string[] = [];
    
    // Validar documentos de empresa
    const docsEmpresaFaltantes = this.validarDocumentosObligatorios(
      equipo.empresaTransportista.documentos,
      DOCUMENTOS_OBLIGATORIOS.empresaTransportista,
      'Empresa Transportista'
    );
    errors.push(...docsEmpresaFaltantes);
    
    // Validar documentos de chofer
    const docsChoferFaltantes = this.validarDocumentosObligatorios(
      equipo.chofer.documentos,
      DOCUMENTOS_OBLIGATORIOS.chofer,
      'Chofer'
    );
    errors.push(...docsChoferFaltantes);
    
    // Validar documentos de camión
    const docsCamionFaltantes = this.validarDocumentosObligatorios(
      equipo.camion.documentos,
      DOCUMENTOS_OBLIGATORIOS.camion,
      'Camión'
    );
    errors.push(...docsCamionFaltantes);
    
    // Validar documentos de acoplado
    const docsAcopladoFaltantes = this.validarDocumentosObligatorios(
      equipo.acoplado.documentos,
      DOCUMENTOS_OBLIGATORIOS.acoplado,
      'Acoplado'
    );
    errors.push(...docsAcopladoFaltantes);
    
    return {
      valid: errors.length === 0,
      errors: errors,
      documentosFaltantes: errors.length,
    };
  }
  
  private validarDocumentosObligatorios(
    documentosCargados: Document[],
    documentosRequeridos: string[],
    entidad: string
  ): string[] {
    const errors: string[] = [];
    
    const tiposCargados = documentosCargados.map(d => d.tipoDocumento);
    
    for (const tipoRequerido of documentosRequeridos) {
      if (!tiposCargados.includes(tipoRequerido)) {
        const nombreDocumento = this.getNombreAmigable(tipoRequerido);
        errors.push(`${nombreDocumento} (${entidad})`);
      }
    }
    
    return errors;
  }
  
  private getNombreAmigable(tipoDocumento: string): string {
    const nombres: Record<string, string> = {
      'CONSTANCIA_ARCA': 'Constancia de Inscripción en ARCA',
      'CONSTANCIA_INGRESOS_BRUTOS': 'Constancia de Ingresos Brutos',
      'FORMULARIO_931': 'Formulario 931',
      'RECIBOS_SUELDO': 'Recibos de Sueldo',
      'BOLETA_SINDICAL': 'Boleta Sindical',
      'DNI': 'DNI',
      'LICENCIA_CONDUCIR': 'Licencia de Conducir',
      'ALTA_ARCA': 'Alta Temprana en ARCA',
      'POLIZA_ART': 'Póliza de ART',
      'SEGURO_VIDA': 'Seguro de Vida Obligatorio',
      'TITULO_O_CONTRATO': 'Título o Contrato de Alquiler',
      'CEDULA': 'Cédula',
      'RTO': 'Revisión Técnica Obligatoria (RTO)',
      'POLIZA_SEGURO': 'Póliza de Seguro',
      'CERTIFICADO_LIBRE_DEUDA': 'Certificado de Libre Deuda',
    };
    
    return nombres[tipoDocumento] || tipoDocumento;
  }
}
```

### Endpoint de Validación

```typescript
// apps/documentos/src/routes/equipos.routes.ts

// Validar si un equipo está completo antes de guardar
POST   /api/docs/equipos/:id/validar-completo    // Validar documentos obligatorios

// Controller
export class EquiposController {
  async validarEquipoCompleto(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    
    const validation = await equipoValidationService.validateEquipoCompleto(equipoId);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'El equipo no está completo',
        errors: validation.errors,
        documentosFaltantes: validation.documentosFaltantes,
      });
    }
    
    return res.json({
      success: true,
      message: 'El equipo está completo y puede ser guardado',
    });
  }
}
```

### Validación en Frontend (React)

```typescript
// apps/frontend/src/features/equipos/hooks/useEquipoValidation.ts

export const useEquipoValidation = (equipoId: number) => {
  const [isValid, setIsValid] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const validate = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/api/docs/equipos/${equipoId}/validar-completo`);
      
      if (response.data.success) {
        setIsValid(true);
        setErrors([]);
      } else {
        setIsValid(false);
        setErrors(response.data.errors || []);
      }
    } catch (error: any) {
      setIsValid(false);
      setErrors(error.response?.data?.errors || ['Error al validar el equipo']);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    validate();
  }, [equipoId]);
  
  return {
    isValid,
    errors,
    loading,
    validate,  // Para re-validar después de cargar un documento
  };
};

// Uso en el componente
export const GestionEquiposPage = () => {
  const { equipoId } = useParams();
  const { isValid, errors, validate } = useEquipoValidation(equipoId);
  
  const handleGuardar = async () => {
    if (!isValid) {
      toast.error('El equipo no está completo. Por favor, cargue todos los documentos obligatorios.');
      return;
    }
    
    // Proceder con el guardado
    await api.put(`/api/docs/equipos/${equipoId}`, data);
    toast.success('Equipo guardado exitosamente');
  };
  
  return (
    <div>
      {/* ... formulario ... */}
      
      {errors.length > 0 && (
        <Alert severity="error">
          <AlertTitle>No se puede guardar el equipo</AlertTitle>
          <p>Faltan los siguientes documentos obligatorios:</p>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}
      
      <Button
        onClick={handleGuardar}
        disabled={!isValid}  // ← Deshabilitar si no es válido
        variant="contained"
      >
        Guardar
      </Button>
    </div>
  );
};
```

### Mensajes de Error Claros

```typescript
// Mensajes específicos según contexto

const ERROR_MESSAGES = {
  equipoIncompleto: (cantidadFaltante: number) =>
    `Faltan ${cantidadFaltante} documentos obligatorios. Complete la carga para poder guardar.`,
  
  documentoEmpresaFaltante: (nombre: string) =>
    `Falta el documento "${nombre}" de la Empresa Transportista (obligatorio)`,
  
  documentoChoferFaltante: (nombre: string) =>
    `Falta el documento "${nombre}" del Chofer (obligatorio)`,
  
  documentoCamionFaltante: (nombre: string) =>
    `Falta el documento "${nombre}" del Camión (obligatorio)`,
  
  documentoAcopladoFaltante: (nombre: string) =>
    `Falta el documento "${nombre}" del Acoplado (obligatorio)`,
};
```

### Sección 1: Datos de la Empresa (Accordion Expandible)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🏢 DATOS DE LA EMPRESA TRANSPORTISTA           [▼]     ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                         ┃
┃  Empresa de Transporte *                                ┃
┃  ┌────────────────────────────────────────────┐        ┃
┃  │ [Pre-cargado del perfil]                   │        ┃
┃  └────────────────────────────────────────────┘        ┃
┃                                                         ┃
┃  CUIT *                                                 ┃
┃  ┌────────────────────────────────────────────┐        ┃
┃  │ [Pre-cargado del perfil]                   │        ┃
┃  └────────────────────────────────────────────┘        ┃
┃                                                         ┃
┃  ┌──────────────────────────────────────────────────┐  ┃
┃  │ 📄 Constancia de Inscripción en ARCA *          │  ┃
┃  │                                                  │  ┃
┃  │ [📎 Subir archivo] o [Arrastrar aquí]          │  ┃
┃  │                                                  │  ┃
┃  │ ✅ arca_constancia.pdf (1.2 MB)                │  ┃
┃  │    Subido: 05/11/2025 - Estado: Aprobado       │  ┃
┃  │    [👁️ Ver] [🔄 Reemplazar] [🗑️ Eliminar]      │  ┃
┃  └──────────────────────────────────────────────────┘  ┃
┃                                                         ┃
┃  ┌──────────────────────────────────────────────────┐  ┃
┃  │ 📄 Constancia Ingresos Brutos *                 │  ┃
┃  │ [📎 Subir archivo]                              │  ┃
┃  │ ⚠️  Pendiente                                    │  ┃
┃  └──────────────────────────────────────────────────┘  ┃
┃                                                         ┃
┃  ┌──────────────────────────────────────────────────┐  ┃
┃  │ 📄 Formulario 931 / Acuse y Constancia *        │  ┃
┃  │ [📎 Subir archivo]                              │  ┃
┃  └──────────────────────────────────────────────────┘  ┃
┃                                                         ┃
┃  ┌──────────────────────────────────────────────────┐  ┃
┃  │ 📄 Recibos de Sueldo *                          │  ┃
┃  │ [📎 Subir archivo]                              │  ┃
┃  └──────────────────────────────────────────────────┘  ┃
┃                                                         ┃
┃  ┌──────────────────────────────────────────────────┐  ┃
┃  │ 📄 Boleta Sindical *                            │  ┃
┃  │ [📎 Subir archivo]                              │  ┃
┃  └──────────────────────────────────────────────────┘  ┃
┃                                                         ┃
┃  [💾 Guardar Sección]                                   ┃
┃                                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Sección 2: Choferes (Multi-registro)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 👤 CHOFERES                                     [▼]     ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                         ┃
┃  ┌────────────────────────────────────────────────┐    ┃
┃  │ Chofer #1: JUAN PEREZ [✅ Completo]            │    ┃
┃  │ DNI: 12345678                         [✏️] [🗑️] │    ┃
┃  └────────────────────────────────────────────────┘    ┃
┃                                                         ┃
┃  ┌────────────────────────────────────────────────┐    ┃
┃  │ Chofer #2: MARIA GOMEZ [⚠️ Falta 1 doc]        │    ┃
┃  │ DNI: 87654321                         [✏️] [🗑️] │    ┃
┃  └────────────────────────────────────────────────┘    ┃
┃                                                         ┃
┃  [+ Agregar Nuevo Chofer]                               ┃
┃                                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

#### Modal de Edición de Chofer

```
┌─────────────────────────────────────────────────┐
│ Editar Chofer                            [❌]   │
├─────────────────────────────────────────────────┤
│                                                  │
│ Nombre Completo *                                │
│ ┌──────────────────────────────────────────────┐│
│ │ Juan Perez                                   ││
│ └──────────────────────────────────────────────┘│
│                                                  │
│ DNI *                                            │
│ ┌──────────────────────────────────────────────┐│
│ │ 12345678                                     ││
│ └──────────────────────────────────────────────┘│
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ 📄 Alta Temprana ARCA / Constancia *       │  │
│ │ ✅ alta_arca.pdf (856 KB)                  │  │
│ │ [Ver] [Reemplazar]                         │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ 📄 DNI (frente y dorso) *                  │  │
│ │ ✅ dni_frente_dorso.pdf (1.1 MB)           │  │
│ │ Vencimiento: 01/01/2030                    │  │
│ │ [Ver] [Reemplazar]                         │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ 📄 Licencia de Conducir (frente y dorso) * │  │
│ │ ✅ licencia.pdf (980 KB)                   │  │
│ │ Vencimiento: 15/06/2026                    │  │
│ │ [Ver] [Reemplazar]                         │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ 📄 Póliza A.R.T. con cláusula NO REP. *    │  │
│ │ ⚠️  Pendiente                               │  │
│ │ [Subir archivo]                            │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ 📄 Póliza Seguro de Vida Obligatorio *     │  │
│ │ ✅ seguro_vida.pdf (745 KB)                │  │
│ │ Vencimiento: 30/12/2025                    │  │
│ │ [Ver] [Reemplazar]                         │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│         [Cancelar]  [Guardar Cambios]            │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Sección 3: Unidades (Tractor + Semi)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🚛 UNIDADES (TRACTOR + SEMI)                    [▼]     ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                         ┃
┃  ┌────────────────────────────────────────────────┐    ┃
┃  │ Equipo #1                                      │    ┃
┃  │ Tractor: AB123CD  + Semi: XY789ZW              │    ┃
┃  │ Estado: ✅ Completo                    [✏️] [🗑️] │    ┃
┃  └────────────────────────────────────────────────┘    ┃
┃                                                         ┃
┃  ┌────────────────────────────────────────────────┐    ┃
┃  │ Equipo #2                                      │    ┃
┃  │ Tractor: EF456GH  + Semi: PQ234RS              │    ┃
┃  │ Estado: ⚠️ Falta RTO del Semi         [✏️] [🗑️] │    ┃
┃  └────────────────────────────────────────────────┘    ┃
┃                                                         ┃
┃  [+ Agregar Nueva Unidad]                               ┃
┃                                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

#### Modal de Edición de Unidad (Tabs: Tractor / Semi)

```
┌──────────────────────────────────────────────────────┐
│ Editar Unidad - Equipo #1                     [❌]   │
├──────────────────────────────────────────────────────┤
│                                                       │
│  [🚜 TRACTOR]  [🚛 SEMI]                              │
│  ───────────  ─────────                               │
│                                                       │
│  Patente *                                            │
│  ┌────────────────────────────────────────────────┐  │
│  │ AB123CD                                        │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ 📄 Título / Contrato de Alquiler Certificado * │  │
│  │ ✅ titulo_tractor.pdf (1.5 MB)                 │  │
│  │ [Ver] [Reemplazar]                             │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ 📄 Cédula *                                    │  │
│  │ ✅ cedula_tractor.pdf (890 KB)                 │  │
│  │ [Ver] [Reemplazar]                             │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ 📄 RTO - Revisión Técnica Obligatoria *       │  │
│  │ ✅ rto_tractor.pdf (720 KB)                    │  │
│  │ Vencimiento: 20/08/2026                        │  │
│  │ [Ver] [Reemplazar]                             │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ 📄 Póliza de Seguro con cláusula NO REP. *     │  │
│  │ ✅ poliza_tractor.pdf (1.2 MB)                 │  │
│  │ [Ver] [Reemplazar]                             │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ 📄 Certificado libre deuda + Comprobante *     │  │
│  │ ✅ seguro_pago_tractor.pdf (650 KB)            │  │
│  │ [Ver] [Reemplazar]                             │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│           [Cancelar]  [Guardar Cambios]               │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## 🔧 Funcionalidades Clave

### 1. **Gestión de Estado de Carga**

```typescript
type EstadoCarga = 'completo' | 'incompleto' | 'pendiente_aprobacion';

interface SeccionEstado {
  seccion: 'empresa' | 'chofer' | 'unidad';
  completitud: number; // 0-100
  documentosPendientes: string[];
  documentosAprobados: string[];
  documentosRechazados: string[];
}
```

### 2. **Validaciones en Tiempo Real**

- ✅ Validación de formato de CUIT
- ✅ Validación de formato de patentes (normalización)
- ✅ Validación de DNI (longitud, formato)
- ✅ Validación de archivos (tamaño máx: 10 MB, formatos: PDF, JPG, PNG)
- ✅ Validación de fechas de vencimiento (alertas si vence en < 30 días)
- ⚠️ Advertencias de campos obligatorios faltantes

### 3. **Indicadores Visuales**

```typescript
// Estados de documentos
✅ Aprobado (verde)
⏳ En revisión (amarillo)
❌ Rechazado (rojo)
⚠️ Por vencer (naranja - < 30 días)
🔴 Vencido (rojo)
⬜ Pendiente de carga (gris)
```

### 4. **Notificaciones**

- 📧 Email al completar carga inicial
- 📧 Email cuando un documento es aprobado/rechazado
- 📧 Alertas de vencimientos próximos (30, 15, 7 días antes)
- 🔔 Notificaciones en la plataforma

### 5. **Historial de Cambios**

```
┌─────────────────────────────────────────────────┐
│ Historial de Cambios - DNI Juan Perez           │
├─────────────────────────────────────────────────┤
│ 05/11/2025 10:30 - Subido por admin_externo     │
│ 05/11/2025 14:45 - Aprobado por admin_interno   │
│ 06/11/2025 09:15 - Reemplazado por admin_ext... │
│ 06/11/2025 16:20 - En revisión                  │
└─────────────────────────────────────────────────┘
```

### 6. **Vista Previa de Documentos**

Todos los roles pueden ver una vista previa de los documentos cargados para verificar que los datos ingresados coincidan con el archivo.

#### Componente de Vista Previa

```
┌──────────────────────────────────────────────────────────────┐
│ Vista Previa: DNI Juan Pérez                          [❌]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌───────────────────────┬───────────────────────────────┐   │
│ │ DATOS INGRESADOS      │ DOCUMENTO CARGADO             │   │
│ ├───────────────────────┼───────────────────────────────┤   │
│ │                       │                               │   │
│ │ Tipo: DNI             │  ┌─────────────────────────┐ │   │
│ │ Número: 12.345.678    │  │                         │ │   │
│ │ Nombre: Juan Pérez    │  │   [Imagen del DNI]      │ │   │
│ │ Fecha Nac: 15/03/1985 │  │                         │ │   │
│ │ Vencimiento:          │  │   Frente y Dorso        │ │   │
│ │   01/01/2030          │  │                         │ │   │
│ │                       │  └─────────────────────────┘ │   │
│ │                       │                               │   │
│ │                       │  [🔍 Zoom +] [🔍 Zoom -]      │   │
│ │                       │  [⬇️ Descargar] [🖨️ Imprimir] │   │
│ │                       │                               │   │
│ │                       │  Páginas: [◀️] 1 / 2 [▶️]      │   │
│ │                       │                               │   │
│ └───────────────────────┴───────────────────────────────┘   │
│                                                               │
│ Estado: ✅ Aprobado                                          │
│ Subido: 05/11/2025 10:30 por Transportes Pérez              │
│ Aprobado: 05/11/2025 14:45 por Admin Interno                │
│                                                               │
│ [Solo ADMIN_INTERNO puede ver:]                              │
│ Clasificación IA:                                            │
│ - Tipo documento: DNI ✅ (Confianza: 98%)                    │
│ - DNI detectado: 12345678 ✅                                 │
│ - Nombre detectado: Juan Pérez ✅                            │
│ - Vencimiento detectado: 01/01/2030 ✅                       │
│                                                               │
│          [Cerrar]  [Rechazar]  [Aprobar]                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### Matriz de Permisos para Vista Previa

| Acción | ADMIN_INTERNO | DADOR_DE_CARGA | TRANSPORTISTA | CHOFER | CLIENTE |
|--------|---------------|----------------|---------------|---------|---------|
| **Ver documentos de empresa propios** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Ver documentos de chofer propio** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Ver documentos de camión propio** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Ver documentos de acoplado propio** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Ver documentos de equipos asignados** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Ver clasificación IA** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Descargar documento** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Imprimir documento** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Aprobar/Rechazar desde vista previa** | ✅ | ❌ | ❌ | ❌ | ❌ |

#### Tipos de Archivo Soportados

```typescript
type SupportedFileTypes = {
  'application/pdf': {
    extensions: ['.pdf'],
    preview: 'pdf-viewer',  // Renderizar con PDF.js
    maxSize: 10 * 1024 * 1024, // 10 MB
  },
  'image/jpeg': {
    extensions: ['.jpg', '.jpeg'],
    preview: 'image-viewer',
    maxSize: 5 * 1024 * 1024, // 5 MB
  },
  'image/png': {
    extensions: ['.png'],
    preview: 'image-viewer',
    maxSize: 5 * 1024 * 1024, // 5 MB
  },
  'image/webp': {
    extensions: ['.webp'],
    preview: 'image-viewer',
    maxSize: 5 * 1024 * 1024, // 5 MB
  },
};
```

#### Funcionalidades del Visor

1. **Navegación**
   - Anterior/Siguiente página (para PDFs multipágina)
   - Scroll vertical/horizontal
   - Thumbnails de páginas (sidebar opcional)

2. **Zoom**
   - Zoom in/out con botones
   - Zoom con rueda del mouse
   - Ajustar a ancho
   - Ajustar a alto
   - Tamaño original (100%)
   - Niveles: 50%, 75%, 100%, 125%, 150%, 200%

3. **Acciones**
   - Descargar original
   - Imprimir (abre diálogo del navegador)
   - Rotar (para imágenes mal orientadas)
   - Pantalla completa

4. **Comparación Lado a Lado**
   - Panel izquierdo: Datos ingresados (siempre visible)
   - Panel derecho: Documento (con scroll independiente)
   - Resaltado de campos que coinciden/no coinciden (solo ADMIN)

5. **Validación Visual**
   - ✅ Verde: Campo coincide con documento
   - ⚠️ Amarillo: No se pudo verificar automáticamente
   - ❌ Rojo: Campo NO coincide con documento
   - ⬜ Gris: Campo no verificable

#### Vista Previa en Listado (Thumbnail)

```
┌────────────────────────────────────────────────────┐
│ Documentos del Chofer: Juan Pérez                  │
├────────────────────────────────────────────────────┤
│                                                     │
│ ┌─────────────┬─────────────┬─────────────────┐   │
│ │ [Thumbnail] │ [Thumbnail] │ [Thumbnail]     │   │
│ │    DNI      │  Licencia   │ Alta ARCA       │   │
│ │ ✅ Aprobado │ ⚠️ Pendiente │ ✅ Aprobado     │   │
│ │ Vence:      │ Vence:      │ -               │   │
│ │ 01/01/2030  │ 15/06/2026  │                 │   │
│ │ [👁️ Ver]    │ [👁️ Ver]    │ [👁️ Ver]        │   │
│ └─────────────┴─────────────┴─────────────────┘   │
│                                                     │
│ ┌─────────────┬─────────────┬─────────────────┐   │
│ │ [Thumbnail] │ [Thumbnail] │                 │   │
│ │  Póliza ART │ Seguro Vida │                 │   │
│ │ ✅ Aprobado │ 🔴 Vencido  │                 │   │
│ │ Vence:      │ Venció:     │                 │   │
│ │ 30/12/2025  │ 01/11/2025  │                 │   │
│ │ [👁️ Ver]    │ [👁️ Ver]    │                 │   │
│ └─────────────┴─────────────┴─────────────────┘   │
│                                                     │
└────────────────────────────────────────────────────┘
```

#### Vista Previa Rápida (Quick Preview)

Al pasar el mouse sobre el nombre del documento o thumbnail:

```
┌────────────────────────────────┐
│ Vista Rápida                   │
├────────────────────────────────┤
│ [Mini preview del documento]   │
│                                │
│ DNI: 12.345.678                │
│ Estado: ✅ Aprobado            │
│ Tamaño: 1.2 MB                 │
│ Fecha: 05/11/2025              │
│                                │
│ [Clic para ver completo]       │
└────────────────────────────────┘
```

---

## 🏗️ Arquitectura Técnica

### Frontend: Componentes React

```
apps/frontend/src/features/equipos/
├── pages/
│   ├── GestionEquiposPage.tsx            // Página principal carga
│   └── MiEquipoPage.tsx                  // Página para CHOFER
├── components/
│   ├── SeccionEmpresa.tsx                // Acordeón datos empresa
│   ├── SeccionChoferes.tsx               // Lista de choferes
│   ├── SeccionUnidades.tsx               // Lista de unidades
│   ├── ModalChofer.tsx                   // Modal edición chofer
│   ├── ModalUnidad.tsx                   // Modal edición unidad
│   ├── DocumentUploader.tsx              // Componente subida archivo
│   ├── DocumentCard.tsx                  // Card estado documento
│   ├── ProgressIndicator.tsx             // Barra progreso
│   ├── DatePicker.tsx                    // Selector de fechas
│   ├── DocumentPreview/                  // ← NUEVO: Vista previa docs
│   │   ├── DocumentPreviewModal.tsx      // Modal principal vista previa
│   │   ├── PDFViewer.tsx                 // Visor PDF (usa PDF.js)
│   │   ├── ImageViewer.tsx               // Visor imágenes
│   │   ├── ComparisonPanel.tsx           // Panel comparación datos/archivo
│   │   ├── DocumentThumbnail.tsx         // Thumbnail de documento
│   │   ├── QuickPreview.tsx              // Popover vista rápida
│   │   ├── ZoomControls.tsx              // Controles de zoom
│   │   ├── PageNavigator.tsx             // Navegación entre páginas
│   │   └── DocumentActions.tsx           // Acciones (descargar, imprimir, etc)
│   └── DocumentList.tsx                  // Lista docs con thumbnails
├── hooks/
│   ├── useCargaEmpresa.ts               // Hook datos empresa
│   ├── useCargaChoferes.ts              // Hook choferes
│   ├── useCargaUnidades.ts              // Hook unidades
│   ├── useDocumentUpload.ts             // Hook subida docs
│   ├── useDocumentPreview.ts            // ← NUEVO: Hook vista previa
│   ├── usePDFViewer.ts                  // ← NUEVO: Hook visor PDF
│   └── useImageViewer.ts                // ← NUEVO: Hook visor imágenes
└── types/
    ├── equipos.types.ts                 // Types equipos
    └── document-preview.types.ts        // ← NUEVO: Types vista previa
```

### Backend: Endpoints Nuevos

```typescript
// apps/documentos/src/routes/equipos.routes.ts

// DADORES (solo ADMIN_INTERNO)
GET    /api/docs/equipos/dadores                 // Listar todos los dadores

// CLIENTES (para selector)
GET    /api/docs/equipos/clientes                // Listar clientes disponibles

// EMPRESA TRANSPORTISTA
GET    /api/docs/equipos/empresas                // Listar empresas (filtradas por rol)
POST   /api/docs/equipos/empresas                // Crear empresa transportista
PUT    /api/docs/equipos/empresas/:id            // Actualizar empresa
GET    /api/docs/equipos/empresas/:id            // Obtener empresa por ID
POST   /api/docs/equipos/empresas/:id/documentos // Subir doc empresa
DELETE /api/docs/equipos/empresas/:id/documentos/:docId // Eliminar doc

// CHOFERES
GET    /api/docs/equipos/choferes                // Listar choferes (filtrados por rol)
POST   /api/docs/equipos/choferes                // Crear chofer
PUT    /api/docs/equipos/choferes/:id            // Actualizar chofer (también CHOFER)
GET    /api/docs/equipos/choferes/:id            // Obtener chofer por ID
DELETE /api/docs/equipos/choferes/:id            // Eliminar chofer
POST   /api/docs/equipos/choferes/:id/documentos // Subir doc chofer (también CHOFER)
DELETE /api/docs/equipos/choferes/:id/documentos/:docId // Eliminar doc

// CAMIONES
GET    /api/docs/equipos/camiones                // Listar camiones (filtrados por rol)
POST   /api/docs/equipos/camiones                // Crear camión
PUT    /api/docs/equipos/camiones/:id            // Actualizar camión (también CHOFER de ese equipo)
GET    /api/docs/equipos/camiones/:id            // Obtener camión por ID
DELETE /api/docs/equipos/camiones/:id            // Eliminar camión
POST   /api/docs/equipos/camiones/:id/documentos // Subir doc camión (también CHOFER)
DELETE /api/docs/equipos/camiones/:id/documentos/:docId // Eliminar doc

// ACOPLADOS
GET    /api/docs/equipos/acoplados               // Listar acoplados (filtrados por rol)
POST   /api/docs/equipos/acoplados               // Crear acoplado
PUT    /api/docs/equipos/acoplados/:id           // Actualizar acoplado (también CHOFER de ese equipo)
GET    /api/docs/equipos/acoplados/:id           // Obtener acoplado por ID
DELETE /api/docs/equipos/acoplados/:id           // Eliminar acoplado
POST   /api/docs/equipos/acoplados/:id/documentos // Subir doc acoplado (también CHOFER)
DELETE /api/docs/equipos/acoplados/:id/documentos/:docId // Eliminar doc

// EQUIPOS
GET    /api/docs/equipos                         // Listar equipos (filtrados por rol)
POST   /api/docs/equipos                         // Crear equipo completo
PUT    /api/docs/equipos/:id                     // Actualizar equipo
GET    /api/docs/equipos/:id                     // Obtener equipo por ID
DELETE /api/docs/equipos/:id                     // Eliminar equipo
POST   /api/docs/equipos/:id/clientes            // Asignar/actualizar clientes del equipo
GET    /api/docs/equipos/:id/clientes            // Obtener clientes del equipo

// CHOFER (endpoints específicos para su equipo)
GET    /api/docs/equipos/mi-equipo               // Obtener equipo del chofer autenticado
PUT    /api/docs/equipos/mi-equipo/mis-datos     // Actualizar sus propios datos
PUT    /api/docs/equipos/mi-equipo/camion        // Actualizar datos del camión
PUT    /api/docs/equipos/mi-equipo/acoplado      // Actualizar datos del acoplado

// RESUMEN Y ESTADO
GET    /api/docs/equipos/resumen                 // Estado general de carga
GET    /api/docs/equipos/:id/completitud         // Completitud de un equipo específico
GET    /api/docs/equipos/documentos/:docId/historial // Historial de un documento

// VISTA PREVIA DE DOCUMENTOS
GET    /api/docs/equipos/documentos/:docId/preview // Obtener URL firmada para preview
GET    /api/docs/equipos/documentos/:docId/thumbnail // Obtener thumbnail del documento
GET    /api/docs/equipos/documentos/:docId/metadata // Obtener metadata completa
GET    /api/docs/equipos/documentos/:docId/download // Descargar documento original
GET    /api/docs/equipos/documentos/:docId/pages/:pageNum // Obtener página específica (PDF)
POST   /api/docs/equipos/documentos/:docId/rotate  // Rotar imagen (guarda nueva versión)

// APROBACIÓN Y RECHAZO DE DOCUMENTOS
GET    /api/docs/equipos/:id/documentos-pendientes // Listar docs pendientes de aprobación
POST   /api/docs/equipos/documentos/:docId/aprobar // Aprobar un documento
POST   /api/docs/equipos/documentos/:docId/rechazar // Rechazar un documento
POST   /api/docs/equipos/:id/aprobar-todos        // Aprobar todos los docs pendientes
GET    /api/docs/equipos/documentos/:docId/historial-aprobacion // Historial de aprobaciones
GET    /api/docs/equipos/listado-con-pendientes   // Listado de equipos con indicadores azules
```

### Middleware de Autorización

```typescript
// apps/documentos/src/middlewares/equipos-auth.middleware.ts

export const resolveUserScope = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  
  switch (user.role) {
    case UserRole.ADMIN:
    case UserRole.SUPERADMIN:
    case UserRole.ADMIN_INTERNO:
      // Acceso total, sin filtros
      req.userScope = { type: 'ADMIN', filter: {} };
      break;
      
    case UserRole.DADOR_DE_CARGA:
      const dadorId = user.metadata?.dadorCargaId;
      if (!dadorId) {
        return res.status(400).json({ message: 'Usuario sin dador asignado' });
      }
      req.userScope = { 
        type: 'DADOR', 
        dadorCargaId: dadorId,
        filter: { dadorCargaId: dadorId } 
      };
      break;
      
    case UserRole.TRANSPORTISTA:
      const empresaId = user.metadata?.empresaTransportistaId;
      if (!empresaId) {
        return res.status(400).json({ message: 'Usuario sin empresa asignada' });
      }
      req.userScope = { 
        type: 'TRANSPORTISTA', 
        empresaTransportistaId: empresaId,
        filter: { empresaTransportistaId: empresaId } 
      };
      break;
      
    case UserRole.CHOFER:
      const choferId = user.metadata?.choferId;
      const equipoId = user.metadata?.equipoId;
      if (!choferId || !equipoId) {
        return res.status(400).json({ message: 'Chofer sin equipo asignado' });
      }
      req.userScope = { 
        type: 'CHOFER', 
        choferId: choferId,
        equipoId: equipoId,
        filter: { id: equipoId } 
      };
      break;
      
    case UserRole.CLIENTE:
      const clienteId = user.metadata?.clienteId;
      if (!clienteId) {
        return res.status(400).json({ message: 'Usuario sin cliente asignado' });
      }
      req.userScope = { 
        type: 'CLIENTE', 
        clienteId: clienteId,
        filter: { 
          clientes: { 
            some: { clienteId: clienteId, activo: true } 
          } 
        } 
      };
      break;
      
    default:
      return res.status(403).json({ message: 'Rol no autorizado' });
  }
  
  next();
};

// Middleware para verificar que el usuario puede acceder a un recurso específico
export const canAccessResource = (resourceType: 'empresa' | 'chofer' | 'camion' | 'acoplado' | 'equipo') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { userScope } = req;
    const resourceId = Number(req.params.id);
    
    // Admin siempre puede
    if (userScope.type === 'ADMIN') {
      return next();
    }
    
    // Verificar ownership según tipo de recurso
    const resource = await prisma[resourceType].findUnique({
      where: { id: resourceId },
      include: resourceType === 'equipo' ? { clientes: true } : undefined,
    });
    
    if (!resource) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }
    
    // Verificar permisos según rol
    switch (userScope.type) {
      case 'DADOR':
        if (resource.dadorCargaId !== userScope.dadorCargaId) {
          return res.status(403).json({ message: 'No tienes acceso a este recurso' });
        }
        break;
        
      case 'TRANSPORTISTA':
        if (resource.empresaTransportistaId !== userScope.empresaTransportistaId) {
          return res.status(403).json({ message: 'No tienes acceso a este recurso' });
        }
        break;
        
      case 'CHOFER':
        if (resourceType === 'chofer' && resource.id !== userScope.choferId) {
          return res.status(403).json({ message: 'Solo puedes editar tus propios datos' });
        }
        if (resourceType === 'equipo' && resource.id !== userScope.equipoId) {
          return res.status(403).json({ message: 'Solo puedes editar tu equipo' });
        }
        if (['camion', 'acoplado'].includes(resourceType)) {
          // Verificar que el camión/acoplado pertenece a su equipo
          const equipo = await prisma.equipo.findUnique({
            where: { id: userScope.equipoId },
          });
          if (!equipo || 
              (resourceType === 'camion' && equipo.camionId !== resourceId) ||
              (resourceType === 'acoplado' && equipo.acoplado !== resourceId)) {
            return res.status(403).json({ message: 'Este recurso no pertenece a tu equipo' });
          }
        }
        break;
        
      case 'CLIENTE':
        if (resourceType === 'equipo') {
          const hasAccess = resource.clientes?.some(
            (ec: any) => ec.clienteId === userScope.clienteId && ec.activo
          );
          if (!hasAccess) {
            return res.status(403).json({ message: 'Este equipo no está asignado a tu empresa' });
          }
        } else {
          return res.status(403).json({ message: 'Los clientes solo pueden ver equipos' });
        }
        break;
    }
    
    next();
  };
};
```

### Modelo de Datos

```prisma
// apps/documentos/src/prisma/schema.prisma

// Actualizar User
model User {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  role        UserRole
  metadata    Json?    // Ver estructura según rol abajo
  // ... otros campos
}

enum UserRole {
  SUPERADMIN
  ADMIN
  ADMIN_INTERNO      // metadata: null
  DADOR_DE_CARGA     // metadata: { dadorCargaId: number }
  TRANSPORTISTA      // metadata: { empresaTransportistaId: number }
  CHOFER             // metadata: { choferId: number, equipoId: number }
  OPERADOR_INTERNO   // metadata: null
  CLIENTE            // metadata: { clienteId: number }
  USER
}

// Estructura metadata según rol:
// DADOR_DE_CARGA: { dadorCargaId: 1 }
// TRANSPORTISTA: { empresaTransportistaId: 5 }
// CHOFER: { choferId: 10, equipoId: 3 }
// CLIENTE: { clienteId: 2 }

// Tabla para relación Equipo-Cliente (muchos a muchos)
model EquipoCliente {
  id                Int      @id @default(autoincrement())
  equipoId          Int
  clienteId         Int      // FK a DadorCarga (los clientes son dadores en el modelo actual)
  fechaAsignacion   DateTime @default(now())
  activo            Boolean  @default(true)
  
  equipo            Equipo   @relation(fields: [equipoId], references: [id], onDelete: Cascade)
  cliente           DadorCarga @relation(fields: [clienteId], references: [id])
  
  @@unique([equipoId, clienteId])
  @@index([equipoId])
  @@index([clienteId])
}

// Actualizar modelo Equipo para incluir relación con clientes
model Equipo {
  // ... campos existentes
  
  clientes          EquipoCliente[]  // Relación con clientes
}

// Tabla para tracking de estado de carga
model CargaExternaEstado {
  id                      Int      @id @default(autoincrement())
  empresaTransportistaId  Int
  seccion                 String   // 'empresa' | 'chofer' | 'unidad'
  entityId                Int?     // ID del chofer o unidad si aplica
  completitud             Int      // 0-100
  documentosPendientes    Int
  documentosAprobados     Int
  documentosRechazados    Int
  updatedAt               DateTime @updatedAt
  
  @@unique([empresaTransportistaId, seccion, entityId])
  @@index([empresaTransportistaId])
}

// Actualizar modelo Document para incluir estado de aprobación
model Document {
  // ... campos existentes
  
  estadoAprobacion    EstadoAprobacion @default(PENDIENTE_APROBACION)
  aprobadoPorId       Int?
  aprobadoPor         User?            @relation("AprobadoPor", fields: [aprobadoPorId], references: [id])
  fechaAprobacion     DateTime?
  rechazadoPorId      Int?
  rechazadoPor        User?            @relation("RechazadoPor", fields: [rechazadoPorId], references: [id])
  fechaRechazo        DateTime?
  motivoRechazo       String?
  comentarioRechazo   String?
  notificarChofer     Boolean          @default(true)
  
  // Tracking de cambios
  esActualizacion     Boolean          @default(false)
  documentoAnteriorId Int?
  documentoAnterior   Document?        @relation("VersionAnterior", fields: [documentoAnteriorId], references: [id])
  versiones           Document[]       @relation("VersionAnterior")
  
  historial           DocumentHistorial[]
}

enum EstadoAprobacion {
  PENDIENTE_APROBACION  // Recién cargado, esperando revisión del dador
  APROBADO              // Aprobado por el dador, documento válido
  RECHAZADO             // Rechazado por el dador, necesita recarga
  APROBADO_AUTOMATICO   // Aprobado automáticamente (ej: por ADMIN_INTERNO)
}

// Tabla para historial de documentos
model DocumentHistorial {
  id                Int      @id @default(autoincrement())
  documentId        Int
  accion            String   // 'subido' | 'aprobado' | 'rechazado' | 'reemplazado' | 'actualizado'
  userId            Int
  motivoRechazo     String?  // Razón de rechazo
  comentarioRechazo String?  // Comentario adicional del rechazo
  metadata          Json?    // Información adicional
  createdAt         DateTime @default(now())
  
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id])
  
  @@index([documentId])
  @@index([documentId, createdAt])
}
```

---

## 🚀 Plan de Implementación

### Fase 1: Setup y Roles (2-3 días)

**Backend:**
1. ✅ Agregar nuevos roles a enum UserRole
2. ✅ Migración de base de datos
3. ✅ Crear middleware `authorizeExternalAdmin`
4. ✅ Crear modelo `CargaExternaEstado`
5. ✅ Crear modelo `DocumentHistorial`
6. ✅ Script para asignar empresaTransportistaId a usuarios

**Frontend:**
1. ✅ Actualizar types de roles
2. ✅ Actualizar guards de rutas
3. ✅ Crear layout base de CargaExternaPage

**Testing:**
1. ✅ Tests unitarios de middleware
2. ✅ Tests de permisos por rol

---

### Fase 2: Sección Empresa (2-3 días)

**Backend:**
1. ✅ Endpoint GET /empresa
2. ✅ Endpoint POST /empresa/documentos
3. ✅ Endpoint DELETE /empresa/documentos/:id
4. ✅ Validaciones de archivos

**Frontend:**
1. ✅ Componente `SeccionEmpresa`
2. ✅ Componente `DocumentUploader`
3. ✅ Componente `DocumentCard`
4. ✅ Hook `useCargaEmpresa`

**Testing:**
1. ✅ Tests de endpoints
2. ✅ Tests de componentes
3. ✅ Test E2E: cargar documento de empresa

---

### Fase 3: Sección Choferes (3-4 días)

**Backend:**
1. ✅ CRUD completo de choferes
2. ✅ Endpoints de documentos por chofer
3. ✅ Cálculo de completitud
4. ✅ Validaciones de DNI y fechas

**Frontend:**
1. ✅ Componente `SeccionChoferes`
2. ✅ Componente `ModalChofer`
3. ✅ Hook `useCargaChoferes`
4. ✅ Validaciones de formulario

**Testing:**
1. ✅ Tests de CRUD choferes
2. ✅ Tests de carga de documentos
3. ✅ Test E2E: flujo completo chofer

---

### Fase 4: Sección Unidades (3-4 días)

**Backend:**
1. ✅ CRUD completo de unidades (tractor + semi)
2. ✅ Endpoints de documentos por unidad
3. ✅ Normalización de patentes
4. ✅ Creación de equipos automática

**Frontend:**
1. ✅ Componente `SeccionUnidades`
2. ✅ Componente `ModalUnidad` (con tabs)
3. ✅ Hook `useCargaUnidades`
4. ✅ Validación de patentes

**Testing:**
1. ✅ Tests de CRUD unidades
2. ✅ Tests de normalización patentes
3. ✅ Test E2E: flujo completo unidad

---

### Fase 5: Dashboard y Resumen (2 días)

**Backend:**
1. ✅ Endpoint GET /resumen (estado general)
2. ✅ Endpoint GET /historial/:docId
3. ✅ Servicio de cálculo de completitud

**Frontend:**
1. ✅ Componente `ProgressIndicator`
2. ✅ Dashboard de estado general
3. ✅ Modal de historial de cambios

**Testing:**
1. ✅ Tests de cálculos de completitud
2. ✅ Test E2E: flujo completo end-to-end

---

### Fase 6: Notificaciones y Pulido (2 días)

**Backend:**
1. ✅ Integración con servicio de notificaciones
2. ✅ Emails de alertas de vencimiento
3. ✅ Webhook para aprobaciones/rechazos

**Frontend:**
1. ✅ Mejoras UI/UX
2. ✅ Mensajes de éxito/error
3. ✅ Loading states y skeletons
4. ✅ Responsive design

**Testing:**
1. ✅ Tests de integración completos
2. ✅ Testing de carga (performance)
3. ✅ Testing de seguridad

---

## 📊 Estimación Total

| Fase | Duración | Complejidad |
|------|----------|-------------|
| Fase 1: Setup y Roles | 2-3 días | Media |
| Fase 2: Sección Empresa | 2-3 días | Media |
| Fase 3: Sección Choferes | 3-4 días | Alta |
| Fase 4: Sección Unidades | 3-4 días | Alta |
| Fase 5: Dashboard | 2 días | Media |
| Fase 6: Notificaciones | 2 días | Media |
| **TOTAL** | **14-18 días** | |

**Recursos**: 1 desarrollador full-stack

---

## ✅ Implementación Técnica: Workflow de Aprobación

### Servicio de Aprobación de Documentos

```typescript
// apps/documentos/src/services/documento-aprobacion.service.ts

export class DocumentoAprobacionService {
  
  // Aprobar un documento
  async aprobarDocumento(
    documentoId: number, 
    userId: number
  ): Promise<AprobacionResult> {
    const documento = await prisma.document.findUnique({
      where: { id: documentoId },
      include: {
        chofer: true,
        camion: true,
        acoplado: true,
      },
    });
    
    if (!documento) {
      throw new Error('Documento no encontrado');
    }
    
    // Actualizar estado a APROBADO
    const updated = await prisma.document.update({
      where: { id: documentoId },
      data: {
        estadoAprobacion: 'APROBADO',
        aprobadoPorId: userId,
        fechaAprobacion: new Date(),
        motivoRechazo: null,      // Limpiar rechazo anterior si existía
        comentarioRechazo: null,
        rechazadoPorId: null,
        fechaRechazo: null,
      },
    });
    
    // Registrar en historial
    await prisma.documentHistorial.create({
      data: {
        documentId: documentoId,
        userId: userId,
        accion: 'aprobado',
      },
    });
    
    return {
      success: true,
      message: 'Documento aprobado exitosamente',
      documento: updated,
    };
  }
  
  // Rechazar un documento
  async rechazarDocumento(
    documentoId: number,
    userId: number,
    motivo: string,
    comentario?: string,
    notificarChofer: boolean = true
  ): Promise<RechazoResult> {
    const documento = await prisma.document.findUnique({
      where: { id: documentoId },
      include: {
        chofer: {
          include: { user: true }, // Para obtener email/teléfono del chofer
        },
        camion: true,
        acoplado: true,
        empresaTransportista: true,
      },
    });
    
    if (!documento) {
      throw new Error('Documento no encontrado');
    }
    
    // Actualizar estado a RECHAZADO
    const updated = await prisma.document.update({
      where: { id: documentoId },
      data: {
        estadoAprobacion: 'RECHAZADO',
        rechazadoPorId: userId,
        fechaRechazo: new Date(),
        motivoRechazo: motivo,
        comentarioRechazo: comentario,
        notificarChofer: notificarChofer,
      },
    });
    
    // Registrar en historial
    await prisma.documentHistorial.create({
      data: {
        documentId: documentoId,
        userId: userId,
        accion: 'rechazado',
        motivoRechazo: motivo,
        comentarioRechazo: comentario,
      },
    });
    
    // Notificar al chofer si está habilitado
    if (notificarChofer && documento.chofer?.user) {
      await this.notificationService.notificarRechazo({
        chofer: documento.chofer,
        documento: documento,
        motivo: motivo,
        comentario: comentario,
        rechazadoPor: await prisma.user.findUnique({ where: { id: userId } }),
      });
    }
    
    return {
      success: true,
      message: 'Documento rechazado',
      documento: updated,
      notificado: notificarChofer,
    };
  }
  
  // Aprobar todos los documentos pendientes de un equipo
  async aprobarTodosPendientes(
    equipoId: number,
    userId: number
  ): Promise<AprobacionMasivaResult> {
    const equipo = await prisma.equipo.findUnique({
      where: { id: equipoId },
      include: {
        empresaTransportista: { include: { documentos: true } },
        chofer: { include: { documentos: true } },
        camion: { include: { documentos: true } },
        acoplado: { include: { documentos: true } },
      },
    });
    
    if (!equipo) {
      throw new Error('Equipo no encontrado');
    }
    
    // Obtener todos los documentos pendientes
    const todosDocs = [
      ...equipo.empresaTransportista.documentos,
      ...equipo.chofer.documentos,
      ...equipo.camion.documentos,
      ...equipo.acoplado.documentos,
    ];
    
    const pendientes = todosDocs.filter(
      d => d.estadoAprobacion === 'PENDIENTE_APROBACION'
    );
    
    // Aprobar todos
    const resultados = await Promise.all(
      pendientes.map(doc => this.aprobarDocumento(doc.id, userId))
    );
    
    return {
      success: true,
      message: `${pendientes.length} documentos aprobados`,
      cantidadAprobada: pendientes.length,
      documentos: resultados.map(r => r.documento),
    };
  }
  
  // Listar documentos pendientes de un equipo
  async listarDocumentosPendientes(equipoId: number) {
    const equipo = await prisma.equipo.findUnique({
      where: { id: equipoId },
      include: {
        empresaTransportista: {
          include: {
            documentos: {
              where: {
                estadoAprobacion: {
                  in: ['PENDIENTE_APROBACION', 'RECHAZADO'],
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        chofer: {
          include: {
            documentos: {
              where: {
                estadoAprobacion: {
                  in: ['PENDIENTE_APROBACION', 'RECHAZADO'],
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        camion: {
          include: {
            documentos: {
              where: {
                estadoAprobacion: {
                  in: ['PENDIENTE_APROBACION', 'RECHAZADO'],
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        acoplado: {
          include: {
            documentos: {
              where: {
                estadoAprobacion: {
                  in: ['PENDIENTE_APROBACION', 'RECHAZADO'],
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });
    
    if (!equipo) {
      throw new Error('Equipo no encontrado');
    }
    
    return {
      empresa: equipo.empresaTransportista.documentos,
      chofer: equipo.chofer.documentos,
      camion: equipo.camion.documentos,
      acoplado: equipo.acoplado.documentos,
    };
  }
  
  // Obtener historial de aprobaciones/rechazos de un documento
  async obtenerHistorialAprobacion(documentoId: number) {
    return await prisma.documentHistorial.findMany({
      where: {
        documentId: documentoId,
        accion: {
          in: ['aprobado', 'rechazado', 'actualizado'],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nombre: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

### Controller de Aprobación

```typescript
// apps/documentos/src/controllers/aprobacion.controller.ts

export class AprobacionController {
  
  // POST /api/docs/equipos/documentos/:docId/aprobar
  async aprobarDocumento(req: AuthRequest, res: Response) {
    const documentoId = Number(req.params.docId);
    const userId = req.user!.id;
    
    try {
      // Verificar permisos (solo DADOR_DE_CARGA, TRANSPORTISTA, ADMIN_INTERNO)
      await this.verificarPermisoAprobacion(req, documentoId);
      
      const resultado = await documentoAprobacionService.aprobarDocumento(
        documentoId,
        userId
      );
      
      return res.json(resultado);
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  
  // POST /api/docs/equipos/documentos/:docId/rechazar
  async rechazarDocumento(req: AuthRequest, res: Response) {
    const documentoId = Number(req.params.docId);
    const userId = req.user!.id;
    const { motivo, comentario, notificarChofer = true } = req.body;
    
    if (!motivo) {
      return res.status(400).json({
        success: false,
        message: 'El motivo del rechazo es obligatorio',
      });
    }
    
    try {
      // Verificar permisos
      await this.verificarPermisoAprobacion(req, documentoId);
      
      const resultado = await documentoAprobacionService.rechazarDocumento(
        documentoId,
        userId,
        motivo,
        comentario,
        notificarChofer
      );
      
      return res.json(resultado);
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  
  // POST /api/docs/equipos/:id/aprobar-todos
  async aprobarTodosPendientes(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    const userId = req.user!.id;
    
    try {
      // Verificar permisos sobre el equipo
      await this.verificarPermisoSobreEquipo(req, equipoId);
      
      const resultado = await documentoAprobacionService.aprobarTodosPendientes(
        equipoId,
        userId
      );
      
      return res.json(resultado);
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  
  // GET /api/docs/equipos/:id/documentos-pendientes
  async listarDocumentosPendientes(req: AuthRequest, res: Response) {
    const equipoId = Number(req.params.id);
    
    try {
      // Verificar permisos
      await this.verificarPermisoSobreEquipo(req, equipoId);
      
      const documentos = await documentoAprobacionService.listarDocumentosPendientes(
        equipoId
      );
      
      return res.json({
        success: true,
        data: documentos,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  
  // GET /api/docs/equipos/listado-con-pendientes
  async listarEquiposConPendientes(req: AuthRequest, res: Response) {
    const { userScope } = req;
    
    // Aplicar filtros según rol
    const whereClause = this.buildWhereClause(userScope);
    
    const equipos = await prisma.equipo.findMany({
      where: whereClause,
      include: {
        empresaTransportista: {
          include: {
            documentos: {
              where: {
                estadoAprobacion: {
                  in: ['PENDIENTE_APROBACION', 'RECHAZADO'],
                },
              },
            },
          },
        },
        chofer: {
          include: {
            documentos: {
              where: {
                estadoAprobacion: {
                  in: ['PENDIENTE_APROBACION', 'RECHAZADO'],
                },
              },
            },
          },
        },
        camion: {
          include: {
            documentos: {
              where: {
                estadoAprobacion: {
                  in: ['PENDIENTE_APROBACION', 'RECHAZADO'],
                },
              },
            },
          },
        },
        acoplado: {
          include: {
            documentos: {
              where: {
                estadoAprobacion: {
                  in: ['PENDIENTE_APROBACION', 'RECHAZADO'],
                },
              },
            },
          },
        },
        clientes: {
          include: {
            cliente: true,
          },
        },
      },
    });
    
    // Calcular indicadores azules
    const equiposConIndicadores = equipos.map(equipo => {
      const todosDocs = [
        ...equipo.empresaTransportista.documentos,
        ...equipo.chofer.documentos,
        ...equipo.camion.documentos,
        ...equipo.acoplado.documentos,
      ];
      
      const pendientes = todosDocs.filter(
        d => d.estadoAprobacion === 'PENDIENTE_APROBACION'
      );
      
      const rechazados = todosDocs.filter(
        d => d.estadoAprobacion === 'RECHAZADO'
      );
      
      return {
        ...equipo,
        tienePendientes: pendientes.length > 0,
        tieneRechazados: rechazados.length > 0,
        cantidadPendientes: pendientes.length,
        cantidadRechazados: rechazados.length,
        documentosPendientes: pendientes,
        documentosRechazados: rechazados,
      };
    });
    
    return res.json({
      success: true,
      data: equiposConIndicadores,
    });
  }
  
  private async verificarPermisoAprobacion(req: AuthRequest, documentoId: number) {
    const { userScope } = req;
    
    // ADMIN_INTERNO siempre puede
    if (userScope.type === 'ADMIN') {
      return true;
    }
    
    // Obtener el documento y verificar ownership
    const documento = await prisma.document.findUnique({
      where: { id: documentoId },
      include: {
        empresaTransportista: true,
        chofer: true,
        camion: { include: { equipo: true } },
        acoplado: { include: { equipo: true } },
      },
    });
    
    if (!documento) {
      throw new Error('Documento no encontrado');
    }
    
    // DADOR_DE_CARGA o TRANSPORTISTA deben ser dueños
    if (userScope.type === 'DADOR') {
      const dadorCargaId = documento.empresaTransportista?.dadorCargaId ||
                           documento.chofer?.dadorCargaId ||
                           documento.camion?.equipo?.dadorCargaId ||
                           documento.acoplado?.equipo?.dadorCargaId;
      
      if (dadorCargaId !== userScope.dadorCargaId) {
        throw new Error('No tienes permisos para aprobar este documento');
      }
    }
    
    if (userScope.type === 'TRANSPORTISTA') {
      const empresaId = documento.empresaTransportista?.id ||
                        documento.chofer?.empresaTransportistaId;
      
      if (empresaId !== userScope.empresaTransportistaId) {
        throw new Error('No tienes permisos para aprobar este documento');
      }
    }
    
    // CHOFER NO puede aprobar (solo carga/actualiza)
    if (userScope.type === 'CHOFER') {
      throw new Error('Los choferes no pueden aprobar documentos');
    }
    
    return true;
  }
}
```

---

## 🖼️ Implementación Técnica: Vista Previa

### Generación de Thumbnails

```typescript
// apps/documentos/src/services/thumbnail.service.ts

import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { fromPath } from 'pdf2pic';

export class ThumbnailService {
  // Generar thumbnail de imagen
  async generateImageThumbnail(
    filePath: string,
    outputPath: string,
    options = { width: 200, height: 200 }
  ): Promise<string> {
    await sharp(filePath)
      .resize(options.width, options.height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    
    return outputPath;
  }
  
  // Generar thumbnail de PDF (primera página)
  async generatePDFThumbnail(
    filePath: string,
    outputPath: string,
    options = { width: 200, height: 200 }
  ): Promise<string> {
    const converter = fromPath(filePath, {
      density: 100,
      saveFilename: 'thumbnail',
      savePath: path.dirname(outputPath),
      format: 'jpg',
      width: options.width,
      height: options.height,
    });
    
    const result = await converter(1); // Primera página
    return result.path;
  }
  
  // Obtener número de páginas de un PDF
  async getPDFPageCount(filePath: string): Promise<number> {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(dataBuffer);
    return pdfDoc.getPageCount();
  }
}
```

### URLs Firmadas para Seguridad

```typescript
// apps/documentos/src/services/signed-url.service.ts

import crypto from 'crypto';

export class SignedURLService {
  private secret: string = process.env.SIGNED_URL_SECRET!;
  private ttl: number = 3600; // 1 hora
  
  // Generar URL firmada
  generateSignedURL(documentId: number, userId: number): string {
    const expiry = Date.now() + (this.ttl * 1000);
    const data = `${documentId}:${userId}:${expiry}`;
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');
    
    return `/api/docs/equipos/documentos/${documentId}/view?userId=${userId}&expiry=${expiry}&signature=${signature}`;
  }
  
  // Verificar URL firmada
  verifySignedURL(
    documentId: number,
    userId: number,
    expiry: number,
    signature: string
  ): boolean {
    // Verificar expiración
    if (Date.now() > expiry) {
      return false;
    }
    
    // Verificar firma
    const data = `${documentId}:${userId}:${expiry}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');
    
    return signature === expectedSignature;
  }
}
```

### Servicio de Preview (Backend)

```typescript
// apps/documentos/src/services/document-preview.service.ts

export class DocumentPreviewService {
  constructor(
    private thumbnailService: ThumbnailService,
    private signedUrlService: SignedURLService
  ) {}
  
  async getPreviewData(documentId: number, userId: number) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        chofer: true,
        camion: true,
        acoplado: true,
        empresaTransportista: true,
      },
    });
    
    if (!document) {
      throw new Error('Documento no encontrado');
    }
    
    // Generar URL firmada
    const viewUrl = this.signedUrlService.generateSignedURL(documentId, userId);
    const downloadUrl = this.signedUrlService.generateSignedURL(documentId, userId);
    
    // Obtener metadata
    const metadata = {
      fileName: document.fileName,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      uploadedAt: document.createdAt,
      uploadedBy: document.uploadedBy,
      status: document.status,
      pageCount: document.mimeType === 'application/pdf' 
        ? await this.thumbnailService.getPDFPageCount(document.filePath)
        : 1,
    };
    
    // Datos ingresados según tipo de documento
    const comparisonData = this.buildComparisonData(document);
    
    return {
      document: {
        id: document.id,
        type: document.tipoDocumento,
        ...metadata,
      },
      urls: {
        view: viewUrl,
        download: downloadUrl,
        thumbnail: `/api/docs/equipos/documentos/${documentId}/thumbnail`,
      },
      comparison: comparisonData,
      aiClassification: document.aiClassification, // Solo para ADMIN
    };
  }
  
  private buildComparisonData(document: any) {
    const type = document.tipoDocumento;
    
    switch (type) {
      case 'DNI':
        return {
          fields: [
            { label: 'Número DNI', value: document.chofer?.dni },
            { label: 'Nombre', value: document.chofer?.nombre },
            { label: 'Apellido', value: document.chofer?.apellido },
            { label: 'Vencimiento', value: document.fechaVencimiento },
          ],
        };
        
      case 'LICENCIA':
        return {
          fields: [
            { label: 'Número Licencia', value: document.numeroLicencia },
            { label: 'Chofer', value: document.chofer?.nombreCompleto },
            { label: 'Categoría', value: document.categoria },
            { label: 'Vencimiento', value: document.fechaVencimiento },
          ],
        };
        
      case 'RTO_CAMION':
        return {
          fields: [
            { label: 'Patente', value: document.camion?.patente },
            { label: 'Empresa', value: document.empresaTransportista?.nombre },
            { label: 'Vencimiento', value: document.fechaVencimiento },
          ],
        };
        
      // ... más tipos de documentos
      
      default:
        return { fields: [] };
    }
  }
}
```

### Hook React para Vista Previa

```typescript
// apps/frontend/src/features/equipos/hooks/useDocumentPreview.ts

export const useDocumentPreview = (documentId: number | null) => {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  const loadPreview = async () => {
    if (!documentId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/api/docs/equipos/documentos/${documentId}/preview`);
      setPreviewData(response.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  
  const zoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const zoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const resetZoom = () => setZoom(100);
  
  const nextPage = () => {
    if (previewData && currentPage < previewData.document.pageCount) {
      setCurrentPage(prev => prev + 1);
    }
  };
  
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };
  
  const rotateClockwise = () => setRotation(prev => (prev + 90) % 360);
  const rotateCounterClockwise = () => setRotation(prev => (prev - 90 + 360) % 360);
  
  const download = async () => {
    const response = await api.get(
      `/api/docs/equipos/documentos/${documentId}/download`,
      { responseType: 'blob' }
    );
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = previewData.document.fileName;
    link.click();
  };
  
  useEffect(() => {
    loadPreview();
  }, [documentId]);
  
  return {
    previewData,
    loading,
    error,
    zoom,
    currentPage,
    rotation,
    actions: {
      zoomIn,
      zoomOut,
      resetZoom,
      nextPage,
      prevPage,
      rotateClockwise,
      rotateCounterClockwise,
      download,
    },
  };
};
```

---

## 🔒 Consideraciones de Seguridad

### 1. Autenticación y Autorización
- ✅ JWT con expiración corta (1h)
- ✅ Refresh tokens
- ✅ Rate limiting: max 100 req/min por usuario
- ✅ Validación estricta de permisos en cada endpoint
- ✅ Logs de auditoría de todas las acciones

### 2. Validación de Archivos
- ✅ Tamaño máximo: 10 MB por archivo
- ✅ Formatos permitidos: PDF, JPG, PNG, WEBP
- ✅ Escaneo de virus (ClamAV)
- ✅ Nombres de archivo sanitizados
- ✅ Almacenamiento en ubicaciones seguras
- ✅ Generación de thumbnails en proceso separado

### 3. Protección de Datos
- ✅ Cifrado en tránsito (HTTPS)
- ✅ Cifrado en reposo (archivos sensibles)
- ✅ No exponer paths absolutos al frontend
- ✅ **URLs firmadas con TTL de 1h** para vista previa
- ✅ Verificación de permisos antes de servir archivos
- ✅ Thumbnails cacheados con headers apropiados
- ✅ No permitir descarga directa sin autenticación

### 4. Control de Acceso
```typescript
// Verificación doble: rol + ownership
const canAccess = (user, resource) => {
  // Admin interno/super: acceso total
  if ([UserRole.ADMIN_INTERNO, UserRole.ADMIN, UserRole.SUPERADMIN].includes(user.role)) {
    return true;
  }
  
  // Admin externo: solo su empresa
  if (user.role === UserRole.ADMIN_EXTERNO) {
    return resource.empresaTransportistaId === user.metadata?.empresaTransportistaId;
  }
  
  return false;
};
```

---

## 📱 Responsividad

### Desktop (> 1024px)
- Layout de 2 columnas para modales
- Tablas completas
- Máximo ancho: 1400px

### Tablet (768px - 1024px)
- Layout de 1 columna
- Tablas responsive (scroll horizontal)
- Accordions por defecto cerrados

### Mobile (< 768px)
- Stack vertical completo
- Cards en lugar de tablas
- Botones de acción como menú dropdown
- Upload drag-and-drop reemplazado por botón

---

## 🎯 Métricas de Éxito

### KPIs Técnicos
- ⚡ Tiempo de carga inicial < 2s
- ⚡ Tiempo de subida de documento < 5s (archivo 5MB)
- ⚡ 99.9% uptime
- ⚡ < 1% error rate

### KPIs de Negocio
- 📊 % de empresas que completan carga inicial (target: > 80%)
- 📊 Tiempo promedio para completar carga (target: < 30 min)
- 📊 % de documentos aprobados en primera revisión (target: > 70%)
- 📊 Reducción de emails/llamadas de soporte (target: -50%)

---

## 🔄 Próximos Pasos Después del MVP

### Mejoras Futuras (Post-Launch)
1. **Carga Masiva CSV**: Importar múltiples choferes/unidades
2. **Integración con APIs externas**: Validación automática de CUIT, DNI
3. **Firma Digital**: Documentos con firma electrónica
4. **App Mobile**: Versión nativa iOS/Android
5. **Chatbot**: Asistencia automática para completar formulario
6. **Analytics Dashboard**: Métricas de uso para admins internos
7. **Integración WhatsApp**: Carga de documentos por WhatsApp
8. **Recordatorios automáticos**: SMS/WhatsApp para docs por vencer

---

**Fecha de Creación**: 7 de Noviembre, 2025  
**Versión del Documento**: 1.0  
**Autor**: Análisis basado en formulario BCA  
**Estado**: ✅ Especificación Completa - Listo para Desarrollo

