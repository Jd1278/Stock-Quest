# Guided local demonstration. The user runs this script; do not run unattended.
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$savedLocation = Get-Location
$evidence = [ordered]@{ startedAt = (Get-Date).ToUniversalTime().ToString('o'); status = 'INCOMPLETE'; before = $null; during = $null; after = $null; readinessAfter = $null; error = $null }
$mustRestart = $false
$reportPath = $null
function Get-Scrapes {
    $query = [Uri]::EscapeDataString('up{job="stockquest-java"}')
    $response = Invoke-RestMethod -Uri ('http://127.0.0.1:9090/api/v1/query?query=' + $query) -TimeoutSec 5
    if ($response.status -ne 'success') { throw 'Prometheus no pudo evaluar la consulta.' }
    return @($response.data.result | ForEach-Object {
        [PSCustomObject]@{ service = $_.metric.service; up = [int]$_.value[1] }
    })
}
function Assert-Services($rows) {
    foreach ($name in @('personas-capacitacion','aprendizaje-evaluacion','simulacion-logistica')) {
        if (@($rows | Where-Object { $_.service -eq $name }).Count -ne 1) {
            throw "Prometheus debe mostrar exactamente un objetivo para $name."
        }
    }
    if ($rows.Count -ne 3) { throw 'Se esperaban tres objetivos Java.' }
}
try {
    Set-Location -LiteralPath $root
    $evidence.before = @(Get-Scrapes)
    Assert-Services $evidence.before
    if (@($evidence.before | Where-Object { $_.up -ne 1 }).Count) { throw 'Los tres objetivos deben estar UP antes del ensayo.' }
    $statusText = & node scripts/local-java.cjs status
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo consultar el supervisor.' }
    $state = ($statusText -join "`n") | ConvertFrom-Json
    if (!$state.ready -or !$state.processes.simulation.running) { throw 'El entorno debe estar listo antes del ensayo.' }
    $simulationPid = [int]$state.processes.simulation.pid
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $simulationPid"
    $jar = Join-Path $root 'services\simulacion-logistica\target\simulacion-logistica-0.1.0-SNAPSHOT.jar'
    if (!$process -or $process.Name -ne 'java.exe' -or !$process.CommandLine -or
        $process.CommandLine.IndexOf($jar, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
        throw 'El proceso no coincide con el JAR de simulacion de este checkout; no se detuvo nada.'
    }
    $directory = Join-Path $root '.stockquest-local\observability'
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    $reportPath = Join-Path $directory ('demo-' + [Guid]::NewGuid().ToString('N') + '.json')
    $evidence.before | Format-Table
    Read-Host 'Guarda la captura inicial del dashboard. Pulsa Enter para detener SOLO simulacion' | Out-Null
    $mustRestart = $true
    Stop-Process -Id $simulationPid -ErrorAction Stop
    $observed = $false
    for ($attempt = 0; $attempt -lt 15; $attempt++) {
        Start-Sleep -Seconds 3
        $rows = @(Get-Scrapes)
        Assert-Services $rows
        if (@($rows | Where-Object { $_.service -eq 'simulacion-logistica' -and $_.up -eq 0 }).Count -eq 1) {
            if (@($rows | Where-Object { $_.service -ne 'simulacion-logistica' -and $_.up -ne 1 }).Count) {
                throw 'Otro objetivo dejo de estar UP durante el ensayo.'
            }
            $evidence.during = $rows
            $observed = $true
            break
        }
    }
    if (!$observed) { throw 'Prometheus no registro la caida dentro del tiempo esperado.' }
    $evidence.during | Format-Table
    Read-Host 'Guarda la captura con simulacion caida. Pulsa Enter para recuperarla' | Out-Null
} catch {
    $evidence.error = $_.Exception.Message
} finally {
    if ($mustRestart) {
        try {
            & node scripts/local-java.cjs restart simulation
            if ($LASTEXITCODE -ne 0) { throw 'Fallo el reinicio. Ejecuta node scripts/local-java.cjs restart simulation y revisa los logs.' }
            $evidence.readinessAfter = Invoke-RestMethod 'http://127.0.0.1:14610/health/ready' -TimeoutSec 10
            if ($evidence.readinessAfter.status -ne 'ok') { throw 'Readiness no devolvio ok.' }
            $recovered = $false
            for ($attempt = 0; $attempt -lt 15; $attempt++) {
                Start-Sleep -Seconds 3
                $rows = @(Get-Scrapes)
                Assert-Services $rows
                if (@($rows | Where-Object { $_.up -ne 1 }).Count -eq 0) {
                    $evidence.after = $rows
                    $recovered = $true
                    break
                }
            }
            if (!$recovered) { throw 'El servicio reinicio, pero Prometheus no confirmo los tres UP a tiempo.' }
            if (!$evidence.error) { $evidence.status = 'PASS' }
        } catch { $evidence.error = ($evidence.error + ' Recuperacion: ' + $_.Exception.Message).Trim() }
    }
    $evidence.finishedAt = (Get-Date).ToUniversalTime().ToString('o')
    if ($reportPath) {
        $evidence | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding utf8
        Write-Host "Evidencia: $reportPath"
    }
    Set-Location -LiteralPath $savedLocation.Path
}
if ($evidence.error) { throw $evidence.error }
Write-Host 'PASS: caida observada, otros dos servicios UP y recuperacion confirmada por readiness y Prometheus.'
