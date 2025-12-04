-- AlterTable: Add rejection and review fields to documents
ALTER TABLE "documentos"."documents" ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP(3);
ALTER TABLE "documentos"."documents" ADD COLUMN IF NOT EXISTS "rejected_by" INTEGER;
ALTER TABLE "documentos"."documents" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
ALTER TABLE "documentos"."documents" ADD COLUMN IF NOT EXISTS "rejection_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "documentos"."documents" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3);
ALTER TABLE "documentos"."documents" ADD COLUMN IF NOT EXISTS "reviewed_by" INTEGER;
ALTER TABLE "documentos"."documents" ADD COLUMN IF NOT EXISTS "review_notes" TEXT;
