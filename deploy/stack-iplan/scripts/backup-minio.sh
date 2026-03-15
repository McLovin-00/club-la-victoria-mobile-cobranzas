#!/bin/bash
set -euo pipefail

# =============================================================================
# backup-minio.sh - Mirror incremental de MinIO
# Ejecutar en VM3 via cron:
#   0 3 * * * /home/administrador/monorepo-bca/deploy/stack-iplan/scripts/backup-minio.sh >> /var/log/bca-minio-backup.log 2>&1
# Requiere: mc (MinIO Client) instalado en VM3
# =============================================================================

BACKUP_DIR="/opt/bca/backups/minio"
VM2_IP="${VM2_IP:-10.8.10.121}"
MINIO_ALIAS="bca-source"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting MinIO mirror..."

mc alias set "$MINIO_ALIAS" "http://${VM2_IP}:9000" \
  "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" \
  --api S3v4 2>/dev/null

mc mirror --preserve --overwrite \
  "${MINIO_ALIAS}/" "$BACKUP_DIR/"

echo "[$(date)] MinIO mirror completed"
echo "  Total size: $(du -sh "$BACKUP_DIR" | cut -f1)"
