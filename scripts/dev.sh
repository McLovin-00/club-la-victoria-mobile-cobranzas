#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

kill_ports() {
  # Defaults if env vars are not set
  local FRONTEND_PORT_="${FRONTEND_PORT:-8550}"
  local VITE_PORT_="${VITE_PORT:-$FRONTEND_PORT_}"
  local BACKEND_PORT_="${BACKEND_PORT:-4800}"
  local DOCUMENTOS_PORT_="${DOCUMENTOS_PORT:-4802}"
  local CALIDAD_PORT_="${CALIDAD_PORT:-4815}"

  echo "🔻 Stopping dev servers on ports: $FRONTEND_PORT_ $VITE_PORT_ $BACKEND_PORT_ $DOCUMENTOS_PORT_ $CALIDAD_PORT_"
  for p in "$FRONTEND_PORT_" "$VITE_PORT_" "$BACKEND_PORT_" "$DOCUMENTOS_PORT_" "$CALIDAD_PORT_"; do
    if [[ -n "$p" ]]; then
      fuser -k "${p}/tcp" >/dev/null 2>&1 || true
    fi
  done
}

cleanup() {
  echo "\n🧹 Cleaning up dev environment (CTRL+C detected)..."
  kill_ports
}

trap cleanup INT TERM

cd "$ROOT_DIR"

# Optional pre-clean
npm run clean-dev >/dev/null 2>&1 || true

echo "🚀 Starting monorepo dev with env from .env (override enabled)"

# MinIO (manual): para levantar almacenamiento local en dev:
# docker compose -f "$ROOT_DIR/docker-compose.dev.yml" up -d minio
# Consola: http://localhost:9001 (usuario/clave: minioadmin/minioadmin)

# Run all dev:* in parallel with .env loaded; when it ends (or SIGINT), cleanup will run
npx dotenv-cli -e .env --override -- npm-run-all --parallel dev:* || true

# Failsafe cleanup after processes exit
kill_ports

echo "✅ Dev environment stopped."
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  echo "\n🧹 Parando servicios de desarrollo..."
  bash "$ROOT_DIR/scripts/clean-dev.sh" || true
}

trap cleanup EXIT INT TERM

# Limpieza inicial para evitar puertos ocupados
bash "$ROOT_DIR/scripts/clean-dev.sh"

# Ejecutar todos los servicios en paralelo con variables de entorno
npx dotenv -e "$ROOT_DIR/.env" -- npm-run-all --parallel \
  dev:frontend dev:backend dev:gateway dev:chat-processor dev:documentos dev:calidad

# Nota: Prisma generate/deploy para chat-processor se ejecuta al inicio de su script dev
if [ "$ENABLE_CHAT" = "true" ]; then
  echo "[dev] (info) Para chat-processor, recuerde definir DATABASE_URL_CHAT en .env"
fi


