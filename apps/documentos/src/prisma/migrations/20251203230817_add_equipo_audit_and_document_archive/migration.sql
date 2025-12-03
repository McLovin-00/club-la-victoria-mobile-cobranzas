-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "archive_reason" VARCHAR(50),
ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "archived_by" INTEGER;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "tenant_empresa_id" INTEGER,
    "accion" VARCHAR(150) NOT NULL,
    "detalles" JSONB,
    "user_id" INTEGER,
    "user_role" VARCHAR(50),
    "status_code" INTEGER NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipo_audit_logs" (
    "id" SERIAL NOT NULL,
    "equipo_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "accion" VARCHAR(32) NOT NULL,
    "campo_modificado" VARCHAR(50),
    "valor_anterior" JSONB,
    "valor_nuevo" JSONB,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipo_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_tenant_empresa_id_created_at_idx" ON "audit_logs"("tenant_empresa_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_accion_created_at_idx" ON "audit_logs"("accion", "created_at");

-- CreateIndex
CREATE INDEX "equipo_audit_logs_equipo_id_idx" ON "equipo_audit_logs"("equipo_id");

-- CreateIndex
CREATE INDEX "equipo_audit_logs_usuario_id_idx" ON "equipo_audit_logs"("usuario_id");

-- CreateIndex
CREATE INDEX "equipo_audit_logs_created_at_idx" ON "equipo_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "documents_archived_idx" ON "documents"("archived");

-- AddForeignKey
ALTER TABLE "equipo_audit_logs" ADD CONSTRAINT "equipo_audit_logs_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
