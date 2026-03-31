# PRD: Cobertura de Testing Helpdesk 80%

> **Fecha**: 2026-03-25
> **Status**: aprobado
> **Complejidad**: alta
> **Autor**: generado con prd-creator

---

## Problema

El sistema de mesa de ayuda (helpdesk) tiene una cobertura de tests insuficiente (aproximadamente 21%), lo que genera riesgo de regresiones en cada cambio y no cumple con el estándar de calidad requerido por SonarQube. Actualmente, el pipeline de integración continua puede fallar por no alcanzar el umbral mínimo de 80% de cobertura, bloqueando deployments y poniendo en riesgo la estabilidad del sistema.

La falta de tests también significa que no hay documentación viva del comportamiento esperado del sistema, dificultando el onboarding de nuevos desarrolladores y aumentando el tiempo de diagnóstico cuando algo falla.

**Situación actual**: Solo 14 archivos de test cubren parcialmente algunos servicios, dejando sin protección controladores, handlers del bot de Telegram, workers, middlewares y rutas completas.

---

## Usuarios

### Usuario principal
- **Quién**: Equipo de desarrollo
- **Necesidad**: Tests que protejan contra cambios que rompan funcionalidad existente y sirvan como documentación del comportamiento esperado
- **Dolor actual**: Cada cambio puede introducir bugs silenciosos porque no hay tests que los detecten

### Usuarios secundarios
- **DevOps/QA**: Necesita que el pipeline pase el Quality Gate de SonarQube sin intervenir manualmente
- **Product Owner**: Necesita confianza en que las nuevas features no rompan las existentes

---

## Objetivos

### Objetivos de negocio
- Alcanzar 80% de cobertura de código en el microservicio helpdesk
- Pasar el Quality Gate de SonarQube sin errores ni warnings críticos
- Reducir el tiempo de diagnóstico de bugs de horas a minutos

### Objetivos de usuario
- El desarrollador puede hacer refactors con confianza sabiendo que los tests detectarán regresiones
- QA puede validar flujos completos automáticamente sin testing manual repetitivo
- Nuevos desarrolladores entienden el sistema leyendo los tests

### No-objetivos (explícitos)
- No se incluye testing de performance o carga
- No se incluye testing de seguridad penetración (solo validaciones funcionales)
- No se modifica funcionalidad existente, solo se agregan tests

---

## Alcance

### Incluido en esta versión

**Componentes con tests unitarios e integration:**
- Servicios de negocio (tickets, mensajes, notificaciones, sincronización de media)
- Controladores (creación de tickets, gestión de mensajes, adjuntos, administración)
- Handlers del bot de Telegram (mensajes privados, grupos, comandos)
- Workers de procesamiento en segundo plano (auto-cierre, sincronización de media)
- Middlewares (autenticación, manejo de errores, verificación de permisos)
- Rutas REST (todos los endpoints)
- Schedulers (cierre automático de tickets)

**Tests E2E de flujos completos:**
- Creación y seguimiento de tickets
- Comunicación usuario-resolver con diferentes tipos de adjuntos
- Integración con Telegram
- Cierre y reapertura de tickets
- Configuración administrativa

**Tipos de adjuntos cubiertos:**
- Imágenes (JPEG, PNG, GIF, WebP)
- Audio (OGG, MP3, WAV)
- Video (MP4, WebM)
- Documentos (PDF, DOC, DOCX, XLS, XLSX)

### Fuera de alcance (explícito)
- Tests de performance/stress — requiere infraestructura y herramientas adicionales
- Tests de accesibilidad UI — el frontend de helpdesk está fuera del scope de este microservicio
- Tests de migración de base de datos — se cubren con tests de integración existentes

---

## Requisitos Funcionales

### P0 — Críticos (sin estos no hay producto)

