-- Migración: Vistas Materializadas para Performance Optimizada
-- Propósito: Optimizar consultas del dashboard de semáforos

-- Vista materializada para resumen de estados por empresa
CREATE MATERIALIZED VIEW IF NOT EXISTS document_status_summary AS
SELECT 
  d.tenant_empresa_id AS tenant_id,
  d.dador_carga_id    AS empresa_id,
  d.entity_type,
  d.entity_id,
  COUNT(*) FILTER (WHERE d.status = 'VENCIDO' OR d.status = 'RECHAZADO') AS red_count,
  COUNT(*) FILTER (WHERE d.status = 'PENDIENTE' OR d.status = 'VALIDANDO') AS yellow_count,
  COUNT(*) FILTER (WHERE d.status = 'APROBADO') AS green_count,
  COUNT(*) AS total_count,
  NOW() AS last_updated
FROM documents d
GROUP BY 1,2,3,4;

-- Índices para performance óptima
CREATE UNIQUE INDEX IF NOT EXISTS document_status_summary_unique_idx 
ON document_status_summary (tenant_id, empresa_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_document_status_summary_empresa 
ON document_status_summary (empresa_id);

CREATE INDEX IF NOT EXISTS idx_document_status_summary_updated 
ON document_status_summary (last_updated);

-- Función para refrescar la vista materializada
CREATE OR REPLACE FUNCTION refresh_document_status_summary()
RETURNS void AS $$
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY document_status_summary;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW document_status_summary;
  END;
END;
$$ LANGUAGE plpgsql;

-- Vista para estadísticas globales (solo lectura)
CREATE OR REPLACE VIEW global_document_stats AS
SELECT 
  COUNT(*) AS total_documents,
  COUNT(*) FILTER (WHERE status = 'PENDIENTE')  AS pending_count,
  COUNT(*) FILTER (WHERE status = 'VALIDANDO')  AS validating_count,
  COUNT(*) FILTER (WHERE status = 'APROBADO')   AS approved_count,
  COUNT(*) FILTER (WHERE status = 'RECHAZADO')  AS rejected_count,
  COUNT(*) FILTER (WHERE status = 'VENCIDO')    AS expired_count,
  COUNT(DISTINCT dador_carga_id)                AS active_companies,
  COALESCE(AVG(EXTRACT(EPOCH FROM (validated_at - uploaded_at))/3600),0) AS avg_processing_hours
FROM documents;

-- Vista para alertas críticas (entidades con documentos rojos)
CREATE OR REPLACE VIEW critical_alerts AS
SELECT 
  dss.empresa_id,
  dss.entity_type,
  dss.entity_id,
  dss.red_count,
  dss.total_count,
  ROUND((dss.red_count::decimal / NULLIF(dss.total_count::decimal,0)) * 100, 1) AS red_percentage,
  dss.last_updated
FROM document_status_summary dss
WHERE dss.red_count > 0
ORDER BY dss.red_count DESC, dss.last_updated DESC;

-- Trigger para actualizar la vista materializada automáticamente
CREATE OR REPLACE FUNCTION trigger_refresh_document_status()
RETURNS trigger AS $$
BEGIN
  -- Refrescar en background para no bloquear
  PERFORM pg_notify('refresh_materialized_view', 'document_status_summary');
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a la tabla documents
DROP TRIGGER IF EXISTS documents_status_change ON documents;
CREATE TRIGGER documents_status_change
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_document_status();

-- Comentarios para documentación
COMMENT ON MATERIALIZED VIEW document_status_summary IS 
'Vista materializada optimizada para dashboard de semáforos. Refrescar periódicamente o vía trigger.';

COMMENT ON VIEW global_document_stats IS 
'Estadísticas globales del sistema de documentos en tiempo real.';

COMMENT ON VIEW critical_alerts IS 
'Vista de entidades que requieren atención inmediata (documentos rojos).';

-- Datos iniciales para la vista materializada
REFRESH MATERIALIZED VIEW document_status_summary;