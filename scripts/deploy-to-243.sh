#!/bin/bash
# =============================================================================
# deploy-to-243.sh - Despliegue remoto optimizado a 10.3.0.243
# =============================================================================
# Uso:
#   ./scripts/deploy-to-243.sh                       # Servicios pendientes
#   ./scripts/deploy-to-243.sh frontend backend      # Servicios específicos
#   ./scripts/deploy-to-243.sh --all                 # Todos los servicios
# =============================================================================

set -e

# Config
SERVER="10.3.0.243"
SSH_KEY="$HOME/.ssh/id_rsa_bca_243"
USER="administrador"
REMOTE_REPO="/home/administrador/monorepo-bca"
REMOTE_STACK="/home/administrador/stack-ip-10.3.0.243"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }

# Parse args
SERVICES=()
ALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --all|-a)
            ALL=true
            shift
            ;;
        --help|-h)
            echo "Uso: $0 [--all] [servicios...]"
            echo ""
            echo "Servicios: frontend, backend, documentos, remitos"
            echo ""
            echo "Opciones:"
            echo "  --all, -a   Reconstruir todos los servicios"
            exit 0
            ;;
        *)
            SERVICES+=("$1")
            shift
            ;;
    esac
done

if $ALL; then
    SERVICES=(frontend backend documentos remitos)
elif [ ${#SERVICES[@]} -eq 0 ]; then
    # Por defecto: los que tienen commits pendientes (frontend, documentos, remitos)
    SERVICES=(frontend documentos remitos)
fi

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  DESPLIEGUE OPTIMIZADO → 10.3.0.243${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo ""
log "Servicios a actualizar: ${SERVICES[*]}"
echo ""

# Verificar SSH
log "Verificando conexión SSH..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=5 "$USER@$SERVER" "echo ok" &>/dev/null; then
    error "No se puede conectar a $SERVER"
fi
success "Conexión SSH OK"

# Sincronizar código
log "Sincronizando código con git pull..."
ssh -i "$SSH_KEY" "$USER@$SERVER" "cd $REMOTE_REPO && git fetch origin && git reset --hard origin/main" || error "Git pull falló"
success "Código sincronizado"

# Copiar archivos optimizados si hay cambios locales
log "Verificando archivos de deploy..."
CHANGED_FILES=$(git status --porcelain deploy/ scripts/deploy-optimized.sh .dockerignore apps/documentos/Dockerfile apps/remitos/Dockerfile 2>/dev/null | wc -l)

if [ "$CHANGED_FILES" -gt 0 ]; then
    warn "Hay cambios locales no commiteados. Copiando archivos actualizados..."
    scp -i "$SSH_KEY" -q \
        deploy/stack-ip-10.3.0.243/Dockerfile.backend \
        deploy/stack-ip-10.3.0.243/Dockerfile.frontend \
        "$USER@$SERVER:$REMOTE_STACK/"
    scp -i "$SSH_KEY" -q .dockerignore "$USER@$SERVER:$REMOTE_REPO/"
    scp -i "$SSH_KEY" -q apps/documentos/Dockerfile "$USER@$SERVER:$REMOTE_REPO/apps/documentos/"
    scp -i "$SSH_KEY" -q apps/documentos/.dockerignore "$USER@$SERVER:$REMOTE_REPO/apps/documentos/" 2>/dev/null || true
    scp -i "$SSH_KEY" -q apps/remitos/Dockerfile "$USER@$SERVER:$REMOTE_REPO/apps/remitos/"
    scp -i "$SSH_KEY" -q apps/remitos/.dockerignore "$USER@$SERVER:$REMOTE_REPO/apps/remitos/" 2>/dev/null || true
    success "Archivos copiados"
fi

# Build remoto
log "Iniciando build en servidor (esto puede tardar unos minutos)..."
echo ""

START_TIME=$(date +%s)

# Construir comando de build
BUILD_CMD="cd $REMOTE_REPO && export DOCKER_BUILDKIT=1"

for service in "${SERVICES[@]}"; do
    case $service in
        frontend)
            BUILD_CMD="$BUILD_CMD && echo '>>> Building frontend...' && docker build -f $REMOTE_STACK/Dockerfile.frontend -t bca/frontend:latest --build-arg VITE_API_URL='' --build-arg VITE_API_BASE_URL='' --build-arg VITE_DOCUMENTOS_API_URL='' --build-arg VITE_DOCUMENTOS_WS_URL='' --build-arg VITE_REMITOS_API_URL='' --build-arg VITE_APP_TITLE='Empresa Management System' ."
            ;;
        backend)
            BUILD_CMD="$BUILD_CMD && echo '>>> Building backend...' && docker build -f $REMOTE_STACK/Dockerfile.backend -t bca/backend:latest ."
            ;;
        documentos)
            BUILD_CMD="$BUILD_CMD && echo '>>> Building documentos...' && docker build -f apps/documentos/Dockerfile -t bca/documentos:latest apps/documentos"
            ;;
        remitos)
            BUILD_CMD="$BUILD_CMD && echo '>>> Building remitos...' && docker build -f apps/remitos/Dockerfile -t bca/remitos:latest apps/remitos"
            ;;
    esac
done

# Ejecutar build
ssh -i "$SSH_KEY" "$USER@$SERVER" "$BUILD_CMD" || error "Build falló"

END_TIME=$(date +%s)
BUILD_TIME=$((END_TIME - START_TIME))

echo ""
success "Build completado en ${BUILD_TIME}s"

# Mostrar tamaños
log "Tamaños de imágenes:"
ssh -i "$SSH_KEY" "$USER@$SERVER" "docker images --format '  {{.Repository}}:{{.Tag}}\t{{.Size}}' | grep bca"

# Desplegar contenedores
echo ""
log "Desplegando contenedores..."

DEPLOY_CMD="cd $REMOTE_STACK"
for service in "${SERVICES[@]}"; do
    DEPLOY_CMD="$DEPLOY_CMD && docker compose up -d --no-build $service"
done

ssh -i "$SSH_KEY" "$USER@$SERVER" "$DEPLOY_CMD" || error "Deploy falló"

# Esperar y verificar health
sleep 8

echo ""
log "Verificando health..."

ssh -i "$SSH_KEY" "$USER@$SERVER" "
for svc in ${SERVICES[*]}; do
    case \$svc in
        frontend)
            curl -sf http://localhost:8550/health > /dev/null && echo '  ✓ Frontend: OK' || echo '  ✗ Frontend: FAIL'
            ;;
        backend)
            curl -sf http://localhost:4800/health > /dev/null && echo '  ✓ Backend: OK' || echo '  ✗ Backend: FAIL'
            ;;
        documentos)
            curl -sf http://localhost:4802/health > /dev/null && echo '  ✓ Documentos: OK' || echo '  ✗ Documentos: FAIL'
            ;;
        remitos)
            curl -sf http://localhost:4803/health > /dev/null && echo '  ✓ Remitos: OK' || echo '  ✗ Remitos: FAIL'
            ;;
    esac
done
"

# Estado final
echo ""
log "Estado de contenedores:"
ssh -i "$SSH_KEY" "$USER@$SERVER" "docker ps --filter name=bca_ --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | head -10"

TOTAL_TIME=$(($(date +%s) - START_TIME))

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ DESPLIEGUE COMPLETADO EN ${TOTAL_TIME}s${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "URLs:"
echo "  Frontend:   http://$SERVER:8550"
echo "  Backend:    http://$SERVER:4800"
echo "  Documentos: http://$SERVER:4802"
echo "  Remitos:    http://$SERVER:4803"
echo ""
