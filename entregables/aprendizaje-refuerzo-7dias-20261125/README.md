# Stock Quest: necesidad de refuerzo siete días después

Entrega del 25/11/2026. **Todos los datos, aprendices, evaluaciones futuras y resultados son sintéticos.** No se modificaron bases ni se desplegó el modelo en Stock Quest.

## Pregunta y alcance

¿Qué aprendiz podría necesitar refuerzo en alguno de sus módulos siete días después del corte?

Se considera necesidad de refuerzo una evaluación independiente a t+7 inferior a 60/100. Es una regla didáctica provisional, no validada pedagógica ni psicométricamente. No equivale a nivel de XP ni a una decisión definitiva sobre una persona.

Cada fila es un aprendiz/módulo/corte. Hay 2.000 aprendices ficticios, dos módulos por persona y 25 cortes semanales. Los mismos aprendices aparecen repetidamente; no son 100.000 personas.

## Archivos principales

| Archivo | Uso |
|---|---|
| `diagnostico_actual_100000_15.csv/.arff` | 100.000 filas y 15 campos originales, conservados exactamente |
| `diagnostico_7dias_despues_100000_15.csv/.arff` | Los mismos pares, con observaciones siete días posteriores; 100.000 x 15 |
| `contraste_actual_vs_7dias_100000.csv` | ID, módulo, fechas, notas de referencia, niveles, cambio y etiqueta futura |
| `modelado/refuerzo_7dias_100000_15.csv/.arff` | Los primeros 14 campos de t y objetivo binario requiere_refuerzo_7dias |
| `weka/entrenamiento.arff` | 64.000 filas; solo estas ajustan los dos árboles |
| `weka/validacion.arff` | 12.000 filas; selecciona árbol y umbral |
| `weka/prueba.arff` | 16.000 filas; evaluación final posterior a la selección |
| `weka/separacion_1.arff`, `separacion_2.arff` | 4.000 filas cada una, excluidas de ajuste y evaluación |
| `weka/predecir_ultimo_corte_4000.arff` | Indicadores del 24/11; clase ?; objetivo 01/12 |
| `referencia_evaluaciones_104000_NO_PREDICTORES.csv` | Evaluaciones independientes para auditoría; nunca introducir como predictores |
| `actividad_semana_adicional_28000.csv` | Siete días adicionales por cada uno de los 4.000 pares aprendiz/módulo |
| `resultados/refuerzo_7dias.model` | Modelo WEKA seleccionado, con filtro y cabecera guardados |
| `resultados/predicciones_ultimo_corte_4000.csv` | Puntuación, alerta y contraste sintético de los 4.000 casos |
| `resultados/alertas_refuerzo_por_modulo.csv` | Las 3.410 alertas por módulo |
| `resultados/priorizacion_2000_aprendices.csv` | Lista por aprendiz con sus módulos señalados |
| `resultados/metricas_modelo.json` | Métricas, baselines y recuentos completos |
| `resultados/seleccion_solo_validacion.json` | Las 38 combinaciones consideradas y su selección |
| `control_pares.json`, `validacion_entrega.json`, `validacion_weka.json` | Trazabilidad y comprobaciones ejecutadas |
| `StockQuest-Refuerzo-Aprendizaje-7dias.pdf` | Informe de siete páginas incluido en el ZIP |

El futuro se generó continuando exactamente el mismo proceso y sus semillas; se verificaron las 100.000 filas originales antes de emparejar. Los cortes de t abarcan 09/06-24/11/2026 y los de t+7, 16/06-01/12/2026. El 01/12 todavía es futuro respecto a la fecha de elaboración: su evaluación es simulada, no una observación real.

**El dataset de siete días después sirve para contrastar y obtener etiquetas. Sus indicadores futuros NO se usan como variables de entrada.** Si se usaran, la evaluación no sería un pronóstico válido.

## Los 15 campos

1. id_aprendiz_sintetico
2. fecha_corte
3. modulo
4. nota_diagnostica_inicial
5. lecciones_asignadas
6. lecciones_completadas
7. minutos_estudio_7dias
8. intentos_desafio_7dias
9. nota_media_desafios_7dias
10. acierto_primer_intento_7dias
11. simulaciones_completadas_7dias
12. puntaje_medio_simulaciones_7dias
13. dias_desde_ultima_actividad
14. mejora_semanal
15. nivel_actual en los diagnósticos; requiere_refuerzo_7dias {no,si} en modelado.

