#!/bin/bash

# Script de prueba para Evolution API sendMedia endpoint
# Uso: ./test-evolution-sendmedia.sh

set -e

# Configuración
EVOLUTION_URL="${EVOLUTION_URL:-http://10.3.0.246:2500}"
INSTANCE_NAME="${INSTANCE_NAME:-Microsyst}"
API_KEY="${API_KEY:-429683C4C977415CAAFCCE10F7D57E11}"
PHONE_NUMBER="${PHONE_NUMBER:-5493413557999}"

# Archivo de prueba (crear imagen de prueba si no existe)
if [ ! -f "image_1752160115390.jpeg" ]; then
    echo "Creando imagen de prueba..."
    # Crear una imagen simple de 100x100 pixels
    convert -size 100x100 xc:red image_1752160115390.jpeg 2>/dev/null || {
        echo "⚠️ ImageMagick no encontrado. Usando archivo de texto como prueba."
        echo "Test file content" > test-image.txt
        TEST_FILE="image_1752160115390.jpeg"
        MIME_TYPE="image/jpeg"
    }
else
    TEST_FILE="image_1752160115390.jpeg"
    MIME_TYPE="image/jpeg"
fi

TEST_FILE="${TEST_FILE:-image_1752160115390.jpeg}"
MIME_TYPE="${MIME_TYPE:-image/jpeg}"

echo "🧪 Probando Evolution API sendMedia endpoint"
echo "======================================================"
echo "URL: ${EVOLUTION_URL}/message/sendMedia/${INSTANCE_NAME}"
echo "Archivo: ${TEST_FILE}"
echo "Número: ${PHONE_NUMBER}"
echo "======================================================"

# Test 1: Envío básico con caption
echo "Test 1: Envío básico con caption"
echo "--------------------------------"

curl -X POST \
  "${EVOLUTION_URL}/message/sendMedia/${INSTANCE_NAME}" \
  -H "apikey: ${API_KEY}" \
  -H "Content-Type: multipart/form-data" \
  -F "number=${PHONE_NUMBER}" \
  -F "media=@${TEST_FILE};type=${MIME_TYPE}" \
  -F "caption=Test message from curl script - $(date)" \
  -w "\nHTTP Status: %{http_code}\nTime: %{time_total}s\n" \
  -v || echo "❌ Test 1 falló"

echo -e "\n\n"

# Test 2: Envío sin caption
echo "Test 2: Envío sin caption"
echo "-------------------------"

curl -X POST \
  "${EVOLUTION_URL}/message/sendMedia/${INSTANCE_NAME}" \
  -H "apikey: ${API_KEY}" \
  -H "Content-Type: multipart/form-data" \
  -F "number=${PHONE_NUMBER}" \
  -F "media=@${TEST_FILE};type=${MIME_TYPE}" \
  -w "\nHTTP Status: %{http_code}\nTime: %{time_total}s\n" \
  -s || echo "❌ Test 2 falló"

echo -e "\n\n"

# Test 3: Verificar estado de la instancia
echo "Test 3: Verificar estado de instancia"
echo "-------------------------------------"

curl -X GET \
  "${EVOLUTION_URL}/instance/connectionState/${INSTANCE_NAME}" \
  -H "apikey: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || echo "Respuesta recibida (jq no disponible para formato JSON)"

echo -e "\n"

# Test 4: Ejemplo con archivo más grande (si existe)
if [ -f "large-test-file.jpg" ]; then
    echo "Test 4: Archivo grande (large-test-file.jpg)"
    echo "--------------------------------------------"
    
    curl -X POST \
      "${EVOLUTION_URL}/message/sendMedia/${INSTANCE_NAME}" \
      -H "apikey: ${API_KEY}" \
      -H "Content-Type: multipart/form-data" \
      -F "number=${PHONE_NUMBER}" \
      -F "media=@image_1752160115390.jpeg;type=image/jpeg" \
      -F "caption=Large file test - $(date)" \
      -w "\nHTTP Status: %{http_code}\nTime: %{time_total}s\n" \
      --max-time 180 \
      -v || echo "❌ Test 4 falló"
fi

echo ""
echo "✅ Pruebas completadas."
echo ""
echo "Notas importantes:"
echo "- Asegúrate de que INSTANCE_NAME esté conectada ('open')"
echo "- El número de teléfono debe incluir código de país (ej: 5511999999999)"
echo "- El archivo se envía con el campo 'media' (no 'mediafile')"
echo "- Content-Type se maneja automáticamente por FormData"
echo "- Timeout por defecto: 120 segundos"
echo ""
echo "Variables de entorno disponibles:"
echo "- EVOLUTION_URL (default: http://10.3.0.246:9080)"
echo "- INSTANCE_NAME (default: Microsyst)"
echo "- API_KEY (429683C4C977415CAAFCCE10F7D57E11)"
echo "- PHONE_NUMBER (default: 5493413557999)"