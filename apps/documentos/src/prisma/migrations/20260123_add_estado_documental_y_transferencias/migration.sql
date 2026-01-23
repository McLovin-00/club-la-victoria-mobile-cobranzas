-- ============================================================================
-- Migración: Estado Documental de Equipos y Solicitudes de Transferencia
-- Fecha: 2026-01-23
-- Descripción: 
--   1. Agrega enum EstadoDocumental para evaluar estado de documentos de equipos
--   2. Agrega campos estadoDocumental y documentosEvaluadosAt a tabla equipo
--   3. Agrega enum EstadoSolicitud para solicitudes de transferencia
--   4. Crea tabla solicitudes_transferencia para gestionar transferencias entre dadores
--   5. Agrega nuevos tipos de notificación interna
-- ============================================================================

-- 1. Crear enum EstadoDocumental
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstadoDocumental') THEN
        CREATE TYPE "EstadoDocumental" AS ENUM (
            'PENDIENTE_VALIDACION',
            'COMPLETO',
            'DOCUMENTACION_INCOMPLETA',
            'DOCUMENTACION_VENCIDA',
            'DOCUMENTACION_POR_VENCER'
        );
    END IF;
END $$;

-- 2. Crear enum EstadoSolicitud
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstadoSolicitud') THEN
        CREATE TYPE "EstadoSolicitud" AS ENUM (
            'PENDIENTE',
            'APROBADA',
            'RECHAZADA',
            'CANCELADA'
        );
    END IF;
END $$;

-- 3. Agregar campos a tabla equipo (si no existen)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'documentos' 
        AND table_name = 'equipo' 
        AND column_name = 'estado_documental'
    ) THEN
        ALTER TABLE "documentos"."equipo" 
        ADD COLUMN "estado_documental" "EstadoDocumental" NOT NULL DEFAULT 'PENDIENTE_VALIDACION';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'documentos' 
        AND table_name = 'equipo' 
        AND column_name = 'documentos_evaluados_at'
    ) THEN
        ALTER TABLE "documentos"."equipo" 
        ADD COLUMN "documentos_evaluados_at" TIMESTAMP(3);
    END IF;
END $$;

-- 4. Crear índice para estado_documental (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'documentos' 
        AND tablename = 'equipo' 
        AND indexname = 'equipo_estado_documental_idx'
    ) THEN
        CREATE INDEX "equipo_estado_documental_idx" ON "documentos"."equipo"("estado_documental");
    END IF;
END $$;

-- 5. Crear tabla solicitudes_transferencia
CREATE TABLE IF NOT EXISTS "documentos"."solicitudes_transferencia" (
    "id" SERIAL NOT NULL,
    "tenant_empresa_id" INTEGER NOT NULL,
    "solicitante_user_id" INTEGER NOT NULL,
    "solicitante_user_email" VARCHAR(150),
    "solicitante_dador_id" INTEGER NOT NULL,
    "solicitante_dador_nombre" VARCHAR(200),
    "dador_actual_id" INTEGER NOT NULL,
    "dador_actual_nombre" VARCHAR(200),
    "entidades" JSONB NOT NULL,
    "equipos_afectados" JSONB,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "motivo" TEXT,
    "resuelto_por_user_id" INTEGER,
    "resuelto_por_user_email" VARCHAR(150),
    "resuelto_at" TIMESTAMP(3),
    "motivo_rechazo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitudes_transferencia_pkey" PRIMARY KEY ("id")
);

-- 6. Crear índices para solicitudes_transferencia
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'documentos' 
        AND indexname = 'solicitudes_transferencia_tenant_estado_idx'
    ) THEN
        CREATE INDEX "solicitudes_transferencia_tenant_estado_idx" 
        ON "documentos"."solicitudes_transferencia"("tenant_empresa_id", "estado");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'documentos' 
        AND indexname = 'solicitudes_transferencia_solicitante_dador_idx'
    ) THEN
        CREATE INDEX "solicitudes_transferencia_solicitante_dador_idx" 
        ON "documentos"."solicitudes_transferencia"("solicitante_dador_id");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'documentos' 
        AND indexname = 'solicitudes_transferencia_dador_actual_idx'
    ) THEN
        CREATE INDEX "solicitudes_transferencia_dador_actual_idx" 
        ON "documentos"."solicitudes_transferencia"("dador_actual_id");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'documentos' 
        AND indexname = 'solicitudes_transferencia_estado_created_idx'
    ) THEN
        CREATE INDEX "solicitudes_transferencia_estado_created_idx" 
        ON "documentos"."solicitudes_transferencia"("estado", "created_at" DESC);
    END IF;
END $$;

-- 7. Agregar nuevos valores al enum InternalNotificationType (si no existen)
DO $$
BEGIN
    -- Agregar EQUIPO_ESTADO_ACTUALIZADO
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'EQUIPO_ESTADO_ACTUALIZADO' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'InternalNotificationType')
    ) THEN
        ALTER TYPE "InternalNotificationType" ADD VALUE 'EQUIPO_ESTADO_ACTUALIZADO';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    -- Agregar TRANSFERENCIA_SOLICITADA
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TRANSFERENCIA_SOLICITADA' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'InternalNotificationType')
    ) THEN
        ALTER TYPE "InternalNotificationType" ADD VALUE 'TRANSFERENCIA_SOLICITADA';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    -- Agregar TRANSFERENCIA_APROBADA
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TRANSFERENCIA_APROBADA' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'InternalNotificationType')
    ) THEN
        ALTER TYPE "InternalNotificationType" ADD VALUE 'TRANSFERENCIA_APROBADA';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    -- Agregar TRANSFERENCIA_RECHAZADA
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TRANSFERENCIA_RECHAZADA' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'InternalNotificationType')
    ) THEN
        ALTER TYPE "InternalNotificationType" ADD VALUE 'TRANSFERENCIA_RECHAZADA';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 8. Trigger para actualizar updated_at automáticamente en solicitudes_transferencia
CREATE OR REPLACE FUNCTION documentos.update_solicitudes_transferencia_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_solicitudes_transferencia_updated_at 
ON "documentos"."solicitudes_transferencia";

CREATE TRIGGER trigger_solicitudes_transferencia_updated_at
    BEFORE UPDATE ON "documentos"."solicitudes_transferencia"
    FOR EACH ROW
    EXECUTE FUNCTION documentos.update_solicitudes_transferencia_updated_at();

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
