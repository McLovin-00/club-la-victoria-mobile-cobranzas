#!/bin/bash
set -euo pipefail

# =================================
# RESTORE AUTOMATIZADO - Monorepo BCA
# =================================
# Restaura la última copia de seguridad disponible de PostgreSQL y MinIO.
# Uso:
#   bash scripts/restore.sh                # restore completo
#   bash scripts/restore.sh --postgres-only
#   bash scripts/restore.sh --minio-only
# Requisitos:
#   - Docker y contenedores accesibles (postgres, minio)
#   - Espacio suficiente en disco
#   - BACKUP_DIR configurado si difiere del default
# =================================

BACKUP_BASE_DIR="${BACKUP_DIR:-/backup/monorepo-bca}"
POSTGRES_BACKUP_DIR="$BACKUP_BASE_DIR/postgres"
MINIO_BACKUP_DIR="$BACKUP_BASE_DIR/minio"
POSTGRES_CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-postgres}"
MINIO_CONTAINER_NAME="${MINIO_CONTAINER_NAME:-minio}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

find_latest_file() {
  local dir="$1"
  local pattern="$2"
  ls -1t "${dir}/${pattern}" 2>/dev/null | head -1 || true
}

restore_postgres() {
  log "===================="
  log "RESTORE POSTGRESQL"
  log "===================="

  if [ ! -d "$POSTGRES_BACKUP_DIR" ]; then
    log_error "Directorio de backups de PostgreSQL no encontrado: $POSTGRES_BACKUP_DIR"
    return 1
  fi

  local latest_dump
  latest_dump=$(find_latest_file "$POSTGRES_BACKUP_DIR" "postgres-*.sql.gz")

  if [ -z "$latest_dump" ]; then
    log_error "No se encontró dump de PostgreSQL para restaurar"
    return 1
  fi

  log "Usando backup: $latest_dump"

  local postgres_container
  postgres_container=$(docker ps --filter "name=${POSTGRES_CONTAINER_NAME}" --format "{{.ID}}" | head -1)

  if [ -z "$postgres_container" ]; then
    log_error "Contenedor de PostgreSQL no encontrado (filtro name=${POSTGRES_CONTAINER_NAME})"
    return 1
  fi

  log "Contenedor PostgreSQL: $postgres_container"
  log_warning "Esta operación sobrescribirá datos existentes en la base 'monorepo-bca'."

  # Crear DB si no existe
  docker exec "$postgres_container" psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'monorepo-bca';" | grep -q 1 \
    || docker exec "$postgres_container" createdb -U postgres monorepo-bca

  # Restaurar
  if zcat "$latest_dump" | docker exec -i "$postgres_container" psql -U postgres monorepo-bca; then
    log "✅ Restore PostgreSQL completado"
    return 0
  else
    log_error "Restore PostgreSQL fallido"
    return 1
  fi
}

restore_minio() {
  log "===================="
  log "RESTORE MINIO"
  log "===================="

  if [ ! -d "$MINIO_BACKUP_DIR" ]; then
    log_error "Directorio de backups de MinIO no encontrado: $MINIO_BACKUP_DIR"
    return 1
  fi

  local latest_tar
  latest_tar=$(find_latest_file "$MINIO_BACKUP_DIR" "minio-*.tar.gz")

  if [ -z "$latest_tar" ]; then
    log_warning "No se encontró backup de MinIO; se continúa sin restaurar objetos"
    return 0
  fi

  log "Usando backup: $latest_tar"

  local minio_container
  minio_container=$(docker ps --filter "name=${MINIO_CONTAINER_NAME}" --format "{{.ID}}" | head -1)

  if [ -z "$minio_container" ]; then
    log_error "Contenedor de MinIO no encontrado (filtro name=${MINIO_CONTAINER_NAME})"
    return 1
  fi

  # Extraer temporalmente
  local tmp_dir
  tmp_dir=$(mktemp -d)
  tar -xzf "$latest_tar" -C "$tmp_dir"

  # Copiar a contenedor (sobrescribe /data)
  if docker cp "$tmp_dir/data" "$minio_container:/"; then
    log "✅ Restore MinIO completado"
    rm -rf "$tmp_dir"
    return 0
  else
    log_error "Restore MinIO fallido"
    rm -rf "$tmp_dir"
    return 1
  fi
}

main() {
  local only_pg=false
  local only_minio=false

  if [[ "${1:-}" == "--postgres-only" ]]; then
    only_pg=true
  elif [[ "${1:-}" == "--minio-only" ]]; then
    only_minio=true
  fi

  local errors=0
  if [ "$only_minio" = false ]; then
    restore_postgres || ((errors++))
  fi
  if [ "$only_pg" = false ]; then
    restore_minio || ((errors++))
  fi

  if [ $errors -eq 0 ]; then
    log "========================================="
    log "✅ RESTORE COMPLETADO EXITOSAMENTE"
    log "========================================="
    exit 0
  else
    log_error "========================================="
    log_error "⚠️  RESTORE COMPLETADO CON $errors ERROR(ES)"
    log_error "========================================="
    exit 1
  fi
}

main "$@"