Los ? corresponden a ausencia legítima de observación. No rellenarlos con cero. J48 los admite. El nivel actual y la nota actual de la evaluación de referencia no se introdujeron como predictores del modelo futuro. La nota diagnóstica inicial es un pretest anterior al historial, no la evaluación actual.

Los temas coinciden con los nueve módulos del contenido del proyecto. La generación supone instrumentación aún propuesta: minutos de estudio, banco adicional de práctica, evaluación independiente, primeros intentos por sesión y vínculo simulación-módulo. No se afirma que todo eso exista ya en producción.

## Separación temporal

| Partición | Fechas de indicadores | Fechas de etiquetas | Filas |
|---|---|---|---:|
| Entrenamiento | 09/06-22/09 | 16/06-29/09 | 64.000 |
| Separación 1 | 29/09 | 06/10 | 4.000 |
| Validación | 06/10-20/10 | 13/10-27/10 | 12.000 |
| Separación 2 | 27/10 | 03/11 | 4.000 |
| Prueba | 03/11-24/11 | 10/11-01/12 | 16.000 |

Todas las fechas son de 2026. No usar las particiones por aprendiz del diagnóstico anterior para medir este pronóstico temporal. Aquí se evalúan semanas posteriores de los mismos alumnos; no generalización a personas nuevas.

## Resultado y límites

Se ejecutó WEKA 3.8.6 con FilteredClassifier(Remove 1-2, J48). Se evaluaron mínimos de 20 y 100 instancias por hoja, confianza 0,25 y Laplace activado. Se eligieron mínimo 100 y umbral **0,15** usando exclusivamente F2 de validación entre umbrales 0,05-0,95 (paso 0,05). F2 favorece la recuperación de casos de dificultad. Es una política exploratoria de alta sensibilidad, no una decisión pedagógica acordada.

Prueba temporal: recall 93,86 %, precisión de alerta 31,19 %, F1 0,468, F2 0,669 y AUC 0,711. Hay 4.234 verdaderos positivos, 277 falsos negativos, 9.343 falsos positivos y 2.146 verdaderos negativos. La exactitud es 39,88 %. Alertar a todos ya obtiene F2 0,663: la mejora en ese criterio es pequeña. No presentar la alta sensibilidad como éxito operativo completo.

En el último corte: 3.410 alertas de 4.000 casos; 1.897 personas con algún módulo señalado. Se detectan 1.051 de 1.126 casos de refuerzo de la referencia, pero hay 2.359 falsas alertas. El clasificador produce puntuaciones **no calibradas**. El máximo entre módulos sirve para ordenar la lista por persona; no es la probabilidad de riesgo de esa persona. Hay 91 aprendices empatados en la mayor puntuación; el ID solo ordena el empate.

El baseline de persistencia utiliza una evaluación independiente actual que no recibe el predictor: es una referencia más informada. La prueba no demuestra eficacia de intervenciones de refuerzo ni validez en usuarios reales. Recomendar revisión humana y una actividad breve de confirmación; no decisiones punitivas, de certificación o exclusión.

## Reproducir paso a paso en WEKA Explorer

1. Abrir `weka/entrenamiento.arff`: comprobar 64.000 instancias y 15 atributos.
2. Elegir Class = requiere_refuerzo_7dias. La clase es nominal no/si.
3. Classify > Choose > meta > FilteredClassifier.
4. Su filtro: unsupervised.attribute.Remove; attributeIndices = 1-2; invertSelection = False.
5. Su classifier: trees.J48; minNumObj = 100; confidenceFactor = 0.25; useLaplace = True.
6. Supplied test set: `weka/validacion.arff`. Esta etapa selecciona configuración; no usar prueba para elegir.
7. Con configuración fijada, evaluar `weka/prueba.arff`. **El resumen estándar de WEKA usa la clase más probable; no representa automáticamente el umbral 0,15 del informe.**
8. Para cargar el modelo entregado: en la lista de resultados, clic derecho > Load model > `resultados/refuerzo_7dias.model`.
9. Establecer Supplied test set = `weka/predecir_ultimo_corte_4000.arff`. En las opciones de salida elegir predicciones CSV y habilitar distribución de probabilidades. Re-evaluate model on current test set desde el modelo cargado.
10. Usar la probabilidad de **si**, no la de la clase elegida, y marcar alerta si es >= 0,15. Los CSV entregados ya aplican esta regla. No interpretar la etiqueta predicha al umbral predeterminado 0,5 como si fuera la del informe.

