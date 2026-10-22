param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('personas-capacitacion','aprendizaje-evaluacion','simulacion-logistica')]
    [string]$Service,
    [switch]$TestsOnly
)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$serviceRoot = Join-Path $projectRoot ('services/' + $Service)
$prefix = switch ($Service) {
    'personas-capacitacion' { 'SQ_PEOPLE_TEST' }
    'aprendizaje-evaluacion' { 'SQ_LEARNING_TEST' }
    'simulacion-logistica' { 'SQ_TEST' }
}
foreach ($suffix in @('JDBC_URL','DB_USER','DB_PASSWORD')) {
    if (![Environment]::GetEnvironmentVariable($prefix + '_' + $suffix)) {
        throw "Falta la variable $($prefix)_$suffix."
    }
}
$url = [Environment]::GetEnvironmentVariable($prefix + '_JDBC_URL')
if (!$url.StartsWith('jdbc:postgresql://')) { throw 'Se requiere JDBC PostgreSQL.' }
$database = ([Uri]$url.Substring(5)).AbsolutePath
$pattern = switch ($Service) {
    'personas-capacitacion' { '^/(stockquest_test_people|sq_test_people_[A-Za-z0-9_]+)$' }
    'aprendizaje-evaluacion' { '^/(stockquest_test_learning|sq_test_learning_[A-Za-z0-9_]+)$' }
    'simulacion-logistica' { '^/(sq_test_|stockquest_test)[A-Za-z0-9_]+$' }
}
if ($database -notmatch $pattern) { throw 'La base no cumple el nombre exclusivo de pruebas.' }

$saved = @{}
foreach ($key in @('MAVEN_OPTS','JAVA_TOOL_OPTIONS')) {
    $saved[$key] = [Environment]::GetEnvironmentVariable($key)
}
try {
    $env:MAVEN_OPTS = '-Xmx256m -XX:ActiveProcessorCount=2'
    $env:JAVA_TOOL_OPTIONS = '-Xmx192m -XX:MaxMetaspaceSize=128m -XX:ReservedCodeCacheSize=48m -XX:ActiveProcessorCount=2'
    $goals = if ($TestsOnly) { @('test','failsafe:integration-test','failsafe:verify') } else { @('clean','verify') }
    Write-Host "Servicio: $Service; base exclusiva: $database; empaquetar: $(!$TestsOnly)"
    & (Join-Path $serviceRoot 'mvnw.cmd') -f (Join-Path $serviceRoot 'pom.xml') -B -ntp -Ppostgres-it @goals
    if ($LASTEXITCODE -ne 0) { throw "Maven fallo en $Service (exit $LASTEXITCODE)." }
} finally {
    foreach ($key in $saved.Keys) { [Environment]::SetEnvironmentVariable($key, $saved[$key]) }
}
