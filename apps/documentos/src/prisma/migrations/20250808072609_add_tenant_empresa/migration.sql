/*
  Warnings:

  - A unique constraint covering the columns `[tenant_empresa_id,dador_carga_id,patente_norm]` on the table `acoplados` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_empresa_id,dador_carga_id,patente_norm]` on the table `camiones` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_empresa_id,dador_carga_id,dni_norm]` on the table `choferes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_empresa_id,cliente_id,template_id,entity_type]` on the table `cliente_document_requirement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_empresa_id,cuit]` on the table `clientes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_empresa_id,cuit]` on the table `dadores_carga` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_empresa_id,dador_carga_id,driver_dni_norm,truck_plate_norm,trailer_plate_norm,valid_from]` on the table `equipo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenant_empresa_id` to the `acoplados` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_empresa_id` to the `camiones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_empresa_id` to the `choferes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_empresa_id` to the `cliente_document_requirement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_empresa_id` to the `clientes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_empresa_id` to the `dadores_carga` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_empresa_id` to the `documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_empresa_id` to the `equipo` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "acoplados_dador_carga_id_idx";

-- DropIndex
DROP INDEX "acoplados_dador_carga_id_patente_norm_key";

-- DropIndex
DROP INDEX "camiones_dador_carga_id_idx";

-- DropIndex
DROP INDEX "camiones_dador_carga_id_patente_norm_key";

-- DropIndex
DROP INDEX "choferes_dador_carga_id_dni_norm_key";

-- DropIndex
DROP INDEX "choferes_dador_carga_id_idx";

-- DropIndex
DROP INDEX "cliente_document_requirement_cliente_id_entity_type_idx";

-- DropIndex
DROP INDEX "cliente_document_requirement_cliente_id_template_id_entity__key";

-- DropIndex
DROP INDEX "clientes_cuit_key";

-- DropIndex
DROP INDEX "dadores_carga_cuit_key";

-- DropIndex
DROP INDEX "documents_dador_carga_id_entity_type_entity_id_idx";

-- DropIndex
DROP INDEX "equipo_dador_carga_id_driver_dni_norm_idx";

-- DropIndex
DROP INDEX "equipo_dador_carga_id_driver_dni_norm_truck_plate_norm_trai_key";

-- DropIndex
DROP INDEX "equipo_dador_carga_id_idx";

-- DropIndex
DROP INDEX "equipo_dador_carga_id_trailer_plate_norm_idx";

-- DropIndex
DROP INDEX "equipo_dador_carga_id_truck_plate_norm_idx";

-- AlterTable with backfill
ALTER TABLE "acoplados" ADD COLUMN     "tenant_empresa_id" INTEGER;
UPDATE "acoplados" SET "tenant_empresa_id" = 1 WHERE "tenant_empresa_id" IS NULL;
ALTER TABLE "acoplados" ALTER COLUMN "tenant_empresa_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "camiones" ADD COLUMN     "tenant_empresa_id" INTEGER;
UPDATE "camiones" SET "tenant_empresa_id" = 1 WHERE "tenant_empresa_id" IS NULL;
ALTER TABLE "camiones" ALTER COLUMN "tenant_empresa_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "choferes" ADD COLUMN     "tenant_empresa_id" INTEGER;
UPDATE "choferes" SET "tenant_empresa_id" = 1 WHERE "tenant_empresa_id" IS NULL;
ALTER TABLE "choferes" ALTER COLUMN "tenant_empresa_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "cliente_document_requirement" ADD COLUMN     "tenant_empresa_id" INTEGER;
UPDATE "cliente_document_requirement" SET "tenant_empresa_id" = 1 WHERE "tenant_empresa_id" IS NULL;
ALTER TABLE "cliente_document_requirement" ALTER COLUMN "tenant_empresa_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "tenant_empresa_id" INTEGER;
UPDATE "clientes" SET "tenant_empresa_id" = 1 WHERE "tenant_empresa_id" IS NULL;
ALTER TABLE "clientes" ALTER COLUMN "tenant_empresa_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "dadores_carga" ADD COLUMN     "tenant_empresa_id" INTEGER;
UPDATE "dadores_carga" SET "tenant_empresa_id" = 1 WHERE "tenant_empresa_id" IS NULL;
ALTER TABLE "dadores_carga" ALTER COLUMN "tenant_empresa_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "tenant_empresa_id" INTEGER;
UPDATE "documents" SET "tenant_empresa_id" = 1 WHERE "tenant_empresa_id" IS NULL;
ALTER TABLE "documents" ALTER COLUMN "tenant_empresa_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "equipo" ADD COLUMN     "tenant_empresa_id" INTEGER;
UPDATE "equipo" SET "tenant_empresa_id" = 1 WHERE "tenant_empresa_id" IS NULL;
ALTER TABLE "equipo" ALTER COLUMN "tenant_empresa_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "acoplados_tenant_empresa_id_dador_carga_id_idx" ON "acoplados"("tenant_empresa_id", "dador_carga_id");

-- CreateIndex
CREATE UNIQUE INDEX "acoplados_tenant_empresa_id_dador_carga_id_patente_norm_key" ON "acoplados"("tenant_empresa_id", "dador_carga_id", "patente_norm");

-- CreateIndex
CREATE INDEX "camiones_tenant_empresa_id_dador_carga_id_idx" ON "camiones"("tenant_empresa_id", "dador_carga_id");

-- CreateIndex
CREATE UNIQUE INDEX "camiones_tenant_empresa_id_dador_carga_id_patente_norm_key" ON "camiones"("tenant_empresa_id", "dador_carga_id", "patente_norm");

-- CreateIndex
CREATE INDEX "choferes_tenant_empresa_id_dador_carga_id_idx" ON "choferes"("tenant_empresa_id", "dador_carga_id");

-- CreateIndex
CREATE UNIQUE INDEX "choferes_tenant_empresa_id_dador_carga_id_dni_norm_key" ON "choferes"("tenant_empresa_id", "dador_carga_id", "dni_norm");

-- CreateIndex
CREATE INDEX "cliente_document_requirement_tenant_empresa_id_cliente_id_e_idx" ON "cliente_document_requirement"("tenant_empresa_id", "cliente_id", "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_document_requirement_tenant_empresa_id_cliente_id_t_key" ON "cliente_document_requirement"("tenant_empresa_id", "cliente_id", "template_id", "entity_type");

-- CreateIndex
CREATE INDEX "clientes_tenant_empresa_id_idx" ON "clientes"("tenant_empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_tenant_empresa_id_cuit_key" ON "clientes"("tenant_empresa_id", "cuit");

-- CreateIndex
CREATE INDEX "dadores_carga_tenant_empresa_id_idx" ON "dadores_carga"("tenant_empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "dadores_carga_tenant_empresa_id_cuit_key" ON "dadores_carga"("tenant_empresa_id", "cuit");

-- CreateIndex
CREATE INDEX "documents_tenant_empresa_id_dador_carga_id_entity_type_enti_idx" ON "documents"("tenant_empresa_id", "dador_carga_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "equipo_tenant_empresa_id_dador_carga_id_driver_dni_norm_idx" ON "equipo"("tenant_empresa_id", "dador_carga_id", "driver_dni_norm");

-- CreateIndex
CREATE INDEX "equipo_tenant_empresa_id_dador_carga_id_truck_plate_norm_idx" ON "equipo"("tenant_empresa_id", "dador_carga_id", "truck_plate_norm");

-- CreateIndex
CREATE INDEX "equipo_tenant_empresa_id_dador_carga_id_trailer_plate_norm_idx" ON "equipo"("tenant_empresa_id", "dador_carga_id", "trailer_plate_norm");

-- CreateIndex
CREATE INDEX "equipo_tenant_empresa_id_dador_carga_id_idx" ON "equipo"("tenant_empresa_id", "dador_carga_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipo_tenant_empresa_id_dador_carga_id_driver_dni_norm_tru_key" ON "equipo"("tenant_empresa_id", "dador_carga_id", "driver_dni_norm", "truck_plate_norm", "trailer_plate_norm", "valid_from");
