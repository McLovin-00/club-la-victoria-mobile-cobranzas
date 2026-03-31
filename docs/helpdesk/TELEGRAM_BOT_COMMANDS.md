# Telegram Bot - Helpdesk Commands

## Overview

The Helpdesk Telegram bot provides a direct communication channel between users and support staff.

## User Commands

### First Contact - Account Linking

**Bot Response**:
```
👋 Bienvenido al soporte de mesa de ayuda.

Para poder atenderte, necesitamos vincular tu cuenta.

Ingresa tu username de Telegram sin el @ (ej: juanperez):
```

**User Action**: Send your Telegram username

**Bot Response** (after linking):
```
✅ ¡Cuenta vinculada correctamente!

Ahora podés:
• Abrir tickets desde aquí
• Comunicarte directamente con soporte
• Recibir notificaciones

Escribe tu consulta o crea un ticket nuevo.
```

### Create New Ticket

**User Action**: Message the bot

**Bot Flow**:
1. Ask for category (Técnica/Operativa)
2. Ask for subcategory (Error/Duda/Sugerencia/Reglas)
3. Ask for subject
4. Ask for message description
5. Create ticket and return ticket number

**Example**:
```
User: Hola necesito ayuda con mi cuenta

Bot: Selecciona la categoría:
1️⃣ Técnica
2️⃣ Operativa

User: 1

Bot: Selecciona la subcategoría:
1️⃣ Error
2️⃣ Duda
3️⃣ Sugerencia
4️⃣ Reglas de negocio

User: 1

Bot: Ingresa el asunto:
Ej: Error en carga de documentos PDF

User: Error en login

Bot: Ingresa tu consulta:
```

User sends message -> Bot creates ticket and returns:
```
✅ Ticket #042 creado

Número de ticket: #042
Asunto: Error en login

Te avisaré cuando haya una respuesta.
```

### List Open Tickets

**Command**: `/mis_tickets`

**Response**: Shows list of open tickets with option to continue with one or create new

### Continue with Existing Ticket

**Command**: `/continuar`

Saves context and allows continuing in the same chat session

## Resolver Commands

### In Ticket Topics (Group Commands)

#### `/resolver`

Marks ticket as RESOLVED and notifies user

#### `/info`

Shows ticket details:
- User info
- Status
- Category
- Subcategory
- Priority
- Created date

#### `/prioridad alta`

Changes priority to HIGH

#### `/prioridad normal`

Changes priority to NORMAL

#### `/prioridad baja`

Changes priority to LOW

#### `/asignar`

Self-assigns ticket to current resolver

## Telegram Groups

### Technical Support

- **Purpose**: Technical issues
- **Group ID**: -1001234567890
- **Subtopics**: One per ticket

### Operational Support

- **Purpose**: Operational issues
- **Group ID**: -1001234567891
- **Subtopics**: One per ticket

## Ticket Numbering

- Format: #4 digits (e.g., #001, #042, #999)
- Type: Global sequential
- Unique: Yes

## Media Support

- Images: Max 10MB (JPEG, PNG, GIF)
- Audio: Max 25MB (MP3, WAV, M4A)
- Video: Max 50MB (MP4, MOV, AVI)
- Documents: Max 25MB (PDF, DOC, DOCX, etc.)

All files stored in MinIO bucket `helpdesk-attachments`

## Auto-Close Feature

Tickets automatically close after 72 hours of inactivity if status is RESOLVED.

Scheduler runs every hour and checks:
- Status = RESOLVED
- Last message > 72 hours ago

## Best Practices

### For Users

1. Include username when creating tickets
2. Be specific in descriptions
3. Attach relevant media
4. Check for replies in chat

### For Resolvers

1. Use `/resolver` to mark tickets as resolved
2. Use `/info` before responding
3. Use `/asignar` when working on tickets
4. Use `/prioridad` to adjust priority
5. Always add status messages when closing

