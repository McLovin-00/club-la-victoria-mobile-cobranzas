#!/bin/bash
set -e

# =============================================================================
# 01-init.sh - Inicializacion de usuarios y permisos - IPLAN Production
# =============================================================================
# Ejecutado automaticamente por docker-entrypoint-initdb.d en la primera
# inicializacion del volumen. Las passwords se toman de variables de entorno
# pasadas al container de PostgreSQL.
# =============================================================================

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL

-- Usuarios de aplicacion
CREATE USER bca_app WITH PASSWORD '${DB_APP_PASSWORD}';
CREATE USER bca_flowise WITH PASSWORD '${DB_FLOWISE_PASSWORD}';
CREATE USER bca_readonly WITH PASSWORD '${DB_READONLY_PASSWORD}';
CREATE USER replicator WITH REPLICATION LOGIN PASSWORD '${REPL_PASSWORD}';

-- Schemas
CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS documentos;
CREATE SCHEMA IF NOT EXISTS remitos;
CREATE SCHEMA IF NOT EXISTS flowise;

-- Permisos: bca_app (backend, documentos, remitos)
GRANT USAGE ON SCHEMA platform TO bca_app;
GRANT ALL ON ALL TABLES IN SCHEMA platform TO bca_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON TABLES TO bca_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA platform TO bca_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL ON SEQUENCES TO bca_app;

GRANT USAGE ON SCHEMA documentos TO bca_app;
GRANT ALL ON ALL TABLES IN SCHEMA documentos TO bca_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA documentos GRANT ALL ON TABLES TO bca_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA documentos TO bca_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA documentos GRANT ALL ON SEQUENCES TO bca_app;

GRANT USAGE ON SCHEMA remitos TO bca_app;
GRANT ALL ON ALL TABLES IN SCHEMA remitos TO bca_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA remitos GRANT ALL ON TABLES TO bca_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA remitos TO bca_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA remitos GRANT ALL ON SEQUENCES TO bca_app;

-- Permisos: bca_flowise (solo su schema)
GRANT USAGE ON SCHEMA flowise TO bca_flowise;
GRANT ALL ON ALL TABLES IN SCHEMA flowise TO bca_flowise;
ALTER DEFAULT PRIVILEGES IN SCHEMA flowise GRANT ALL ON TABLES TO bca_flowise;
GRANT ALL ON ALL SEQUENCES IN SCHEMA flowise TO bca_flowise;
ALTER DEFAULT PRIVILEGES IN SCHEMA flowise GRANT ALL ON SEQUENCES TO bca_flowise;

-- Permisos: bca_readonly (monitoring, reporting - solo SELECT)
GRANT USAGE ON SCHEMA platform TO bca_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA platform TO bca_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT SELECT ON TABLES TO bca_readonly;

GRANT USAGE ON SCHEMA documentos TO bca_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA documentos TO bca_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA documentos GRANT SELECT ON TABLES TO bca_readonly;

GRANT USAGE ON SCHEMA remitos TO bca_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA remitos TO bca_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA remitos GRANT SELECT ON TABLES TO bca_readonly;

EOSQL

echo "Database users and schemas initialized successfully."
