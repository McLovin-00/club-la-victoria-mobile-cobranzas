#!/bin/bash
set -euo pipefail

# =================================
# PRODUCTION DEPLOYMENT SCRIPT
# Separación Clara de Redes Internas/Externas
# =================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Iniciando despliegue de producción con separación de redes..."

# Verificar archivos necesarios
if [[ ! -f "$ROOT_DIR/.env" ]]; then
    echo "❌ Error: .env no encontrado en $ROOT_DIR"
    exit 1
fi

if [[ ! -f "$ROOT_DIR/docker-compose.prod.yml" ]]; then
    echo "❌ Error: docker-compose.prod.yml no encontrado"
    exit 1
fi

if [[ ! -f "$ROOT_DIR/nginx/nginx.conf" ]]; then
    echo "❌ Error: nginx/nginx.conf no encontrado"
    exit 1
fi

# Cargar variables de entorno
source "$ROOT_DIR/.env"

# Verificar variables críticas
REQUIRED_VARS=(
    "DB_USER"
    "DB_PASSWORD" 
    "DB_NAME"
    "MINIO_ACCESS_KEY"
    "MINIO_SECRET_KEY"
    "DATABASE_URL"
    "DOCUMENTOS_DATABASE_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        echo "❌ Error: Variable de entorno $var no está definida"
        exit 1
    fi
done

echo "✅ Variables de entorno verificadas"

# Crear directorio SSL si no existe
mkdir -p "$ROOT_DIR/nginx/ssl"

# Crear redes Docker Swarm si no existen
echo "🌐 Configurando redes Docker Swarm..."
docker network create --driver overlay --attachable frontend 2>/dev/null || echo "Red 'frontend' ya existe"
docker network create --driver overlay --attachable backend 2>/dev/null || echo "Red 'backend' ya existe"

# Construir imágenes
echo "🏗️ Construyendo imágenes..."
cd "$ROOT_DIR"

# Frontend
docker build -t frontend:latest ./apps/frontend

# Backend  
docker build -t backend:latest ./apps/backend

# Documentos
docker build -t documentos:latest ./apps/documentos

echo "✅ Imágenes construidas"

# Desplegar stack
echo "📦 Desplegando stack de producción..."
docker stack deploy -c docker-compose.prod.yml monorepo-prod

echo "⏳ Esperando que los servicios estén listos..."
sleep 30

# Verificar estado de servicios
echo "🔍 Verificando estado de servicios..."
docker service ls

# Verificar servicios críticos
CRITICAL_SERVICES=(
    "monorepo-prod_nginx"
    "monorepo-prod_frontend"
    "monorepo-prod_backend"
    "monorepo-prod_documentos"
    "monorepo-prod_minio"
    "monorepo-prod_postgres"
    "monorepo-prod_redis"
)

for service in "${CRITICAL_SERVICES[@]}"; do
    echo "Verificando $service..."
    replicas=$(docker service inspect --format='{{.Spec.TaskTemplate.ContainerSpec.Image}}' "$service" 2>/dev/null || echo "NOT_FOUND")
    if [[ "$replicas" == "NOT_FOUND" ]]; then
        echo "⚠️  Servicio $service no encontrado"
    else
        echo "✅ Servicio $service desplegado"
    fi
done

echo ""
echo "🎉 Despliegue completado!"
echo ""
echo "📋 CONFIGURACIÓN DE ACCESO:"
echo "================================"
echo "🌐 Frontend:     https://bca.microsyst.com.ar"
echo "📄 Documentos:   https://doc.microsyst.com.ar"
echo "🪣 MinIO:        https://buck.microsyst.com.ar"
echo ""
echo "🔒 SERVICIOS INTERNOS (NO accesibles externamente):"
echo "- PostgreSQL:    postgres:5432 (solo red backend)"
echo "- Redis:         redis:6379 (solo red backend)"
echo "- MinIO interno: minio:9000 (solo red backend)"
echo ""
echo "📝 LOGS:"
echo "docker service logs monorepo-prod_nginx"
echo "docker service logs monorepo-prod_frontend"
echo "docker service logs monorepo-prod_backend"
echo "docker service logs monorepo-prod_documentos"
echo ""
echo "🔧 ESCALADO:"
echo "docker service scale monorepo-prod_frontend=3"
echo "docker service scale monorepo-prod_backend=3"
echo "docker service scale monorepo-prod_documentos=3"
echo ""
echo "🛑 PARAR:"
echo "docker stack rm monorepo-prod"
