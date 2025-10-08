-- AlterTable
ALTER TABLE "document_classifications" ALTER COLUMN "detected_entity_id" SET DATA TYPE VARCHAR(100);

-- CreateTable
CREATE TABLE "equipo_history" (
    "id" SERIAL NOT NULL,
    "equipo_id" INTEGER NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "component" VARCHAR(16) NOT NULL,
    "origin_equipo_id" INTEGER,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipo_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipo_history_equipo_id_created_at_idx" ON "equipo_history"("equipo_id", "created_at");

-- AddForeignKey
ALTER TABLE "equipo_history" ADD CONSTRAINT "equipo_history_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
