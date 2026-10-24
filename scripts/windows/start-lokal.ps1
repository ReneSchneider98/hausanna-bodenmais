# Haus Anna - lokaler Start unter Windows
# Liegt neben: wordpress-export.xml und dem Ordner uploads\uploads (aus dem WordPress-Export)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$Base = Split-Path -Parent $MyInvocation.MyCommand.Path
$Repo = Join-Path $Base 'hausanna-bodenmais'
$Xml = Join-Path $Base 'wordpress-export.xml'
$Uploads = Join-Path $Base 'uploads\uploads'

function Step($t) { Write-Host "`n==> $t" -ForegroundColor Cyan }
function Fail($t) { Write-Host "`nFEHLER: $t" -ForegroundColor Red; Read-Host 'Enter zum Beenden'; exit 1 }
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

Step 'Pruefe Voraussetzungen'
$missing = @()
if (-not (Has 'git')) { $missing += 'Git:            winget install Git.Git' }
if (-not (Has 'node')) { $missing += 'Node.js 22:     winget install OpenJS.NodeJS.LTS' }
if (-not (Has 'docker')) { $missing += 'Docker Desktop: winget install Docker.DockerDesktop' }
if ($missing.Count) {
  Write-Host 'Bitte zuerst installieren (PowerShell als Administrator), danach PC neu starten:' -ForegroundColor Yellow
  $missing | ForEach-Object { Write-Host "  $_" }
  Fail 'Programme fehlen'
}
$nodeVersion = [version]((node -v).TrimStart('v'))
if ($nodeVersion -lt [version]'22.12.0') { Fail "Node.js $nodeVersion ist zu alt (mind. 22.12). winget upgrade OpenJS.NodeJS.LTS" }
# ueber cmd, damit Docker-Warnungen PowerShell nicht stoppen
cmd /c "docker info >nul 2>&1"
$dockerOk = ($LASTEXITCODE -eq 0)
if (-not $dockerOk) { Fail 'Docker Desktop laeuft nicht. Bitte Docker Desktop starten, warten bis unten links "Engine running" steht, dann erneut.' }
if (-not (Has 'pnpm')) {
  Step 'Installiere pnpm'
  npm install -g pnpm@10 | Out-Null
}

Step 'Hole den aktuellen Projektstand von GitHub'
$ErrorActionPreference = 'Continue'  # git/pnpm/docker schreiben Hinweise nach stderr
if (Test-Path $Repo) { git -C $Repo pull --ff-only } else { git clone https://github.com/ReneSchneider98/hausanna-bodenmais.git $Repo }
if ($LASTEXITCODE -ne 0) { Fail 'GitHub nicht erreichbar oder kein Zugriff (Anmeldung im Browser bestaetigen)' }
Set-Location $Repo

Step 'Installiere Pakete (beim ersten Mal ein paar Minuten)'
pnpm install
if ($LASTEXITCODE -ne 0) { Fail 'pnpm install fehlgeschlagen' }

$envFile = Join-Path $Repo 'apps\api\.env'
if (-not (Test-Path $envFile)) { Copy-Item (Join-Path $Repo '.env.example') $envFile }

Step 'Starte Datenbanken (Postgres + MongoDB in Docker)'
docker compose up -d --wait
if ($LASTEXITCODE -ne 0) { Fail 'Datenbanken konnten nicht starten' }

$marker = Join-Path $Repo 'data\.importiert'
if (-not (Test-Path $marker)) {
  if (-not (Test-Path $Xml)) { Fail "wordpress-export.xml fehlt in $Base" }
  if (-not (Test-Path $Uploads)) { Fail "Bilder-Ordner fehlt: $Uploads" }
  Step 'Importiere WordPress-Daten (einmalig)'
  pnpm import:wordpress --xml "$Xml" --uploads "$Uploads"
  if ($LASTEXITCODE -ne 0) { Fail 'Import fehlgeschlagen' }
  New-Item -ItemType File -Force $marker | Out-Null
}

Step 'Starte Webseite, Admin und API'
Write-Host ''
Write-Host '  Webseite: http://localhost:5173' -ForegroundColor Green
Write-Host '  Admin:    http://localhost:5174/admin/' -ForegroundColor Green
Write-Host '  Login:    admin@hausanna-bodenmais.de / bitte-aendern-123' -ForegroundColor Green
Write-Host '  Beenden:  dieses Fenster schliessen (Strg+C)'
Write-Host ''
Start-Job { Start-Sleep 25; Start-Process 'http://localhost:5173'; Start-Process 'http://localhost:5174/admin/' } | Out-Null
pnpm dev
