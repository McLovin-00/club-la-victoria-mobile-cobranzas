-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentStatus" ADD VALUE 'CLASIFICANDO';
ALTER TYPE "DocumentStatus" ADD VALUE 'PENDIENTE_APROBACION';

-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'EMPRESA_TRANSPORTISTA';

-- AlterTable
ALTER TABLE "acoplados" ADD COLUMN     "empresa_transportista_id" INTEGER;

-- AlterTable
ALTER TABLE "camiones" ADD COLUMN     "empresa_transportista_id" INTEGER;

-- AlterTable
ALTER TABLE "choferes" ADD COLUMN     "empresa_transportista_id" INTEGER;

-- AlterTable
ALTER TABLE "equipo" ADD COLUMN     "empresa_transportista_id" INTEGER;

-- CreateTable
CREATE TABLE "empresas_transportistas" (
    "id" SERIAL NOT NULL,
    "dador_carga_id" INTEGER NOT NULL,
    "tenant_empresa_id" INTEGER NOT NULL,
    "razon_social" VARCHAR(200) NOT NULL,
    "cuit" VARCHAR(20) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_transportistas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_classifications" (
    "id" SERIAL NOT NULL,
    "document_id" INTEGER NOT NULL,
    "detected_entity_type" "EntityType",
    "detected_entity_id" INTEGER,
    "detected_expiration" TIMESTAMP(3),
    "detected_document_type" VARCHAR(100),
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "ai_response" JSONB,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "empresas_transportistas_tenant_empresa_id_dador_carga_id_idx" ON "empresas_transportistas"("tenant_empresa_id", "dador_carga_id");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_transportistas_tenant_empresa_id_dador_carga_id_cu_key" ON "empresas_transportistas"("tenant_empresa_id", "dador_carga_id", "cuit");

-- CreateIndex
CREATE UNIQUE INDEX "document_classifications_document_id_key" ON "document_classifications"("document_id");

-- CreateIndex
CREATE INDEX "document_classifications_detected_entity_type_confidence_idx" ON "document_classifications"("detected_entity_type", "confidence");

-- CreateIndex
CREATE INDEX "document_classifications_reviewed_at_idx" ON "document_classifications"("reviewed_at");

-- AddForeignKey
ALTER TABLE "choferes" ADD CONSTRAINT "choferes_empresa_transportista_id_fkey" FOREIGN KEY ("empresa_transportista_id") REFERENCES "empresas_transportistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camiones" ADD CONSTRAINT "camiones_empresa_transportista_id_fkey" FOREIGN KEY ("empresa_transportista_id") REFERENCES "empresas_transportistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acoplados" ADD CONSTRAINT "acoplados_empresa_transportista_id_fkey" FOREIGN KEY ("empresa_transportista_id") REFERENCES "empresas_transportistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipo" ADD CONSTRAINT "equipo_empresa_transportista_id_fkey" FOREIGN KEY ("empresa_transportista_id") REFERENCES "empresas_transportistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresas_transportistas" ADD CONSTRAINT "empresas_transportistas_dador_carga_id_fkey" FOREIGN KEY ("dador_carga_id") REFERENCES "dadores_carga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_classifications" ADD CONSTRAINT "document_classifications_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
