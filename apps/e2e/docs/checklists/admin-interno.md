<!-- Propósito: checklist del Portal Admin Interno (derivado de pruebas-del-sistema.txt). -->

# Portal Admin Interno - Checklist

Fuente: `pruebas-del-sistema.txt` (extraído del PDF).

## 1. AUTENTICACIÓN Y ACCESO
### 1.1 Login
- [x] Ingresar con email y contraseña válidos de usuario ADMIN_INTERNO
- [x] Verificar que redirige correctamente al Dashboard (/portal/admin-interno)
- [x] Intentar ingresar con email válido pero contraseña incorrecta → debe mostrar error
- [x] Intentar ingresar con email inexistente → debe mostrar error
- [x] Verificar que el logo de BCA se muestra correctamente en la pantalla de login
- [x] Verificar que el token se almacena en localStorage tras login exitoso
- [x] Si tiene contraseña temporal, debe forzar cambio de contraseña
### 1.2 Sesión
- [x] Verificar que la sesión persiste al refrescar la página (F5)
- [x] Verificar que al cerrar sesión se elimina el token y redirige al login
- [x] Verificar que al expirar el token se redirige al login automáticamente
- [x] Intentar acceder a /portal/admin-interno sin sesión → debe redirigir a login
### 1.3 Autorización - Accesos Permitidos (MÁXIMOS)
- [x] Puede acceder a /portal/admin-interno (Dashboard)
- [x] Puede acceder a /documentos/consulta (Consulta de Equipos)
- [x] Puede acceder a /documentos/equipos/alta-completa (Alta Completa)
- [x] Puede acceder a /documentos/equipos/:id/editar (Editar Equipo)
- [x] Puede acceder a /documentos/equipos/:id/estado (Ver Estado)
- [x] Puede acceder a /documentos/aprobacion (Cola de Aprobaciones)
- [x] Puede acceder a /documentos/aprobacion/:id (Detalle de Aprobación)
- [x] Puede acceder a /documentos/auditoria (Auditoría - EXCLUSIVO)
- [x] Puede acceder a /platform-users (Gestión de Usuarios)
- [x] Puede acceder a /transportista (Portal Transportista)
- [x] Puede acceder a /chofer (Portal Chofer)
- [x] Puede acceder a /dador (Portal Dador de Carga)
- [x] Puede acceder a /cliente (Portal Cliente)
- [x] Puede acceder a /cliente/equipos/:id (Detalle Equipo Cliente)
- [x] Puede acceder a /perfil (Mi Perfil)
### 1.4 Autorización - Accesos Restringidos
- [x] NO puede acceder a /empresas (solo SUPERADMIN)
- [x] NO puede acceder a /end-users (solo ADMIN/SUPERADMIN)
- [x] NO puede crear usuarios ADMIN_INTERNO (solo ADMIN/SUPERADMIN pueden)
- [x] NO puede crear usuarios SUPERADMIN
- [x] NO puede crear usuarios ADMIN
## 2. DASHBOARD PRINCIPAL (/portal/admin-interno)
### 2.1 Interfaz Visual
- [x] Verificar que se muestra el logo de Grupo BCA (tamaño h-32 md:h-40)
- [x] Verificar que el título dice "Portal Admin Interno"
- [x] Verificar que el subtítulo dice "Gestión completa de equipos y documentación"
- [x] Fondo con gradiente slate-50 a slate-100 (light) / slate-900 a slate-800 (dark)
- [x] Layout centrado con max-w-6xl
### 2.2 Tarjeta "Alta Completa de Equipo"
- [x] Visible con icono de camión (TruckIcon) en azul
- [x] Título: "Alta Completa de Equipo"
- [x] Descripción: "Registrar nuevo equipo con toda su documentación"
- [x] Lista de características:
- "Carga de empresa transportista y chofer"
- "Registro de camión y acoplado"
- "Subida de todos los documentos requeridos"
- [x] Botón "Iniciar Alta Completa" en azul
- [x] Hover: efecto de sombra, escala 1.02, borde azul
- [x] Click en tarjeta → navega a /documentos/equipos/alta-completa
- [x] Click en botón → navega a /documentos/equipos/alta-completa
### 2.3 Tarjeta "Consulta de Equipos"
- [x] Visible con icono de lupa (MagnifyingGlassIcon) en verde
- [x] Título: "Consulta de Equipos"
- [x] Descripción: "Buscar equipos existentes y actualizar su documentación"
- [x] Lista de características:
- "Buscar por DNI chofer, patente camión o acoplado"
- "Ver estado completo de documentación"
- "Actualizar documentos vencidos o faltantes"
- [x] Botón "Ir a Consulta" en verde
- [x] Hover: efecto de sombra, escala 1.02, borde verde
- [x] Click en tarjeta → navega a /documentos/consulta
- [x] Click en botón → navega a /documentos/consulta
### 2.4 Barra de Acceso Rápido
- [x] Card oscura (slate-800/900) al final
- [x] Texto "Acceso rápido:"
- [x] Botón "Aprobaciones Pendientes" visible → navega a /documentos/aprobacion
- [x] Botón "Auditoría" visible (EXCLUSIVO) → navega a /documentos/auditoria
- [x] Estilo de botones: borde slate-600, hover bg-slate-700
## 3. AUDITORÍA (/documentos/auditoria)
- EXCLUSIVO ADMIN INTERNO
### 3.1 Navegación y Layout
- [x] Botón "Volver" visible → navega a /portal/admin-interno
- [x] Título visible: "Auditoría" o similar
- [x] Solo ADMIN_INTERNO (y SUPERADMIN/ADMIN) tienen acceso
### 3.2 Filtros de Auditoría
- [x] Campo "Desde" (fecha) - filtro por fecha inicio
- [x] Campo "Hasta" (fecha) - filtro por fecha fin
- [x] Campo "Email" - filtro por email de usuario
- [x] Selector "Rol" - filtro por rol de usuario
- [x] Selector "Método" - filtro por método HTTP (GET, POST, PUT, DELETE)
- [x] Campo "Status Code" - filtro por código de respuesta
- [x] Campo "Acción" - filtro por tipo de acción
- [x] Campo "Tipo de Entidad" - filtro por entidad afectada
- [x] Campo "ID de Entidad" - filtro por ID específico
- [x] Campo "Ruta contiene" - filtro por path de la request
### 3.3 Columnas Visibles
- [x] Toggle para mostrar/ocultar columnas:
- Fecha
- Acción
- Método
- Status
- Usuario
- Rol
- Entidad
- Ruta
- [x] Configuración persiste durante la sesión
### 3.4 Lista de Logs
- [x] Tabla con registros de auditoría
- [x] Ordenados por fecha (más reciente primero)
- [x] Muestra información según columnas activas
- [x] Paginación funcional (20 registros por página)
- [x] Navegación entre páginas
### 3.5 Exportación
- [x] Botón "Exportar CSV" visible
- [x] Click → descarga archivo CSV con los logs filtrados
- [x] Botón "Exportar XLSX" visible
- [x] Click → descarga archivo Excel con los logs filtrados
- [x] Exportación respeta los filtros aplicados
- [x] Spinner durante la descarga
- [x] Toast de éxito/error
### 3.6 Información de Cada Log
- [x] Fecha y hora del evento
- [x] Usuario que realizó la acción (email)
- [x] Rol del usuario
- [x] Método HTTP
- [x] Código de estado HTTP
- [x] Ruta/endpoint afectado
- [x] Tipo de entidad afectada
- [x] ID de entidad afectada
- [x] Acción realizada
## 4. APROBACIÓN DE DOCUMENTOS
(/documentos/aprobacion)
### 4.1 Navegación y Layout
- [x] Botón "Volver" visible → navega a /portal/admin-interno
- [x] Título: "Aprobación de Documentos"
- [x] Descripción: "Revisá y aprobá o rechazá documentos clasificados por la IA."
### 4.2 KPIs Dashboard
- [x] Card "Pendientes" con número total
- [x] Card "Aprobados hoy" con contador
- [x] Card "Rechazados hoy" con contador
- [x] Card "T. medio revisión (m)" con promedio en minutos
- [x] KPIs se actualizan al refrescar
### 4.3 Filtros
- [x] Selector de tipo de entidad:
- "Todas las entidades"
- "Empresa Transportista"
- "Chofer"
- "Camión"
- "Acoplado"
- [x] Botón "Filtrar" aplica filtro
- [x] Botón "Refrescar" recarga lista
- [x] Admin Interno ve documentos de TODOS los dadores
### 4.4 Lista de Documentos Pendientes
- [x] Tabla con: ID, Entidad, Identidad, Tipo Doc, Subido, Vence, Acciones
- [x] Ordenados por fecha de subida (más reciente primero)
- [x] Muestra datos detectados por IA
- [x] Botón "Revisar" por documento
### 4.5 Paginación
- [x] 20 documentos por página
- [x] Navegación entre páginas
## 5. DETALLE DE APROBACIÓN
(/documentos/aprobacion/:id)
### 5.1 Navegación
- [x] Botón "Volver" funcional
- [x] Si documento ya no está pendiente → redirige a cola
### 5.2 Vista Previa
- [x] Preview del documento (PDF/imagen)
- [x] Loading mientras carga
- [x] Manejo de errores
- [x] Reintentos automáticos
### 5.3 Información del Documento
- [x] Tipo de entidad detectado por IA
- [x] ID de entidad detectado
- [x] Tipo de documento detectado
- [x] Fecha de vencimiento detectada
- [x] Fecha de subida
### 5.4 Campos Editables
- [x] Selector de tipo de entidad
- [x] Campo de ID de entidad
- [x] Campo de fecha de vencimiento (dd/mm/aaaa)
- [x] Selector de template
- [x] Campo de notas de revisión
### 5.5 Aprobar
- [x] Botón "Aprobar" visible
- [x] Validaciones (tipo entidad, ID, template)
- [x] Éxito → confirmación y redirige
- [x] Error → mensaje apropiado
### 5.6 Rechazar
- [x] Botón "Rechazar" visible (rojo)
- [x] Modal con campo "Motivo de rechazo"
- [x] Motivo obligatorio
- [x] Éxito → confirmación y redirige
### 5.7 Corrección de IA
- [x] Puede cambiar todos los campos detectados
- [x] Cambios se aplican al aprobar
## 6. ALTA COMPLETA DE EQUIPO
(/documentos/equipos/alta-completa)
### 6.1 Navegación
- [x] Botón "Volver" → navega al home del rol
### 6.2 Selector de Dador de Carga (EXCLUSIVO ADMIN INTERNO)
- [x] Sección destacada (fondo púrpura/violeta)
- [x] Título: indica que es para seleccionar dador
- [x] Selector con lista de TODOS los dadores de carga
- [x] Puede seleccionar cualquier dador
- [x] Campo obligatorio antes de continuar
- [x] Muestra razón social de cada dador
### 6.3 Selector de Clientes
- [x] Selector múltiple de clientes
- [x] Muestra TODOS los clientes del sistema
- [x] Puede asignar múltiples clientes
### 6.4 Datos de Empresa Transportista
- [x] Campo "Razón Social" obligatorio
- [x] Campo "CUIT" obligatorio (11 dígitos)
- [x] Validación de formato
- [x] Crea o asocia según existencia
### 6.5 Datos del Chofer
- [x] Campo "Nombre" obligatorio
- [x] Campo "Apellido" obligatorio
- [x] Campo "DNI" obligatorio (mínimo 6 caracteres)
- [x] Campo "Teléfonos" opcional
- [x] Crea o asocia según existencia
### 6.6 Datos del Camión
- [x] Campo "Patente" obligatorio (mínimo 5 caracteres)
- [x] Campo "Marca" opcional
- [x] Campo "Modelo" opcional
### 6.7 Datos del Acoplado (Opcional)
- [x] Campo "Patente" opcional
- [x] Campo "Tipo" opcional
- [x] Si vacío → sin acoplado
### 6.8 Secciones de Documentos
- [x] Sección Empresa Transportista
- [x] Sección Chofer
- [x] Sección Camión
- [x] Sección Acoplado (condicional)
- [x] Cada doc: archivo + fecha de vencimiento
### 6.9 Barra de Progreso
- [x] Porcentaje de documentos completados
- [x] 100% cuando todo completo
### 6.10 Creación del Equipo
- [x] Botón habilitado solo cuando todo completo
- [x] Proceso transaccional
- [x] Documentos → estado APROBADO (admin los aprueba)
- [x] Rollback si falla
- [x] Mensaje de éxito/error
## 7. CONSULTA DE EQUIPOS (/documentos/consulta)
### 7.1 Navegación
- [x] Botón "Volver" → navega a /portal/admin-interno
- [x] Título: "Consulta"
### 7.2 Filtros de Entidad (COMPLETOS - ve todo)
- [x] "Todos los equipos" - muestra todo el sistema
- [x] "Por Dador" - selector con TODOS los dadores
- [x] "Por Cliente" - selector con TODOS los clientes
- [x] "Por Empresa Transp." - selector con TODAS las empresas
- [x] Puede ver equipos de cualquier dador
### 7.3 Filtros Adicionales
- [x] Campo "DNI Chofer"
- [x] Campo "Patente Camión"
- [x] Campo "Patente Acoplado"
- [x] Filtro "Solo Activos" / "Solo Inactivos" / "Todos"
### 7.4 Búsqueda
- [x] Botón "Buscar"
- [x] Botón "Limpiar"
- [x] Resultados paginados
### 7.5 Búsqueda Masiva
- [x] Botón "? Buscar por DNIs o Patentes"
- [x] Modal con textarea
- [x] Búsqueda masiva funcional
## 8. DASHBOARD DE ESTADO DOCUMENTAL
### 8.1 Contadores
- [x] "Total" - todos los equipos del resultado
- [x] "Faltantes" - con docs faltantes
- [x] "Vencidos" - con docs vencidos
- [x] "Por Vencer" - con docs por vencer
- [x] Click → filtra
### 8.2 Filtros Interactivos
- [x] Click aplica/quita filtro
- [x] Indicador visual
- [x] "Quitar filtro" funcional
## 9. LISTA DE EQUIPOS
### 9.1 Información por Equipo
- [x] "Equipo #ID"
- [x] Estado (activa/inactiva)
- [x] Badge Activo/Inactivo
- [x] DNI del chofer
- [x] Patente camión
- [x] Patente acoplado
- [x] Clientes asignados
### 9.2 Semáforo de Documentación
- [x] ? Faltantes
- [x] ? Vencidos
- [x] ? Por vencer
- [x] ? Vigentes
### 9.3 Acciones por Equipo
- [x] " Editar"
- [x] "Bajar documentación"
- [x] "Ver estado"
- [x] " Desactivar"	⏸ / " Activar"	▶
- [x] "Eliminar"
## 10. EDITAR EQUIPO
(/documentos/equipos/:id/editar)
### 10.1 Permisos del Admin Interno (MÁXIMOS)
- [x] isAdmin = true
- [x] canEdit = true - PUEDE modificar entidades
- [x] canManageClients = true - PUEDE gestionar clientes
- [x] canUploadDocs = true - PUEDE subir documentos
### 10.2 Modificar Entidades
- [x] Cambiar Chofer (selector + crear nuevo)
- [x] Cambiar Camión (selector + crear nuevo)
- [x] Cambiar Acoplado (selector + crear nuevo)
- [x] Cambiar Empresa Transportista (selector + crear nuevo)
- [x] Crear usuario al crear entidad
### 10.3 Gestionar Clientes (COMPLETO)
- [x] Sección "Clientes Asignados" visible
- [x] Lista de clientes actuales
- [x] Puede agregar cualquier cliente
- [x] Puede quitar clientes
- [x] Rangos de fechas editables
### 10.4 Subida de Documentos
- [x] Puede subir para todas las entidades
- [x] Documentos → estado APROBADO automáticamente
- [x] Puede renovar documentos
## 11. GESTIÓN DE USUARIOS (/platform-users)
### 11.1 Permisos de Creación
- [x] Puede crear: OPERATOR, OPERADOR_INTERNO, DADOR_DE_CARGA, TRANSPORTISTA, CHOFER, CLIENTE
- [x] NO puede crear: SUPERADMIN, ADMIN, ADMIN_INTERNO
### 11.2 Crear Usuario OPERATOR/OPERADOR_INTERNO
- [x] Rol seleccionable
- [x] Campos: email, nombre, apellido
- [x] Contraseña temporal generada
### 11.3 Crear Usuario DADOR_DE_CARGA
- [x] Rol seleccionable
- [x] Modo "Crear Nuevo Dador":
- Campo Razón Social
- Campo CUIT
- Email obligatorio
- [x] Modo "Dador Existente":
- Selector de dadores
- [x] Contraseña temporal generada
### 11.4 Crear Usuario TRANSPORTISTA
- [x] Rol seleccionable
- [x] Selector de Dador de Carga (ve todos)
- [x] Modo "Crear Nueva Transportista":
- Razón Social, CUIT, Email
- [x] Modo "Transportista Existente":
- Selector filtrado por dador
- [x] Contraseña temporal generada
### 11.5 Crear Usuario CHOFER
- [x] Rol seleccionable
- [x] Selector de Dador de Carga
- [x] Selector de Empresa Transportista
- [x] Modo "Crear Nuevo Chofer":
- DNI, Nombre, Apellido, Email
- [x] Modo "Chofer Existente":
- Selector filtrado por transportista
- [x] Contraseña temporal generada
### 11.6 Crear Usuario CLIENTE
- [x] Rol seleccionable
- [x] Selector de Cliente existente O crear nuevo
- [x] Campos según modo
- [x] Contraseña temporal generada
### 11.7 Editar Usuarios
- [x] Puede editar usuarios de los roles que puede crear
- [x] Campos editables: Nombre, Apellido, Contraseña
- [x] Puede cambiar asociaciones (dador, transportista, etc.)
### 11.8 Lista de Usuarios
- [x] Ve usuarios de todos los roles que puede gestionar
- [x] Filtros por rol, email, nombre
- [x] Paginación y búsqueda
## 12. ACTIVAR/DESACTIVAR EQUIPO
### 12.1 Desactivar
- [x] Botón " Desactivar"	⏸
- [x] Click → desactiva
- [x] Toast confirmación
### 12.2 Activar
- [x] Botón " Activar"	▶
- [x] Click → activa
- [x] Toast confirmación
## 13. ELIMINAR EQUIPO
- [x] Botón "Eliminar" (rojo)
- [x] Diálogo de confirmación
- [x] "Cancelar" → cierra
- [x] "Eliminar" → elimina
- [x] Toast confirmación
## 14. DESCARGAS
### 14.1 Individual
- [x] Botón "Bajar documentación"
- [x] Descarga ZIP del equipo
### 14.2 Masiva
- [x] Botón "Bajar documentación vigente (ZIP)"
- [x] Descarga todos los equipos del resultado
## 15. PAGINACIÓN
- [x] Visible con más de 10 equipos
- [x] "Mostrando X - Y de Z"
- [x] Navegación funcional
## 16. MI PERFIL (/perfil)
### 16.1 Información
- [x] Nombre
- [x] Email
- [x] Rol: "ADMIN_INTERNO"
### 16.2 Cambiar Contraseña
- [x] Formulario de cambio
- [x] Validaciones
- [x] Mensaje de éxito
## 17. FLUJO DE APROBACIÓN
### 17.1 Documentos de Transportistas/Choferes
- [x] Aparecen en cola de aprobaciones
- [x] Admin puede aprobar/rechazar
- [x] KPIs se actualizan
### 17.2 Documentos Subidos por Admin Interno
- [x] Estado APROBADO automáticamente
- [x] No aparecen en cola
### 17.3 Revisar y Aprobar
- [x] Ver preview
- [x] Corregir IA si necesario
- [x] Aprobar → estado APROBADO
- [x] Rechazar → estado RECHAZADO con motivo
## 18. ACCESO A TODOS LOS PORTALES
### 18.1 Portal Cliente
- [x] Puede acceder a /cliente
- [x] Ve equipos como cliente
- [x] Funcionalidad completa del portal cliente
### 18.2 Portal Transportista
- [x] Puede acceder a /transportista
- [x] Ve funcionalidad del transportista
### 18.3 Portal Dador de Carga
- [x] Puede acceder a /dador
- [x] Ve funcionalidad del dador
### 18.4 Portal Chofer
- [x] Puede acceder a /chofer
- [x] Ve funcionalidad del chofer
## 19. CASOS ESPECIALES
### 19.1 Crear Equipo para Cualquier Dador
- [x] Selector de dador funcional
- [x] Equipo se asocia al dador seleccionado
- [x] Documentos aprobados automáticamente
### 19.2 Ver Equipos de Todos los Dadores
- [x] Sin filtro → ve todo el sistema
- [x] Puede filtrar por dador específico
### 19.3 Auditoría - Filtros Combinados
- [x] Múltiples filtros al mismo tiempo
- [x] Resultados respetan todos los filtros
- [x] Exportación con filtros aplicados
### 19.4 Auditoría - Grandes Volúmenes
- [x] Paginación funciona con miles de registros
- [x] Exportación maneja grandes volúmenes
- [x] Performance aceptable
## 20. RENDIMIENTO Y UX
### 20.1 Estados de Carga
- [x] Spinner al buscar
- [x] Spinner al aprobar/rechazar
- [x] Spinner al cargar auditoría
- [x] Spinner al exportar
### 20.2 Feedback Visual
- [x] Toast de éxito/error
- [x] Hover effects
- [x] Transiciones suaves
### 20.3 Manejo de Errores
- [x] Error de red → mensaje
- [x] Error 401 → login
- [x] Error 403 → acceso denegado
- [x] Export error → mensaje
### 20.4 Responsividad
- [x] Desktop (1920px) ✓
- [x] Laptop (1366px) ✓
- [x] Tablet (768px) ✓
- [x] Móvil (375px) ✓
### 20.5 Tema Oscuro
- [x] Dashboard dark mode
- [x] Auditoría dark mode
- [x] Aprobaciones dark mode
- [x] Colores correctos
## 21. SEGURIDAD
### 21.1 Visibilidad Total
- [x] Ve equipos de todos los dadores
- [x] Ve usuarios de todos los roles permitidos
- [x] Ve documentos de todo el sistema
- [x] Ve logs de auditoría completos
### 21.2 Permisos de Escritura
- [x] Puede crear equipos para cualquier dador
- [x] Puede modificar cualquier equipo
- [x] Puede subir documentos (aprobados automáticamente)
- [x] Puede aprobar/rechazar documentos
- [x] Puede gestionar clientes
- [x] Puede crear usuarios (roles permitidos)
### 21.3 Restricciones
- [x] NO puede crear usuarios ADMIN/SUPERADMIN/ADMIN_INTERNO
- [x] NO puede acceder a gestión de empresas
- [x] Acciones registradas en auditoría
## 22. AUDITORÍA - CASOS DE USO
### 22.1 Investigar Actividad de Usuario
- [x] Filtrar por email específico
- [x] Ver todas las acciones del usuario
- [x] Identificar patrones sospechosos
### 22.2 Investigar Cambios en Entidad
- [x] Filtrar por tipo de entidad + ID
- [x] Ver historial de cambios
- [x] Identificar quién hizo cambios
### 22.3 Monitorear Errores
- [x] Filtrar por status code >= 400
- [x] Identificar endpoints con problemas
- [x] Revisar patrones de errores
### 22.4 Reporte de Actividad
- [x] Filtrar por rango de fechas
- [x] Exportar a CSV/Excel
- [x] Análisis offline
### 22.5 Filtros por Método HTTP
- [x] GET - consultas
- [x] POST - creaciones
- [x] PUT/PATCH - modificaciones
- [x] DELETE - eliminaciones
## 23. DATOS DE PRUEBA RECOMENDADOS
- [x] Al menos 3 dadores de carga diferentes
- [x] Al menos 5 empresas transportistas
- [x] Al menos 10 choferes
- [x] Al menos 3 clientes
- [x] Al menos 20 equipos (distribuidos entre dadores)
- [x] Documentos pendientes de aprobación (varios dadores)
- [x] Registros de auditoría (varios días, usuarios, acciones)
- [x] Usuarios de todos los roles creables
- [x] Equipos con múltiples clientes
- [x] Equipos activos e inactivos
- [x] Documentos en todos los estados
## 24. INTEGRACIONES
### 24.1 Con Todos los Roles
- [x] Ve y gestiona datos de todos los roles
- [x] Puede impersonar funcionalidad de cualquier portal
- [x] Centraliza la gestión del sistema
### 24.2 Con IA de Clasificación
- [x] Ve clasificaciones de IA
- [x] Puede corregir errores de IA
- [x] Aprueba/rechaza documentos clasificados
### 24.3 Con Sistema de Auditoría
- [x] Todas sus acciones se registran
- [x] Puede revisar logs propios y de otros
- [x] Exporta reportes de actividad
