/*
  Warnings:

  - You are about to drop the column `analysis_config` on the `chat_processor_instances` table. All the data in the column will be lost.
  - You are about to drop the column `conversation_source` on the `chat_processor_instances` table. All the data in the column will be lost.
  - You are about to drop the column `evolution_api_config` on the `chat_processor_instances` table. All the data in the column will be lost.
  - You are about to drop the column `last_used_agent_id` on the `chat_processor_instances` table. All the data in the column will be lost.
  - You are about to drop the column `processing_config` on the `chat_processor_instances` table. All the data in the column will be lost.
  - You are about to drop the column `source_config` on the `chat_processor_instances` table. All the data in the column will be lost.
  - You are about to drop the column `tagging_config` on the `chat_processor_instances` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "chat_agents" DROP CONSTRAINT "chat_agents_instance_id_fkey";

-- DropIndex
DROP INDEX "idx_chat_processor_active";

-- DropIndex
DROP INDEX "idx_chat_processor_execution_mode";

-- DropIndex
DROP INDEX "idx_chat_processor_instance_id";

-- DropIndex
DROP INDEX "idx_chat_processor_next_execution";

-- DropIndex
DROP INDEX "idx_chat_processor_source";

-- AlterTable
ALTER TABLE "chat_processor_instances" DROP COLUMN "analysis_config",
DROP COLUMN "conversation_source",
DROP COLUMN "evolution_api_config",
DROP COLUMN "last_used_agent_id",
DROP COLUMN "processing_config",
DROP COLUMN "source_config",
DROP COLUMN "tagging_config",
ADD COLUMN     "processing_trigger_config" JSONB,
ALTER COLUMN "execution_config" DROP NOT NULL,
ALTER COLUMN "last_execution_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "next_scheduled_execution_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AddForeignKey
ALTER TABLE "chat_agents" ADD CONSTRAINT "chat_agents_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "chat_processor_instances"("instance_id") ON DELETE CASCADE ON UPDATE CASCADE;
