#!/bin/bash
set -euo pipefail

# =================================
# BACKUP AUTOMATIZADO - Monorepo BCA
# =================================
# Descripción: Script de backup diario para PostgreSQL, MinIO y configuraciones
# Frecuencia: Diaria (02:00 AM vía cron)
# Retención: 7/14/30 días según política
# Autor: DevOps/Back
# Última actualización: 8 Octubre 2025

# =================================
# CONFIGURACIÓN
# =================================

# Directorio base de backups
BACKUP_BASE_DIR="${BACKUP_DIR:-/backup/monorepo-bca}"
DATE=$(date +%Y%m%d-%H%M%S)
DATE_SIMPLE=$(date +%Y%m%d)

# Subdirectorios por tipo
POSTGRES_BACKUP_DIR="$BACKUP_BASE_DIR/postgres"
MINIO_BACKUP_DIR="$BACKUP_BASE_DIR/minio"
CONFIG_BACKUP_DIR="$BACKUP_BASE_DIR/config"
LOG_DIR="$BACKUP_BASE_DIR/logs"

# Retención (días)
RETENTION_DAILY=7
RETENTION_WEEKLY=14
RETENTION_MONTHLY=30

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =================================
# FUNCIONES
# =================================

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_DIR/backup-$DATE_SIMPLE.log"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_DIR/backup-$DATE_SIMPLE.log"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_DIR/backup-$DATE_SIMPLE.log"
}

check_disk_space() {
    local available=$(df -BG "$BACKUP_BASE_DIR" | tail -1 | awk '{print $4}' | sed 's/G//')
    local required=10  # GB mínimos requeridos
    
    if [ "$available" -lt "$required" ]; then
        log_error "Espacio insuficiente: ${available}GB disponibles, se requieren al menos ${required}GB"
        return 1
    fi
    
    log "Espacio en disco: ${available}GB disponibles"
    return 0
}

# =================================
# CREACIÓN DE DIRECTORIOS
# =================================

create_directories() {
    log "Creando estructura de directorios..."
    
    mkdir -p "$POSTGRES_BACKUP_DIR"
    mkdir -p "$MINIO_BACKUP_DIR"
    mkdir -p "$CONFIG_BACKUP_DIR"
    mkdir -p "$LOG_DIR"
    
    log "✅ Directorios creados"
}

# =================================
# BACKUP POSTGRESQL
# =================================

backup_postgresql() {
    log "===================="
    log "BACKUP POSTGRESQL"
    log "===================="
    
    local backup_file="$POSTGRES_BACKUP_DIR/postgres-$DATE.sql.gz"
    
    # Obtener ID del contenedor de PostgreSQL
    local postgres_container=$(docker ps --filter "name=postgres" --format "{{.ID}}" | head -1)
    
    if [ -z "$postgres_container" ]; then
        log_error "Contenedor de PostgreSQL no encontrado"
        return 1
    fi
    
    log "Contenedor PostgreSQL: $postgres_container"
    
    # Ejecutar pg_dump
    log "Iniciando dump de base de datos..."
    
    if docker exec "$postgres_container" pg_dump -U postgres monorepo-bca | gzip > "$backup_file"; then
        local size=$(du -h "$backup_file" | cut -f1)
        log "✅ Backup PostgreSQL completado: $backup_file ($size)"
        
        # Verificar integridad del archivo comprimido
        if gzip -t "$backup_file" 2>/dev/null; then
            log "✅ Integridad del archivo verificada"
        else
            log_error "El archivo de backup está corrupto"
            return 1
        fi
        
        return 0
    else
        log_error "Falló el backup de PostgreSQL"
        return 1
    fi
}

# =================================
# BACKUP MINIO
# =================================

