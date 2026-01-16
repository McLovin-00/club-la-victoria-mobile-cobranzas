<#
Propósito: Ejecutar análisis de SonarQube para el workspace E2E del monorepo BCA.
Genera primero el coverage con Jest y luego ejecuta el scanner.

Uso:
  1. Configurar el token de SonarQube:
     $env:SONAR_TOKEN = "squ_xxxxx"

  2. Ejecutar el script:
     .\scripts\sonar-analyze.ps1

  3. Limpiar el token después:
     Remove-Item Env:SONAR_TOKEN
#>

$ErrorActionPreference = "Stop"

$e2eRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $e2eRoot

Write-Host "=== Análisis SonarQube para E2E (Monorepo BCA) ===" -ForegroundColor Cyan
Write-Host ""

# 1. Generar coverage con Jest
Write-Host "Paso 1: Generando coverage con Jest..." -ForegroundColor Yellow
npm run test:coverage
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Los tests fallaron. Revisa los errores arriba." -ForegroundColor Red
    exit 1
}

# Verificar que se generó el archivo lcov.info
$lcovPath = Join-Path $e2eRoot "coverage\lcov.info"
if (-not (Test-Path $lcovPath)) {
    Write-Host "Error: No se encontró el archivo coverage/lcov.info" -ForegroundColor Red
    exit 1
}
Write-Host "Coverage generado en: $lcovPath" -ForegroundColor Green
Write-Host ""

# 2. Ejecutar SonarScanner
Write-Host "Paso 2: Ejecutando SonarScanner..." -ForegroundColor Yellow

$dockerImage = "sonarsource/sonar-scanner-cli"
$sonarHostUrl = "http://10.3.0.244:9900"

$envArgs = @()
if ($env:SONAR_TOKEN) {
    $envArgs += @("-e", "SONAR_TOKEN=$($env:SONAR_TOKEN)")
} else {
    Write-Host "ADVERTENCIA: No se encontró SONAR_TOKEN. Configúralo con:" -ForegroundColor Yellow
    Write-Host '  $env:SONAR_TOKEN = "tu-token-aqui"' -ForegroundColor Yellow
    Write-Host ""
}

# Convertir ruta de Windows a formato Docker
$dockerPath = $e2eRoot -replace '\\', '/' -replace '^([A-Za-z]):', { "/$($_.Groups[1].Value.ToLower())" }

Write-Host "Ejecutando SonarScanner (Docker) desde: $e2eRoot" -ForegroundColor Cyan

$dockerArgs = @(
    "run",
    "--rm",
    "-v",
    "$($dockerPath):/usr/src"
)

if ($envArgs.Count -gt 0) {
    $dockerArgs += $envArgs
}

$dockerArgs += @(
    $dockerImage,
    "-Dsonar.host.url=$sonarHostUrl",
    "-Dsonar.projectKey=monorepo-bca-e2e"
)

& docker @dockerArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Análisis completado exitosamente ===" -ForegroundColor Green
    Write-Host "Ve a $sonarHostUrl/dashboard?id=monorepo-bca-e2e para ver los resultados." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "=== El análisis falló ===" -ForegroundColor Red
    Write-Host "Revisa los errores arriba." -ForegroundColor Red
    exit 1
}
