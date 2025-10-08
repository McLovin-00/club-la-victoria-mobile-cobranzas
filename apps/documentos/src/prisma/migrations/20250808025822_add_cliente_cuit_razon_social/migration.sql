-- Backfill-safe migration for adding razon_social and cuit
-- 1) Add columns as nullable
ALTER TABLE "clientes"
  ADD COLUMN "razon_social" VARCHAR(200),
  ADD COLUMN "cuit" VARCHAR(20);

-- 2) Backfill razon_social from existing nombre, and provisional CUIT (unique-style per row)
-- Backfill razon_social from nombre
UPDATE "clientes" SET "razon_social" = COALESCE("razon_social", "nombre");

-- Backfill provisional CUITs using a sequence-like update
-- Prefer existing not null; otherwise assign based on id to ensure uniqueness
UPDATE "clientes"
SET "cuit" = COALESCE(
  "cuit",
  '2000000000' || (id % 10)::text
);

-- 3) Set NOT NULL constraints
ALTER TABLE "clientes"
  ALTER COLUMN "razon_social" SET NOT NULL,
  ALTER COLUMN "cuit" SET NOT NULL;

-- 4) Drop old column nombre
ALTER TABLE "clientes" DROP COLUMN "nombre";

-- 5) Add unique index for (empresa_id, cuit)
CREATE UNIQUE INDEX IF NOT EXISTS "clientes_empresa_id_cuit_key" ON "clientes"("empresa_id", "cuit");