backup_minio() {
    log "===================="
    log "BACKUP MINIO"
    log "===================="
    
    local backup_dir="$MINIO_BACKUP_DIR/minio-$DATE"
    
    # Obtener ID del contenedor de MinIO
    local minio_container=$(docker ps --filter "name=minio" --format "{{.ID}}" | head -1)
    
    if [ -z "$minio_container" ]; then
        log_warning "Contenedor de MinIO no encontrado, saltando backup de MinIO"
        return 0
    fi
    
    log "Contenedor MinIO: $minio_container"
    
    # Crear directorio de backup
    mkdir -p "$backup_dir"
    
    # Copiar datos de MinIO
    log "Copiando datos de MinIO..."
    
    if docker cp "$minio_container:/data" "$backup_dir/"; then
        # Comprimir backup
        log "Comprimiendo backup de MinIO..."
        tar -czf "$backup_dir.tar.gz" -C "$MINIO_BACKUP_DIR" "minio-$DATE" 2>/dev/null
        
        # Eliminar directorio sin comprimir
        rm -rf "$backup_dir"
        
        local size=$(du -h "$backup_dir.tar.gz" | cut -f1)
        log "✅ Backup MinIO completado: $backup_dir.tar.gz ($size)"
        return 0
    else
        log_error "Falló el backup de MinIO"
        return 1
    fi
}

# =================================
# BACKUP CONFIGURACIONES
# =================================

backup_configs() {
    log "===================="
    log "BACKUP CONFIGURACIONES"
    log "===================="
    
    local config_file="$CONFIG_BACKUP_DIR/config-$DATE.tar.gz"
    local project_dir="/home/administrador/monorepo-bca"
    
    # Archivos a incluir en backup de configuración
    local files_to_backup=(
        ".env"
        "docker-compose.prod.yml"
        "docker-compose.staging.yml"
        "nginx/nginx.conf"
        "nginx/ssl"
    )
    
    log "Creando backup de archivos de configuración..."
    
    # Cambiar al directorio del proyecto
    cd "$project_dir" || {
        log_error "No se pudo acceder al directorio del proyecto: $project_dir"
        return 1
    }
    
    # Crear archivo tar.gz con las configuraciones
    tar -czf "$config_file" "${files_to_backup[@]}" 2>/dev/null || {
        log_warning "Algunos archivos de configuración no existen, pero se continúa"
    }
    
    if [ -f "$config_file" ]; then
        local size=$(du -h "$config_file" | cut -f1)
        log "✅ Backup de configuraciones completado: $config_file ($size)"
        return 0
    else
        log_error "No se pudo crear el backup de configuraciones"
        return 1
    fi
}

# =================================
# LIMPIEZA DE BACKUPS ANTIGUOS
# =================================

cleanup_old_backups() {
    log "===================="
    log "LIMPIEZA DE BACKUPS ANTIGUOS"
    log "===================="
    
    # Limpiar backups PostgreSQL > 7 días
    log "Eliminando backups de PostgreSQL con más de $RETENTION_DAILY días..."
    local deleted_pg=$(find "$POSTGRES_BACKUP_DIR" -name "postgres-*.sql.gz" -type f -mtime +$RETENTION_DAILY -delete -print | wc -l)
    log "Eliminados: $deleted_pg archivos de PostgreSQL"
    
    # Limpiar backups MinIO > 7 días
    log "Eliminando backups de MinIO con más de $RETENTION_DAILY días..."
    local deleted_minio=$(find "$MINIO_BACKUP_DIR" -name "minio-*.tar.gz" -type f -mtime +$RETENTION_DAILY -delete -print | wc -l)
    log "Eliminados: $deleted_minio archivos de MinIO"
    
    # Limpiar backups de configuración > 14 días
    log "Eliminando backups de configuración con más de $RETENTION_WEEKLY días..."
    local deleted_config=$(find "$CONFIG_BACKUP_DIR" -name "config-*.tar.gz" -type f -mtime +$RETENTION_WEEKLY -delete -print | wc -l)
    log "Eliminados: $deleted_config archivos de configuración"
    
    # Limpiar logs > 30 días
    log "Eliminando logs con más de $RETENTION_MONTHLY días..."
    local deleted_logs=$(find "$LOG_DIR" -name "backup-*.log" -type f -mtime +$RETENTION_MONTHLY -delete -print | wc -l)
    log "Eliminados: $deleted_logs archivos de log"
    
    log "✅ Limpieza completada"
}

