#!/bin/bash
set -euo pipefail

# =================================
# SCRIPT DE VERIFICACIÓN DE RUTAS PROXY
# =================================

echo "🔍 Verificando configuración de proxy y rutas..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para hacer requests y mostrar resultados
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="$3"
    
    echo -n "Testing $name: "
    
    # Hacer request y capturar código de estado
    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    if [[ "$response_code" == "$expected_code" ]]; then
        echo -e "${GREEN}✅ $response_code${NC}"
    else
        echo -e "${RED}❌ $response_code (expected $expected_code)${NC}"
        
        # Mostrar headers para debugging
        echo "   Headers:"
        curl -s -I "$url" | head -5 | sed 's/^/     /'
        echo ""
    fi
}

echo "==================================="
echo "🏠 SERVICIOS LOCALES (desarrollo)"
echo "==================================="

test_endpoint "Backend Health" "http://localhost:4800/api/health" "200"
test_endpoint "Documentos Health" "http://localhost:4802/health/ready" "200"
test_endpoint "Frontend" "http://localhost:8550" "200"
test_endpoint "MinIO" "http://10.3.0.244:9000/minio/health/ready" "200"

echo ""
echo "==================================="
echo "🌐 DOMINIOS PÚBLICOS (a través de proxy)"
echo "==================================="

test_endpoint "Frontend Público" "https://bca.microsyst.com.ar" "200"
test_endpoint "Backend API Público" "https://bca.microsyst.com.ar/api/health" "200"
test_endpoint "Documentos Público" "https://doc.microsyst.com.ar/health/ready" "200"
test_endpoint "MinIO Público" "https://buck.microsyst.com.ar" "200"

echo ""
echo "==================================="
echo "📄 RUTAS ESPECÍFICAS DE DOCUMENTOS"
echo "==================================="

# Estas rutas requieren autenticación, así que esperamos 401
test_endpoint "Documents Preview (sin auth)" "https://doc.microsyst.com.ar/api/docs/documents/508/preview" "401"
test_endpoint "Documents Upload (sin auth)" "https://doc.microsyst.com.ar/api/docs/documents/upload" "401"
test_endpoint "Documents Status (sin auth)" "https://doc.microsyst.com.ar/api/docs/documents/status" "401"

# Ruta pública
test_endpoint "Templates (sin auth)" "https://doc.microsyst.com.ar/api/docs/templates" "401"

echo ""
echo "==================================="
echo "🔧 RUTAS DE DIAGNÓSTICO"
echo "==================================="

test_endpoint "Doc Root Info" "https://doc.microsyst.com.ar/" "200"
test_endpoint "Doc OpenAPI" "https://doc.microsyst.com.ar/openapi.yaml" "200"

echo ""
echo "==================================="
echo "📊 COMPARACIÓN LOCAL vs PÚBLICO"
echo "==================================="

echo "Testing same endpoint locally and publicly..."

echo -n "Local preview (401): "
local_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4802/api/docs/documents/508/preview" || echo "000")
echo -e "${BLUE}$local_code${NC}"

echo -n "Public preview:      "
public_code=$(curl -s -o /dev/null -w "%{http_code}" "https://doc.microsyst.com.ar/api/docs/documents/508/preview" || echo "000")
echo -e "${BLUE}$public_code${NC}"

if [[ "$local_code" == "$public_code" ]]; then
    echo -e "${GREEN}✅ Códigos coinciden - Proxy funcionando correctamente${NC}"
else
    echo -e "${RED}❌ Códigos diferentes - Problema en configuración de proxy${NC}"
    echo ""
    echo "🔍 Debugging info:"
    echo "Local response headers:"
    curl -s -I "http://localhost:4802/api/docs/documents/508/preview" | head -3 | sed 's/^/   /'
    echo ""
    echo "Public response headers:"
    curl -s -I "https://doc.microsyst.com.ar/api/docs/documents/508/preview" | head -3 | sed 's/^/   /'
fi

echo ""
echo "==================================="
echo "📝 RECOMENDACIONES"
echo "==================================="

if [[ "$public_code" == "404" && "$local_code" == "401" ]]; then
    echo -e "${YELLOW}⚠️  PROBLEMA IDENTIFICADO:${NC}"
    echo "   El proxy no está reenviando correctamente las rutas"
    echo "   Local: 401 (correcto - requiere auth)"
    echo "   Público: 404 (incorrecto - debería ser 401)"
    echo ""
    echo -e "${BLUE}💡 SOLUCIÓN:${NC}"
    echo "   1. Verificar configuración en Nginx Proxy Manager"
    echo "   2. Asegurar que el proxy_pass apunte a http://10.3.0.244:4802"
    echo "   3. Verificar que se preserven las rutas (/api/docs/...)"
    echo "   4. Ver docs/NGINX_PROXY_MANAGER_CONFIG.md para configuración detallada"
    echo ""
elif [[ "$public_code" == "$local_code" ]]; then
    echo -e "${GREEN}✅ Proxy funcionando correctamente${NC}"
    echo "   Ambos endpoints devuelven el mismo código de estado"
    echo ""
else
    echo -e "${YELLOW}⚠️  Código inesperado: $public_code${NC}"
    echo "   Verificar logs de nginx y del microservicio"
fi

echo "==================================="
echo "🏁 Verificación completada"
echo "==================================="
