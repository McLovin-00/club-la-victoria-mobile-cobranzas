-- Agregar campo deleted_at para soft delete de usuarios
ALTER TABLE "platform_users" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);

-- Crear tabla de refresh tokens
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INT NOT NULL,
  "token" VARCHAR(128) UNIQUE NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) DEFAULT NOW(),
  CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "platform_users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_token" ON "refresh_tokens" ("token");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user" ON "refresh_tokens" ("user_id");
