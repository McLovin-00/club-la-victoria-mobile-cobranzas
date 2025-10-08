/*
  Warnings:

  - Added the required column `conversation_source` to the `chat_processor_instances` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add nullable columns first
ALTER TABLE "chat_processor_instances" 
ADD COLUMN "analysis_config" JSONB,
ADD COLUMN "conversation_source" "ConversationSource",
ADD COLUMN "evolution_api_config" JSONB,
ADD COLUMN "last_used_agent_id" INTEGER,
ADD COLUMN "source_config" JSONB,
ADD COLUMN "tagging_config" JSONB;

-- Step 2: Update existing records with default values
UPDATE "chat_processor_instances" 
SET "conversation_source" = 'flowise'
WHERE "conversation_source" IS NULL;

-- Step 3: Make conversation_source NOT NULL
ALTER TABLE "chat_processor_instances" 
ALTER COLUMN "conversation_source" SET NOT NULL;

-- AlterTable for imported_conversations
ALTER TABLE "imported_conversations" 
ADD COLUMN "last_message_at" TIMESTAMPTZ(6);
