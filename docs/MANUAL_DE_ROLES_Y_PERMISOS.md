# Manual de Roles y Permisos - Sistema BCA Documentos

> **Versión:** 1.0  
> **Fecha:** 15 de Diciembre de 2025  
> **Sistema:** BCA Group - Gestión Documental de Transporte

---

## Índice

1. [Introducción](#introducción)
2. [Roles del Sistema](#roles-del-sistema)
3. [SUPERADMIN](#1-superadmin)
4. [ADMIN](#2-admin)
5. [ADMIN INTERNO](#3-admin-interno)
6. [DADOR DE CARGA](#4-dador-de-carga)
7. [TRANSPORTISTA](#5-transportista)
8. [CHOFER](#6-chofer)
9. [CLIENTE](#7-cliente)
10. [Matriz de Permisos](#matriz-de-permisos)

---

## Introducción

Este manual describe las acciones que puede realizar cada tipo de usuario en el sistema BCA Documentos. El sistema gestiona la documentación de equipos de transporte (chofer + camión + acoplado) para garantizar el cumplimiento normativo.

**URL de acceso:** `https://bca-group.microsyst.com.ar`

---

## Roles del Sistema

| Rol | Descripción | Portal de Acceso |
|-----|-------------|------------------|
| SUPERADMIN | Administrador global del sistema | `/documentos` |
| ADMIN | Administrador de empresa (tenant) | `/documentos` |
| ADMIN_INTERNO | Operador interno de BCA | `/portal/admin-interno` |
| DADOR_DE_CARGA | Empresa que contrata transporte | `/dador` |
| TRANSPORTISTA | Empresa de transporte | `/transportista` |
| CHOFER | Conductor de vehículos | `/chofer` |
| CLIENTE | Empresa que recibe mercadería | `/cliente` |

---

## 1. SUPERADMIN

### Descripción
Rol con acceso total al sistema. Puede gestionar todas las empresas (tenants), usuarios y configuraciones.

### Acceso
- **URL:** `https://bca-group.microsyst.com.ar/documentos`
- **Dashboard:** Panel completo con estadísticas globales

### Acciones Disponibles

#### 1.1 Gestión de Empresas (Tenants)
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver empresas** | Menú → Empresas → Se muestra lista de todas las empresas |
| **Crear empresa** | Menú → Empresas → Botón "Nueva Empresa" → Completar formulario (nombre, CUIT, dirección) → Guardar |
| **Editar empresa** | Lista de empresas → Clic en "Editar" → Modificar datos → Guardar |
| **Eliminar empresa** | Lista de empresas → Clic en "Eliminar" → Confirmar |

#### 1.2 Gestión de Usuarios de Plataforma
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver usuarios** | Menú → Usuarios de Plataforma → Lista paginada con búsqueda |
| **Buscar usuario** | Escribir en campo de búsqueda (email, nombre, apellido o rol) → Enter |
| **Crear usuario ADMIN** | Botón "Crear Usuario" → Seleccionar rol "ADMIN" → Seleccionar empresa → Completar email, nombre, apellido → Guardar |
| **Crear usuario ADMIN_INTERNO** | Botón "Crear Usuario" → Seleccionar rol "ADMIN_INTERNO" → Completar datos → Guardar |
| **Crear usuario CLIENTE** | Botón "Crear Usuario" → Seleccionar rol "CLIENTE" → Opcionalmente crear Cliente nuevo → Guardar → Anotar contraseña temporal mostrada |
| **Editar usuario** | Clic en "Editar" en la fila del usuario → Modificar datos → Guardar |
| **Activar/Desactivar usuario** | Clic en "Desactivar" (rojo) o "Activar" (verde) → El usuario no podrá/podrá iniciar sesión |
| **Eliminar usuario** | Clic en "Eliminar" → Confirmar (acción irreversible) |

#### 1.3 Gestión de Dadores de Carga
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver dadores** | Menú → Dadores de Carga → Lista completa |
| **Crear dador** | Botón "Nuevo Dador" → Completar: Razón Social, CUIT, dirección, email → Guardar |
| **Editar dador** | Clic en dador → Editar → Modificar → Guardar |

#### 1.4 Gestión de Clientes
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver clientes** | Menú → Clientes → Lista con filtro por dador |
| **Crear cliente** | Botón "Nuevo Cliente" → Completar datos → Guardar |
| **Configurar requisitos** | Clic en cliente → Requisitos → Agregar/Quitar plantillas de documentos requeridos |

#### 1.5 Gestión de Equipos
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver equipos** | Menú → Consulta → Filtrar por dador, cliente, empresa transportista, DNI, patente |
| **Crear equipo** | Menú → Equipos → Nuevo Equipo → Completar (dador, transportista, chofer, camión, acoplado) → Guardar |
| **Editar equipo** | Consulta → Buscar equipo → "Editar" → Cambiar chofer/camión/acoplado → Guardar |
| **Activar/Desactivar equipo** | Consulta → "Desactivar" o "Activar" → El equipo deja/vuelve de aparecer para clientes |
| **Eliminar equipo** | Consulta → "Eliminar" → Confirmar |
| **Ver estado documental** | Consulta → "Ver estado" → Semáforo de cumplimiento |
| **Descargar documentación** | Consulta → "Bajar documentación" → Descarga ZIP con docs vigentes |

#### 1.6 Gestión de Documentos
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver cola de aprobación** | Menú → Aprobación → Lista de documentos pendientes de revisión |
| **Aprobar documento** | Cola de aprobación → Seleccionar → Revisar → "Aprobar" |
| **Rechazar documento** | Cola de aprobación → Seleccionar → "Rechazar" → Escribir motivo → Confirmar |
| **Solicitar corrección** | Cola de aprobación → "Solicitar Corrección" → Indicar qué corregir |

#### 1.7 Gestión de Plantillas de Documentos
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver plantillas** | Menú → Plantillas → Lista de tipos de documentos |
| **Crear plantilla** | Botón "Nueva Plantilla" → Nombre, tipo entidad, vencimiento, obligatoriedad → Guardar |
| **Editar plantilla** | Clic en plantilla → Editar → Modificar → Guardar |

#### 1.8 Gestión de Servicios (Microservicios)
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver servicios** | Menú → Configuración → Servicios |
| **Habilitar/Deshabilitar** | Toggle en cada servicio → Activa/desactiva funcionalidad |

---

## 2. ADMIN

### Descripción
Administrador de una empresa específica (tenant). Gestiona usuarios y recursos dentro de su empresa.

### Acceso
- **URL:** `https://bca-group.microsyst.com.ar/documentos`
- **Limitación:** Solo ve datos de su empresa (tenant)

### Acciones Disponibles

#### 2.1 Gestión de Usuarios (dentro de su empresa)
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver usuarios de mi empresa** | Menú → Usuarios de Plataforma → Lista filtrada por empresa |
| **Crear usuario (roles menores)** | Botón "Crear Usuario" → Solo puede crear roles: ADMIN_INTERNO, DADOR_DE_CARGA, TRANSPORTISTA, CHOFER, CLIENTE |
| **Editar usuario** | Clic en "Editar" → Modificar → Guardar |
| **Activar/Desactivar usuario** | Clic en botón correspondiente |

#### 2.2 Gestión de Dadores, Clientes, Equipos
*Mismas acciones que SUPERADMIN pero limitadas a su tenant.*

#### 2.3 Aprobación de Documentos
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver cola de aprobación** | Menú → Aprobación |
| **Aprobar/Rechazar** | Misma operatoria que SUPERADMIN |

---

## 3. ADMIN INTERNO

### Descripción
Operador interno de BCA que gestiona la operación diaria sin acceso a configuración de empresas.

### Acceso
- **URL:** `https://bca-group.microsyst.com.ar/portal/admin-interno`
- **Dashboard:** Panel operativo con equipos y documentos

### Acciones Disponibles

#### 3.1 Gestión de Usuarios
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver usuarios** | Menú → Usuarios → Lista paginada |
| **Crear usuarios** | Puede crear: DADOR_DE_CARGA, TRANSPORTISTA, CHOFER, CLIENTE |
| **Editar usuarios** | Modificar nombre, apellido, contraseña |
| **Activar/Desactivar** | Toggle de estado |

#### 3.2 Gestión de Equipos
| Acción | Cómo hacerlo |
|--------|--------------|
| **Consultar equipos** | Menú → Consulta → Filtros por dador, cliente, transportista |
| **Crear equipos** | Menú → Equipos → Nuevo → Alta completa o mínima |
| **Editar equipos** | Cambiar chofer, camión, acoplado, transportista |
| **Activar/Desactivar** | Cambiar estado sin eliminar |
| **Eliminar** | Eliminación definitiva |

#### 3.3 Gestión de Maestros
| Acción | Cómo hacerlo |
|--------|--------------|
| **Crear camión** | Durante edición de equipo → "+" junto a Camión → Completar patente, marca → Guardar |
| **Crear acoplado** | Durante edición de equipo → "+" junto a Acoplado → Completar patente → Guardar |
| **Ver choferes** | Lista automática del transportista seleccionado |

#### 3.4 Aprobación de Documentos
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver pendientes** | Panel principal muestra documentos a revisar |
| **Aprobar** | Clic en documento → Revisar → Aprobar |
| **Rechazar** | Clic en documento → Rechazar → Escribir motivo |

#### 3.5 Gestión de Clientes y Dadores
| Acción | Cómo hacerlo |
|--------|--------------|
| **Crear cliente** | Menú → Clientes → Nuevo |
| **Crear dador** | Menú → Dadores → Nuevo |
| **Configurar requisitos** | Cliente → Requisitos → Agregar plantillas |

---

## 4. DADOR DE CARGA

### Descripción
Empresa que contrata servicios de transporte. Gestiona sus propios transportistas, equipos y documentación.

### Acceso
- **URL:** `https://bca-group.microsyst.com.ar/dador`
- **Dashboard:** Vista de equipos propios y su estado documental

### Acciones Disponibles

#### 4.1 Gestión de Usuarios (limitada)
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver usuarios propios** | Menú → Usuarios → Solo ve transportistas y choferes que creó |
| **Crear transportista** | Usuarios → Crear → Rol "TRANSPORTISTA" → Completar datos + crear empresa transportista → Guardar |
| **Crear chofer** | Usuarios → Crear → Rol "CHOFER" → Seleccionar transportista → Completar datos → Guardar |
| **Editar usuario** | Solo puede modificar: nombre, apellido, contraseña |
| **Activar/Desactivar** | Toggle de estado |

#### 4.2 Gestión de Equipos
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver mis equipos** | Dashboard muestra equipos de mi dador |
| **Consultar equipos** | Menú → Consulta → Búsqueda por DNI, patente |
| **Crear equipo** | Equipos → Nuevo → Seleccionar transportista de mi red → Completar datos |
| **Editar equipo** | Puede cambiar: chofer, camión, acoplado (dentro de sus transportistas) |
| **Activar/Desactivar** | Toggle sin eliminar |
| **Eliminar** | Eliminación definitiva |
| **Ver estado** | Semáforo de cumplimiento documental |
| **Descargar docs** | ZIP con documentación vigente |

#### 4.3 Gestión de Empresas Transportistas
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver transportistas** | Lista de empresas transportistas de mi dador |
| **Crear transportista** | Durante alta de equipo → "+" → Completar CUIT, razón social |

#### 4.4 Gestión de Clientes
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver clientes** | Lista de clientes asociados a mi dador |
| **Crear cliente** | Clientes → Nuevo → Completar datos |
| **Configurar requisitos** | Cliente → Requisitos → Agregar/quitar documentos requeridos |
| **Asignar equipo a cliente** | Equipo → Editar → Agregar cliente |

#### 4.5 Subida de Documentos
| Acción | Cómo hacerlo |
|--------|--------------|
| **Subir documento** | Estado del equipo → Documento faltante → "Subir" → Seleccionar archivo → Guardar |
| **Ver historial** | Documento → "Historial" → Versiones anteriores |

---

## 5. TRANSPORTISTA

### Descripción
Empresa de transporte que gestiona sus choferes y documentación de vehículos.

### Acceso
- **URL:** `https://bca-group.microsyst.com.ar/transportista`
- **Dashboard:** Vista de mis entidades y documentos pendientes

### Acciones Disponibles

#### 5.1 Gestión de Usuarios (muy limitada)
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver mis choferes** | Dashboard → Mis Entidades → Choferes |
| **Crear chofer** | Usuarios → Crear → Rol "CHOFER" → Email, nombre, apellido, DNI → Guardar → Anotar contraseña temporal |
| **Editar chofer** | Solo: nombre, apellido, contraseña |
| **Activar/Desactivar chofer** | Toggle de estado |

#### 5.2 Ver Mis Entidades
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver choferes** | Dashboard → Sección "Choferes" → Lista con DNI, nombre |
| **Ver camiones** | Dashboard → Sección "Camiones" → Lista con patente, marca |
| **Ver acoplados** | Dashboard → Sección "Acoplados" → Lista con patente |

#### 5.3 Gestión de Equipos (limitada)
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver equipos** | Menú → Consulta → Equipos de mi empresa transportista |
| **Activar/Desactivar equipo** | Toggle (no puede crear ni eliminar) |
| **Ver estado documental** | Semáforo por equipo |

#### 5.4 Subida de Documentos
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver documentos rechazados** | Dashboard → "Rechazados" → Lista de docs a corregir |
| **Ver documentos pendientes** | Dashboard → "Pendientes" → En proceso de revisión |
| **Subir documento** | Entidad → Documento → "Subir" → Seleccionar archivo → Confirmar |
| **Reemplazar documento** | Documento rechazado → "Corregir" → Subir nueva versión |

#### 5.5 Creación de Vehículos
| Acción | Cómo hacerlo |
|--------|--------------|
| **Crear camión** | Durante edición de equipo → "+" junto a Camión → Patente, marca → Guardar |
| **Crear acoplado** | Durante edición de equipo → "+" junto a Acoplado → Patente → Guardar |

---

## 6. CHOFER

### Descripción
Conductor de vehículos. Acceso de solo lectura con capacidad de subir sus propios documentos.

### Acceso
- **URL:** `https://bca-group.microsyst.com.ar/chofer`
- **Dashboard:** Vista de mis documentos y equipos asignados

### Acciones Disponibles

#### 6.1 Ver Información Personal
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver mi perfil** | Dashboard → Datos personales (DNI, nombre, empresa) |
| **Ver mis equipos** | Dashboard → Equipos donde estoy asignado |

#### 6.2 Gestión de Documentos (propia)
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver mis documentos** | Dashboard → Lista de documentos requeridos |
| **Subir documento** | Documento faltante → "Subir" → Seleccionar archivo desde celular/PC → Confirmar |
| **Ver estado** | Semáforo indica: ✅ Vigente, ⚠️ Por vencer, ❌ Vencido, ⬜ Faltante |
| **Ver documentos rechazados** | Notificación de rechazo → Ver motivo → Corregir y resubir |

#### 6.3 Ver Requisitos
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver requisitos de equipo** | Consulta → Mi equipo → "Ver estado" → Lista de documentos necesarios por cliente |

#### 6.4 Descargar Documentos
| Acción | Cómo hacerlo |
|--------|--------------|
| **Descargar documento propio** | Documento → "Descargar" → Se baja PDF/imagen |
| **Ver preview** | Documento → "Ver" → Visualización en navegador |

---

## 7. CLIENTE

### Descripción
Empresa que recibe mercadería. Portal de solo lectura para verificar estado documental de equipos habilitados.

### Acceso
- **URL:** `https://bca-group.microsyst.com.ar/cliente`
- **Dashboard:** Vista de equipos asignados con semáforo de cumplimiento
- **Restricción:** Solo ve equipos **activos** asignados a su empresa

### Acciones Disponibles

#### 7.1 Ver Resumen de Equipos
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver dashboard** | Al ingresar se muestra: Total equipos, Vigentes, Próx. a vencer, Vencidos, Incompletos |
| **Filtrar por estado** | Selector "Todos los estados" → Elegir: Vigente, Vencido, Incompleto, Próx. a vencer |

#### 7.2 Buscar Equipos
| Acción | Cómo hacerlo |
|--------|--------------|
| **Buscar por DNI** | Campo de búsqueda → Ingresar DNI del chofer → "Buscar" |
| **Buscar por patente** | Campo Patente Camión o Patente Acoplado → Ingresar → "Buscar" |
| **Listar todos** | Botón "Listar Todos" → Muestra todos los equipos asignados |
| **Búsqueda masiva** | "Buscar por DNIs o Patentes" → Pegar lista separada por | → Buscar |

#### 7.3 Ver Detalle de Equipo
| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver equipo** | Clic en "Ver docs" → Detalle con todos los documentos |
| **Ver documento** | Lista de documentos → Clic en documento → Preview |
| **Ver estado** | Semáforo: 🟢 Vigente, 🟡 Por vencer, 🔴 Vencido |

#### 7.4 Descargar Documentación
| Acción | Cómo hacerlo |
|--------|--------------|
| **Descargar un documento** | Detalle del equipo → Documento → "Descargar" |
| **Descargar todo el equipo** | Detalle del equipo → "Descargar ZIP" → Se baja archivo con todos los docs vigentes |
| **Descarga masiva** | Dashboard → "Bajar documentación vigente (ZIP)" → ZIP de todos los equipos filtrados |

#### 7.5 Limitaciones
| Lo que NO puede hacer |
|-----------------------|
| ❌ Crear equipos |
| ❌ Editar equipos |
| ❌ Subir documentos |
| ❌ Aprobar/Rechazar documentos |
| ❌ Crear usuarios |
| ❌ Ver equipos inactivos |

---

## Matriz de Permisos

### Gestión de Usuarios

| Acción | SUPER | ADMIN | ADMIN_INT | DADOR | TRANSP | CHOFER | CLIENTE |
|--------|:-----:|:-----:|:---------:|:-----:|:------:|:------:|:-------:|
| Ver todos los usuarios | ✅ | 🏢 | 🏢 | 👤 | 👤 | ❌ | ❌ |
| Crear ADMIN | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Crear ADMIN_INTERNO | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear DADOR_DE_CARGA | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear TRANSPORTISTA | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Crear CHOFER | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Crear CLIENTE | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar cualquier campo | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar nombre/apellido/pass | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Activar/Desactivar | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Leyenda:* ✅ = Total | 🏢 = Solo su empresa | 👤 = Solo usuarios que creó | ❌ = No permitido

### Gestión de Equipos

| Acción | SUPER | ADMIN | ADMIN_INT | DADOR | TRANSP | CHOFER | CLIENTE |
|--------|:-----:|:-----:|:---------:|:-----:|:------:|:------:|:-------:|
| Ver todos | ✅ | 🏢 | 🏢 | 📋 | 🚛 | 🚛 | 📋 |
| Crear | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editar | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Activar/Desactivar | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver estado documental | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Descargar documentación | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

*Leyenda:* 📋 = Solo de su dador/cliente | 🚛 = Solo de su transportista

### Gestión de Documentos

| Acción | SUPER | ADMIN | ADMIN_INT | DADOR | TRANSP | CHOFER | CLIENTE |
|--------|:-----:|:-----:|:---------:|:-----:|:------:|:------:|:-------:|
| Subir documentos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Aprobar | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Rechazar | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver/Descargar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Otras Entidades

| Acción | SUPER | ADMIN | ADMIN_INT | DADOR | TRANSP | CHOFER | CLIENTE |
|--------|:-----:|:-----:|:---------:|:-----:|:------:|:------:|:-------:|
| Crear Dador | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear Cliente | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Crear Emp. Transportista | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Crear Chofer (entidad) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Crear Camión | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Crear Acoplado | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Configurar requisitos cliente | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Notas Importantes

### Contraseña Temporal
Cuando se crea un usuario, el sistema genera una **contraseña temporal** que se muestra **una sola vez**. El usuario debe:
1. Iniciar sesión con esa contraseña
2. El sistema forzará el cambio de contraseña
3. Establecer una nueva contraseña personal

### Usuarios Inactivos
- Un usuario **desactivado** no puede iniciar sesión
- Sus datos se mantienen en el sistema
- Puede ser reactivado en cualquier momento

### Equipos Inactivos
- Un equipo **desactivado** no aparece para clientes
- Los administradores pueden verlo con el filtro "Solo Inactivos" o "Todos"
- Puede ser reactivado sin perder historial

### Jerarquía de Visibilidad
```
SUPERADMIN → ve TODO
     ↓
ADMIN → ve TODO de su empresa (tenant)
     ↓
ADMIN_INTERNO → ve TODO del tenant BCA
     ↓
DADOR_DE_CARGA → ve equipos de su dador + transportistas que creó
     ↓
TRANSPORTISTA → ve equipos de su empresa transportista + choferes que creó
     ↓
CHOFER → ve solo sus equipos y documentos
     ↓
CLIENTE → ve solo equipos ACTIVOS asignados a él
```

---

*Documento generado automáticamente. Para consultas contactar al administrador del sistema.*

