# Cobro móvil de múltiples períodos

Objetivo: simplificar la selección y el cobro de cuotas existentes y períodos por generar.
Ramas: `feat/mobile-quota-generation` en móvil y backend; entrega `ask-on-risk`; pruebas: Jest en ambos proyectos.
Previsión: más de 400 líneas modificadas entre ambos repositorios; estrategia: `stacked-to-main`, primero backend y después móvil, sin publicar ni abrir PR automáticamente.

## Specs

### S1 — Selección y cobro simplificados

> No me gusta mucho como quedo lo de generar cuota, tiene muchos pasos ya que hay que generar la cuota, seleccionar la cuota, pagar la cuota. La idea es que sea mas sencillo para el usuario de la app ya que la persona que lo usa es media rehacia a la tecnologia

> me gustaria que se puedan seleccionar varias a la vez

> Si.

El usuario aceptó una lista unificada de cuotas pendientes y períodos aún no generados. El flujo propuesto muestra un resumen de las cuotas, saldo aplicado y monto a cobrar; una confirmación genera las faltantes y registra el cobro. Debe evitar duplicar períodos y conservar la selección múltiple.

### S2 — Morosidad y aislamiento del flujo web

> entiendo la regla pero no entiendo por que interferiria en este caso si esta intentando pagar las cuotas

> dale, no deberia interferir ni modificar nada del flujo web

En el nuevo flujo móvil, las cuotas que se pagan en la misma operación no deben tratarse como deuda pendiente al evaluar morosidad. No cambiar el comportamiento del flujo web. Mantener integridad de pagos, saldo y períodos ante errores y reintentos.

> Sí, autorizar

El usuario autorizó que la nueva operación móvil sea pública, sin usuario ni contraseña, para generar y cobrar varios períodos de un solo socio en una transacción; se le informó que podrá invocarse fuera de la app.

## Tasks
- T1 — S1-S2 — inline — hecho — commit: `5e87c99` — Contrato y operación móvil para períodos existentes y nuevos, con verificación del comportamiento web. Riesgo: ítems 1, 3 y 4 (datos financieros, código compartido y concurrencia).
- T2 — S1-S2 — inline — hecho — commit: pendiente — Lista móvil unificada, resumen y confirmación. Riesgo: ítem 1 (registro de cobros).

## Log
- L1: «No me gusta mucho como quedo lo de generar cuota, tiene muchos pasos ya que hay que generar la cuota, seleccionar la cuota, pagar la cuota. La idea es que sea mas sencillo para el usuario de la app ya que la persona que lo usa es media rehacia a la tecnologia»
- L2: «me gustaria que se puedan seleccionar varias a la vez»
- L3: «Si.» (acepta una lista conjunta de cuotas existentes y meses sin generar).
- L4: «entiendo la regla pero no entiendo por que interferiria en este caso si esta intentando pagar las cuotas»
- L5: «dale, no deberia interferir ni modificar nada del flujo web»
- L6: La operación existente de generación y la de cobro usan transacciones distintas; la respuesta móvil actual no informa el monto de categoría ni períodos pagados. Se preservarán los cambios preexistentes ajenos en ambos repositorios y no se contactará producción.
- L7: «Sí, autorizar» (ante la pregunta de autorizar una operación móvil pública que genera y cobra varios períodos de un solo socio en una transacción).
- L8: Se implementó una operación móvil transaccional y una consulta para conocer el monto y los períodos pagados. La operación valida el monto y saldo previamente mostrados, rechaza períodos pagados y verifica reintentos; el flujo web conserva su ruta anterior. RED: el contrato HTTP nuevo y la selección móvil fallaban antes de implementarse; GREEN: pruebas enfocadas del backend 90/90 y siete pruebas enfocadas móviles, más `tsc --noEmit`, pasan.
- L9: En la base local aislada se verificaron generación y pago de dos períodos con crédito y el reintento sin duplicación. Las suites completas mantienen fallas previas: backend 8 suites fallidas/11 aprobadas; móvil 2 fallidas/18 aprobadas. El build del backend pasó en una copia temporal. La verificación independiente y el control de interfaz aún están pendientes.
- L10: La verificación independiente detectó que se aceptaba un reintento con `creditoEsperado` distinto. No pudo ejecutar la prueba transaccional con una base independiente debido a restricciones de su entorno; tampoco verificó visualmente la interfaz. La corrección debe vincular el reintento a la solicitud confirmada sin alterar el flujo web.
- L11: Se añadió una tabla nueva para vincular cada operación móvil con la huella de su solicitud completa, sin cambiar la tabla ni la ruta de cobros web. RED: la prueba de reintento con otro crédito falló antes de la corrección. GREEN: el backend pasa 92 pruebas enfocadas y el móvil siete, más sus chequeos de tipos. En una base descartable separada, una solicitud rechazada preservó la huella de datos; un cobro de una cuota existente y otra nueva redujo cuatro pendientes a tres, aplicó crédito y reactivó al socio; el reintento idéntico no duplicó datos y un crédito diferente devolvió 409. La migración nueva también se aplicó únicamente a la base local ficticia.
- L12: La revisión independiente confirmó la corrección del reintento y, con PostgreSQL aislado, comprobó reversión, cobro y reintento sin cambios en las filas. La comparación web independiente quedó sin resultado. El padre comparó la ruta web de la base y el cambio con dos bases aisladas equivalentes: ambas devolvieron HTTP 201, respuestas equivalentes sin fechas y los mismos efectos persistidos. La inspección visual móvil detectó períodos desordenados; se corrigieron y se comprobó el orden y el resumen de dos cuotas. El detector visual devolvió `[]`.
- L13: La comprobación independiente limitada comparó el mismo pago web en bases aisladas de la versión anterior y de la candidata: ambas devolvieron HTTP 201, respuestas equivalentes sin fechas y efectos persistidos equivalentes. Este resultado cubre el caso probado, no todos los escenarios web. La revisión de alto riesgo quedó sin bloqueos para las comprobaciones ejecutadas.
- L14: El usuario eligió «Por etapas a principal (Recomendado)»: `stacked-to-main`, con backend y móvil revisados en sus respectivos repositorios; no autoriza publicación ni creación de PR.
- L15: T1 registrado en el backend como `5e87c99`. Su unidad coherente de operación transaccional, migración y pruebas suma 494 líneas; se conserva junta y se recomienda una excepción de tamaño para su revisión, sin recortar pruebas.
- L16: La comprobación independiente de la ruta web pasó para el caso comparado. En la app local se seleccionaron una cuota existente y un período nuevo de un socio ficticio, se confirmó un cobro de $13.000 aplicando $7.000 de crédito y ambos períodos quedaron pagados. Se comprobó la interfaz en un navegador de ancho móvil; no se verificó un dispositivo nativo.
- Siguiente: registrar el commit móvil y su identidad; no publicar ni abrir PR.
