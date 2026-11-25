# Limpieza de los dos datasets de aprendizaje en WEKA

## Resultado esperado

Se corrigieron **ambos** datasets. Cada archivo crudo tiene 100.000 filas y 15 campos: **80.000 sin alteración intencional, 10.000 con valores atípicos y otras 10.000 con errores de calidad**. Son porcentajes de filas, no de celdas. Los grupos no se solapan y se altera una sola celda por fila afectada.

Los archivos limpios mantienen **100.000 filas y 15 campos**. En esta práctica se reparan/imputan los valores afectados; no se eliminan filas. La imputación estima valores, no recupera las mediciones originales perdidas.

Las etiquetas `nivel_actual`, los IDs y las fechas permanecen protegidos para conservar el seguimiento temporal y evaluar el modelo contra etiquetas confiables. Las auditorías están fuera de los 15 campos y no deben cargarse como predictores.

| Archivo de entrada | Archivo limpio producido con WEKA |
|---|---|
| `diagnostico_actual_100000_15.arff` | `limpios/diagnostico_actual_100000_15_limpio.arff` |
| `diagnostico_7dias_despues_100000_15.arff` | `limpios/diagnostico_7dias_despues_100000_15_limpio.arff` |

Usa ARFF para conservar tipos, fechas, categorías y orden de columnas. Los CSV equivalentes están incluidos.

## Qué se introdujo en cada dataset

| Grupo | Filas | Campo alterado | Alteración |
|---|---:|---|---|
| Atípicos | 10.000 | 7: minutos_estudio_7dias | Entre 5.000 y 9.000 minutos, muy alejados de esta población sintética |
| Sucios | 2.500 | 12: puntaje_medio_simulaciones_7dias | Puntajes negativos |
| Sucios | 2.500 | 9: nota_media_desafios_7dias | Notas superiores a 100 |
| Sucios | 2.500 | 10: acierto_primer_intento_7dias | Proporciones superiores a 1 |
| Sucios | 2.500 | 3: modulo | Códigos en minúsculas m01 a m09 |

Los `?` que ya existían por ausencia de actividad son faltantes legítimos, no se suman a las 10.000 filas sucias introducidas. La misma observación conserva la misma alteración si aparece en los dos archivos: se verificaron las 96.000 observaciones compartidas.

## Antes de comenzar

1. Abrir WEKA 3.8.6 > Explorer > Preprocess.
2. Open file > seleccionar el primer ARFF crudo. Verificar arriba **Instances: 100000**, **Attributes: 15**.
3. Elegir **Class = nivel_actual**, columna 15.
4. Guardar cada etapa con otro nombre. No sobrescribir el crudo.
5. Repetir el procedimiento completo con el segundo dataset; no mezclar las filas de ambos.

Los parámetros numéricos siguientes se aprendieron **solo con las 64.000 filas de entrenamiento temporal**, no con validación, prueba o datos futuros. El procedimiento manual reutiliza esas constantes, por lo que no recalcula medias con todo el dataset. La equivalencia de esta guía con la limpieza automática se comprobó con WEKA sobre las 200.000 filas.

## Paso 1. Preparar el identificador para los filtros manuales

Choose > unsupervised > attribute > **StringToNominal**:

- `attributeRange = 1`.
- OK > Apply.

Se mantienen 100.000 filas y 15 campos. El ID se convierte temporalmente a nominal para evitar un problema de WEKA 3.8.6 al copiar atributos string con ReplaceMissingWithUserConstant. El ID no se utilizará como predictor y se devolverá a string al terminar.

## Paso 2. Unificar códigos de módulo

Choose > unsupervised > attribute > **RenameNominalValues**:

- `selectedAttributes = 3`.
- `invertSelection = False`.
- `ignoreCase = False`.
- `valueReplacements`:

```text
m01:M01,m02:M02,m03:M03,m04:M04,m05:M05,m06:M06,m07:M07,m08:M08,m09:M09
```

OK > Apply. Al seleccionar `modulo`, deben quedar las nueve categorías M01 a M09. Se corrigen 2.500 filas y siguen existiendo 100.000 filas y 15 atributos.

## Paso 3. Convertir puntajes inválidos en faltantes

Choose > unsupervised > attribute > **NumericCleaner**:

| Propiedad | Valor |
|---|---|
| attributeIndices | `9,12` |
| minThreshold | `0` |
| minDefault | `NaN` |
| maxThreshold | `100` |
| maxDefault | `NaN` |
| closeToTolerance | `0` |
| decimals | `-1` |
| includeClass | `False` |

