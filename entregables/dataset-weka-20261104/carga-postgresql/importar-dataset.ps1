param(
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-zA-Z_][a-zA-Z0-9_]*$')][string]$Database,
    [string]$DbUser = 'postgres',
    [string]$DbHost = '127.0.0.1',
    [ValidateRange(1,65535)][int]$DbPort = 5432,
    [string]$PsqlPath = 'C:/Program Files/PostgreSQL/17/bin/psql.exe',
    [string]$OriginalCsv = (Join-Path $PSScriptRoot '../stockquest_100000_15_original.csv'),
    [string]$CleanCsv = (Join-Path $PSScriptRoot '../stockquest_88000_15_limpio_weka.csv')
)
$ErrorActionPreference = 'Stop'
$psql = (Resolve-Path -LiteralPath $PsqlPath).Path
$original = (Resolve-Path -LiteralPath $OriginalCsv).Path.Replace('\','/').Replace("'","''")
$clean = (Resolve-Path -LiteralPath $CleanCsv).Path.Replace('\','/').Replace("'","''")
if ($original.Contains("`r") -or $original.Contains("`n") -or $clean.Contains("`r") -or $clean.Contains("`n")) {
    throw 'Las rutas no pueden contener saltos de linea.'
}
$create = Join-Path $PSScriptRoot '01_crear_tablas.sql'
$verify = Join-Path $PSScriptRoot '02_verificar_carga.sql'
$copyOriginal = "\copy dataset_lab.inventario_original FROM '$original' WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '?', ENCODING 'UTF8')"
$copyClean = "\copy dataset_lab.inventario_limpio FROM '$clean' WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '?', ENCODING 'UTF8')"
Write-Host "Destino elegido: $DbHost`:$DbPort / $Database; esquema nuevo dataset_lab."
Write-Host 'Se solicitara la contrasena de PostgreSQL sin guardarla en el script.'
# Una transaccion: si hay un fallo no se confirman filas ni tablas parciales.
# No hay DROP, TRUNCATE ni modificaciones de tablas de negocio.
& $psql -X -W -h $DbHost -p $DbPort -U $DbUser -d $Database `
    --set=ON_ERROR_STOP=1 --single-transaction `
    -f $create -c $copyOriginal -c $copyClean -f $verify
if ($LASTEXITCODE -ne 0) {
    throw 'Importacion fallida; no se confirmo la transaccion. Revisa el primer error antes de repetir.'
}
Write-Host 'Carga confirmada: 100000 filas originales y 88000 limpias, 15 campos por tabla.'
