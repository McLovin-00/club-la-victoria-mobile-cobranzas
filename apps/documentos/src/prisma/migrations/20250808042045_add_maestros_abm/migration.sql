-- CreateTable
CREATE TABLE "empresas" (
    "id" SERIAL NOT NULL,
    "razon_social" VARCHAR(200) NOT NULL,
    "cuit" VARCHAR(20) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "choferes" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "dni" VARCHAR(32) NOT NULL,
    "dni_norm" VARCHAR(32) NOT NULL,
    "nombre" VARCHAR(120),
    "apellido" VARCHAR(120),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "choferes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camiones" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "patente" VARCHAR(32) NOT NULL,
    "patente_norm" VARCHAR(32) NOT NULL,
    "marca" VARCHAR(120),
    "modelo" VARCHAR(120),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "camiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acoplados" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "patente" VARCHAR(32) NOT NULL,
    "patente_norm" VARCHAR(32) NOT NULL,
    "tipo" VARCHAR(120),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acoplados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cuit_key" ON "empresas"("cuit");

-- CreateIndex
CREATE INDEX "choferes_empresa_id_idx" ON "choferes"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "choferes_empresa_id_dni_norm_key" ON "choferes"("empresa_id", "dni_norm");

-- CreateIndex
CREATE INDEX "camiones_empresa_id_idx" ON "camiones"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "camiones_empresa_id_patente_norm_key" ON "camiones"("empresa_id", "patente_norm");

-- CreateIndex
CREATE INDEX "acoplados_empresa_id_idx" ON "acoplados"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "acoplados_empresa_id_patente_norm_key" ON "acoplados"("empresa_id", "patente_norm");

-- AddForeignKey
ALTER TABLE "choferes" ADD CONSTRAINT "choferes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camiones" ADD CONSTRAINT "camiones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acoplados" ADD CONSTRAINT "acoplados_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
