# Helpdesk Microservice

> Sistema integral de Mesa de Ayuda con integración completa a Telegram

## 📋 Overview

Microservicio de soporte técnico y operativo que permite a los usuarios crear tickets, enviar consultas y adjuntar archivos multimedia. Los tickets se transmiten a resolvedores vía Telegram, mientras que los usuarios también pueden comunicarse directamente por Telegram.

## 🏗️ Architecture

### Key Components

- **Express Server**: REST API on port 4803
- **Prisma ORM**: PostgreSQL database with schema for tickets, messages, and attachments
- **Telegram Bot**: grammY bot for real-time communication (DM + Groups)
- **BullMQ Workers**: Background job processing (auto-close, media uploads)
- **Socket.IO**: Real-time notifications
- **MinIO**: S3-compatible object storage for file attachments
- **Redis**: Queue management and session storage

### Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js 5
- **ORM**: Prisma 6
- **Database**: PostgreSQL 16
- **Bot Library**: grammY 1.36
- **Queue**: BullMQ 5
- **Storage**: MinIO 8
- **Real-time**: Socket.IO 4
- **Testing**: Jest 30
- **Docker**: Docker 20+ with multi-stage builds

## 🚀 Getting Started

### Prerequisites

- Node.js 20 or higher
- PostgreSQL 16
- Redis 7
- MinIO (S3-compatible)
- Telegram Bot Token

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd monorepo-bca
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp apps/helpdesk/.env.example apps/helpdesk/.env
```

4. Configure environment variables (see below)

5. Run database migrations:
```bash
cd apps/helpdesk
npm run prisma:migrate
```

6. Start the server:
```bash
npm run dev
```

### Development

```bash
# Run migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Run tests
npm run test

# Build for production
npm run build

# Start in production mode
npm run start
```

## 📁 Project Structure

```
apps/helpdesk/
├── src/
│   ├── bot/                    # Telegram bot
│   │   ├── handlers/           # DM, group, command handlers
│   │   ├── middleware/         # Bot middleware (identification)
│   │   └── index.ts            # Bot initialization
│   ├── config/                 # Configuration modules
│   │   ├── database.ts         # Prisma client
│   │   ├── environment.ts      # Environment variables
│   │   ├── logger.ts           # Winston logger
│   │   ├── minio.ts            # MinIO client
│   │   └── redis.ts            # Redis client
│   ├── controllers/            # Request controllers
│   │   ├── admin.controller.ts
│   │   ├── attachment.controller.ts
│   │   ├── message.controller.ts
│   │   └── ticket.controller.ts
│   ├── middlewares/            # Express middleware
│   │   ├── auth.middleware.ts  # JWT validation
│   │   ├── error.middleware.ts # Error handling
│   │   └── not-found.middleware.ts
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── routes/                 # API routes
│   │   ├── admin.routes.ts
│   │   ├── attachment.routes.ts
│   │   ├── health.routes.ts
│   │   ├── index.ts
│   │   ├── message.routes.ts
│   │   └── ticket.routes.ts
│   ├── services/               # Business logic
│   │   ├── attachment.service.ts
│   │   ├── message.service.ts
│   │   ├── queue.service.ts    # BullMQ queue management
│   │   ├── resolver-config.service.ts
│   │   ├── telegram.service.ts # Telegram API client
│   │   ├── ticket.service.ts
│   │   └── websocket.service.ts
│   ├── schedulers/             # Scheduled jobs
│   │   └── auto-close.scheduler.ts
│   ├── workers/                # Background workers
│   │   ├── auto-close.worker.ts
│   │   └── media.worker.ts
│   ├── types/                  # TypeScript types
│   ├── utils/                  # Utilities
│   └── index.ts                # Entry point
├── __tests__/                  # Test files
│   ├── routes/
│   └── services/
├── Dockerfile
├── jest.config.js
├── package.json
├── tsconfig.json
└── .env.example
```

## 🔧 Configuration

### Environment Variables

```bash
# Server
PORT=4803
NODE_ENV=development

# Database
HELPDESK_DATABASE_URL=postgresql://user:pass@localhost:5432/monorepo-bca?schema=helpdesk

