/*
  Warnings:

  - You are about to drop the column `empresa_id` on the `clientes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[cuit]` on the table `clientes` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "clientes_empresa_id_activo_idx";

-- DropIndex
DROP INDEX "clientes_empresa_id_cuit_key";

-- AlterTable
ALTER TABLE "clientes" DROP COLUMN "empresa_id";

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cuit_key" ON "clientes"("cuit");
