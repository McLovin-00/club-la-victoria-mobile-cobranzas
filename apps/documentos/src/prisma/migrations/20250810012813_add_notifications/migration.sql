-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('aviso', 'alerta', 'alarma', 'faltante');

-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('CHOFER', 'DADOR');

-- AlterTable
ALTER TABLE "dadores_carga" ADD COLUMN     "notify_dador_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_driver_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "notification_log" (
    "id" SERIAL NOT NULL,
    "tenant_empresa_id" INTEGER NOT NULL,
    "dador_carga_id" INTEGER,
    "document_id" INTEGER,
    "equipo_id" INTEGER,
    "type" "NotificationType" NOT NULL,
    "audience" "NotificationAudience" NOT NULL,
    "target" VARCHAR(64) NOT NULL,
    "template_key" VARCHAR(64) NOT NULL,
    "payload" JSONB,
    "status" VARCHAR(16) NOT NULL,
    "error" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_log_document_id_type_audience_idx" ON "notification_log"("document_id", "type", "audience");

-- CreateIndex
CREATE INDEX "notification_log_equipo_id_type_audience_idx" ON "notification_log"("equipo_id", "type", "audience");
