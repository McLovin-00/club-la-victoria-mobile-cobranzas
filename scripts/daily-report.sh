#!/bin/bash
#
# daily-report.sh
# Genera reporte diario del estado del sistema y lo envía por Slack/email
# Uso: ./scripts/daily-report.sh [--slack-webhook URL] [--email ADDRESS]
#
# Autor: DevOps Team
# Fecha: 2025-10-08
# Configurar en cron: 0 9 * * * /home/administrador/monorepo-bca/scripts/daily-report.sh

set -e

# Configuración
SLACK_WEBHOOK=""
EMAIL=""
REPORT_FILE="/tmp/daily-report-$(date +%Y%m%d).txt"

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --slack-webhook)
            SLACK_WEBHOOK="$2"
            shift 2
            ;;
        --email)
            EMAIL="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Función para agregar al reporte
log_report() {
    echo "$1" | tee -a "$REPORT_FILE"
}

# Generar reporte
generate_report() {
    # Limpiar archivo de reporte
    > "$REPORT_FILE"
    
    log_report "📊 DAILY SYSTEM REPORT - Monorepo BCA"
    log_report "Date: $(date '+%Y-%m-%d %H:%M:%S')"
    log_report "=========================================="
    log_report ""
    
    # 1. System Uptime
    log_report "🖥️  SYSTEM STATUS"
    log_report "----------------------------------------"
    log_report "Uptime: $(uptime -p)"
    log_report "Load: $(uptime | awk -F'load average:' '{print $2}')"
    log_report ""
    
    # 2. Resource Usage
    log_report "💾 RESOURCE USAGE"
    log_report "----------------------------------------"
    
    # CPU
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{printf "%.1f", 100 - $1}')
    log_report "CPU:  ${cpu_usage}%"
    
    # RAM
    ram_total=$(free -h | awk '/^Mem:/ {print $2}')
    ram_used=$(free -h | awk '/^Mem:/ {print $3}')
    ram_percent=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100}')
    log_report "RAM:  ${ram_used} / ${ram_total} (${ram_percent}%)"
    
    # Disk
    disk_total=$(df -h / | tail -1 | awk '{print $2}')
    disk_used=$(df -h / | tail -1 | awk '{print $3}')
    disk_percent=$(df / | tail -1 | awk '{print $5}')
    log_report "Disk: ${disk_used} / ${disk_total} (${disk_percent})"
    log_report ""
    
    # 3. Docker Services
    log_report "🐳 DOCKER SERVICES"
    log_report "----------------------------------------"
    
    if command -v docker &> /dev/null; then
        running=$(docker ps -q | wc -l)
        exited=$(docker ps -aq --filter "status=exited" | wc -l)
        
        log_report "Running:  $running"
        log_report "Exited:   $exited"
        
        if [ "$exited" -gt 0 ]; then
            log_report ""
            log_report "⚠️  Exited containers:"
            docker ps -a --filter "status=exited" --format "  - {{.Names}} ({{.Status}})" | tee -a "$REPORT_FILE"
        fi
    else
        log_report "Docker not available"
    fi
    log_report ""
    
    # 4. Health Checks
    log_report "🏥 HEALTH CHECKS"
    log_report "----------------------------------------"
    
    # Backend
    backend_health=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost:4800/api/health 2>/dev/null || echo "000")
    log_report "Backend:    $([[ $backend_health == "200" ]] && echo "✓ OK" || echo "✗ FAIL (HTTP $backend_health)")"
    
    # Frontend
    frontend_health=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost:8550/health 2>/dev/null || echo "000")
    log_report "Frontend:   $([[ $frontend_health == "200" ]] && echo "✓ OK" || echo "✗ FAIL (HTTP $frontend_health)")"
    
    # Documentos
    docs_health=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost:4802/health/ready 2>/dev/null || echo "000")
    log_report "Documentos: $([[ $docs_health == "200" ]] && echo "✓ OK" || echo "✗ FAIL (HTTP $docs_health)")"
    log_report ""
    
    # 5. Last 24h Errors (si existe Sentry o logs)
    log_report "🐛 ERRORS (Last 24h)"
    log_report "----------------------------------------"
    
    # Contar errores en logs de Docker (últimas 24h)
    if command -v docker &> /dev/null && [ "$running" -gt 0 ]; then
        backend_errors=$(docker logs --since 24h monorepo-bca_backend 2>&1 | grep -i "error" | wc -l || echo 0)
        docs_errors=$(docker logs --since 24h monorepo-bca_documentos 2>&1 | grep -i "error" | wc -l || echo 0)
        
        log_report "Backend errors:    $backend_errors"
        log_report "Documentos errors: $docs_errors"
    else
        log_report "No logs available"
    fi
    log_report ""
    
    # 6. Backups Status
    log_report "💾 BACKUPS STATUS"
    log_report "----------------------------------------"
    
    last_backup=$(find /backup/monorepo-bca -type f -name "postgres-*.sql.gz" -mtime -2 2>/dev/null | wc -l || echo 0)
    
    if [ "$last_backup" -gt 0 ]; then
        latest=$(find /backup/monorepo-bca -type f -name "postgres-*.sql.gz" -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | awk '{print $2}')
        latest_date=$(stat -c %y "$latest" 2>/dev/null | cut -d' ' -f1)
        latest_size=$(du -h "$latest" 2>/dev/null | awk '{print $1}')
        log_report "Last backup: $latest_date ($latest_size)"
        log_report "Status: ✓ OK (< 48h old)"
    else
        log_report "⚠️  WARNING: No recent backup found (< 48h)"
    fi
    log_report ""
    
    # 7. Security Updates
    log_report "🔒 SECURITY UPDATES"
    log_report "----------------------------------------"
    
    if command -v apt &> /dev/null; then
        security_updates=$(apt list --upgradable 2>/dev/null | grep -i security | wc -l || echo 0)
        log_report "Pending security updates: $security_updates"
        
        if [ "$security_updates" -gt 5 ]; then
            log_report "⚠️  WARNING: >5 security updates pending"
        fi
    else
        log_report "APT not available"
    fi
    log_report ""
    
    # 8. Disk Space Alerts
    log_report "⚠️  ALERTS"
    log_report "----------------------------------------"
    
    alerts=0
    
    # CPU Alert
    cpu_int=${cpu_usage%.*}
    if [ "${cpu_int:-0}" -ge 80 ]; then
        log_report "🔴 CPU usage high: ${cpu_usage}%"
        ((alerts++))
    fi
    
    # RAM Alert
    ram_int=${ram_percent%.*}
    if [ "${ram_int:-0}" -ge 85 ]; then
        log_report "🔴 RAM usage high: ${ram_percent}%"
        ((alerts++))
    fi
    
    # Disk Alert
    disk_int=${disk_percent%\%}
    if [ "${disk_int:-0}" -ge 90 ]; then
        log_report "🔴 Disk usage critical: ${disk_percent}"
        ((alerts++))
    fi
    
    # Container Alert
    if [ "${exited:-0}" -gt 0 ]; then
        log_report "🔴 $exited container(s) exited"
        ((alerts++))
    fi
    
    # Health Alert
    if [ "$backend_health" != "200" ] || [ "$frontend_health" != "200" ] || [ "$docs_health" != "200" ]; then
        log_report "🔴 One or more services unhealthy"
        ((alerts++))
    fi
    
    if [ $alerts -eq 0 ]; then
        log_report "✅ No alerts - All systems nominal"
    fi
    
    log_report ""
    log_report "=========================================="
    log_report "End of Report"
}

# Enviar a Slack
send_to_slack() {
    if [ -n "$SLACK_WEBHOOK" ]; then
        # Leer contenido del reporte
        report_content=$(cat "$REPORT_FILE" | head -50)  # Limitar a 50 líneas para Slack
        
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"$report_content\"}" \
            2>/dev/null || echo "Failed to send to Slack"
    fi
}

# Enviar por email
send_to_email() {
    if [ -n "$EMAIL" ] && command -v mail &> /dev/null; then
        cat "$REPORT_FILE" | mail -s "Daily System Report - Monorepo BCA - $(date +%Y-%m-%d)" "$EMAIL"
    fi
}

# Función principal
main() {
    generate_report
    
    # Mostrar en consola
    cat "$REPORT_FILE"
    
    # Enviar notificaciones
    send_to_slack
    send_to_email
    
    echo ""
    echo "Report saved to: $REPORT_FILE"
}

# Ejecutar
main

