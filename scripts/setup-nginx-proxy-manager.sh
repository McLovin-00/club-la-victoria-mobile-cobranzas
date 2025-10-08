#!/bin/bash
set -euo pipefail

# =================================
# CONFIGURACIÓN AUTOMÁTICA DE NGINX PROXY MANAGER
# =================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración de NPM
NPM_HOST="${NPM_HOST:-10.3.0.237:81}"
NPM_USER="${NPM_USER:-admin@example.com}"
NPM_PASS="${NPM_PASS:-changeme}"

# Configuración de servicios
SERVER_IP="${SERVER_IP:-10.3.0.244}"

echo "🔧 Configurando Nginx Proxy Manager automáticamente..."
echo "📍 NPM Host: $NPM_HOST"
echo "🖥️  Server IP: $SERVER_IP"
echo ""

# Función para hacer login y obtener token
npm_login() {
    local response
    response=$(curl -s -X POST "http://$NPM_HOST/api/tokens" \
        -H "Content-Type: application/json" \
        -d '{
            "identity": "'$NPM_USER'",
            "password": "'$NPM_PASS'"
        }' || echo "ERROR")
    
    if [[ "$response" == "ERROR" ]]; then
        echo -e "${RED}❌ Error conectando a NPM en $NPM_HOST${NC}"
        echo "   Verifica que NPM esté funcionando y las credenciales sean correctas"
        exit 1
    fi
    
    local token
    token=$(echo "$response" | jq -r '.token // empty' 2>/dev/null || echo "")
    
    if [[ -z "$token" ]]; then
        echo -e "${RED}❌ Error obteniendo token de NPM${NC}"
        echo "   Respuesta: $response"
        exit 1
    fi
    
    echo "$token"
}

# Función para crear un proxy host
create_proxy_host() {
    local domain="$1"
    local forward_host="$2"
    local forward_port="$3"
    local ssl_enabled="$4"
    local websockets="$5"
    local block_exploits="$6"
    local advanced_config="$7"
    local token="$8"
    
    echo "Creating proxy host for $domain..."
    
    local ssl_config=""
    if [[ "$ssl_enabled" == "true" ]]; then
        ssl_config='"ssl_forced": true, "ssl_provider": "letsencrypt", "hsts_enabled": true, "http2_support": true,'
    else
        ssl_config='"ssl_forced": false, "ssl_provider": "other", "hsts_enabled": false, "http2_support": false,'
    fi
    
    local response
    response=$(curl -s -X POST "http://$NPM_HOST/api/nginx/proxy-hosts" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d '{
            "domain_names": ["'$domain'"],
            "forward_scheme": "http",
            "forward_host": "'$forward_host'",
            "forward_port": '$forward_port',
            "access_list_id": 0,
            "certificate_id": 0,
            "ssl_forced": '$([[ "$ssl_enabled" == "true" ]] && echo "true" || echo "false")',
            "caching_enabled": false,
            "block_exploits": '$([[ "$block_exploits" == "true" ]] && echo "true" || echo "false")',
            "advanced_config": "'"$advanced_config"'",
            "meta": {
                "letsencrypt_agree": true,
                "dns_challenge": false
            },
            "allow_websocket_upgrade": '$([[ "$websockets" == "true" ]] && echo "true" || echo "false")',
            "http2_support": '$([[ "$ssl_enabled" == "true" ]] && echo "true" || echo "false")',
            "hsts_enabled": '$([[ "$ssl_enabled" == "true" ]] && echo "true" || echo "false")',
            "hsts_subdomains": false
        }')
    
    local host_id
    host_id=$(echo "$response" | jq -r '.id // empty' 2>/dev/null || echo "")
    
    if [[ -n "$host_id" && "$host_id" != "null" ]]; then
        echo -e "   ${GREEN}✅ Creado: $domain (ID: $host_id)${NC}"
        return 0
    else
        echo -e "   ${RED}❌ Error creando $domain${NC}"
        echo "   Respuesta: $response"
        return 1
    fi
}

# Función para obtener hosts existentes
get_existing_hosts() {
    local token="$1"
    curl -s -X GET "http://$NPM_HOST/api/nginx/proxy-hosts" \
        -H "Authorization: Bearer $token" | jq -r '.[].domain_names[]' 2>/dev/null || echo ""
}

# Login a NPM
echo "🔐 Autenticando en NPM..."
TOKEN=$(npm_login)
echo -e "${GREEN}✅ Autenticado correctamente${NC}"

# Verificar hosts existentes
echo "🔍 Verificando hosts existentes..."
EXISTING_HOSTS=$(get_existing_hosts "$TOKEN")
echo "   Hosts existentes: $(echo "$EXISTING_HOSTS" | tr '\n' ' ')"

# Configuraciones de proxy hosts
declare -A PROXY_CONFIGS=(
    # Documentos Microservice
    ["doc.microsyst.com.ar"]="$SERVER_IP 4802 true true true proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; client_max_body_size 50M; proxy_read_timeout 300s;"
    
    # MinIO Storage
    ["buck.microsyst.com.ar"]="$SERVER_IP 9000 true false false proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; proxy_buffering off; proxy_request_buffering off; client_max_body_size 100M; proxy_read_timeout 300s;"
    
    # Calidad Microservice (si está habilitado)
    ["bac-bca.microsyst.com.ar"]="$SERVER_IP 4815 true true true proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; proxy_read_timeout 60s;"
)

echo ""
echo "🚀 Creando proxy hosts..."

# Crear cada proxy host
for domain in "${!PROXY_CONFIGS[@]}"; do
    # Verificar si ya existe
    if echo "$EXISTING_HOSTS" | grep -q "^$domain$"; then
        echo -e "   ${YELLOW}⚠️  $domain ya existe, saltando...${NC}"
        continue
    fi
    
    # Parsear configuración
    IFS=' ' read -r forward_host forward_port ssl_enabled websockets block_exploits advanced_config <<< "${PROXY_CONFIGS[$domain]}"
    
    # Crear host
    create_proxy_host "$domain" "$forward_host" "$forward_port" "$ssl_enabled" "$websockets" "$block_exploits" "$advanced_config" "$TOKEN"
    
    # Pausa entre creaciones para evitar rate limiting
    sleep 2
done

echo ""
echo "🔍 Verificando configuración..."

# Verificar hosts creados
FINAL_HOSTS=$(get_existing_hosts "$TOKEN")
echo "Hosts configurados:"
for domain in "${!PROXY_CONFIGS[@]}"; do
    if echo "$FINAL_HOSTS" | grep -q "^$domain$"; then
        echo -e "   ${GREEN}✅ $domain${NC}"
    else
        echo -e "   ${RED}❌ $domain${NC}"
    fi
done

echo ""
echo "🎉 Configuración de NPM completada!"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Verificar que los certificados SSL se generen correctamente"
echo "2. Ejecutar: ./scripts/test-proxy-routes.sh"
echo "3. Verificar que las imágenes de buckets se visualicen correctamente"
echo ""
echo "🌐 URLs configuradas:"
for domain in "${!PROXY_CONFIGS[@]}"; do
    echo "   https://$domain"
done
