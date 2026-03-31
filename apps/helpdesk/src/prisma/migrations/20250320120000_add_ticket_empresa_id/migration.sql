-- Aislamiento multi-tenant: empresa de plataforma asociada al ticket
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "empresa_id" INTEGER;

CREATE INDEX IF NOT EXISTS "idx_tickets_empresa_id" ON "tickets"("empresa_id");
