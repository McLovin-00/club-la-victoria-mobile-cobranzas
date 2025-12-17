# Manual de Usuario - Administrador Interno

**Sistema**: Gestión de Documentación de Equipos - Grupo BCA  
**Rol**: ADMIN INTERNO  
**Versión**: 1.0  
**Fecha**: Diciembre 2025

---

## Índice

1. [Introducción](#1-introducción)
2. [Acceso al Sistema](#2-acceso-al-sistema)
3. [Dashboard Principal](#3-dashboard-principal)
4. [Alta Completa de Equipos](#4-alta-completa-de-equipos)
5. [Consulta de Equipos](#5-consulta-de-equipos)
6. [Aprobación de Documentos](#6-aprobación-de-documentos)
7. [Auditoría](#7-auditoría)
8. [Gestión de Usuarios](#8-gestión-de-usuarios)
9. [Mi Perfil](#9-mi-perfil)

---

## 1. Introducción

El rol de **Administrador Interno** tiene acceso completo a todas las funcionalidades del sistema de gestión de documentación de equipos. Este manual describe paso a paso cómo realizar cada una de las tareas disponibles.

### Funcionalidades disponibles:
- ✅ Dar de alta equipos completos con toda su documentación
- ✅ Consultar y actualizar equipos existentes
- ✅ Aprobar o rechazar documentos clasificados por IA
- ✅ Revisar logs de auditoría del sistema
- ✅ Gestionar usuarios de la plataforma
- ✅ Modificar datos de perfil y contraseña

---

## 2. Acceso al Sistema

### 2.1 Iniciar Sesión

1. Navegue a la URL del sistema: `http://[servidor]:8550/login`
2. Ingrese sus credenciales:
   - **Email**: Su correo electrónico registrado
   - **Contraseña**: Su contraseña personal
3. Haga clic en **"Iniciar sesión"**

> **Nota**: Si olvidó su contraseña, contacte al administrador del sistema.

### 2.2 Cerrar Sesión

1. Haga clic en el **botón de usuario** (letra inicial) en la esquina superior derecha
2. Seleccione **"Cerrar Sesión"** del menú desplegable

---

## 3. Dashboard Principal

El Dashboard es la pantalla principal al ingresar al sistema. Presenta las acciones principales disponibles organizadas en tarjetas:

### Secciones del Dashboard

| Sección | Descripción |
|---------|-------------|
| **Alta Completa** | Registrar nuevo equipo con toda su documentación |
| **Consulta** | Buscar equipos existentes y actualizar documentación |
| **Aprobaciones Pendientes** | Revisar documentos pendientes de aprobación |
| **Auditoría** | Ver historial de acciones del sistema |

### Navegación

El menú lateral izquierdo proporciona acceso rápido a:
- **Dashboard**: Pantalla principal
- **Gestión > Usuarios**: Administrar usuarios del sistema
- **Configuración > Mi Perfil**: Datos personales y cambio de contraseña

---

## 4. Alta Completa de Equipos

Esta funcionalidad permite registrar un nuevo equipo con todos sus componentes y documentación en un solo proceso.

### 4.1 Acceder al formulario

1. Desde el Dashboard, haga clic en **"Iniciar Alta Completa"**
2. Se abrirá el formulario de alta completa

### 4.2 Completar los datos

El formulario está organizado en las siguientes secciones:

#### 📋 Dador de Carga (Obligatorio)

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| Seleccionar Dador de Carga | Empresa que contrata el servicio de transporte | Diego Puech (CUIT: 23247403809) |

> ⚠️ **Importante**: Debe seleccionar un dador de carga antes de continuar.

#### 👥 Clientes (Opcional)

Puede seleccionar uno o más clientes que tendrán acceso a ver este equipo:
- Marque las casillas de los clientes correspondientes
- Puede seleccionar múltiples clientes simultáneamente

#### 1️⃣ Empresa Transportista

| Campo | Obligatorio | Descripción | Ejemplo |
|-------|:-----------:|-------------|---------|
| Razón Social | ✅ | Nombre legal de la empresa | Transportes del Norte S.A. |
| CUIT | ✅ | Número de CUIT (11 dígitos) | 30123456789 |

#### 2️⃣ Chofer

| Campo | Obligatorio | Descripción | Ejemplo |
|-------|:-----------:|-------------|---------|
| DNI | ✅ | Documento de identidad | 12345678 |
| Nombre | ✅ | Nombre del chofer | Juan |
| Apellido | ✅ | Apellido del chofer | Pérez |
| Teléfono(s) | ❌ | Números de contacto (separar con coma) | +5491112345678, +5491187654321 |

> 💡 **Tip**: Puede agregar múltiples teléfonos separándolos con comas.

#### 3️⃣ Tractor (Camión)

| Campo | Obligatorio | Descripción | Ejemplo |
|-------|:-----------:|-------------|---------|
| Patente | ✅ | Patente del vehículo | ABC123 |
| Marca | ❌ | Marca del vehículo | Mercedes-Benz |
| Modelo | ❌ | Modelo del vehículo | Actros 2046 |

#### 4️⃣ Semi / Acoplado

| Campo | Obligatorio | Descripción | Ejemplo |
|-------|:-----------:|-------------|---------|
| Patente | ❌ | Patente del remolque | DEF456 |
| Tipo | ❌ | Tipo de remolque | Caja seca, Cisterna |

### 4.3 Crear el equipo

1. Revise que todos los campos obligatorios estén completos
2. Haga clic en **"✓ Crear Equipo con Todos los Documentos"**
3. El sistema creará automáticamente el equipo y todos los registros de documentos pendientes

---

## 5. Consulta de Equipos

Esta sección permite buscar y gestionar equipos existentes.

### 5.1 Acceder a Consulta

1. Desde el Dashboard, haga clic en **"Ir a Consulta"**
2. Se abrirá la pantalla de búsqueda

### 5.2 Filtros de búsqueda

#### Filtrar por tipo de entidad

| Opción | Descripción |
|--------|-------------|
| **Todos los equipos** | Muestra todos los equipos sin filtro |
| **Por Dador** | Filtra equipos de un dador de carga específico |
| **Por Cliente** | Filtra equipos asignados a un cliente |
| **Por Empresa Transp.** | Filtra por empresa transportista |

#### Estado de equipos

| Opción | Descripción |
|--------|-------------|
| **Solo Activo** | Equipos actualmente activos |
| **Solo Inactivo** | Equipos deshabilitados |
| **Todos** | Activos e inactivos |

#### Filtros adicionales

| Campo | Descripción |
|-------|-------------|
| **Dador de Carga** | Selector para elegir un dador específico |
| **DNI Chofer** | Buscar por documento del conductor |
| **Patente Camión** | Buscar por patente del tractor |
| **Patente Acoplado** | Buscar por patente del remolque |

### 5.3 Acciones disponibles

| Botón | Función |
|-------|---------|
| **Buscar** | Ejecuta la búsqueda con los filtros aplicados |
| **Limpiar** | Restablece todos los filtros |
| **🔍 Buscar por DNIs o Patente** | Búsqueda rápida directa |
| **Bajar documentación vigente (ZIP)** | Descarga todos los documentos vigentes en un archivo comprimido |

---

## 6. Aprobación de Documentos

Esta sección permite revisar y aprobar/rechazar documentos que han sido clasificados automáticamente por la IA.

### 6.1 Acceder a Aprobaciones

1. Desde el Dashboard, haga clic en **"Aprobaciones Pendientes"**
2. Se abrirá la cola de aprobación

### 6.2 Filtrar documentos

Utilice el selector para filtrar por tipo de entidad:

| Opción | Descripción |
|--------|-------------|
| **Todas las entidades** | Muestra documentos de cualquier tipo |
| **Empresa Transportista** | Solo documentos de empresas |
| **Chofer** | Solo documentos de conductores |
| **Camión** | Solo documentos de tractores |
| **Acoplado** | Solo documentos de remolques |

### 6.3 Revisar documentos

Para cada documento pendiente puede:

1. **Ver el documento**: Visualizar la imagen o PDF cargado
2. **Verificar clasificación IA**: Revisar qué tipo detectó la IA
3. **Aprobar**: Confirmar que el documento es correcto
4. **Rechazar**: Marcar el documento como incorrecto (debe indicar motivo)

### 6.4 Navegación

| Botón | Función |
|-------|---------|
| **Anterior** | Ver documento anterior |
| **Siguiente** | Ver documento siguiente |
| **Refrescar** | Actualizar la lista de pendientes |

---

## 7. Auditoría

El módulo de auditoría permite revisar todas las acciones realizadas en el sistema para control y trazabilidad.

### 7.1 Acceder a Auditoría

1. Desde el Dashboard, haga clic en **"Auditoría"**
2. Se abrirá la pantalla de logs

### 7.2 Filtros disponibles

| Filtro | Descripción | Ejemplo |
|--------|-------------|---------|
| **Desde** | Fecha inicial del período | 01/12/2025 |
| **Hasta** | Fecha final del período | 16/12/2025 |
| **Email** | Email del usuario que realizó la acción | admin.interno@bca.com |
| **Rol** | Rol del usuario | ADMIN_INTERNO |
| **Método** | Tipo de petición HTTP | GET, POST, PUT, PATCH, DELETE |
| **Status** | Código de respuesta HTTP | 200, 401, 500 |
| **Acción** | Tipo de acción realizada | login, create, update |
| **Entidad** | Tipo de entidad afectada | equipo, documento, user |
| **Entidad ID** | ID específico de la entidad | 123 |
| **Ruta contiene** | Parte de la URL de la petición | /api/docs/ |

### 7.3 Filtros rápidos

| Botón | Función |
|-------|---------|
| **Hoy** | Filtra acciones del día actual |
| **Últimos 7 días** | Filtra última semana |

### 7.4 Configurar columnas visibles

Active o desactive las columnas que desea ver:
- ☑️ Fecha
- ☑️ Acción
- ☑️ Método
- ☑️ Status
- ☑️ Usuario
- ☑️ Rol
- ☑️ Entidad
- ☑️ Ruta

### 7.5 Exportar datos

| Botón | Formato |
|-------|---------|
| **Descargar CSV** | Archivo CSV para hojas de cálculo |
| **Descargar Excel** | Archivo XLSX nativo de Excel |

### 7.6 Paginación

| Opción | Descripción |
|--------|-------------|
| **10/20/50/100** | Cantidad de registros por página |
| **Anterior/Siguiente** | Navegar entre páginas |

---

## 8. Gestión de Usuarios

Esta sección permite administrar los usuarios de la plataforma.

### 8.1 Acceder a Usuarios

1. En el menú lateral, bajo **"Gestión"**, haga clic en **"Usuarios"**
2. Se abrirá la lista de usuarios del sistema

### 8.2 Funciones disponibles

| Acción | Descripción |
|--------|-------------|
| **Ver usuarios** | Lista de todos los usuarios registrados |
| **Crear usuario** | Agregar un nuevo usuario al sistema |
| **Editar usuario** | Modificar datos de un usuario existente |
| **Activar/Desactivar** | Habilitar o deshabilitar acceso de usuarios |

### 8.3 Crear nuevo usuario

1. Haga clic en el botón **"Nuevo Usuario"** (o similar)
2. Complete el formulario:
   - **Email**: Correo electrónico (será el login)
   - **Nombre**: Nombre del usuario
   - **Apellido**: Apellido del usuario
   - **Rol**: Seleccione el rol apropiado
   - **Entidad asociada**: Según el rol, asociar a empresa/chofer/cliente
3. Haga clic en **"Crear"**

### 8.4 Roles disponibles

| Rol | Descripción |
|-----|-------------|
| **SUPERADMIN** | Acceso total al sistema |
| **ADMIN_INTERNO** | Administración interna completa |
| **DADOR_DE_CARGA** | Gestión de sus equipos y documentos |
| **CLIENTE** | Visualización de equipos asignados |
| **TRANSPORTISTA** | Gestión de sus equipos de transporte |
| **CHOFER** | Visualización de sus documentos personales |

---

## 9. Mi Perfil

Esta sección permite ver y modificar sus datos personales y contraseña.

### 9.1 Acceder a Mi Perfil

1. En el menú lateral, bajo **"Configuración"**, haga clic en **"Mi Perfil"**
2. Se abrirá la pantalla de perfil

### 9.2 Información visible

| Campo | Descripción | Editable |
|-------|-------------|:--------:|
| **Email** | Su correo electrónico de acceso | ❌ |
| **Nombre** | Su nombre en el sistema | ✅ |

> ⚠️ El email no puede ser modificado. Para cambios, contacte al administrador.

### 9.3 Cambiar contraseña

1. Complete el formulario de cambio de contraseña:

| Campo | Descripción |
|-------|-------------|
| **Contraseña Actual** | Ingrese su contraseña actual |
| **Nueva Contraseña** | Ingrese la nueva contraseña deseada |
| **Confirmar Nueva Contraseña** | Repita la nueva contraseña |

2. Haga clic en **"Cambiar Contraseña"**

#### Requisitos de contraseña:
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número

---

## Apéndice A: Navegación General

### Barra superior

| Elemento | Función |
|----------|---------|
| **Logo Grupo BCA** | Volver al Dashboard |
| **Cambiar tema** | Alternar entre modo claro y oscuro |
| **Botón usuario (A)** | Menú de usuario (cerrar sesión) |
| **Toggle menu** | Expandir/colapsar menú lateral |

### Menú lateral

```
📌 Dashboard
├── Gestión
│   └── 👥 Usuarios
└── Configuración
    └── 👤 Mi Perfil
```

---

## Apéndice B: Solución de Problemas

| Problema | Solución |
|----------|----------|
| No puedo iniciar sesión | Verifique email y contraseña. Si persiste, contacte al administrador |
| La página no carga | Refresque con F5 o Ctrl+F5 para limpiar caché |
| Error al crear equipo | Verifique que todos los campos obligatorios (*) estén completos |
| No veo los documentos | Verifique que tiene los permisos correctos para el rol |
| Sesión expirada | La sesión expira por inactividad. Vuelva a iniciar sesión |

---

## Apéndice C: Contacto de Soporte

Para asistencia técnica o consultas sobre el sistema:

- **Email**: soporte@grupo-bca.com
- **Teléfono**: [Completar]

---

*Documento generado automáticamente - Diciembre 2025*
