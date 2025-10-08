-- Remove legacy Chat-related tables from public schema
-- These were migrated to the dedicated `chat` schema (apps/chat-processor)

-- Drop children first (use CASCADE to simplify dependency handling)
DROP TABLE IF EXISTS public."outbound_messages" CASCADE;
DROP TABLE IF EXISTS public."recipients" CASCADE;
DROP TABLE IF EXISTS public."message_templates" CASCADE;
DROP TABLE IF EXISTS public."scheduled_jobs" CASCADE;
DROP TABLE IF EXISTS public."monitoring_dashboards" CASCADE;
DROP TABLE IF EXISTS public."metric_data" CASCADE;
DROP TABLE IF EXISTS public."alert_executions" CASCADE;
DROP TABLE IF EXISTS public."alert_rules" CASCADE;
DROP TABLE IF EXISTS public."manual_executions" CASCADE;
DROP TABLE IF EXISTS public."processing_logs" CASCADE;
DROP TABLE IF EXISTS public."conversation_analysis" CASCADE;
DROP TABLE IF EXISTS public."imported_conversations" CASCADE;
DROP TABLE IF EXISTS public."chat_agents" CASCADE;
DROP TABLE IF EXISTS public."chat_processor_instances" CASCADE;

-- Legacy flowise tables (replaced by imported_conversations & analysis)
DROP TABLE IF EXISTS public."chat_processing_logs" CASCADE;
DROP TABLE IF EXISTS public."flow_chats" CASCADE;

-- Drop enums if present (CASCADE to remove any leftover dependencies)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname = 'ConversationSource' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TYPE public."ConversationSource" CASCADE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname = 'ConversationGrouping' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TYPE public."ConversationGrouping" CASCADE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname = 'TriggerType' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TYPE public."TriggerType" CASCADE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname = 'ProcessingStatus' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TYPE public."ProcessingStatus" CASCADE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname = 'ExecutionStatus' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TYPE public."ExecutionStatus" CASCADE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname = 'ExecutionPriority' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TYPE public."ExecutionPriority" CASCADE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname = 'ConversationProcessingStatus' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TYPE public."ConversationProcessingStatus" CASCADE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname = 'AnalysisStatus' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TYPE public."AnalysisStatus" CASCADE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname = 'DistributionMode' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TYPE public."DistributionMode" CASCADE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname = 'OutputChannel' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TYPE public."OutputChannel" CASCADE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname = 'MessageStatus' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TYPE public."MessageStatus" CASCADE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname = 'AlertSeverity' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TYPE public."AlertSeverity" CASCADE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname = 'ActionExecutionStatus' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TYPE public."ActionExecutionStatus" CASCADE';
  END IF;
END$$;


