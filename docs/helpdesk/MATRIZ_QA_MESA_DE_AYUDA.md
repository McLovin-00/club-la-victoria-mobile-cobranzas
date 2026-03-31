<!-- Propósito: matriz manual de QA para validar el alcance completo de Mesa de Ayuda, separando canales, precondiciones, pasos y resultados esperados. -->

# Matriz QA - Mesa de Ayuda

## 1. Cómo usar esta matriz

Usá esta matriz para probar manualmente la feature completa.

Sugerencia de estado por caso:

- `Pendiente`
- `OK`
- `Falla`
- `Parcial`
- `No aplica`

## 2. Convenciones

### Canales

- `Plataforma`
- `Telegram Usuario`
- `Telegram Resolver`
- `Backend/Infra`
- `End to End`

### Precondiciones generales

Antes de ejecutar la mayoría de los casos, validar:

- `postgres`, `redis`, `minio`, `backend` y `helpdesk` levantados
- bot de Telegram operativo
- usuario Telegram vinculado
- grupos de resolvers configurados
- categorías `TECHNICAL` y `OPERATIONAL` con `resolver_configs` activas

---

## 3. Matriz de casos

| ID | Caso | Canal | Precondiciones | Pasos | Resultado esperado | Estado | Notas |
|---|---|---|---|---|---|---|---|
| HD-001 | Health del backend | Backend/Infra | Backend levantado | Ir a `http://localhost:4800/health` | Responde healthy | OK | Respondió `healthy` el 19/03 |
| HD-002 | Health del helpdesk | Backend/Infra | Helpdesk levantado | Ir a `http://localhost:4803/health` | Responde ok | OK | También `health/ready` respondió OK con DB y Redis |
| HD-003 | Usuario no vinculado es rechazado | Telegram Usuario | Tener cuenta no vinculada | Enviar `/start` y `/nuevo` | El bot informa que no está vinculado | Pendiente | Requiere otra cuenta Telegram |
| HD-004 | Usuario vinculado inicia sesión en bot | Telegram Usuario | Usuario vinculado | Enviar `/start` | El bot muestra bienvenida y comandos | OK | Captura 19/03 |
| HD-005 | Apertura del wizard de ticket | Telegram Usuario | Usuario vinculado | Enviar `/nuevo` | Muestra opciones `🔧 Técnica` y `📋 Operativa` | OK | Captura 19/03 |
| HD-006 | Selección de categoría técnica | Telegram Usuario | Wizard abierto | Elegir `🔧 Técnica` | Avanza a subcategorías técnicas | OK | Muestra Error/Sistema, Duda técnica, Sugerencia |
| HD-007 | Selección de categoría operativa | Telegram Usuario | Wizard abierto | Elegir `📋 Operativa` | Avanza a subcategorías operativas | OK | Usuario confirmó |
| HD-008 | Validación de categoría inválida | Telegram Usuario | Wizard abierto | Escribir texto fuera de opciones | El bot rechaza y no avanza | OK | Usuario confirmó |
| HD-009 | Validación de subcategoría inválida | Telegram Usuario | Categoría ya elegida | Escribir texto inválido | El bot rechaza y no avanza | OK | Fix: botones se reenvían y no se cierran; / durante wizard reinicia |
| HD-010 | Validación de asunto corto | Telegram Usuario | En paso de asunto | Enviar menos de 5 caracteres | El bot rechaza y no avanza | OK | Usuario confirmó |
| HD-011 | Validación de asunto largo | Telegram Usuario | En paso de asunto | Enviar más de 100 caracteres | El bot rechaza y no avanza | OK | Usuario confirmó |
| HD-012 | Selección de prioridad | Telegram Usuario | En paso de prioridad | Elegir Baja, Normal o Alta | El bot confirma y pide detalle | OK | Probado Normal (19/03); Baja y Alta opcionales |
| HD-013 | Validación de mensaje corto | Telegram Usuario | En paso final | Enviar menos de 10 caracteres | El bot rechaza y no crea ticket | OK | Usuario confirmó |
| HD-014 | Creación de ticket técnico por Telegram | Telegram Usuario | Config técnica activa | Completar wizard técnico | El ticket se crea y devuelve número | OK | 19/03: Técnica → Duda técnica, asunto, prioridad Normal, detalle; confirmación #002 y /mis_tickets |
| HD-015 | Creación de ticket operativo por Telegram | Telegram Usuario | Config operativa activa | Completar wizard operativo | El ticket se crea y devuelve número | OK | Usuario confirmó |
| HD-016 | Enrutamiento al grupo correcto | End to End | Ticket recién creado | Revisar grupo de resolvers | Técnica va a grupo técnico, operativa a grupo operativo | OK | Ticket #007 publicado en `resolvers_test` |
| HD-017 | Creación de tópico por ticket | Telegram Resolver | Ticket recién creado | Revisar grupo destino | Se crea un tópico nuevo por ticket | Falla | El bot publica en General con aviso "creado sin tópico"; falta permiso para crear temas |
| HD-018 | Contenido inicial del tópico | Telegram Resolver | Ticket recién creado | Abrir el tópico | Se ve resumen inicial del ticket | No aplica | Bloqueado por HD-017 (no se crea tópico) |
| HD-019 | `/mis_tickets` lista tickets | Telegram Usuario | Usuario con tickets creados | Enviar `/mis_tickets` | El bot lista tickets del usuario | OK | Usuario confirmó |
| HD-020 | `/info` por DM | Telegram Usuario | Bot operativo | Enviar `/info` | El bot responde info general | OK | Usuario confirmó |
| HD-021 | Resolver responde desde tópico | Telegram Resolver | Tópico existente | Escribir mensaje normal | Se guarda respuesta del resolver | OK | Usuario confirmó |
| HD-022 | Usuario recibe respuesta por DM | End to End | Resolver respondió en tópico | Revisar DM del usuario | El usuario recibe la respuesta/notificación | OK | Usuario confirmó |
| HD-023 | Resolver se autoasigna con `/resolver` | Telegram Resolver | Usuario resolver habilitado | Ejecutar `/resolver` en tópico | El ticket queda asignado a ese resolver | OK | Usuario confirmó |
| HD-024 | Usuario recibe aviso de asignación | End to End | Caso HD-023 exitoso | Revisar DM del usuario | Recibe aviso de asignación | OK | Usuario confirmó |
| HD-025 | Reasignación con `/asignar @usuario` | Telegram Resolver | Usuario destino existente y vinculado | Ejecutar comando en tópico | El ticket cambia de asignado | No aplica | Sin otro usuario/resolver para reasignar |
| HD-026 | Aviso al resolver reasignado | End to End | Caso HD-025 exitoso | Revisar DM del usuario asignado | Recibe aviso del ticket asignado | No aplica | Depende de HD-025 |
| HD-027 | Cambio de prioridad desde Telegram | Telegram Resolver | Tópico existente | Ejecutar `/prioridad ALTA`, `/prioridad NORMAL`, `/prioridad BAJA` | El sistema confirma prioridad nueva | OK | Usuario confirmó las 3 |
| HD-028 | `/info` dentro del tópico | Telegram Resolver | Tópico existente | Ejecutar `/info` | Muestra información del ticket | OK | Usuario confirmó |
| HD-029 | Cierre desde Telegram con `/cerrar` | Telegram Resolver | Tópico existente | Ejecutar `/cerrar` | El ticket se cierra | OK | Usuario confirmó |
| HD-030 | Usuario recibe aviso de cierre | End to End | Caso HD-029 exitoso | Revisar DM del usuario | Recibe notificación de ticket cerrado | OK | Usuario confirmó |
| HD-031 | Mensaje de resolver con adjunto | Telegram Resolver | Tópico existente | Enviar foto o documento | El sistema procesa el adjunto | OK | Usuario confirmó |
| HD-032 | Usuario recibe aviso por adjunto | End to End | Caso HD-031 exitoso | Revisar DM del usuario | Recibe notificación de nuevo archivo | OK | Usuario ve foto/archivo reenviado en DM |
| HD-033 | Login a la plataforma | Plataforma | Backend y frontend operativos | Iniciar sesión | La sesión queda activa | Pendiente | |
| HD-034 | Abrir `/helpdesk` | Plataforma | Usuario con permisos y sesión | Navegar a `/helpdesk` | La pantalla carga | Pendiente | |
| HD-035 | Ver estadísticas en `/helpdesk` | Plataforma | Datos existentes | Abrir `/helpdesk` | Muestra tarjetas de stats o intenta cargarlas | Pendiente | Puede haber desalineación |
| HD-036 | Ver listado de tickets | Plataforma | Tickets existentes | Abrir `/helpdesk` | Se listan tickets | Pendiente | |
| HD-037 | Filtrar por estado | Plataforma | Tickets existentes | Cambiar filtro de estado | El listado cambia | Pendiente | |
| HD-038 | Filtrar por categoría | Plataforma | Tickets existentes | Cambiar filtro de categoría | El listado cambia | Pendiente | |
| HD-039 | Filtrar por prioridad | Plataforma | Tickets existentes | Cambiar filtro de prioridad | El listado cambia | Pendiente | |
| HD-040 | Buscar por texto | Plataforma | Tickets existentes | Escribir en buscador | El listado se reduce según coincidencias | Pendiente | |
| HD-041 | Abrir detalle de ticket | Plataforma | Tickets visibles | Hacer click en un ticket | Abre `/helpdesk/:id` | Pendiente | |
| HD-042 | Ver cabecera del ticket | Plataforma | Ticket abierto en detalle | Revisar header | Muestra número, estado, prioridad, creador y fecha | Pendiente | |
| HD-043 | Ver historial de mensajes | Plataforma | Ticket con mensajes | Abrir detalle | Se muestran mensajes históricos | Pendiente | |
| HD-044 | Enviar mensaje desde plataforma | Plataforma | Ticket abierto | Escribir mensaje y enviar | El mensaje se guarda y aparece en el chat | Pendiente | Verificar contrato real |
| HD-045 | Cerrar ticket desde plataforma | Plataforma | Ticket abierto | Botón `Cerrar Ticket` | El ticket cambia a cerrado | Pendiente | Verificar método HTTP real |
| HD-046 | Reabrir ticket desde plataforma | Plataforma | Ticket cerrado | Botón `Reabrir Ticket` | El ticket vuelve a abierto | Pendiente | Verificar método HTTP real |
| HD-047 | Acceso a detalle de ticket inexistente | Plataforma | Sesión activa | Ir a `/helpdesk/<id-falso>` | Muestra error controlado | Pendiente | |
| HD-048 | Ticket creado por Telegram visible en plataforma | End to End | Ticket creado por bot | Abrir `/helpdesk` | El ticket aparece en el listado | Pendiente | |
| HD-049 | Respuesta de resolver visible en plataforma | End to End | Resolver respondió | Abrir detalle del ticket | El mensaje aparece en la conversación | Pendiente | |
| HD-050 | Ticket cerrado en Telegram reflejado en plataforma | End to End | Ticket cerrado con `/cerrar` | Abrir detalle/listado | Estado muestra `CLOSED` | Pendiente | |
| HD-051 | Ticket reabierto en plataforma reflejado en continuidad | End to End | Ticket reabierto | Abrir detalle | Mantiene historial y nuevo estado | Pendiente | |
| HD-052 | Configuración técnica activa existe | Backend/Infra | Acceso DB | Ver `resolver_configs` | Existe config activa para `TECHNICAL` | Pendiente | |
| HD-053 | Configuración operativa activa existe | Backend/Infra | Acceso DB | Ver `resolver_configs` | Existe config activa para `OPERATIONAL` | Pendiente | |
| HD-054 | Vinculación Telegram persiste `telegram_user_id` | Backend/Infra | Usuario ya habló con bot | Consultar DB | El usuario tiene `telegram_user_id` persistido | Pendiente | |
| HD-055 | Auto-cierre programado | Backend/Infra | Scheduler operativo | Revisar logs o esperar condición | El job está programado y ejecuta | Pendiente | |

