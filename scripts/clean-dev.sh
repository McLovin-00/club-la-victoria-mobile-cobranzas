#!/bin/bash

# =================================
# SCRIPT DE LIMPIEZA PARA DESARROLLO
# Simplicidad y Elegancia - Steve Jobs Style
# =================================

echo "🧹 Iniciando limpieza inteligente del entorno de desarrollo..."

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
        echo "✅ Puerto $port disponible ($service_name)"
    fi
}

# Puertos del sistema
echo ""
echo "🔍 Verificando puertos del sistema..."
kill_port 4800 "Backend Principal"
kill_port 8550 "Frontend"
kill_port 5000 "Chat Processor Main"
kill_port 5001 "Chat Processor Internal"
kill_port 4802 "Documentos"
kill_port 4801 "Gateway"
kill_port 4815 "Calidad"

# Limpiar procesos ts-node-dev zombies
echo ""
echo "🧟 Limpiando procesos ts-node-dev zombies..."
pkill -f "ts-node-dev" 2>/dev/null || true

# Limpiar procesos vite zombies
echo "🧟 Limpiando procesos vite zombies..."
pkill -f "vite" 2>/dev/null || true

echo ""
echo "✨ Limpieza completada - Sistema listo para desarrollo"
echo "🚀 Ahora puedes ejecutar: npm run dev"
echo ""