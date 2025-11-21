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

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: No se encontró docker-compose.yml"
    echo "   Asegúrate de estar en el directorio deploy/stack-ip-10.3.0.243/"
    exit 1
fi

# Verificar que el contenedor backend existe
if ! docker ps -a --format '{{.Names}}' | grep -q 'backend'; then
    echo "❌ Error: No se encontró el contenedor backend"
    echo "   Asegúrate de que docker-compose esté ejecutándose"
    exit 1
fi

echo "📦 Ejecutando seed dentro del contenedor backend..."
echo ""

# Ejecutar el script de seed dentro del contenedor
docker exec -it stack-ip-10.3.0.243-backend-1 sh -c "cd /app && npx ts-node -r tsconfig-paths/register /app/scripts/seed-admin-interno.ts"

SEED_EXIT_CODE=$?

echo ""
if [ $SEED_EXIT_CODE -eq 0 ]; then
    echo "✅ Usuario ADMIN_INTERNO creado exitosamente!"
    echo ""
    echo "🌐 Datos de acceso:"
    echo "   URL:      http://10.3.0.243:3000/login"
    echo "   Email:    admin.interno@bca.com"
    echo "   Password: Admin2024!"
    echo "   Portal:   http://10.3.0.243:3000/portal/admin-interno"
    echo ""
    echo "✨ ¡Listo para usar!"
else
    echo "❌ Error al crear usuario ADMIN_INTERNO"
    echo "   Revisa los logs arriba para más detalles"
    exit 1
fi

