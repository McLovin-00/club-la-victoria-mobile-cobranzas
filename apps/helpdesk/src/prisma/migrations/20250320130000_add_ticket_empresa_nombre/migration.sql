-- Agrega columna empresa_nombre para mostrar el nombre de la empresa en tickets
ALTER TABLE "helpdesk"."tickets" ADD COLUMN IF NOT EXISTS "empresa_nombre" VARCHAR(100);