# JWT Authentication
JWT_PUBLIC_KEY_PATH=./keys/jwt-dev-public.pem
JWT_PRIVATE_KEY_PATH=./keys/jwt-dev-private.pem

# Telegram Bot
TELEGRAM_BOT_TOKEN=<your_bot_token>
TELEGRAM_TECHNICAL_GROUP_ID=-1001234567890
TELEGRAM_OPERATIONAL_GROUP_ID=-1001234567891

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=helpdesk-attachments
MINIO_USE_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Backend API
BACKEND_API_URL=http://localhost:4800

# Auto-close
AUTO_CLOSE_HOURS=72

# File Upload Limits (bytes)
MAX_IMAGE_SIZE=10485760      # 10MB
MAX_AUDIO_SIZE=26214400      # 25MB
MAX_VIDEO_SIZE=52428800      # 50MB
MAX_DOCUMENT_SIZE=26214400   # 25MB

# Service Enablement
ENABLE_HELPDESK=true
```

### Database Schema

See `src/prisma/schema.prisma` for complete database schema.

**Key Models**:
- `Ticket`: Main ticket entity
- `TicketMessage`: Messages within a ticket
- `MessageAttachment`: File attachments
- `ResolverConfig`: Configuration for resolver groups
- `HelpdeskConfig`: System-wide settings

## 🎯 API Endpoints

### Tickets

- `POST /tickets` - Create new ticket
- `GET /tickets` - List my tickets
- `GET /tickets/:id` - Get ticket details
- `PATCH /tickets/:id/close` - Close ticket
- `PATCH /tickets/:id/reopen` - Reopen ticket

### Messages

- `POST /tickets/:id/messages` - Send message
- `GET /tickets/:id/messages` - List ticket messages

### Attachments

- `GET /attachments/:id/download` - Get download URL

### Admin (ADMIN/SUPERADMIN only)

- `GET /admin/tickets` - List all tickets
- `GET /admin/stats` - Get statistics
- `GET /admin/config` - Get resolver config
- `PUT /admin/config/:category` - Update config

### Health

- `GET /health` - Health check
- `GET /health/ready` - Readiness check

**Full API Documentation**: See `/docs/helpdesk/API_DOCUMENTATION.md`

## 🤖 Telegram Bot

The bot handles:
- User DM for ticket creation and inquiries
- Group messages in ticket topics
- Automatic ticket creation from DM
- File uploads from Telegram to MinIO
- Real-time notifications via DM and Socket.IO

**Full Bot Documentation**: See `/docs/helpdesk/TELEGRAM_BOT_COMMANDS.md`

## 🧪 Testing

### Test Files

```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage

# Run specific test file
npm run test -- src/__tests__/services/ticket.service.test.ts
```

### Test Coverage

- Routes: 2/2 tests pass
- Services: 12/12 tests pass
- Total: 14/14 tests pass

**Coverage Goal**: ≥ 70% (configured in `jest.config.js`)

## 🐳 Docker

### Build

```bash
docker build -t helpdesk:latest .
```

### Run

```bash
docker run -d \
  --name helpdesk \
  -p 4803:4803 \
  --env-file .env \
  helpdesk:latest
```

### Production Deployment

See `/docs/CICD_PIPELINE_3_SERVICES.md` for deployment guide.

## 📊 Database Migrations

### Development

```bash
npm run prisma:migrate
```

### Production

```bash
# Migrations are auto-run on startup via entrypoint.sh
# Manual migration deploy:
npx prisma migrate deploy --schema=src/prisma/schema.prisma
```

### Reset Database

```bash
npx prisma migrate reset --schema=src/prisma/schema.prisma
```

## 🔐 Authentication

JWT RS256 authentication is required for all API endpoints. Tokens are validated using the shared public key from the backend service.

## 📈 Monitoring

### Health Checks

```bash
curl http://localhost:4803/health
curl http://localhost:4803/health/ready
```

### Logs

Logs are written to:
- Console (development)
- Files in `logs/` directory (production)

Log levels: `debug`, `info
