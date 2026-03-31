-- Agrega los campos de vinculación de Telegram a la tabla real de usuarios de plataforma.
ALTER TABLE "platform"."platform_users"
ADD COLUMN "telegram_username" VARCHAR(255),
ADD COLUMN "telegram_user_id" BIGINT,
ADD COLUMN "telegram_linked_at" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "platform_users_telegram_username_key"
ON "platform"."platform_users"("telegram_username");

CREATE UNIQUE INDEX "platform_users_telegram_user_id_key"
ON "platform"."platform_users"("telegram_user_id");
