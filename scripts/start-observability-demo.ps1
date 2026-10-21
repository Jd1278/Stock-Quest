# User-run local startup. Does not install, build, seed, or stop existing processes.
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$savedLocation = Get-Location
$previousProfile = $env:SPRING_PROFILES_ACTIVE
$previousAddress = $env:GF_SERVER_HTTP_ADDR
$previousPort = $env:GF_SERVER_HTTP_PORT
function Test-Http([string]$Url) {
    try { return (Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3 -ErrorAction Stop).StatusCode -eq 200 }
    catch { return $false }
}
function Wait-Http([string]$Url) {
    for ($i=0; $i -lt 30; $i++) {
        if (Test-Http $Url) { return }
        Start-Sleep -Seconds 2
    }
    throw "No responde $Url. Revisa los registros en .stockquest-local/observability."
}
function Test-Listening([int]$Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}
try {
    Set-Location -LiteralPath $root
    $logs = Join-Path $root '.stockquest-local\observability'
    New-Item -ItemType Directory -Path $logs -Force | Out-Null
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $prometheus = 'C:\StockQuestTools\prometheus\prometheus.exe'
    $grafana = 'C:\StockQuestTools\grafana\bin\grafana.exe'
    foreach ($file in @($prometheus,$grafana,(Join-Path $root 'observability\prometheus-local.yml'))) {
        if (!(Test-Path -LiteralPath $file)) { throw "No existe: $file" }
    }
    $ErrorActionPreference = 'Continue'
    $stateText = & node scripts/local-java.cjs status 2>$null
    $statusCode = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($statusCode -eq 0) {
        $state = ($stateText -join "`n") | ConvertFrom-Json
        if (!$state.ready) { throw 'El supervisor existe pero no esta listo. Consulta node scripts/local-java.cjs status antes de continuar.' }
        Write-Host 'Stock Quest ya estaba activo.'
    } else {
        $env:SPRING_PROFILES_ACTIVE = 'observabilidad'
        & node scripts/local-java.cjs start
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar Stock Quest. Comprueba PostgreSQL y los registros del supervisor.' }
    }
    foreach ($port in @(14630,14620,14610)) {
        $ready = Invoke-RestMethod -Uri "http://127.0.0.1:$port/health/ready" -TimeoutSec 10
        if ($ready.status -ne 'ok') { throw "Readiness incorrecto: $port" }
        $metrics = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/actuator/prometheus" -TimeoutSec 10
        if ($metrics.Content -notmatch 'jvm_memory_used_bytes') { throw "Metricas JVM ausentes: $port. Revisa el perfil observabilidad." }
        Write-Host "Servicio ${port}: readiness y metricas correctos."
    }
    if (!(Test-Listening 9090)) {
        $config = Join-Path $root 'observability\prometheus-local.yml'
        & 'C:\StockQuestTools\prometheus\promtool.exe' check config $config
        if ($LASTEXITCODE -ne 0) { throw 'Configuracion de Prometheus invalida.' }
        $arguments = @(
            ('--config.file="' + $config + '"'),
            '--web.listen-address=127.0.0.1:9090',
            '--storage.tsdb.path=C:\StockQuestTools\prometheus\data',
            '--storage.tsdb.retention.time=2d',
            '--storage.tsdb.retention.size=256MB'
        )
        $promProcess = Start-Process -FilePath $prometheus -ArgumentList $arguments -WorkingDirectory 'C:\StockQuestTools\prometheus' -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs "prometheus-$stamp.log") -RedirectStandardError (Join-Path $logs "prometheus-$stamp-error.log") -PassThru
        Write-Host "Prometheus iniciado: PID $($promProcess.Id)."
    }
    Wait-Http 'http://127.0.0.1:9090/-/ready'
    $query = [Uri]::EscapeDataString('up{job="stockquest-java"}')
    $scrapesReady = $false
    for ($i=0; $i -lt 20; $i++) {
        $data = Invoke-RestMethod ('http://127.0.0.1:9090/api/v1/query?query=' + $query) -TimeoutSec 5
        $rows = @($data.data.result)
        $names = @($rows | ForEach-Object { $_.metric.service } | Sort-Object -Unique)
        if ($rows.Count -eq 3 -and $names.Count -eq 3 -and
            'personas-capacitacion' -in $names -and 'aprendizaje-evaluacion' -in $names -and 'simulacion-logistica' -in $names -and
            @($rows | Where-Object { $_.value[1] -ne '1' }).Count -eq 0) {
            $scrapesReady = $true; break
        }
        Start-Sleep -Seconds 3
    }
    if (!$scrapesReady) { throw 'Prometheus no muestra los tres objetivos Java UP. Revisa /targets y la configuracion usada; no se reemplazo ningun proceso existente.' }
    if (!(Test-Listening 3000)) {
        $env:GF_SERVER_HTTP_ADDR = '127.0.0.1'
        $env:GF_SERVER_HTTP_PORT = '3000'
        $grafProcess = Start-Process -FilePath $grafana -ArgumentList @('server','--homepath','C:\StockQuestTools\grafana') -WorkingDirectory 'C:\StockQuestTools\grafana' -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs "grafana-$stamp.log") -RedirectStandardError (Join-Path $logs "grafana-$stamp-error.log") -PassThru
        Write-Host "Grafana iniciado: PID $($grafProcess.Id)."
    }
    Wait-Http 'http://127.0.0.1:3000/api/health'
    $grafHealth = Invoke-RestMethod 'http://127.0.0.1:3000/api/health' -TimeoutSec 5
    if ($grafHealth.database -ne 'ok') { throw 'Grafana no confirma su base de datos interna.' }
    Write-Host 'LISTO: readiness y metricas de los tres servicios, Prometheus UP y Grafana accesible.'
    Write-Host 'Dashboard: http://127.0.0.1:3000/d/stockquest-local-observabilidad'
    Write-Host 'Targets: http://127.0.0.1:9090/targets'
    Write-Host 'Aplicacion: http://127.0.0.1:5174'
    Write-Host 'La fuente de datos y el dashboard deben estar previamente configurados en Grafana; el script no cambia usuarios ni contrasenas.'
} finally {
    $env:SPRING_PROFILES_ACTIVE = $previousProfile
    $env:GF_SERVER_HTTP_ADDR = $previousAddress
    $env:GF_SERVER_HTTP_PORT = $previousPort
    Set-Location -LiteralPath $savedLocation.Path
}
