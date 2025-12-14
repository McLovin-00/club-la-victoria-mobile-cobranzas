-- Add activo field to platform_users table
ALTER TABLE "platform_users" ADD COLUMN IF NOT EXISTS "activo" BOOLEAN NOT NULL DEFAULT true;

-- Create index for filtering by activo
CREATE INDEX IF NOT EXISTS "idx_users_activo" ON "platform_users"("activo");
