# Dataset de inventario: limpieza paso a paso en WEKA

## 1. Qué se entrega y cómo se interpreta el porcentaje

Datos **sintéticos**, creados para esta práctica y relacionados con inventarios de Stock Quest. No se extrajeron datos de la aplicación ni se consultaron sus bases. Semilla reproducible: 20261104.

El archivo original tiene **100.000 filas de datos y 15 campos**; la cabecera CSV no cuenta como una fila. El porcentaje se aplica a **filas**, no a celdas:

| Grupo | Filas | Porcentaje |
|---|---:|---:|
| Normales | 80.000 | 80 % |
| Con valores atípicos | 10.000 | 10 % |
| Con datos sucios | 10.000 | 10 % |
| Total | 100.000 | 100 % |

Los grupos no se solapan y las filas están mezcladas. Un outlier puede afectar varios campos de una misma fila: no se cuentan dos veces esas filas.

Los datos sucios contienen cuatro subgrupos excluyentes: 4.000 filas con un valor faltante, 2.000 con almacén en mayúsculas, 2.000 con costo de pedido negativo y 2.000 copias exactas de filas normales. En las filas faltantes hay 2.000 almacenes y 2.000 costos de pedido ausentes.

Los outliers contienen 4.000 plazos extraordinariamente largos, 3.000 costos/precios extraordinariamente altos y 3.000 demandas extraordinariamente altas. Se conservan las ecuaciones de stock y el margen de precio. Son situaciones extremas deliberadas, distintas de los errores de captura.

### Archivos

- `stockquest_100000_15_original.arff`: entrada recomendada en WEKA, con tipos declarados y faltantes como `?`.
- `stockquest_100000_15_original.csv`: los mismos datos; coma como separador y punto decimal, UTF-8.
- `stockquest_88000_15_limpio_weka.arff` y `.csv`: resultado de referencia, producido con los filtros de WEKA.
- `referencia_anomalias_NO_IMPORTAR_EN_WEKA.csv`: respuesta de control por fila original. No añadirla como atributos; revelaría las anomalías.
- `outliers_detectados_revision.csv`: las 10.000 filas retiradas, conservadas para revisión.
- `diccionario_campos.csv`: tipo, posición y significado de cada campo.
- `validacion_weka.json`: recuentos, comprobaciones y SHA-256 de los datasets.

La referencia por fila es válida sobre el original: al filtrar o reordenar cambian las posiciones. Los duplicados comparten el identificador con su fila fuente, por lo que un ID solo no distingue esas dos ocurrencias.

## 2. Los 15 campos

Cada fila representa un movimiento de inventario sintético para un producto genérico, almacén, proveedor y canal. Las unidades monetarias son ficticias; no se mezclan monedas.

| Posición WEKA | Campo | Tipo | Descripción / rango ordinario |
|---|---|---|---|
| 1 | id_registro | Numérico identificador | No debe ser predictor ni variable de detección IQR |
| 2 | dia_operacion | Numérico | Día simulado, 1 a 365 |
| 3 | almacen | Nominal | norte, sur, centro; variantes sucias en mayúsculas |
| 4 | categoria | Nominal | alimentos, aseo, papeleria, tecnologia |
| 5 | proveedor | Nominal | P01 a P05 |
| 6 | stock_inicial | Numérico | Unidades, 50 a 200 |
| 7 | demanda | Numérico | Unidades solicitadas, 10 a 60 |
| 8 | unidades_recibidas | Numérico | Unidades, 0 a 80 |
| 9 | unidades_vendidas | Numérico | Mínimo entre disponibilidad y demanda |
| 10 | stock_final | Numérico | stock_inicial + unidades_recibidas − unidades_vendidas |
| 11 | costo_unitario | Numérico | 10 a 50 unidades monetarias ficticias |
| 12 | precio_unitario | Numérico | costo_unitario por un margen entre 1,4 y 1,8 |
| 13 | plazo_entrega_dias | Numérico | 1 a 7 días; extremos introducidos de 365 a 730 |
| 14 | costo_pedido | Numérico | 0 a 30 unidades monetarias; negativos inválidos |
| 15 | canal_venta | Nominal | tienda, web, mayorista |

## 3. Preparar WEKA y abrir el archivo

Orden corregido para Explorer: imputar antes de InterquartileRange. La secuencia se ejecutó y verificó con **WEKA stable 3.8.6 por línea de comandos y Java 21**. Explorer utiliza las mismas clases de filtros. No se ha ejecutado ni capturado la interfaz gráfica del equipo del usuario. En otras versiones de la rama estable 3.8 algunos rótulos pueden variar; conservar los parámetros indicados.

