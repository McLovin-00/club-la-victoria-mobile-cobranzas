/*
  Warnings:

  - The values [EMPRESA] on the enum `EntityType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `empresa_id` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `requirement_id` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `empresa_id` on the `equipo` table. All the data in the column will be lost.
  - You are about to drop the `document_requirements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `empresa_document_config` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[dador_carga_id,driver_dni_norm,truck_plate_norm,trailer_plate_norm,valid_from]` on the table `equipo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dador_carga_id` to the `documents` table without a default value. This is not possible if the table is not empty.
  - Made the column `dador_carga_id` on table `equipo` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EntityType_new" AS ENUM ('DADOR', 'CHOFER', 'CAMION', 'ACOPLADO');
ALTER TABLE "document_templates" ALTER COLUMN "entity_type" TYPE "EntityType_new" USING ("entity_type"::text::"EntityType_new");
ALTER TABLE "documents" ALTER COLUMN "entity_type" TYPE "EntityType_new" USING ("entity_type"::text::"EntityType_new");
ALTER TABLE "cliente_document_requirement" ALTER COLUMN "entity_type" TYPE "EntityType_new" USING ("entity_type"::text::"EntityType_new");
ALTER TYPE "EntityType" RENAME TO "EntityType_old";
ALTER TYPE "EntityType_new" RENAME TO "EntityType";
-- Drop old enum only after dropping tables that still reference it
COMMIT;

-- DropForeignKey
ALTER TABLE "document_requirements" DROP CONSTRAINT IF EXISTS "document_requirements_template_id_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_requirement_id_fkey";

-- DropForeignKey
ALTER TABLE "equipo" DROP CONSTRAINT IF EXISTS "equipo_dador_carga_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "documents_empresa_id_entity_type_entity_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "equipo_empresa_id_driver_dni_norm_idx";

-- DropIndex
DROP INDEX IF EXISTS "equipo_empresa_id_driver_dni_norm_truck_plate_norm_trailer__key";

-- DropIndex
DROP INDEX IF EXISTS "equipo_empresa_id_trailer_plate_norm_idx";

-- DropIndex
DROP INDEX IF EXISTS "equipo_empresa_id_truck_plate_norm_idx";

-- Backfill: ensure dador exists and populate new column before NOT NULL changes
DO $$
DECLARE default_dador_id INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dadores_carga) THEN
    INSERT INTO dadores_carga (razon_social, cuit, activo, created_at, updated_at)
    VALUES ('Dador Default', '00000000001', true, now(), now());
  END IF;
  SELECT id INTO default_dador_id FROM dadores_carga ORDER BY id LIMIT 1;

  -- Add column nullable first for documents and backfill
  ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "dador_carga_id" INTEGER;
  UPDATE "documents" SET dador_carga_id = default_dador_id WHERE dador_carga_id IS NULL;

  -- Ensure equipos have a dador
  UPDATE "equipo" SET dador_carga_id = COALESCE(dador_carga_id, default_dador_id);
END $$;

-- AlterTable
ALTER TABLE "documents" DROP COLUMN IF EXISTS "empresa_id",
DROP COLUMN IF EXISTS "requirement_id",
ALTER COLUMN "dador_carga_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "equipo" DROP COLUMN IF EXISTS "empresa_id",
ALTER COLUMN "dador_carga_id" SET NOT NULL;

-- DropTable
DROP TABLE IF EXISTS "document_requirements" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "empresa_document_config" CASCADE;

-- Now we can safely drop the old enum type if it still exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EntityType_old') THEN
    DROP TYPE "EntityType_old";
  END IF;
END $$;

-- CreateIndex
CREATE INDEX "documents_dador_carga_id_entity_type_entity_id_idx" ON "documents"("dador_carga_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "equipo_dador_carga_id_driver_dni_norm_idx" ON "equipo"("dador_carga_id", "driver_dni_norm");

-- CreateIndex
CREATE INDEX "equipo_dador_carga_id_truck_plate_norm_idx" ON "equipo"("dador_carga_id", "truck_plate_norm");

-- CreateIndex
CREATE INDEX "equipo_dador_carga_id_trailer_plate_norm_idx" ON "equipo"("dador_carga_id", "trailer_plate_norm");

-- CreateIndex
CREATE UNIQUE INDEX "equipo_dador_carga_id_driver_dni_norm_truck_plate_norm_trai_key" ON "equipo"("dador_carga_id", "driver_dni_norm", "truck_plate_norm", "trailer_plate_norm", "valid_from");

-- AddForeignKey
ALTER TABLE "equipo" ADD CONSTRAINT "equipo_dador_carga_id_fkey" FOREIGN KEY ("dador_carga_id") REFERENCES "dadores_carga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