OK > Apply. WEKA representa los NaN como `?`. Se marcan 5.000 valores inválidos; también permanecen los faltantes legítimos que ya existían. No rellenar con cero, porque cero sería una calificación válida.

## Paso 4. Corregir proporciones inválidas

Volver a NumericCleaner con:

- `attributeIndices = 10`.
- `minThreshold = 0`, `maxThreshold = 1`.
- `minDefault = NaN`, `maxDefault = NaN`.
- `closeToTolerance = 0`, `decimals = -1`, `includeClass = False`.

OK > Apply. Se convierten otras 2.500 celdas inválidas en faltantes. Hay 7.500 celdas numéricas sucias identificadas en total, además de las 2.500 categorías ya corregidas.

## Paso 5. Imputar faltantes con las medias de entrenamiento

Choose > unsupervised > attribute > **ReplaceMissingWithUserConstant**. Aplicarlo **cinco veces**, una por fila de esta tabla:

| attributes | Campo | numericReplacementValue |
|---:|---|---:|
| `9` | Nota media de desafíos | `66.46403370812234` |
| `10` | Acierto en primer intento | `0.5806821701948335` |
| `12` | Puntaje medio de simulaciones | `57.5929528925265` |
| `13` | Días desde última actividad | `1.3708088950224258` |
| `14` | Mejora semanal | `0.7429423196691798` |

En cada aplicación configurar solamente el atributo indicado y su constante numérica; OK > Apply. **Usar punto decimal**. Dejar sin configurar los reemplazos nominal/string y de fecha, porque no se utilizan.

Ahora los predictores no deben tener faltantes. Las medias imputadas son valores calculados para el modelo, no actividades realmente observadas. Por ejemplo, una nota imputada en una semana sin intentos no prueba que el aprendiz haya obtenido esa nota.

**Por qué no usar ReplaceMissingValues directamente sobre las 100.000 filas:** aprendería medias de periodos reservados para evaluación. La limpieza automática sí utiliza ReplaceMissingValues, pero lo ajusta con entrenamiento y guarda el filtro para aplicarlo sin reajuste. Esta guía manual usa sus mismas medias como constantes.

## Paso 6. Detectar los valores atípicos

Choose > unsupervised > attribute > **InterquartileRange**:

| Propiedad | Valor |
|---|---|
| attributeIndices | `7` |
| extremeValuesFactor | `12` |
| outlierFactor | `6` |
| extremeValuesAsOutliers | `True` |
| detectionPerAttribute | `False` |
| outputOffsetMultiplier | `False` |

Configurar primero el factor extremo en 12 y después el factor de outliers en 6, para mantener `extremeValuesFactor > outlierFactor`. OK > Apply.

Verificar **Instances: 100000** y **Attributes: 17**. Los atributos nuevos son **16: Outlier** y **17: ExtremeValue**. Mantener **Class = nivel_actual**, atributo 15; no elegir la última bandera como clase.

Seleccionar `Outlier` en la lista izquierda. En sus valores nominales deben aparecer:

- `no`: **90.000**.
- `yes`: **10.000**.

También se puede ver la distribución en su gráfico o abrir Edit. Save > guardar una evidencia con las 17 columnas.

**Si Apply está deshabilitado:** verificar que se completó el paso 5 y no quedan `?` en los predictores; que el atributo 7 es numérico; y que la clase sigue siendo nivel_actual. InterquartileRange rechaza faltantes en predictores en esta versión. Revisar Log para el motivo concreto; no desactivar la comprobación de capacidades.

El IQR de esta vista completa se usa para visualizar y contar. **No se reutilizan sus cuartiles para ajustar el modelo.** El límite de reparación es siempre el aprendido con entrenamiento: Q1=39, Q3=101, IQR=62 y límite superior `101 + 6 x 62 = 473` minutos. El criterio de seis IQR se eligió para esta práctica sintética; no es una regla universal para estudiantes reales.

## Paso 7. Marcar los minutos extremos como faltantes

NumericCleaner:

- `attributeIndices = 7`.
- `minThreshold = 0`, `minDefault = NaN`.
- `maxThreshold = 473`, `maxDefault = NaN`.
- `closeToTolerance = 0`, `decimals = -1`, `includeClass = False`.

OK > Apply. Las 10.000 celdas de minutos extremos pasan a `?`. No usar RemoveWithValues: aquí queremos conservar todas las filas. Las banderas siguen mostrando la detección anterior hasta que se retiren.