---

## 4. Casos con atención especial

Estos casos conviene marcarlos con más detalle porque son los que más rápido te dicen si la feature está realmente integrada:

- `HD-014`
- `HD-015`
- `HD-016`
- `HD-021`
- `HD-022`
- `HD-034`
- `HD-041`
- `HD-044`
- `HD-045`
- `HD-046`
- `HD-048`
- `HD-049`
- `HD-050`

---

## 5. Observaciones importantes

- La feature completa es **Mesa de Ayuda**, no solo Telegram.
- Telegram hoy parece ser una parte fuerte del sistema.
- La parte de frontend existe, pero algunas interacciones conviene validarlas manualmente porque puede haber diferencias entre lo planeado y lo implementado.
- No hay round robin ni asignación automática a una persona.
- Hoy el comportamiento real es:
  - el ticket cae a un grupo por categoría
  - se crea un tópico por ticket
  - después la asignación es manual

---

## 6. Prioridad recomendada para probar

Si querés ir por impacto, este orden te da la mayor señal posible:

1. `HD-004`
2. `HD-014`
3. `HD-016`
4. `HD-021`
5. `HD-022`
6. `HD-034`
7. `HD-041`
8. `HD-044`
9. `HD-045`
10. `HD-046`
11. `HD-048`
12. `HD-049`

