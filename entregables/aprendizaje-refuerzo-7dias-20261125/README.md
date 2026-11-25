# Stock Quest: limpieza y predicción de refuerzo - versión 2

Entrega corregida el 25/11/2026. **La versión 1 no contenía el 10% de atípicos y otro 10% de datos sucios requeridos. Esta versión sustituye sus archivos principales, limpieza, métricas e informe.**

## Qué se entrega

Cada uno de los dos datasets crudos tiene **100.000 filas y 15 campos**: 80.000 filas sin alteración intencional, 10.000 con valores atípicos y otras 10.000 con errores de calidad. Los grupos son excluyentes y se refieren a filas, no celdas. Las versiones limpias también mantienen 100.000 filas y 15 campos.

| Archivo o carpeta | Uso |
|---|---|
| `diagnostico_actual_100000_15.csv/.arff` | CRUDO actual con 10% atípicos y 10% sucios |
| `diagnostico_7dias_despues_100000_15.csv/.arff` | CRUDO a t+7 con los mismos porcentajes |
| `limpios/diagnostico_*_limpio.csv/.arff` | Los dos resultados finales de la limpieza real con WEKA |
| `auditoria_*_NO_USAR_COMO_PREDICTOR.csv` | Evidencia de la contaminación; no introducir al modelo |
| `limpios/auditoria_cambios_*.csv` | Cambios realizados por la limpieza, celda a celda |
| `limpios/parametros_limpieza.json` | Estadísticas aprendidas únicamente con entrenamiento |
| `limpios/etapas_*` | Evidencias intermedias; IQR añade temporalmente dos columnas |
| `limpios/preprocesador.filter` | Filtros WEKA ajustados y cabecera para su aplicación posterior |
| `GUIA-LIMPIEZA-WEKA-V2.md` | Procedimiento manual probado sobre ambos datasets |
| `modelado/refuerzo_7dias_100000_15.csv/.arff` | Indicadores crudos de t más etiqueta binaria de t+7 |
| `weka/` | Particiones CRUDAS temporales e inferencia; entrada del modelo completo |
| `limpios/weka/` | Las mismas particiones ya limpias; usar solo con un modelo que no repita la limpieza |
| `resultados/` | Modelo completo, puntuaciones, alertas, métricas y lista por aprendiz |
| `resultados_sin_limpieza/` | Comparación del flujo que recibe las anomalías sin repararlas |
| `referencia_sin_contaminar/` | Bases y controles V1 para auditoría; NO se consultan al limpiar ni predecir |
| `validacion_calidad_v2.json` | Recuentos, reparaciones y coherencia verificados independientemente |
| `control_calidad_v2.json`, `control_pares.json` | Diseño, trazabilidad, fechas y hashes |

El PDF actualizado está en `output/pdf/StockQuest-Refuerzo-Aprendizaje-7dias.pdf` desde la raíz del proyecto y dentro del ZIP completo. Los códigos y personas son ficticios. No se tocaron las bases operativas.

## Contaminación y coherencia temporal

Se conserva la base sintética original y se introduce una alteración por fila afectada. Los atípicos llevan minutos de estudio de 5.000 a 9.000. Las filas sucias se reparten en 2.500 puntajes negativos, 2.500 notas >100, 2.500 proporciones >1 y 2.500 códigos de módulo en minúsculas.

Se seleccionan exactamente 400 atípicos y 400 sucios por corte de 4.000 observaciones con semilla 2026112502. La corrupción se decide por observación (aprendiz/módulo/fecha), no por archivo: las 96.000 observaciones presentes en ambos archivos coinciden antes y después de limpiar. Se protegen ID, fecha y etiqueta nivel_actual. Las etiquetas no se ensucian en esta práctica, para aislar la limpieza de predictores.

Los ? legítimos previos no cuentan como errores introducidos. El dataset representa 2.000 aprendices, dos módulos por persona y 25 cortes, no 100.000 personas. El actual abarca 09/06-24/11/2026; el futuro, 16/06-01/12/2026. Los resultados de diciembre son simulados, no observaciones reales del futuro.

## Limpieza ejecutada

Se ejecutaron filtros de WEKA 3.8.6: RenameNominalValues; NumericCleaner en 9,12 (rango 0-100) y 10 (0-1); ReplaceMissingValues ajustado con entrenamiento; InterquartileRange en el campo 7 con factores 6/12 y extremos incluidos; NumericCleaner con límite superior 473; Remove 16-17; segunda imputación para minutos, con media 64.04085069444444.

