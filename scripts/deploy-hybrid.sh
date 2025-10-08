#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Deploy HYBRID (IPs only): Infra in Docker, apps via PM2"

ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.hybrid-10.8.10.20}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Env file not found: $ENV_FILE"
  exit 1
fi
echo "🔑 Using env file: $ENV_FILE"
set -o allexport; source "$ENV_FILE"; set +o allexport

mkdir -p "$ROOT_DIR/logs"

echo "🌐 Starting infra Docker services (redis, minio)"
docker compose -f "$ROOT_DIR/docker-compose.hybrid.yml" up -d --remove-orphans minio redis

echo "⏳ Waiting for infra to be healthy"
sleep 8

echo "🧪 Health checks"
docker ps | cat

echo "🔧 Starting PM2 apps"
bash "$ROOT_DIR/scripts/pm2-start-hybrid.sh"

echo "✅ Hybrid deployment complete"
echo "IPs (adjust to your server IP):"
echo "- Frontend:     http://<SERVER_IP>:8550"
echo "- Backend API:  http://<SERVER_IP>:4800/api"
echo "- Documentos:   http://<SERVER_IP>:4802/api/docs"
echo "- MinIO:        http://<SERVER_IP>:9000"


