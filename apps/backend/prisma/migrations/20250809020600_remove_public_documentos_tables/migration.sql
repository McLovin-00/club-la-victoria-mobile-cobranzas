-- Remove legacy Documentos-related tables from public schema
-- These were migrated to the `documentos` schema

-- Drop tables if they still exist (cascade to remove their FKs only)
DROP TABLE IF EXISTS public."document_requests" CASCADE;
DROP TABLE IF EXISTS public."trucks" CASCADE;
DROP TABLE IF EXISTS public."trailers" CASCADE;
DROP TABLE IF EXISTS public."drivers" CASCADE;

-- Drop enums that were only used by the removed tables
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname = 'EntidadTipo' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TYPE public."EntidadTipo"';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typname = 'DocumentEstado' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TYPE public."DocumentEstado"';
  END IF;
END$$;


