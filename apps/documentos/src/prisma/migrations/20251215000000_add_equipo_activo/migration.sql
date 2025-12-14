-- Add activo field to equipos table
ALTER TABLE "documentos"."equipos" ADD COLUMN IF NOT EXISTS "activo" BOOLEAN NOT NULL DEFAULT true;

-- Create index for filtering by activo
CREATE INDEX IF NOT EXISTS "idx_equipos_activo" ON "documentos"."equipos"("activo");