# =================================
# VERIFICACIÓN DE BACKUP
# =================================

verify_backups() {
    log "===================="
    log "VERIFICACIÓN DE BACKUPS"
    log "===================="
    
    local errors=0
    
    # Verificar que existen backups recientes (últimas 24h)
    local pg_recent=$(find "$POSTGRES_BACKUP_DIR" -name "postgres-*.sql.gz" -type f -mtime -1 | wc -l)
    if [ "$pg_recent" -eq 0 ]; then
        log_error "No hay backups recientes de PostgreSQL"
        ((errors++))
    else
        log "✅ Backup reciente de PostgreSQL encontrado"
    fi
    
    # Estadísticas de backups
    log "===================="
    log "ESTADÍSTICAS"
    log "===================="
    
    local total_pg=$(ls -1 "$POSTGRES_BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
    local total_minio=$(ls -1 "$MINIO_BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)
    local total_config=$(ls -1 "$CONFIG_BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)
    
    log "PostgreSQL backups: $total_pg"
    log "MinIO backups: $total_minio"
    log "Config backups: $total_config"
    
    # Tamaño total de backups
    local total_size=$(du -sh "$BACKUP_BASE_DIR" | cut -f1)
    log "Tamaño total de backups: $total_size"
    
    return $errors
}

# =================================
# NOTIFICACIÓN (OPCIONAL)
# =================================

send_notification() {
    local status=$1
    local message=$2
    
    # Aquí puedes agregar integración con Slack, email, etc.
    # Por ahora solo registramos en log
    
    if [ "$status" = "success" ]; then
        log "📧 Notificación: BACKUP EXITOSO - $message"
    else
        log_error "📧 Notificación: BACKUP FALLIDO - $message"
    fi
    
    # Ejemplo de integración con Slack (descomentar y configurar):
    # if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    #     curl -X POST -H 'Content-type: application/json' \
    #         --data "{\"text\":\"$message\"}" \
    #         "$SLACK_WEBHOOK_URL"
    # fi
}

# =================================
# MAIN
# =================================

main() {
    log "========================================="
    log "INICIO DE BACKUP - Monorepo BCA"
    log "========================================="
    
    # Verificar espacio en disco
    if ! check_disk_space; then
        send_notification "error" "Backup fallido: espacio insuficiente"
        exit 1
    fi
    
    # Crear directorios
    create_directories
    
    # Contadores de errores
    local errors=0
    
    # Ejecutar backups
    backup_postgresql || ((errors++))
    backup_minio || ((errors++))
    backup_configs || ((errors++))
    
    # Limpieza de backups antiguos
    cleanup_old_backups
    
    # Verificación
    verify_backups || ((errors++))
    
    # Resultado final
    log "========================================="
    if [ $errors -eq 0 ]; then
        log "✅ BACKUP COMPLETADO EXITOSAMENTE"
        send_notification "success" "Backup completado - 0 errores"
        log "========================================="
        exit 0
    else
        log_error "⚠️  BACKUP COMPLETADO CON $errors ERROR(ES)"
        send_notification "error" "Backup completado con $errors errores"
        log "========================================="
        exit 1
    fi
}

# =================================
# EJECUCIÓN
# =================================

# Ejecutar main
main

# =================================
# CRON CONFIGURATION
# =================================
# Para configurar el cron job, ejecutar:
# crontab -e
#
# Agregar la siguiente línea:
# 0 2 * * * /home/administrador/monorepo-bca/scripts/backup.sh >> /var/log/backup.log 2>&1
#
# Esto ejecutará el backup todos los días a las 2:00 AM

