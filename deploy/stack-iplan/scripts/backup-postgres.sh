#!/bin/bash
set -euo pipefail

# =============================================================================
# backup-postgres.sh - Backup diario de PostgreSQL
# Ejecutar en VM3 via cron:
#   0 2 * * * /home/administrador/monorepo-bca/deploy/stack-iplan/scripts/backup-postgres.sh >> /var/log/bca-backup.log 2>&1
# =============================================================================

BACKUP_DIR="/opt/bca/backups/postgres"
RETENTION_DAYS=14
DATE=$(date +%Y%m%d_%H%M%S)
VM2_IP="${VM2_IP:-10.8.10.121}"
PG_USER="${PG_USER:-evo}"
PG_DB="${PG_DB:-monorepo-bca}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting PostgreSQL backup..."

PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "$VM2_IP" \
  -U "$PG_USER" \
  -d "$PG_DB" \
  --format=custom \
  --compress=9 \
  > "${BACKUP_DIR}/${PG_DB}_${DATE}.dump"

FILESIZE=$(du -h "${BACKUP_DIR}/${PG_DB}_${DATE}.dump" | cut -f1)
echo "[$(date)] Backup completed: ${PG_DB}_${DATE}.dump (${FILESIZE})"

# Limpiar backups viejos
DELETED=$(find "$BACKUP_DIR" -name "*.dump" -mtime +"${RETENTION_DAYS}" -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] Cleaned ${DELETED} backups older than ${RETENTION_DAYS} days"
fi
