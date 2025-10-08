#!/bin/bash
#
# health-check-all.sh
# Verifica el estado de salud de todos los servicios en todos los ambientes
# Uso: ./scripts/health-check-all.sh [dev|staging|prod|all]
#
# Autor: DevOps Team
# Fecha: 2025-10-08

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
ENV=${1:-all}
TIMEOUT=10

# URLs por ambiente
declare -A URLS_DEV=(
    ["backend"]="http://localhost:4800/api/health"
    ["frontend"]="http://localhost:8550/health"
    ["documentos"]="http://localhost:4802/health/ready"
)

declare -A URLS_STAGING=(
    ["backend"]="https://api.staging.monorepo-bca.com/health"
    ["frontend"]="https://staging.monorepo-bca.com/health"
    ["documentos"]="https://docs.staging.monorepo-bca.com/health/ready"
)

declare -A URLS_PROD=(
    ["backend"]="https://api.monorepo-bca.com/health"
    ["frontend"]="https://monorepo-bca.com/health"
    ["documentos"]="https://docs.monorepo-bca.com/health/ready"
)

# Función para verificar un endpoint
check_endpoint() {
    local name=$1
    local url=$2
    local env=$3
    
    echo -n "Checking $env/$name... "
    
    # Hacer request con timeout
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "$url" 2>/dev/null || echo "000")
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $http_code)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        return 1
    fi
}

# Función para verificar un ambiente completo
check_environment() {
    local env_name=$1
    local -n urls=$2
    local failed=0
    
    echo ""
    echo "=========================================="
    echo "  Checking $env_name Environment"
    echo "=========================================="
    
    for service in "${!urls[@]}"; do
        if ! check_endpoint "$service" "${urls[$service]}" "$env_name"; then
            ((failed++))
        fi
    done
    
    echo ""
    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}✓ All services healthy in $env_name${NC}"
    else
        echo -e "${RED}✗ $failed service(s) failed in $env_name${NC}"
    fi
    
    return $failed
}

# Función principal
main() {
    echo "🏥 Health Check - Monorepo BCA"
    echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
    
    total_failures=0
    
    case $ENV in
        dev)
            check_environment "DEV" URLS_DEV
            total_failures=$?
            ;;
        staging)
            check_environment "STAGING" URLS_STAGING
            total_failures=$?
            ;;
        prod)
            check_environment "PRODUCTION" URLS_PROD
            total_failures=$?
            ;;
        all)
            check_environment "DEV" URLS_DEV
            total_failures=$?
            
            check_environment "STAGING" URLS_STAGING
            ((total_failures += $?))
            
            check_environment "PRODUCTION" URLS_PROD
            ((total_failures += $?))
            ;;
        *)
            echo "Usage: $0 [dev|staging|prod|all]"
            exit 1
            ;;
    esac
    
    echo ""
    echo "=========================================="
    
    if [ $total_failures -eq 0 ]; then
        echo -e "${GREEN}✓ All checks passed!${NC}"
        exit 0
    else
        echo -e "${RED}✗ $total_failures check(s) failed${NC}"
        exit 1
    fi
}

# Ejecutar
main

