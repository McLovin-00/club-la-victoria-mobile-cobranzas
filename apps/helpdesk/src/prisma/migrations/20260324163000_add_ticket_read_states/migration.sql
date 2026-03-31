-- Persistencia de lectura por usuario/ticket para badge y realtime coherente

CREATE TABLE IF NOT EXISTS "ticket_read_states" (
    "id" SERIAL NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "last_read_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ticket_read_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ticket_read_states_ticket_id_user_id_key"
  ON "ticket_read_states"("ticket_id", "user_id");

CREATE INDEX IF NOT EXISTS "idx_ticket_read_states_user_id"
  ON "ticket_read_states"("user_id");

CREATE INDEX IF NOT EXISTS "idx_ticket_read_states_ticket_id"
  ON "ticket_read_states"("ticket_id");

ALTER TABLE "ticket_read_states"
  ADD CONSTRAINT "ticket_read_states_ticket_id_fkey"
  FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