## Paso 8. Retirar las banderas auxiliares

Choose > unsupervised > attribute > **Remove**:

- `attributeIndices = 16-17`.
- `invertSelection = False`.

OK > Apply. Verificar **100.000 filas y 15 atributos**. Se eliminan únicamente las dos columnas auxiliares; no registros ni datos del aprendiz.

## Paso 9. Imputar los minutos reparados

ReplaceMissingWithUserConstant:

- `attributes = 7`.
- `numericReplacementValue = 64.04085069444444`.

OK > Apply. Es la media de minutos de las filas de entrenamiento que no eran atípicas. **No usar la media contaminada de 758,59 minutos** que existía antes de reparar outliers.

## Paso 10. Restaurar el tipo del ID y guardar

Choose > unsupervised > attribute > **NominalToString**:

- `attributeIndexes = 1`.

OK > Apply. Verificar:

- Instances = **100000**; Attributes = **15**.
- ID y fechas conservados; clase = nivel_actual.
- Nueve módulos canónicos, sin m01...m09.
- Notas y puntajes entre 0 y 100; proporciones entre 0 y 1.
- Minutos entre 0 y 473; ningún faltante restante en esta entrega.

Save > ARFF, con nombre distinto del crudo. Repetir desde el paso 1 con el dataset de siete días después y **las mismas constantes**. No volver a aprender medias con ese archivo.

## Limpieza ejecutada y evidencias

La ejecución real está en `LimpiezaRefuerzo.java`, con filtros de WEKA 3.8.6. La comprobación independiente está en `validar_calidad_v2.py`.

| Indicador | Actual | Siete días después |
|---|---:|---:|
| Filas crudas / limpias | 100.000 / 100.000 | 100.000 / 100.000 |
| Campos finales | 15 | 15 |
| Filas sucias reparadas | 10.000 | 10.000 |
| Atípicos detectados y reparados | 10.000 | 10.000 |
| Faltantes preexistentes imputados, celdas | 73.393 | 69.642 |
| Faltantes finales, celdas | 0 | 0 |

Los faltantes de la tabla se cuentan antes de convertir errores a NaN; no sumarlos al número de filas sucias. Una fila puede tener varios faltantes legítimos, aunque se haya inyectado solamente un error.

Evidencias: `auditoria_*_NO_USAR_COMO_PREDICTOR.csv`, `limpios/auditoria_cambios_*.csv`, `limpios/parametros_limpieza.json`, `limpios/validacion_guia_manual.json` y `validacion_calidad_v2.json`. Las etapas intermedias están bajo `limpios/etapas_*`.

## Después: realizar la predicción

1. Emparejar por aprendiz, módulo canónico y fecha +7, conservando una etiqueta futura confiable.
2. El objetivo es `requiere_refuerzo_7dias = si` cuando el nivel futuro sea inicial (evaluación <60).
3. Usar indicadores de t. Los indicadores de t+7 sirven para contraste y **no entran como predictores**.
4. Mantener los bloques temporales: 64.000 entrenamiento, 12.000 validación, 16.000 prueba y dos semanas de separación (8.000 filas).
5. El modelo guardado recibe **datos crudos V2**: contiene la limpieza y Remove 1-2 dentro del FilteredClassifier. No le pasar los datos ya limpios para compararlo como si fuera la misma ruta.
6. Para experimentar con archivos de `limpios/weka`, usar un modelo nuevo con solo Remove 1-2 + J48; no aplicar otra vez la limpieza.
7. El mínimo por hoja y el umbral se seleccionan solo con validación. Los resultados y el umbral actualizado están en `resultados/metricas_modelo.json`. La guía de reproducción completa está en README.md.

La detección perfecta de las anomalías inyectadas es propia del diseño didáctico. No acredita que IQR vaya a detectar todos los casos atípicos reales ni que toda observación extrema deba corregirse sin revisión.

Fuentes técnicas: [NumericCleaner](https://weka.sourceforge.io/doc.stable/weka/filters/unsupervised/attribute/NumericCleaner.html), [InterquartileRange](https://weka.sourceforge.io/doc.dev/weka/filters/unsupervised/attribute/InterquartileRange.html), [RenameNominalValues](https://weka.sourceforge.io/doc.dev/weka/filters/unsupervised/attribute/RenameNominalValues.html). Para ReplaceMissingWithUserConstant se verificó el código fuente distribuido con WEKA 3.8.6.
