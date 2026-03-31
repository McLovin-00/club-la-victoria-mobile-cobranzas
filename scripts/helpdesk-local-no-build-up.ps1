param(
    [int]$FrontendPort = 8551,
    [int]$HelpdeskPort = 4803
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$artifactsDir = Join-Path $root '.artifacts'
$runStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$jwtPublicPath = Join-Path $artifactsDir 'jwt_public.pem'
$frontendLog = Join-Path $artifactsDir ("frontend-dev-$runStamp.log")
$helpdeskLog = Join-Path $artifactsDir ("helpdesk-dev-$runStamp.log")
$frontendPid = Join-Path $artifactsDir 'frontend-dev.pid'
$helpdeskPid = Join-Path $artifactsDir 'helpdesk-dev.pid'
$frontendLogPointer = Join-Path $artifactsDir 'frontend-dev.latest.txt'
$helpdeskLogPointer = Join-Path $artifactsDir 'helpdesk-dev.latest.txt'

New-Item -ItemType Directory -Path $artifactsDir -Force | Out-Null

function Ensure-DockerContainer {
    param([string]$Name)

    docker inspect $Name *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "No encontre el contenedor '$Name'. Levanta el stack Docker base antes de correr este script."
    }
}

function Stop-PortListener {
    param([int]$Port)

    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

function Stop-TrackedProcess {
    param([string]$PidPath)

    if (-not (Test-Path $PidPath)) {
        return
    }

    $rawPid = Get-Content -Path $PidPath -ErrorAction SilentlyContinue | Select-Object -First 1
    $parsedPid = 0
    if (-not [int]::TryParse($rawPid, [ref]$parsedPid)) {
        Remove-Item $PidPath -Force -ErrorAction SilentlyContinue
        return
    }

    $process = Get-Process -Id $parsedPid -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $parsedPid -Force -ErrorAction SilentlyContinue
        try {
            $process.WaitForExit(5000)
        } catch {
        }
    }

    Remove-Item $PidPath -Force -ErrorAction SilentlyContinue
}

function Wait-PortReady {
    param(
        [int]$Port,
        [string]$Name
    )

    for ($i = 0; $i -lt 60; $i++) {
        $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($listener) {
            Write-Host "$Name escuchando en :$Port" -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 1
    }

    throw "$Name no quedo escuchando en el puerto $Port"
}

function Start-DetachedPowerShell {
    param(
        [string]$WorkingDirectory,
        [string]$CommandText,
        [string]$LogPath,
        [string]$PidPath
    )

    $scriptBlock = @"
Set-Location '$WorkingDirectory'
$CommandText
"@

    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($scriptBlock))
    $process = Start-Process powershell -ArgumentList '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encoded -WindowStyle Minimized -PassThru
    Set-Content -Path $PidPath -Value $process.Id -Encoding ascii
    return $process
}

Ensure-DockerContainer 'monorepo-bca-backend-1'
Ensure-DockerContainer 'monorepo-bca-helpdesk-1'
Ensure-DockerContainer 'monorepo-bca-nginx-1'

Write-Host 'Exportando clave JWT publica...' -ForegroundColor Cyan
docker exec monorepo-bca-backend-1 sh -lc "cat /app/keys/jwt_public.pem" | Out-File -FilePath $jwtPublicPath -Encoding ascii

$telegramToken = (docker exec monorepo-bca-helpdesk-1 printenv TELEGRAM_BOT_TOKEN).Trim()
if ([string]::IsNullOrWhiteSpace($telegramToken)) {
    throw 'No pude leer TELEGRAM_BOT_TOKEN desde monorepo-bca-helpdesk-1'
}

Write-Host 'Reiniciando procesos source locales...' -ForegroundColor Cyan
Stop-TrackedProcess -PidPath $frontendPid
Stop-TrackedProcess -PidPath $helpdeskPid
Stop-PortListener -Port $FrontendPort
Stop-PortListener -Port $HelpdeskPort
Start-Sleep -Milliseconds 750

Write-Host 'Regenerando Prisma del helpdesk...' -ForegroundColor Cyan
Push-Location (Join-Path $root 'apps\helpdesk')
npm run prisma:generate
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    throw 'Fallo npm run prisma:generate en apps/helpdesk'
}
Pop-Location

Set-Content -Path $frontendLogPointer -Value $frontendLog -Encoding ascii
Set-Content -Path $helpdeskLogPointer -Value $helpdeskLog -Encoding ascii

$frontendCommand = @"
`$env:NODE_ENV = 'development'
`$env:VITE_API_URL = 'http://localhost:8080'
`$env:VITE_API_BASE_URL = 'http://localhost:8080'
`$env:VITE_DOCUMENTOS_API_URL = 'http://localhost:8080'
`$env:VITE_DOCUMENTOS_WS_URL = ''
`$env:FRONTEND_URL = 'http://localhost:8080'
`$env:FRONTEND_PORT = '$FrontendPort'
npm run dev *>> '$frontendLog'
"@

$escapedTelegramToken = $telegramToken.Replace("'", "''")
$helpdeskCommand = @"
`$env:TELEGRAM_BOT_TOKEN = '$escapedTelegramToken'
`$env:FRONTEND_URLS = 'http://localhost:8080,http://localhost:$FrontendPort'
`$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/monorepo-bca?schema=platform'
`$env:HELPDESK_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/monorepo-bca?schema=helpdesk'
`$env:REDIS_URL = 'redis://localhost:6379'
`$env:REDIS_HOST = 'localhost'
`$env:REDIS_PORT = '6379'
`$env:MINIO_ENDPOINT = 'localhost'
`$env:MINIO_PORT = '9000'
`$env:MINIO_ACCESS_KEY = 'minioadmin'
`$env:MINIO_SECRET_KEY = 'minioadmin'
`$env:MINIO_USE_SSL = 'false'
`$env:JWT_PUBLIC_KEY_PATH = '..\..\.artifacts\jwt_public.pem'
npm run dev *>> '$helpdeskLog'
"@

Start-DetachedPowerShell -WorkingDirectory (Join-Path $root 'apps\frontend') -CommandText $frontendCommand -LogPath $frontendLog -PidPath $frontendPid | Out-Null
Start-DetachedPowerShell -WorkingDirectory (Join-Path $root 'apps\helpdesk') -CommandText $helpdeskCommand -LogPath $helpdeskLog -PidPath $helpdeskPid | Out-Null

Wait-PortReady -Port $FrontendPort -Name 'Frontend source'
Wait-PortReady -Port $HelpdeskPort -Name 'Helpdesk source'

Write-Host 'Recargando nginx...' -ForegroundColor Cyan
docker exec monorepo-bca-nginx-1 nginx -t
if ($LASTEXITCODE -ne 0) {
    throw 'Fallo nginx -t dentro del contenedor monorepo-bca-nginx-1'
}
docker exec monorepo-bca-nginx-1 nginx -s reload
if ($LASTEXITCODE -ne 0) {
    throw 'Fallo el reload de nginx dentro del contenedor monorepo-bca-nginx-1'
}

Write-Host ''
Write-Host 'Listo.' -ForegroundColor Green
Write-Host 'Abri http://localhost:8080/login' -ForegroundColor White
Write-Host 'Credenciales de prueba: admin@empresa.com / password123' -ForegroundColor White
Write-Host "Logs frontend:  $frontendLog" -ForegroundColor DarkGray
Write-Host "Logs helpdesk:  $helpdeskLog" -ForegroundColor DarkGray
