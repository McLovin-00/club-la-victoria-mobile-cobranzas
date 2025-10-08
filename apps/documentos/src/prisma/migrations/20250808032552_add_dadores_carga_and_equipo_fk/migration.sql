-- AlterTable
ALTER TABLE "equipo" ADD COLUMN     "dador_carga_id" INTEGER;

-- CreateTable
CREATE TABLE "dadores_carga" (
    "id" SERIAL NOT NULL,
    "razon_social" VARCHAR(200) NOT NULL,
    "cuit" VARCHAR(20) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dadores_carga_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dadores_carga_cuit_key" ON "dadores_carga"("cuit");

-- CreateIndex
CREATE INDEX "equipo_dador_carga_id_idx" ON "equipo"("dador_carga_id");

-- AddForeignKey
ALTER TABLE "equipo" ADD CONSTRAINT "equipo_dador_carga_id_fkey" FOREIGN KEY ("dador_carga_id") REFERENCES "dadores_carga"("id") ON DELETE SET NULL ON UPDATE CASCADE;
