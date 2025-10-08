#!/bin/bash

# =================================
# SCRIPT DE DESARROLLO CONFIABLE
# Evita problemas de timeout del watcher de Turbo
# =================================

echo "🚀 Iniciando servicios de desarrollo de forma confiable..."
echo ""

# Limpiar procesos previos
echo "🧹 Limpiando procesos previos..."
pkill -f "ts-node-dev" 2>/dev/null || true
pkill -f "vite.*8550" 2>/dev/null || true
pkill -f "turbo" 2>/dev/null || true
sleep 2

# Crear directorio de logs si no existe
mkdir -p logs

# Función para iniciar servicio en background
start_service() {
    local service_name=$1
    local service_path=$2
    local log_file=$3
    
    echo "▶️  Iniciando $service_name..."
    cd "$service_path"
    npm run dev > "../../$log_file" 2>&1 &
    local pid=$!
    echo "   PID: $pid"
    cd - > /dev/null
    return $pid
}

# Iniciar servicios principales
echo ""
echo "🎯 Iniciando servicios principales..."

# Backend
start_service "Backend" "apps/backend" "logs/backend.dev.log"
BACKEND_PID=$!

# Frontend con dotenv-cli
echo "▶️  Iniciando Frontend con configuración de hosts..."
cd "apps/frontend"
npx dotenv-cli -e ../../.env -- npm run dev > "../../logs/frontend.dev.log" 2>&1 &
FRONTEND_PID=$!
echo "   PID: $FRONTEND_PID"
cd - > /dev/null

# Documentos (si está habilitado)
if grep -q "ENABLE_DOCUMENTOS=true" .env 2>/dev/null; then
    start_service "Documentos" "apps/documentos" "logs/documentos.dev.log"
    DOCUMENTOS_PID=$!
fi

# Esperar a que los servicios arranquen
echo ""
echo "⏳ Esperando servicios (10 segundos)..."
sleep 10

# Verificar estado
echo ""
echo "=== ESTADO DE SERVICIOS ==="
echo ""

# Verificar puertos
check_port() {
    local port=$1
    local service=$2
    if netstat -tln | grep -q ":$port "; then
        echo "✅ $service: http://localhost:$port"
    else
        echo "❌ $service: Puerto $port no disponible"
    fi
}

check_port 4800 "Backend API"
check_port 8550 "Frontend"
check_port 4802 "Documentos"

echo ""
echo "=== LOGS DE INICIO ==="
echo ""
echo "📋 Backend (últimas 5 líneas):"
tail -n 5 "logs/backend.dev.log" 2>/dev/null || echo "   Log no disponible aún"

echo ""
echo "📋 Frontend (últimas 5 líneas):"
tail -n 5 "logs/frontend.dev.log" 2>/dev/null || echo "   Log no disponible aún"

if [ ! -z "$DOCUMENTOS_PID" ]; then
    echo ""
    echo "📋 Documentos (últimas 5 líneas):"
    tail -n 5 "logs/documentos.dev.log" 2>/dev/null || echo "   Log no disponible aún"
fi

echo ""
echo "🎉 Servicios iniciados!"
echo ""
echo "📝 Para ver logs en tiempo real:"
echo "   tail -f logs/backend.dev.log"
echo "   tail -f logs/frontend.dev.log"
echo "   tail -f logs/documentos.dev.log"
echo ""
echo "🛑 Para detener servicios:"
echo "   bash scripts/stop-dev.sh"
echo ""
