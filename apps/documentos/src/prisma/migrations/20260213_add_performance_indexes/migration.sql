-- Migración: Índices de performance para documentos
-- Fecha: 2026-02-13
-- Descripción: Agrega índices faltantes detectados en auditoría de optimización DB
-- Impacto: Solo CREATE INDEX CONCURRENTLY, no bloquea escrituras

-- ==========================================================================
-- 1. Índices B-tree faltantes en tabla documents
-- ==========================================================================

-- Índice para ordenamiento por fecha de subida (usado en todos los listados)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_uploaded_at_desc
  ON documents (uploaded_at DESC);

-- Índice compuesto para consultas de compliance batch
-- (filtran por dador + template + entity sin pasar por tenant primero)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_dador_template_entity
  ON documents (dador_carga_id, template_id, entity_type, entity_id);

-- ==========================================================================
-- 2. Extensión pg_trgm para búsquedas textuales ILIKE
-- ==========================================================================

-- Habilitar extensión de trigramas (necesaria para índices GIN con ILIKE)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ==========================================================================
-- 3. Índices GIN (trigram) para búsquedas textuales en maestros
-- Permiten que consultas con ILIKE '%término%' usen índice
-- en lugar de sequential scan
-- ==========================================================================

-- Choferes: búsqueda por nombre y apellido
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_choferes_nombre_trgm
  ON choferes USING gin (nombre gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_choferes_apellido_trgm
  ON choferes USING gin (apellido gin_trgm_ops);

-- Camiones: búsqueda por marca
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_camiones_marca_trgm
  ON camiones USING gin (marca gin_trgm_ops);

-- Acoplados: búsqueda por tipo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_acoplados_tipo_trgm
  ON acoplados USING gin (tipo gin_trgm_ops);

-- Empresas Transportistas: búsqueda por razón social
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_empresas_transp_razon_social_trgm
  ON empresas_transportistas USING gin (razon_social gin_trgm_ops);

-- Clientes: búsqueda por razón social
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientes_razon_social_trgm
  ON clientes USING gin (razon_social gin_trgm_ops);

-- Dadores de Carga: búsqueda por razón social
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dadores_razon_social_trgm
  ON dadores_carga USING gin (razon_social gin_trgm_ops);

-- Audit logs: búsqueda por email y path
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_email_trgm
  ON audit_logs USING gin (user_email gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_path_trgm
  ON audit_logs USING gin (path gin_trgm_ops);
