-- Migration: Normalizar expiresAt a fin de día Argentina (UTC-3)
--
-- Problema: expiresAt se almacenaba como medianoche UTC (00:00:00Z),
-- lo que equivale a las 21:00 del día anterior en Argentina.
-- Un documento que "vence el 15/01" se marcaba como vencido a las 21:00 del 14/01.
--
-- Solución: ajustar todas las fechas de vencimiento al fin del día en Argentina:
-- 23:59:59.999 UTC-3 = 02:59:59.999 UTC del día siguiente.
--
-- Solo se ajustan documentos cuya hora UTC es exactamente 00:00:00, 03:00:00 o 12:00:00
-- (los formatos comunes de almacenamiento previo). Documentos ya normalizados
-- (hora UTC = 02:59) no se tocan (idempotencia).

-- Paso 1: Documentos con expiresAt a medianoche UTC (el caso más común)
-- Estos estaban 26h:59m:59s adelantados respecto al fin de día Argentina
UPDATE documents
SET expires_at = (
  date_trunc('day', expires_at) + INTERVAL '1 day 2 hours 59 minutes 59 seconds' + INTERVAL '999 milliseconds'
)
WHERE expires_at IS NOT NULL
  AND status != 'DEPRECADO'
  AND archived = false
  AND EXTRACT(HOUR FROM expires_at) = 0
  AND EXTRACT(MINUTE FROM expires_at) = 0
  AND EXTRACT(SECOND FROM expires_at) = 0;

-- Paso 2: Documentos con expiresAt a mediodía UTC (formato usado por parseDateString)
-- Mediodía UTC = 09:00 Argentina. Ajustar a 02:59:59.999 UTC del día siguiente.
UPDATE documents
SET expires_at = (
  date_trunc('day', expires_at) + INTERVAL '1 day 2 hours 59 minutes 59 seconds' + INTERVAL '999 milliseconds'
)
WHERE expires_at IS NOT NULL
  AND status != 'DEPRECADO'
  AND archived = false
  AND EXTRACT(HOUR FROM expires_at) = 12
  AND EXTRACT(MINUTE FROM expires_at) = 0
  AND EXTRACT(SECOND FROM expires_at) = 0;

-- Paso 3: Documentos con expiresAt a las 03:00 UTC (posible intento previo de ajuste)
-- 03:00 UTC = 00:00 Argentina. Ajustar a 02:59:59.999 UTC del mismo día.
UPDATE documents
SET expires_at = (
  date_trunc('day', expires_at) + INTERVAL '2 hours 59 minutes 59 seconds' + INTERVAL '999 milliseconds'
)
WHERE expires_at IS NOT NULL
  AND status != 'DEPRECADO'
  AND archived = false
  AND EXTRACT(HOUR FROM expires_at) = 3
  AND EXTRACT(MINUTE FROM expires_at) = 0
  AND EXTRACT(SECOND FROM expires_at) = 0;