- **[RF-001] Tests de servicios de tickets**
  Descripción: Tests unitarios para todas las operaciones de tickets: crear, obtener, cerrar, reabrir, listar, estadísticas
  Criterio de aceptación: Dado un servicio de tickets, cuando se ejecutan todas las operaciones válidas e inválidas, entonces cada caso tiene un test que verifica el resultado esperado

- **[RF-002] Tests de servicios de mensajes**
  Descripción: Tests unitarios para envío, recepción y listado de mensajes en tickets
  Criterio de aceptación: Dado un ticket abierto, cuando se envían mensajes con y sin adjuntos, entonces los tests verifican que se persisten correctamente y se notifica a las partes

- **[RF-003] Tests de controladores**
  Descripción: Tests de integración para todos los endpoints REST del helpdesk
  Criterio de aceptación: Dado un endpoint del API, cuando se envían requests válidos e inválidos, entonces los tests verifican el código de estado y la respuesta correcta

- **[RF-004] Tests de middlewares**
  Descripción: Tests para autenticación, autorización y manejo de errores
  Criterio de aceptación: Dado un request sin token o con permisos insuficientes, entonces el middleware rechaza la solicitud con el código de error apropiado

- **[RF-005] Tests E2E - Flujo de creación de ticket**
  Descripción: Test end-to-end del flujo completo de creación de ticket por parte del usuario
  Criterio de aceptación: Dado un usuario autenticado, cuando crea un ticket con asunto y mensaje, entonces el ticket aparece en su lista y recibe confirmación

- **[RF-006] Tests E2E - Flujo de adjuntos**
  Descripción: Test end-to-end para cada tipo de archivo adjunto (imagen, audio, video, documento)
  Criterio de aceptación: Dado un usuario con un ticket abierto, cuando envía cada tipo de adjunto, entonces el archivo se almacena, se vincula al mensaje y puede ser descargado

### P1 — Importantes (necesarios para una buena experiencia)

- **[RF-007] Tests de handlers del bot de Telegram**
  Descripción: Tests para mensajes privados (DM), mensajes en grupos, y comandos del bot
  Criterio de aceptación: Dado un mensaje de Telegram, cuando llega al bot, entonces se procesa correctamente según el tipo (crear ticket, responder, redirigir)

- **[RF-008] Tests de workers**
  Descripción: Tests para el worker de auto-cierre y el worker de sincronización de media
  Criterio de aceptación: Dado un ticket resuelto sin actividad por 72 horas, cuando el scheduler lo procesa, entonces el ticket se cierra automáticamente

- **[RF-009] Tests E2E - Flujo Telegram DM**
  Descripción: Test end-to-end de comunicación vía Telegram mensaje privado
  Criterio de aceptación: Dado un usuario vinculado a Telegram, cuando envía un mensaje al bot, entonces se crea o actualiza un ticket y el usuario recibe confirmación

- **[RF-010] Tests E2E - Cierre y reapertura**
  Descripción: Test end-to-end del flujo de cierre por resolver y reapertura por usuario
  Criterio de aceptación: Dado un ticket abierto, cuando el resolver lo cierra y el usuario intenta reabrir dentro de 72 horas, entonces el ticket vuelve a estado abierto

- **[RF-011] Tests de validación de adjuntos**
  Descripción: Tests para límites de tamaño, tipos MIME permitidos, y sanitización de nombres
  Criterio de aceptación: Dado un archivo que excede el límite de tamaño o tiene tipo no permitido, entonces el sistema rechaza el upload con mensaje de error descriptivo

### P2 — Deseables (mejoran la experiencia pero pueden esperar)

- **[RF-012] Tests E2E - Configuración administrativa**
  Descripción: Test del flujo donde un administrador configura resolvers y grupos de Telegram
  Criterio de aceptación: Dado un administrador, cuando asigna un grupo de Telegram a una categoría, entonces los tickets nuevos de esa categoría se redirigen al grupo correcto

