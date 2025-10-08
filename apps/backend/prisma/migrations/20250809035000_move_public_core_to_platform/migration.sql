-- Move remaining core tables and enums from public to platform schema
-- 1) Create target schema
CREATE SCHEMA IF NOT EXISTS platform;

-- 2) Move enums first (safe when only core tables depend on them)
DO $$
BEGIN
  -- Only move if exists in public
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='public' AND t.typname='EndUserRole'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='platform' AND t.typname='EndUserRole'
  ) THEN
    ALTER TYPE public."EndUserRole" SET SCHEMA platform;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='public' AND t.typname='IdentifierType'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='platform' AND t.typname='IdentifierType'
  ) THEN
    ALTER TYPE public."IdentifierType" SET SCHEMA platform;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='public' AND t.typname='InstanceEstado'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='platform' AND t.typname='InstanceEstado'
  ) THEN
    ALTER TYPE public."InstanceEstado" SET SCHEMA platform;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='public' AND t.typname='PaymentStatus'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='platform' AND t.typname='PaymentStatus'
  ) THEN
    ALTER TYPE public."PaymentStatus" SET SCHEMA platform;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='public' AND t.typname='PaymentTipo'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='platform' AND t.typname='PaymentTipo'
  ) THEN
    ALTER TYPE public."PaymentTipo" SET SCHEMA platform;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='public' AND t.typname='PeriodoReseteo'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='platform' AND t.typname='PeriodoReseteo'
  ) THEN
    ALTER TYPE public."PeriodoReseteo" SET SCHEMA platform;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='public' AND t.typname='ScheduleTipo'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='platform' AND t.typname='ScheduleTipo'
  ) THEN
    ALTER TYPE public."ScheduleTipo" SET SCHEMA platform;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='public' AND t.typname='ServiceEstado'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='platform' AND t.typname='ServiceEstado'
  ) THEN
    ALTER TYPE public."ServiceEstado" SET SCHEMA platform;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='public' AND t.typname='UserRole'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE t.typtype='e' AND n.nspname='platform' AND t.typname='UserRole'
  ) THEN
    ALTER TYPE public."UserRole" SET SCHEMA platform;
  END IF;
END$$;

-- 3) Move tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'audit_logs',
    'empresas_textos',
    'end_users',
    'instances',
    'payments',
    'permisos',
    'permisos_temporales',
    'platform_users',
    'schedules',
    'services'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname=tbl) THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA platform;', tbl);
    END IF;
  END LOOP;
END$$;

-- 4) Move sequences owned by moved tables to platform
DO $$
DECLARE
  seq record;
BEGIN
  FOR seq IN (
    SELECT s.relname AS seq_name
    FROM pg_class s
    JOIN pg_namespace ns ON ns.oid = s.relnamespace
    WHERE s.relkind = 'S' AND ns.nspname = 'public'
  ) LOOP
    BEGIN
      EXECUTE format('ALTER SEQUENCE public.%I SET SCHEMA platform;', seq.seq_name);
    EXCEPTION WHEN undefined_table THEN
      -- ignore
      NULL;
    END;
  END LOOP;
END$$;


