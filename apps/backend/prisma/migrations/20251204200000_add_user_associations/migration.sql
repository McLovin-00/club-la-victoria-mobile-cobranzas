-- Agregar campos de asociación por rol al modelo User
ALTER TABLE "platform_users" ADD COLUMN IF NOT EXISTS "dador_carga_id" INTEGER;
ALTER TABLE "platform_users" ADD COLUMN IF NOT EXISTS "empresa_transportista_id" INTEGER;
ALTER TABLE "platform_users" ADD COLUMN IF NOT EXISTS "chofer_id" INTEGER;
ALTER TABLE "platform_users" ADD COLUMN IF NOT EXISTS "cliente_id" INTEGER;
ALTER TABLE "platform_users" ADD COLUMN IF NOT EXISTS "creado_por_id" INTEGER;

-- Índices para búsquedas por asociación
CREATE INDEX IF NOT EXISTS "idx_users_dador_carga_id" ON "platform_users"("dador_carga_id");
CREATE INDEX IF NOT EXISTS "idx_users_empresa_transportista_id" ON "platform_users"("empresa_transportista_id");