Se mantienen todas las filas. Se corrigen categorías y se imputan las celdas inválidas y atípicas. No se restauran valores consultando la referencia original. Los parámetros se aprendieron con 64.000 filas de entrenamiento y se guardaron para las demás particiones y ambos datasets. Las medias imputadas no son mediciones observadas.

La [guía manual](GUIA-LIMPIEZA-WEKA-V2.md) reproduce los mismos resultados con constantes de entrenamiento, StringToNominal temporal para el ID y ReplaceMissingWithUserConstant. Su equivalencia se verificó con las 200.000 filas. No rellenar ni aprender medias globalmente antes de separar entrenamiento y prueba.

## Predicción: ¿quién podría necesitar refuerzo?

Se define `requiere_refuerzo_7dias = si` cuando la evaluación independiente de t+7 queda por debajo de 60. El resto es `no`. La rúbrica es provisional, no validada por docentes o psicométricamente. No es nivel de XP.

El modelo utiliza solo los 14 primeros campos de t; descarta ID y fecha. No recibe los indicadores futuros ni la evaluación independiente exacta actual o futura. Conserva los quince campos de entrada; tras el filtro hay doce predictores y una clase. Las auditorías y las bases sin contaminar están excluidas.

| Partición | Indicadores | Etiquetas | Filas |
|---|---|---|---:|
| Entrenamiento | 09/06-22/09 | 16/06-29/09 | 64.000 |
| Separación 1 | 29/09 | 06/10 | 4.000 |
| Validación | 06/10-20/10 | 13/10-27/10 | 12.000 |
| Separación 2 | 27/10 | 03/11 | 4.000 |
| Prueba | 03/11-24/11 | 10/11-01/12 | 16.000 |

Se entrenaron J48 con mínimo de 20 o 100 instancias por hoja, confianza 0,25 y Laplace. Modelo y umbral se seleccionan exclusivamente en validación mediante F2, entre 0,05 y 0,95. La prueba temporal se reevaluó después de corregir la calidad; para nuevos ajustes hará falta reservar otro periodo de prueba.

**El modelo vigente en resultados/refuerzo_7dias.model incluye la limpieza dentro de FilteredClassifier y recibe ARFF CRUDOS V2.** WEKA aplicará los filtros guardados. No aplicar el mismo modelo a datos previamente limpiados como si fuera la ruta original. Para usar limpios/weka con otro entrenamiento, elegir Remove 1-2 + J48 sin añadir de nuevo la limpieza.

La política seleccionada es mínimo 20 y umbral 0,15. En prueba: recall 84,66%, precisión de alerta 37,10%, F2 0,674 y AUC 0,724. El flujo sin limpieza, también seleccionado en validación, alerta a todos en prueba: precisión 28,19%, F2 0,663 y AUC 0,691. Se comparan flujos completos con sus configuraciones seleccionadas; no es una estimación causal aislada del efecto de limpiar.

Hay 2.570 alertas en los 4.000 casos del último corte y 1.658 aprendices ficticios con algún módulo señalado. Las puntuaciones no están calibradas. Un máximo entre módulos ordena la lista; no representa una probabilidad de riesgo de la persona. No asignar refuerzo intensivo automáticamente: confirmar con una actividad breve y revisión humana.

## Reproducción con comandos

Requisitos: Java 21 compatible, WEKA 3.8.6 y Python 3.11+. Los scripts de datos y validación usan biblioteca estándar; regenerar el PDF requiere reportlab y pypdf. Extraer el paquete completo en una ruta corta, conservando las carpetas `entregables` y `output`. Abrir PowerShell en esta carpeta de refuerzo.

