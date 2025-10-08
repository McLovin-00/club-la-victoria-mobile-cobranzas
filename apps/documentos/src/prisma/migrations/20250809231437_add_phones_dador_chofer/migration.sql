-- AlterTable
ALTER TABLE "choferes" ADD COLUMN     "phones" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "dadores_carga" ADD COLUMN     "phones" TEXT[] DEFAULT ARRAY[]::TEXT[];
