-- Add activo field to equipo table (already exists, using IF NOT EXISTS)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'documentos' AND table_name = 'equipo' AND column_name = 'activo') THEN
    ALTER TABLE "documentos"."equipo" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Create index for filtering by activo
CREATE INDEX IF NOT EXISTS "idx_equipo_activo" ON "documentos"."equipo"("activo");
