/*
  Warnings:

  - You are about to drop the `agent_round_robin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `agents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `canales_de_paso` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat_agents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat_processing_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat_processor_instances` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `conversation_analysis` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `document_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `drivers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `flow_chats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gateway_clients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gateway_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gateway_whitelists` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `imported_conversations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `manual_executions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `processing_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `trailers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `trucks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "agent_round_robin" DROP CONSTRAINT "agent_round_robin_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "agents" DROP CONSTRAINT "agents_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "canales_de_paso" DROP CONSTRAINT "canales_de_paso_instancia_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_agents" DROP CONSTRAINT "chat_agents_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_processing_logs" DROP CONSTRAINT "chat_processing_logs_chatId_fkey";

-- DropForeignKey
ALTER TABLE "chat_processor_instances" DROP CONSTRAINT "chat_processor_instances_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "conversation_analysis" DROP CONSTRAINT "conversation_analysis_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "document_requests" DROP CONSTRAINT "document_requests_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "drivers" DROP CONSTRAINT "drivers_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "flow_chats" DROP CONSTRAINT "flow_chats_agentId_fkey";

-- DropForeignKey
ALTER TABLE "flow_chats" DROP CONSTRAINT "flow_chats_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "gateway_clients" DROP CONSTRAINT "gateway_clients_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "gateway_permissions" DROP CONSTRAINT "gateway_permissions_clientId_fkey";

-- DropForeignKey
ALTER TABLE "gateway_permissions" DROP CONSTRAINT "gateway_permissions_instanceId_fkey";

-- DropForeignKey
ALTER TABLE "gateway_whitelists" DROP CONSTRAINT "gateway_whitelists_clientId_fkey";

-- DropForeignKey
ALTER TABLE "gateway_whitelists" DROP CONSTRAINT "gateway_whitelists_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "gateway_whitelists" DROP CONSTRAINT "gateway_whitelists_instanceId_fkey";

-- DropForeignKey
ALTER TABLE "imported_conversations" DROP CONSTRAINT "imported_conversations_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "manual_executions" DROP CONSTRAINT "manual_executions_cancelled_by_fkey";

-- DropForeignKey
ALTER TABLE "manual_executions" DROP CONSTRAINT "manual_executions_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "manual_executions" DROP CONSTRAINT "manual_executions_requested_by_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_gatewayClientId_fkey";

-- DropForeignKey
ALTER TABLE "processing_logs" DROP CONSTRAINT "processing_logs_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "trailers" DROP CONSTRAINT "trailers_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "trucks" DROP CONSTRAINT "trucks_empresaId_fkey";

-- AlterTable
ALTER TABLE "platform_users" ALTER COLUMN "updated_at" DROP DEFAULT;

-- DropTable
DROP TABLE "agent_round_robin";

-- DropTable
DROP TABLE "agents";

-- DropTable
DROP TABLE "canales_de_paso";

-- DropTable
DROP TABLE "chat_agents";

-- DropTable
DROP TABLE "chat_processing_logs";

-- DropTable
DROP TABLE "chat_processor_instances";

-- DropTable
DROP TABLE "conversation_analysis";

-- DropTable
DROP TABLE "document_requests";

-- DropTable
DROP TABLE "drivers";

-- DropTable
DROP TABLE "flow_chats";

-- DropTable
DROP TABLE "gateway_clients";

-- DropTable
DROP TABLE "gateway_permissions";

-- DropTable
DROP TABLE "gateway_whitelists";

-- DropTable
DROP TABLE "imported_conversations";

-- DropTable
DROP TABLE "manual_executions";

-- DropTable
DROP TABLE "processing_logs";

-- DropTable
DROP TABLE "trailers";

-- DropTable
DROP TABLE "trucks";

-- DropEnum
DROP TYPE "AnalysisStatus";

-- DropEnum
DROP TYPE "ConversationProcessingStatus";

-- DropEnum
DROP TYPE "ConversationSource";

-- DropEnum
DROP TYPE "DocumentEstado";

-- DropEnum
DROP TYPE "EntidadTipo";

-- DropEnum
DROP TYPE "ExecutionMode";

-- DropEnum
DROP TYPE "ExecutionPriority";

-- DropEnum
DROP TYPE "ExecutionStatus";

-- DropEnum
DROP TYPE "FlowChatEstado";

-- DropEnum
DROP TYPE "FuenteIdentificador";

-- DropEnum
DROP TYPE "GatewayPermissionTipo";

-- DropEnum
DROP TYPE "GatewayWhitelistScope";

-- DropEnum
DROP TYPE "ProcessingStatus";

-- DropEnum
DROP TYPE "TriggerType";

-- RenameIndex
ALTER INDEX "idx_platform_users_created_at" RENAME TO "idx_users_created_at";

-- RenameIndex
ALTER INDEX "idx_platform_users_email" RENAME TO "idx_users_email";

-- RenameIndex
ALTER INDEX "idx_platform_users_empresa_id" RENAME TO "idx_users_empresa_id";

-- RenameIndex
ALTER INDEX "idx_platform_users_role" RENAME TO "idx_users_role";
