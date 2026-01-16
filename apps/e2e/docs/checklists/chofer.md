<!-- Propósito: checklist del Portal Chofer (derivado de pruebas-del-sistema.txt). -->

# Portal Chofer - Checklist

Fuente: `pruebas-del-sistema.txt` (extraído del PDF).

## 1. AUTENTICACIÓN Y ACCESO
### 1.1 Login
- [x] Ingresar con email y contraseña válidos de usuario CHOFER
- [x] Verificar que redirige correctamente al Dashboard del Chofer (/chofer)
- [x] Intentar ingresar con email válido pero contraseña incorrecta → debe mostrar error
- [x] Intentar ingresar con email inexistente → debe mostrar error
- [x] Verificar que el logo de BCA se muestra correctamente en la pantalla de login
- [x] Verificar que el token se almacena en localStorage tras login exitoso
- [x] Si tiene contraseña temporal, debe forzar cambio de contraseña
### 1.2 Sesión
- [x] Verificar que la sesión persiste al refrescar la página (F5)
- [x] Verificar que al cerrar sesión se elimina el token y redirige al login
- [x] Verificar que al expirar el token se redirige al login automáticamente
- [x] Intentar acceder a /chofer sin sesión → debe redirigir a login
### 1.3 Autorización - Accesos Permitidos
- [x] Puede acceder a /chofer (Dashboard Chofer)
- [x] Puede acceder a /documentos/consulta (Consulta de Equipos)
- [x] Puede acceder a /documentos/equipos/:id/editar (Editar Equipo - solo subir docs)
- [x] Puede acceder a /documentos/equipos/:id/estado (Ver Estado)
- [x] Puede acceder a /transportista (Portal Transportista)
- [x] Puede acceder a /perfil (Mi Perfil)
### 1.4 Autorización - Accesos Restringidos
- [x] NO puede acceder a /admin/* (rutas de admin)
- [x] NO puede acceder a /platform-users (gestión de usuarios)
- [x] NO puede acceder a /cliente/* (portal cliente)
- [x] NO puede acceder a /dador/* (portal dador de carga)
- [x] NO puede acceder a /documentos/equipos/alta-completa → no visible en su dashboard
- [x] NO puede acceder a /portal/admin-interno (admin interno)
- [x] NO puede acceder a /empresas (gestión de empresas)
## 2. DASHBOARD PRINCIPAL (/chofer)
### 2.1 Interfaz Visual
- [x] Verificar que se muestra el logo de Grupo BCA (tamaño correcto h-32 md:h-40)
- [x] Verificar que el título dice "Portal Chofer"
- [x] Verificar que el subtítulo dice "Gestión de equipos y documentación"
- [x] Fondo con gradiente slate-50 a slate-100
- [x] Card informativa al final con mensaje de aprobación
### 2.2 Tarjetas de Acciones
- [x] NO debe aparecer la tarjeta "Alta Completa de Equipo" (solo para otros roles)
- [x] DEBE aparecer la tarjeta "Consulta de Equipos"
- [x] Solo debe haber UNA tarjeta de acción principal (layout de 1 columna)
### 2.3 Tarjeta "Consulta de Equipos"
- [x] Tiene icono de lupa (MagnifyingGlassIcon) en color verde
- [x] Título: "Consulta de Equipos"
- [x] Descripción: "Buscar equipos existentes y actualizar su documentación"
- [x] Lista de características:
- "Buscar por DNI chofer, patente camión o acoplado"
- "Ver estado completo de documentación"
- "Actualizar documentos vencidos o faltantes"
- [x] Botón "Ir a Consulta" en verde
- [x] Hover: efecto de sombra y escala
- [x] Click en tarjeta → navega a /documentos/consulta
- [x] Click en botón → navega a /documentos/consulta
### 2.4 Nota Informativa
- [x] Card oscura (slate-800/900) al final
- [x] Mensaje: "? Los documentos que subas quedan pendientes de aprobación por el Dador de Carga."
- [x] Texto visible y legible
## 3. CONSULTA DE EQUIPOS (/documentos/consulta)
### 3.1 Navegación y Layout
- [x] Botón "Volver" visible en la parte superior
- [x] Click en "Volver" → navega a /portal/transportistas (ruta de volver para chofer)
- [x] Título de página: "Consulta"
### 3.2 Filtros - Visibilidad para Chofer
- [x] NO debe aparecer selector de "Dador de Carga" (skip query)
- [x] NO debe aparecer selector de "Cliente" (skip query)
- [x] NO debe aparecer selector de "Empresa Transportista" (skip query)
- [x] NO deben aparecer los botones de tipo de filtro (Todos, Por Dador, Por Cliente, Por Empresa)
- [x] El backend filtra automáticamente por el choferId del usuario
### 3.3 Filtros Disponibles para Chofer
- [x] Campo "DNI Chofer" visible y funcional
- [x] Campo "Patente Camión" visible y funcional
- [x] Campo "Patente Acoplado" visible y funcional
- [x] Filtro "Estado de equipos" (Solo Activos / Solo Inactivos / Todos)
- [x] Botón "Buscar" siempre habilitado (no depende de selección de entidad)
- [x] Botón "Limpiar" visible
### 3.4 Búsqueda
- [x] Al hacer clic en "Buscar" → solo muestra equipos del chofer autenticado
- [x] Buscar por DNI propio → encuentra sus equipos
- [x] Buscar por patente de camión → encuentra sus equipos con esa patente
- [x] Buscar por patente de acoplado → encuentra sus equipos con ese acoplado
- [x] Buscar con DNI de otro chofer → no debe encontrar nada (filtro por choferId)
- [x] Filtrar "Solo Activos" → muestra solo equipos activos
- [x] Filtrar "Solo Inactivos" → muestra solo equipos inactivos
- [x] Filtrar "Todos" → muestra activos e inactivos
### 3.5 Búsqueda Masiva
- [x] Botón "? Buscar por DNIs o Patentes" visible
- [x] Click → abre modal de búsqueda masiva
- [x] Ingresar múltiples patentes → busca todas (filtradas por su choferId)
- [x] Separar valores por coma, espacio o salto de línea
- [x] Botón "Cancelar" cierra el modal
- [x] Click fuera del modal lo cierra
## 4. DASHBOARD DE ESTADO DOCUMENTAL
### 4.1 Contadores (después de buscar)
- [x] Aparece panel con 4 contadores después de ejecutar búsqueda
- [x] Contador "Total" (azul) - número total de equipos
- [x] Contador "Faltantes" (rojo) - equipos con documentos faltantes
- [x] Contador "Vencidos" (naranja) - equipos con documentos vencidos
- [x] Contador "Por Vencer" (amarillo) - equipos con documentos por vencer
### 4.2 Filtros por Estado Documental
- [x] Click en "Total" → filtra por todos (quita filtro)
- [x] Click en "Faltantes" → filtra solo equipos con doc. faltante
- [x] Click en "Vencidos" → filtra solo equipos con doc. vencida
- [x] Click en "Por Vencer" → filtra solo equipos con doc. por vencer
- [x] Click dos veces en mismo contador → quita filtro
- [x] Indicador visual del filtro activo (badge con color)
- [x] Enlace "Quitar filtro" funcional
## 5. LISTA DE EQUIPOS
### 5.1 Información de Cada Equipo
- [x] Muestra "Equipo #ID"
- [x] Muestra estado del equipo (activa/inactiva)
- [x] Badge "Activo" (verde) o "Inactivo" (rojo)
- [x] Muestra DNI del chofer normalizado
- [x] Muestra patente del camión normalizada
- [x] Muestra patente del acoplado (o "-" si no tiene)
- [x] Muestra clientes asignados (si los hay)
- [x] Equipos inactivos aparecen con opacidad reducida (opacity-50)
### 5.2 Semáforo de Documentación
- [x] Cada equipo muestra el semáforo con 4 indicadores:
- ? Faltantes (rojo) con cantidad
- ? Vencidos (naranja) con cantidad
- ? Por vencer (amarillo) con cantidad
- ? Vigentes (verde) con cantidad
- [x] Los contadores son correctos según el estado real
### 5.3 Acciones por Equipo
- [x] Botón " Editar" → navega a /documentos/equipos/:id/editar
- [x] Botón "Bajar documentación" → descarga ZIP de documentos vigentes
- [x] Botón "Ver estado" → navega a /documentos/equipos/:id/estado
- [x] Botón " Desactivar"	⏸ (si está activo) → desactiva el equipo
- [x] Botón " Activar"	▶ (si está inactivo) → activa el equipo
- [x] Botón "Eliminar" (rojo) → solicita confirmación y elimina
## 6. PAGINACIÓN
### 6.1 Controles de Paginación
- [x] Con más de 10 equipos → muestra paginación
- [x] Texto "Mostrando X - Y de Z equipos"
- [x] Texto "Página N de M"
- [x] Botón "←" (anterior) deshabilitado en página 1
- [x] Botón "→" (siguiente) deshabilitado en última página
- [x] Navegación entre páginas funciona correctamente
- [x] Al aplicar filtro → vuelve a página 1
## 7. DESCARGA DE DOCUMENTACIÓN
### 7.1 Descarga Individual
- [x] Botón "Bajar documentación" en cada equipo
- [x] Durante descarga muestra " Preparando..."	⏳
- [x] Descarga archivo ZIP con nombre equipo_{ID}.zip
- [x] Solo incluye documentos vigentes/aprobados
- [x] ZIP no vacío si hay documentos
### 7.2 Descarga Masiva
- [x] Botón "Bajar documentación vigente (ZIP)" visible después de buscar
- [x] Deshabilitado si no hay resultados
- [x] Durante descarga muestra " Preparando archivos..."	⏳
- [x] Descarga ZIP de TODOS los equipos del resultado
- [x] Si hay filtro aplicado, solo incluye equipos filtrados
## 8. EDITAR EQUIPO (/documentos/equipos/:id/editar)
### 8.1 Acceso y Permisos - Lo que NO puede hacer
- [x] NO puede cambiar el chofer asignado (selector deshabilitado o no visible)
- [x] NO puede cambiar el camión (selector deshabilitado o no visible)
- [x] NO puede cambiar el acoplado (selector deshabilitado o no visible)
- [x] NO puede cambiar la empresa transportista
- [x] NO puede crear nuevas entidades (chofer, camión, acoplado, empresa)
- [x] NO puede gestionar clientes asignados (sección no visible o deshabilitada)
- [x] NO ve botones de "+ Crear" para entidades
### 8.2 Acceso y Permisos - Lo que SÍ puede hacer
- [x] PUEDE ver información del equipo (solo lectura)
- [x] PUEDE subir documentos
- [x] PUEDE ver el estado de los documentos
- [x] PUEDE reemplazar documentos existentes
- [x] PUEDE volver atrás
### 8.3 Información del Equipo (Solo Lectura)
- [x] Muestra patente del camión (marca/modelo si disponible)
- [x] Muestra patente del acoplado
- [x] Muestra nombre del chofer y DNI
- [x] Muestra empresa transportista
- [x] Información no editable
### 8.4 Subida de Documentos
- [x] Sección de documentos visible
- [x] Puede seleccionar tipo de documento a subir
- [x] Puede subir archivo PDF/imagen
- [x] Puede ingresar fecha de vencimiento (si aplica)
- [x] Botón "Subir" funcional
- [x] Mensaje de éxito al subir documento
- [x] Documento queda en estado "PENDIENTE" (pendiente de aprobación)
### 8.5 Tipos de Documentos
- [x] Puede subir documentos de CHOFER (propios)
- [x] Puede subir documentos de CAMIÓN
- [x] Puede subir documentos de ACOPLADO (si tiene)
- [x] Puede subir documentos de EMPRESA TRANSPORTISTA
- [x] Lista de templates según requerimientos del cliente
### 8.6 Estado de Documentos en Edición
- [x] Ver documentos vigentes con indicador verde
- [x] Ver documentos próximos a vencer con indicador amarillo
- [x] Ver documentos vencidos con indicador rojo
- [x] Ver documentos faltantes listados
- [x] Ver documentos pendientes de aprobación
## 9. VER ESTADO DEL EQUIPO
(/documentos/equipos/:id/estado)
### 9.1 Navegación
- [x] Accesible desde botón "Ver estado" en consulta
- [x] Botón "Volver" funcional
- [x] Título con información del equipo
### 9.2 Resumen de Compliance
- [x] Muestra resumen por cliente asignado
- [x] Para cada cliente:
- Lista de documentos requeridos
- Estado de cada documento (OK, VENCIDO, FALTANTE, PRÓXIMO)
- Fecha de vencimiento si aplica
### 9.3 Detalle por Entidad
- [x] Sección CHOFER con sus documentos
- [x] Sección CAMIÓN con sus documentos
- [x] Sección ACOPLADO con sus documentos (si tiene)
- [x] Sección EMPRESA TRANSPORTISTA con sus documentos
### 9.4 Visualización de Estados
- [x] Verde ( ) para	✅ documentos vigentes
- [x] Amarillo (⚠️ ) para documentos próximos a vencer
- [x] Rojo ( ) para documentos vencidos	❌
- [x] Gris para documentos faltantes
## 10. ACTIVAR/DESACTIVAR EQUIPO
### 10.1 Desactivar Equipo
- [x] Botón " Desactivar" visible	⏸ en equipos activos
- [x] Click → desactiva el equipo
- [x] Toast de confirmación: "Equipo desactivado exitosamente"
- [x] Equipo aparece ahora con badge "Inactivo" y opacidad reducida
- [x] Botón cambia a " Activar"	▶
### 10.2 Activar Equipo
- [x] Botón " Activar" visible en equipos	▶ inactivos
- [x] Click → activa el equipo
- [x] Toast de confirmación: "Equipo activado exitosamente"
- [x] Equipo aparece ahora con badge "Activo" y opacidad normal
- [x] Botón cambia a " Desactivar"	⏸
## 11. ELIMINAR EQUIPO
### 11.1 Confirmación
- [x] Botón "Eliminar" (rojo) en cada equipo
- [x] Click → abre diálogo de confirmación
- [x] Título: "Eliminar equipo"
- [x] Mensaje: "¿Eliminar equipo #ID? Esta acción es irreversible."
- [x] Botón "Eliminar" (peligro) y "Cancelar"
### 11.2 Ejecución
- [x] Click "Cancelar" → cierra el diálogo, no elimina
- [x] Click "Eliminar" → elimina el equipo
- [x] Toast de confirmación: "Equipo eliminado"
- [x] Equipo desaparece de la lista
- [x] Datos relacionados se manejan apropiadamente
## 12. MI PERFIL (/perfil)
### 12.1 Información del Usuario
- [x] Muestra nombre del usuario
- [x] Muestra email
- [x] Muestra rol: "CHOFER"
- [x] Muestra datos asociados (DNI, empresa, etc.)
### 12.2 Cambiar Contraseña
- [x] Formulario para cambiar contraseña
- [x] Campo contraseña actual
- [x] Campo nueva contraseña
- [x] Campo confirmar nueva contraseña
- [x] Validaciones de contraseña
- [x] Mensaje de éxito al cambiar
## 13. FLUJO DE DOCUMENTOS PENDIENTES
### 13.1 Subida de Documento
- [x] Al subir un documento → estado inicial "PENDIENTE"
- [x] Documento aparece en la lista pero con indicador de pendiente
- [x] No afecta el compliance hasta ser aprobado
### 13.2 Visualización de Pendientes
- [x] Documentos pendientes visibles en edición
- [x] Indicador visual diferenciado (ej: badge "Pendiente")
- [x] Información de que está esperando aprobación
## 14. CASOS ESPECIALES
### 14.1 Chofer sin Equipos
- [x] Al buscar → mensaje "Sin resultados para los criterios de filtro seleccionados"
- [x] Dashboard de estados no aparece si no hay resultados
- [x] Botón de descarga masiva deshabilitado
### 14.2 Equipo sin Acoplado
- [x] Patente de acoplado muestra "-"
- [x] Sección de documentos de acoplado no aparece o está vacía
- [x] No afecta la visualización del resto del equipo
### 14.3 Múltiples Clientes Asignados
- [x] Lista de clientes visible en cada equipo
- [x] En estado de equipo, compliance separado por cliente
- [x] Puede tener diferentes requerimientos por cliente
### 14.4 Chofer con Múltiples Equipos
- [x] Todos los equipos aparecen en la búsqueda
- [x] Paginación si hay más de 10
- [x] Puede filtrar entre ellos
## 15. RENDIMIENTO Y UX
### 15.1 Estados de Carga
- [x] Spinner de carga al buscar equipos
- [x] Mensaje "Buscando equipos..." durante la carga
- [x] Mensaje "Calculando estado de compliance" visible
- [x] Spinner al cargar detalle de equipo
- [x] Spinner al cargar estado de equipo
### 15.2 Manejo de Errores
- [x] Error de red → mensaje de error apropiado
- [x] Error 401 → redirigir a login
- [x] Error 403 → mensaje de acceso denegado
- [x] Error al subir documento → mensaje de error
- [x] Error al descargar → mensaje de error
### 15.3 Feedback Visual
- [x] Toast de éxito en operaciones exitosas (activar, desactivar, eliminar, subir)
- [x] Toast de error en operaciones fallidas
- [x] Hover effects en tarjetas y botones
- [x] Transiciones suaves en cambios de estado
### 15.4 Responsividad
- [x] Dashboard funciona en desktop (1920px)
- [x] Dashboard funciona en laptop (1366px)
- [x] Dashboard funciona en tablet (768px)
- [x] Dashboard funciona en móvil (375px)
- [x] Botones se apilan correctamente en móvil
- [x] Tablas/listas son scrolleables en móvil
### 15.5 Tema Oscuro
- [x] Dashboard soporta dark mode
- [x] Colores correctos en dark mode
- [x] Texto legible en dark mode
- [x] Semáforo visible en dark mode
## 16. SEGURIDAD
### 16.1 Aislamiento de Datos
- [x] Solo ve equipos donde está asignado como chofer
- [x] No puede ver equipos de otros choferes
- [x] No puede ver documentos de equipos no asignados
- [x] No puede descargar documentos de equipos no asignados
### 16.2 Permisos de Escritura
- [x] Solo puede subir documentos, no eliminarlos directamente
- [x] Documentos subidos quedan pendientes de aprobación
- [x] No puede aprobar sus propios documentos
- [x] No puede modificar entidades (solo documentos)
### 16.3 Acciones Protegidas
- [x] Eliminar equipo requiere confirmación
- [x] Acciones registradas en auditoría (si aplica)
- [x] Token requerido para todas las operaciones
## 17. DATOS DE PRUEBA RECOMENDADOS
Para cubrir todos los casos, verificar que existan:
- [x] Al menos 1 equipo activo del chofer con todos los documentos vigentes
- [x] Al menos 1 equipo activo con documentos próximos a vencer
- [x] Al menos 1 equipo activo con documentos vencidos
- [x] Al menos 1 equipo activo con documentos faltantes
- [x] Al menos 1 equipo inactivo
- [x] Al menos 1 equipo sin acoplado
- [x] Al menos 1 equipo con múltiples clientes asignados
- [x] Al menos 11 equipos para probar paginación (si es posible)
- [x] Documentos con diferentes fechas de vencimiento
- [x] Al menos 1 documento pendiente de aprobación
## 18. INTEGRACIÓN CON OTROS ROLES
### 18.1 Documentos Pendientes → Dador de Carga
- [x] Documento subido por chofer aparece en pendientes del dador
- [x] Cuando dador aprueba, el documento pasa a "APROBADO"
- [x] Cuando dador rechaza, el documento se marca como "RECHAZADO"
- [x] Estado de compliance se actualiza al aprobar
### 18.2 Visibilidad para Transportista
- [x] Transportista puede ver los equipos del chofer
- [x] Transportista puede gestionar al chofer
