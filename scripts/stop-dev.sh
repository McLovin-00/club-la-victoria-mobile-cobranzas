#!/bin/bash

# =================================
# SCRIPT PARA DETENER SERVICIOS DE DESARROLLO
# =================================

echo "🛑 Deteniendo servicios de desarrollo..."
echo ""

# Función para terminar procesos por puerto
kill_port() {
    local port=$1
    local service_name=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        echo "⚠️  Terminando proceso en puerto $port ($service_name)..."
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        sleep 1
        
        if lsof -i :$port >/dev/null 2>&1; then
            echo "❌ No se pudo liberar puerto $port"
            return 1
        else
            echo "✅ Puerto $port liberado ($service_name)"
        fi
    else
        echo "✅ Puerto $port ya disponible ($service_name)"
    fi
}

# Terminar procesos por tipo
echo "🧟 Terminando procesos de desarrollo..."
pkill -f "ts-node-dev" 2>/dev/null || true
pkill -f "vite.*8550" 2>/dev/null || true
pkill -f "turbo" 2>/dev/null || true

echo ""
echo "🔍 Liberando puertos específicos..."
kill_port 4800 "Backend"
kill_port 8550 "Frontend"
kill_port 4802 "Documentos"
kill_port 4801 "Gateway"
kill_port 5000 "Chat Processor"
kill_port 4815 "Calidad"

echo ""
echo "✨ Todos los servicios detenidos"
echo "🚀 Ahora puedes ejecutar: bash scripts/dev-reliable.sh"
echo ""