Los resultados de 4.000 casos incluyen etiquetas sintéticas de referencia añadidas **después** de predecir; sus ARFF de entrada llevan clase ?. No se usaron las notas futuras para calcular la puntuación.

## Reproducir exactamente con comandos

Requisitos: Java 21 o compatible, WEKA 3.8.6 instalado y Python 3.11 o posterior. Los scripts de análisis y validación usan solo la biblioteca estándar de Python. Para regenerar el PDF se necesita además reportlab.

Extraer el ZIP en una ruta corta como `C:\StockQuestLab\refuerzo7dias`. Abrir PowerShell en la carpeta que contiene este README. Ajustar `$wekaDir` a la instalación real:

```powershell
$wekaDir = 'C:\Program Files\Weka-3-8-6'
if (!(Test-Path (Join-Path $wekaDir 'weka.jar'))) {
    throw 'Ajusta wekaDir a la carpeta que contiene weka.jar.'
}
$cp = "$wekaDir\weka.jar;$wekaDir\*;$wekaDir\lib\*"

java -Xmx512m -cp $cp .\VerificarRefuerzo.java .
if ($LASTEXITCODE -ne 0) { throw 'Falló la lectura de los ARFF.' }

java -Xmx512m -cp $cp .\EntrenarRefuerzo.java .
if ($LASTEXITCODE -ne 0) { throw 'Falló el entrenamiento.' }

python .\analizar_resultados.py
if ($LASTEXITCODE -ne 0) { throw 'Falló el análisis.' }

python .\validar_entrega.py
if ($LASTEXITCODE -ne 0) { throw 'Falló la validación.' }
```

Para cargar el modelo guardado y producir puntuaciones sin reentrenar:

```powershell
java -Xmx512m -cp $cp .\EntrenarRefuerzo.java predict `
    .\resultados\refuerzo_7dias.model `
    .\weka\predecir_ultimo_corte_4000.arff `
    .\resultados\nuevas_probabilidades.csv
if ($LASTEXITCODE -ne 0) { throw 'Falló la inferencia.' }

$puntajes = Import-Csv .\resultados\nuevas_probabilidades.csv
$alertas = $puntajes | Where-Object {
    [double]::Parse($_.probabilidad_refuerzo, [Globalization.CultureInfo]::InvariantCulture) -ge 0.15
}
$alertas | Export-Csv .\resultados\nuevas_alertas.csv -NoTypeInformation -Encoding UTF8
```

Las notas de referencia de diciembre no son necesarias para este comando de predicción. Solo sirven después para comprobar aciertos. Para datos nuevos se necesitan el mismo esquema y orden, fecha de corte correcta, indicadores calculados hasta esa fecha y clase ?. Validar que la instrumentación real coincide con las definiciones del generador.

Para regenerar todos los datos, **usar una copia de la entrega**, porque se sobrescriben los archivos generados:

```powershell
python .\preparar_refuerzo.py
if ($LASTEXITCODE -ne 0) { throw 'Falló la generación.' }
```

Se incluye el generador original y su control. Dentro del repositorio usa el dataset diagnóstico vecino; fuera de él usa las copias incluidas. Para regenerar el PDF, instalar reportlab si falta y ejecutar `python crear_informe.py`. Si se usa fuera del checkout, el script sitúa la salida en `output/pdf` dos niveles por encima de su carpeta; el PDF terminado ya está incluido en el ZIP.

## Próximas mejoras

Validar rúbrica e indicadores con el responsable pedagógico. Recoger datos reales con permisos apropiados. Calibrar puntuaciones, revisar errores por módulo, acordar capacidad de atención y una política más selectiva. Seleccionar cambios con nueva validación y reservar una prueba futura nueva: no seguir ajustando contra las métricas ya publicadas. Evaluar nuevos aprendices por separado. Integrar en la aplicación solo después de esa validación.

Referencias técnicas: [FilteredClassifier/J48](https://weka.sourceforge.io/doc.stable-3-8/weka/classifiers/meta/FilteredClassifier.html), [J48](https://weka.sourceforge.io/doc.stable/weka/classifiers/trees/J48.html), [separación temporal](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html). No se utilizó scikit-learn para entrenar.
