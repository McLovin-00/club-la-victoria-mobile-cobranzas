#!/bin/bash
set -euo pipefail

# =============================================================================
# deploy.sh - Deploy de un servicio en VM1
# Uso: ./deploy.sh <servicio> [version]
# Ejemplo: ./deploy.sh backend v1.2.3
# =============================================================================

SERVICE="${1:?Uso: ./deploy.sh <servicio> [version]}"
VERSION="${2:-latest}"
VM1_DIR="/home/administrador/monorepo-bca/deploy/stack-iplan/vm1"

echo "=== Deploying ${SERVICE} v${VERSION} ==="

cd "$VM1_DIR"

# Build
echo "[1/3] Building image..."
docker compose build "$SERVICE"

if [ "$VERSION" != "latest" ]; then
  docker tag "bca/${SERVICE}:latest" "bca/${SERVICE}:${VERSION}"
fi

# Stop + Start
echo "[2/3] Restarting service..."
docker compose stop "$SERVICE"
docker compose up -d "$SERVICE"

# Wait for health
echo "[3/3] Waiting for health check..."
for i in $(seq 1 30); do
  HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "bca_${SERVICE}" 2>/dev/null || echo "unknown")
  if [ "$HEALTH" = "healthy" ]; then
    echo "Service ${SERVICE} is healthy"
    exit 0
  fi
  echo "  ... status: ${HEALTH} (attempt ${i}/30)"
  sleep 2
done

echo "WARNING: Health check timeout after 60s"
echo "Recent logs:"
docker logs --tail 30 "bca_${SERVICE}"
exit 1
