/*
  Safe migration to rename platform_users model and unify role enums
  - Preserves existing role data by mapping values
  - Replaces PlatformUserRole with unified UserRole enum
*/

-- Step 1: Create the new UserRole enum with unified values
CREATE TYPE "UserRole_new" AS ENUM ('SUPERADMIN', 'ADMIN', 'OPERATOR');

-- Step 2: Add temporary column to store converted role values
ALTER TABLE "platform_users" ADD COLUMN "role_new" "UserRole_new";

-- Step 3: Convert existing role values safely
-- PlatformUserRole.superadmin → UserRole.SUPERADMIN
-- PlatformUserRole.admin → UserRole.ADMIN  
-- PlatformUserRole.operator → UserRole.OPERATOR
UPDATE "platform_users" 
SET "role_new" = CASE 
  WHEN "role"::text = 'superadmin' THEN 'SUPERADMIN'::"UserRole_new"
  WHEN "role"::text = 'admin' THEN 'ADMIN'::"UserRole_new"
  WHEN "role"::text = 'operator' THEN 'OPERATOR'::"UserRole_new"
  ELSE 'OPERATOR'::"UserRole_new"  -- Default fallback
END;

-- Step 4: Drop the old role column and rename new column
ALTER TABLE "platform_users" DROP COLUMN "role";
ALTER TABLE "platform_users" RENAME COLUMN "role_new" TO "role";

-- Step 5: Set default value and NOT NULL constraint
ALTER TABLE "platform_users" ALTER COLUMN "role" SET DEFAULT 'OPERATOR';
ALTER TABLE "platform_users" ALTER COLUMN "role" SET NOT NULL;

-- Step 6: Replace old UserRole enum with new one
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- Step 7: Drop the old PlatformUserRole enum
DROP TYPE "PlatformUserRole";

-- Step 8: Rename the table from platform_users to users
ALTER TABLE "platform_users" RENAME TO "users";

-- Step 9: Recreate indexes with new names on the renamed table
DROP INDEX IF EXISTS "idx_platform_users_created_at";
DROP INDEX IF EXISTS "idx_platform_users_email";
DROP INDEX IF EXISTS "idx_platform_users_empresa_id";
DROP INDEX IF EXISTS "idx_platform_users_role";

CREATE INDEX "idx_users_created_at" ON "users"("created_at");
CREATE INDEX "idx_users_email" ON "users"("email");
CREATE INDEX "idx_users_empresa_id" ON "users"("empresa_id");
CREATE INDEX "idx_users_role" ON "users"("role");

-- Step 10: Update foreign key constraints to point to the renamed table
-- Update foreign keys in permisos table
ALTER TABLE "permisos" DROP CONSTRAINT IF EXISTS "permisos_platform_user_id_fkey";
ALTER TABLE "permisos" ADD CONSTRAINT "permisos_platform_user_id_fkey" 
  FOREIGN KEY ("platform_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update foreign keys in audit_logs table  
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_platform_admin_id_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_platform_admin_id_fkey"
  FOREIGN KEY ("platform_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
