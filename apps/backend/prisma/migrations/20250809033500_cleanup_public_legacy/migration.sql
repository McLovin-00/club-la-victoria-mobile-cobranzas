-- Cleanup legacy Chat-Processor and Gateway artifacts from public schema
-- Safe to run multiple times

-- Drop legacy tables (use CASCADE to remove dependent FKs)
DROP TABLE IF EXISTS public.action_execution_logs CASCADE;
DROP TABLE IF EXISTS public.alert_executions CASCADE;
DROP TABLE IF EXISTS public.alert_rules CASCADE;
DROP TABLE IF EXISTS public.chat_agents CASCADE;
DROP TABLE IF EXISTS public.chat_processing_logs CASCADE;
DROP TABLE IF EXISTS public.chat_processor_instances CASCADE;
DROP TABLE IF EXISTS public.conversation_analysis CASCADE;
DROP TABLE IF EXISTS public.flow_chats CASCADE;
DROP TABLE IF EXISTS public.imported_conversations CASCADE;
DROP TABLE IF EXISTS public.manual_executions CASCADE;
DROP TABLE IF EXISTS public.message_templates CASCADE;
DROP TABLE IF EXISTS public.metric_data CASCADE;
DROP TABLE IF EXISTS public.monitoring_dashboards CASCADE;
DROP TABLE IF EXISTS public.outbound_messages CASCADE;
DROP TABLE IF EXISTS public.processing_logs CASCADE;
DROP TABLE IF EXISTS public.recipients CASCADE;
DROP TABLE IF EXISTS public.scheduled_jobs CASCADE;

-- Additional legacy tables linked to old gateway layer
DROP TABLE IF EXISTS public.gateway_clients CASCADE;
DROP TABLE IF EXISTS public.gateway_permissions CASCADE;
DROP TABLE IF EXISTS public.gateway_whitelists CASCADE;
DROP TABLE IF EXISTS public.canales_de_paso CASCADE;

-- Optional: legacy agent distribution helpers (safe to drop if exist)
DROP TABLE IF EXISTS public.agent_round_robin CASCADE;
DROP TABLE IF EXISTS public.agents CASCADE;

-- Drop legacy enums from Chat-Processor and Gateway
DROP TYPE IF EXISTS public."ActionExecutionStatus" CASCADE;
DROP TYPE IF EXISTS public."AlertSeverity" CASCADE;
DROP TYPE IF EXISTS public."AnalysisStatus" CASCADE;
DROP TYPE IF EXISTS public."ConversationGrouping" CASCADE;
DROP TYPE IF EXISTS public."ConversationProcessingStatus" CASCADE;
DROP TYPE IF EXISTS public."ConversationSource" CASCADE;
DROP TYPE IF EXISTS public."DistributionMode" CASCADE;
DROP TYPE IF EXISTS public."ExecutionMode" CASCADE;
DROP TYPE IF EXISTS public."ExecutionPriority" CASCADE;
DROP TYPE IF EXISTS public."ExecutionStatus" CASCADE;
DROP TYPE IF EXISTS public."FlowChatEstado" CASCADE;
DROP TYPE IF EXISTS public."MessageStatus" CASCADE;
DROP TYPE IF EXISTS public."OutputChannel" CASCADE;
DROP TYPE IF EXISTS public."ProcessingStatus" CASCADE;
DROP TYPE IF EXISTS public."TriggerType" CASCADE;

-- Gateway enums
DROP TYPE IF EXISTS public."GatewayPermissionTipo" CASCADE;
DROP TYPE IF EXISTS public."GatewayWhitelistScope" CASCADE;
DROP TYPE IF EXISTS public."FuenteIdentificador" CASCADE;


