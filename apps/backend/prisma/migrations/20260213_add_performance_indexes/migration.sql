-- Índices de performance para backend
-- Ref: INFORME_OPTIMIZACION_BASE_DE_DATOS.md items 7, 8, 9

-- Item 7: audit_logs - índice compuesto para consultas por instancia + rango temporal
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_audit_logs_instancia_timestamp"
  ON "audit_logs" ("instancia_id", "timestamp" DESC);

-- Item 8: payments - índice para búsquedas por cliente y estado
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payments_client_status"
  ON "payments" ("clientId", "status");

-- Item 9: schedules - índice para consultas de agenda por empresa y rango de fechas
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_schedules_empresa_fecha"
  ON "schedules" ("empresaId", "fechaInicio");
