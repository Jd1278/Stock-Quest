# Diagnóstico actual del aprendizaje — Stock Quest

## Qué representa

Dataset **sintético** de 100.000 registros y 15 campos: **2.000 aprendices ficticios × dos módulos por aprendiz × 25 cortes semanales**. Se usan los nueve temas del contenido del proyecto, distribuyendo dos temas distintos a cada aprendiz. Los códigos A0001 y M01 son del laboratorio, no identificadores reales de la base de aplicación.

Una fila describe un aprendiz, un módulo y una fecha de corte. Permite estimar **dominio actual del tema**; no representa nivel de XP, calificación global del alumno ni diagnóstico personal permanente. El periodo de cortes es 09/06/2026–24/11/2026; cada ventana incluye siete días de actividad. El diario empieza seis días antes del primer corte.

No se han exportado usuarios reales ni se han modificado bases o la aplicación. No se insertaron deliberadamente datos sucios. Los `?` representan ausencia legítima de observación, como una semana sin simulaciones, y no equivalen a puntuación cero.

## Los 15 campos

| Posición | Campo | Significado |
|---|---|---|
| 1 | id_aprendiz_sintetico | ID para trazabilidad; excluir del modelo |
| 2 | fecha_corte | Fecha del diagnóstico; excluir del primer modelo de nuevos aprendices |
| 3 | modulo | Tema de aprendizaje, M01–M09 |
| 4 | nota_diagnostica_inicial | Pretest de diez preguntas antes de comenzar el periodo |
| 5 | lecciones_asignadas | Una por módulo, conforme al contenido actual |
| 6 | lecciones_completadas | Acumulado de cero a una, no decreciente |
| 7 | minutos_estudio_7dias | Tiempo de actividad simulada en el tema |
| 8 | intentos_desafio_7dias | Intentos correctos e incorrectos |
| 9 | nota_media_desafios_7dias | Media de las notas de los intentos; ? sin intentos |
| 10 | acierto_primer_intento_7dias | Aciertos iniciales / sesiones de práctica; ? sin sesiones |
| 11 | simulaciones_completadas_7dias | Prácticas de simulación asignadas al tema |
| 12 | puntaje_medio_simulaciones_7dias | Media de puntuaciones; ? si no hubo simulaciones |
| 13 | dias_desde_ultima_actividad | Inactividad del tema; ? si aún no hubo actividad |
| 14 | mejora_semanal | Diferencia entre las medias de desafíos de dos semanas; ? sin ambas |
| 15 | nivel_actual | Clase: inicial, intermedio o avanzado |

El dominio se genera mediante aprendizaje gradual, olvido e incertidumbre en las respuestas. La participación y la eficiencia varían entre personas. Más minutos o más intentos no garantizan un nivel superior. La dificultad también depende del módulo. El conocimiento subyacente del simulador no se exporta como predictor.

## Cómo se define el nivel

Cada corte incorpora una **evaluación independiente de veinte preguntas nuevas**, posterior a la actividad agregada del corte. Esa prueba no utiliza las respuestas de práctica como sus respuestas correctas. Produce una nota de 0 a 100 con incrementos de cinco puntos:

- **Inicial:** nota menor de 60.
- **Intermedio:** nota de 60 a menos de 80.
- **Avanzado:** nota de 80 a 100.

Esta rúbrica es **didáctica y provisional**: no ha sido validada por un responsable pedagógico ni psicométricamente. La nota exacta, aciertos y tamaño de la prueba están en `referencia_evaluacion_NO_USAR_COMO_PREDICTOR.csv`, fuera de los 15 campos. Añadir esa nota como predictor revelaría la clase y produciría una evaluación engañosa.

Si ya se dispone de una evaluación independiente válida en producción, su resultado puede reportarse directamente. El modelo busca **estimar** el estado actual a partir de actividad cuando esa evaluación no está disponible para cada caso; no certifica el aprendizaje ni sustituye al docente. Las clases pueden cambiar entre cortes por aprendizaje, olvido o variación de la evaluación.

## Archivos

| Archivo | Uso |
|---|---|
| `diagnostico_actual_100000_15.csv` / `.arff` | Dataset completo, 100.000 × 15 |
| `weka/entrenamiento.csv` / `.arff` | 70.000 filas de 1.400 aprendices |
| `weka/validacion.csv` / `.arff` | 15.000 filas de otros 300 aprendices |
| `weka/prueba.csv` / `.arff` | 15.000 filas de otros 300 aprendices |
| `weka/diagnosticar_ultimo_corte.csv` / `.arff` | 4.000 casos del último corte, con clase desconocida ? |
| `particiones_aprendices.csv` | Asignación reproducible de alumnos a particiones |
| `actividad_diaria_sintetica.csv` | 700.000 registros diarios para comprobar las ventanas |
| `referencia_evaluacion_NO_USAR_COMO_PREDICTOR.csv` | Notas de referencia del corte y sus etiquetas |
| `catalogo_modulos.csv`, `diccionario_campos.csv` | Temas y definición de atributos |
| `control_generacion.json`, `validacion_diagnostico.json` | Recuentos, controles, parámetros y checksums |
| `resumen_ultimo_corte.json` | Distribución del diagnóstico sintético en los 4.000 casos aprendiz/módulo del 24/11/2026 |
| `validacion_weka.json` | Lectura real de cinco ARFF y comprobación de compatibilidad con J48, sin entrenamiento |

