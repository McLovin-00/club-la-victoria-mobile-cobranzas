-- AlterTable
ALTER TABLE "imported_conversations" ADD COLUMN     "content_hash" VARCHAR(64);

-- CreateIndex
CREATE INDEX "idx_imported_conversation_content_hash" ON "imported_conversations"("content_hash");
