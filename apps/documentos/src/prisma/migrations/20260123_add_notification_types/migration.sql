-- Migración: Agregar nuevos tipos de notificación interna
-- Fecha: 2026-01-23
-- Descripción: Agrega tipos adicionales para notificaciones de documentos faltantes,
--              urgencia de vencimiento, equipos bloqueados y nuevos requisitos de clientes

-- Agregar nuevos valores al enum InternalNotificationType
-- PostgreSQL no permite ALTER TYPE ADD VALUE dentro de transacciones,
-- por lo que estos comandos deben ejecutarse por separado si es necesario

DO $$ 
BEGIN
    -- DOCUMENT_EXPIRING_URGENT
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'DOCUMENT_EXPIRING_URGENT' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'InternalNotificationType')
    ) THEN
        ALTER TYPE "documentos"."InternalNotificationType" ADD VALUE 'DOCUMENT_EXPIRING_URGENT';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    -- DOCUMENT_MISSING
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'DOCUMENT_MISSING' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'InternalNotificationType')
    ) THEN
        ALTER TYPE "documentos"."InternalNotificationType" ADD VALUE 'DOCUMENT_MISSING';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    -- EQUIPO_BLOQUEADO
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'EQUIPO_BLOQUEADO' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'InternalNotificationType')
    ) THEN
        ALTER TYPE "documentos"."InternalNotificationType" ADD VALUE 'EQUIPO_BLOQUEADO';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    -- NUEVO_REQUISITO_CLIENTE
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'NUEVO_REQUISITO_CLIENTE' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'InternalNotificationType')
    ) THEN
        ALTER TYPE "documentos"."InternalNotificationType" ADD VALUE 'NUEVO_REQUISITO_CLIENTE';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
