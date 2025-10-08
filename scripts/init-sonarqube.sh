#!/bin/bash
set -euo pipefail

# =================================
# SCRIPT DE INICIALIZACIÓN DE SONARQUBE
# =================================
# Descripción: Configura SonarQube automáticamente para el proyecto
# Uso: ./scripts/init-sonarqube.sh
# Autor: DevOps/Back
# Fecha: 8 Octubre 2025
# =================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
SONAR_URL="${SONAR_URL:-http://localhost:9000}"
SONAR_ADMIN_USER="admin"
SONAR_ADMIN_PASS_DEFAULT="admin"
SONAR_ADMIN_PASS_NEW="${SONAR_ADMIN_PASS_NEW:-Admin2024!}"
PROJECT_KEY="monorepo-bca"
PROJECT_NAME="Monorepo BCA"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}INICIALIZACIÓN DE SONARQUBE${NC}"
echo -e "${BLUE}=========================================${NC}"

# =================================
# FUNCIONES
# =================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

wait_for_sonarqube() {
    log_info "Esperando que SonarQube esté listo..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "${SONAR_URL}/api/system/status" | grep -q "UP"; then
            log_info "✅ SonarQube está listo!"
            return 0
        fi
        
        echo -n "."
        sleep 5
        ((attempt++))
    done
    
    log_error "SonarQube no responde después de $max_attempts intentos"
    return 1
}

change_admin_password() {
    log_info "Intentando cambiar contraseña de admin..."
    
    # Verificar si ya fue cambiada
    if curl -s -u "${SONAR_ADMIN_USER}:${SONAR_ADMIN_PASS_NEW}" "${SONAR_URL}/api/authentication/validate" | grep -q "valid"; then
        log_info "✅ La contraseña ya fue cambiada anteriormente"
        export SONAR_PASS="${SONAR_ADMIN_PASS_NEW}"
        return 0
    fi
    
    # Intentar cambiar contraseña
    local response=$(curl -s -u "${SONAR_ADMIN_USER}:${SONAR_ADMIN_PASS_DEFAULT}" \
        -X POST "${SONAR_URL}/api/users/change_password" \
        -d "login=${SONAR_ADMIN_USER}" \
        -d "password=${SONAR_ADMIN_PASS_NEW}" \
        -d "previousPassword=${SONAR_ADMIN_PASS_DEFAULT}")
    
    if echo "$response" | grep -q "errors"; then
        log_warn "⚠️  No se pudo cambiar la contraseña automáticamente"
        log_warn "Por favor, cámbiala manualmente en http://localhost:9000"
        export SONAR_PASS="${SONAR_ADMIN_PASS_DEFAULT}"
    else
        log_info "✅ Contraseña cambiada exitosamente"
        export SONAR_PASS="${SONAR_ADMIN_PASS_NEW}"
    fi
}

create_project() {
    log_info "Creando proyecto ${PROJECT_NAME}..."
    
    # Verificar si el proyecto ya existe
    if curl -s -u "${SONAR_ADMIN_USER}:${SONAR_PASS}" \
        "${SONAR_URL}/api/projects/search?projects=${PROJECT_KEY}" | grep -q "${PROJECT_KEY}"; then
        log_info "✅ El proyecto ya existe"
        return 0
    fi
    
    # Crear proyecto
    local response=$(curl -s -u "${SONAR_ADMIN_USER}:${SONAR_PASS}" \
        -X POST "${SONAR_URL}/api/projects/create" \
        -d "name=${PROJECT_NAME}" \
        -d "project=${PROJECT_KEY}" \
        -d "mainBranch=main")
    
    if echo "$response" | grep -q "errors"; then
        log_error "❌ No se pudo crear el proyecto"
        echo "$response"
        return 1
    else
        log_info "✅ Proyecto creado exitosamente"
        return 0
    fi
}

generate_token() {
    log_info "Generando token de autenticación..."
    
    local token_name="github-actions-token"
    
    # Intentar generar token
    local response=$(curl -s -u "${SONAR_ADMIN_USER}:${SONAR_PASS}" \
        -X POST "${SONAR_URL}/api/user_tokens/generate" \
        -d "name=${token_name}")
    
    if echo "$response" | grep -q "token"; then
        local token=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        log_info "✅ Token generado exitosamente"
        echo ""
        echo -e "${GREEN}=========================================${NC}"
        echo -e "${GREEN}TOKEN DE SONARQUBE (GUARDAR SEGURO)${NC}"
        echo -e "${GREEN}=========================================${NC}"
        echo -e "${YELLOW}${token}${NC}"
        echo -e "${GREEN}=========================================${NC}"
        echo ""
        echo -e "${BLUE}Agregar este token a GitHub Secrets como:${NC}"
        echo -e "  Nombre: ${GREEN}SONAR_TOKEN${NC}"
        echo -e "  Valor: ${YELLOW}${token}${NC}"
        echo ""
        echo -e "${BLUE}También agregar:${NC}"
        echo -e "  Nombre: ${GREEN}SONAR_HOST_URL${NC}"
        echo -e "  Valor: ${YELLOW}${SONAR_URL}${NC}"
        echo ""
        return 0
    else
        log_warn "⚠️  No se pudo generar token automáticamente"
        log_warn "Genera el token manualmente en: ${SONAR_URL}"
        log_warn "My Account > Security > Generate Tokens"
        return 1
    fi
}

