# 👥 MATRIZ COMPLETA DE ROLES Y USUARIOS DEL SISTEMA

> **Fecha**: 21 de Noviembre, 2025  
> **Versión**: 1.0  
> **Estado**: ✅ Especificación Completa  

---

## 📖 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Roles del Sistema](#roles-del-sistema)
3. [Matriz Completa de Permisos](#matriz-completa-de-permisos)
4. [Casos de Uso por Rol](#casos-de-uso-por-rol)
5. [Jerarquía de Roles](#jerarquia-de-roles)
6. [Implementación Técnica](#implementacion-tecnica)
7. [Reglas de Negocio](#reglas-de-negocio)

---

## 🎯 Resumen Ejecutivo {#resumen-ejecutivo}

El sistema contempla **9 roles diferenciados** para gestionar la documentación de equipos de transporte:

| Rol | Tipo | Acceso | Usuarios Ejemplo |
|-----|------|--------|------------------|
| **SUPERADMIN** | Plataforma | Total sin restricciones | Microsyst Admin |
| **ADMIN** | Tenant | Total dentro del tenant | Quebracho Blanco Admin |
| **OPERATOR** | Operativo | Amplio (sin eliminación) | Personal operativo |
| **ADMIN_INTERNO** | Interno | Similar a ADMIN | Personal Quebracho/Microsyst |
| **DADOR_DE_CARGA** | Intermediario | Solo sus datos | Leandro Castro |
| **TRANSPORTISTA** | Empresa | Solo su flota | Transportes Pérez S.A. |
| **CHOFER** | Individual | Solo su equipo | Juan Pérez (conductor) |
| **CLIENTE** | Externo | Solo lectura | PROSIL S.A. |
| **USER** | Base | Deprecated | (migración) |

---

## 👥 Roles del Sistema {#roles-del-sistema}

### 1. SUPERADMIN 👑

**Descripción**: Rol de máximo nivel con acceso completo a toda la plataforma.

**Características**:
- ✅ Acceso TOTAL sin restricciones
- ✅ Control completo del sistema
- ✅ Gestión de configuración global
- ✅ Acceso cross-tenant (puede ver todos los tenants)
- ✅ Modificar configuración de seguridad
- ✅ Gestionar usuarios de cualquier tenant

**Alcance**: 
- **TODO** el sistema sin limitaciones

**Usuario Típico**: 
- Administrador de Microsyst
- DevOps team

---

### 2. ADMIN 🔧

**Descripción**: Administrador con control total dentro de su tenant/empresa.

**Características**:
- ✅ Acceso TOTAL dentro de su tenant
- ✅ Gestiona todos los dadores de carga
- ✅ Aprobación de documentos de todos los dadores
- ✅ Creación de clientes, templates, usuarios
- ✅ Configuración del tenant
- ✅ Gestión completa de equipos y maestros
- ❌ No puede modificar configuración global del sistema

**Alcance**: 
- **TODO** dentro de su tenant (ej: Quebracho Blanco)
- Puede trabajar con **CUALQUIER dador** del tenant

**Usuario Típico**: 
- Administrador de Quebracho Blanco
- Manager de operaciones

**Diferencia con SUPERADMIN**:
- ADMIN está limitado a su tenant
- No puede modificar configuración de seguridad global
- No puede acceder a otros tenants

---

### 3. OPERATOR / OPERADOR_INTERNO 👨‍💼

**Descripción**: Personal operativo con acceso amplio para tareas del día a día.

**Características**:
- ✅ Ve y gestiona equipos de **TODOS los dadores**
- ✅ Crea y modifica equipos, maestros (empresas, choferes, camiones)
- ✅ Subir y ver documentos de todos los dadores
- ✅ Búsquedas masivas sin restricciones
- ✅ Carga masiva con IA
- ✅ Descarga ZIP de cualquier dador
- ❌ NO puede: eliminar equipos
- ❌ NO puede: gestionar clientes
- ❌ NO puede: aprobar documentos
- ❌ NO puede: modificar configuración

**Alcance**: 
- Operaciones CRUD completas (excepto delete)
- Todos los dadores de su tenant

**Usuario Típico**: 
- Personal operativo de Quebracho
- Operador de carga de datos
- Coordinador de documentación

---

### 4. ADMIN_INTERNO 👨‍💻

**Descripción**: Personal interno con permisos administrativos.

**Características**:
- ✅ Puede cargar equipos para **CUALQUIER dador**
- ✅ Ver todos los equipos sin restricción
- ✅ Aprobar y rechazar documentos de cualquier dador
- ✅ Gestionar maestros de cualquier dador
- ✅ Similar a ADMIN pero más orientado a soporte interno
- ✅ Puede seleccionar dador al cargar equipos

**Alcance**: 
- Similar a ADMIN pero con enfoque en soporte
- Todos los dadores de su tenant

**Usuario Típico**: 
- Personal de Quebracho/Microsyst
- Equipo de soporte técnico
- Responsables de calidad documental

**Diferencia con ADMIN**:
- Más orientado a tareas operativas que administrativas
- Puede no tener acceso a configuración de usuarios

---

### 5. DADOR_DE_CARGA 📦

**Descripción**: Intermediario que coordina múltiples transportistas.

**Características**:
- 🟢 **Acceso LIMITADO**: solo sus propios datos
- 🟢 Ve únicamente equipos de **SU dador** (no puede ver otros dadores)
- 🟢 Gestiona sus propios equipos, maestros y documentos
- 🟢 Crea equipos dentro de su dador
- 🟢 Coordina múltiples empresas transportistas
- 🟢 Puede aprobar/rechazar documentos de su dador (según configuración)
- 🟢 Carga masiva con IA de sus equipos
- 🟢 Descarga ZIP de sus equipos
- 🟢 Búsqueda por patentes (solo su dador)
- ❌ NO puede: ver otros dadores
- ❌ NO puede: gestionar clientes
- ❌ NO puede: modificar configuración global

**Alcance**: 
- Solo datos de **SU dador** (aislamiento total)
- Múltiples empresas transportistas dentro de su dador

**Usuario Típico**: 
- Leandro Castro (intermediario)
- Coordinador de transportistas externo
- Quebracho actuando como dador

**Metadata en JWT**:
```json
{
  "role": "DADOR_DE_CARGA",
  "metadata": {
    "dadorCargaId": 5
  }
}
```

---

### 6. TRANSPORTISTA 🚛

**Descripción**: Empresa de transporte que gestiona su propia flota.

**Características**:
- 🟢 Ve solo **equipos de SU empresa transportista**
- 🟢 Gestiona sus propios choferes, camiones y acoplados
- 🟢 Crea equipos usando su flota
- 🟢 Carga y actualiza documentos de sus equipos
- 🟢 Asigna choferes a equipos
- 🟢 Alta rápida de equipos
- 🟢 Dashboard de cumplimiento de su flota
- 🟢 Búsqueda por patentes (solo sus equipos, máx 20)
- 🟢 Descarga ZIP de sus equipos (máx 20)
- ❌ NO puede: ver equipos de otras empresas
- ❌ NO puede: aprobar documentos
- ❌ NO puede: gestionar dadores o clientes

**Alcance**: 
- Solo equipos de **SU empresa transportista**
- Sus choferes, camiones y acoplados

**Usuario Típico**: 
- Transportes Pérez S.A.
- Logística Gómez S.R.L.
- Administrador de flota de transporte

**Metadata en JWT**:
```json
{
  "role": "TRANSPORTISTA",
  "metadata": {
    "type": "empresa",
    "empresaTransportistaId": 10,
    "dadorCargaId": 5  // opcional, para filtrado adicional
  }
}
```

---

### 7. CHOFER 👨‍✈️

**Descripción**: Conductor individual que gestiona su equipo asignado.

**Características**:
- 🟢 Ve solo **SU equipo asignado** (uno solo a la vez)
- 🟢 Edita sus propios datos (DNI, contacto, domicilio)
- 🟢 Carga/actualiza sus documentos personales:
  - DNI
  - Licencia de conducir
  - Carnet de salud
  - Curso de traslado de sustancias alimenticias
  - Seguro de vida
  - ART
- 🟢 Carga/actualiza docs del **camión de su equipo**:
  - Cédula verde
  - RTO
  - Póliza de seguro
  - Certificado GNC
- 🟢 Carga/actualiza docs del **acoplado de su equipo**:
  - Cédula verde
  - RTO
  - Póliza de seguro
  - SENASA
- 🟢 Ve notificaciones de vencimientos
- ❌ NO puede: cambiar de equipo (solo TRANSPORTISTA/DADOR/ADMIN)
- ❌ NO puede: ver otros equipos
- ❌ NO puede: aprobar documentos
- ❌ NO puede: crear equipos
- ❌ NO puede: modificar datos de la empresa

**Alcance**: 
- Solo **UN equipo** (el asignado actualmente)
- Sus documentos personales
- Documentos de las unidades de su equipo

**Usuario Típico**: 
- Juan Pérez (DNI: 12.345.678)
- María López (DNI: 87.654.321)
- Conductor de camión

**Metadata en JWT**:
```json
{
  "role": "CHOFER",
  "metadata": {
    "type": "chofer",
    "choferId": 25,
    "choferDni": "12345678",
    "choferDniNorm": "12345678"
  }
}
```

**Regla de Negocio Importante**:
> **Un chofer solo puede estar en 1 equipo a la vez.**  
> Si se crea un equipo nuevo con el mismo chofer, el anterior debe finalizarse.

---

### 8. CLIENTE 👔

**Descripción**: Cliente externo con acceso de solo lectura a equipos asignados.

**Características**:
- 🟢 **SOLO LECTURA** completa (no puede editar nada)
- 🟢 Ve equipos **asignados a él**
- 🟢 Sistema de semáforo de estados (Verde/Amarillo/Rojo/Gris/Azul)
- 🟢 Búsqueda por patentes (solo equipos asignados, máx 50)
- 🟢 Ver documentos individuales
- 🟢 Descargar documentos individuales
- 🟢 Descargar ZIP con filtros temporales:
  - Toda la documentación
  - Solo docs renovados en última semana
  - Solo docs renovados en última quincena
  - Solo docs renovados en último mes
  - Solo docs renovados en último año
- 🟢 Ver resumen estadístico de cumplimiento
- 🟢 Ver historial de aprobaciones
- 🟢 Consulta de maestros (empresas, choferes, camiones, acoplados)
- ❌ NO puede: editar nada
- ❌ NO puede: crear equipos
- ❌ NO puede: aprobar documentos
- ❌ NO puede: subir documentos

**Alcance**: 
- Solo equipos **asignados a su cliente**
- Vista de solo lectura

**Usuario Típico**: 
- PROSIL S.A.
- Cliente corporativo
- Auditor externo

**Metadata en JWT**:
```json
{
  "role": "CLIENTE",
  "metadata": {
    "clienteId": 3,
    "clienteNombre": "PROSIL S.A."
  }
}
```

**Portal Específico**: 
- `/portal/cliente` con interfaz simplificada y clara

---

### 9. USER 🧑

**Descripción**: Rol genérico base (probablemente deprecated).

**Estado**: ⚠️ Deprecated - En proceso de migración

**Uso**: 
- Usuarios legacy
- En proceso de conversión a roles específicos

---

## 📊 Matriz Completa de Permisos {#matriz-completa-de-permisos}

### Leyenda
- ✅ **Acceso total** (sin restricciones)
- 🟢 **Acceso limitado** (solo a sus propios datos)
- ❌ **Sin acceso**

---

### 1. Visualización de Equipos

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | ADMIN_INTERNO | DADOR_CARGA | TRANSPORTISTA | CHOFER | CLIENTE |
|---------------|------------|-------|----------|---------------|-------------|---------------|---------|---------|
| Ver TODOS los equipos (cualquier dador) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver equipos de UN dador específico | ✅ | ✅ | ✅ | ✅ | 🟢 Solo suyo | ❌ | ❌ | ❌ |
| Ver equipos de UNA empresa transportista | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 Solo suya | ❌ | ❌ |
| Ver solo SU equipo asignado | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ |
| Ver equipos asignados a un cliente | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 |

---

### 2. Gestión de Equipos

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | ADMIN_INTERNO | DADOR_CARGA | TRANSPORTISTA | CHOFER | CLIENTE |
|---------------|------------|-------|----------|---------------|-------------|---------------|---------|---------|
| Crear equipo en cualquier dador | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear equipo en SU dador | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | ❌ | ❌ |
| Crear equipo con SU empresa | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | ❌ |
| Modificar cualquier equipo | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Modificar equipos de SU dador | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | ❌ | ❌ |
| Modificar equipos de SU empresa | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | ❌ |
| Modificar datos de SU equipo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ |
| Eliminar equipos de cualquier dador | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Eliminar equipos de SU dador | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cambiar chofer de equipo | ✅ | ✅ | ✅ | ✅ | 🟢 | 🟢 | ❌ | ❌ |
| Asignar equipo a clientes | ✅ | ✅ | ✅ | ✅ | 🟢 | 🟢 | ❌ | ❌ |

---

### 3. Gestión de Dadores de Carga

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | ADMIN_INTERNO | DADOR_CARGA | TRANSPORTISTA | CHOFER | CLIENTE |
|---------------|------------|-------|----------|---------------|-------------|---------------|---------|---------|
| Listar todos los dadores | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver datos de cualquier dador | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver datos de SU dador | ✅ | ✅ | ❌ | ✅ | 🟢 | ❌ | ❌ | ❌ |
| Crear dador | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Modificar cualquier dador | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Eliminar cualquier dador | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Seleccionar dador al cargar | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

### 4. Gestión de Maestros (Empresas, Choferes, Camiones, Acoplados)

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | ADMIN_INTERNO | DADOR_CARGA | TRANSPORTISTA | CHOFER | CLIENTE |
|---------------|------------|-------|----------|---------------|-------------|---------------|---------|---------|
| Ver maestros de TODOS los dadores | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver maestros de SU dador | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | ❌ | ❌ |
| Ver maestros de SU empresa | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | 🟢 (Solo lectura) |
| Crear/Modificar maestros (cualquier dador) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear/Modificar maestros (SU dador) | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | ❌ | ❌ |
| Crear/Modificar maestros (SU empresa) | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | ❌ |
| Agregar/editar choferes (cualquier empresa) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Agregar/editar choferes (SU empresa) | ✅ | ✅ | ✅ | ✅ | 🟢 | 🟢 | ❌ | ❌ |
| Agregar/editar unidades (cualquier empresa) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Agregar/editar unidades (SU empresa) | ✅ | ✅ | ✅ | ✅ | 🟢 | 🟢 | ❌ | ❌ |
| Eliminar maestros de cualquier dador | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar sus propios datos personales | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ |

---

### 5. Gestión de Documentos

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | ADMIN_INTERNO | DADOR_CARGA | TRANSPORTISTA | CHOFER | CLIENTE |
|---------------|------------|-------|----------|---------------|-------------|---------------|---------|---------|
| Subir docs de CUALQUIER dador | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Subir docs de SU dador | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | ❌ | ❌ |
| Subir docs de SU empresa | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | ❌ |
| Subir docs propios personales | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ |
| Subir docs del camión de SU equipo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ |
| Subir docs del acoplado de SU equipo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ |
| Ver documentos de CUALQUIER dador | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver documentos de SU dador | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | ❌ | ❌ |
| Ver documentos de SU empresa | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | ❌ |
| Ver documentos de SU equipo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ |
| Ver documentos de equipos asignados | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 |
| Descargar docs de CUALQUIER dador | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Descargar docs de SU dador | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | ❌ | ❌ |
| Descargar docs de equipos asignados | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | 🟢 | 🟢 |
| Eliminar documentos de CUALQUIER dador | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Carga masiva con IA (cualquier dador) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Carga masiva con IA (su dador) | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | ❌ | ❌ |

---

### 6. Aprobación de Documentos

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | ADMIN_INTERNO | DADOR_CARGA | TRANSPORTISTA | CHOFER | CLIENTE |
|---------------|------------|-------|----------|---------------|-------------|---------------|---------|---------|
| Ver cola de aprobación (todos los dadores) | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver cola de aprobación (su dador) | ✅ | ✅ | ❌ | ✅ | 🟢 | ❌ | ❌ | ❌ |
| Aprobar docs de CUALQUIER dador | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Aprobar docs de SU dador | ✅ | ✅ | ❌ | ✅ | 🟢* | ❌ | ❌ | ❌ |
| Rechazar docs de CUALQUIER dador | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Rechazar docs de SU dador | ✅ | ✅ | ❌ | ✅ | 🟢* | ❌ | ❌ | ❌ |
| Aprobación en lote (cualquier dador) | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Aprobación en lote (su dador) | ✅ | ✅ | ❌ | ✅ | 🟢* | ❌ | ❌ | ❌ |

**Nota**: 🟢* = Según configuración del sistema, el DADOR_DE_CARGA puede o no tener permisos de aprobación. Esto debe definirse en la implementación.

---

### 7. Búsqueda y Consultas

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | ADMIN_INTERNO | DADOR_CARGA | TRANSPORTISTA | CHOFER | CLIENTE |
|---------------|------------|-------|----------|---------------|-------------|---------------|---------|---------|
| Búsqueda masiva por patentes (todos) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Búsqueda masiva por patentes (su dador) | ✅ | ✅ | ✅ | ✅ | 🟢 (50 máx) | ❌ | ❌ | ❌ |
| Búsqueda masiva por patentes (su empresa) | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 (20 máx) | ❌ | ❌ |
| Búsqueda masiva por patentes (equipos asignados) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟢 (50 máx) |
| Búsqueda por DNI (todos) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Búsqueda por DNI (su dador) | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | ❌ | ❌ |
| Consulta compliance (todos los equipos) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Consulta compliance (equipos de su dador) | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | ❌ | ❌ |
| Consulta compliance (equipos de su empresa) | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | ❌ |
| Consulta compliance (equipos asignados) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | 🟢 |

---

### 8. Descarga Masiva (ZIP)

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | ADMIN_INTERNO | DADOR_CARGA | TRANSPORTISTA | CHOFER | CLIENTE |
|---------------|------------|-------|----------|---------------|-------------|---------------|---------|---------|
| ZIP de equipos de CUALQUIER dador | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| ZIP de equipos de SU dador | ✅ | ✅ | ✅ | ✅ | 🟢 (50 máx) | ❌ | ❌ | ❌ |
| ZIP de equipos de SU empresa | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 (20 máx) | ❌ | ❌ |
| ZIP de equipos asignados | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟢 (50 máx) |
| ZIP con filtros temporales (cualquier dador) | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| ZIP con filtros temporales (su dador) | ✅ | ✅ | ❌ | ✅ | 🟢 | ❌ | ❌ | ❌ |
| ZIP con filtros temporales (equipos asignados) | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ❌ | 🟢 |
| ZIP estructurado (cualquier dador) | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| ZIP estructurado (su dador) | ✅ | ✅ | ❌ | ✅ | 🟢 | ❌ | ❌ | ❌ |
| ZIP estructurado (equipos asignados) | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | 🟢 |

---

### 9. Gestión de Clientes

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | ADMIN_INTERNO | DADOR_CARGA | TRANSPORTISTA | CHOFER | CLIENTE |
|---------------|------------|-------|----------|---------------|-------------|---------------|---------|---------|
| Ver todos los clientes | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear/Modificar clientes | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Eliminar clientes | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestionar requisitos de clientes | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Asignar equipos a clientes | ✅ | ✅ | ✅ | ✅ | 🟢 | 🟢 | ❌ | ❌ |

---

### 10. Configuración del Sistema

| Funcionalidad | SUPERADMIN | ADMIN | OPERATOR | ADMIN_INTERNO | DADOR_CARGA | TRANSPORTISTA | CHOFER | CLIENTE |
|---------------|------------|-------|----------|---------------|-------------|---------------|---------|---------|
| Ver configuración global | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Modificar configuración global | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver templates de documentos | ✅ | ✅ | ✅ | ✅ | 🟢 | 🟢 | 🟢 | 🟢 |
| Crear/Modificar templates | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver configuración de notificaciones | ✅ | ✅ | ❌ | ✅ | 🟢 Solo propio | 🟢 Solo propio | 🟢 Solo propio | ❌ |
| Modificar configuración de notificaciones | ✅ | ✅ | ❌ | ✅ | 🟢 Solo propio | 🟢 Solo propio | 🟢 Solo propio | ❌ |
| Gestionar usuarios | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🎭 Casos de Uso por Rol {#casos-de-uso-por-rol}

### Caso 1: CLIENTE - PROSIL S.A. 👔

**Contexto**: Cliente externo que recibe servicios de transporte.

**Flujo de trabajo típico**:

```
1. Ingresa al portal con credenciales
   → URL: https://app.bca.com/portal/cliente

2. Dashboard inicial muestra:
   📊 Resumen de Equipos:
   - 🟢 Aptos: 28 equipos (62%)
   - 🟡 Por vencer: 12 equipos (27%)
   - 🔴 No aptos: 5 equipos (11%)
   - Total: 45 equipos asignados

3. Búsqueda por patentes:
   - Pega lista de 15 patentes desde Excel
   - Sistema busca y muestra resultados
   - 13 encontrados / 2 no encontrados

4. Ve detalle de equipo con estado 🟡:
   - Transportista: Transportes Pérez S.A.
   - Chofer: Juan Pérez (DNI: 12.345.678)
   - Camión: AB123CD
   - Acoplado: XY789ZW
   - ⚠️ 2 documentos vencen en 5 días:
     • RTO Camión (vence 26/11/2025)
     • Licencia Chofer (vence 28/11/2025)

5. Descarga ZIP con filtro "última semana":
   - Selecciona 10 equipos
   - Filtro: "Solo docs renovados última semana"
   - Incluir resumen Excel: ✅
   - Descarga ZIP (2.5 GB)

6. Recibe notificación:
   ✉️ "Equipo AB123CD - RTO vencerá en 5 días"
```

**Límites**:
- Búsqueda: 50 patentes máximo
- ZIP: 50 equipos máximo
- Rate limit: 100 requests/min

---

### Caso 2: TRANSPORTISTA - Transportes Pérez S.A. 🚛

**Contexto**: Empresa de transporte que gestiona su flota.

**Flujo de trabajo típico**:

```
1. Ingresa al portal
   → URL: https://app.bca.com/portal/transportista

2. Dashboard muestra:
   📊 Mi Flota:
   - 12 equipos activos
   - 8 choferes
   - 15 camiones
   - 10 acoplados
   
   🔴 Alertas:
   - 3 documentos vencidos
   - 5 documentos vencen en < 7 días

3. Crea nuevo equipo (Alta Rápida):
   - Selecciona chofer: María López (ya registrado)
   - Selecciona camión: EF456GH (ya registrado)
   - Selecciona acoplado: IJ012KL (ya registrado)
   - Asigna a cliente: PROSIL S.A.
   - ✅ Equipo creado en 30 segundos

4. Sube documentos del equipo nuevo:
   - Carga 6 docs del chofer (DNI, licencia, etc.)
   - Carga 4 docs del camión
   - Carga 4 docs del acoplado
   - Estado del equipo: 🔵 Pendiente de aprobación

5. Busca equipos por patente:
   - Busca: "AB123CD"
   - Resultado: Equipo encontrado
   - Ve estado y docs vencidos

6. Dashboard de cumplimiento:
   - 🟢 Aptos: 8 equipos (67%)
   - 🟡 Por vencer: 3 equipos (25%)
   - 🔴 No aptos: 1 equipo (8%)
```

**Límites**:
- Búsqueda: 20 patentes máximo
- ZIP: 20 equipos máximo
- Solo su empresa

---

### Caso 3: CHOFER - Juan Pérez 👨‍✈️

**Contexto**: Conductor asignado a un equipo.

**Flujo de trabajo típico**:

```
1. Ingresa al portal
   → URL: https://app.bca.com/portal/chofer

2. Dashboard muestra:
   📋 Mi Equipo:
   - Empresa: Transportes Pérez S.A.
   - Camión: AB123CD
   - Acoplado: XY789ZW
   - Cliente: PROSIL S.A.
   
   🔴 Alertas:
   - ⚠️ Tu licencia vence en 5 días
   - ⚠️ RTO del camión vence en 3 días

3. Ve detalle de documentos:
   
   👤 Mis Documentos:
   - ✅ DNI (vigente hasta 2030)
   - 🔴 Licencia (vence 26/11/2025) ← URGENTE
   - ✅ Carnet de Salud (vigente)
   - ✅ Curso Traslado (vigente)
   - ✅ Seguro de Vida (vigente)
   - ✅ ART (vigente)
   
   🚜 Documentos del Camión AB123CD:
   - ✅ Cédula Verde (vigente)
   - 🔴 RTO (vence 24/11/2025) ← URGENTE
   - ✅ Póliza Seguro (vigente)
   - ✅ Certificado GNC (vigente)
   
   🚛 Documentos del Acoplado XY789ZW:
   - ✅ Cédula Verde (vigente)
   - ✅ RTO (vigente)
   - ✅ Póliza Seguro (vigente)
   - ✅ SENASA (vigente)

4. Actualiza licencia vencida:
   - Click en "Actualizar Licencia"
   - Sube foto de la nueva licencia
   - Fecha vencimiento: 26/11/2030
   - ✅ Documento subido
   - Estado: 🔵 Pendiente de aprobación

5. Actualiza RTO del camión:
   - Click en "Actualizar RTO Camión"
   - Sube PDF del nuevo RTO
   - Fecha vencimiento: 24/11/2026
   - ✅ Documento subido
   - Estado: 🔵 Pendiente de aprobación

6. Recibe notificación:
   ✉️ "Tu licencia ha sido aprobada ✅"
   ✉️ "RTO del camión AB123CD ha sido aprobado ✅"
   
7. Dashboard actualizado:
   🟢 Equipo completo y al día
```

**Límites**:
- Solo ve SU equipo (uno)
- No puede cambiar de equipo
- No puede crear equipos

---

### Caso 4: DADOR_DE_CARGA - Leandro Castro 📦

**Contexto**: Intermediario que coordina múltiples transportistas.

**Flujo de trabajo típico**:

```
1. Ingresa al portal
   → URL: https://app.bca.com/portal/dador

2. Dashboard muestra:
   📊 Mi Dador - Leandro Castro Logística:
   - 45 equipos activos
   - 5 empresas transportistas coordinadas
   - 28 choferes
   - 35 camiones
   - 30 acoplados
   
   🔵 Pendientes de Aprobación:
   - 12 documentos esperando revisión

3. Ve cola de aprobación:
   
   📋 Documentos Pendientes:
   
   1. 🔵 DNI - María López (Transp. Pérez)
      - Subido: 21/11/2025 10:30
      - [👁️ Ver] [✅ Aprobar] [❌ Rechazar]
   
   2. 🔵 RTO Camión AB123CD (Transp. Pérez)
      - Subido: 21/11/2025 11:00
      - [👁️ Ver] [✅ Aprobar] [❌ Rechazar]
   
   3. 🔵 Licencia - Juan Pérez (Transp. Gómez)
      - Subido: 20/11/2025 16:45
      - [👁️ Ver] [✅ Aprobar] [❌ Rechazar]

4. Revisa y aprueba:
   - Click en "Ver" documento DNI de María López
   - Modal muestra:
     - Vista previa del documento
     - Datos del formulario al lado
   - Documento es legible y correcto
   - Click en "Aprobar"
   - ✅ Documento aprobado
   - Notificación enviada a María López

5. Rechaza documento incorrecto:
   - Click en "Ver" RTO Camión AB123CD
   - Documento está vencido (fecha incorrecta)
   - Click en "Rechazar"
   - Modal de rechazo:
     - Motivo: ☑️ Documento vencido
     - Comentario: "El RTO cargado ya está vencido. Por favor cargar el nuevo RTO."
   - ✅ Documento rechazado
   - Notificación enviada al transportista

6. Aprobación masiva:
   - Selecciona 5 documentos revisados
   - Click en "Aprobar seleccionados"
   - ✅ 5 documentos aprobados en lote

7. Búsqueda por patentes:
   - Pega 20 patentes
   - Sistema busca en sus equipos
   - 18 encontrados / 2 no encontrados
   - Descarga ZIP de los 18

8. Crea nuevo equipo:
   - Selecciona dador: (automático - el suyo)
   - Empresa: Transportes Nuevos S.A.
   - Chofer: Pedro Ruiz (nuevo)
   - Camión: MN345OP (nuevo)
   - Acoplado: QR678ST (nuevo)
   - Cliente: PROSIL S.A.
   - ✅ Equipo creado
   - Pendiente: Subir 19 documentos
```

**Límites**:
- Solo ve SU dador
- No ve equipos de otros dadores
- Búsqueda: 50 patentes máximo
- ZIP: 50 equipos máximo

---

### Caso 5: ADMIN - Quebracho Blanco 🔧

**Contexto**: Administrador del tenant con acceso total.

**Flujo de trabajo típico**:

```
1. Ingresa al panel de administración
   → URL: https://app.bca.com/admin

2. Dashboard muestra:
   📊 Resumen General - Quebracho Blanco:
   - 120 equipos activos (todos los dadores)
   - 8 dadores de carga
   - 15 empresas transportistas
   - 45 clientes
   - 80 choferes
   
   🔵 Pendientes Totales:
   - 35 documentos en cola de aprobación

3. Ayuda a un dador con problemas:
   - Recibe llamado: "Leandro Castro no puede aprobar un documento"
   - Selector de dador: [Leandro Castro ▼]
   - Ve documentos pendientes del dador
   - Encuentra el documento problemático
   - Lo aprueba en nombre del dador
   - ✅ Problema resuelto

4. Genera reporte global:
   - Selecciona todos los dadores
   - Filtro: Equipos con documentos vencidos
   - Resultado: 15 equipos con problemas
   - Descarga Excel con detalle
   - Envía email a cada dador responsable

5. Crea nuevo cliente:
   - Nombre: ACEITERA DEL NORTE S.A.
   - CUIT: 30-71234567-8
   - Contacto: contacto@aceitera.com
   - Requisitos especiales: [Configura]
   - ✅ Cliente creado

6. Asigna equipos al nuevo cliente:
   - Busca 10 equipos aptos (verde)
   - Asigna masivamente al nuevo cliente
   - ✅ 10 equipos asignados

7. Configura nuevo template de documentos:
   - Nombre: "Certificado de Fumigación"
   - Aplica a: Acoplados
   - Obligatorio: Sí
   - Vencimiento: Anual
   - ✅ Template creado

8. Crea nuevo dador:
   - Nombre: "Coordinadora de Fletes S.R.L."
   - CUIT: 30-98765432-1
   - Contacto: admin@coordinadora.com
   - ✅ Dador creado
   - Crea usuario para el dador
   - Rol: DADOR_DE_CARGA
   - Metadata: { dadorCargaId: 9 }
```

**Sin límites**:
- Ve TODO
- Gestiona TODO
- Puede ayudar a cualquier dador

---

### Caso 6: OPERATOR - Personal Operativo 👨‍💼

**Contexto**: Personal que realiza carga de datos del día a día.

**Flujo de trabajo típico**:

```
1. Ingresa al sistema
   → URL: https://app.bca.com/app

2. Recibe lista de equipos nuevos para cargar:
   - 5 equipos de diferentes dadores
   - Excel con datos de choferes, camiones, etc.

3. Carga masiva con IA:
   - Sube carpeta con 95 documentos escaneados
   - IA procesa y extrae datos automáticamente
   - Revisa sugerencias de la IA
   - Corrige datos erróneos
   - Aprueba sugerencias correctas
   - ✅ 95 documentos cargados en 30 minutos

4. Crea equipos manualmente:
   - Dador: Leandro Castro
   - Empresa: Transportes Nuevos
   - Chofer: DNI 44556677
   - Camión: ZZ999XX
   - Acoplado: AA111BB
   - ✅ Equipo creado

5. Búsqueda global por patentes:
   - Busca: "AB123CD" (sin filtro de dador)
   - Resultado: Encontrado en Dador "Leandro Castro"
   - Ve todos los datos

6. Modifica equipo de otro dador:
   - Dador: "Coordinadora de Fletes"
   - Equipo: CC456DD
   - Cambio: Actualiza chofer
   - ✅ Equipo modificado

7. No puede eliminar:
   - Intenta eliminar equipo
   - ❌ Error: "No tienes permisos para eliminar"

8. No puede aprobar:
   - Ve documentos pendientes
   - Botones de aprobar/rechazar deshabilitados
   - ℹ️ "Solo ADMIN puede aprobar"
```

**Límites**:
- No puede eliminar
- No puede aprobar documentos
- No puede gestionar clientes
- No puede modificar configuración

---

### Caso 7: CHOFER con alta autonomía - María López 👨‍✈️

**Contexto**: Chofer experimentado que gestiona su equipo activamente.

**Flujo de trabajo típico**:

```
1. Recibe notificación por WhatsApp:
   📱 "Tu seguro de vida vence en 15 días"

2. Ingresa al portal móvil:
   → URL: https://app.bca.com/portal/chofer (mobile)

3. Ve estado de su equipo:
   - 🟡 Por vencer: 2 documentos
   - ⚠️ Seguro de Vida (vence 06/12/2025)
   - ⚠️ RTO Acoplado (vence 10/12/2025)

4. Desde su celular:
   - Toma foto del nuevo seguro de vida
   - Sube directamente desde el móvil
   - Fecha vencimiento: 06/12/2026
   - ✅ Documento subido

5. Actualiza RTO del acoplado:
   - Está en el taller mecánico
   - Técnico le pasa el RTO nuevo
   - Saca foto con el celular
   - Sube documento
   - ✅ Documento subido

6. Actualiza datos de contacto:
   - Cambió de celular
   - Nuevo: +54 9 341 555-9999
   - Email: marialopez@email.com
   - ✅ Datos actualizados

7. Ve historial de su equipo:
   - 23 documentos aprobados
   - 2 documentos rechazados en el pasado
   - Último rechazo: Licencia (foto borrosa) - 15/10/2025

8. Equipo actualizado:
   - Estado: 🔵 Pendiente de aprobación
   - 2 documentos esperando revisión
   - Resto al día

9. Recibe notificación:
   ✉️ "Tu Seguro de Vida ha sido aprobado ✅"
   ✉️ "RTO del acoplado ha sido aprobado ✅"

10. Equipo actualizado:
    - 🟢 Equipo completo y al día
    - Sin alertas
```

---

## 🏛️ Jerarquía de Roles {#jerarquia-de-roles}

### Pirámide de Acceso

```
                    SUPERADMIN 👑
                    (Acceso TOTAL)
                          ▲
                          │
                    ┌─────┴─────┐
                    │   ADMIN   │
                    │  (Tenant) │
                    └─────┬─────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
      ┌─────▼─────┐ ┌────▼────┐ ┌─────▼──────┐
      │  OPERATOR │ │  ADMIN  │ │   DADOR    │
      │           │ │ INTERNO │ │  DE CARGA  │
      └─────┬─────┘ └────┬────┘ └─────┬──────┘
            │            │             │
            │            │       ┌─────▼────────┐
            │            │       │ TRANSPORTISTA│
            │            │       └─────┬────────┘
            │            │             │
            │            │        ┌────▼────┐
            │            │        │  CHOFER │
            │            │        └─────────┘
            │            │
            └────────────┴─────────────┐
                                       │
                                ┌──────▼──────┐
                                │   CLIENTE   │
                                │ (Read Only) │
                                └─────────────┘
```

---

### Niveles de Privilegio

| Nivel | Roles | Descripción |
|-------|-------|-------------|
| **Nivel 1** | SUPERADMIN | Dios mode - Todo sin restricciones |
| **Nivel 2** | ADMIN | Control total del tenant |
| **Nivel 3** | ADMIN_INTERNO, OPERATOR | Operaciones amplias con límites |
| **Nivel 4** | DADOR_DE_CARGA | Gestión completa de su scope |
| **Nivel 5** | TRANSPORTISTA | Gestión de su empresa |
| **Nivel 6** | CHOFER | Gestión de su equipo individual |
| **Nivel 7** | CLIENTE | Solo lectura |

---

### Flujo de Escalamiento

```
CHOFER tiene problema
    ↓
Contacta a TRANSPORTISTA
    ↓
Si no puede resolver → Contacta a DADOR_DE_CARGA
    ↓
Si no puede resolver → Contacta a ADMIN/OPERATOR
    ↓
Si no puede resolver → Contacta a SUPERADMIN
```

---

## 💻 Implementación Técnica {#implementacion-tecnica}

### Enum de Roles

```typescript
// apps/documentos/src/types/roles.ts

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  OPERADOR_INTERNO = 'OPERADOR_INTERNO',
  ADMIN_INTERNO = 'ADMIN_INTERNO',
  DADOR_DE_CARGA = 'DADOR_DE_CARGA',
  TRANSPORTISTA = 'TRANSPORTISTA',
  CHOFER = 'CHOFER',
  CLIENTE = 'CLIENTE',
  USER = 'USER', // Deprecated
}
```

---

### Estructura de JWT

#### SUPERADMIN
```json
{
  "userId": 1,
  "email": "admin@microsyst.com",
  "role": "SUPERADMIN",
  "empresaId": null,
  "iat": 1700000000,
  "exp": 1700003600
}
```

#### ADMIN
```json
{
  "userId": 2,
  "email": "admin@quebrachoblanco.com",
  "role": "ADMIN",
  "empresaId": 1,
  "tenantId": 1,
  "iat": 1700000000,
  "exp": 1700003600
}
```

#### DADOR_DE_CARGA
```json
{
  "userId": 5,
  "email": "leandro@castro.com",
  "role": "DADOR_DE_CARGA",
  "empresaId": 1,
  "tenantId": 1,
  "metadata": {
    "dadorCargaId": 5,
    "dadorNombre": "Leandro Castro Logística"
  },
  "iat": 1700000000,
  "exp": 1700003600
}
```

#### TRANSPORTISTA
```json
{
  "userId": 10,
  "email": "admin@transportesperez.com",
  "role": "TRANSPORTISTA",
  "empresaId": 1,
  "tenantId": 1,
  "metadata": {
    "type": "empresa",
    "empresaTransportistaId": 15,
    "empresaNombre": "Transportes Pérez S.A.",
    "dadorCargaId": 5
  },
  "iat": 1700000000,
  "exp": 1700003600
}
```

#### CHOFER
```json
{
  "userId": 25,
  "email": "juanperez@email.com",
  "role": "CHOFER",
  "empresaId": 1,
  "tenantId": 1,
  "metadata": {
    "type": "chofer",
    "choferId": 40,
    "choferDni": "12345678",
    "choferDniNorm": "12345678",
    "choferNombre": "Juan Pérez"
  },
  "iat": 1700000000,
  "exp": 1700003600
}
```

#### CLIENTE
```json
{
  "userId": 50,
  "email": "consultas@prosil.com.ar",
  "role": "CLIENTE",
  "empresaId": 1,
  "tenantId": 1,
  "metadata": {
    "clienteId": 3,
    "clienteNombre": "PROSIL S.A.",
    "clienteCuit": "30-12345678-9"
  },
  "iat": 1700000000,
  "exp": 1700003600
}
```

---

### Middleware de Autorización

#### authorize.ts - Básico por Rol

```typescript
// apps/documentos/src/middlewares/authorize.ts

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth.types';
import { UserRole } from '../types/roles';

export const authorize = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    // SUPERADMIN siempre tiene acceso
    if (userRole === UserRole.SUPERADMIN) {
      next();
      return;
    }

    if (!allowedRoles.includes(userRole as UserRole)) {
      res.status(403).json({
        success: false,
        message: 'No tienes permisos para esta acción',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    next();
  };
};
```

---

#### authorizeDador.ts - Control por Dador

```typescript
// apps/documentos/src/middlewares/authorizeDador.ts

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth.types';
import { UserRole } from '../types/roles';

export const authorizeDador = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const user = req.user;
  const targetDadorId = Number(
    req.params.dadorId || req.body.dadorCargaId || req.query.dadorCargaId
  );

  // ✅ SUPERADMIN y ADMIN: acceso TOTAL
  if (user.role === UserRole.SUPERADMIN || user.role === UserRole.ADMIN) {
    next();
    return;
  }

  // ✅ OPERATOR y ADMIN_INTERNO: acceso amplio según endpoint
  if (
    user.role === UserRole.OPERATOR ||
    user.role === UserRole.ADMIN_INTERNO ||
    user.role === UserRole.OPERADOR_INTERNO
  ) {
    next();
    return;
  }

  // 🟢 DADOR_CARGA: SOLO su propio dadorCargaId
  if (user.role === UserRole.DADOR_DE_CARGA) {
    const userDadorId = user.metadata?.dadorCargaId;

    if (!userDadorId) {
      res.status(403).json({
        success: false,
        message: 'Usuario sin dador asociado',
        code: 'NO_DADOR_ASSOCIATED',
      });
      return;
    }

    // Si no se especificó dadorId, inyectar el del usuario
    if (!targetDadorId) {
      req.body.dadorCargaId = userDadorId;
      if (req.query) {
        req.query.dadorCargaId = String(userDadorId);
      }
      next();
      return;
    }

    // Validar que el dadorId coincida
    if (userDadorId !== targetDadorId) {
      res.status(403).json({
        success: false,
        message: 'Acceso denegado al dador solicitado',
        code: 'DADOR_ACCESS_DENIED',
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
    code: 'INSUFFICIENT_PERMISSIONS',
  });
};
```

---

#### authorizeTransportista.ts - Control por Empresa

```typescript
// apps/documentos/src/middlewares/authorizeTransportista.ts

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth.types';
import { UserRole } from '../types/roles';

export const authorizeTransportista = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const user = req.user;

  // ✅ Roles administrativos: acceso total
  if (
    [
      UserRole.SUPERADMIN,
      UserRole.ADMIN,
      UserRole.ADMIN_INTERNO,
      UserRole.OPERATOR,
      UserRole.OPERADOR_INTERNO,
      UserRole.DADOR_DE_CARGA,
    ].includes(user.role as UserRole)
  ) {
    next();
    return;
  }

  // 🟢 TRANSPORTISTA: solo acceso a SUS datos
  if (user.role === UserRole.TRANSPORTISTA) {
    const empresaTransportistaId = user.metadata?.empresaTransportistaId;

    if (!empresaTransportistaId) {
      res.status(403).json({
        success: false,
        message: 'Usuario sin empresa asociada',
        code: 'NO_EMPRESA_ASSOCIATED',
      });
      return;
    }

    // Inyectar filtros automáticamente
    req.transportistaId = empresaTransportistaId;
    
    next();
    return;
  }

  // 🟢 CHOFER: solo acceso a SU equipo
  if (user.role === UserRole.CHOFER) {
    const choferId = user.metadata?.choferId;
    const choferDni = user.metadata?.choferDni;

    if (!choferId && !choferDni) {
      res.status(403).json({
        success: false,
        message: 'Usuario sin chofer asociado',
        code: 'NO_CHOFER_ASSOCIATED',
      });
      return;
    }

    // Inyectar filtros
    req.choferId = choferId;
    req.choferDni = choferDni;
    
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: 'Permisos insuficientes',
    code: 'INSUFFICIENT_PERMISSIONS',
  });
};
```

---

#### authorizeCliente.ts - Control por Cliente

```typescript
// apps/documentos/src/middlewares/authorizeCliente.ts

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth.types';
import { UserRole } from '../types/roles';

export const authorizeCliente = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const user = req.user;
  const targetClienteId = Number(req.params.clienteId || req.query.clienteId);

  // ✅ Roles administrativos: acceso total
  if (
    [
      UserRole.SUPERADMIN,
      UserRole.ADMIN,
      UserRole.ADMIN_INTERNO,
      UserRole.OPERATOR,
      UserRole.OPERADOR_INTERNO,
    ].includes(user.role as UserRole)
  ) {
    next();
    return;
  }

  // 🟢 CLIENTE: solo sus equipos asignados
  if (user.role === UserRole.CLIENTE) {
    const userClienteId = user.metadata?.clienteId;

    if (!userClienteId) {
      res.status(403).json({
        success: false,
        message: 'Usuario sin cliente asociado',
        code: 'NO_CLIENTE_ASSOCIATED',
      });
      return;
    }

    // Si no se especificó clienteId, inyectar el del usuario
    if (!targetClienteId) {
      req.body.clienteId = userClienteId;
      if (req.query) {
        req.query.clienteId = String(userClienteId);
      }
      next();
      return;
    }

    // Validar que el clienteId coincida
    if (userClienteId !== targetClienteId) {
      res.status(403).json({
        success: false,
        message: 'Acceso denegado al cliente solicitado',
        code: 'CLIENTE_ACCESS_DENIED',
      });
      return;
    }

    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: 'Permisos insuficientes',
    code: 'INSUFFICIENT_PERMISSIONS',
  });
};
```

---

### Ejemplo de Rutas con Middleware

```typescript
// apps/documentos/src/routes/equipos.routes.ts

import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { authorizeDador } from '../middlewares/authorizeDador';
import { authorizeTransportista } from '../middlewares/authorizeTransportista';
import { UserRole } from '../types/roles';
import { EquipoController } from '../controllers/equipo.controller';

const router = Router();

// Listar equipos de un dador (ADMIN, OPERATOR, DADOR)
router.get(
  '/dadores/:dadorId/equipos',
  authenticate,
  authorizeDador,
  EquipoController.listByDador
);

// Crear equipo (ADMIN, OPERATOR, DADOR, TRANSPORTISTA)
router.post(
  '/equipos',
  authenticate,
  authorize([
    UserRole.ADMIN,
    UserRole.ADMIN_INTERNO,
    UserRole.OPERATOR,
    UserRole.OPERADOR_INTERNO,
    UserRole.DADOR_DE_CARGA,
    UserRole.TRANSPORTISTA,
  ]),
  authorizeDador,
  EquipoController.create
);

// Listar equipos del transportista
router.get(
  '/transportistas/mis-equipos',
  authenticate,
  authorizeTransportista,
  EquipoController.listByTransportista
);

// Listar equipos del cliente
router.get(
  '/clientes/:clienteId/equipos',
  authenticate,
  authorize([UserRole.CLIENTE, UserRole.ADMIN, UserRole.ADMIN_INTERNO]),
  authorizeCliente,
  EquipoController.listByCliente
);

// Eliminar equipo (solo ADMIN)
router.delete(
  '/equipos/:id',
  authenticate,
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.ADMIN_INTERNO]),
  EquipoController.delete
);

export default router;
```

---

## 📋 Reglas de Negocio {#reglas-de-negocio}

### Regla 1: Un chofer, un equipo
> **Un chofer solo puede estar en 1 equipo a la vez.**

```typescript
// Al crear un equipo con un chofer:
// 1. Verificar si el chofer tiene un equipo activo
// 2. Si existe, finalizar el equipo anterior (validTo = NOW())
// 3. Crear el nuevo equipo con validFrom = NOW()
```

---

### Regla 2: Equipos multi-cliente
> **Un equipo puede trabajar para múltiples clientes simultáneamente.**

```typescript
// Tabla: equipo_clientes
// Permite N:M entre equipos y clientes
// Un equipo puede tener múltiples registros activos
```

---

### Regla 3: Identificadores únicos
> **Cada entidad se identifica por clave única.**

- **Empresa Transportista** → CUIT (único)
- **Chofer** → DNI (único)
- **Camión** → Patente (única, normalizada)
- **Acoplado** → Patente (única, normalizada)
- **Equipo** → Combinación única de los 4

---

### Regla 4: El chofer NO puede auto-asignarse
> **El chofer NO puede auto-asignarse a otro equipo.**

Solo pueden asignar choferes:
- TRANSPORTISTA
- DADOR_DE_CARGA
- ADMIN / ADMIN_INTERNO
- OPERATOR

---

### Regla 5: Clientes = Solo lectura
> **Los clientes tienen acceso de SOLO LECTURA.**

Ninguna operación de escritura permitida:
- ❌ No puede crear equipos
- ❌ No puede modificar datos
- ❌ No puede subir documentos
- ❌ No puede aprobar documentos
- ✅ Solo puede ver y descargar

---

### Regla 6: Filtros temporales en ZIP
> **Los clientes pueden descargar documentación con filtros temporales.**

Opciones:
1. Toda la documentación
2. Solo docs renovados en última semana
3. Solo docs renovados en última quincena
4. Solo docs renovados en último mes
5. Solo docs renovados en último año

---

### Regla 7: Aprobación según rol cargador
> **Estado inicial del documento según quién lo carga.**

- **ADMIN_INTERNO** carga → APROBADO (auto-aprobado)
- **DADOR_DE_CARGA** carga → PENDIENTE_APROBACION o APROBADO (configurable)
- **TRANSPORTISTA** carga → PENDIENTE_APROBACION
- **CHOFER** carga → PENDIENTE_APROBACION

---

### Regla 8: Límites por rol
> **Límites en operaciones masivas según rol.**

| Operación | ADMIN | DADOR | TRANSPORTISTA | CLIENTE |
|-----------|-------|-------|---------------|---------|
| Búsqueda por patentes | Sin límite | 50 | 20 | 50 |
| Descarga ZIP (equipos) | Sin límite | 50 | 20 | 50 |
| Rate limit (req/min) | 500 | 200 | 100 | 100 |

---

### Regla 9: Tenant aislamiento
> **Aislamiento estricto por tenant.**

- Usuarios solo pueden acceder a datos de su tenant
- SUPERADMIN es el único cross-tenant
- Validación en TODAS las queries: `tenantEmpresaId = req.tenantId`

---

### Regla 10: Soft delete
> **Eliminación lógica de registros.**

- Equipos: `isDeleted = true`, `deletedAt = NOW()`
- Documentos: Mantener historial completo (nunca eliminar físicamente)
- Auditoría: Registrar quién eliminó y cuándo

---

## 🎯 Conclusión

Este documento define completamente el sistema de roles y permisos del sistema de gestión de equipos de transporte.

### Próximos Pasos

1. ✅ **Revisar y aprobar** esta especificación
2. ⏭️ **Implementar** middlewares y servicios
3. ⏭️ **Crear tests** de seguridad para cada rol
4. ⏭️ **Implementar** portales específicos por rol
5. ⏭️ **Documentar** APIs por rol

---

**Fecha de Documento**: 21 de Noviembre, 2025  
**Versión**: 1.0  
**Estado**: ✅ Completo y Listo para Implementación

---

## 📞 Referencias

- [PERMISOS_Y_ROLES_SISTEMA.md](./PERMISOS_Y_ROLES_SISTEMA.md)
- [LISTADO_FUNCIONALIDADES_REQUERIDAS.md](./LISTADO_FUNCIONALIDADES_REQUERIDAS.md)
- [ESPECIFICACION_PANTALLA_CARGA_ADMIN_EXTERNO.md](./ESPECIFICACION_PANTALLA_CARGA_ADMIN_EXTERNO.md)
- [RESUMEN_SOLUCION_COMPROMISO.md](./RESUMEN_SOLUCION_COMPROMISO.md)

