#!/bin/bash
#
# cleanup-docker.sh
# Limpia recursos Docker no utilizados (imágenes, contenedores, volúmenes, redes)
# Uso: ./scripts/cleanup-docker.sh [--aggressive] [--dry-run]
#
# Autor: DevOps Team
# Fecha: 2025-10-08

set -e

# Configuración
DRY_RUN=false
AGGRESSIVE=false

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --aggressive)
            AGGRESSIVE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--dry-run] [--aggressive]"
            exit 1
            ;;
    esac
done

# Función para mostrar espacio liberado
show_disk_usage() {
    echo -e "${BLUE}Current disk usage:${NC}"
    df -h / | grep -v Filesystem
    echo ""
}

# Función para confirmar acción
confirm() {
    local message=$1
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY-RUN] Would execute: $message${NC}"
        return 0
    fi
    
    echo -n "$message Continue? (y/N): "
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        return 0
    else
        echo "Skipped."
        return 1
    fi
}

# Limpiar contenedores detenidos
cleanup_containers() {
    echo ""
    echo "=========================================="
    echo "  Cleaning Stopped Containers"
    echo "=========================================="
    
    stopped=$(docker ps -aq --filter "status=exited" --filter "status=created" | wc -l)
    
    if [ "$stopped" -eq 0 ]; then
        echo -e "${GREEN}✓ No stopped containers to clean${NC}"
        return 0
    fi
    
    echo "Found $stopped stopped container(s)"
    
    if confirm "Remove $stopped stopped container(s)?"; then
        if [ "$DRY_RUN" = false ]; then
            docker container prune -f
            echo -e "${GREEN}✓ Removed stopped containers${NC}"
        fi
    fi
}

# Limpiar imágenes no utilizadas
cleanup_images() {
    echo ""
    echo "=========================================="
    echo "  Cleaning Unused Images"
    echo "=========================================="
    
    if [ "$AGGRESSIVE" = true ]; then
        # Modo agresivo: elimina TODAS las imágenes no usadas (incluso tagged)
        dangling=$(docker images -f "dangling=true" -q | wc -l)
        unused=$(docker images --filter "dangling=false" -q | wc -l)
        total=$((dangling + unused))
        
        echo "Found $dangling dangling image(s) and $unused potentially unused image(s)"
        
        if confirm "Remove ALL unused images (aggressive mode)?"; then
            if [ "$DRY_RUN" = false ]; then
                docker image prune -af
                echo -e "${GREEN}✓ Removed unused images${NC}"
            fi
        fi
    else
        # Modo normal: solo imágenes dangling (sin tag)
        dangling=$(docker images -f "dangling=true" -q | wc -l)
        
        if [ "$dangling" -eq 0 ]; then
            echo -e "${GREEN}✓ No dangling images to clean${NC}"
            return 0
        fi
        
        echo "Found $dangling dangling image(s)"
        
        if confirm "Remove dangling images?"; then
            if [ "$DRY_RUN" = false ]; then
                docker image prune -f
                echo -e "${GREEN}✓ Removed dangling images${NC}"
            fi
        fi
    fi
}

# Limpiar volúmenes no utilizados
cleanup_volumes() {
    echo ""
    echo "=========================================="
    echo "  Cleaning Unused Volumes"
    echo "=========================================="
    
    unused=$(docker volume ls -qf dangling=true | wc -l)
    
    if [ "$unused" -eq 0 ]; then
        echo -e "${GREEN}✓ No unused volumes to clean${NC}"
        return 0
    fi
    
    echo "Found $unused unused volume(s)"
    
    if confirm "⚠️  Remove $unused unused volume(s)? (This will delete data!)"; then
        if [ "$DRY_RUN" = false ]; then
            docker volume prune -f
            echo -e "${GREEN}✓ Removed unused volumes${NC}"
        fi
    fi
}

# Limpiar redes no utilizadas
cleanup_networks() {
    echo ""
    echo "=========================================="
    echo "  Cleaning Unused Networks"
    echo "=========================================="
    
    if [ "$DRY_RUN" = false ]; then
        # Contar redes antes de limpiar (no hay forma fácil de contar solo las que se limpiarán)
        docker network prune -f > /dev/null 2>&1 && echo -e "${GREEN}✓ Cleaned unused networks${NC}" || echo -e "${GREEN}✓ No unused networks${NC}"
    else
        echo -e "${YELLOW}[DRY-RUN] Would clean unused networks${NC}"
    fi
}

# Limpiar build cache
cleanup_buildcache() {
    echo ""
    echo "=========================================="
    echo "  Cleaning Build Cache"
    echo "=========================================="
    
    # Obtener tamaño del build cache
    cache_size=$(docker system df --format "{{.Type}}\t{{.Size}}" | grep "Build Cache" | awk '{print $2}' || echo "0B")
    
    if [ "$cache_size" = "0B" ]; then
        echo -e "${GREEN}✓ No build cache to clean${NC}"
        return 0
    fi
    
    echo "Build cache size: $cache_size"
    
    if confirm "Clear build cache ($cache_size)?"; then
        if [ "$DRY_RUN" = false ]; then
            docker builder prune -af
            echo -e "${GREEN}✓ Cleared build cache${NC}"
        fi
    fi
}

# Mostrar resumen de espacio
show_summary() {
    echo ""
    echo "=========================================="
    echo "  Docker System Summary"
    echo "=========================================="
    docker system df
}

# Función principal
main() {
    echo "🧹 Docker Cleanup - Monorepo BCA"
    echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}⚠️  DRY-RUN MODE - No changes will be made${NC}"
    fi
    
    if [ "$AGGRESSIVE" = true ]; then
        echo -e "${RED}⚠️  AGGRESSIVE MODE - Will remove ALL unused images${NC}"
    fi
    
    echo ""
    show_disk_usage
    
    cleanup_containers
    cleanup_images
    cleanup_volumes
    cleanup_networks
    cleanup_buildcache
    
    show_summary
    
    echo ""
    show_disk_usage
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}✓ Cleanup complete${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}ℹ️  This was a dry-run. No changes were made.${NC}"
        echo "   Run without --dry-run to actually clean."
    fi
}

# Ejecutar
main

