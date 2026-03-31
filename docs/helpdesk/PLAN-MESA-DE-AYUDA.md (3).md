# Plan: Sistema de Mesa de Ayuda

## Objetivo

Implementar un sistema de mesa de ayuda integrado en la plataforma que permita a cualquier usuario realizar consultas técnicas u operativas a través de un chat con soporte multimedia. Los tickets se transmiten a los resolvedores vía Telegram y los usuarios pueden también comunicarse directamente por Telegram.

---

## Decisiones de diseño

| # | Tema | Decisión |
|---|------|----------|
| 1 | Ubicación | Nuevo microservicio `apps/helpdesk` |
| 2 | Categorías | Fijas: Técnica (Error, Duda, Sugerencia) y Operativa (Reglas de negocio) |
| 3 | Telegram resolvedores | Un grupo con topics por categoría principal. Cada ticket = un topic |
| 4 | Cierre de ticket | Ambos (usuario y resolver) + auto-cierre 72hs tras marcar resuelto |
| 5 | Media | Texto, imagen, audio (archivo), video (archivo), documento |
| 6 | Prioridad | Usuario asigna, resolver confirma/ajusta |
| 7 | Asignación de resolvedores | Configurable por admin |
| 8 | Número de ticket | Secuencial global |
| 9 | Notificaciones | Socket.IO + InternalNotification + Telegram DM. Sin email |
| 10 | Librería Telegram | grammY |
| 11 | Entrada por Telegram | Sí. Username en registro/perfil + validación automática por el bot |
| 12 | Vinculación Telegram | Username en formulario de usuario, bot resuelve a ID numérico en primer contacto |

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                   │
│                                                                     │
│  ┌──────────────┐   ┌──────────────────┐   ┌───────────────────┐   │
│  │ Mis Tickets  │   │ Chat del Ticket  │   │ Panel Admin       │   │
│  │ (lista)      │   │ (mensajes,       │   │ Helpdesk          │   │
│  │              │   │  adjuntos,       │   │ (config resolver, │   │
│  │              │   │  multimedia)     │   │  métricas)        │   │
│  └──────┬───────┘   └────────┬─────────┘   └───────┬───────────┘   │
│         │ RTK Query          │ Socket.IO + RTK Q.   │ RTK Query     │
└─────────┼────────────────────┼──────────────────────┼───────────────┘
          │                    │                      │
┌─────────┼────────────────────┼──────────────────────┼───────────────┐
│         ▼                    ▼                      ▼               │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  HELPDESK MICROSERVICE                        │   │
│  │                                                               │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐  │   │
│  │  │ Ticket      │  │ Message      │  │ Telegram Bot        │  │   │
│  │  │ Service     │  │ Service      │  │ (grammY)            │  │   │
│  │  │             │  │              │  │                     │  │   │
│  │  │ CRUD tickets│  │ Chat + media │  │ Grupos con topics   │  │   │
│  │  │ estados     │  │ MinIO upload │  │ DM a usuarios       │  │   │
│  │  │ asignación  │  │ Socket.IO    │  │ Recibe respuestas   │  │   │
│  │  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘  │   │
│  │         │                │                      │             │   │
│  │         └────────────────┼──────────────────────┘             │   │
│  │                          ▼                                    │   │
│  │                    ┌───────────┐                               │   │
│  │                    │  BullMQ   │                               │   │
│  │                    │ (fan-out, │                               │   │
│  │                    │  media,   │                               │   │
│  │                    │  auto-    │                               │   │
│  │                    │  cierre)  │                               │   │
│  │                    └───────────┘                               │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────┐                                            │
│  │  BACKEND PRINCIPAL   │                                            │
│  │  User.telegramUser   │◄── consulta interna de usuarios            │
│  │  (fuente de verdad)  │                                            │
│  └──────────────────────┘                                            │
│                                                                      │
│                         PostgreSQL                                   │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Ticket ──1:N──► TicketMessage ──1:N──► MessageAttachment       │  │
│  │ ResolverConfig (quién resuelve qué categoría)                  │  │
│  │ TelegramLinkage (tracking de vinculación)                      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│                   Telegram                                           │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Grupo "Soporte Técnico"  ──► topic por ticket                  │  │
│  │ Grupo "Soporte Operativo" ──► topic por ticket                 │  │
│  │ DM al usuario ──► notificaciones + canal alternativo           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│                     MinIO                                            │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Bucket: helpdesk-attachments                                   │  │
│  │ Imágenes, audio, video, documentos de los mensajes             │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Flujos principales

### Flujo 1: Usuario crea ticket desde la plataforma

