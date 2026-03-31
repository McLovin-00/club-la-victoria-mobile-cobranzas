-- Agrega tipos de notificación para Mesa de Ayuda

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'HELPDESK_NEW_TICKET'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'InternalNotificationType')
    ) THEN
        ALTER TYPE "documentos"."InternalNotificationType" ADD VALUE 'HELPDESK_NEW_TICKET';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'HELPDESK_NEW_RESPONSE'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'InternalNotificationType')
    ) THEN
        ALTER TYPE "documentos"."InternalNotificationType" ADD VALUE 'HELPDESK_NEW_RESPONSE';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'HELPDESK_TICKET_CLOSED'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'InternalNotificationType')
    ) THEN
        ALTER TYPE "documentos"."InternalNotificationType" ADD VALUE 'HELPDESK_TICKET_CLOSED';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'HELPDESK_TICKET_REOPENED'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'InternalNotificationType')
    ) THEN
        ALTER TYPE "documentos"."InternalNotificationType" ADD VALUE 'HELPDESK_TICKET_REOPENED';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
