-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'OPERADOR_INTERNO';
ALTER TYPE "UserRole" ADD VALUE 'ADMIN_INTERNO';
ALTER TYPE "UserRole" ADD VALUE 'DADOR_DE_CARGA';
ALTER TYPE "UserRole" ADD VALUE 'TRANSPORTISTA';
ALTER TYPE "UserRole" ADD VALUE 'CHOFER';
ALTER TYPE "UserRole" ADD VALUE 'CLIENTE';

-- DropIndex
DROP INDEX "idx_users_activo";