Los conjuntos de entrenamiento, validación y prueba no comparten alumnos. El objetivo evaluado es **generalizar a nuevos aprendices del mismo periodo sintético**, no anticipar fechas futuras. Para el posterior pronóstico a siete días se necesitará otra preparación y evaluación temporal.

Los 4.000 casos de último corte incluyen alumnos de todas las particiones: sirven para mostrar resultados individuales, no para medir rendimiento global del modelo. Para métricas utilizar exclusivamente prueba, tras seleccionar el modelo con validación.

## Correspondencia con la aplicación

Stock Quest ya contiene módulos, lecciones completadas, intentos/calificaciones y resultados de simulación. Para este laboratorio se agregan **instrumentaciones propuestas**: minutos de estudio, pretest inicial, evaluación diagnóstica independiente, primer intento por sesión y asociación pedagógica de simulaciones a módulos. No se afirma que esas mediciones estén implementadas en producción.

La práctica simulada supone un banco adicional de preguntas, mientras que el contenido actual tiene un desafío por lección. Esto permite representar prácticas repetidas; no se han añadido esas preguntas al proyecto. Se mantiene una lección asignada por módulo para no inventar una cantidad de lecciones existentes.

## Primer uso en WEKA

1. Cargar `weka/entrenamiento.arff`. Verificar 70.000 instancias y 15 atributos.
2. Seleccionar **Class = nivel_actual**. La clase es nominal: ahora corresponde clasificación, no regresión de demanda.
3. En Classify elegir **meta → FilteredClassifier**.
4. Configurar su **filter** como `unsupervised.attribute.Remove`, con `attributeIndices = 1-2` e `invertSelection = False`. Eliminará ID y fecha dentro de la tubería; los archivos originales conservan sus 15 campos.
5. Configurar su **classifier** como `trees.J48`; comenzar, por ejemplo, con `minNumObj = 20` y `confidenceFactor = 0.25`.
6. Usar **Supplied test set → weka/validacion.arff** y ejecutar Start. Seleccionar configuración solo con validación.
7. Revisar matriz de confusión, precisión/recall/F1 de cada clase y promedio macro. No basta la exactitud global. La clase mayoritaria de entrenamiento y su resultado constante están en control_generacion.json para comparación.
8. Fijar configuración y evaluar una vez con `weka/prueba.arff`.
9. Guardar el modelo y aplicar a `diagnosticar_ultimo_corte.arff` para obtener estimaciones actuales por aprendiz/módulo. La referencia de notas queda fuera del modelo.

J48 admite valores faltantes. No rellenar con cero medias inexistentes. Si se elige otro algoritmo que requiera imputación, aprenderla **solo del entrenamiento**, dentro de una tubería de filtros; no aplicar ReplaceMissingValues al dataset completo antes de separar. [FilteredClassifier](https://weka.sourceforge.io/doc.stable/weka/classifiers/meta/FilteredClassifier.html) aprende la estructura del filtro del conjunto de entrenamiento.

No se entrenó un modelo WEKA en esta entrega. El generador calcula solamente una referencia de clase mayoritaria; sus resultados no acreditan un modelo de diagnóstico. Todos los indicadores obtenidos sobre datos sintéticos necesitan validación con datos reales antes de utilizarse para decisiones educativas.

Se comprobó con WEKA 3.8.6 la lectura de los cinco archivos ARFF (204.000 instancias contando las particiones y los casos sin clase). Conservan 15 atributos, la clase nominal tiene tres categorías y el filtro Remove 1-2 produce los 13 atributos esperados. J48 pasó sus comprobaciones de capacidad sobre los conjuntos etiquetados. La ejecución avisó de bibliotecas MTJ opcionales ausentes; las comprobaciones indicadas finalizaron correctamente. Esto no equivale a entrenar ni evaluar la precisión de un clasificador.

En el último corte hay 1.135 casos iniciales, 1.859 intermedios y 1.006 avanzados. Son 4.000 diagnósticos de aprendiz/módulo para 2.000 personas ficticias; no son 4.000 personas ni resultados reales de Stock Quest. El resumen procede de las evaluaciones de referencia generadas, no de un modelo predictivo.

## Segunda fase: siete días después

No se creó aún una etiqueta futura ni un modelo de pronóstico. Las fechas e identificadores permiten emparejar, en la siguiente fase, el corte de hoy con la evaluación del mismo aprendiz y módulo siete días después.

Hay 96.000 pares observables dentro de estas 25 semanas; los últimos 4.000 cortes no tienen todavía una evaluación posterior. No deben etiquetarse como si conociéramos su resultado. Para mantener 100.000 ejemplos futuros completos habrá que generar una semana adicional de referencia.

## Reproducibilidad

El generador utiliza Python estándar y semilla 20261125. Por defecto lee los títulos del contenido del repositorio. Para reproducir fuera del checkout se puede ejecutar `generar_aprendizaje.py --content RUTA/stockquest.json` en otra carpeta. Escribe junto al generador; usar otra carpeta evita sobrescribir una práctica existente.

La validación independiente reconstruye las ventanas semanales a partir del diario, contrasta todas las etiquetas con las pruebas de referencia y comprueba que no haya alumnos compartidos entre particiones. No se realizaron importaciones PostgreSQL ni cambios en usuarios o funcionalidades de la aplicación.
