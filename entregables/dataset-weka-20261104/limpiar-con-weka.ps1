param([Parameter(Mandatory=$true)][string]$WekaJar)
$ErrorActionPreference='Stop'
$jar=(Resolve-Path -LiteralPath $WekaJar).Path
$libraryRoot=Split-Path -Parent $jar
$classPath="$jar;$libraryRoot/*;$libraryRoot/lib/*"
$output=Join-Path $PSScriptRoot 'resultado-weka'
New-Item -ItemType Directory -Path $output -Force | Out-Null
function Invoke-WekaFilter {
    param([string]$Class,[string]$InputFile,[string]$OutputFile,[string[]]$Options=@())
    & java -Xms32m -Xmx320m -XX:+UseSerialGC -cp $classPath $Class -c 0 -i $InputFile -o $OutputFile @Options
    if($LASTEXITCODE -ne 0){throw "Fallo el filtro $Class; no continuar."}
}
Invoke-WekaFilter 'weka.filters.unsupervised.instance.RemoveDuplicates' (Join-Path $PSScriptRoot 'stockquest_100000_15_original.arff') "$output/01-sin-duplicados.arff"
Invoke-WekaFilter 'weka.filters.unsupervised.attribute.RenameNominalValues' "$output/01-sin-duplicados.arff" "$output/02-categorias.arff" @('-R','3','-N','NORTE:norte,SUR:sur,CENTRO:centro')
Invoke-WekaFilter 'weka.filters.unsupervised.attribute.NumericCleaner' "$output/02-categorias.arff" "$output/03-invalidos-a-faltantes.arff" @('-R','14','-min','0','-min-default','NaN')
Invoke-WekaFilter 'weka.filters.unsupervised.attribute.ReplaceMissingValues' "$output/03-invalidos-a-faltantes.arff" "$output/04-imputados.arff"
Invoke-WekaFilter 'weka.filters.unsupervised.attribute.InterquartileRange' "$output/04-imputados.arff" "$output/05-outliers-marcados.arff" @('-R','6-14','-O','3','-E','6','-E-as-O')
Invoke-WekaFilter 'weka.filters.unsupervised.instance.RemoveWithValues' "$output/05-outliers-marcados.arff" "$output/06-sin-outliers.arff" @('-C','16','-L','2')
Invoke-WekaFilter 'weka.filters.unsupervised.attribute.Remove' "$output/06-sin-outliers.arff" "$output/07-limpio.arff" @('-R','16-17')
Write-Host "Limpieza terminada. Revisar: $output/07-limpio.arff"
