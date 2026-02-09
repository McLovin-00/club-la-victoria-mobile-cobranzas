<!-- Propósito: checklist del Portal Cliente (derivado de pruebas-del-sistema.txt). -->

# Portal Cliente - Checklist

Fuente: `pruebas-del-sistema.txt` (extraído del PDF).

## 1. AUTENTICACIÓN Y ACCESO
### 1.1 Login
- [x] Ingresar con email y contraseña válidos de usuario CLIENTE
- [x] Verificar que redirige correctamente al Dashboard del Cliente
- [x] Intentar ingresar con email válido pero contraseña incorrecta → debe mostrar error
- [x] Intentar ingresar con email inexistente → debe mostrar error
- [x] Verificar que el logo de BCA se muestra correctamente en la pantalla de login
- [x] Verificar que el token se almacena en localStorage tras login exitoso
### 1.2 Sesión
- [x] Verificar que la sesión persiste al refrescar la página (F5)
- [x] Verificar que al cerrar sesión se elimina el token y redirige al login
- [x] Verificar que al expirar el token se redirige al login automáticamente
- [x] Intentar acceder a /cliente/equipos sin sesión → debe redirigir a login
### 1.3 Autorización
- [x] Verificar que un usuario CLIENTE solo puede ver sus equipos asignados (no los de otros clientes)
- [x] Verificar que no puede acceder a rutas de admin (/admin/*)
- [x] Verificar que no puede acceder a rutas de transportista (/transportista/*)
- [x] Verificar que no puede acceder a rutas de dador de carga (/dador/*)
- [x] Verificar que no puede acceder a rutas de chofer (/chofer/*)
## 2. DASHBOARD PRINCIPAL
### 2.1 Interfaz Visual
- [x] Verificar que se muestra el logo de Grupo BCA
- [x] Verificar que el título dice "Portal Cliente"
- [x] Verificar que muestra el mensaje "Consulta el estado documental de tus equipos asignados"
- [x] Verificar que existe el botón "Volver"
- [x] Verificar que el footer dice "Este portal es de solo lectura"
### 2.2 Estado Inicial (sin búsqueda)
- [x] Al ingresar, NO debe cargar equipos automáticamente
- [x] Debe mostrar el icono de camión con mensaje "Busca o lista tus equipos asignados"
- [x] Debe existir el botón "Listar Todos los Equipos"
- [x] Debe existir el campo de búsqueda vacío
- [x] El filtro de estado NO debe aparecer hasta que haya datos
## 3. BÚSQUEDA DE EQUIPOS
### 3.1 Búsqueda Simple
- [x] Buscar por patente de camión completa (ej: "AB123CD") → debe encontrar el equipo
- [x] Buscar por patente parcial (ej: "AB1") → debe encontrar equipos que coincidan
- [x] Buscar por DNI de chofer completo (ej: "34288054") → debe encontrar el equipo
- [x] Buscar por DNI parcial (ej: "3428") → debe encontrar equipos que coincidan
- [x] Buscar por nombre de chofer (ej: "Juan") → debe encontrar equipos que coincidan
- [x] Buscar por apellido de chofer → debe encontrar equipos que coincidan
- [x] Buscar por razón social de empresa transportista → debe encontrar equipos
- [x] Buscar con texto que no existe → debe mostrar "No se encontraron equipos"
- [x] Presionar ENTER en el campo de búsqueda → debe ejecutar la búsqueda
- [x] Hacer clic en botón "Buscar" → debe ejecutar la búsqueda
### 3.2 Búsqueda Masiva
- [x] Hacer clic en "Búsqueda Masiva" → debe abrir el panel de búsqueda masiva
- [x] Ingresar lista de DNIs separados por línea → debe buscar todos
- [x] Ingresar lista de DNIs separados por comas → debe buscar todos
- [x] Ingresar lista de patentes separadas por línea → debe buscar todas
- [x] Mezclar DNIs y patentes en la lista → debe encontrar todos
- [x] Ingresar más de 50 valores → debe limitar a 50
- [x] Ingresar lista vacía y presionar "Buscar Lista" → botón debe estar deshabilitado
- [x] Cerrar panel de búsqueda masiva con la X
### 3.3 Botón "Listar Todos"
- [x] Hacer clic en "Listar Todos" → debe mostrar todos los equipos asignados al cliente
- [x] Verificar que se resetea cualquier búsqueda previa
- [x] Verificar que el filtro de estado se resetea a "TODOS"
### 3.4 Botón "Limpiar"
- [x] Hacer clic en "Limpiar" → debe:
- Vaciar el campo de búsqueda
- Ocultar resultados
- Volver al estado inicial
- Cerrar panel de búsqueda masiva si estaba abierto
## 4. RESUMEN DE EQUIPOS (CONTADORES)
### 4.1 Visualización de Contadores
- [x] Verificar que aparece el contador "Total" con el número correcto de equipos
- [x] Verificar que aparece el contador "Vigentes" con fondo verde
- [x] Verificar que aparece el contador "Próx. a vencer" con fondo amarillo
- [x] Verificar que aparece el contador "Vencidos" con fondo rojo
- [x] Verificar que aparece el contador "Incompletos" con fondo gris
### 4.2 Consistencia de Contadores
- [x] Sumar los contadores individuales → debe ser igual o menor al Total (un equipo puede tener múltiples estados)
- [x] Aplicar filtro "Vigentes" → la cantidad de resultados debe coincidir con el contador
- [x] Aplicar filtro "Próximos a vencer" → la cantidad debe coincidir con el contador
- [x] Aplicar filtro "Vencidos" → la cantidad debe coincidir con el contador
- [x] Aplicar filtro "Incompletos" → la cantidad debe coincidir con el contador
## 5. FILTRO POR ESTADO
### 5.1 Funcionamiento del Filtro
- [x] Seleccionar "Todos los estados" → debe mostrar todos los equipos
- [x] Seleccionar " Vigentes" → debe mostrar solo	✅ equipos completamente vigentes
- [x] Seleccionar " Próximos a vencer" → debe mostrar solo equipos con documentos por vencer
- [x] Seleccionar "? Vencidos" → debe mostrar solo equipos con documentos vencidos
- [x] Seleccionar " Incompletos" → debe mostrar	⚪ solo equipos con documentos faltantes
- [x] Cambiar filtro → debe resetear a página 1
- [x] Combinar filtro con búsqueda → debe aplicar ambos criterios
## 6. LISTA DE EQUIPOS
### 6.1 Información Mostrada
- [x] Cada equipo muestra la patente del camión
- [x] Si tiene acoplado, muestra "PATENTE_CAMION / PATENTE_ACOPLADO"
- [x] Muestra nombre y apellido del chofer
- [x] Muestra DNI del chofer
- [x] Muestra razón social de la empresa transportista
- [x] Muestra el estado con icono y color correspondiente:
- Verde	✅ = Vigente
- Amarillo = Próximo a vencer
- Rojo	❌ = Vencido
- Gris = Incompleto	⚪
- [x] Si tiene próximo vencimiento, muestra la fecha
- [x] Existe botón "Ver docs" en cada equipo
### 6.2 Interacción con Equipos
- [x] Hacer clic en cualquier parte de la tarjeta del equipo → navega al detalle
- [x] Hacer clic en "Ver docs" → navega al detalle
- [x] Hover sobre tarjeta → debe mostrar efecto visual (shadow)
## 7. PAGINACIÓN
### 7.1 Navegación entre Páginas
- [x] Con más de 10 equipos → debe mostrar paginación
- [x] Verificar texto "Mostrando X - Y de Z equipos"
- [x] Verificar texto "Página N de M"
- [x] Botón "Anterior" deshabilitado en página 1
- [x] Botón "Siguiente" deshabilitado en última página
- [x] Hacer clic en "Siguiente" → carga página 2
- [x] Hacer clic en "Anterior" → vuelve a página 1
- [x] Al cambiar filtro, debe volver a página 1
- [x] Al buscar, debe volver a página 1
## 8. DESCARGA ZIP MASIVA
### 8.1 Botón de Descarga ZIP
- [x] Con equipos cargados, debe aparecer botón "Descargar ZIP (N equipos)"
- [x] Hacer clic → debe iniciar descarga de archivo ZIP
- [x] Durante descarga, botón debe mostrar "Iniciando descarga..."
- [x] El ZIP debe contener documentos de todos los equipos del resultado actual
- [x] Si hay filtro aplicado, el ZIP solo contiene equipos filtrados
- [x] Verificar que el ZIP se descarga correctamente (no corrupto)
- [x] Verificar estructura del ZIP: carpetas por equipo
## 9. DETALLE DE EQUIPO
### 9.1 Navegación
- [x] Hacer clic en un equipo → debe navegar a /cliente/equipos/:id
- [x] Botón "Volver" → debe regresar al listado
- [x] Con equipo inexistente → debe mostrar error "No se pudo cargar el detalle"
### 9.2 Información del Equipo
- [x] Muestra título "Equipo {PATENTE}"
- [x] Sección "Información del Equipo" con:
- Camión: patente, marca y modelo
- Acoplado: patente (o "-" si no tiene)
- Chofer: nombre, apellido, DNI (o "-" si no tiene)
- Empresa Transportista: razón social
### 9.3 Resumen de Documentos
- [x] Contador "Total" de documentos
- [x] Contador "Vigentes" en verde
- [x] Contador "Próx. vencer" en amarillo
- [x] Contador "Vencidos" en rojo
- [x] Suma de estados debe ser <= Total
### 9.4 Aviso de Documentos Vencidos
- [x] Si hay documentos vencidos → mostrar banner rojo con mensaje:
"Los documentos vencidos se muestran para referencia pero no están disponibles para descarga"
- [x] Si no hay vencidos → no mostrar el banner
### 9.5 Documentos Agrupados por Entidad
- [x] Documentos del CHOFER agrupados con icono de persona
- [x] Documentos del CAMIÓN agrupados con icono de camión
- [x] Documentos del ACOPLADO agrupados con icono de camión
- [x] Documentos de la EMPRESA TRANSPORTISTA agrupados con icono de edificio
- [x] Cada grupo muestra el nombre/identificador de la entidad
### 9.6 Lista de Documentos
- [x] Cada documento muestra:
- Nombre del documento (templateName)
- Fecha de vencimiento o "Sin vencimiento"
- Estado con icono y color
- Botón "Ver" (ojo)
- Botón "Descargar" o icono deshabilitado si vencido
## 10. DESCARGA DE DOCUMENTOS
### 10.1 Ver Documento (Preview)
- [x] Hacer clic en botón "Ver" (ojo) → abre modal con preview del PDF
- [x] Preview funciona para documentos VIGENTES
- [x] Preview funciona para documentos PRÓXIMOS A VENCER
- [x] Preview funciona para documentos VENCIDOS (solo ver, no descargar)
- [x] Modal muestra el nombre del documento en el título
- [x] Botón X cierra el modal
- [x] Hacer clic fuera del modal lo cierra
### 10.2 Descargar Documento Individual
- [x] Botón descargar habilitado para documentos VIGENTES → descarga PDF
- [x] Botón descargar habilitado para documentos PRÓXIMOS A VENCER → descarga PDF
- [x] Botón descargar DESHABILITADO para documentos VENCIDOS
- [x] Icono de "prohibido" en lugar de descarga para vencidos
- [x] Tooltip indica "Documento vencido - no disponible para descarga"
### 10.3 Descargar Todo (ZIP del Equipo)
- [x] Botón "Descargar todo (ZIP)" visible si hay documentos descargables
- [x] Botón NO visible si todos los documentos están vencidos
- [x] Al hacer clic → descarga ZIP con todos los documentos vigentes
- [x] ZIP NO incluye documentos vencidos
- [x] Nombre del archivo: "{PATENTE}documentacion.zip"
## 11. CASOS ESPECIALES
### 11.1 Equipo sin Documentos
- [x] Equipo sin documentos aprobados → mostrar mensaje "No hay documentos aprobados disponibles"
- [x] No mostrar contadores vacíos (todos en 0)
### 11.2 Equipo sin Acoplado
- [x] No mostrar " / " después de la patente del camión
- [x] En detalle, mostrar "-" en campo Acoplado
### 11.3 Equipo sin Chofer
- [x] Mostrar "Sin chofer asignado" en la lista
- [x] En detalle, mostrar "-" en campo Chofer
### 11.4 Cliente sin Equipos Asignados
- [x] Al "Listar Todos" → mostrar "No tienes equipos asignados actualmente"
- [x] Contadores no deben aparecer (no hay datos)
### 11.5 Documentos sin Fecha de Vencimiento
- [x] Mostrar "Sin vencimiento" en lugar de fecha
- [x] Estado debe ser VIGENTE (no puede vencer)
## 12. RENDIMIENTO Y UX
### 12.1 Estados de Carga
- [x] Al buscar/listar → mostrar spinner de carga
- [x] Mensaje "Cargando equipos..." durante la carga
- [x] Al cargar detalle → mostrar spinner centrado
- [x] Mensaje "Cargando detalle..." durante la carga
### 12.2 Manejo de Errores
- [x] Error de red → mostrar mensaje "Error al cargar datos"
- [x] Botón "Reintentar" visible en caso de error
- [x] Error 401 (no autorizado) → redirigir a login
- [x] Error 403 (prohibido) → mostrar mensaje apropiado
### 12.3 Responsividad
- [x] Interfaz funciona correctamente en desktop (1920px)
- [x] Interfaz funciona correctamente en laptop (1366px)
- [x] Interfaz funciona correctamente en tablet (768px)
- [x] Interfaz funciona correctamente en móvil (375px)
- [x] Botones y campos de búsqueda se apilan correctamente en móvil
- [x] Tarjetas de equipos legibles en móvil
- [x] Modal de preview ocupa 90% de la pantalla
### 12.4 Tema Oscuro (Dark Mode)
- [x] Si el sistema está en dark mode, la interfaz se adapta
- [x] Colores de fondo correctos en dark mode
- [x] Texto legible en dark mode
- [x] Contadores visibles con colores correctos en dark mode
## 13. FECHAS Y FORMATOS
### 13.1 Formato de Fechas
- [x] Fechas de vencimiento en formato argentino (DD/MM/YYYY)
- [x] "Próx. venc:" en formato correcto
- [x] "Asignado desde:" en formato correcto
- [x] "Vence:" en documentos en formato correcto
## 14. DATOS DE PRUEBA RECOMENDADOS
Para cubrir todos los casos, verificar que existan:
- [x] Al menos 1 equipo 100% VIGENTE (todos los documentos al día)
- [x] Al menos 1 equipo con documentos PRÓXIMOS A VENCER (< 30 días)
- [x] Al menos 1 equipo con documentos VENCIDOS
- [x] Al menos 1 equipo INCOMPLETO (faltan documentos)
- [x] Al menos 1 equipo sin acoplado
- [x] Al menos 1 equipo con 10+ documentos para probar scroll
- [x] Al menos 11 equipos para probar paginación
- [x] Al menos 1 documento sin fecha de vencimiento
## 15. SEGURIDAD
### 15.1 Acceso a Datos
- [x] Usuario CLIENTE A no puede ver equipos de CLIENTE B
- [x] No se puede acceder a documentos de equipos no asignados
- [x] URLs directas a equipos no asignados retornan error
- [x] No se expone información sensible en respuestas de error
### 15.2 Descargas
- [x] No se pueden descargar documentos sin token válido
- [x] No se pueden descargar documentos de equipos no asignados
- [x] Descargas masivas solo incluyen equipos del cliente autenticado