- **[RF-013] Tests de WebSocket**
  Descripción: Tests para notificaciones en tiempo real y manejo de reconexiones
  Criterio de aceptación: Dado un usuario conectado por WebSocket, cuando hay un nuevo mensaje en su ticket, entonces recibe la notificación en tiempo real

---

## Requisitos No Funcionales

- **Estabilidad**: Los tests deben ser deterministas, sin flakiness. Un test que pasa debe pasar siempre en las mismas condiciones
- **Velocidad**: La suite de tests unitarios e integration debe completarse en menos de 60 segundos. Los E2E pueden tomar hasta 5 minutos
- **Aislamiento**: Cada test debe ser independiente, sin depender del estado dejado por tests anteriores
- **Mantenibilidad**: Los tests deben ser claros y fáciles de modificar cuando cambie la funcionalidad

---

## Flujos

### Flujo principal: Usuario crea ticket y recibe respuesta

1. El usuario accede al sistema de mesa de ayuda
2. El usuario completa el formulario con asunto, categoría y descripción del problema
3. El usuario puede adjuntar archivos (imagen, audio, video o documento)
4. El sistema crea el ticket con número secuencial y estado "abierto"
5. El sistema notifica al resolver asignado (por Telegram o notificación interna)
6. El resolver lee el ticket y responde con mensaje o solicitud de información
7. El usuario recibe la notificación y puede responder
8. El ciclo continúa hasta que el problema se resuelve
9. El resolver marca el ticket como "resuelto"
10. Si el usuario no responde en 72 horas, el ticket se cierra automáticamente
11. El usuario puede reabrir el ticket dentro de las 72 horas si el problema persiste

### Flujos alternativos

**Comunicación por Telegram DM**
Condición: El usuario prefiere usar Telegram en lugar de la plataforma web
1. El usuario envía mensaje privado al bot de Telegram
2. El bot verifica que el usuario está vinculado a su cuenta de la plataforma
3. Si no está vinculado, el bot solicita la vinculación
4. Si está vinculado, el bot busca un ticket existente o crea uno nuevo
5. El bot envía confirmación con el número de ticket
6. El usuario puede continuar la conversación por Telegram

**Adjunto rechazado**
Condición: El usuario intenta subir un archivo que no cumple los requisitos
1. El usuario selecciona un archivo para adjuntar
2. El sistema valida el tipo de archivo y el tamaño
3. Si el archivo excede el límite, muestra mensaje con el máximo permitido
4. Si el tipo no está permitido, muestra lista de tipos aceptados
5. El usuario debe corregir el archivo antes de continuar

### Flujos de error

**Ticket cerrado recibe mensaje**
Condición: Alguien intenta enviar mensaje a un ticket ya cerrado
Comportamiento esperado: El sistema muestra mensaje claro indicando que el ticket está cerrado y sugiere crear uno nuevo o reabrirlo si está dentro del plazo

**Usuario sin permisos ve ticket ajeno**
Condición: Un usuario intenta acceder a un ticket que no creó
Comportamiento esperado: El sistema deniega el acceso con mensaje "No tienes permiso para ver este ticket"

**Servicio de almacenamiento no disponible**
Condición: El sistema de almacenamiento de archivos no responde
Comportamiento esperado: El sistema muestra mensaje de error temporal y sugiere reintentar más tarde, sin perder el mensaje de texto

---

## Criterios de Éxito

### Criterios de aceptación generales
- [ ] Dado el microservicio helpdesk, cuando se ejecuta la suite de tests completa, entonces la cobertura de código es mayor o igual a 80%
- [ ] Dado un análisis de SonarQube, cuando se escanea el código, entonces el Quality Gate muestra estado PASSED
- [ ] Dado un test de cualquier componente, cuando se ejecuta múltiples veces, entonces el resultado es consistente (sin flakiness)
- [ ] Dado un nuevo desarrollador, cuando lee los tests del servicio de tickets, entonces entiende el comportamiento esperado sin leer la documentación
- [ ] Dado un cambio en el código existente, cuando rompe funcionalidad, entonces al menos un test falla
- [ ] Dado un archivo adjunto de cualquier tipo soportado, cuando se sube correctamente, entonces existe un test que verifica su procesamiento