create_quality_gate() {
    log_info "Configurando Quality Gate..."
    
    local gate_name="Monorepo BCA Gate"
    
    # Verificar si el Quality Gate ya existe
    if curl -s -u "${SONAR_ADMIN_USER}:${SONAR_PASS}" \
        "${SONAR_URL}/api/qualitygates/list" | grep -q "${gate_name}"; then
        log_info "✅ Quality Gate ya existe"
        return 0
    fi
    
    # Crear Quality Gate
    local response=$(curl -s -u "${SONAR_ADMIN_USER}:${SONAR_PASS}" \
        -X POST "${SONAR_URL}/api/qualitygates/create" \
        -d "name=${gate_name}")
    
    if echo "$response" | grep -q "id"; then
        local gate_id=$(echo "$response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
        log_info "✅ Quality Gate creado con ID: ${gate_id}"
        
        # Agregar condiciones al Quality Gate
        log_info "Agregando condiciones al Quality Gate..."
        
        # Coverage >= 70%
        curl -s -u "${SONAR_ADMIN_USER}:${SONAR_PASS}" \
            -X POST "${SONAR_URL}/api/qualitygates/create_condition" \
            -d "gateId=${gate_id}" \
            -d "metric=new_coverage" \
            -d "op=LT" \
            -d "error=70" > /dev/null
        
        # Duplications <= 3%
        curl -s -u "${SONAR_ADMIN_USER}:${SONAR_PASS}" \
            -X POST "${SONAR_URL}/api/qualitygates/create_condition" \
            -d "gateId=${gate_id}" \
            -d "metric=new_duplicated_lines_density" \
            -d "op=GT" \
            -d "error=3" > /dev/null
        
        # Maintainability Rating = A
        curl -s -u "${SONAR_ADMIN_USER}:${SONAR_PASS}" \
            -X POST "${SONAR_URL}/api/qualitygates/create_condition" \
            -d "gateId=${gate_id}" \
            -d "metric=new_maintainability_rating" \
            -d "op=GT" \
            -d "error=1" > /dev/null
        
        # Reliability Rating = A
        curl -s -u "${SONAR_ADMIN_USER}:${SONAR_PASS}" \
            -X POST "${SONAR_URL}/api/qualitygates/create_condition" \
            -d "gateId=${gate_id}" \
            -d "metric=new_reliability_rating" \
            -d "op=GT" \
            -d "error=1" > /dev/null
        
        # Security Rating = A
        curl -s -u "${SONAR_ADMIN_USER}:${SONAR_PASS}" \
            -X POST "${SONAR_URL}/api/qualitygates/create_condition" \
            -d "gateId=${gate_id}" \
            -d "metric=new_security_rating" \
            -d "op=GT" \
            -d "error=1" > /dev/null
        
        log_info "✅ Condiciones del Quality Gate configuradas"
        
        # Asociar Quality Gate al proyecto
        curl -s -u "${SONAR_ADMIN_USER}:${SONAR_PASS}" \
            -X POST "${SONAR_URL}/api/qualitygates/select" \
            -d "gateId=${gate_id}" \
            -d "projectKey=${PROJECT_KEY}" > /dev/null
        
        log_info "✅ Quality Gate asociado al proyecto"
        
        return 0
    else
        log_warn "⚠️  No se pudo crear Quality Gate automáticamente"
        return 1
    fi
}

# =================================
# MAIN
# =================================

main() {
    log_info "Iniciando configuración de SonarQube..."
    log_info "URL: ${SONAR_URL}"
    echo ""
    
    # Verificar si Docker está corriendo
    if ! docker ps &> /dev/null; then
        log_error "Docker no está corriendo o no tienes permisos"
        exit 1
    fi
    
    # Verificar si SonarQube está levantado
    if ! docker ps | grep -q sonarqube; then
        log_warn "SonarQube no está corriendo. Levantando..."
        docker compose -f docker-compose.sonarqube.yml up -d
        sleep 10
    fi
    
    # Esperar que SonarQube esté listo
    if ! wait_for_sonarqube; then
        log_error "SonarQube no está disponible"
        exit 1
    fi
    
    echo ""
    
    # Cambiar contraseña de admin
    change_admin_password
    echo ""
    
    # Crear proyecto
    if create_project; then
        echo ""
        
        # Generar token
        generate_token
        echo ""
        
        # Crear Quality Gate
        create_quality_gate
        echo ""
    fi
    
    log_info "========================================="
    log_info "✅ CONFIGURACIÓN COMPLETADA"
    log_info "========================================="
    echo ""
    log_info "Próximos pasos:"
    echo "  1. Agregar SONAR_TOKEN y SONAR_HOST_URL a GitHub Secrets"
    echo "  2. Ejecutar análisis local: npm run sonar (si está configurado)"
    echo "  3. O ejecutar PR para que CI ejecute el análisis automáticamente"
    echo ""
    log_info "Acceso a SonarQube:"
    echo "  URL: ${SONAR_URL}"
    echo "  Usuario: ${SONAR_ADMIN_USER}"
    echo "  Contraseña: ${SONAR_PASS}"
    echo ""
}

# Ejecutar main
main

exit 0

