#!/bin/bash

###############################################################################
# Script para crear usuario ADMIN_INTERNO en el servidor 10.3.0.243
#
# Este script ejecuta el seed dentro del contenedor de backend
#
# Uso:
#   cd /home/administrador/monorepo-bca/deploy/stack-ip-10.3.0.243
#   ./seed-admin-interno.sh
###############################################################################

echo "🚀 Creando usuario ADMIN_INTERNO en servidor 10.3.0.243..."
echo ""

# Nombre del contenedor del backend
BACKEND_CONTAINER_NAME="bca_backend"

# Verificar que el contenedor backend existe y está corriendo
if ! docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER_NAME}$"; then
    echo "❌ Error: El contenedor '${BACKEND_CONTAINER_NAME}' no está corriendo"
    echo "   Asegúrate de que docker-compose esté ejecutándose"
    echo ""
    echo "   Contenedores actuales:"
    docker ps --format '   - {{.Names}} ({{.Status}})'
    exit 1
fi

echo "📦 Contenedor '${BACKEND_CONTAINER_NAME}' encontrado"
echo "📝 Ejecutando seed dentro del contenedor..."
echo ""

# Ejecutar el script de seed dentro del contenedor
docker exec -i ${BACKEND_CONTAINER_NAME} npx ts-node -r tsconfig-paths/register /app/scripts/seed-admin-interno.ts

SEED_EXIT_CODE=$?

echo ""
if [ $SEED_EXIT_CODE -eq 0 ]; then
    echo "✅ Usuario ADMIN_INTERNO creado exitosamente!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🌐 DATOS DE ACCESO - ADMIN INTERNO"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "   📧 Email:     admin.interno@bca.com"
    echo "   🔑 Password:  Admin2024!"
    echo ""
    echo "   🔗 Login:     http://10.3.0.243:8550/login"
    echo "   🏠 Portal:    http://10.3.0.243:8550/portal/admin-interno"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✨ ¡Listo para usar!"
else
    echo "❌ Error al crear usuario ADMIN_INTERNO"
    echo "   Revisa los logs arriba para más detalles"
    exit 1
fi
