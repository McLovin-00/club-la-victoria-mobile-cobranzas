## Historias de Usuario - Sistema de Gestión de Equipos (simple)

### Clientes
- Como Cliente, quiero buscar múltiples equipos por patentes para ver rápidamente su estado de cumplimiento.
  - Aceptación: ingreso patentes (camión, acoplado o ambos) y obtengo una lista con estado por equipo.

- Como Cliente, quiero ver los documentos de un equipo para confirmar su vigencia.
  - Aceptación: selecciono un equipo y veo documentos con nombre, fecha y estado.

- Como Cliente, quiero descargar un ZIP con la documentación vigente de un equipo para compartirla internamente.
  - Aceptación: clic en “ZIP del equipo” y se descarga un archivo .zip sin errores.

- Como Cliente, quiero descargar un resumen en Excel del equipo para analizarlo rápidamente.
  - Aceptación: clic en “Resumen Excel” y se descarga un .xlsx con los datos del equipo.

- Como Cliente, quiero solicitar un ZIP masivo de varios equipos y recibir un link cuando esté listo.
  - Aceptación: envío lista de equipos, recibo un jobId y luego un link para descargar el ZIP final.

### Dadores de Carga
- Como Dador, quiero ver una cola de documentos pendientes para aprobar o rechazar rápidamente.
  - Aceptación: veo la lista de pendientes, abro un documento y puedo aprobar/rechazar con un comentario.

- Como Dador, quiero consultar estadísticas básicas de aprobación para entender el progreso.
  - Aceptación: veo contadores (pendiente, aprobado, rechazado) actualizados.

- Como Dador, quiero gestionar los requisitos por cliente para definir qué documentos solicita cada uno.
  - Aceptación: agrego/quito plantillas requeridas y la lista queda guardada.

- Como Dador, quiero ver maestros (choferes, camiones, acoplados) en solo lectura para validar información base.
  - Aceptación: navego las tablas con paginación y filtros simples.

- Como Dador, quiero crear equipos rápidamente (alta mínima) y asociar/desasociar componentes.
  - Aceptación: registro un equipo con DNI/patentes y luego puedo attach/detach (según reglas) con confirmación.

- Como Dador, quiero descargar un ZIP masivo con documentación vigente de una lista de equipos.
  - Aceptación: envío lista, se genera un ZIP stream y se descarga correctamente.

- Como Dador, quiero ajustar configuración (plantillas habilitadas/alertas) de mi operación.
  - Aceptación: guardo cambios y quedan disponibles para el resto del sistema.

### Transportistas
- Como Transportista (Chofer), quiero ver “Mis equipos” para conocer su situación actual.
  - Aceptación: accedo y veo la lista de mis equipos con datos básicos.

- Como Transportista, quiero buscar mis equipos por DNI o patentes para encontrarlos rápido.
  - Aceptación: escribo el DNI/patente y obtengo resultados acotados a mis activos.

- Como Transportista, quiero descargar mis documentos por equipo para presentarlos cuando me los pidan.
  - Aceptación: entro a un equipo y puedo descargar los documentos correspondientes sin errores.

### Auditoría, Seguridad y Observabilidad (transversales)
- Todas las acciones sensibles quedan auditadas (subidas, borrados, aprobaciones, attach/detach, configuraciones, ZIPs).
- Las descargas masivas no bloquean la app (jobs asíncronos con link de descarga).
- El sistema expone `/health` y `/metrics`; las operaciones usan `X-Request-ID` para seguimiento.


