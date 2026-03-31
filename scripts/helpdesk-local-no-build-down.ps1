param(
    [int]$FrontendPort = 8551,
    [int]$HelpdeskPort = 4803
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$artifactsDir = Join-Path $root '.artifacts'
$frontendPid = Join-Path $artifactsDir 'frontend-dev.pid'
$helpdeskPid = Join-Path $artifactsDir 'helpdesk-dev.pid'

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
    if ([int]::TryParse($rawPid, [ref]$parsedPid)) {
        Stop-Process -Id $parsedPid -Force -ErrorAction SilentlyContinue
    }

    Remove-Item $PidPath -Force -ErrorAction SilentlyContinue
}

Write-Host 'Bajando frontend y helpdesk source locales...' -ForegroundColor Cyan
Stop-TrackedProcess -PidPath $frontendPid
Stop-TrackedProcess -PidPath $helpdeskPid
Stop-PortListener -Port $FrontendPort
Stop-PortListener -Port $HelpdeskPort

docker exec monorepo-bca-nginx-1 nginx -t
docker exec monorepo-bca-nginx-1 nginx -s reload

Write-Host 'Listo. Los procesos source quedaron abajo.' -ForegroundColor Green
