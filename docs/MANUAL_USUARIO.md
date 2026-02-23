# Manual de Usuario - Plataforma BCA

**Versión**: 1.0  
**Fecha**: 2026-02-23  
**Plataforma**: Sistema de Gestión Documental y Logística BCA

---

## Índice General

1. [Introducción](#introducción)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Guía para SUPERADMIN](#guía-para-superadmin)
4. [Guía para ADMIN](#guía-para-admin)
5. [Guía para ADMIN INTERNO](#guía-para-admin-interno)
6. [Guía para DADOR DE CARGA](#guía-para-dador-de-carga)
7. [Guía para TRANSPORTISTA](#guía-para-transportista)
8. [Guía para CHOFER](#guía-para-chofer)
9. [Funcionalidades Comunes](#funcionalidades-comunes)
10. [Glosario](#glosario)

---

## Introducción

La Plataforma BCA es un sistema de gestión documental y logística diseñado para administrar la documentación de equipos de transporte (camiones, acoplados, choferes y empresas transportistas). El sistema permite:

- Registrar y gestionar equipos de transporte con toda su documentación.
- Controlar el estado documental (vigente, por vencer, vencido, faltante).
- Procesar remitos de transporte con análisis por inteligencia artificial.
- Gestionar plantillas de requisitos documentales por cliente.
- Recibir notificaciones de vencimientos y faltantes.
- Exportar reportes y descargar documentación en formato ZIP.

### Jerarquía de Roles

```
SUPERADMIN ........... Control total de la plataforma
  └─ ADMIN ........... Gestión de su empresa/tenant
     └─ ADMIN_INTERNO  Gestión interna, aprobaciones, remitos
        └─ DADOR_DE_CARGA ... Gestión de sus entidades y equipos
           └─ TRANSPORTISTA ... Gestión de sus choferes y documentos
              └─ CHOFER ......... Consulta y carga de documentos propios
        └─ CLIENTE ............ Portal de consulta (solo lectura + descargas)
```

Cada rol puede realizar las acciones propias de su nivel y puede ver (pero no siempre modificar) los niveles inferiores que le corresponden.

---

## Acceso al Sistema

### Inicio de sesión

1. Ingresar a la URL de la plataforma en el navegador.
2. Completar el campo **Email** con la dirección de correo registrada.
3. Completar el campo **Contraseña**.
4. Presionar **Iniciar Sesión**.

El sistema redirige automáticamente al dashboard correspondiente según el rol:

| Rol | Página de inicio |
|-----|-----------------|
| SUPERADMIN | Dashboard general (`/`) |
| ADMIN | Dashboard admin (`/`) |
| ADMIN_INTERNO | Portal Admin Interno (`/portal/admin-interno`) |
| DADOR_DE_CARGA | Dashboard Dador (`/dador`) |
| TRANSPORTISTA | Dashboard Transportista (`/transportista`) |
| CHOFER | Dashboard Chofer (`/chofer`) |

### Cambio de contraseña

1. Ir a **Perfil** (menú lateral o `/perfil`).
2. Completar la contraseña actual.
3. Ingresar la nueva contraseña (mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número).
4. Confirmar la nueva contraseña.
5. Presionar **Cambiar contraseña**.

El sistema tiene protección contra intentos excesivos: máximo 3 intentos cada 30 minutos.

### Cierre de sesión

Presionar el botón **Cerrar sesión** en el menú lateral. El token de acceso queda invalidado inmediatamente.

---

## Guía para SUPERADMIN

El SUPERADMIN tiene acceso total a la plataforma. Es el rol más elevado y puede gestionar todos los aspectos del sistema.

### Resumen de funcionalidades

| Módulo | Acciones disponibles |
|--------|---------------------|
| Empresas | Crear, editar, eliminar, listar |
| Usuarios | Crear todos los roles, editar, desactivar, eliminar |
| Documentos | Cargar, aprobar, rechazar, eliminar |
| Equipos | Crear, editar, eliminar, evaluar compliance |
| Remitos | Cargar, aprobar, rechazar, editar, reprocesar |
| Plantillas | Crear, editar, eliminar, asignar |
| Templates | Crear, editar, eliminar tipos de documentos |
| Transferencias | Ver, aprobar, rechazar |
| Configuración | Flowise, Evolution API, defaults del sistema |
| Auditoría | Ver logs, exportar CSV/Excel |
| Datos IA | Ver, corregir, eliminar datos extraídos |
| Dashboard | Estadísticas globales, KPIs, semáforos |
| Operaciones batch | Importar CSV, carga masiva de documentos |
| End Users (legacy) | Gestionar usuarios finales, servicios, instancias |
| Notificaciones WhatsApp | Configurar Evolution API |

---

### 1. Gestión de Empresas

**Ruta**: Menú lateral → **Empresas** (`/empresas`)

#### Crear una empresa
1. Ir a **Empresas**.
2. Presionar **Nueva Empresa**.
3. Completar: nombre, descripción, datos de la empresa.
4. Presionar **Guardar**.

#### Editar una empresa
1. En la lista de empresas, presionar el ícono de edición en la fila correspondiente.
2. Modificar los campos necesarios.
3. Presionar **Guardar**.

#### Eliminar una empresa
1. En la lista de empresas, presionar el ícono de eliminación.
2. Confirmar la acción.

#### Asignar empresa a un usuario
1. Ir a **Usuarios** (`/platform-users`).
2. Seleccionar el usuario.
3. Asignar la empresa desde el selector.

---

### 2. Gestión de Usuarios

**Ruta**: Menú lateral → **Usuarios** (`/platform-users`)

El SUPERADMIN puede crear usuarios de cualquier rol.

#### Crear usuario con el Wizard

El sistema guía la creación paso a paso según el tipo de usuario:

**Crear un ADMIN o ADMIN_INTERNO**:
1. Presionar **Nuevo Usuario**.
2. Seleccionar el rol (ADMIN o ADMIN_INTERNO).
3. Completar email, nombre y apellido.
4. Seleccionar la empresa a la que pertenece.
5. Presionar **Crear**.
6. El sistema muestra una **contraseña temporal** (se muestra una sola vez). Copiarla y entregarla al usuario.

**Crear un DADOR_DE_CARGA**:
1. Presionar **Nuevo Usuario** → seleccionar DADOR_DE_CARGA.
2. Si el dador no existe como entidad, el wizard permite crearlo en el paso 1 (nombre, CUIT, datos de contacto).
3. Completar email, nombre, apellido.
4. Asociar al dador de carga correspondiente.
5. El sistema genera la contraseña temporal.

**Crear un TRANSPORTISTA**:
1. Presionar **Nuevo Usuario** → seleccionar TRANSPORTISTA.
2. Si la empresa transportista no existe, el wizard permite crearla (razón social, CUIT).
3. Completar email, nombre, apellido.
4. Asociar a la empresa transportista.
5. El sistema genera la contraseña temporal.

**Crear un CHOFER**:
1. Presionar **Nuevo Usuario** → seleccionar CHOFER.
2. Si el chofer no existe como entidad, el wizard permite crearlo (nombre, apellido, DNI).
3. Completar email.
4. Asociar al chofer.
5. El sistema genera la contraseña temporal.

#### Editar un usuario
1. En la lista de usuarios, presionar **Editar** en la fila del usuario.
2. Modificar los datos (nombre, apellido, email, rol).
3. Presionar **Guardar**.

#### Activar / Desactivar un usuario
1. En la lista, presionar el toggle de estado **Activo/Inactivo**.
2. El usuario desactivado no puede ingresar al sistema.

#### Eliminar un usuario
1. Presionar el ícono de eliminar en la fila del usuario.
2. Confirmar la acción.
3. El sistema anonimiza los datos del usuario (soft delete).

---

### 3. Gestión de Entidades Maestras

**Ruta**: Menú → **Documentos** → secciones de maestros

Las entidades maestras son los componentes fundamentales del sistema:

| Entidad | Ruta | Identificador único |
|---------|------|-------------------|
| Dadores de Carga | `/documentos/dadores` | CUIT |
| Choferes | `/documentos/choferes` | DNI |
| Camiones | `/documentos/camiones` | Patente |
| Acoplados | `/documentos/acoplados` | Patente |
| Empresas Transportistas | `/documentos/empresas-transportistas` | CUIT |
| Clientes | `/documentos/clientes` | Nombre / Razón social |

#### Operaciones comunes para todas las entidades
- **Listar**: la tabla muestra todas las entidades con paginación y filtros.
- **Crear**: presionar el botón de creación y completar el formulario.
- **Editar**: presionar el ícono de edición en la fila.
- **Eliminar**: presionar el ícono de eliminación y confirmar.

#### Configurar notificaciones de un Dador
1. Ir a **Dadores** → seleccionar un dador → **Configurar Notificaciones**.
2. Activar/desactivar notificaciones WhatsApp.
3. Configurar números de teléfono de contacto.
4. Configurar ventanas de aviso (días de anticipación).

---

### 4. Gestión de Equipos

**Ruta**: **Documentos** → **Equipos** (`/documentos/equipos`)

Un equipo es la unidad operativa compuesta por: **chofer + camión + acoplado (opcional) + empresa transportista (opcional)**, asociada a un dador de carga.

#### Alta completa de equipo
1. Ir a **Equipos** → **Alta Completa** (`/documentos/equipos/alta-completa`).
2. **Paso 1 - Pre-check**: ingresar los datos de las entidades (DNI del chofer, patente del camión, patente del acoplado, CUIT de la empresa transportista).
   - El sistema verifica si las entidades existen:
     - **Verde**: la entidad ya existe y pertenece al dador actual.
     - **Azul**: la entidad no existe, se creará automáticamente.
     - **Amarillo**: la entidad existe pero pertenece a otro dador → requiere **solicitud de transferencia**.
3. **Paso 2 - Transferencia** (si aplica): si hay entidades de otro dador, se genera una solicitud de transferencia que debe ser aprobada por un administrador antes de continuar.
4. **Paso 3 - Creación**: si no hay conflictos, el sistema crea el equipo con todas las entidades (nuevas o existentes), detecta conflictos con equipos previos (si un chofer o camión ya estaba en otro equipo activo, lo desasocia automáticamente).
5. Seleccionar el **cliente** al que se asigna el equipo (opcional).

#### Evaluar estado documental
1. En la lista de equipos, presionar **Evaluar** en la fila del equipo.
2. El sistema recalcula el estado documental según las plantillas de requisitos asignadas.
3. Estados posibles: COMPLETO, INCOMPLETO, VENCIDO, POR_VENCER, PENDIENTE, RECHAZADO.

#### Evaluación batch
1. Ir a **Equipos** → presionar **Evaluar Todos**.
2. El sistema evalúa todos los equipos activos y actualiza sus estados.

#### Asociar/desasociar cliente
1. En el detalle del equipo, ir a la sección **Clientes**.
2. Presionar **Agregar Cliente** y seleccionar el cliente.
3. Para desasociar, presionar **Quitar** junto al cliente.

#### Descargas
- **Excel resumen**: presionar **Descargar Excel** en el detalle del equipo.
- **ZIP de vigentes**: seleccionar equipos → presionar **Descargar ZIP**.

---

### 5. Gestión de Documentos

**Ruta**: **Documentos** → **Aprobación** (`/documentos/aprobacion`)

#### Cargar un documento
1. En el detalle de un equipo o entidad, presionar **Subir Documento**.
2. Seleccionar el **tipo de documento** (template).
3. Seleccionar el archivo (PDF o imagen, máximo 20MB).
4. Presionar **Cargar**.
5. El documento queda en estado **PENDIENTE** y se envía a clasificación por IA.

#### Cola de aprobación
1. Ir a **Aprobación** (`/documentos/aprobacion`).
2. La lista muestra todos los documentos pendientes de aprobación.
3. Para cada documento:
   - **Ver**: presionar para ver el preview del documento y los datos extraídos por IA.
   - **Aprobar**: validar que los datos son correctos y presionar **Aprobar**.
   - **Rechazar**: presionar **Rechazar**, ingresar el motivo (mínimo 10 caracteres).
   - **Re-chequear con IA**: si los datos no parecen correctos, presionar **Re-chequear** para que la IA vuelva a analizar.

#### Aprobación batch
1. En la cola de aprobación, seleccionar múltiples documentos con los checkboxes.
2. Presionar **Aprobar seleccionados**.

#### Ciclo de vida del documento
```
Carga → PENDIENTE → Clasificación IA → PENDIENTE_APROBACIÓN
  → APROBADO (por admin) → el documento queda vigente
  → RECHAZADO (por admin, con motivo) → el cargador puede re-enviar
```

---

### 6. Gestión de Remitos

**Ruta**: **Remitos** (`/remitos`)

#### Cargar un remito
1. Ir a **Remitos** → presionar **Nuevo Remito**.
2. Seleccionar las imágenes del remito (máximo 10 archivos, 20MB cada uno).
3. Seleccionar el **dador de carga**.
4. Presionar **Cargar**.
5. El sistema compone un PDF, lo sube a almacenamiento y lo envía a análisis por IA.

#### Aprobar/Rechazar un remito
1. En la lista de remitos, presionar sobre el remito en estado **PENDIENTE_APROBACIÓN**.
2. Revisar los datos extraídos por IA (número de remito, fecha, emisor, chofer, patentes, pesos).
3. Si los datos son correctos: presionar **Aprobar**.
4. Si los datos son incorrectos:
   - **Editar**: corregir los datos manualmente (la confianza se eleva a 100%).
   - **Reprocesar**: enviar nuevamente a la IA para re-análisis.
   - **Rechazar**: presionar **Rechazar** con motivo.

#### Control de confianza IA
- Si la confianza del análisis es menor al 30%, la aprobación se bloquea automáticamente.
- Para desbloquear: editar los datos manualmente o reprocesar con IA.

#### Exportar remitos
1. Presionar **Exportar Excel** para descargar la lista en formato Excel.
2. Usar los filtros (fecha, estado, dador) antes de exportar para limitar los resultados.

---

### 7. Templates de Documentos

**Ruta**: **Plantillas** (`/plantillas`)

Los templates definen los **tipos de documentos** que existen en el sistema (ej: Licencia de Conducir, Seguro del Vehículo, VTV).

#### Crear un template
1. Ir a **Plantillas** → **Nuevo Template**.
2. Completar:
   - **Nombre**: nombre del tipo de documento.
   - **Tipo de entidad**: CHOFER, CAMION, ACOPLADO, EMPRESA_TRANSPORTISTA o DADOR.
   - **Tiene vencimiento**: si el documento tiene fecha de expiración.
   - **Días de anticipación**: cuántos días antes del vencimiento se genera la alerta.
   - **Descripción**: descripción opcional.
3. Presionar **Guardar**.

---

### 8. Plantillas de Requisitos

**Ruta**: **Documentos** → **Clientes** → seleccionar cliente → **Plantillas**

Las plantillas de requisitos definen qué documentos exige cada cliente a los equipos que le prestan servicio.

#### Crear una plantilla de requisitos
1. Ir a **Clientes** → seleccionar un cliente → **Plantillas** → **Nueva Plantilla**.
2. Ingresar el nombre de la plantilla.
3. Presionar **Crear**.

#### Agregar documentos requeridos a la plantilla
1. En la plantilla, presionar **Agregar Requisito**.
2. Seleccionar el **template** (tipo de documento).
3. Indicar si es **obligatorio**.
4. Configurar los **días de anticipación** para alertas.
5. Indicar si es visible para el chofer.
6. Presionar **Guardar**.

#### Asignar plantilla a un equipo
1. Ir al detalle del equipo → sección **Plantillas**.
2. Presionar **Asignar Plantilla**.
3. Seleccionar la plantilla del cliente.
4. El sistema evalúa automáticamente los documentos faltantes.

---

### 9. Transferencias

**Ruta**: **Admin** → **Transferencias** (`/admin/transferencias`)

Las transferencias permiten mover entidades (choferes, camiones, acoplados, empresas transportistas) de un dador de carga a otro.

#### Ver solicitudes pendientes
1. Ir a **Transferencias**.
2. La lista muestra todas las solicitudes pendientes con: solicitante, dador actual, entidades a transferir, equipos afectados.

#### Aprobar una transferencia
1. Presionar **Ver detalle** en la solicitud.
2. Revisar las entidades y los equipos afectados.
3. Presionar **Aprobar**.
4. Las entidades cambian de dador. Se notifica al solicitante y al dador que pierde las entidades.

#### Rechazar una transferencia
1. Presionar **Ver detalle**.
2. Presionar **Rechazar**.
3. Ingresar el motivo (mínimo 10 caracteres).
4. Se notifica al solicitante.

---

### 10. Configuración del Sistema

#### Configuración de Flowise (IA para documentos)
**Ruta**: **Configuración** → **Flowise** (`/configuracion/flowise`)

1. Ingresar la URL base del servicio Flowise.
2. Ingresar el API Key.
3. Ingresar el Flow ID para clasificación de documentos.
4. Presionar **Probar Conexión** para verificar.
5. Presionar **Guardar**.

#### Configuración de Flowise (IA para remitos)
**Ruta**: **Remitos** → **Configuración**

1. Similar al anterior pero para el servicio de remitos.
2. Configurar URL, API Key y Flow ID específicos para análisis de remitos.

#### Configuración de Evolution API (WhatsApp)
**Ruta**: **Configuración** → **Evolution** (`/configuracion/evolution`)

1. Ingresar la URL del servidor Evolution API.
2. Ingresar el token de autenticación.
3. Ingresar el nombre de la instancia.
4. Presionar **Probar Conexión** para verificar.
5. Presionar **Guardar**.

---

### 11. Auditoría

**Ruta**: **Documentos** → **Auditoría** (`/documentos/auditoria`)

1. La tabla muestra todas las acciones realizadas en el sistema.
2. Filtrar por: usuario, acción, entidad, fecha.
3. Cada registro muestra: timestamp, usuario, rol, acción, entidad afectada, detalles.
4. **Exportar**: presionar **CSV** o **Excel** para descargar los logs.

---

### 12. Datos Extraídos por IA

**Ruta**: **Documentos** → **Datos Extraídos** (`/documentos/datos-extraidos`)

Cuando la IA analiza un documento, extrae datos como nombre, DNI, fecha de vencimiento, etc.

1. Ver la lista de datos extraídos por entidad.
2. **Corregir**: si un dato fue extraído incorrectamente, presionar **Editar** y corregir.
3. **Eliminar**: si los datos son incorrectos o irrelevantes.
4. **Historial**: ver todas las extracciones previas para una entidad.

---

### 13. Dashboard y Estadísticas

**Ruta**: Página de inicio (`/`)

El dashboard de SUPERADMIN muestra:
- Total de empresas registradas.
- Total de usuarios activos.
- Actividades recientes del sistema.
- Uso de memoria del servidor.
- Widget de servicios habilitados.
- Tabla paginada de empresas con cantidad de usuarios.

**Dashboard de documentos** (`/documentos/dashboard`):
- KPIs de equipos (completos, incompletos, vencidos, por vencer).
- KPIs de aprobación (pendientes, aprobados hoy, rechazados).
- Semáforos de estado documental.
- Alertas activas.
- Documentos rechazados pendientes de re-envío.

---

### 14. Operaciones Batch

#### Importar equipos desde CSV
1. Ir a **Portal Dadores** (`/portal/dadores`) → **Importación Masiva CSV**.
2. Descargar el template CSV de ejemplo.
3. Completar el CSV con los datos de los equipos.
4. Subir el archivo CSV.
5. El sistema procesa cada fila y crea los equipos.

#### Carga batch de documentos
1. Ir a **Portal Dadores** → **Carga Inicial por Planilla**.
2. Seleccionar los archivos de documentos.
3. Asociar cada archivo al tipo de documento y entidad correspondiente.
4. El sistema procesa todos los archivos en background.

---

### 15. Portales de Vista

El SUPERADMIN puede acceder a todos los portales para ver lo que ven los demás roles:

| Portal | Ruta | Propósito |
|--------|------|-----------|
| Portal Admin Interno | `/portal/admin-interno` | Ver la vista del admin interno |
| Portal Dadores | `/portal/dadores` | Gestión avanzada de dadores |
| Portal Transportistas | `/portal/transportistas` | Gestión avanzada de transportistas |
| Portal Cliente | `/portal/cliente` | Ver la vista del cliente |
| Dashboard Dador | `/dador` | Ver el dashboard del dador |
| Dashboard Transportista | `/transportista` | Ver el dashboard del transportista |
| Dashboard Chofer | `/chofer` | Ver el dashboard del chofer |
| Dashboard Cliente | `/cliente` | Ver el dashboard del cliente |

---

## Guía para ADMIN

El ADMIN gestiona su empresa/tenant. Tiene las mismas funcionalidades que el SUPERADMIN excepto:

- No puede gestionar **empresas** (crear/editar/eliminar empresas).
- No puede gestionar **templates** de documentos (solo el SUPERADMIN los crea).
- No puede acceder a la **configuración de Flowise, Evolution API** ni defaults del sistema.
- No puede ver ni gestionar **datos extraídos por IA**.

### Resumen de funcionalidades

| Módulo | Acciones disponibles |
|--------|---------------------|
| Usuarios | Crear ADMIN_INTERNO, DADOR, TRANSPORTISTA, CHOFER, CLIENTE; editar, desactivar |
| Documentos | Cargar, aprobar, rechazar, eliminar |
| Equipos | Crear, editar, eliminar, evaluar compliance |
| Plantillas | Crear, editar, eliminar, asignar |
| Transferencias | Ver, aprobar, rechazar |
| Auditoría | Ver logs, exportar CSV/Excel |
| Dashboard | Estadísticas de empresa, KPIs |
| Operaciones batch | Importar CSV, carga masiva |
| End Users (legacy) | Gestionar usuarios finales, instancias |

### 1. Dashboard

**Ruta**: Página de inicio (`/`)

El dashboard de ADMIN muestra:
- Cantidad de usuarios de la empresa.
- Bots configurados (si aplica).
- Clientes asociados.
- Estado de configuración de bots.
- Tabla de usuarios con email, rol, última actividad.
- Actividad reciente.

### 2. Gestión de Usuarios

Funciona igual que para SUPERADMIN, pero limitado a usuarios de su propia empresa. Puede crear:
- ADMIN_INTERNO
- DADOR_DE_CARGA
- TRANSPORTISTA
- CHOFER
- CLIENTE

No puede crear otros ADMIN ni SUPERADMIN.

### 3. Todas las demás funcionalidades

Las funcionalidades de documentos, equipos, plantillas, transferencias, auditoría y operaciones batch funcionan exactamente igual que para el SUPERADMIN. Consultar las secciones correspondientes en la guía de SUPERADMIN.

La diferencia principal es que el ADMIN solo ve datos de su propia empresa/tenant.

---

## Guía para ADMIN INTERNO

El ADMIN_INTERNO es el rol operativo principal. Gestiona la documentación diaria, aprueba documentos y remitos, y administra equipos.

### Resumen de funcionalidades

| Módulo | Acciones disponibles |
|--------|---------------------|
| Usuarios | Crear DADOR, TRANSPORTISTA, CHOFER; editar, desactivar |
| Documentos | Cargar, aprobar, rechazar, re-chequear con IA, eliminar |
| Equipos | Crear (alta completa), editar, evaluar, activar/desactivar |
| Remitos | Cargar, aprobar, rechazar, editar datos, reprocesar IA |
| Plantillas | Crear, editar, eliminar, asignar |
| Transferencias | Ver pendientes, aprobar, rechazar |
| Auditoría | Ver logs, exportar |
| Dashboard | KPIs, semáforos, alertas |
| Notificaciones | Ver, gestionar notificaciones internas |

### 1. Página de Inicio

**Ruta**: `/portal/admin-interno`

La página de inicio del ADMIN_INTERNO presenta dos opciones principales:

1. **Alta Completa de Equipo**: registrar un nuevo equipo con todas sus entidades y documentación.
2. **Consulta de Equipos**: buscar equipos existentes por DNI, patente o nombre.

Y accesos rápidos a:
- **Aprobaciones Pendientes**: documentos que esperan revisión.
- **Auditoría**: historial de acciones del sistema.

### 2. Alta Completa de Equipo

1. Presionar **Alta Completa de Equipo** en la página de inicio o ir a `/documentos/equipos/alta-completa`.
2. Ingresar los datos del equipo:
   - **DNI del chofer**: el sistema verifica si ya existe.
   - **Nombre y apellido del chofer** (si es nuevo).
   - **Patente del camión**: el sistema verifica si ya existe.
   - **Patente del acoplado** (opcional).
   - **CUIT de la empresa transportista** (opcional).
   - **Dador de carga**: seleccionar de la lista.
   - **Cliente**: seleccionar el cliente al que presta servicio (opcional).
3. Presionar **Pre-Check** para verificar las entidades.
4. Revisar el resultado:
   - Entidades existentes del mismo dador (verde).
   - Entidades nuevas que se crearán (azul).
   - Entidades de otro dador que requieren transferencia (amarillo).
5. Si todo es correcto, presionar **Crear Equipo**.
6. El sistema crea el equipo y encola el chequeo de documentos faltantes.

### 3. Aprobación de Documentos

**Ruta**: `/documentos/aprobacion`

Esta es una de las tareas más frecuentes del ADMIN_INTERNO.

1. La cola de aprobación muestra todos los documentos clasificados por IA y pendientes de revisión.
2. Para cada documento:
   - Ver el **preview** del documento (imagen/PDF).
   - Ver los **datos extraídos** por IA (tipo de documento, fecha de vencimiento).
   - **Aprobar**: si los datos son correctos, el documento queda vigente.
   - **Rechazar**: si el documento es incorrecto, ingresar el motivo.
   - **Re-chequear**: si la IA no clasificó bien, solicitar un nuevo análisis.
3. **Aprobación batch**: seleccionar múltiples documentos y aprobar todos a la vez.

### 4. Gestión de Remitos

**Ruta**: `/remitos`

1. **Cargar remito**: presionar **Nuevo Remito**, seleccionar imágenes, elegir dador, presionar **Cargar**.
2. **Revisar datos**: una vez procesado por IA, revisar los datos extraídos (número, fecha, emisor, cliente, pesos, patentes, chofer).
3. **Editar datos**: si algún dato está incorrecto, editarlo directamente.
4. **Aprobar**: cuando los datos son correctos, presionar **Aprobar**.
5. **Rechazar**: si el remito no es válido, presionar **Rechazar** con motivo.
6. **Reprocesar**: si la IA falló, enviar a nuevo análisis.
7. **Exportar**: descargar la lista de remitos en Excel.

### 5. Transferencias

**Ruta**: `/admin/transferencias`

1. Ver las solicitudes de transferencia pendientes.
2. Revisar las entidades que se solicitan y los equipos afectados.
3. **Aprobar** o **Rechazar** (con motivo) cada solicitud.

### 6. Consulta de Equipos

**Ruta**: `/documentos/equipos`

1. Buscar equipos por DNI del chofer, patente del camión o acoplado.
2. Ver el estado documental de cada equipo (semáforo).
3. Ver los documentos cargados y sus estados.
4. Descargar documentación en formato ZIP.
5. Solicitar documentos faltantes al chofer/transportista.

### 7. Auditoría

**Ruta**: `/documentos/auditoria`

1. Ver el historial completo de acciones: quién hizo qué, cuándo y sobre qué entidad.
2. Filtrar por usuario, tipo de acción, entidad, fecha.
3. Exportar a CSV o Excel.

### 8. Dashboard de Documentos

**Ruta**: `/documentos/dashboard`

- **KPIs de equipos**: total, completos, incompletos, vencidos, por vencer.
- **KPIs de aprobación**: pendientes, aprobados, rechazados.
- **Semáforos**: vista gráfica del estado documental de todos los equipos.
- **Alertas**: documentos próximos a vencer o ya vencidos.
- **Rechazados**: documentos rechazados pendientes de corrección.

### 9. Notificaciones

**Ruta**: `/notificaciones`

- Ver notificaciones internas (aprobaciones, rechazos, vencimientos, transferencias).
- Marcar como leídas individualmente o todas a la vez.
- Eliminar notificaciones leídas.

---

## Guía para DADOR DE CARGA

El DADOR_DE_CARGA gestiona sus propios equipos, entidades y documentación. Puede crear transportistas y choferes bajo su dador.

### Resumen de funcionalidades

| Módulo | Acciones disponibles |
|--------|---------------------|
| Usuarios | Crear TRANSPORTISTA, CHOFER; activar/desactivar |
| Documentos | Cargar, ver estado, renovar, re-enviar rechazados |
| Equipos | Crear (alta completa), consultar, solicitar faltantes |
| Aprobación | Aprobar documentos (condicional, según config) |
| Remitos | Cargar, ver estado |
| Transferencias | Solicitar transferencia de entidades |
| Clientes | Crear, editar clientes; gestionar requisitos |
| Dashboard | KPIs de sus equipos |
| Notificaciones | Ver notificaciones de sus equipos |

### 1. Página de Inicio

**Ruta**: `/dador`

La página de inicio presenta dos opciones:
1. **Alta Completa de Equipo**: registrar un nuevo equipo con chofer, camión, acoplado y empresa transportista.
2. **Consulta de Equipos**: buscar equipos existentes y ver su estado documental.

Y un acceso rápido a **Aprobaciones Pendientes**.

### 2. Alta Completa de Equipo

El flujo es igual al descrito para ADMIN_INTERNO (ver sección correspondiente), pero el dador de carga se selecciona automáticamente (es el propio).

1. Ingresar los datos del equipo (DNI chofer, patente camión, etc.).
2. Pre-check automático.
3. Si alguna entidad pertenece a otro dador → se genera solicitud de transferencia.
4. Si todo es correcto → crear equipo.

### 3. Gestión de Usuarios

**Ruta**: `/platform-users`

El dador de carga puede:
- **Crear TRANSPORTISTA**: asociarlo a una empresa transportista bajo su dador.
- **Crear CHOFER**: asociarlo a un chofer bajo su dador.
- **Activar/Desactivar**: controlar el acceso de sus transportistas y choferes.
- **Listar**: ver todos los usuarios asociados a su dador.

### 4. Carga de Documentos

1. Ir a **Equipos** → seleccionar un equipo → sección de documentos.
2. Presionar **Subir Documento**.
3. Seleccionar el tipo de documento y el archivo.
4. El documento se envía a clasificación por IA y luego a la cola de aprobación.

O alternativamente:
1. En el detalle de una entidad (chofer, camión, etc.), presionar **Subir Documento**.
2. Seleccionar el template y el archivo.

### 5. Aprobación de Documentos

Si el sistema está configurado para permitirlo, el DADOR_DE_CARGA puede aprobar documentos de sus propios equipos:
1. Ir a la cola de aprobación (`/documentos/aprobacion`).
2. Solo aparecen documentos de entidades bajo su dador.
3. Aprobar o rechazar según corresponda.

### 6. Solicitar Transferencia de Entidades

Cuando al crear un equipo se detecta que una entidad (chofer, camión, etc.) pertenece a otro dador:
1. El sistema muestra la opción de solicitar transferencia.
2. Completar el **motivo** de la solicitud.
3. Presionar **Solicitar Transferencia**.
4. La solicitud queda pendiente de aprobación por un ADMIN o ADMIN_INTERNO.
5. Se recibe una notificación cuando se aprueba o rechaza.

### 7. Gestión de Clientes

**Ruta**: `/documentos/clientes`

1. **Crear cliente**: nombre, razón social, datos de contacto.
2. **Editar cliente**: modificar datos.
3. **Requisitos del cliente**: definir qué documentos exige el cliente.
   - Ir al cliente → **Requisitos**.
   - Agregar requisitos (templates de documentos).
   - Configurar obligatoriedad y días de anticipación.

### 8. Carga de Remitos

**Ruta**: `/remitos`

1. Presionar **Nuevo Remito**.
2. Seleccionar imágenes del remito.
3. El dador de carga se selecciona automáticamente.
4. Presionar **Cargar**.
5. El remito se envía a análisis por IA y luego queda pendiente de aprobación.

### 9. Consulta de Equipos y Estado Documental

1. Buscar equipos por DNI, patente o nombre.
2. Ver el semáforo de estado documental.
3. Ver documentos faltantes.
4. Presionar **Solicitar Faltantes** para notificar al transportista/chofer.
5. Descargar documentación vigente en ZIP.

### 10. Dashboard

**Ruta**: `/documentos/dashboard`

- Estadísticas de sus equipos: completos, incompletos, por vencer, vencidos.
- Documentos pendientes de aprobación.
- Alertas de vencimiento.

### 11. Notificaciones

- Recibe notificaciones cuando:
  - Un documento es aprobado o rechazado.
  - Un documento está próximo a vencer.
  - Un documento venció.
  - Se aprueba o rechaza una transferencia.
  - Un equipo cambia de estado documental.

---

## Guía para TRANSPORTISTA

El TRANSPORTISTA gestiona los choferes y documentos asociados a su empresa transportista. Puede crear choferes y cargar documentos.

### Resumen de funcionalidades

| Módulo | Acciones disponibles |
|--------|---------------------|
| Usuarios | Crear CHOFER; activar/desactivar |
| Documentos | Cargar, ver estado, renovar, re-enviar rechazados |
| Equipos | Consultar, ver estado documental |
| Remitos | Cargar |
| Portal | Dashboard con alta de equipo, consulta, calendario |
| Notificaciones | Ver notificaciones de sus entidades |

### 1. Página de Inicio

**Ruta**: `/transportista`

La página de inicio del transportista presenta:
1. **Alta Completa de Equipo**: registrar un nuevo equipo con chofer, camión y acoplado.
2. **Consulta de Equipos**: buscar equipos existentes y ver documentación.

Con una nota: los documentos quedan pendientes de aprobación por el Dador de Carga.

### 2. Portal Transportista (Mobile-First)

**Ruta**: `/portal/transportistas` (accesible también por ADMIN/SUPERADMIN)

El portal tiene tabs optimizadas para dispositivos móviles:

#### Tab Dashboard
- Resumen de cumplimiento documental.

#### Tab Registro
- Formulario rápido de alta de equipo.
- Campos: DNI chofer, patente camión, patente acoplado.
- Teléfonos WhatsApp para notificaciones.
- Selector de dador de carga.
- Carga inmediata de documentos con IA.

#### Tab Documentos
- Subida masiva de documentos.
- Ver documentos pendientes, rechazados y vigentes.

#### Tab Equipos
- Buscar equipos por DNI o patente.
- Lista de "Mis Equipos" con estado documental.
- Descargar documentos por equipo.

#### Tab Calendario
- Calendario de vencimientos de documentos.
- Vista por mes con alertas de vencimiento.

#### Tab Perfil
- Datos del perfil del transportista.

### 3. Crear un Chofer

**Ruta**: `/platform-users`

1. Presionar **Nuevo Usuario** → seleccionar CHOFER.
2. Completar: nombre, apellido, DNI, email.
3. El sistema genera la contraseña temporal.
4. Entregar la contraseña al chofer.

### 4. Carga de Documentos

1. Desde el portal o desde el detalle de un equipo/entidad.
2. Seleccionar el tipo de documento y el archivo.
3. El documento se envía a procesamiento por IA.
4. Queda pendiente de aprobación.

### 5. Re-envío de Documentos Rechazados

**Ruta**: Portal Transportista → Tab Documentos → **Rechazados**

1. Ver la lista de documentos rechazados con el motivo de rechazo.
2. Presionar **Re-enviar** en el documento.
3. Subir el archivo corregido.
4. El documento vuelve a la cola de aprobación.

### 6. Carga de Remitos

**Ruta**: `/remitos`

1. Presionar **Nuevo Remito**.
2. Seleccionar las imágenes.
3. Presionar **Cargar**.

### 7. Consulta de Equipos

1. Buscar equipos asociados a su empresa transportista.
2. Ver el estado documental (qué falta, qué venció).
3. Descargar documentación vigente.

### 8. Notificaciones

- Recibe notificaciones cuando:
  - Un documento es aprobado o rechazado.
  - Un documento está próximo a vencer o venció.
  - Se solicitan documentos faltantes.

---

## Guía para CHOFER

El CHOFER tiene acceso limitado al sistema. Puede consultar sus equipos y cargar documentos propios.

### Resumen de funcionalidades

| Módulo | Acciones disponibles |
|--------|---------------------|
| Documentos | Cargar documentos propios, ver estado |
| Equipos | Consultar equipos donde participa |
| Remitos | Cargar remitos |
| Notificaciones | Ver notificaciones |

### 1. Página de Inicio

**Ruta**: `/chofer`

La página de inicio del chofer presenta:

- **Consulta de Equipos**: buscar equipos donde el chofer participa.
  - Buscar por DNI propio, patente del camión o acoplado.
  - Ver el estado completo de la documentación.
  - Identificar documentos faltantes o vencidos.
  - Actualizar documentos desde esta pantalla.

**Nota importante**: los documentos cargados quedan pendientes de aprobación por el Dador de Carga o un administrador.

### 2. Consultar Equipos

1. En la página de inicio, el sistema muestra automáticamente los equipos del chofer.
2. Para cada equipo se puede ver:
   - Datos del equipo (camión, acoplado, empresa transportista).
   - Estado documental general (completo, incompleto, vencido).
   - Lista de documentos con sus estados individuales.
   - Documentos faltantes que necesitan ser cargados.

### 3. Cargar Documentos

1. Desde el detalle de un equipo o desde la consulta, presionar **Subir Documento**.
2. Seleccionar el tipo de documento (ej: Licencia de Conducir, Carnet Sanitario).
3. Seleccionar el archivo (PDF o imagen).
4. Presionar **Cargar**.
5. El documento se procesa automáticamente por IA y queda pendiente de aprobación.

### 4. Renovar Documentos Vencidos

1. En el detalle del equipo, identificar los documentos vencidos (marcados en rojo).
2. Presionar **Renovar** en el documento vencido.
3. Subir el nuevo archivo.
4. El nuevo documento reemplaza al anterior tras ser aprobado.

### 5. Cargar Remitos

**Ruta**: `/remitos`

1. Presionar **Nuevo Remito**.
2. Seleccionar las imágenes/fotos del remito.
3. Presionar **Cargar**.
4. El remito se procesa automáticamente por IA.

### 6. Documentos Rechazados

Si un documento es rechazado por el administrador:
1. Se recibe una notificación con el motivo del rechazo.
2. Ir al documento rechazado.
3. Presionar **Re-enviar**.
4. Subir el archivo corregido.

### 7. Notificaciones

**Ruta**: `/notificaciones`

El chofer recibe notificaciones sobre:
- Documentos aprobados.
- Documentos rechazados (con motivo).
- Documentos próximos a vencer.
- Documentos vencidos.
- Solicitudes de documentos faltantes.

Además, si está configurado, recibe **notificaciones por WhatsApp** cuando un documento está por vencer o ya venció.

### 8. Perfil

**Ruta**: `/perfil`

- Ver datos personales.
- Cambiar contraseña.

---

## Funcionalidades Comunes

Estas funcionalidades están disponibles para todos los usuarios autenticados, independientemente de su rol.

### Notificaciones Internas

**Ruta**: `/notificaciones` o ícono de campana en la barra superior.

- **Campana con badge**: muestra la cantidad de notificaciones no leídas.
- **Lista de notificaciones**: ordenadas por fecha, más recientes primero.
- **Marcar como leída**: presionar la notificación para marcarla como leída.
- **Marcar todas como leídas**: botón para limpiar todas las notificaciones.
- **Eliminar**: eliminar notificaciones individuales o todas las leídas.

### Tipos de notificaciones

| Notificación | Descripción |
|-------------|-------------|
| Documento aprobado | Un documento fue aprobado por un administrador |
| Documento rechazado | Un documento fue rechazado (incluye motivo) |
| Documento por vencer | Un documento vence en los próximos días |
| Documento vencido | Un documento ya venció |
| Documento faltante | Se detectó un documento requerido que no fue cargado |
| Equipo incompleto | El equipo tiene documentación faltante |
| Equipo completo | Todos los documentos del equipo están vigentes |
| Transferencia solicitada | Se solicitó transferir entidades |
| Transferencia aprobada | Una solicitud de transferencia fue aprobada |
| Transferencia rechazada | Una solicitud de transferencia fue rechazada |

### Perfil y Contraseña

**Ruta**: `/perfil`

Todos los usuarios pueden:
- Ver su perfil (nombre, email, rol, empresa).
- Cambiar su contraseña (requiere contraseña actual).

### Búsqueda Global

Disponible en varias secciones del sistema. Permite buscar entidades (choferes, camiones, acoplados, equipos) por texto libre. Los resultados se filtran automáticamente según el rol del usuario.

---

## Glosario

| Término | Definición |
|---------|-----------|
| **Equipo** | Unidad operativa compuesta por chofer + camión + acoplado (opcional) + empresa transportista (opcional) |
| **Dador de Carga** | Empresa que contrata el servicio de transporte y es responsable de la documentación |
| **Empresa Transportista** | Empresa que presta el servicio de transporte con sus vehículos y choferes |
| **Chofer** | Persona que conduce el vehículo de transporte |
| **Cliente** | Empresa destinataria de la carga que exige requisitos documentales |
| **Template** | Tipo de documento (ej: Licencia de Conducir, Seguro, VTV) |
| **Plantilla de Requisitos** | Conjunto de templates que un cliente exige a los equipos |
| **Estado Documental** | Evaluación global de la documentación de un equipo (Completo, Incompleto, Vencido, Por Vencer) |
| **Compliance** | Cumplimiento de los requisitos documentales exigidos por los clientes |
| **Remito** | Documento de transporte que registra datos de la carga, origen, destino y pesos |
| **Transferencia** | Proceso de mover una entidad (chofer, camión, etc.) de un dador de carga a otro |
| **Pre-check** | Verificación previa a la creación de un equipo para detectar entidades existentes y conflictos |
| **Clasificación IA** | Proceso automático donde la inteligencia artificial identifica el tipo de documento y extrae datos |
| **Confianza IA** | Porcentaje que indica qué tan segura está la IA de los datos extraídos (0-100%) |
| **Tenant** | Empresa que opera en la plataforma (multitenancy: cada empresa ve solo sus datos) |
| **Semáforo** | Indicador visual del estado documental (verde: completo, amarillo: por vencer, rojo: vencido) |
| **MinIO** | Servidor de almacenamiento de archivos (documentos, imágenes) |
| **Flowise** | Motor de inteligencia artificial para clasificación y extracción de datos de documentos |
| **Evolution API** | API de integración con WhatsApp para envío de notificaciones |
| **BullMQ** | Sistema de colas para procesamiento asíncrono de documentos y remitos |
