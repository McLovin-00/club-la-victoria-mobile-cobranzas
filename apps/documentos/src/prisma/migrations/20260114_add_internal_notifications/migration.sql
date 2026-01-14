-- CreateEnum
CREATE TYPE "InternalNotificationType" AS ENUM ('DOCUMENT_REJECTED', 'DOCUMENT_APPROVED', 'DOCUMENT_EXPIRING', 'DOCUMENT_EXPIRED', 'DOCUMENT_UPLOADED', 'EQUIPO_INCOMPLETE', 'EQUIPO_COMPLETE', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateTable
CREATE TABLE "internal_notifications" (
    "id" SERIAL NOT NULL,
    "tenant_empresa_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "InternalNotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "link" VARCHAR(500),
    "priority" "NotificationPriority" NOT NULL DEFAULT 'normal',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,
    "document_id" INTEGER,
    "equipo_id" INTEGER,
    "remito_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "internal_notifications_user_id_read_deleted_idx" ON "internal_notifications"("user_id", "read", "deleted");

-- CreateIndex
CREATE INDEX "internal_notifications_user_id_created_at_idx" ON "internal_notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "internal_notifications_tenant_empresa_id_idx" ON "internal_notifications"("tenant_empresa_id");

-- CreateIndex
CREATE INDEX "internal_notifications_document_id_idx" ON "internal_notifications"("document_id");

-- CreateIndex
CREATE INDEX "internal_notifications_type_idx" ON "internal_notifications"("type");
