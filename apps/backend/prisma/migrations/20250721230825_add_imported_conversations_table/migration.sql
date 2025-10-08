-- CreateEnum
CREATE TYPE "ConversationProcessingStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'skipped');

-- AlterTable
ALTER TABLE "chat_processor_instances" ADD COLUMN     "evolution_api_config" JSONB;

-- CreateTable
CREATE TABLE "imported_conversations" (
    "id" SERIAL NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "external_id" TEXT NOT NULL,
    "source" "ConversationSource" NOT NULL,
    "content" TEXT NOT NULL,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "phone_number" VARCHAR(50),
    "source_timestamp" TIMESTAMPTZ(6) NOT NULL,
    "imported_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_processed_at" TIMESTAMPTZ(6),
    "processing_status" "ConversationProcessingStatus" NOT NULL DEFAULT 'pending',
    "metadata" JSONB,

    CONSTRAINT "imported_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_imported_conversation_instance_id" ON "imported_conversations"("instance_id");

-- CreateIndex
CREATE INDEX "idx_imported_conversation_source" ON "imported_conversations"("source");

-- CreateIndex
CREATE INDEX "idx_imported_conversation_status" ON "imported_conversations"("processing_status");

-- CreateIndex
CREATE INDEX "idx_imported_conversation_source_timestamp" ON "imported_conversations"("source_timestamp");

-- CreateIndex
CREATE INDEX "idx_imported_conversation_imported_at" ON "imported_conversations"("imported_at");

-- CreateIndex
CREATE UNIQUE INDEX "unique_imported_conversation_external_id" ON "imported_conversations"("instance_id", "external_id");

-- AddForeignKey
ALTER TABLE "imported_conversations" ADD CONSTRAINT "imported_conversations_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "chat_processor_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
