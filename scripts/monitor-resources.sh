#!/bin/bash
#
# monitor-resources.sh
# Monitorea uso de recursos (CPU, RAM, Disco) y genera alertas si exceden umbrales
# Uso: ./scripts/monitor-resources.sh [--slack-webhook URL]
#
# Autor: DevOps Team
# Fecha: 2025-10-08

set -e

# Umbrales de alerta
CPU_THRESHOLD=80
RAM_THRESHOLD=85
DISK_THRESHOLD=90

# Colores
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Slack webhook (opcional)
SLACK_WEBHOOK=""

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --slack-webhook)
            SLACK_WEBHOOK="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Función para enviar alerta a Slack
send_slack_alert() {
    local message=$1
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"🚨 Resource Alert: $message\"}" \
            2>/dev/null || true
    fi
}

# Verificar uso de CPU
check_cpu() {
    echo -n "Checking CPU usage... "
    
    # Obtener uso de CPU (promedio últimos 5 min)
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    cpu_int=${cpu_usage%.*}
    
    if [ "$cpu_int" -ge "$CPU_THRESHOLD" ]; then
        echo -e "${RED}✗ HIGH (${cpu_usage}%)${NC}"
        send_slack_alert "CPU usage is high: ${cpu_usage}% (threshold: ${CPU_THRESHOLD}%)"
        return 1
    else
        echo -e "${GREEN}✓ OK (${cpu_usage}%)${NC}"
        return 0
    fi
}

# Verificar uso de RAM
check_ram() {
    echo -n "Checking RAM usage... "
    
    # Obtener uso de RAM (%)
    ram_usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    
    if [ "$ram_usage" -ge "$RAM_THRESHOLD" ]; then
        echo -e "${RED}✗ HIGH (${ram_usage}%)${NC}"
        send_slack_alert "RAM usage is high: ${ram_usage}% (threshold: ${RAM_THRESHOLD}%)"
        return 1
    else
        echo -e "${GREEN}✓ OK (${ram_usage}%)${NC}"
        return 0
    fi
}

# Verificar uso de disco
check_disk() {
    echo -n "Checking Disk usage... "
    
    # Obtener uso de disco raíz (%)
    disk_usage=$(df / | tail -1 | awk '{print int($5)}')
    
    if [ "$disk_usage" -ge "$DISK_THRESHOLD" ]; then
        echo -e "${RED}✗ HIGH (${disk_usage}%)${NC}"
        send_slack_alert "Disk usage is high: ${disk_usage}% (threshold: ${DISK_THRESHOLD}%)"
        return 1
    else
        echo -e "${GREEN}✓ OK (${disk_usage}%)${NC}"
        return 0
    fi
}

# Verificar servicios Docker
check_docker_services() {
    echo ""
    echo "Docker Services Status:"
    echo "----------------------------------------"
    
    if command -v docker &> /dev/null; then
        # Contar servicios por estado
        running=$(docker ps -q | wc -l)
        exited=$(docker ps -aq --filter "status=exited" | wc -l)
        
        echo -e "Running:  ${GREEN}$running${NC}"
        echo -e "Exited:   ${exited:+$RED}${exited:-0}${NC}"
        
        if [ "$exited" -gt 0 ]; then
            echo ""
            echo "Exited containers:"
            docker ps -a --filter "status=exited" --format "table {{.Names}}\t{{.Status}}"
            send_slack_alert "$exited container(s) have exited"
        fi
    else
        echo "Docker not installed or not running"
    fi
}

# Mostrar top 5 procesos por CPU
show_top_cpu() {
    echo ""
    echo "Top 5 Processes by CPU:"
    echo "----------------------------------------"
    ps aux --sort=-%cpu | head -6 | awk 'NR==1 || NR>1 {printf "%-10s %5s%% %s\n", $1, $3, $11}'
}

# Mostrar top 5 procesos por RAM
show_top_ram() {
    echo ""
    echo "Top 5 Processes by RAM:"
    echo "----------------------------------------"
    ps aux --sort=-%mem | head -6 | awk 'NR==1 || NR>1 {printf "%-10s %5s%% %s\n", $1, $4, $11}'
}

# Función principal
main() {
    echo "📊 Resource Monitor - Monorepo BCA"
    echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "=========================================="
    echo ""
    
    failures=0
    
    check_cpu || ((failures++))
    check_ram || ((failures++))
    check_disk || ((failures++))
    
    check_docker_services
    
    if [ "$failures" -gt 0 ]; then
        show_top_cpu
        show_top_ram
    fi
    
    echo ""
    echo "=========================================="
    
    if [ $failures -eq 0 ]; then
        echo -e "${GREEN}✓ All resources within limits${NC}"
        exit 0
    else
        echo -e "${RED}✗ $failures resource(s) exceeded threshold${NC}"
        exit 1
    fi
}

# Ejecutar
main

