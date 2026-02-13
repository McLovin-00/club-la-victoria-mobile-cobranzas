-- Migración: Índices de performance para remitos
-- Fecha: 2026-02-13
-- Descripción: Agrega índices faltantes detectados en auditoría de optimización DB
-- Impacto: Solo CREATE INDEX CONCURRENTLY, no bloquea escrituras

-- Índice compuesto para listado paginado (la consulta más frecuente del módulo)
-- Cubre: WHERE tenantEmpresaId = X ORDER BY createdAt DESC LIMIT N OFFSET M
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_remitos_tenant_created_at
  ON remitos (tenant_empresa_id, created_at DESC);

-- Índice compuesto para listado filtrado por estado
-- Cubre: WHERE tenantEmpresaId = X AND dadorCargaId = Y AND estado = Z
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_remitos_tenant_dador_estado
  ON remitos (tenant_empresa_id, dador_carga_id, estado);

-- Índice para búsquedas textuales en remitos (si se necesitan en el futuro)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Búsqueda por nombre de chofer extraído por IA
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_remitos_chofer_nombre_trgm
  ON remitos USING gin (chofer_nombre gin_trgm_ops);

-- Búsqueda por nombre de emisor
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_remitos_emisor_nombre_trgm
  ON remitos USING gin (emisor_nombre gin_trgm_ops);

-- Búsqueda por nombre de cliente
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_remitos_cliente_nombre_trgm
  ON remitos USING gin (cliente_nombre gin_trgm_ops);

-- Búsqueda por nombre de transportista
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_remitos_transportista_nombre_trgm
  ON remitos USING gin (transportista_nombre gin_trgm_ops);
