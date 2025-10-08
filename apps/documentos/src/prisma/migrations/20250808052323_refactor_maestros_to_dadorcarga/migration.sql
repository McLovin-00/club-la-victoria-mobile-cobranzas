-- Backfill-safe migration to move maestros from Empresa -> DadorCarga
DO $$
DECLARE
  default_dador_id INTEGER;
BEGIN
  -- Ensure there is at least one DadorCarga to link legacy rows
  IF NOT EXISTS (SELECT 1 FROM dadores_carga LIMIT 1) THEN
    INSERT INTO dadores_carga (razon_social, cuit, activo, created_at, updated_at)
    VALUES ('Dador Default', '00000000001', true, now(), now());
  END IF;
  SELECT id INTO default_dador_id FROM dadores_carga ORDER BY id LIMIT 1;

  -- Add new nullable columns
  ALTER TABLE "choferes" ADD COLUMN IF NOT EXISTS "dador_carga_id" INTEGER;
  ALTER TABLE "camiones" ADD COLUMN IF NOT EXISTS "dador_carga_id" INTEGER;
  ALTER TABLE "acoplados" ADD COLUMN IF NOT EXISTS "dador_carga_id" INTEGER;

  -- Backfill all existing rows to default dador
  UPDATE "choferes" SET dador_carga_id = COALESCE(dador_carga_id, default_dador_id);
  UPDATE "camiones" SET dador_carga_id = COALESCE(dador_carga_id, default_dador_id);
  UPDATE "acoplados" SET dador_carga_id = COALESCE(dador_carga_id, default_dador_id);

  -- Drop old empresa FKs and indexes if they exist
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'acoplados_empresa_id_fkey') THEN
    ALTER TABLE "acoplados" DROP CONSTRAINT "acoplados_empresa_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'camiones_empresa_id_fkey') THEN
    ALTER TABLE "camiones" DROP CONSTRAINT "camiones_empresa_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'choferes_empresa_id_fkey') THEN
    ALTER TABLE "choferes" DROP CONSTRAINT "choferes_empresa_id_fkey";
  END IF;

  DROP INDEX IF EXISTS "acoplados_empresa_id_idx";
  DROP INDEX IF EXISTS "acoplados_empresa_id_patente_norm_key";
  DROP INDEX IF EXISTS "camiones_empresa_id_idx";
  DROP INDEX IF EXISTS "camiones_empresa_id_patente_norm_key";
  DROP INDEX IF EXISTS "choferes_empresa_id_dni_norm_key";
  DROP INDEX IF EXISTS "choferes_empresa_id_idx";

  -- Remove legacy empresa_id columns if present
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documentos' AND table_name='acoplados' AND column_name='empresa_id') THEN
    ALTER TABLE "acoplados" DROP COLUMN "empresa_id";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documentos' AND table_name='camiones' AND column_name='empresa_id') THEN
    ALTER TABLE "camiones" DROP COLUMN "empresa_id";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='documentos' AND table_name='choferes' AND column_name='empresa_id') THEN
    ALTER TABLE "choferes" DROP COLUMN "empresa_id";
  END IF;

  -- Enforce NOT NULL
  ALTER TABLE "acoplados" ALTER COLUMN "dador_carga_id" SET NOT NULL;
  ALTER TABLE "camiones" ALTER COLUMN "dador_carga_id" SET NOT NULL;
  ALTER TABLE "choferes" ALTER COLUMN "dador_carga_id" SET NOT NULL;
END$$;

-- Drop empresas table if exists
DROP TABLE IF EXISTS "empresas";

-- New indexes and unique constraints
CREATE INDEX IF NOT EXISTS "acoplados_dador_carga_id_idx" ON "acoplados"("dador_carga_id");
CREATE UNIQUE INDEX IF NOT EXISTS "acoplados_dador_carga_id_patente_norm_key" ON "acoplados"("dador_carga_id", "patente_norm");
CREATE INDEX IF NOT EXISTS "camiones_dador_carga_id_idx" ON "camiones"("dador_carga_id");
CREATE UNIQUE INDEX IF NOT EXISTS "camiones_dador_carga_id_patente_norm_key" ON "camiones"("dador_carga_id", "patente_norm");
CREATE INDEX IF NOT EXISTS "choferes_dador_carga_id_idx" ON "choferes"("dador_carga_id");
CREATE UNIQUE INDEX IF NOT EXISTS "choferes_dador_carga_id_dni_norm_key" ON "choferes"("dador_carga_id", "dni_norm");

-- Foreign keys
ALTER TABLE "choferes" ADD CONSTRAINT "choferes_dador_carga_id_fkey" FOREIGN KEY ("dador_carga_id") REFERENCES "dadores_carga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "camiones" ADD CONSTRAINT "camiones_dador_carga_id_fkey" FOREIGN KEY ("dador_carga_id") REFERENCES "dadores_carga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acoplados" ADD CONSTRAINT "acoplados_dador_carga_id_fkey" FOREIGN KEY ("dador_carga_id") REFERENCES "dadores_carga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