```
Usuario abre Mesa de Ayuda
    │
    ▼
Selecciona categoría (Técnica / Operativa)
    │
    ▼
Selecciona subcategoría (Error / Duda / Sugerencia / Reglas de negocio)
    │
    ▼
Escribe asunto + primer mensaje (puede adjuntar archivos)
    │
    ▼
Se asigna prioridad (Baja / Normal / Alta)
    │
    ▼
POST /api/helpdesk/tickets → crea ticket + primer mensaje
    │
    ├──► Guardar en DB (estado OPEN)
    ├──► Subir adjuntos a MinIO
    ├──► Bot crea topic en grupo de Telegram correspondiente
    │      (título: "#042 [Error] Asunto del ticket")
    │      (envía primer mensaje + adjuntos al topic)
    └──► Retorna ticket al frontend → abre vista de chat
```

### Flujo 2: Resolver responde desde Telegram

```
Resolver escribe en el topic del ticket (texto o media)
    │
    ▼
Bot recibe el mensaje (webhook/polling)
    │
    ▼
Bot identifica el ticket por el topic ID
    │
    ├──► Persiste mensaje en DB (senderType: RESOLVER)
    ├──► Si hay media: descarga de Telegram → sube a MinIO
    ├──► Emite Socket.IO al usuario (evento "ticketMessage")
    ├──► Crea InternalNotification para el usuario
    └──► Si el usuario tiene Telegram vinculado y NO está online:
              Bot le envía DM con la respuesta
```

### Flujo 3: Usuario contacta desde Telegram (DM al bot)

```
Usuario envía mensaje al bot por DM
    │
    ▼
Bot busca telegramUserId en DB
    │
    ├── No encontrado ──► "No tenés cuenta vinculada.
    │                      Ingresá tu username en tu perfil
    │                      de la plataforma."
    │
    ├── Encontrado, sin tickets abiertos ──► Inicia flujo nuevo:
    │     Bot pregunta: "¿Técnica o Operativa?"
    │     Bot pregunta subcategoría
    │     Bot pide asunto
    │     Crea ticket + topic en grupo
    │
    └── Encontrado, con tickets abiertos ──► Bot muestra lista:
          "Tenés tickets abiertos:
           #042 - Error en carga de documentos
           #039 - Duda sobre reglas de negocio
           ¿Querés continuar uno de estos o abrir nuevo?"
          Usuario elige → mensaje se agrega al ticket
                          o se inicia flujo nuevo
```

### Flujo 4: Vinculación de Telegram

```
Usuario (plataforma)                         Bot (Telegram)
    │                                            │
    ▼                                            │
Ingresa @username en                             │
su perfil / registro                             │
    │                                            │
    ▼                                            │
Se guarda User.telegramUsername                   │
(telegramUserId queda null)                      │
    │                                            │
    ·· tiempo después ··                         │
    │                                            │
    │                                            ▼
    │                              Usuario le escribe al bot
    │                                            │
    │                                            ▼
    │                              Bot lee message.from.username
    │                              Busca en DB por telegramUsername
    │                                            │
    │                                    ┌───────┴────────┐
    │                                 Match             No match
    │                                    │                 │
    │                                    ▼                 ▼
    │                           Guarda              "Username no
    │                           telegramUserId       registrado.
    │                           (numérico,           Registralo
    │                            inmutable)          en tu perfil."
    │                                    │
    │                                    ▼
    │                           "¡Cuenta vinculada!
    │                            Podés usar este chat
    │                            para soporte."
```

### Flujo 5: Cierre de ticket

```
                    ┌── Usuario cierra desde plataforma
                    │     (botón "Cerrar ticket")
                    │
Cierre ◄────────────┤── Resolver cierra desde Telegram
                    │     (comando /resolver en el topic)
                    │
                    └── Auto-cierre
                          (72hs sin actividad tras estado RESOLVED)

Al cerrar:
  ├── Estado → CLOSED
  ├── Bot envía mensaje al topic: "Ticket #042 cerrado"
  ├── Bot envía DM al usuario (si vinculado): "Tu ticket #042 fue cerrado"
  ├── InternalNotification al usuario
  └── Si auto-cierre: mensaje de sistema en el chat
```

---

## Modelo de datos

### Ubicación del schema

`apps/helpdesk/src/prisma/schema.prisma`

### Enums

```
TicketCategory
  TECHNICAL
  OPERATIONAL

TicketSubcategory
  ERROR
  DOUBT
  SUGGESTION
  BUSINESS_RULE

TicketStatus
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED

TicketPriority
  LOW
  NORMAL
  HIGH

MessageSenderType
  USER
  RESOLVER
  SYSTEM

AttachmentType
  IMAGE
  AUDIO
  VIDEO
  DOCUMENT
```