Si esos pasan, ya tenés una validación bastante fuerte de punta a punta.

---

## 7. Próximo bloque a probar

*(Se actualiza después de cada ronda; probar en orden y reportar OK/Falla.)*

### Bloque actual: Plataforma (`/helpdesk`)

**Setup:** ver `docs/helpdesk/SETUP_QA_PLATAFORMA.md` (stack Docker, URL típica `http://localhost:8080/helpdesk`). Usuario con rol **ADMIN** o **SUPERADMIN**.

| ID | Actor principal | Qué hacer | Resultado esperado |
|----|-----------------|-----------|--------------------|
| **HD-033** | Usuario (plataforma) | Iniciar sesión en la SPA. | Sesión activa; redirección coherente. |
| **HD-034** | Usuario (plataforma) | Menú **Menú** → Mesa de Ayuda o ir a `/helpdesk`. | La pantalla carga sin error. |
| **HD-035** | Usuario (plataforma) | En `/helpdesk`, revisar tarjetas superiores. | Stats visibles o estado de carga/error controlado. |
| **HD-036** | Usuario (plataforma) | Revisar tabla/listado. | Aparecen tickets (o vacío coherente). |
| **HD-037** | Usuario (plataforma) | Cambiar filtro por **estado**. | El listado se actualiza. |
| **HD-038** | Usuario (plataforma) | Cambiar filtro por **categoría**. | El listado se actualiza. |
| **HD-039** | Usuario (plataforma) | Cambiar filtro por **prioridad**. | El listado se actualiza. |
| **HD-040** | Usuario (plataforma) | Usar **búsqueda por texto**. | El listado filtra por coincidencias. |
| **HD-041** | Usuario (plataforma) | Clic en un ticket. | Navega a `/helpdesk/:id`. |
| **HD-042** | Usuario (plataforma) | En detalle, revisar cabecera. | Número, estado, prioridad, creador, fechas visibles. |
| **HD-043** | Usuario (plataforma) | Revisar zona de mensajes. | Historial visible si hay mensajes. |
| **HD-044** | Usuario (plataforma) | Enviar un mensaje nuevo. | Aparece en el hilo y persiste al recargar. |
| **HD-045** | Usuario (plataforma) | **Cerrar ticket** (si existe el control). | Estado pasa a cerrado en UI y API. |
| **HD-046** | Usuario (plataforma) | **Reabrir ticket** en uno cerrado. | Estado vuelve a abierto/en progreso según reglas. |
| **HD-047** | Usuario (plataforma) | Ir a `/helpdesk/00000000-0000-0000-0000-000000000000` (o ID inexistente válido). | Mensaje de error controlado (404/empty). |

**Siguiente sub-bloque (E2E cruce Telegram ↔ plataforma):** `HD-048` a `HD-051` usando tickets ya creados o respondidos por Telegram.

**Bloqueo conocido (Telegram):** HD-017 — sin permiso de tópicos, el bot publica en General; HD-018 queda no aplica hasta resolver permisos del bot en el grupo.

Cuando termines este bloque, actualizá la columna **Estado** y **Notas** en la tabla de la §3 y avisá OK/Falla por caso.
