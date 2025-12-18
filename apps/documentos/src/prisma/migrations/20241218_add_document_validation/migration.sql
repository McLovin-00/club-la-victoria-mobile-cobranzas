-- Migration: Add document validation and entity extracted data
-- Description: Adds fields for AI document validation, disparities detection, and extracted data storage

-- =================================
-- 1. Add file naming fields to documents
-- =================================

ALTER TABLE "documents" 
ADD COLUMN IF NOT EXISTS "original_file_name" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "standardized_file_name" VARCHAR(255);

-- =================================
-- 2. Add validation fields to document_classifications
-- =================================

ALTER TABLE "document_classifications"
ADD COLUMN IF NOT EXISTS "documento_es_valido" BOOLEAN,
ADD COLUMN IF NOT EXISTS "motivo_invalidez" TEXT,
ADD COLUMN IF NOT EXISTS "datos_extraidos" JSONB,
ADD COLUMN IF NOT EXISTS "disparidades" JSONB,
ADD COLUMN IF NOT EXISTS "tiene_disparidades" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "vencimiento_detectado" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "vencimiento_origen" VARCHAR(20);

-- Index for filtering documents with disparities
CREATE INDEX IF NOT EXISTS "idx_classifications_disparidades" 
ON "document_classifications" ("tiene_disparidades") 
WHERE "tiene_disparidades" = TRUE;

-- =================================
-- 3. Create entity_extracted_data table
-- =================================

CREATE TABLE IF NOT EXISTS "entity_extracted_data" (
    "id" SERIAL PRIMARY KEY,
    "tenant_empresa_id" INTEGER NOT NULL,
    "dador_carga_id" INTEGER NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "entity_id" INTEGER NOT NULL,
    
    -- Datos extraídos JSON
    "datos_extraidos" JSONB NOT NULL,
    
    -- Metadatos de extracción
    "ultima_extraccion_at" TIMESTAMP NOT NULL,
    "ultimo_documento_id" INTEGER,
    "ultimo_documento_tipo" VARCHAR(100),
    "confianza_promedio" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    
    -- Campos consolidados CHOFER
    "cuil" VARCHAR(20),
    "fecha_nacimiento" TIMESTAMP,
    "nacionalidad" VARCHAR(50),
    "numero_licencia" VARCHAR(50),
    "clases_licencia" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vencimiento_licencia" TIMESTAMP,
    
    -- Campos consolidados CAMION/ACOPLADO
    "anio_fabricacion" INTEGER,
    "numero_motor" VARCHAR(50),
    "numero_chasis" VARCHAR(50),
    "titular" VARCHAR(200),
    "titular_dni" VARCHAR(20),
    
    -- Campos consolidados EMPRESA_TRANSPORTISTA
    "condicion_iva" VARCHAR(50),
    "domicilio_fiscal" JSONB,
    "actividad_principal" JSONB,
    "cantidad_empleados" INTEGER,
    "art_nombre" VARCHAR(100),
    "art_poliza" VARCHAR(50),
    
    -- Timestamps
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    CONSTRAINT "entity_extracted_data_unique" UNIQUE ("tenant_empresa_id", "entity_type", "entity_id")
);

-- Indexes for entity_extracted_data
CREATE INDEX IF NOT EXISTS "idx_entity_extracted_tenant_dador_type" 
ON "entity_extracted_data" ("tenant_empresa_id", "dador_carga_id", "entity_type");

CREATE INDEX IF NOT EXISTS "idx_entity_extracted_type_id" 
ON "entity_extracted_data" ("entity_type", "entity_id");

-- =================================
-- 4. Create entity_extraction_log table
-- =================================

CREATE TABLE IF NOT EXISTS "entity_extraction_log" (
    "id" SERIAL PRIMARY KEY,
    "tenant_empresa_id" INTEGER NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "document_id" INTEGER NOT NULL,
    "template_name" VARCHAR(100) NOT NULL,
    
    -- Resultado
    "datos_extraidos" JSONB NOT NULL,
    "disparidades" JSONB,
    "es_valido" BOOLEAN NOT NULL,
    "confianza" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    
    -- Quién solicitó
    "solicitado_por" INTEGER,
    "es_rechequeo" BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Timestamp
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for entity_extraction_log
CREATE INDEX IF NOT EXISTS "idx_extraction_log_tenant_entity" 
ON "entity_extraction_log" ("tenant_empresa_id", "entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "idx_extraction_log_document" 
ON "entity_extraction_log" ("document_id");

CREATE INDEX IF NOT EXISTS "idx_extraction_log_created" 
ON "entity_extraction_log" ("created_at");

