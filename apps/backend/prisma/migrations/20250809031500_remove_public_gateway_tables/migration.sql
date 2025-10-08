-- Remove legacy Gateway tables from public schema (migrated to schema gateway)

DROP TABLE IF EXISTS public."gateway_permissions" CASCADE;
DROP TABLE IF EXISTS public."gateway_whitelists" CASCADE;
DROP TABLE IF EXISTS public."gateway_clients" CASCADE;
DROP TABLE IF EXISTS public."canales_de_paso" CASCADE;


