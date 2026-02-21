-- Agregar campo version para locking optimista en equipo
ALTER TABLE "equipo" ADD COLUMN IF NOT EXISTS "version" INT NOT NULL DEFAULT 0;
