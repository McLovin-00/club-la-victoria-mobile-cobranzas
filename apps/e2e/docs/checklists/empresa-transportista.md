<!-- Propósito: checklist del Portal Empresa Transportista (derivado de pruebas-del-sistema.txt). -->

# Portal Empresa Transportista - Checklist

Fuente: `pruebas-del-sistema.txt` (extraído del PDF).

## 1. AUTENTICACIÓN Y ACCESO
### 1.1 Login
- [x] Ingresar con email y contraseña válidos de usuario TRANSPORTISTA
- [x] Verificar que redirige correctamente al Dashboard (/transportista)
- [x] Intentar ingresar con email válido pero contraseña incorrecta → debe mostrar error
- [x] Intentar ingresar con email inexistente → debe mostrar error
- [x] Verificar que el logo de BCA se muestra correctamente en la pantalla de login
- [x] Verificar que el token se almacena en localStorage tras login exitoso
- [x] Si tiene contraseña temporal, debe forzar cambio de contraseña
### 1.2 Sesión
- [x] Verificar que la sesión persiste al refrescar la página (F5)
- [x] Verificar que al cerrar sesión se elimina el token y redirige al login
- [x] Verificar que al expirar el token se redirige al login automáticamente
- [x] Intentar acceder a /transportista sin sesión → debe redirigir a login
### 1.3 Autorización - Accesos Permitidos
- [x] Puede acceder a /transportista (Dashboard)
- [x] Puede acceder a /documentos/consulta (Consulta de Equipos)
- [x] Puede acceder a /documentos/equipos/alta-completa (Alta Completa)
- [x] Puede acceder a /documentos/equipos/:id/editar (Editar Equipo)
- [x] Puede acceder a /documentos/equipos/:id/estado (Ver Estado)
- [x] Puede acceder a /platform-users (Gestión de Usuarios - solo choferes)
- [x] Puede acceder a /chofer (Portal Chofer)
- [x] Puede acceder a /perfil (Mi Perfil)
### 1.4 Autorización - Accesos Restringidos
- [x] NO puede acceder a /admin/* (rutas de admin)
- [x] NO puede acceder a /cliente/* (portal cliente)
- [x] NO puede acceder a /dador/* (portal dador de carga)
- [x] NO puede acceder a /portal/admin-interno (admin interno)
- [x] NO puede acceder a /empresas (gestión de empresas)
- [x] NO puede acceder a /end-users (usuarios finales)
- [x] NO puede ver/crear usuarios TRANSPORTISTA
- [x] NO puede ver/crear usuarios DADOR_DE_CARGA
- [x] NO puede ver/crear usuarios ADMIN_INTERNO
## 2. DASHBOARD PRINCIPAL (/transportista)
### 2.1 Interfaz Visual
- [x] Verificar que se muestra el logo de Grupo BCA (tamaño h-32 md:h-40)
- [x] Verificar que el título dice "Portal Empresa Transportista"
- [x] Verificar que el subtítulo dice "Gestión de equipos y documentación"
- [x] Fondo con gradiente slate-50 a slate-100 (light) / slate-900 a slate-800 (dark)
- [x] Layout centrado con max-w-6xl
### 2.2 Tarjeta "Alta Completa de Equipo"
- [x] Visible con icono de camión (TruckIcon) en azul
- [x] Título: "Alta Completa de Equipo"
- [x] Descripción: "Registrar nuevo equipo con toda su documentación"
- [x] Lista de características:
- "Carga de chofer"
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
### 2.4 Nota Informativa
- [x] Card oscura (slate-800/900) al final
- [x] Mensaje: "? Los documentos que subas quedan pendientes de aprobación por el Dador de Carga."
- [x] Texto visible y legible en color slate-300
## 3. ALTA COMPLETA DE EQUIPO
(/documentos/equipos/alta-completa)
### 3.1 Navegación
- [x] Botón "Volver" visible y funcional
- [x] Click en "Volver" → navega al home del rol (/transportista)
### 3.2 Selector de Dador de Carga
- [x] Campo "Dador de Carga" visible
- [x] Pre-seleccionado automáticamente con el dador asociado al transportista
- [x] NO editable si el transportista ya tiene dador asignado
- [x] Si tiene selector, solo muestra dadores activos
### 3.3 Selector de Clientes
- [x] Selector múltiple de clientes visible
- [x] Puede seleccionar uno o más clientes
- [x] Solo muestra clientes activos
### 3.4 Datos de Empresa Transportista
- [x] Campo "Razón Social" obligatorio
- [x] Campo "CUIT" obligatorio (11 dígitos)
- [x] Validación de formato CUIT
- [x] Si la empresa ya existe (por CUIT), la asocia; si no, la crea
### 3.5 Datos del Chofer
- [x] Campo "Nombre" obligatorio
- [x] Campo "Apellido" obligatorio
- [x] Campo "DNI" obligatorio (mínimo 6 caracteres)
- [x] Campo "Teléfonos" opcional
- [x] Validación de DNI
- [x] Si el chofer ya existe (por DNI), lo asocia; si no, lo crea
### 3.6 Datos del Camión (Tractor)
- [x] Campo "Patente" obligatorio (mínimo 5 caracteres)
- [x] Campo "Marca" opcional
- [x] Campo "Modelo" opcional
- [x] Validación de formato de patente
- [x] Si el camión ya existe (por patente), lo asocia; si no, lo crea
### 3.7 Datos del Acoplado (Semi) - Opcional
- [x] Campo "Patente" opcional
- [x] Campo "Tipo" opcional
- [x] Si no se ingresa patente, no se requieren documentos de acoplado
- [x] Si se ingresa patente (mínimo 5 chars), se requieren documentos de acoplado
### 3.8 Sección de Documentos - Empresa Transportista
- [x] Lista todos los templates de tipo EMPRESA_TRANSPORTISTA
- [x] Cada documento tiene:
- Nombre del documento
- Botón para seleccionar archivo
- Campo de fecha de vencimiento
- [x] Todos los documentos son obligatorios
- [x] Puede seleccionar archivos PDF/imagen
- [x] Fecha de vencimiento obligatoria para cada documento
### 3.9 Sección de Documentos - Chofer
- [x] Lista todos los templates de tipo CHOFER
- [x] Cada documento tiene selector de archivo y fecha de vencimiento
- [x] Todos los documentos son obligatorios
- [x] Puede previsualizar archivos seleccionados
### 3.10 Sección de Documentos - Camión
- [x] Lista todos los templates de tipo CAMION
- [x] Cada documento tiene selector de archivo y fecha de vencimiento
- [x] Todos los documentos son obligatorios
### 3.11 Sección de Documentos - Acoplado (si tiene patente)
- [x] Lista todos los templates de tipo ACOPLADO
- [x] Solo aparece si se ingresó patente de acoplado
- [x] Cada documento tiene selector de archivo y fecha de vencimiento
- [x] Todos los documentos son obligatorios si hay acoplado
### 3.12 Barra de Progreso
- [x] Muestra porcentaje de documentos seleccionados
- [x] Se actualiza en tiempo real al seleccionar archivos
- [x] 100% cuando todos los documentos obligatorios tienen archivo Y fecha
### 3.13 Validaciones Previas al Envío
- [x] Botón "Crear Equipo" deshabilitado si:
- Faltan datos básicos obligatorios
- Faltan documentos obligatorios
- Faltan fechas de vencimiento
- [x] Mensaje de error si hay documentos sin fecha de vencimiento
- [x] Mensaje de error si hay datos incompletos
### 3.14 Creación del Equipo
- [x] Click en "Crear Equipo" → inicia proceso transaccional
- [x] Muestra spinner/loading durante la creación
- [x] Crea todas las entidades (empresa, chofer, camión, acoplado)
- [x] Sube todos los documentos
- [x] Si falla algún paso → rollback automático
- [x] Si todo OK → mensaje de éxito
- [x] Documentos quedan en estado PENDIENTE
### 3.15 Manejo de Errores en Alta
- [x] Error de validación → mensaje específico
- [x] Error de duplicado (DNI, patente existente) → mensaje apropiado
- [x] Error de red → mensaje de error y posibilidad de reintentar
- [x] Rollback exitoso → mensaje informativo
## 4. CONSULTA DE EQUIPOS (/documentos/consulta)
### 4.1 Navegación
- [x] Botón "Volver" visible
- [x] Click en "Volver" → navega a /portal/transportistas
- [x] Título de página: "Consulta"
### 4.2 Filtros de Entidad
- [x] Botones de tipo de filtro visibles:
- "Todos los equipos"
- "Por Dador"
- "Por Cliente"
- "Por Empresa Transp."
- [x] Selector de Dador visible cuando filtro = "Por Dador"
- [x] Selector de Cliente visible cuando filtro = "Por Cliente"
- [x] Selector de Empresa Transp. visible cuando filtro = "Por Empresa"
### 4.3 Filtro por Estado de Equipos
- [x] Botones "Solo Activos", "Solo Inactivos", "Todos"
- [x] Por defecto: "Todos"
- [x] Filtro se aplica correctamente
### 4.4 Filtros Adicionales
- [x] Campo "DNI Chofer" funcional
- [x] Campo "Patente Camión" funcional
- [x] Campo "Patente Acoplado" funcional
- [x] Campos son opcionales (pueden estar vacíos)
### 4.5 Búsqueda
- [x] Botón "Buscar" ejecuta la búsqueda
- [x] Botón "Limpiar" resetea todos los filtros
- [x] Búsqueda respeta todos los filtros combinados
- [x] Resultados paginados (10 por página)
### 4.6 Búsqueda Masiva
- [x] Botón "? Buscar por DNIs o Patentes" visible
- [x] Click → abre modal de búsqueda masiva
- [x] Textarea para ingresar múltiples valores
- [x] Separadores: coma, espacio, salto de línea
- [x] Botón "Buscar" ejecuta búsqueda masiva
- [x] Botón "Cancelar" cierra modal
- [x] Límite máximo de valores (si aplica)
## 5. DASHBOARD DE ESTADO DOCUMENTAL
### 5.1 Contadores (después de buscar)
- [x] Panel con 4 contadores aparece después de buscar
- [x] "Total" (azul) - total de equipos
- [x] "Faltantes" (rojo) - equipos con docs faltantes
- [x] "Vencidos" (naranja) - equipos con docs vencidos
- [x] "Por Vencer" (amarillo) - equipos con docs por vencer
### 5.2 Filtros por Estado Documental
- [x] Click en contador aplica/quita filtro
- [x] Indicador visual del filtro activo
- [x] Enlace "Quitar filtro" funcional
- [x] Cambio de filtro resetea página a 1
## 6. LISTA DE EQUIPOS
### 6.1 Información de Cada Equipo
- [x] "Equipo #ID" visible
- [x] Estado del equipo (activa/inactiva)
- [x] Badge "Activo" (verde) o "Inactivo" (rojo)
- [x] DNI del chofer normalizado
- [x] Patente del camión normalizada
- [x] Patente del acoplado (o "-")
- [x] Clientes asignados (si los hay)
- [x] Equipos inactivos con opacidad reducida
### 6.2 Semáforo de Documentación
- [x] ? Faltantes con cantidad
- [x] ? Vencidos con cantidad
- [x] ? Por vencer con cantidad
- [x] ? Vigentes con cantidad
### 6.3 Acciones por Equipo
- [x] Botón " Editar" → navega a edición
- [x] Botón "Bajar documentación" → descarga ZIP
- [x] Botón "Ver estado" → navega a estado
- [x] Botón " Desactivar"	⏸ / " Activar"	▶
- [x] Botón "Eliminar" (rojo) con confirmación
## 7. EDITAR EQUIPO (/documentos/equipos/:id/editar)
### 7.1 Permisos del Transportista
- [x] canEdit = true - PUEDE modificar entidades
- [x] canManageClients = false - NO puede gestionar clientes
- [x] canUploadDocs = true - PUEDE subir documentos
### 7.2 Información del Equipo (Lectura)
- [x] Muestra patente camión con marca/modelo
- [x] Muestra patente acoplado
- [x] Muestra nombre chofer y DNI
- [x] Muestra empresa transportista
### 7.3 Modificar Chofer
- [x] Selector de choferes visible
- [x] Lista choferes de la empresa transportista
- [x] Botón "Cambiar" para aplicar cambio
- [x] Botón "+" para crear nuevo chofer
- [x] Modal de creación de chofer funcional
- [x] Opción de crear cuenta de usuario para chofer
- [x] Contraseña temporal mostrada al crear usuario
### 7.4 Modificar Camión
- [x] Selector de camiones visible
- [x] Lista camiones disponibles
- [x] Botón "Cambiar" para aplicar cambio
- [x] Botón "+" para crear nuevo camión
- [x] Modal de creación de camión funcional
### 7.5 Modificar Acoplado
- [x] Selector de acoplados visible
- [x] Lista acoplados disponibles
- [x] Botón "Cambiar" para aplicar cambio
- [x] Botón "+" para crear nuevo acoplado
- [x] Modal de creación de acoplado funcional
- [x] Opción de "Sin acoplado"
### 7.6 Modificar Empresa Transportista
- [x] Selector de empresas visible
- [x] Lista empresas transportistas
- [x] Botón "Cambiar" para aplicar cambio
- [x] Botón "+" para crear nueva empresa
- [x] Modal de creación de empresa funcional
- [x] Opción de crear cuenta de usuario para transportista
### 7.7 Gestión de Clientes (Restringido)
- [x] Sección de clientes NO visible o deshabilitada
- [x] NO puede agregar clientes al equipo
- [x] NO puede quitar clientes del equipo
- [x] Solo Admin/Dador pueden gestionar clientes
### 7.8 Subida de Documentos
- [x] Sección de documentos visible
- [x] Documentos agrupados por entidad (Chofer, Camión, Acoplado, Empresa)
- [x] Para cada documento requerido:
- Estado actual (Vigente/Vencido/Faltante/Por vencer)
- Fecha de vencimiento actual
- Botón para subir nuevo documento
- Campo para fecha de vencimiento
- [x] Puede subir documentos para cualquier entidad
- [x] Puede renovar documentos antes de vencer
- [x] Documentos subidos quedan en estado PENDIENTE
### 7.9 Validaciones de Subida
- [x] Archivos válidos: PDF, imágenes
- [x] Tamaño máximo de archivo respetado
- [x] Fecha de vencimiento obligatoria (si aplica)
- [x] Mensaje de éxito al subir
- [x] Mensaje de error si falla
## 8. VER ESTADO DEL EQUIPO
(/documentos/equipos/:id/estado)
### 8.1 Navegación
- [x] Accesible desde "Ver estado" en consulta
- [x] Botón "Volver" funcional
- [x] Título con información del equipo
### 8.2 Resumen por Cliente
- [x] Lista de clientes asignados
- [x] Para cada cliente:
- Nombre/razón social
- Documentos requeridos
- Estado de cada documento
### 8.3 Detalle por Entidad
- [x] Sección CHOFER con documentos
- [x] Sección CAMIÓN con documentos
- [x] Sección ACOPLADO con documentos (si tiene)
- [x] Sección EMPRESA TRANSPORTISTA con documentos
### 8.4 Estados de Documentos
- [x] Verde	✅ = Vigente/OK
- [x] Amarillo = Próximo a vencer
- [x] Rojo	❌ = Vencido
- [x] Gris = Faltante	⚪
## 9. GESTIÓN DE USUARIOS (/platform-users)
### 9.1 Acceso y Permisos
- [x] Puede acceder a la página de gestión de usuarios
- [x] Solo ve usuarios CHOFER de su empresa transportista
- [x] NO ve usuarios de otras empresas transportistas
- [x] NO ve usuarios TRANSPORTISTA, DADOR, ADMIN
### 9.2 Crear Usuario CHOFER
- [x] Botón "Nuevo Usuario" visible
- [x] Al seleccionar rol CHOFER:
- Dador de Carga: automático (no editable)
- Empresa Transportista: automático (no editable)
- Selector de chofer existente O crear nuevo
- [x] Modo "Chofer Existente":
- Lista solo choferes de su empresa
- Puede seleccionar chofer de la lista
- [x] Modo "Crear Nuevo Chofer":
- Campos: DNI, Nombre, Apellido
- Email obligatorio para crear cuenta
- Crea entidad chofer + usuario en un paso
- [x] Contraseña temporal generada automáticamente
- [x] Contraseña mostrada una sola vez
- [x] Mensaje de éxito al crear
### 9.3 NO Puede Crear Otros Roles
- [x] Rol TRANSPORTISTA: no visible o deshabilitado
- [x] Rol DADOR_DE_CARGA: no visible
- [x] Rol ADMIN_INTERNO: no visible
- [x] Rol CLIENTE: no visible
### 9.4 Editar Usuario CHOFER
- [x] Puede editar usuarios CHOFER de su empresa
- [x] Campos editables:
- Nombre
- Apellido
- Contraseña (generar nueva temporal)
- [x] Campos NO editables:
- Email
- Rol
- Dador de Carga
- Empresa Transportista
- [x] NO puede cambiar el chofer asociado a otra empresa
### 9.5 Lista de Usuarios
- [x] Solo muestra usuarios CHOFER de su empresa
- [x] Columnas: Email, Nombre, Rol, Estado
- [x] Paginación funcional
- [x] Búsqueda por email/nombre funcional
## 10. ACTIVAR/DESACTIVAR EQUIPO
### 10.1 Desactivar
- [x] Botón " Desactivar" en	⏸ equipos activos
- [x] Click → desactiva inmediatamente
- [x] Toast de confirmación
- [x] Badge cambia a "Inactivo"
- [x] Opacidad reducida en la tarjeta
### 10.2 Activar
- [x] Botón " Activar" en equipos	▶ inactivos
- [x] Click → activa inmediatamente
- [x] Toast de confirmación
- [x] Badge cambia a "Activo"
- [x] Opacidad normal en la tarjeta
## 11. ELIMINAR EQUIPO
### 11.1 Confirmación
- [x] Botón "Eliminar" (rojo) en cada equipo
- [x] Click → diálogo de confirmación
- [x] Mensaje: "¿Eliminar equipo #ID? Esta acción es irreversible."
- [x] Botones "Eliminar" y "Cancelar"
### 11.2 Ejecución
- [x] "Cancelar" → cierra diálogo
- [x] "Eliminar" → elimina el equipo
- [x] Toast de confirmación
- [x] Equipo desaparece de la lista
## 12. DESCARGAS
### 12.1 Descarga Individual
- [x] Botón "Bajar documentación" por equipo
- [x] Durante descarga: " Preparando..."	⏳
- [x] Descarga ZIP con nombre equipo_{ID}.zip
- [x] Solo documentos vigentes/aprobados
### 12.2 Descarga Masiva
- [x] Botón "Bajar documentación vigente (ZIP)"
- [x] Disponible después de buscar
- [x] Durante descarga: " Preparando archivos..."	⏳
- [x] Incluye todos los equipos del resultado actual
## 13. PAGINACIÓN
### 13.1 Controles
- [x] Visible con más de 10 equipos
- [x] "Mostrando X - Y de Z equipos"
- [x] "Página N de M"
- [x] Botones anterior/siguiente
- [x] Botones deshabilitados en límites
- [x] Cambio de filtro → página 1
## 14. MI PERFIL (/perfil)
### 14.1 Información del Usuario
- [x] Nombre del usuario
- [x] Email
- [x] Rol: "TRANSPORTISTA"
- [x] Empresa transportista asociada
- [x] Dador de carga asociado
### 14.2 Cambiar Contraseña
- [x] Formulario de cambio de contraseña
- [x] Campo contraseña actual
- [x] Campo nueva contraseña
- [x] Campo confirmar contraseña
- [x] Validaciones de seguridad
- [x] Mensaje de éxito
## 15. FLUJO DE APROBACIÓN DE DOCUMENTOS
### 15.1 Estado PENDIENTE
- [x] Documentos subidos → estado PENDIENTE
- [x] Visible en la lista de documentos
- [x] Indicador visual diferenciado
- [x] No afecta compliance hasta aprobación
### 15.2 Notificación al Dador
- [x] Dador de carga recibe notificación (si configurado)
- [x] Documento aparece en cola de aprobación del dador
### 15.3 Post-Aprobación
- [x] Cuando dador aprueba → estado APROBADO
- [x] Compliance se actualiza
- [x] Documento disponible para clientes
### 15.4 Rechazo
- [x] Cuando dador rechaza → estado RECHAZADO
- [x] Transportista debe subir nuevo documento
## 16. CASOS ESPECIALES
### 16.1 Sin Equipos
- [x] Mensaje "Sin resultados" al buscar sin equipos
- [x] Dashboard de estados no aparece
- [x] Botón de descarga masiva deshabilitado
### 16.2 Equipo sin Acoplado
- [x] Patente acoplado muestra "-"
- [x] Sección documentos acoplado vacía o no aparece
- [x] No afecta funcionalidad del resto
### 16.3 Múltiples Clientes
- [x] Lista de clientes visible en equipo
- [x] Estado de compliance por cliente
- [x] Requerimientos pueden variar por cliente
### 16.4 Crear Entidad que Ya Existe
- [x] Al crear chofer con DNI existente → asocia existente
- [x] Al crear camión con patente existente → asocia existente
- [x] Mensaje informativo apropiado
## 17. RENDIMIENTO Y UX
### 17.1 Estados de Carga
- [x] Spinner al buscar equipos
- [x] Spinner al crear equipo
- [x] Spinner al subir documentos
- [x] Spinner al cargar detalle
### 17.2 Feedback Visual
- [x] Toast de éxito en operaciones exitosas
- [x] Toast de error en operaciones fallidas
- [x] Hover effects en tarjetas y botones
- [x] Transiciones suaves
- [x] Barra de progreso en alta completa
### 17.3 Manejo de Errores
- [x] Error de red → mensaje apropiado
- [x] Error 401 → redirigir a login
- [x] Error 403 → mensaje de acceso denegado
- [x] Error de validación → mensaje específico
### 17.4 Responsividad
- [x] Desktop (1920px) ✓
- [x] Laptop (1366px) ✓
- [x] Tablet (768px) ✓
- [x] Móvil (375px) ✓
- [x] Grid 2 columnas → 1 columna en móvil
- [x] Modales ocupan pantalla completa en móvil
### 17.5 Tema Oscuro
- [x] Dashboard soporta dark mode
- [x] Colores correctos
- [x] Texto legible
- [x] Semáforos visibles
## 18. SEGURIDAD
### 18.1 Aislamiento de Datos
- [x] Solo ve equipos asociados a su dador/empresa
- [x] Solo ve choferes de su empresa transportista
- [x] No puede ver datos de otras empresas transportistas
- [x] No puede ver equipos de otros dadores
### 18.2 Permisos de Escritura
- [x] Puede crear equipos
- [x] Puede modificar entidades (chofer, camión, acoplado)
- [x] Puede subir documentos
- [x] NO puede aprobar documentos
- [x] NO puede gestionar clientes de equipos
- [x] Solo puede crear usuarios CHOFER
### 18.3 Acciones Protegidas
- [x] Eliminar requiere confirmación
- [x] Token requerido para operaciones
- [x] Acciones registradas en auditoría (si aplica)
## 19. INTEGRACIONES
### 19.1 Con Dador de Carga
- [x] Documentos pendientes van a cola del dador
- [x] Dador puede aprobar/rechazar
- [x] Notificaciones de aprobación (si configurado)
### 19.2 Con Choferes
- [x] Choferes creados pueden iniciar sesión
- [x] Choferes ven sus propios equipos
- [x] Choferes pueden subir documentos
### 19.3 Con Clientes
- [x] Clientes ven equipos asignados
- [x] Compliance calculado por cliente
- [x] Documentos visibles para clientes (solo aprobados)
## 20. DATOS DE PRUEBA RECOMENDADOS
- [x] Al menos 1 equipo 100% vigente
- [x] Al menos 1 equipo con documentos por vencer
- [x] Al menos 1 equipo con documentos vencidos
- [x] Al menos 1 equipo con documentos faltantes
- [x] Al menos 1 equipo inactivo
- [x] Al menos 1 equipo sin acoplado
- [x] Al menos 1 equipo con múltiples clientes
- [x] Al menos 11 equipos para paginación
- [x] Al menos 1 chofer con cuenta de usuario
- [x] Al menos 1 chofer sin cuenta de usuario
- [x] Al menos 1 documento pendiente de aprobación
- [x] Al menos 1 documento rechazado
