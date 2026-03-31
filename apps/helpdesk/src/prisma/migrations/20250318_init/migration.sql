-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('TECHNICAL', 'OPERATIONAL');

-- CreateEnum
CREATE TYPE "TicketSubcategory" AS ENUM ('ERROR', 'DOUBT', 'SUGGESTION', 'BUSINESS_RULE');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "MessageSenderType" AS ENUM ('USER', 'RESOLVER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT');

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "subcategory" "TicketSubcategory" NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "confirmedPriority" "TicketPriority",
    "createdBy" INTEGER NOT NULL,
    "createdByName" VARCHAR(150) NOT NULL,
    "assignedTo" VARCHAR(100),
    "telegramTopicId" INTEGER,
    "telegramGroupId" VARCHAR(50),
    "source" VARCHAR(20) NOT NULL DEFAULT 'platform',
    "resolved_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "senderType" "MessageSenderType" NOT NULL,
    "sender_id" VARCHAR(50),
    "sender_name" VARCHAR(150) NOT NULL,
    "content" TEXT NOT NULL,
    "telegram_message_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "type" "AttachmentType" NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "minio_key" VARCHAR(500) NOT NULL,
    "minio_url" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolver_configs" (
    "id" SERIAL NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "telegram_group_id" VARCHAR(50) NOT NULL,
    "telegram_group_name" VARCHAR(100),
    "resolver_names" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "resolver_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_configs" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "helpdesk_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_number_key" ON "tickets"("number");

-- CreateIndex
CREATE INDEX "idx_tickets_number" ON "tickets"("number");

-- CreateIndex
CREATE INDEX "idx_tickets_created_by" ON "tickets"("createdBy");

-- CreateIndex
CREATE INDEX "idx_tickets_status" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "idx_tickets_category" ON "tickets"("category");

-- CreateIndex
CREATE INDEX "idx_tickets_created_at" ON "tickets"("created_at");

-- CreateIndex
CREATE INDEX "idx_tickets_resolved_at" ON "tickets"("resolved_at");

-- CreateIndex
CREATE INDEX "idx_messages_ticket_id" ON "ticket_messages"("ticket_id");

-- CreateIndex
CREATE INDEX "idx_messages_created_at" ON "ticket_messages"("created_at");

-- CreateIndex
CREATE INDEX "idx_attachments_message_id" ON "message_attachments"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "resolver_configs_category_key" ON "resolver_configs"("category");

-- CreateIndex
CREATE INDEX "idx_resolver_config_category" ON "resolver_configs"("category");

-- CreateIndex
CREATE UNIQUE INDEX "helpdesk_configs_key_key" ON "helpdesk_configs"("key");

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "ticket_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
