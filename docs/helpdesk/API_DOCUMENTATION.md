# Helpdesk System - API Documentation

## Base URL

```
https://api.microsyst.com.ar/api/helpdesk/
```

## Authentication

All API requests require JWT authentication via Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Health Check

Check service health.

**Endpoint**: `GET /health`

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2025-03-18T20:00:00.000Z"
}
```

**Endpoint**: `GET /health/ready`

Check if all dependencies (database, Redis, MinIO) are healthy.

**Response** (200 OK):
```json
{
  "status": "ready",
  "database": "connected",
  "redis": "connected",
  "minio": "connected"
}
```

---

### 2. Ticket Management

#### Create Ticket

Create a new helpdesk ticket.

**Endpoint**: `POST /tickets`

**Request Body**:
```json
{
  "category": "TECHNICAL",
  "subcategory": "ERROR",
  "subject": "Error en carga de documentos",
  "priority": "NORMAL",
  "message": {
    "content": "No puedo cargar documentos PDF al sistema",
    "attachments": []
  }
}
```

**Response** (201 Created):
```json
{
  "id": "clv7abc123def456",
  "number": 42,
  "category": "TECHNICAL",
  "subcategory": "ERROR",
  "subject": "Error en carga de documentos",
  "status": "OPEN",
  "priority": "NORMAL",
  "createdBy": 123,
  "createdByName": "Juan Perez",
  "createdAt": "2025-03-18T20:00:00.000Z",
  "telegramTopicId": 42
}
```

#### List My Tickets

Get all tickets created by the authenticated user.

**Endpoint**: `GET /tickets`

**Query Parameters**:
- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `status` (optional): OPEN, IN_PROGRESS, RESOLVED, CLOSED
- `category` (optional): TECHNICAL, OPERATIONAL

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "clv7abc123def456",
      "number": 42,
      "category": "TECHNICAL",
      "subcategory": "ERROR",
      "subject": "Error en carga de documentos",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "createdAt": "2025-03-18T20:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

#### Get Ticket Details

Get full details of a specific ticket including all messages.

**Endpoint**: `GET /tickets/:id`

**Response** (200 OK):
```json
{
  "id": "clv7abc123def456",
  "number": 42,
  "category": "TECHNICAL",
  "subcategory": "ERROR",
  "subject": "Error en carga de documentos",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "confirmedPriority": "HIGH",
  "assignedTo": "resolver123",
  "source": "platform",
  "telegramTopicId": 42,
  "createdAt": "2025-03-18T20:00:00.000Z",
  "messages": [
    {
      "id": "msg1",
      "senderType": "USER",
      "senderName": "Juan Perez",
      "content": "No puedo cargar documentos PDF",
      "attachments": [],
      "createdAt": "2025-03-18T20:00:00.000Z"
    }
  ]
}
```

#### Close Ticket

Close a ticket manually.

**Endpoint**: `PATCH /tickets/:id/close`

**Response** (200 OK):
```json
{
  "id": "clv7abc123def456",
  "status": "CLOSED",
  "closedAt": "2025-03-18T22:00:00.000Z"
}
```

#### Reopen Ticket

Reopen a previously closed ticket.

**Endpoint**: `PATCH /tickets/:id/reopen`

**Response** (200 OK):
```json
{
  "id": "clv7abc123def456",
  "status": "OPEN",
  "reopenedAt": "2025-03-18T23:00:00.000Z"
}
```

---

### 3. Message Management

#### Send Message

Add a new message to a ticket.

**Endpoint**: `POST /tickets/:id/messages`

**Request Body**:
```json
{
  "content": "El problema parece ser en el servidor de archivos"
}
```

**Response** (201 Created):
```json
{
  "id": "msg3",
  "ticketId": "clv7abc123def456",
  "senderType": "USER",
  "senderName": "Juan Perez",
  "content": "El problema parece ser en el servidor de archivos",
  "attachments": [],
  "createdAt": "2025-03-18T23:00:00.000Z"
}
```

#### List Ticket Messages

Get all messages for a specific ticket.

**Endpoint**: `GET /tickets/:id/messages`

**Query Parameters**:
- `page` (optional, default: 1)
- `limit` (optional, default: 50)

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "msg1",
      "senderType": "USER",
      "senderName": "Juan Perez",
      "content": "No puedo cargar documentos PDF",
      "attachments": [],
      "createdAt": "2025-03-18T20:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### 5. Admin Endpoints (ADMIN / SUPERADMIN only)

#### List All Tickets

Get all tickets with advanced filters.

**Endpoint**: `GET /admin/tickets`

**Query Parameters**:
- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `status` (optional)
- `category` (optional)
- `priority` (optional)
- `startDate` (optional, ISO 8601)
- `endDate` (optional, ISO 8601)
- `userId` (optional)

#### Get Ticket Stats

Get statistics about helpdesk tickets.

**Endpoint**: `GET /admin/stats`

**Response** (200 OK):
```json
{
  "totalTickets": 150,
  "openTickets": 12,
  "inProgressTickets": 8,
  "resolvedTickets": 90,
  "closedTickets": 40,
  "ticketsByCategory": {
    "TECHNICAL": 100,
    "OPERATIONAL": 50
  },
  "ticketsByStatus": {
    "OPEN": 10,
    "IN_PROGRESS": 15,
    "RESOLVED": 100,
    "CLOSED": 25
  },
  "avgResponseTime": "4.5 hours",
  "avgResolutionTime": "48 hours"
}
```

---

## WebSocket Integration

### Connection URL

```
wss://api.microsyst.com.ar/helpdesk-socket/
```

### Authentication

Pass JWT token via query parameter:

```
wss://api.microsyst.com.ar/helpdesk-socket/?token=<your_jwt_token>
```

### Events

#### ticketMessage

Sent when a new message is received in a user's ticket.

```json
{
  "event": "ticketMessage",
  "data": {
    "ticketId": "clv7abc123def456",
    "ticketNumber": 42,
    "message": {
      "id": "msg3",
      "senderType": "RESOLVER",
      "senderName": "Tech Support",
      "content": "Estoy investigando el problema",
      "createdAt": "2025-03-18T21:00:00.000Z"
    }
  }
}
```

---

## Enums

### TicketCategory

- `TECHNICAL`: Technical issues
- `OPERATIONAL`: Operational/business rules

### TicketSubcategory

- `ERROR`: Errors or bugs
- `DOUBT`: Questions or clarifications
- `SUGGESTION`: Suggestions for improvement
- `BUSINESS_RULE`: Questions about business rules

### TicketStatus

- `OPEN`: Ticket created and open
- `IN_PROGRESS`: Being worked on
- `RESOLVED`: Marked as resolved
- `CLOSED`: Final state

### TicketPriority

- `LOW`: Low priority
- `NORMAL`: Normal priority
- `HIGH`: High priority

### MessageSenderType

- `USER`: Message sent by the user
- `RESOLVER`: Message sent by a resolver
- `SYSTEM`: System-generated message
