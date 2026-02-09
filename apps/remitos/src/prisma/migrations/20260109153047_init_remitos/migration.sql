-- CreateEnum
CREATE TYPE "RemitoEstado" AS ENUM ('PENDIENTE_ANALISIS', 'EN_ANALISIS', 'PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO', 'ERROR_ANALISIS');

-- CreateEnum
CREATE TYPE "TipoImagen" AS ENUM ('REMITO_PRINCIPAL', 'REMITO_REVERSO', 'TICKET_DESTINO', 'ADICIONAL');

-- CreateEnum
CREATE TYPE "RemitoAction" AS ENUM ('CREADO', 'IMAGEN_AGREGADA', 'ANALISIS_INICIADO', 'ANALISIS_COMPLETADO', 'ANALISIS_FALLIDO', 'DATOS_EDITADOS', 'EQUIPO_VINCULADO', 'APROBADO', 'RECHAZADO', 'REPROCESAR_SOLICITADO');

-- CreateTable
CREATE TABLE "remitos" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "numero_remito" VARCHAR(50),
    "fecha_operacion" TIMESTAMP(3),
    "emisor_nombre" VARCHAR(200),
    "emisor_detalle" VARCHAR(200),
    "cliente_nombre" VARCHAR(200),
    "producto" VARCHAR(300),
    "transportista_nombre" VARCHAR(200),
    "chofer_nombre" VARCHAR(200),
    "chofer_dni" VARCHAR(20),
    "patente_chasis" VARCHAR(20),
    "patente_acoplado" VARCHAR(20),
    "peso_origen_bruto" DECIMAL(12,2),
    "peso_origen_tara" DECIMAL(12,2),
    "peso_origen_neto" DECIMAL(12,2),
    "peso_destino_bruto" DECIMAL(12,2),
    "peso_destino_tara" DECIMAL(12,2),
    "peso_destino_neto" DECIMAL(12,2),
    "tiene_ticket_destino" BOOLEAN NOT NULL DEFAULT false,
    "equipo_id" INTEGER,
    "chofer_id" INTEGER,
    "camion_id" INTEGER,
    "acoplado_id" INTEGER,
    "empresa_transportista_id" INTEGER,
    "dador_carga_id" INTEGER NOT NULL,
    "tenant_empresa_id" INTEGER NOT NULL,
    "chofer_cargador_dni" VARCHAR(20),
    "chofer_cargador_nombre" VARCHAR(100),
    "chofer_cargador_apellido" VARCHAR(100),
    "estado" "RemitoEstado" NOT NULL DEFAULT 'PENDIENTE_ANALISIS',
    "cargado_por_user_id" INTEGER NOT NULL,
    "cargado_por_rol" VARCHAR(50) NOT NULL,
    "aprobado_por_user_id" INTEGER,
    "aprobado_at" TIMESTAMP(3),
    "rechazado_por_user_id" INTEGER,
    "rechazado_at" TIMESTAMP(3),
    "motivo_rechazo" TEXT,
    "datos_originales_ia" JSONB,
    "confianza_ia" DECIMAL(5,2),
    "campos_detectados" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "errores_analisis" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "analizado_at" TIMESTAMP(3),

    CONSTRAINT "remitos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remito_imagenes" (
    "id" SERIAL NOT NULL,
    "remito_id" INTEGER NOT NULL,
    "bucket_name" VARCHAR(100) NOT NULL,
    "object_key" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "tipo" "TipoImagen" NOT NULL DEFAULT 'REMITO_PRINCIPAL',
    "orden" INTEGER NOT NULL DEFAULT 1,
    "procesado_por_ia" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remito_imagenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remito_history" (
    "id" SERIAL NOT NULL,
    "remito_id" INTEGER NOT NULL,
    "action" "RemitoAction" NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_role" VARCHAR(50) NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remito_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remito_system_config" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "description" VARCHAR(255),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "remito_system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "remitos_estado_idx" ON "remitos"("estado");

-- CreateIndex
CREATE INDEX "remitos_dador_carga_id_idx" ON "remitos"("dador_carga_id");

-- CreateIndex
CREATE INDEX "remitos_tenant_empresa_id_idx" ON "remitos"("tenant_empresa_id");

-- CreateIndex
CREATE INDEX "remitos_equipo_id_idx" ON "remitos"("equipo_id");

-- CreateIndex
CREATE INDEX "remitos_numero_remito_idx" ON "remitos"("numero_remito");

-- CreateIndex
CREATE INDEX "remitos_patente_chasis_idx" ON "remitos"("patente_chasis");

-- CreateIndex
CREATE INDEX "remitos_patente_acoplado_idx" ON "remitos"("patente_acoplado");

-- CreateIndex
CREATE INDEX "remitos_fecha_operacion_idx" ON "remitos"("fecha_operacion");

-- CreateIndex
CREATE INDEX "remitos_cargado_por_user_id_idx" ON "remitos"("cargado_por_user_id");

-- CreateIndex
CREATE INDEX "remito_imagenes_remito_id_idx" ON "remito_imagenes"("remito_id");

-- CreateIndex
CREATE INDEX "remito_history_remito_id_idx" ON "remito_history"("remito_id");

-- CreateIndex
CREATE INDEX "remito_history_created_at_idx" ON "remito_history"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "remito_system_config_key_key" ON "remito_system_config"("key");

-- AddForeignKey
ALTER TABLE "remito_imagenes" ADD CONSTRAINT "remito_imagenes_remito_id_fkey" FOREIGN KEY ("remito_id") REFERENCES "remitos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remito_history" ADD CONSTRAINT "remito_history_remito_id_fkey" FOREIGN KEY ("remito_id") REFERENCES "remitos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
