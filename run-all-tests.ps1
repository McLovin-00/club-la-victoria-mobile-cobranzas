# Script para correr tests en todos los microservicios
# Solo documenta los tests que FALLAN

$dirs = @("apps\remitos", "apps\documentos", "apps\frontend", "apps\backend", "packages\types", "packages\utils")
$originalLocation = Get-Location
$logFileName = "test_failures.log"

# Forzar encoding UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

if (!(Test-Path "apps")) {
    Write-Host "Error: Ejecutar desde el root del monorepo" -ForegroundColor Red
    exit 1
}

foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Write-Host ""
        Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
        Write-Host "Testing: $dir" -ForegroundColor Green
        Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
        
        Set-Location $dir
        try {
            if (Test-Path "package.json") {
                # Ejecutar tests y capturar salida
                $output = cmd /c "npm test -- --coverage --silent 2>&1"
                $exitCode = $LASTEXITCODE
                
                # Mostrar en consola
                $output | ForEach-Object { Write-Host $_ }
                
                if ($exitCode -ne 0) {
                    Write-Host "Tests FALLARON en $dir. Guardando en $logFileName" -ForegroundColor Yellow
                    
                    # Filtrar solo lineas relevantes de fallos
                    $failedLines = $output | Where-Object { 
                        $_ -match "FAIL|Error|failed|error TS|Cannot find|expect\(|Received|Expected|at Object|Test Suites:|Tests:" 
                    }
                    
                    # Guardar solo fallos en archivo (sobreescribir)
                    $header = "=== TEST FAILURES LOG - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="
                    $header | Out-File -FilePath $logFileName -Encoding utf8 -Force
                    "" | Out-File -FilePath $logFileName -Encoding utf8 -Append
                    $failedLines | Out-File -FilePath $logFileName -Encoding utf8 -Append
                    
                }
                else {
                    Write-Host "Tests PASARON en $dir." -ForegroundColor Green
                    # Si pasan todos, limpiar el log o poner mensaje simple
                    "Todos los tests pasaron - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File -FilePath $logFileName -Encoding utf8 -Force
                }
            }
            else {
                Write-Host "No package.json in $dir" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "Error en $dir" -ForegroundColor Red
        }
        Set-Location $originalLocation
    }
    else {
        Write-Host "Dir not found: $dir" -ForegroundColor Red
    }
}
Write-Host ""
Write-Host "Fin de ejecucion." -ForegroundColor Green
