<#
Propósito: ejecutar SonarScanner vía Docker de forma compatible con Windows/PowerShell.

Notas:
- No imprime ni maneja secretos. Si necesitás token, pasalo por variable de entorno SONAR_TOKEN.
- El proyecto toma la configuración desde `sonar-project.properties`.
- Incluye delay automático para evitar conflictos de timestamp entre análisis consecutivos.

Uso:
  cd monorepo-bca
  $env:SONAR_TOKEN = "<token>"
  npm run sonar
  Remove-Item Env:SONAR_TOKEN

Solución para error "Date of analysis cannot be older than the date of the last known analysis":
- El script incluye un delay de 10 segundos para evitar timestamp conflicts
- Si el problema persiste, verificar la hora del sistema y zona horaria
#>

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$dockerImage = "sonarsource/sonar-scanner-cli"
$sonarHostUrl = "http://10.3.0.244:9900"

$envArgs = @()
if ($env:SONAR_TOKEN) {
  # SonarScanner soporta SONAR_TOKEN como auth.
  $envArgs += @("-e", "SONAR_TOKEN=$($env:SONAR_TOKEN)")
}

Write-Host ("Ejecutando SonarScanner (Docker) desde: {0}" -f $repoRoot)

# Agregar un pequeño delay para evitar problemas de timestamp entre análisis consecutivos
Write-Host "Esperando 10 segundos para evitar conflictos de timestamp..."
Start-Sleep -Seconds 10

# Evitamos el backtick de continuación (sensible a whitespace) construyendo args explícitos.
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
   "-Dsonar.host.url=$sonarHostUrl"
)

& docker @dockerArgs

# Verificar el código de salida
if ($LASTEXITCODE -eq 0) {
   Write-Host "Análisis de SonarQube completado exitosamente."
} else {
   Write-Host "Error en el análisis de SonarQube (código: $LASTEXITCODE)"
   exit $LASTEXITCODE
}
