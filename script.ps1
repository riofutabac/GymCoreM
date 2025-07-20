# script.ps1

# --- 1) Carga variables del .env ---
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=([^#]+)$') {
            $name  = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            Set-Item Env:$name $value
        }
    }
} else {
    Write-Error "No encontré el archivo .env"
    exit 1
}

# --- 2) Login a Infisical para obtener token ---
$loginArgs = @(
    'login',
    '--method',        'universal-auth',
    '--client-id',     $Env:INFISICAL_MACHINE_IDENTITY_CLIENT_ID,
    '--client-secret', $Env:INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET,
    '--domain',        $Env:INFISICAL_API_URL,
    '--plain'
)
Write-Host "🔑 Obteniendo INFISICAL_TOKEN..." -ForegroundColor Cyan
$loginOutput = & infisical @loginArgs
$exitCode    = $LASTEXITCODE

if ($exitCode -ne 0) {
  Write-Error "✗ ERROR al hacer login (exit code $exitCode):"
  Write-Error "$loginOutput"
  exit $exitCode
}

$token = $loginOutput.Trim()
if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Error "✗ No se recibió token válido de Infisical."
    exit 1
}

Write-Host "✓ Token obtenido." -ForegroundColor Green
Set-Item Env:INFISICAL_TOKEN $token

# --- 3) Arranca Docker Compose ---
docker compose -f docker-compose.dev.yml up -d --build