```powershell
$wekaDir = 'C:\Program Files\Weka-3-8-6'
if (!(Test-Path (Join-Path $wekaDir 'weka.jar'))) { throw 'Ajusta wekaDir a tu instalación.' }
$cp = "$wekaDir\weka.jar;$wekaDir\*;$wekaDir\lib\*"

# Solo si quieres regenerar: usar una copia; se sobrescriben los archivos generados.
python .\ajustar_calidad.py
if ($LASTEXITCODE -ne 0) { throw 'Falló la preparación.' }

java -Xmx512m -cp $cp .\LimpiezaRefuerzo.java .
if ($LASTEXITCODE -ne 0) { throw 'Falló la limpieza.' }

java -Xmx512m -cp $cp .\LimpiezaRefuerzo.java . verificar-guia
if ($LASTEXITCODE -ne 0) { throw 'La guía manual no coincidió.' }

New-Item -ItemType Directory -Force .\runtime-classes | Out-Null
javac -cp $cp -d .\runtime-classes .\LimpiezaRefuerzo.java .\EntrenarRefuerzo.java
if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación.' }
$cpModelo = "$cp;.\runtime-classes"
java -Xmx512m -cp $cpModelo EntrenarRefuerzo .
if ($LASTEXITCODE -ne 0) { throw 'Falló el modelo con limpieza.' }
python .\analizar_resultados.py
if ($LASTEXITCODE -ne 0) { throw 'Falló el análisis.' }

java -Xmx512m -cp $cpModelo EntrenarRefuerzo . sin-limpieza
if ($LASTEXITCODE -ne 0) { throw 'Falló la comparación sin limpieza.' }
python .\analizar_resultados.py --sin-limpieza
if ($LASTEXITCODE -ne 0) { throw 'Falló el análisis comparativo.' }

python .\validar_calidad_v2.py
if ($LASTEXITCODE -ne 0) { throw 'Falló la validación.' }
java -Xmx512m -cp $cp .\VerificarRefuerzo.java .
if ($LASTEXITCODE -ne 0) { throw 'Falló la lectura de ARFF crudos.' }
```

Para predecir sin volver a entrenar:

```powershell
java -Xmx512m -cp $cpModelo EntrenarRefuerzo predict `
    .\resultados\refuerzo_7dias.model `
    .\weka\predecir_ultimo_corte_4000.arff `
    .\resultados\nuevas_probabilidades.csv
if ($LASTEXITCODE -ne 0) { throw 'Falló la predicción.' }
$puntajes = Import-Csv .\resultados\nuevas_probabilidades.csv
$alertas = $puntajes | Where-Object {
    [double]::Parse($_.probabilidad_refuerzo, [Globalization.CultureInfo]::InvariantCulture) -ge 0.15
}
$alertas | Export-Csv .\resultados\nuevas_alertas.csv -NoTypeInformation -Encoding UTF8
```

La clase si está en la segunda posición. La clasificación estándar por clase más probable de WEKA no reproduce automáticamente el umbral 0,15: usar la puntuación de si. La clase de los 4.000 casos de inferencia es ?. Las referencias futuras se añaden después para auditar; no son necesarias para obtener puntuaciones.

En Explorer puedes cargar el modelo guardado desde la lista de resultados y reevaluar el ARFF crudo de inferencia con salida de probabilidades. Para reproducir la selección exacta y aplicar el umbral personalizado, usar los comandos anteriores. No utilizar validación cruzada aleatoria para este pronóstico.

`preparar_refuerzo.py` y el generador de la carpeta de diagnóstico redirigen a la preparación V2. El generador base V1 se conserva separado, exclusivamente para reproducir la simulación inicial en una carpeta aislada. No ejecutarlo sobre los archivos vigentes.

## Límites y validaciones pendientes

La detección perfecta de las anomalías inyectadas se debe a su separación didáctica; no valida un detector de anomalías reales. La imputación no recupera valores verdaderos. Las variables propuestas (minutos, pretest, nuevas evaluaciones, primer intento por sesión, asociación simulación-módulo) requieren instrumentación real. El modelo evalúa semanas posteriores de los mismos aprendices sintéticos; no generalización a nuevas personas ni eficacia de una intervención.

Faltan validación pedagógica, calibración, una política de atención más selectiva, evaluación por subgrupos y nuevos aprendices, y validación prospectiva con datos reales. No se conectó este modelo a la aplicación ni se modificaron sus bases.

Documentación técnica de filtros y del procedimiento manual: [guía WEKA](GUIA-LIMPIEZA-WEKA-V2.md). Fuentes del clasificador: [FilteredClassifier/J48](https://weka.sourceforge.io/doc.stable-3-8/weka/classifiers/meta/FilteredClassifier.html). Criterio temporal: [TimeSeriesSplit y gap](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html). No se entrenó con scikit-learn.
