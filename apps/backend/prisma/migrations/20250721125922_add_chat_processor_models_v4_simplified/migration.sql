-- CreateEnum
CREATE TYPE "ConversationSource" AS ENUM ('flowise', 'chatwoot', 'evolution_api');

-- CreateEnum
CREATE TYPE "ExecutionMode" AS ENUM ('scheduled', 'manual', 'hybrid');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('scheduled', 'manual');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ExecutionPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateTable
CREATE TABLE "chat_processor_instances" (
    "id" SERIAL NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "conversation_source" "ConversationSource" NOT NULL,
    "source_config" JSONB NOT NULL,
    "analysis_config" JSONB NOT NULL,
    "execution_mode" "ExecutionMode" NOT NULL,
    "execution_config" JSONB NOT NULL,
    "tagging_config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_execution_at" TIMESTAMPTZ(6),
    "next_scheduled_execution_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_processor_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_agents" (
    "id" SERIAL NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "execution_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_logs" (
    "id" SERIAL NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "execution_id" VARCHAR(255) NOT NULL,
    "trigger_type" "TriggerType" NOT NULL,
    "conversation_source" "ConversationSource" NOT NULL,
    "triggered_by" VARCHAR(255),
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "status" "ProcessingStatus" NOT NULL,
    "conversations_processed" INTEGER NOT NULL DEFAULT 0,
    "messages_generated" INTEGER NOT NULL DEFAULT 0,
    "tags_applied" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "processing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_executions" (
    "id" SERIAL NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "requested_by" INTEGER NOT NULL,
    "status" "ExecutionStatus" NOT NULL,
    "priority" "ExecutionPriority" NOT NULL DEFAULT 'normal',
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by" INTEGER,
    "execution_id" VARCHAR(255),
    "metadata" JSONB,

    CONSTRAINT "manual_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_processor_instances_instance_id_key" ON "chat_processor_instances"("instance_id");

-- CreateIndex
CREATE INDEX "idx_chat_processor_instance_id" ON "chat_processor_instances"("instance_id");

-- CreateIndex
CREATE INDEX "idx_chat_processor_source" ON "chat_processor_instances"("conversation_source");

-- CreateIndex
CREATE INDEX "idx_chat_processor_execution_mode" ON "chat_processor_instances"("execution_mode");

-- CreateIndex
CREATE INDEX "idx_chat_processor_active" ON "chat_processor_instances"("is_active");

-- CreateIndex
CREATE INDEX "idx_chat_processor_next_execution" ON "chat_processor_instances"("next_scheduled_execution_at");

-- CreateIndex
CREATE INDEX "idx_chat_agent_instance_id" ON "chat_agents"("instance_id");

-- CreateIndex
CREATE INDEX "idx_chat_agent_order" ON "chat_agents"("execution_order");

-- CreateIndex
CREATE INDEX "idx_chat_agent_active" ON "chat_agents"("is_active");

-- CreateIndex
CREATE INDEX "idx_processing_log_instance_id" ON "processing_logs"("instance_id");

-- CreateIndex
CREATE INDEX "idx_processing_log_execution_id" ON "processing_logs"("execution_id");

-- CreateIndex
CREATE INDEX "idx_processing_log_trigger_type" ON "processing_logs"("trigger_type");

-- CreateIndex
CREATE INDEX "idx_processing_log_status" ON "processing_logs"("status");

-- CreateIndex
CREATE INDEX "idx_processing_log_started_at" ON "processing_logs"("started_at");

-- CreateIndex
CREATE INDEX "idx_manual_execution_instance_id" ON "manual_executions"("instance_id");

-- CreateIndex
CREATE INDEX "idx_manual_execution_requested_by" ON "manual_executions"("requested_by");

-- CreateIndex
CREATE INDEX "idx_manual_execution_status" ON "manual_executions"("status");

-- CreateIndex
CREATE INDEX "idx_manual_execution_priority" ON "manual_executions"("priority");

-- CreateIndex
CREATE INDEX "idx_manual_execution_requested_at" ON "manual_executions"("requested_at");

-- AddForeignKey
ALTER TABLE "chat_processor_instances" ADD CONSTRAINT "chat_processor_instances_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_agents" ADD CONSTRAINT "chat_agents_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "chat_processor_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_logs" ADD CONSTRAINT "processing_logs_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "chat_processor_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_executions" ADD CONSTRAINT "manual_executions_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "chat_processor_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_executions" ADD CONSTRAINT "manual_executions_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "platform_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_executions" ADD CONSTRAINT "manual_executions_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
