<#
Propósito: ejecutar SonarScanner con timestamp forzado para resolver conflictos de fecha.

Uso cuando el análisis normal falla con:
"Date of analysis cannot be older than the date of the last known analysis"

Uso:
  cd monorepo-bca
  $env:SONAR_TOKEN = "<token>"
  powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/sonar-forced.ps1
  Remove-Item Env:SONAR_TOKEN
#>

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$dockerImage = "sonarsource/sonar-scanner-cli"
$sonarHostUrl = "http://10.3.0.244:9900"

$envArgs = @()
if ($env:SONAR_TOKEN) {
   $envArgs += @("-e", "SONAR_TOKEN=$($env:SONAR_TOKEN)")
}

# Forzar fecha de MAÑANA para asegurar que sea posterior al último análisis
# (sonar.projectDate usa 00:00:00 como hora, por lo que hoy sería anterior a un análisis de hoy mismo)
$projectDate = [System.DateTime]::UtcNow.AddDays(1).ToString("yyyy-MM-dd")
Write-Host ("Forzando fecha de análisis (mañana): {0}" -f $projectDate)
$currentTimestamp = $projectDate

Write-Host ("Ejecutando SonarScanner (Docker) con timestamp forzado desde: {0}" -f $repoRoot)

$dockerArgs = @(
   "run",
   "--rm",
   "-v",
   "$($repoRoot):/usr/src"
)

if ($envArgs.Count -gt 0) {
   $dockerArgs += $envArgs
}

$dockerArgs += @(
   $dockerImage,
   "-Dsonar.host.url=$sonarHostUrl",
   "-Dsonar.projectDate=$currentTimestamp"
)

& docker @dockerArgs

if ($LASTEXITCODE -eq 0) {
   Write-Host "Análisis de SonarQube completado exitosamente."
} else {
   Write-Host "Error en el análisis de SonarQube (código: $LASTEXITCODE)"
   exit $LASTEXITCODE
}