### Modelo `Ticket`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String (cuid) | PK |
| `number` | Int (autoincrement) | Número secuencial global (#001, #002...) |
| `category` | TicketCategory | Técnica / Operativa |
| `subcategory` | TicketSubcategory | Error / Duda / Sugerencia / Regla de negocio |
| `subject` | String (max 200) | Asunto breve |
| `status` | TicketStatus | OPEN / IN_PROGRESS / RESOLVED / CLOSED |
| `priority` | TicketPriority | LOW / NORMAL / HIGH |
| `confirmedPriority` | TicketPriority? | Prioridad confirmada/ajustada por el resolver |
| `createdBy` | Int | userId del creador |
| `createdByName` | String | Nombre del usuario (desnormalizado para Telegram) |
| `assignedTo` | String? | Identificador del resolver asignado |
| `telegramTopicId` | Int? | ID del topic en el grupo de Telegram |
| `telegramGroupId` | String? | ID del grupo (Técnico u Operativo) |
| `source` | String | `platform` o `telegram` (de dónde se creó) |
| `resolvedAt` | DateTime? | Cuándo se marcó como resuelto |
| `closedAt` | DateTime? | Cuándo se cerró |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

Relación: `Ticket` 1:N `TicketMessage`

### Modelo `TicketMessage`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String (cuid) | PK |
| `ticketId` | String (FK) | FK a Ticket |
| `senderType` | MessageSenderType | USER / RESOLVER / SYSTEM |
| `senderId` | String | userId (para USER) o telegramUserId (para RESOLVER) |
| `senderName` | String | Nombre visible del emisor |
| `content` | Text? | Contenido de texto (nullable si es solo adjunto) |
| `telegramMessageId` | Int? | ID del mensaje en Telegram (para tracking) |
| `createdAt` | DateTime | Auto |

Relación: `TicketMessage` 1:N `MessageAttachment`

### Modelo `MessageAttachment`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String (cuid) | PK |
| `messageId` | String (FK) | FK a TicketMessage |
| `type` | AttachmentType | IMAGE / AUDIO / VIDEO / DOCUMENT |
| `filename` | String | Nombre original del archivo |
| `mimeType` | String | Tipo MIME |
| `size` | Int | Tamaño en bytes |
| `minioKey` | String | Key del objeto en MinIO |
| `minioUrl` | String? | Presigned URL (generada on-demand) |
| `createdAt` | DateTime | Auto |

### Modelo `ResolverConfig`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String (cuid) | PK |
| `category` | TicketCategory | TECHNICAL / OPERATIONAL |
| `telegramGroupId` | String | ID del grupo de Telegram para esta categoría |
| `telegramGroupName` | String | Nombre del grupo (para UI admin) |
| `resolverNames` | String[] | Nombres de los resolvedores (para display) |
| `isActive` | Boolean | Si está activa esta configuración |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

### Modelo `HelpdeskConfig`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String (cuid) | PK |
| `key` | String (unique) | Clave de configuración |
| `value` | Json | Valor (ej: `autoCloseHours: 72`, `botToken: "..."`) |
| `updatedAt` | DateTime | Auto |

### Modificación en schema del backend

Agregar a `User` (en `apps/backend/prisma/schema.prisma`):

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `telegramUsername` | String? | Username de Telegram (ej: `juanperez`, sin @) |
| `telegramUserId` | BigInt? | ID numérico, resuelto por el bot automáticamente |
| `telegramLinkedAt` | DateTime? | Cuándo se vinculó (cuando el bot resolvió el ID) |

---

## Fases de implementación

### Fase 1 — Infraestructura del microservicio

**Crear `apps/helpdesk`** con la estructura base:

```
apps/helpdesk/
├── src/
│   ├── app.ts                    # Express app
│   ├── server.ts                 # Entry point
│   ├── config/
│   │   ├── auth.ts               # JWT validation (RS256)
│   │   ├── minio.ts              # MinIO client
│   │   ├── redis.ts              # Redis/BullMQ connection
│   │   └── telegram.ts           # grammY bot config
│   ├── prisma/
│   │   └── schema.prisma
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── workers/
│   └── bot/
│       ├── index.ts              # Bot setup y handlers
│       ├── handlers/
│       │   ├── dm.handler.ts     # Mensajes directos de usuarios
│       │   ├── group.handler.ts  # Mensajes en topics de grupos
│       │   └── commands.handler.ts  # /resolver, /prioridad, etc.
│       └── middleware/
│           └── identify.ts       # Identificar usuario por telegramUserId
├── prisma/
│   └── migrations/
├── package.json
├── tsconfig.json
├── Dockerfile
└── .env.example
```

**Dependencias principales:**
- `express`, `prisma`, `@prisma/client`
- `grammy` (bot de Telegram)
- `minio` (storage)
- `bullmq`, `ioredis` (colas)
- `socket.io` (real-time)
- `jsonwebtoken` (validación JWT)
- `multer` (uploads)
- `zod` (validación)

**Configurar:**
- Schema Prisma con todos los modelos
- Migración inicial
- Dockerfile
- Entry en `docker-compose.yml`
- Bucket MinIO `helpdesk-attachments`

### Fase 2 — Campo Telegram en usuarios (backend principal)

**Modificar** `apps/backend/prisma/schema.prisma`:
- Agregar `telegramUsername`, `telegramUserId`, `telegramLinkedAt` a `User`
- Generar migración

**Modificar/crear endpoints**:
- `PATCH /api/usuarios/:id` debe aceptar `telegramUsername`
- Si existe endpoint de registro, agregar el campo ahí también
- El campo se normaliza (se quita el `@` si lo incluye, se pasa a lowercase)

**Frontend**:
- Agregar campo "Username de Telegram" en el formulario de perfil de usuario
- Agregar campo en el formulario de registro/creación de usuario (admin)
- Placeholder: `Ej: juanperez (sin @)`

**Se ejecuta en paralelo con Fase 1.**

### Fase 3 — Bot de Telegram (grammY)

**Ubicación**: `apps/helpdesk/src/bot/`

**Setup del bot:**
- Token desde variable de entorno `TELEGRAM_BOT_TOKEN`
- Modo: webhook en producción, polling en desarrollo
- Registrar handlers para DM y para grupos

**Handlers:**

#### 3.1 Handler de DM (`dm.handler.ts`)

Maneja mensajes directos de usuarios al bot:

1. **Identificación**: lee `ctx.from.username`, busca en DB por `telegramUsername`
   - Si no encuentra: responde "Tu username no está registrado en la plataforma. Pedile al administrador que lo agregue en tu perfil."
   - Si encuentra y `telegramUserId` es null: guarda `ctx.from.id` como `telegramUserId`, marca `telegramLinkedAt`
2. **Sin tickets abiertos**: inicia flujo conversacional:
   - Pregunta categoría (botones inline: Técnica / Operativa)
   - Pregunta subcategoría (botones según categoría)
   - Pide asunto (texto libre)
   - Pide prioridad (botones: Baja / Normal / Alta)
   - Crea ticket + topic en grupo correspondiente
   - Responde: "Ticket #042 creado. Te avisaré cuando haya respuesta."
3. **Con tickets abiertos**: muestra lista con botones inline:
   - Un botón por ticket abierto (ej: "#042 - Error en carga")
   - Botón "Abrir nuevo ticket"
   - Al elegir ticket existente, los mensajes subsiguientes se agregan a ese ticket
4. **Media**: si el usuario envía foto/audio/video/documento, se descarga de Telegram, se sube a MinIO, se agrega como adjunto al mensaje

#### 3.2 Handler de grupo (`group.handler.ts`)

Maneja mensajes de resolvedores en los topics de los grupos:

1. **Identificación**: lee `ctx.message.message_thread_id` (topic ID), busca ticket por `telegramTopicId`
   - Si no encuentra ticket: ignora (puede ser un topic manual no relacionado)
2. **Mensaje del resolver**: persiste como `TicketMessage` con `senderType: RESOLVER`
3. **Media del resolver**: descarga de Telegram → MinIO → adjunto del mensaje
4. **Notificación al usuario**:
   - Emite Socket.IO al `user_{userId}`
   - Crea `InternalNotification`
   - Si usuario tiene Telegram vinculado y no está online: DM al usuario

#### 3.3 Handler de comandos (`commands.handler.ts`)

Comandos disponibles en los topics de grupo (para resolvedores):

| Comando | Acción |
|---------|--------|
| `/resolver` | Marca ticket como RESOLVED. Notifica al usuario |
| `/prioridad alta` | Cambia confirmedPriority a HIGH |
| `/prioridad normal` | Cambia confirmedPriority a NORMAL |
| `/prioridad baja` | Cambia confirmedPriority a LOW |
| `/asignar` | El resolver se auto-asigna el ticket |
| `/info` | Muestra datos del ticket (usuario, categoría, fecha, estado) |

### Fase 4 — Servicios del backend helpdesk

#### 4.1 `ticket.service.ts`

| Método | Descripción |
|--------|-------------|
| `create(data)` | Crea ticket + primer mensaje + topic en Telegram + notifica |
| `getByUser(userId, filters)` | Lista tickets del usuario con paginación |
| `getById(ticketId)` | Detalle del ticket con mensajes y adjuntos |
| `updateStatus(ticketId, status)` | Cambia estado (validar transiciones válidas) |
| `close(ticketId, closedBy)` | Cierra ticket, notifica, envía mensaje al topic |
| `resolve(ticketId, resolvedBy)` | Marca como resuelto, inicia timer de auto-cierre |
| `reopen(ticketId, userId)` | Reabre ticket cerrado/resuelto |
| `listAll(filters)` | Para admin: todos los tickets con filtros |
| `getStats()` | Métricas: abiertos, resueltos, tiempo promedio, por categoría |

#### 4.2 `message.service.ts`

| Método | Descripción |
|--------|-------------|
| `create(ticketId, data)` | Crea mensaje + maneja adjuntos + notifica |
| `getByTicket(ticketId, pagination)` | Lista mensajes del ticket con adjuntos |
| `forwardToTelegram(message)` | Envía mensaje + media al topic correspondiente |
| `forwardFromTelegram(telegramMsg)` | Persiste mensaje de Telegram en DB |

#### 4.3 `attachment.service.ts`

| Método | Descripción |
|--------|-------------|
| `upload(file)` | Multer buffer → MinIO → retorna attachment data |
| `downloadFromTelegram(fileId)` | Descarga file de Telegram API → MinIO |
| `getPresignedUrl(minioKey)` | Genera URL temporal para descarga |
| `validateFile(file)` | Valida tipo y tamaño |

Límites de archivos:
- Imágenes: max 10MB
- Audio: max 25MB
- Video: max 50MB
- Documentos: max 25MB

#### 4.4 `resolver-config.service.ts`

| Método | Descripción |
|--------|-------------|
| `getByCategory(category)` | Config de resolvedores para una categoría |
| `update(category, config)` | Actualiza grupo y resolvedores de una categoría |
| `list()` | Lista todas las configuraciones |

### Fase 5 — Rutas y controllers

#### Endpoints de tickets (usuario autenticado)

| Método | Ruta | Acción |
|--------|------|--------|
| `POST` | `/api/helpdesk/tickets` | Crear ticket |
| `GET` | `/api/helpdesk/tickets` | Mis tickets (con filtros y paginación) |
| `GET` | `/api/helpdesk/tickets/:id` | Detalle del ticket |
| `PATCH` | `/api/helpdesk/tickets/:id/close` | Cerrar ticket |
| `PATCH` | `/api/helpdesk/tickets/:id/reopen` | Reabrir ticket |

#### Endpoints de mensajes (usuario autenticado)

| Método | Ruta | Acción |
|--------|------|--------|
| `POST` | `/api/helpdesk/tickets/:id/messages` | Enviar mensaje (con adjuntos) |
| `GET` | `/api/helpdesk/tickets/:id/messages` | Lista de mensajes del ticket |

#### Endpoints de adjuntos

| Método | Ruta | Acción |
|--------|------|--------|
| `GET` | `/api/helpdesk/attachments/:id/download` | Descargar adjunto (presigned URL) |

#### Endpoints admin (ADMIN / SUPERADMIN)

| Método | Ruta | Acción |
|--------|------|--------|
| `GET` | `/api/helpdesk/admin/tickets` | Todos los tickets (filtros, paginación) |
| `GET` | `/api/helpdesk/admin/tickets/:id` | Detalle con info de resolver |
| `GET` | `/api/helpdesk/admin/stats` | Estadísticas |
| `GET` | `/api/helpdesk/admin/config` | Config de resolvedores |
| `PUT` | `/api/helpdesk/admin/config/:category` | Actualizar config de categoría |

#### Registrar en app

```
app.use('/api/helpdesk/tickets', authenticate, ticketRoutes);
app.use('/api/helpdesk/attachments', authenticate, attachmentRoutes);
app.use('/api/helpdesk/admin', authenticate, isAdmin, adminRoutes);
```

### Fase 6 — Socket.IO y notificaciones

#### Socket.IO (nuevo servidor en helpdesk)

**Eventos emitidos al usuario:**

| Evento | Cuándo | Payload |
|--------|--------|---------|
| `ticketMessage` | Nuevo mensaje en su ticket | `{ ticketId, message }` |
| `ticketStatusChange` | Cambio de estado | `{ ticketId, status, changedBy }` |
| `ticketPriorityChange` | Resolver ajusta prioridad | `{ ticketId, priority }` |

**Rooms**: `user_{userId}` (reutiliza el patrón existente)

**Auth**: JWT en handshake (mismo patrón que documentos)

#### InternalNotification

Crear `InternalNotification` en el schema de documentos (cross-service) o en el schema de helpdesk con los tipos:

- `HELPDESK_NEW_RESPONSE` — resolver respondió
- `HELPDESK_TICKET_RESOLVED` — ticket marcado como resuelto
- `HELPDESK_TICKET_CLOSED` — ticket cerrado (auto-cierre o manual)

#### Telegram DM

El bot envía DM al usuario cuando:
- Hay una respuesta de un resolver y el usuario NO está conectado por Socket.IO
- El ticket cambia de estado (resuelto, cerrado)

### Fase 7 — Workers BullMQ

#### 7.1 Worker de auto-cierre

- **Queue**: `helpdesk-autoclose`
- **Schedule**: corre cada hora (repeatable job)
- **Lógica**: busca tickets con `status = RESOLVED` y `resolvedAt < now() - 72h`
  - Cambia estado a CLOSED
  - Agrega mensaje de sistema: "Ticket cerrado automáticamente por inactividad"
  - Envía mensaje al topic de Telegram
  - Notifica al usuario (InternalNotification + Telegram DM)

#### 7.2 Worker de media

- **Queue**: `helpdesk-media`
- **Jobs**:
  - `upload-to-telegram`: sube archivo de MinIO a Telegram (al crear mensaje desde plataforma)
  - `download-from-telegram`: descarga archivo de Telegram y sube a MinIO (al recibir mensaje de resolver)
- Procesamiento asíncrono para no bloquear el flujo del chat

### Fase 8 — Frontend: vista de usuario

#### 8.1 Sección "Mesa de Ayuda"

**Ruta**: `/helpdesk` (accesible para todos los roles autenticados)

**Componentes:**

- **`HelpdeskPage`**: layout principal con lista de tickets y acceso a crear nuevo
- **`TicketList`**: tabla/lista de tickets del usuario
  - Columnas: #, Asunto, Categoría, Prioridad (badge), Estado (badge), Último mensaje, Fecha
  - Filtros: por estado, por categoría
  - Click en ticket → abre chat
- **`CreateTicketModal`**: modal para crear nuevo ticket
  - Categoría (radio: Técnica / Operativa)
  - Subcategoría (select dinámico según categoría)
  - Asunto (input, max 200 chars)
  - Prioridad (select: Baja / Normal / Alta)
  - Primer mensaje (textarea)
  - Adjuntos (drag & drop + file picker, multi-archivo)
  - Botón "Enviar"

#### 8.2 Chat del ticket

**Ruta**: `/helpdesk/tickets/:id`

**Componente `TicketChat`**:

- **Header**: número del ticket, asunto, estado (badge), prioridad, categoría
  - Botón "Cerrar ticket" (si está OPEN o IN_PROGRESS)
  - Botón "Reabrir" (si está RESOLVED o CLOSED)
- **Área de mensajes**: scroll vertical, mensajes tipo chat
  - Mensajes del usuario: alineados a la derecha, color primario
  - Mensajes del resolver: alineados a la izquierda, color neutro
  - Mensajes de sistema: centrados, texto gris (ej: "Ticket marcado como resuelto")
  - Cada mensaje muestra: nombre del emisor, texto, adjuntos renderizados, timestamp
  - Adjuntos inline:
    - Imágenes: thumbnail clickeable (abre en modal/lightbox)
    - Audio: reproductor HTML5 inline
    - Video: reproductor HTML5 inline
    - Documentos: ícono + nombre + botón descargar
- **Input de mensaje** (barra inferior fija):
  - Textarea autoexpandible
  - Botón adjuntar (abre file picker, acepta imagen/audio/video/documento)
  - Botón enviar
  - Preview de adjuntos seleccionados antes de enviar
- **Real-time**: listener Socket.IO `ticketMessage` para mensajes entrantes en tiempo real

#### 8.3 RTK Query endpoints

Agregar a un nuevo `helpdeskApiSlice`:

- `createTicket(data)` → `POST /api/helpdesk/tickets`
- `getMyTickets(filters)` → `GET /api/helpdesk/tickets`
- `getTicket(id)` → `GET /api/helpdesk/tickets/:id`
- `closeTicket(id)` → `PATCH /api/helpdesk/tickets/:id/close`
- `reopenTicket(id)` → `PATCH /api/helpdesk/tickets/:id/reopen`
- `sendMessage(ticketId, data)` → `POST /api/helpdesk/tickets/:id/messages`
- `getMessages(ticketId, pagination)` → `GET /api/helpdesk/tickets/:id/messages`
- `downloadAttachment(id)` → `GET /api/helpdesk/attachments/:id/download`

### Fase 9 — Frontend: panel admin helpdesk

#### 9.1 Ruta

`/admin/helpdesk` — accesible para `SUPERADMIN` y `ADMIN`.

#### 9.2 Vistas

**Dashboard de soporte:**
- Métricas: tickets abiertos, en progreso, resueltos hoy, tiempo promedio de respuesta
- Gráfico por categoría
- Tickets recientes

**Lista de todos los tickets:**
- Tabla completa con filtros avanzados (estado, categoría, prioridad, fecha, usuario)
- Vista de detalle (misma que el chat, pero en modo lectura para el admin)

**Configuración de resolvedores:**
- Por cada categoría (Técnica / Operativa):
  - ID del grupo de Telegram
  - Nombre del grupo (display)
  - Lista de resolvedores (nombres, para referencia)
  - Toggle activo/inactivo

**Configuración general:**
- Token del bot (enmascarado)
- Horas para auto-cierre (default 72)
- Límites de tamaño de archivo

### Fase 10 — Integración con routing y layout existente

**Agregar al router principal del frontend:**
- `/helpdesk` → `HelpdeskPage` (todos los roles)
- `/helpdesk/tickets/:id` → `TicketChat` (todos los roles)
- `/admin/helpdesk` → `AdminHelpdeskPage` (ADMIN+)

**Agregar al Sidebar:**
- Ícono de "Mesa de Ayuda" visible para todos los roles
- Badge con número de tickets con respuestas no leídas

**Agregar a la config de Nginx:**
- Proxy para `/api/helpdesk/` al microservicio helpdesk
- Proxy para `/helpdesk-socket.io/` para WebSocket del helpdesk

**Agregar a docker-compose:**
- Servicio `helpdesk` con su Dockerfile, puertos, variables de entorno
- Conexión a PostgreSQL, Redis, MinIO (mismas instancias)

### Fase 11 — Tests

#### Backend

| Qué | Tipo | Prioridad |
|-----|------|-----------|
| `ticket.service.ts` — CRUD + transiciones de estado | Unit | Alta |
| `message.service.ts` — crear con adjuntos + forward | Unit | Alta |
| `attachment.service.ts` — upload + presigned URL | Unit | Alta |
| Bot DM handler — identificación + flujo conversacional | Unit | Alta |
| Bot group handler — captura mensaje + forward a DB | Unit | Alta |
| Bot commands — /resolver, /prioridad, /info | Unit | Media |
| Worker auto-cierre — encuentra y cierra tickets vencidos | Unit | Alta |
| Endpoints — flujo completo crear → mensaje → cerrar | Integration | Alta |
| Permisos — usuario solo ve sus tickets | Integration | Alta |
| Vinculación Telegram — username → userId | Integration | Media |

#### Frontend

| Qué | Tipo | Prioridad |
|-----|------|-----------|
| `TicketChat` — renderiza mensajes y adjuntos | Unit | Alta |
| `CreateTicketModal` — validación de formulario | Unit | Media |
| `TicketList` — filtros y estados | Unit | Media |
| Flujo completo — crear ticket + enviar mensaje | E2E | Alta |

---

## Orden de ejecución

```
Fase 1 (infra) ────┐
                    ├──► Fase 3 (bot) ──► Fase 4 (services) ──► Fase 5 (routes) ──► Fase 6 (socket/notif)
Fase 2 (telegram    │                                                                        │
       en users) ──┘                                                                         │
                                                                                              │
                                                        Fase 7 (workers) ◄────────────────────┤
                                                                                              │
                                                        Fase 8 (frontend user) ◄──────────────┤
                                                                                              │
                                                        Fase 9 (frontend admin) ◄─────────────┤
                                                                                              │
                                                        Fase 10 (integración) ◄───────────────┘
                                                                                              │
                                                        Fase 11 (tests) ◄─────────────────────┘
```

- **Fases 1 y 2**: en paralelo (microservicio + campo telegram en usuarios)
- **Fases 3 → 6**: secuenciales (bot → services → routes → socket)
- **Fases 7, 8, 9, 10**: pueden avanzar en paralelo una vez que el backend está listo
- **Fase 11**: tests a medida que se completa cada pieza

---

## Archivos a crear

### Nuevo microservicio `apps/helpdesk/`

| Archivo | Fase |
|---------|------|
| `src/app.ts` | 1 |
| `src/server.ts` | 1 |
| `src/config/auth.ts` | 1 |
| `src/config/minio.ts` | 1 |
| `src/config/redis.ts` | 1 |
| `src/config/telegram.ts` | 1 |
| `src/prisma/schema.prisma` | 1 |
| `src/bot/index.ts` | 3 |
| `src/bot/handlers/dm.handler.ts` | 3 |
| `src/bot/handlers/group.handler.ts` | 3 |
| `src/bot/handlers/commands.handler.ts` | 3 |
| `src/bot/middleware/identify.ts` | 3 |
| `src/services/ticket.service.ts` | 4 |
| `src/services/message.service.ts` | 4 |
| `src/services/attachment.service.ts` | 4 |
| `src/services/resolver-config.service.ts` | 4 |
| `src/services/websocket.service.ts` | 6 |
| `src/routes/ticket.routes.ts` | 5 |
| `src/routes/message.routes.ts` | 5 |
| `src/routes/attachment.routes.ts` | 5 |
| `src/routes/admin.routes.ts` | 5 |
| `src/controllers/ticket.controller.ts` | 5 |
| `src/controllers/message.controller.ts` | 5 |
| `src/controllers/attachment.controller.ts` | 5 |
| `src/controllers/admin.controller.ts` | 5 |
| `src/workers/autoclose.worker.ts` | 7 |
| `src/workers/media.worker.ts` | 7 |
| `package.json` | 1 |
| `tsconfig.json` | 1 |
| `Dockerfile` | 1 |
| `.env.example` | 1 |

### Frontend (en `apps/frontend/src/`)

| Archivo | Fase |
|---------|------|
| `features/helpdesk/HelpdeskPage.tsx` | 8 |
| `features/helpdesk/TicketList.tsx` | 8 |
| `features/helpdesk/TicketChat.tsx` | 8 |
| `features/helpdesk/CreateTicketModal.tsx` | 8 |
| `features/helpdesk/components/MessageBubble.tsx` | 8 |
| `features/helpdesk/components/AttachmentPreview.tsx` | 8 |
| `features/helpdesk/components/AttachmentInput.tsx` | 8 |
| `features/admin/helpdesk/AdminHelpdeskPage.tsx` | 9 |
| `features/admin/helpdesk/HelpdeskStats.tsx` | 9 |
| `features/admin/helpdesk/ResolverConfigPage.tsx` | 9 |
| `services/helpdeskApiSlice.ts` | 8 |
| `services/helpdeskWebsocket.service.ts` | 8 |

### Archivos a modificar

| Archivo | Cambio | Fase |
|---------|--------|------|
| `apps/backend/prisma/schema.prisma` | Agregar campos telegram a User | 2 |
| `apps/backend/src/` (controller/service de usuarios) | Aceptar telegramUsername en update/create | 2 |
| `apps/frontend/src/` (formulario perfil/usuario) | Campo Telegram username | 2 |
| `apps/frontend/src/` (router principal) | Rutas /helpdesk y /admin/helpdesk | 10 |
| `apps/frontend/src/components/Sidebar.tsx` | Entrada "Mesa de Ayuda" | 10 |
| `apps/frontend/src/services/` (store config) | Registrar helpdeskApiSlice | 8 |
| `deploy/stack-iplan/vm1/nginx/conf.d/bca.conf` | Proxy para helpdesk API y socket | 10 |
| `deploy/stack-iplan/vm1/docker-compose.yml` (o vm correspondiente) | Servicio helpdesk | 10 |
| `package.json` (root) | Agregar workspace apps/helpdesk | 1 |
| `turbo.json` | Agregar pipeline para helpdesk | 1 |

---

## Variables de entorno (`apps/helpdesk/.env.example`)

```
# Server
PORT=4803
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/helpdesk

# JWT (mismas keys que backend principal)
JWT_PUBLIC_KEY_PATH=/path/to/public.pem

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_TECHNICAL_GROUP_ID=
TELEGRAM_OPERATIONAL_GROUP_ID=

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=helpdesk-attachments
MINIO_USE_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Backend API (para resolver usuarios)
BACKEND_API_URL=http://localhost:4801

# Auto-cierre
AUTO_CLOSE_HOURS=72

# Límites de archivo (bytes)
MAX_IMAGE_SIZE=10485760
MAX_AUDIO_SIZE=26214400
MAX_VIDEO_SIZE=52428800
MAX_DOCUMENT_SIZE=26214400
```
