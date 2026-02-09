#!/bin/bash
# =============================================================================
# deploy-optimized.sh - Despliegue inteligente y rápido
# =============================================================================
# Uso:
#   ./scripts/deploy-optimized.sh                    # Todos los servicios
#   ./scripts/deploy-optimized.sh frontend backend   # Solo los especificados
#   ./scripts/deploy-optimized.sh --parallel         # Build en paralelo
#   ./scripts/deploy-optimized.sh --no-cache         # Sin cache (rebuild completo)
# =============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
STACK_DIR="${STACK_DIR:-deploy/stack-ip-10.3.0.243}"
SERVICES=()
PARALLEL=false
NO_CACHE=""
START_TIME=$(date +%s)

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --parallel|-p)
            PARALLEL=true
            shift
            ;;
        --no-cache|-n)
            NO_CACHE="--no-cache"
            shift
            ;;
        --help|-h)
            echo "Uso: $0 [opciones] [servicios...]"
            echo ""
            echo "Servicios: frontend, backend, documentos, remitos"
            echo ""
            echo "Opciones:"
            echo "  --parallel, -p   Build en paralelo (más rápido, más RAM)"
            echo "  --no-cache, -n   Rebuild completo sin cache"
            echo "  --help, -h       Mostrar ayuda"
            exit 0
            ;;
        *)
            SERVICES+=("$1")
            shift
            ;;
    esac
done

# Si no se especificaron servicios, actualizar los que tienen commits pendientes
if [ ${#SERVICES[@]} -eq 0 ]; then
    SERVICES=(frontend documentos remitos)
    echo -e "${YELLOW}No se especificaron servicios. Actualizando: ${SERVICES[*]}${NC}"
fi

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Verificar BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

log "Iniciando despliegue optimizado..."
echo ""

# Función para build de un servicio
build_service() {
    local service=$1
    local start=$(date +%s)
    
    log "Building ${service}..."
    
    case $service in
        frontend)
            docker build $NO_CACHE \
                -f "$STACK_DIR/Dockerfile.frontend" \
                -t bca/frontend:latest \
                --build-arg VITE_API_URL="" \
                --build-arg VITE_API_BASE_URL="" \
                --build-arg VITE_DOCUMENTOS_API_URL="" \
                --build-arg VITE_DOCUMENTOS_WS_URL="" \
                --build-arg VITE_REMITOS_API_URL="" \
                --build-arg VITE_APP_TITLE="Empresa Management System" \
                . 2>&1 | tail -20
            ;;
        backend)
            docker build $NO_CACHE \
                -f "$STACK_DIR/Dockerfile.backend" \
                -t bca/backend:latest \
                . 2>&1 | tail -20
            ;;
        documentos)
            docker build $NO_CACHE \
                -f apps/documentos/Dockerfile \
                -t bca/documentos:latest \
                apps/documentos 2>&1 | tail -20
            ;;
        remitos)
            docker build $NO_CACHE \
                -f apps/remitos/Dockerfile \
                -t bca/remitos:latest \
                apps/remitos 2>&1 | tail -20
            ;;
        *)
            error "Servicio desconocido: $service"
            return 1
            ;;
    esac
    
    local end=$(date +%s)
    local duration=$((end - start))
    success "$service construido en ${duration}s"
}

# Build paralelo o secuencial
if $PARALLEL && [ ${#SERVICES[@]} -gt 1 ]; then
    log "Modo paralelo activado (${#SERVICES[@]} servicios)"
    
    pids=()
    for service in "${SERVICES[@]}"; do
        build_service "$service" &
        pids+=($!)
    done
    
    # Esperar a todos
    failed=0
    for pid in "${pids[@]}"; do
        if ! wait $pid; then
            ((failed++))
        fi
    done
    
    if [ $failed -gt 0 ]; then
        error "$failed servicio(s) fallaron"
        exit 1
    fi
else
    for service in "${SERVICES[@]}"; do
        if ! build_service "$service"; then
            error "Fallo en $service"
            exit 1
        fi
    done
fi

echo ""
log "Tamaños de imágenes:"
docker images --format "  {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep bca

echo ""
END_TIME=$(date +%s)
TOTAL=$((END_TIME - START_TIME))

log "Builds completados en ${TOTAL}s"
echo ""

# Preguntar si desplegar
echo -e "${YELLOW}¿Desplegar contenedores ahora? [s/N]${NC}"
read -r -t 10 DEPLOY || DEPLOY="n"

if [[ "$DEPLOY" =~ ^[Ss]$ ]]; then
    log "Desplegando contenedores..."
    cd "$STACK_DIR"
    
    for service in "${SERVICES[@]}"; do
        log "Recreando $service..."
        docker compose up -d --no-build "$service"
    done
    
    sleep 5
    
    echo ""
    log "Estado de servicios:"
    docker compose ps --format "table {{.Name}}\t{{.Status}}"
    
    echo ""
    log "Health checks:"
    for service in "${SERVICES[@]}"; do
        case $service in
            frontend)
                curl -sf http://localhost:8550/health > /dev/null && success "Frontend: OK" || error "Frontend: FAIL"
                ;;
            backend)
                curl -sf http://localhost:4800/health > /dev/null && success "Backend: OK" || error "Backend: FAIL"
                ;;
            documentos)
                curl -sf http://localhost:4802/health > /dev/null && success "Documentos: OK" || error "Documentos: FAIL"
                ;;
            remitos)
                curl -sf http://localhost:4803/health > /dev/null && success "Remitos: OK" || error "Remitos: FAIL"
                ;;
        esac
    done
    
    success "Despliegue completado"
else
    log "Build completado. Para desplegar manualmente:"
    echo "  cd $STACK_DIR"
    echo "  docker compose up -d --no-build ${SERVICES[*]}"
fi