### Comportamientos críticos
- Todo ticket creado debe tener número secuencial único por empresa
- Todo mensaje enviado debe notificar a la contraparte (usuario o resolver)
- Todo adjunto debe validar tipo, tamaño y sanitizar nombre antes de almacenar
- Todo ticket resuelto sin actividad por 72 horas debe cerrarse automáticamente
- Todo usuario debe poder reabrir su ticket cerrado dentro de las 72 horas

### Métricas de impacto
- **Cobertura de código**: 21% → ≥80%
- **Quality Gate SonarQube**: FAILED → PASSED
- **Tests unitarios**: 54 → ~150+
- **Tests E2E**: 0 → 6+ (uno por flujo principal)
- **Tiempo de diagnosis de bugs**: horas → minutos

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Mocks excesivos ocultan bugs reales | Media | Alto | Incluir tests de integración con base de datos real y servicios mockeados solo cuando sea necesario |
| Tests lentos desalientan ejecución frecuente | Media | Medio | Mantener tests unitarios < 60s, usar paralelización |
| Flakiness en tests E2E por dependencias externas | Alta | Medio | Usar fixtures deterministas, retries limitados, aislar de APIs externas |
| Esfuerzo subestimado por complejidad del bot de Telegram | Media | Medio | Priorizar tests unitarios del bot primero, E2E después |
| Cobertura inflada con tests triviales | Media | Alto | Revisar que cada test tenga aserciones significativas (no solo "no lanza error") |

---

## Plan de Implementación por Fases

### Fase 1: Unit Tests (Prioridad Alta)
**Duración estimada**: 1-2 semanas

| Componente | Archivos actuales | Tests necesarios | Prioridad |
|------------|------------------|------------------|-----------|
| services/ticket.service.ts | 46% | +15 tests | P0 |
| services/message.service.ts | 31% | +10 tests | P0 |
| services/telegram.service.ts | 13% | +12 tests | P1 |
| services/websocket.service.ts | 15% | +8 tests | P2 |
| controllers/*.ts | ~0% | +20 tests | P0 |
| middlewares/*.ts | 0% | +8 tests | P0 |

### Fase 2: Integration Tests (Prioridad Alta)
**Duración estimada**: 1 semana

| Componente | Cobertura actual | Tests necesarios | Prioridad |
|------------|------------------|------------------|-----------|
| routes/ticket.routes.ts | 0% | +10 tests | P0 |
| routes/attachment.routes.ts | 0% | +6 tests | P0 |
| routes/admin.routes.ts | 53% | +5 tests | P1 |
| bot/handlers/*.ts | ~0% | +15 tests | P1 |
| workers/*.ts | 0% | +8 tests | P1 |

### Fase 3: E2E Tests (Prioridad Media)
**Duración estimada**: 1 semana

| Flujo | Escenarios | Prioridad |
|-------|------------|-----------|
| Creación de ticket | 3 escenarios (básico, con adjuntos, error) | P0 |
| Comunicación usuario-resolver | 4 escenarios (texto, imagen, audio, video) | P0 |
| Telegram DM | 2 escenarios (usuario vinculado, no vinculado) | P1 |
| Cierre y reapertura | 3 escenarios (cerrar, reabrir, expirado) | P1 |
| Auto-close | 1 escenario (72h inactividad) | P2 |
| Configuración admin | 2 escenarios | P2 |

---

## Preguntas Abiertas

- [ ] ¿Se requiere mockear MinIO o usar una instancia de test real para los tests de adjuntos?
- [ ] ¿Los tests E2E de Telegram deben usar el bot real o un mock del API de Telegram?
- [ ] ¿Cuál es el criterio para decidir si un archivo de configuración puede excluirse de coverage?

---

*Generado por prd-creator · 2026-03-25*
