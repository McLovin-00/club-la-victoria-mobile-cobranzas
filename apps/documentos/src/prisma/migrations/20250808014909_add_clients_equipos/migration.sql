-- CreateEnum
CREATE TYPE "EquipoEstado" AS ENUM ('activa', 'finalizada');

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente_document_requirement" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "template_id" INTEGER NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "dias_anticipacion" INTEGER NOT NULL DEFAULT 0,
    "visible_chofer" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_document_requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipo" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "truck_id" INTEGER NOT NULL,
    "trailer_id" INTEGER,
    "driver_dni_norm" VARCHAR(32) NOT NULL,
    "truck_plate_norm" VARCHAR(32) NOT NULL,
    "trailer_plate_norm" VARCHAR(32),
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "estado" "EquipoEstado" NOT NULL DEFAULT 'activa',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipo_cliente" (
    "equipo_id" INTEGER NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "asignado_desde" TIMESTAMP(3) NOT NULL,
    "asignado_hasta" TIMESTAMP(3),

    CONSTRAINT "equipo_cliente_pkey" PRIMARY KEY ("equipo_id","cliente_id","asignado_desde")
);

-- CreateIndex
CREATE INDEX "clientes_empresa_id_activo_idx" ON "clientes"("empresa_id", "activo");

-- CreateIndex
CREATE INDEX "cliente_document_requirement_cliente_id_entity_type_idx" ON "cliente_document_requirement"("cliente_id", "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_document_requirement_cliente_id_template_id_entity__key" ON "cliente_document_requirement"("cliente_id", "template_id", "entity_type");

-- CreateIndex
CREATE INDEX "equipo_empresa_id_driver_dni_norm_idx" ON "equipo"("empresa_id", "driver_dni_norm");

-- CreateIndex
CREATE INDEX "equipo_empresa_id_truck_plate_norm_idx" ON "equipo"("empresa_id", "truck_plate_norm");

-- CreateIndex
CREATE INDEX "equipo_empresa_id_trailer_plate_norm_idx" ON "equipo"("empresa_id", "trailer_plate_norm");

-- CreateIndex
CREATE INDEX "equipo_valid_from_valid_to_idx" ON "equipo"("valid_from", "valid_to");

-- CreateIndex
CREATE INDEX "equipo_cliente_cliente_id_equipo_id_idx" ON "equipo_cliente"("cliente_id", "equipo_id");

-- AddForeignKey
ALTER TABLE "cliente_document_requirement" ADD CONSTRAINT "cliente_document_requirement_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_document_requirement" ADD CONSTRAINT "cliente_document_requirement_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipo_cliente" ADD CONSTRAINT "equipo_cliente_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipo_cliente" ADD CONSTRAINT "equipo_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
