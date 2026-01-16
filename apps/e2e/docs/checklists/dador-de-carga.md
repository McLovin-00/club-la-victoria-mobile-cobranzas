<!-- Propósito: checklist del Portal Dador de Carga (derivado de pruebas-del-sistema.txt). -->

# Portal Dador de Carga - Checklist

Fuente: `pruebas-del-sistema.txt` (extraído del PDF).

## 1. AUTENTICACIÓN Y ACCESO
### 1.1 Login
- [x] Ingresar con email y contraseña válidos de usuario DADOR_DE_CARGA
- [x] Verificar que redirige correctamente al Dashboard (/dador)
- [x] Intentar ingresar con email válido pero contraseña incorrecta → debe mostrar error
- [x] Intentar ingresar con email inexistente → debe mostrar error
- [x] Verificar que el logo de BCA se muestra correctamente en la pantalla de login
- [x] Verificar que el token se almacena en localStorage tras login exitoso
- [x] Si tiene contraseña temporal, debe forzar cambio de contraseña
### 1.2 Sesión
- [x] Verificar que la sesión persiste al refrescar la página (F5)
- [x] Verificar que al cerrar sesión se elimina el token y redirige al login
- [x] Verificar que al expirar el token se redirige al login automáticamente
- [x] Intentar acceder a /dador sin sesión → debe redirigir a login
### 1.3 Autorización - Accesos Permitidos
- [x] Puede acceder a /dador (Dashboard)
- [x] Puede acceder a /documentos/consulta (Consulta de Equipos)
- [x] Puede acceder a /documentos/equipos/alta-completa (Alta Completa)
- [x] Puede acceder a /documentos/equipos/:id/editar (Editar Equipo)
- [x] Puede acceder a /documentos/equipos/:id/estado (Ver Estado)
- [x] Puede acceder a /documentos/aprobacion (Cola de Aprobaciones)
- [x] Puede acceder a /documentos/aprobacion/:id (Detalle de Aprobación)
- [x] Puede acceder a /platform-users (Gestión de Usuarios)
- [x] Puede acceder a /transportista (Portal Transportista)
- [x] Puede acceder a /chofer (Portal Chofer)
- [x] Puede acceder a /perfil (Mi Perfil)
### 1.4 Autorización - Accesos Restringidos
- [x] NO puede acceder a /admin/* (rutas de admin)
- [x] NO puede acceder a /cliente/* (portal cliente)
- [x] NO puede acceder a /portal/admin-interno (admin interno)
- [x] NO puede acceder a /empresas (gestión de empresas)
- [x] NO puede acceder a /end-users (usuarios finales)
- [x] NO puede acceder a /documentos/auditoria (auditoría - solo admin interno)
- [x] NO puede crear usuarios DADOR_DE_CARGA
- [x] NO puede crear usuarios ADMIN_INTERNO
- [x] NO puede crear usuarios SUPERADMIN/ADMIN
## 2. DASHBOARD PRINCIPAL (/dador)
### 2.1 Interfaz Visual
- [x] Verificar que se muestra el logo de Grupo BCA (tamaño h-32 md:h-40)
- [x] Verificar que el título dice "Portal Dador de Carga"
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
- [x] Botón "Aprobaciones Pendientes" visible
- [x] Click en botón → navega a /documentos/aprobacion
- [x] Estilo del botón: borde slate-600, hover bg-slate-700
## 3. APROBACIÓN DE DOCUMENTOS
(/documentos/aprobacion)
### 3.1 Navegación y Layout
- [x] Botón "Volver" visible → navega a /portal/dadores
- [x] Título: "Aprobación de Documentos"
- [x] Descripción: "Revisá y aprobá o rechazá documentos clasificados por la IA."
### 3.2 KPIs Dashboard
- [x] Card "Pendientes" con número de documentos pendientes
- [x] Card "Aprobados hoy" con contador
- [x] Card "Rechazados hoy" con contador
- [x] Card "T. medio revisión (m)" con promedio en minutos
- [x] KPIs se actualizan al refrescar
### 3.3 Filtros
- [x] Selector de tipo de entidad:
- "Todas las entidades"
- "Empresa Transportista"
- "Chofer"
- "Camión"
- "Acoplado"
- [x] Botón "Filtrar" aplica el filtro
- [x] Botón "Refrescar" recarga la lista
- [x] Filtro funciona correctamente por tipo de entidad
### 3.4 Lista de Documentos Pendientes
- [x] Tabla con columnas: ID, Entidad, Identidad, Tipo Doc, Subido, Vence, Acciones
- [x] Ordenados por fecha de subida (más reciente primero)
- [x] Muestra tipo de entidad detectado
- [x] Muestra ID natural de la entidad (DNI, patente, CUIT)
- [x] Muestra tipo de documento detectado
- [x] Muestra fecha de subida formateada
- [x] Muestra fecha de vencimiento (si existe)
- [x] Botón "Revisar" por cada documento → navega al detalle
### 3.5 Paginación
- [x] Paginación funcional con 20 documentos por página
- [x] Navegación entre páginas
- [x] Indicador de página actual
## 4. DETALLE DE APROBACIÓN
(/documentos/aprobacion/:id)
### 4.1 Navegación
- [x] Botón "Volver" funcional
- [x] Si el documento ya no está pendiente (404) → redirige a la cola
### 4.2 Vista Previa del Documento
- [x] Muestra preview del documento (PDF/imagen)
- [x] Preview cargado con autorización
- [x] Loading mientras carga el preview
- [x] Manejo de errores si no se puede cargar
- [x] Reintentos automáticos (hasta 3 veces)
### 4.3 Información del Documento
- [x] Tipo de entidad detectado por IA
- [x] ID de entidad detectado
- [x] Tipo de documento detectado
- [x] Fecha de vencimiento detectada (si aplica)
- [x] Fecha de subida
- [x] Información del template
### 4.4 Campos Editables
- [x] Selector de tipo de entidad (para corregir IA)
- [x] Campo de ID de entidad (para corregir)
- [x] Campo de fecha de vencimiento (formato dd/mm/aaaa)
- [x] Selector de template (tipo de documento)
- [x] Campo de notas de revisión
### 4.5 Acción: Aprobar
- [x] Botón "Aprobar" visible
- [x] Click → muestra spinner mientras procesa
- [x] Validaciones:
- Tipo de entidad seleccionado
- ID de entidad ingresado
- Template seleccionado
- [x] Éxito → mensaje de confirmación
- [x] Éxito → redirige a la cola de aprobaciones
- [x] Error → mensaje de error apropiado
### 4.6 Acción: Rechazar
- [x] Botón "Rechazar" visible (rojo)
- [x] Click → abre modal/formulario de rechazo
- [x] Campo "Motivo de rechazo" obligatorio
- [x] Botón "Confirmar Rechazo"
- [x] Botón "Cancelar"
- [x] Éxito → mensaje de confirmación
- [x] Éxito → redirige a la cola
- [x] Error → mensaje de error
### 4.7 Corrección de IA
- [x] Puede cambiar el tipo de entidad detectado
- [x] Puede cambiar el ID de entidad detectado
- [x] Puede cambiar el tipo de documento detectado
- [x] Puede ajustar la fecha de vencimiento
- [x] Cambios se guardan al aprobar
## 5. ALTA COMPLETA DE EQUIPO
(/documentos/equipos/alta-completa)
### 5.1 Navegación
- [x] Botón "Volver" visible y funcional
- [x] Click en "Volver" → navega al home del rol
### 5.2 Selector de Dador de Carga
- [x] Campo de Dador pre-seleccionado con su propia empresa
- [x] NO editable (es su propio dadorCargaId)
- [x] Muestra razón social del dador
### 5.3 Selector de Clientes
- [x] Selector múltiple de clientes
- [x] Puede seleccionar uno o más clientes
- [x] Solo muestra clientes activos
- [x] Puede asignar clientes al equipo
### 5.4 Datos de Empresa Transportista
- [x] Campo "Razón Social" obligatorio
- [x] Campo "CUIT" obligatorio (11 dígitos)
- [x] Validación de formato CUIT
- [x] Si existe → asocia; si no → crea
### 5.5 Datos del Chofer
- [x] Campo "Nombre" obligatorio
- [x] Campo "Apellido" obligatorio
- [x] Campo "DNI" obligatorio (mínimo 6 caracteres)
- [x] Campo "Teléfonos" opcional
- [x] Si existe → asocia; si no → crea
### 5.6 Datos del Camión
- [x] Campo "Patente" obligatorio (mínimo 5 caracteres)
- [x] Campo "Marca" opcional
- [x] Campo "Modelo" opcional
- [x] Si existe → asocia; si no → crea
### 5.7 Datos del Acoplado (Opcional)
- [x] Campo "Patente" opcional
- [x] Campo "Tipo" opcional
- [x] Si vacío → equipo sin acoplado
- [x] Si completo → se requieren docs de acoplado
### 5.8 Secciones de Documentos
- [x] Sección Empresa Transportista con todos sus templates
- [x] Sección Chofer con todos sus templates
- [x] Sección Camión con todos sus templates
- [x] Sección Acoplado (si tiene patente)
- [x] Cada documento: selector de archivo + fecha de vencimiento
### 5.9 Barra de Progreso
- [x] Muestra porcentaje de documentos completados
- [x] 100% cuando todos tienen archivo Y fecha
### 5.10 Creación del Equipo
- [x] Botón "Crear Equipo" deshabilitado hasta completar todo
- [x] Click → proceso transaccional
- [x] Crea entidades + sube documentos
- [x] Documentos quedan en estado APROBADO (dador los aprueba implícitamente)
- [x] Rollback si falla
- [x] Mensaje de éxito/error
## 6. CONSULTA DE EQUIPOS (/documentos/consulta)
### 6.1 Navegación
- [x] Botón "Volver" → navega a /portal/dadores
- [x] Título: "Consulta"
### 6.2 Filtros de Entidad (Completos)
- [x] "Todos los equipos" funcional
- [x] "Por Dador" - pre-seleccionado con su dador
- [x] "Por Cliente" - selector de clientes
- [x] "Por Empresa Transp." - selector de empresas transportistas
- [x] Filtros combinables con búsqueda
### 6.3 Filtros Adicionales
- [x] Campo "DNI Chofer"
- [x] Campo "Patente Camión"
- [x] Campo "Patente Acoplado"
- [x] Filtro "Solo Activos" / "Solo Inactivos" / "Todos"
### 6.4 Búsqueda
- [x] Botón "Buscar" ejecuta búsqueda
- [x] Botón "Limpiar" resetea filtros
- [x] Resultados paginados
### 6.5 Búsqueda Masiva
- [x] Botón "? Buscar por DNIs o Patentes"
- [x] Modal con textarea
- [x] Separadores: coma, espacio, salto de línea
- [x] Ejecuta búsqueda masiva
## 7. DASHBOARD DE ESTADO DOCUMENTAL
### 7.1 Contadores
- [x] "Total" - total de equipos
- [x] "Faltantes" - equipos con docs faltantes
- [x] "Vencidos" - equipos con docs vencidos
- [x] "Por Vencer" - equipos con docs por vencer
- [x] Click en contador → filtra
### 7.2 Filtros Interactivos
- [x] Click en contador aplica/quita filtro
- [x] Indicador visual del filtro activo
- [x] "Quitar filtro" funcional
## 8. LISTA DE EQUIPOS
### 8.1 Información por Equipo
- [x] "Equipo #ID"
- [x] Estado (activa/inactiva)
- [x] Badge Activo/Inactivo
- [x] DNI del chofer
- [x] Patente camión
- [x] Patente acoplado
- [x] Clientes asignados
### 8.2 Semáforo de Documentación
- [x] ? Faltantes
- [x] ? Vencidos
- [x] ? Por vencer
- [x] ? Vigentes
### 8.3 Acciones por Equipo
- [x] " Editar" → edición
- [x] "Bajar documentación" → ZIP
- [x] "Ver estado" → estado
- [x] " Desactivar"	⏸ / " Activar"	▶
- [x] "Eliminar" con confirmación
## 9. EDITAR EQUIPO (/documentos/equipos/:id/editar)
### 9.1 Permisos del Dador de Carga
- [x] canEdit = true - PUEDE modificar entidades
- [x] canManageClients = true - PUEDE gestionar clientes
- [x] canUploadDocs = true - PUEDE subir documentos
### 9.2 Modificar Entidades
- [x] Cambiar Chofer (selector + crear nuevo)
- [x] Cambiar Camión (selector + crear nuevo)
- [x] Cambiar Acoplado (selector + crear nuevo)
- [x] Cambiar Empresa Transportista (selector + crear nuevo)
- [x] Crear usuario al crear entidad (chofer/transportista)
### 9.3 Gestionar Clientes (EXCLUSIVO)
- [x] Sección "Clientes Asignados" visible
- [x] Lista de clientes actuales con fechas desde/hasta
- [x] Botón para agregar cliente
- [x] Selector de cliente a agregar
- [x] Campo de fecha desde
- [x] Campo de fecha hasta (opcional)
- [x] Botón para quitar cliente
- [x] Confirmación al quitar
### 9.4 Subida de Documentos
- [x] Puede subir documentos para todas las entidades
- [x] Documentos subidos → estado APROBADO (dador aprueba implícitamente)
- [x] Puede renovar documentos antes de vencer
## 10. GESTIÓN DE USUARIOS (/platform-users)
### 10.1 Permisos de Creación
- [x] Puede crear: TRANSPORTISTA, CHOFER
- [x] NO puede crear: DADOR_DE_CARGA, ADMIN_INTERNO, ADMIN, SUPERADMIN
### 10.2 Crear Usuario TRANSPORTISTA
- [x] Rol TRANSPORTISTA seleccionable
- [x] Modo "Crear Nueva Empresa Transportista":
- Campo Razón Social
- Campo CUIT
- Campo Email obligatorio
- [x] Modo "Empresa Existente":
- Selector de empresas transportistas
- Solo empresas de su dador
- [x] Dador de Carga: automático (su dadorCargaId)
- [x] Contraseña temporal generada
- [x] Mensaje de éxito con contraseña
### 10.3 Crear Usuario CHOFER
- [x] Rol CHOFER seleccionable
- [x] Dador de Carga: automático
- [x] Selector de Empresa Transportista (sus empresas)
- [x] Modo "Chofer Existente":
- Selector de choferes de la empresa
- [x] Modo "Crear Nuevo Chofer":
- Campos: DNI, Nombre, Apellido
- Email obligatorio
- [x] Contraseña temporal generada
### 10.4 Editar Usuarios
- [x] Puede editar usuarios TRANSPORTISTA/CHOFER de su dador
- [x] Campos editables: Nombre, Apellido, Contraseña
- [x] Campos NO editables: Email, Rol, Dador
### 10.5 Lista de Usuarios
- [x] Ve usuarios TRANSPORTISTA y CHOFER de su dador
- [x] NO ve usuarios de otros dadores
- [x] Paginación y búsqueda
## 11. ACTIVAR/DESACTIVAR EQUIPO
### 11.1 Desactivar
- [x] Botón " Desactivar" visible	⏸
- [x] Click → desactiva
- [x] Toast confirmación
- [x] Badge cambia a "Inactivo"
### 11.2 Activar
- [x] Botón " Activar" visible	▶
- [x] Click → activa
- [x] Toast confirmación
- [x] Badge cambia a "Activo"
## 12. ELIMINAR EQUIPO
- [x] Botón "Eliminar" (rojo)
- [x] Diálogo de confirmación
- [x] "Cancelar" cierra diálogo
- [x] "Eliminar" elimina equipo
- [x] Toast confirmación
- [x] Equipo desaparece
## 13. DESCARGAS
### 13.1 Individual
- [x] Botón "Bajar documentación"
- [x] Descarga ZIP del equipo
- [x] Solo documentos aprobados
### 13.2 Masiva
- [x] Botón "Bajar documentación vigente (ZIP)"
- [x] Descarga todos los equipos del resultado
## 14. PAGINACIÓN
- [x] Visible con más de 10 equipos
- [x] "Mostrando X - Y de Z"
- [x] "Página N de M"
- [x] Botones anterior/siguiente
- [x] Cambio de filtro → página 1
## 15. MI PERFIL (/perfil)
### 15.1 Información
- [x] Nombre
- [x] Email
- [x] Rol: "DADOR_DE_CARGA"
- [x] Empresa/Dador asociado
### 15.2 Cambiar Contraseña
- [x] Formulario de cambio
- [x] Validaciones
- [x] Mensaje de éxito
## 16. FLUJO DE APROBACIÓN COMPLETO
### 16.1 Documento Subido por Transportista/Chofer
- [x] Documento aparece en cola de aprobaciones
- [x] Estado: PENDIENTE
- [x] Visible en KPIs ("Pendientes")
### 16.2 Revisión del Documento
- [x] Click en "Revisar"
- [x] Ver preview del documento
- [x] Verificar datos detectados por IA
- [x] Corregir si es necesario
### 16.3 Aprobar
- [x] Click "Aprobar"
- [x] Documento → estado APROBADO
- [x] Afecta compliance del equipo
- [x] KPI "Aprobados hoy" incrementa
- [x] Documento disponible para clientes
### 16.4 Rechazar
- [x] Click "Rechazar"
- [x] Ingresar motivo
- [x] Documento → estado RECHAZADO
- [x] KPI "Rechazados hoy" incrementa
- [x] Transportista/Chofer debe subir nuevo documento
### 16.5 Documentos Subidos por el Dador
- [x] Al subir documento → estado APROBADO automáticamente
- [x] No aparece en cola de aprobaciones
- [x] Disponible inmediatamente
## 17. CASOS ESPECIALES
### 17.1 Sin Documentos Pendientes
- [x] Lista vacía con mensaje apropiado
- [x] KPI "Pendientes" = 0
### 17.2 Documento con IA Incorrecta
- [x] Puede corregir tipo de entidad
- [x] Puede corregir ID de entidad
- [x] Puede corregir tipo de documento
- [x] Cambios se aplican al aprobar
### 17.3 Múltiples Transportistas
- [x] Ve equipos de todas sus transportistas
- [x] Puede crear usuarios para cualquiera
- [x] Filtros funcionan por transportista
### 17.4 Múltiples Clientes por Equipo
- [x] Puede agregar varios clientes
- [x] Cada cliente con su rango de fechas
- [x] Compliance calculado por cliente
## 18. RENDIMIENTO Y UX
### 18.1 Estados de Carga
- [x] Spinner al buscar
- [x] Spinner al aprobar/rechazar
- [x] Spinner al subir documentos
- [x] Preview con loading
### 18.2 Feedback Visual
- [x] Toast de éxito/error
- [x] Hover effects
- [x] Transiciones suaves
- [x] KPIs actualizados
### 18.3 Manejo de Errores
- [x] Error de red → mensaje
- [x] Error 401 → login
- [x] Error 403 → acceso denegado
- [x] Preview error → mensaje y reintento
### 18.4 Responsividad
- [x] Desktop (1920px) ✓
- [x] Laptop (1366px) ✓
- [x] Tablet (768px) ✓
- [x] Móvil (375px) ✓
### 18.5 Tema Oscuro
- [x] Dashboard dark mode
- [x] Aprobaciones dark mode
- [x] Colores correctos
- [x] Texto legible
## 19. SEGURIDAD
### 19.1 Aislamiento de Datos
- [x] Solo ve equipos de su dador
- [x] Solo ve transportistas de su dador
- [x] Solo ve choferes de su dador
- [x] Solo aprueba documentos de su dador
### 19.2 Permisos de Escritura
- [x] Puede crear equipos
- [x] Puede modificar entidades
- [x] Puede subir documentos (aprobados automáticamente)
- [x] Puede aprobar/rechazar documentos
- [x] Puede gestionar clientes de equipos
- [x] Puede crear TRANSPORTISTA y CHOFER
### 19.3 Acciones Protegidas
- [x] Eliminar requiere confirmación
- [x] Rechazar requiere motivo
- [x] Token requerido
- [x] Acciones en auditoría (si aplica)
## 20. INTEGRACIONES
### 20.1 Con Transportistas
- [x] Transportistas ven sus equipos
- [x] Transportistas suben documentos → pendientes
- [x] Dador aprueba/rechaza
### 20.2 Con Choferes
- [x] Choferes ven sus equipos
- [x] Choferes suben documentos → pendientes
- [x] Dador aprueba/rechaza
### 20.3 Con Clientes
- [x] Clientes ven equipos asignados
- [x] Solo documentos aprobados visibles
- [x] Compliance por cliente
### 20.4 Con IA de Clasificación
- [x] IA detecta tipo de documento
- [x] IA detecta entidad
- [x] IA detecta fecha de vencimiento
- [x] Dador puede corregir
## 21. DATOS DE PRUEBA RECOMENDADOS
- [x] Al menos 5 documentos pendientes de aprobación
- [x] Documentos de diferentes tipos de entidad
- [x] Al menos 1 documento con IA incorrecta (para probar corrección)
- [x] Al menos 2 empresas transportistas
- [x] Al menos 3 choferes
- [x] Al menos 2 clientes
- [x] Equipos con múltiples clientes
- [x] Equipos activos e inactivos
- [x] Documentos vigentes, vencidos, por vencer, faltantes
- [x] Al menos 11 equipos para paginación
