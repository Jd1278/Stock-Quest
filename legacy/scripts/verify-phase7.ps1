param([string]$DbPassword = $env:SQ_VERIFY_DB_PASSWORD)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
if (!$DbPassword) { throw 'Configura SQ_VERIFY_DB_PASSWORD solo en esta terminal.' }
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runDirectory = Join-Path $projectRoot ('.stockquest-local\phase7-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runDirectory -Force | Out-Null
$savedDirectory = Get-Location
$keys = @('JAVA_TOOL_OPTIONS','NODE_OPTIONS','GOMAXPROCS','GOMEMLIMIT','DATABASE_URL','JWT_SECRET','RUN_DB_TESTS','PEOPLE_BACKEND','LEARNING_BACKEND','SIMULATION_BACKEND',
 'SQ_PEOPLE_TEST_JDBC_URL','SQ_PEOPLE_TEST_DB_USER','SQ_PEOPLE_TEST_DB_PASSWORD','SQ_LEARNING_TEST_JDBC_URL','SQ_LEARNING_TEST_DB_USER','SQ_LEARNING_TEST_DB_PASSWORD','SQ_TEST_JDBC_URL','SQ_TEST_DB_USER','SQ_TEST_DB_PASSWORD')
$previous = @{}
foreach ($key in $keys) { $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
$steps = [Collections.Generic.List[object]]::new()
$restoreLocal = $false
$localRestored = $false
$failure = $null
function Invoke-VerificationStep([string]$Name, [scriptblock]$Action) {
    $begin = Get-Date
    & $Action 2>&1 | Tee-Object -FilePath (Join-Path $runDirectory ($Name + '.log'))
    $exitCode = $LASTEXITCODE
    $steps.Add([PSCustomObject]@{name=$Name;exitCode=$exitCode;seconds=[Math]::Round(((Get-Date)-$begin).TotalSeconds,2)})
    if ($exitCode -ne 0) { throw "Falló $Name. Revisa el registro local; no se declara aprobado." }
}
try {
    Set-Location -LiteralPath $projectRoot
    $statusText = & node scripts/local-java.cjs status 2>$null
    if ($LASTEXITCODE -eq 0) {
        $localState = ($statusText -join "`n") | ConvertFrom-Json
        if ($localState.ready) {
            $restoreLocal = $true
            & node scripts/local-java.cjs stop
            if ($LASTEXITCODE -ne 0) { throw 'No se pudo detener el entorno local de forma controlada.' }
        } else { throw 'Hay un supervisor local en estado intermedio; revisa status antes de verificar.' }
    }
    $env:JAVA_TOOL_OPTIONS = '-Xmx192m -XX:MaxMetaspaceSize=128m -XX:ReservedCodeCacheSize=48m -XX:ActiveProcessorCount=2'
    $env:NODE_OPTIONS = '--max-old-space-size=640'
    $env:GOMAXPROCS = '2'
    $env:GOMEMLIMIT = '384MiB'
    # These previously prepared exclusive test databases are deliberately separate from the local application.
    $env:SQ_PEOPLE_TEST_JDBC_URL = 'jdbc:postgresql://127.0.0.1:5432/sq_test_people_phase5c_20261019'
    $env:SQ_PEOPLE_TEST_DB_USER = 'sq_phase4_test'
    $env:SQ_PEOPLE_TEST_DB_PASSWORD = $DbPassword
    $env:SQ_LEARNING_TEST_JDBC_URL = 'jdbc:postgresql://127.0.0.1:5432/sq_test_learning_phase6_it_20261019'
    $env:SQ_LEARNING_TEST_DB_USER = 'sq_phase4_test'
    $env:SQ_LEARNING_TEST_DB_PASSWORD = $DbPassword
    $env:SQ_TEST_JDBC_URL = 'jdbc:postgresql://127.0.0.1:5432/sq_test_simulation_phase6_it_20261019'
    $env:SQ_TEST_DB_USER = 'sq_phase4_test'
    $env:SQ_TEST_DB_PASSWORD = $DbPassword
    foreach ($serviceName in @('personas-capacitacion','aprendizaje-evaluacion','simulacion-logistica')) {
        $servicePath = Join-Path $projectRoot ('services\' + $serviceName)
        Invoke-VerificationStep $serviceName { & (Join-Path $servicePath 'mvnw.cmd') -f (Join-Path $servicePath 'pom.xml') -B -ntp -Ppostgres-it verify }
    }
    $env:DATABASE_URL = 'postgresql://sq_phase4_test:' + [Uri]::EscapeDataString($DbPassword) + '@127.0.0.1:5432/sq_test_backend_phase6_it_20261019'
    $env:JWT_SECRET = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
    $env:RUN_DB_TESTS = '1'
    $env:PEOPLE_BACKEND = $env:LEARNING_BACKEND = $env:SIMULATION_BACKEND = 'legacy'
    Invoke-VerificationStep 'backend' { & npm.cmd test -w '@stock-quest/api' -- --json ('--outputFile=' + (Join-Path $runDirectory 'backend-tests.json')) }
    Invoke-VerificationStep 'frontend' { & npm.cmd test -w '@stock-quest/web' -- --json ('--outputFile=' + (Join-Path $runDirectory 'frontend-tests.json')) }
    Invoke-VerificationStep 'typescript-backend' { & node node_modules/typescript/bin/tsc -p backend/tsconfig.json --noEmit }
    Invoke-VerificationStep 'lint' { & npm.cmd run lint }
    Invoke-VerificationStep 'frontend-build' { & npm.cmd run build -w '@stock-quest/web' -- --configLoader native }
    Invoke-VerificationStep 'contracts' { & node contracts/validar-inventario.cjs }
    Invoke-VerificationStep 'diff-check' { & git diff --check }
} catch {
    $failure = $_.Exception.Message
} finally {
    foreach ($key in $keys) { [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process') }
    if ($restoreLocal) {
        try {
            Set-Location -LiteralPath $projectRoot
            & node scripts/local-java.cjs start
            if ($LASTEXITCODE -ne 0) { throw 'No se pudo recuperar el entorno local; revisa los registros.' }
            $localRestored = $true
        } catch { $failure = ($failure + ' Recuperación: ' + $_.Exception.Message).Trim() }
    }
    $result = [PSCustomObject]@{status=$(if($failure){'FAIL'}else{'PASS'});steps=$steps;error=$failure;localEnvironmentWasRunning=$restoreLocal;localEnvironmentRestored=$localRestored;finishedAt=(Get-Date).ToUniversalTime().ToString('o')}
    $result | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 (Join-Path $runDirectory 'report.json')
    Write-Output ('Informe local: ' + (Join-Path $runDirectory 'report.json'))
    Set-Location -LiteralPath $savedDirectory.Path
}
if ($failure) { throw $failure }
