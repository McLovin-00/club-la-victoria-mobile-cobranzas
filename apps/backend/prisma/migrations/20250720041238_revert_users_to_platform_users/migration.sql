/*
  Safe migration to revert table name from users to platform_users
  - Preserves all existing data
  - Only renames table and updates indexes
*/

-- Step 1: Rename table from users to platform_users
ALTER TABLE "users" RENAME TO "platform_users";

-- Step 2: Drop old indexes
DROP INDEX IF EXISTS "idx_users_created_at";
DROP INDEX IF EXISTS "idx_users_email";
DROP INDEX IF EXISTS "idx_users_empresa_id";
DROP INDEX IF EXISTS "idx_users_role";

-- Step 3: Create new indexes with correct names
CREATE INDEX "idx_platform_users_created_at" ON "platform_users"("created_at");
CREATE INDEX "idx_platform_users_email" ON "platform_users"("email");
CREATE INDEX "idx_platform_users_empresa_id" ON "platform_users"("empresa_id");
CREATE INDEX "idx_platform_users_role" ON "platform_users"("role");
