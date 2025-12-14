-- Add must_change_password and password_changed_at to platform_users
ALTER TABLE "platform_users"
ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "platform_users"
ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMPTZ(6);


