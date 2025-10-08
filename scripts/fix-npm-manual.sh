#!/bin/bash

echo "🔧 Diagnóstico y corrección manual de NPM..."

echo "1. Verificando servicios locales:"
echo "   Frontend (8550):"
curl -s -I http://localhost:8550 | head -1
echo "   Backend (4800):"
curl -s -I http://localhost:4800/health | head -1
echo "   Documentos (4802):"
curl -s -I http://localhost:4802/health | head -1
echo "   MinIO (9000):"
curl -s -I http://localhost:9000 | head -1

echo -e "\n2. Verificando configuración actual de NPM:"
echo "   doc.microsyst.com.ar:"
curl -s -H "Host: doc.microsyst.com.ar" http://10.3.0.237/api/docs/documents/502/preview | head -1

echo -e "\n3. Verificando conectividad externa (puerto 443):"
nc -zv 168.197.248.68 443 2>&1 | grep -E "(succeeded|refused)"

echo -e "\n4. Instrucciones para configuración manual:"
echo "   Acceder a: http://10.3.0.237:81"
echo "   Verificar que doc.microsyst.com.ar apunte a:"
echo "   - Forward Hostname/IP: 10.3.0.244"
echo "   - Forward Port: 4802"
echo "   - SSL Certificate: Habilitado"
echo "   - Websockets Support: Habilitado"