Si necesitas instalarlo, utiliza la [página oficial de descarga](https://waikato.github.io/weka-wiki/downloading_weka/), versión estable para Windows x64. No necesitas modificar la instalación de Java utilizada por Jenkins.

1. Descomprime el paquete en una carpeta local.
2. Abre **WEKA → Explorer → Preprocess**.
3. Pulsa **Open file** y selecciona `stockquest_100000_15_original.arff`.
4. Comprueba **Instances = 100000** y **Attributes = 15**.
5. En **Class**, selecciona **No class / None**. Esta práctica no define una variable objetivo.
6. Selecciona `almacen`: debe haber 2.000 faltantes y variantes en mayúsculas. En `costo_pedido` habrá 2.000 faltantes y valores negativos.
7. Guarda una captura del estado inicial. Conserva el original sin sobrescribir.

En cada paso siguiente: **Filter → Choose**, busca la clase indicada, pulsa el nombre del filtro para editar parámetros, **OK → Apply**. Un cambio en los parámetros no se ejecuta hasta pulsar Apply. Si te equivocas, utiliza Undo o vuelve a cargar el último checkpoint guardado.

## 4. Quitar duplicados exactos

Filtro: `unsupervised → instance → RemoveDuplicates`.

Aplica con sus valores predeterminados. Compara las 15 columnas, incluido el ID: este dataset contiene copias exactamente iguales, no simplemente IDs repetidos con información distinta.

**Resultado esperado:** 98.000 filas y 15 campos; se retiran 2.000 copias. Guarda opcionalmente `01_sin_duplicados.arff`.

## 5. Unificar categorías de almacén

Filtro: `unsupervised → attribute → RenameNominalValues`.

| Parámetro | Valor |
|---|---|
| selectedAttributes | `3` |
| valueReplacements | `NORTE:norte,SUR:sur,CENTRO:centro` |
| ignoreCase | `False` |
| invertSelection | `False` |

**Resultado esperado:** 98.000 filas, 15 campos; almacenes no faltantes únicamente norte, sur y centro. Corrige las 2.000 categorías sucias. No se deben borrar las filas por diferencias de mayúsculas.

## 6. Convertir negativos inválidos a faltantes

Filtro: `unsupervised → attribute → NumericCleaner`.

| Parámetro | Valor |
|---|---|
| attributeIndices | `14` |
| minThreshold | `0` |
| minDefault | `NaN` |

Deja las demás opciones por defecto. `NaN` es el valor numérico especial que WEKA representa como faltante `?`; no introduzcas el texto entre comillas. Solo se reemplazan costos inferiores a cero: cero es válido.

**Resultado esperado:** 98.000 filas y 15 campos. Los 2.000 negativos pasan a faltantes. Habrá **6.000 celdas faltantes**: 2.000 en almacén y 4.000 en costo_pedido. Ahora aplica la imputación del paso siguiente: Explorer bloquea InterquartileRange mientras haya faltantes.

## 7. Imputar los faltantes antes de IQR

Filtro: `unsupervised → attribute → ReplaceMissingValues`.

Con **Class = No class**, aplica los valores predeterminados. Para atributos numéricos utiliza la **media**; para nominales, la **moda**. En esta práctica rellena almacén y costo_pedido. No utiliza la mediana.

**Resultado esperado:** **98.000 filas, 15 campos, cero faltantes**. La imputación es una estimación: no demuestra recuperar el valor original perdido. Aquí faltan valores de costo, no cantidades de stock; por eso no se rompe la ecuación de inventario al imputar.

Si posteriormente entrenas un modelo, separa entrenamiento/prueba antes de aprender medias, modas o umbrales. Esta guía es una práctica descriptiva de limpieza, no una evaluación predictiva.

La comprobación de capacidades de InterquartileRange rechaza los valores faltantes y Explorer desactiva Apply. Aunque la ejecución CLI anterior los procesó, esta guía debe respetar las capacidades del filtro. En este conjunto solo faltan almacen y costo_pedido; los outliers introducidos afectan plazo, demanda y costo/precio unitario. Se permite imputar esos dos campos antes de IQR y se verificó que siguen detectándose exactamente los 10.000 outliers. Esta justificación es específica del dataset: no es una recomendación general de imputar medias contaminadas por extremos.

## 8. Detectar los outliers

Filtro: `unsupervised → attribute → InterquartileRange`.

| Parámetro | Valor |
|---|---|
| attributeIndices | `6-14` |
| outlierFactor | `3.0` |
| extremeValuesFactor | `6.0` |
| extremeValuesAsOutliers | `True` |
| detectionPerAttribute | `False` |
| outputOffsetMultiplier | `False` |

IQR = Q3 − Q1. Se marcan valores fuera de Q1 − 3×IQR y Q3 + 3×IQR. La opción extremeValuesAsOutliers incluye los extremos en la bandera Outlier; omitirla puede dejar fuera precisamente las anomalías más grandes.

No selecciones el ID ni el día. El identificador no representa una magnitud de negocio. Este filtro **marca**, no elimina.

**Resultado esperado:** 98.000 filas y **17 campos temporales**: se añaden `Outlier` (posición 16) y `ExtremeValue` (17). Selecciona Outlier: `yes` debe tener **10.000** filas y `no` 88.000. Guarda una captura y, si quieres, `04_marcado_outliers.arff`.

La detección se contrastó con la referencia sintética: 10.000 aciertos, cero falsos positivos y cero falsos negativos. Esto solo acredita este conjunto diseñado con grupos separados; no promete ese resultado en datos reales.

## 9. Retirar las filas marcadas

Para esta práctica se decide conservar una población de operación ordinaria. En datos reales, un outlier puede ser válido: investigar, justificar la decisión y conservarlo aparte antes de eliminarlo. El paquete ya incluye las filas retiradas para revisión.

Filtro: `unsupervised → instance → RemoveWithValues`.

| Parámetro | Valor |
|---|---|
| attributeIndex | `16` |
| nominalIndices | `2` |
| invertSelection | `False` |
| matchMissingValues | `False` |

La etiqueta 1 es `no` y la 2 es `yes`, declaradas en el ARFF producido. Revisa ese orden antes de aplicar: el número identifica una etiqueta, no el valor numérico de la bandera.

**Resultado esperado:** **88.000 filas y 17 campos**. Si quedan 10.000, conservaste los outliers en lugar de retirarlos: Undo y revisa invertSelection/nominalIndices.

## 10. Quitar indicadores auxiliares

Filtro: `unsupervised → attribute → Remove`.

- attributeIndices = `16-17`.
- invertSelection = `False`.

**Resultado esperado:** **88.000 filas y 15 campos**. No elimines las columnas originales.

## 11. Guardar y comprobar

1. Pulsa **Save** y guarda con otro nombre, por ejemplo `mi_stockquest_limpio.arff`.
2. Si necesitas CSV, elige el tipo CSV en el diálogo de guardado y guarda `mi_stockquest_limpio.csv`.
3. Comprueba 88.000 instancias y 15 atributos; almacén sin mayúsculas ni faltantes; costo_pedido sin negativos ni faltantes.
4. Aplica de nuevo RemoveDuplicates: deben seguir siendo 88.000.
5. Para este dataset, repetir InterquartileRange con los mismos parámetros sobre la población final debe dar cero Outlier=yes. Retira las banderas nuevas antes de guardar el archivo final de 15 campos.
6. Compara tus recuentos con `validacion_weka.json` y con el archivo limpio de referencia; para comparar valores conviene ordenar por id_registro, pues algunos filtros pueden cambiar el orden.

No tienen por qué coincidir los hashes entre archivos guardados por distintas versiones: el nombre de la relación, representación decimal y orden pueden variar. Valida estructura, contenido y recuentos, además del hash cuando corresponda a los archivos entregados.

### Balance de la limpieza

| Momento | Filas | Campos | Faltantes |
|---|---:|---:|---:|
| Original | 100.000 | 15 | 4.000 |
| Sin duplicados | 98.000 | 15 | 4.000 |
| Categorías corregidas | 98.000 | 15 | 4.000 |
| Negativos convertidos | 98.000 | 15 | 6.000 |
| Imputación antes de IQR | 98.000 | 15 | 0 |
| Outliers marcados | 98.000 | 17 | 0 |
| Sin outliers | 88.000 | 17 | 0 |
| Final sin indicadores | 88.000 | 15 | 0 |

100.000 − 2.000 duplicados − 10.000 outliers = **88.000 filas finales**. Los otros 8.000 registros sucios se corrigen o imputan y se conservan. No se añaden registros inventados para mantener 100.000 tras eliminar filas.

### Evidencias recomendadas para la entrega

Capturas de la carga original, las 98.000 filas tras deduplicar, las etiquetas canónicas, los negativos convertidos, el indicador con 10.000 yes, y el estado final con 88.000 filas/15 campos/cero faltantes. Adjunta el original, el resultado y una explicación de los filtros/parámetros y de la decisión de retirar los outliers.

## Fuentes oficiales consultadas

- [Descarga y versión estable](https://waikato.github.io/weka-wiki/downloading_weka/).
- [RenameNominalValues: sustitución de etiquetas](https://weka.sourceforge.io/doc.dev/weka/filters/unsupervised/attribute/RenameNominalValues.html).
- [NumericCleaner: umbrales numéricos](https://weka.sourceforge.io/doc.dev/weka/filters/unsupervised/attribute/NumericCleaner.html).
- [InterquartileRange: banderas y factores](https://weka.sourceforge.io/doc.stable/weka/filters/unsupervised/attribute/InterquartileRange.html).
- [RemoveWithValues: selección de filas por etiqueta](https://weka.sourceforge.io/doc.dev/weka/filters/unsupervised/instance/RemoveWithValues.html).
- [ReplaceMissingValues: media y moda](https://weka.sourceforge.io/doc.dev/weka/filters/unsupervised/attribute/ReplaceMissingValues.html).

La versión de documentación dev puede exponer opciones adicionales; las opciones usadas aquí se comprobaron ejecutándolas en WEKA 3.8.6 estable. No se ha realizado la práctica en la interfaz gráfica del usuario.
