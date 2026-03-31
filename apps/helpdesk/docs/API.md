# Helpdesk API Documentation

## Base URL

- Development: http://localhost:4803
- Production: https://bca.microsyst.com.ar/api/helpdesk

## Authentication

All endpoints require JWT via Authorization header: `Bearer <token>`

## Endpoints

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Basic health check |
| GET | /health/ready | Full health with dependencies |

### Tickets

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/helpdesk/tickets | Create ticket |
| GET | /api/helpdesk/tickets | List user tickets |
| GET | /api/helpdesk/tickets/:id | Get ticket by ID |
| PATCH | /api/helpdesk/tickets/:id/close | Close ticket |
| PATCH | /api/helpdesk/tickets/:id/reopen | Reopen ticket |

### Messages

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/helpdesk/tickets/:ticketId/messages | Add message (supports multipart `attachments[]`) |
| GET | /api/helpdesk/tickets/:ticketId/messages | List messages |

### Attachments

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/helpdesk/attachments/:id/download | Get presigned URL |

### Admin (requires ADMIN role)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/helpdesk/admin/tickets | List all tickets |
| GET | /api/helpdesk/admin/stats | Get statistics |
| GET | /api/helpdesk/admin/config | Get resolver configs |

## WebSocket

Connect to: ws://localhost:4803 or /helpdesk-socket/ via nginx

Events: ticket:message, ticket:status, ticket:priority

## Telegram Bot

Commands (users): `/start`, `/ayuda`, `/nuevo`, `/mis_tickets`, `/info`  
Commands (resolver in grupo/topic): `/resolver`, `/prioridad`, `/asignar`, `/cerrar`, `/info`

Media soportada en Telegram:
- DM de usuario al crear ticket: foto, audio, video, documento.
- Grupo/topic de resolvers: foto, audio, video, documento.
- Cuando un resolver envía adjunto en el tópico, el creador del ticket recibe en su DM un aviso en texto y el archivo reenviado (`copyMessage`) para verlo en Telegram.

## Error Codes

- 401 UNAUTHORIZED - Invalid JWT
- 403 FORBIDDEN - Insufficient permissions
- 404 NOT_FOUND - Resource not found
