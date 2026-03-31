# ==============================================================================
# Levanta el stack completo para QA de Mesa de Ayuda (plataforma /helpdesk)
# ==============================================================================
# Uso: desde la raíz del monorepo
#   .\scripts\helpdesk-qa-up.ps1
#   .\scripts\helpdesk-qa-up.ps1 -Build    # forzar rebuild de imágenes
# ==============================================================================

param(
    [switch]$Build
)

$ErrorActionPreference = "Stop"
# $PSScriptRoot = ...\monorepo-bca\scripts  →  raíz del monorepo = un nivel arriba
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "package.json"))) {
    Write-Error "No se encontró package.json en la raíz del monorepo. El script debe vivir en la carpeta scripts/ del repo."
}
Set-Location $root

# 1. Verificar keys
$keysDir = Join-Path $root "keys"
$keyPrivate = Join-Path $keysDir "jwt_private.pem"
$keyPublic = Join-Path $keysDir "jwt_public.pem"
if (-not (Test-Path $keyPrivate) -or -not (Test-Path $keyPublic)) {
    Write-Host "Faltan claves JWT en ./keys (jwt_private.pem, jwt_public.pem)." -ForegroundColor Yellow
    Write-Host "Generar con:" -ForegroundColor Gray
    Write-Host "  New-Item -ItemType Directory -Force -Path .\keys | Out-Null" -ForegroundColor Gray
    Write-Host "  docker run --rm -v `"`${PWD}\keys:/work`" -w /work alpine:3.20 sh -lc `"apk add --no-cache openssl && openssl genrsa -out jwt_private.pem 2048 && openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem`"" -ForegroundColor Gray
    exit 1
}

# 2. Verificar .env
if (-not (Test-Path (Join-Path $root ".env"))) {
    Write-Host "No existe .env en la raíz. Copiá .env.example a .env y ajustá (al menos DATABASE_URL con host postgres para Docker)." -ForegroundColor Yellow
    if (Test-Path (Join-Path $root ".env.example")) {
        Copy-Item (Join-Path $root ".env.example") (Join-Path $root ".env")
        Write-Host "Se creó .env desde .env.example. Revisalo antes de seguir." -ForegroundColor Cyan
    }
    exit 1
}

# 3. Avisar si falta .env.docker.local del helpdesk
$helpdeskEnv = Join-Path $root "apps\helpdesk\.env.docker.local"
if (-not (Test-Path $helpdeskEnv)) {
    Write-Host "Aviso: no existe apps/helpdesk/.env.docker.local. El compose usa env_file; si falta, podés crearlo según apps/helpdesk/docs/SETUP_Y_TESTING.md" -ForegroundColor Yellow
}

# 4. Levantar compose
$composeFile = Join-Path $root "docker-compose.helpdesk-qa.yml"
$dockerArgs = @("compose", "-f", $composeFile, "up", "-d")
if ($Build) {
    $dockerArgs += "--build"
}
Write-Host "Ejecutando: docker $dockerArgs" -ForegroundColor Cyan
& docker @dockerArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "docker compose up falló."
}

# 5. Instrucciones siguientes
Write-Host ""
Write-Host "Stack en marcha. Siguientes pasos:" -ForegroundColor Green
Write-Host "  1. Migraciones (si la DB está vacía):" -ForegroundColor White
Write-Host "     cd apps/backend && `$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/monorepo-bca?schema=platform'; npx prisma migrate deploy" -ForegroundColor Gray
Write-Host "     cd apps/helpdesk && `$env:HELPDESK_DATABASE_URL='postgresql://postgres:postgres@localhost:5432/monorepo-bca?schema=helpdesk'; npx prisma migrate deploy" -ForegroundColor Gray
Write-Host "  2. Abrí http://localhost:8080/helpdesk" -ForegroundColor White
Write-Host "  3. Iniciá sesión con un usuario con rol ADMIN o SUPERADMIN" -ForegroundColor White
Write-Host ""
Write-Host "Ver estado: docker compose -f docker-compose.helpdesk-qa.yml ps" -ForegroundColor Gray
Write-Host "Bajar todo:  docker compose -f docker-compose.helpdesk-qa.yml down" -ForegroundColor Gray
