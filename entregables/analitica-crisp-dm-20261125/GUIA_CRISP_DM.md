# Stock-Quest: laboratorio CRISP-DM y WEKA

Fecha: 25 de noviembre de 2026. Rama: `codex/reestructuracion-stock-quest`.
El experimento utiliza el historial sintético del 24/11/2026. No consulta bases operativas ni ejecuta pedidos reales.

## 1. Comprensión del negocio

Decisión: cuántas unidades recomendar al cierre por producto y almacén, con plazo de tres días y revisión diaria. Pronosticar demanda h1–h4 permite cubrir plazo más revisión. Se modela demanda solicitada, no ventas limitadas por existencias.

Objetivo analítico: reducir MAE frente al naive semanal con ajuste de promoción; revisar RMSE, sesgo y WAPE para no esconder errores grandes o sistemáticos. Objetivo de gestión propuesto: mejorar error sin aumentar unidades perdidas ni inventario medio en una simulación comparable. El servicio de 95% por ciclo es un objetivo, no un resultado acreditado por MAE.

Caso complementario: `presion_demanda = si` cuando la demanda de mañana supera `1.2 × media_demanda_7_dias` conocida hoy. El 20% es un supuesto didáctico fijado antes del ajuste. Identifica presión sobre una cobertura de referencia, no falta física de existencias. Solo ocho agotamientos históricos impiden una evaluación fiable de esa clase real. Nunca usar stock final de mañana, ventas de mañana o agotamiento observado como predictores.

## 2. Comprensión de los datos

Fuente principal: `../historial-temporal-20261124/`. Son 100 productos × 2 almacenes × 500 días, del 12/07/2025 al 23/11/2026. El conjunto anterior de noviembre contiene contaminación artificial y sirve para practicar limpieza; no se mezcla con estas series.

El historial tiene 15 campos operativos; los ARFF supervisados también tienen 15, pero con otro significado. Sus 14 predictores incluyen identificadores, calendario, promoción/precio anunciados, lags, medias y tendencia; el último atributo es demanda futura. Los identificadores son nominales, no números ordinales. El índice temporal y el calendario objetivo son conocidos al emitir el pronóstico. El precio/promoción futuro solo es admisible si estaba anunciado entonces.

Revisar `estadistica.json`, `datos/descriptivos.csv` y gráficas 01, 02 y 02b. La matriz de correlación mide asociaciones lineales; no demuestra causalidad. La matriz de dispersión colorea la clase auxiliar en entrenamiento. Un punto extremo puede ser una promoción legítima.

Controles: claves únicas, faltantes y balance de stock comprobados en este experimento. El validador original permite ampliar la revisión de continuidad, recepciones y lags: ejecutar `validar_historial.py` en su carpeta sin regenerar el dataset.

## 3. Preparación y prevención de fuga

1. Conservar originales. Separar por fecha objetivo antes de estimar cualquier transformación.
2. Entrenamiento: hasta 26/06/2026. Validación: 27/06–09/09/2026. Prueba: 10/09–23/11/2026. Cada bloque contiene todas las series en esas fechas.
3. No eliminar outliers automáticamente por IQR. Marcar extremos por producto, almacén y promoción; comprobar unidad, digitación y ecuación de stock. Corregir solo errores documentados. Una demanda alta válida es información crítica.
4. No se imputó ni normalizó el conjunto limpio para árboles. Si aparecen faltantes, usar `meta → FilteredClassifier` con `ReplaceMissingValues`; se ajusta exclusivamente en entrenamiento. Nunca reemplazar demanda objetivo desconocida para entrenar.
5. Para SMO/SMOreg: utilizar normalización interna o `FilteredClassifier` con `Standardize`, sin aplicar ambas por rutina. Para un pipeline explícito: `MultiFilter` con `ReplaceMissingValues`, `NominalToBinary`, `Standardize`, y desactivar el escalado interno duplicado. Los parámetros de transformación deben viajar con el modelo.
6. Discretización: no convertir la demanda continua en intervalos para regresión. Para un experimento nominal, aplicar `Discretize` a predictores seleccionados dentro de `FilteredClassifier`; comparar contra la versión continua usando validación. La clase auxiliar de este laboratorio es una regla de negocio explícita, no un discretizador ajustado con test.
7. Para datos operativos sin demanda perdida observable, el objetivo queda censurado por disponibilidad. Registrar solicitudes no atendidas o diseñar una estimación de censura antes de reutilizar el pipeline.

## 4. Algoritmos y fundamentos

**Ejecutados en WEKA:** REPTree y RandomForest para regresión; J48 y RandomForest para la clase auxiliar. Los parámetros exactos están en `analizar.py` y los modelos interpretables en `modelos/*.txt`.

- REPTree: árbol de regresión, minimiza variación de la respuesta por partición y poda para controlar complejidad. `minNum=20`, `maxDepth=12`, semilla 20261125. Sus reglas son auditables.
- RandomForest: promedio de 50 árboles para regresión y probabilidades agregadas para clasificación; profundidad máxima 16, mínimo 5 y dos hilos. Reduce varianza mediante diversidad de árboles; no es causal y puede extrapolar mal tendencias fuera del rango aprendido.
- J48: C4.5 con poda, `confidenceFactor=0.25`, `minNumObj=30`; admite clase nominal. No sirve directamente para `demanda_objetivo` numérica.
- Extensión propuesta: LinearRegression como modelo aditivo interpretable, con coeficientes, colinealidad y residuos; minimizar suma de errores cuadrados con regularización ridge cuando corresponda. Evaluar tras codificación nominal y escalado controlados.
- Extensión propuesta: SMOreg para demanda o SMO para clase nominal. Explorar C={0.1,1,10} y kernel lineal/RBF, ajustando gamma exclusivamente en validación temporal. SVR controla penalización y banda epsilon; SVM maximiza margen geométrico. El margen probabilístico graficado aquí no es distancia al hiperplano SVM.
- MLP es una extensión, no un resultado ejecutado: requiere escalado, varias semillas y comparación de coste computacional frente a árboles y regresión. La complejidad adicional no garantiza mejor pronóstico.

## 5. Instalación y entorno

La página oficial consultada ofrece WEKA estable 3.8.7 con JVM incluida. Este experimento fijó **WEKA 3.8.6 + Java 21.0.11** para reproducir los ARFF previamente comprobados. No se necesita cambiar el Java del resto de Stock-Quest.

1. Descargar el instalador Windows de la [página oficial](https://ml.cms.waikato.ac.nz/weka/downloading.html), eligiendo x64 o ARM según el equipo. El paquete con JVM reduce problemas de rutas.
2. Abrir WEKA desde su acceso directo. Para conservar exactamente esta ejecución, usar el JAR 3.8.6 aislado en `.stockquest-local/analitica/` y su dependencia `bounce.jar`.
3. Verificar Java con `& 'C:/Program Files/Java/jdk-21.0.11/bin/java.exe' -version`. Si la ruta no existe, localizar el JDK instalado; no copiar una ruta inexistente ni reemplazar JAVA_HOME global sin necesidad.
4. Lanzar la interfaz reproducible desde la raíz:

```powershell
& 'C:/Program Files/Java/jdk-21.0.11/bin/java.exe' -Xmx2g -cp '.stockquest-local/analitica/*' weka.gui.GUIChooser
```

5. Para ejecutar todo el laboratorio: compilar `WekaRun.java` con `javac -cp '.stockquest-local/analitica/*' entregables/analitica-crisp-dm-20261125/WekaRun.java`; después ejecutar `analizar.py` con Python y numpy, pandas, matplotlib, scikit-learn. El script localiza paquetes aislados en `.stockquest-local/analitica/python`. `SQ_JAVA` permite indicar otro ejecutable Java.
6. No subir los JAR ni paquetes locales al repositorio. Los `.model` se conservan localmente y están ignorados por Git debido a su tamaño; se regeneran con los scripts. No cargar modelos Java serializados de origen desconocido.

## 6. WEKA Explorer paso a paso

### Regresión

1. Explorer → Preprocess → Open file → `../historial-temporal-20261124/weka/h1/entrenamiento.arff`.
2. Comprobar 15 atributos, 64.200 instancias y clase numérica `demanda_objetivo` (última).
3. Classify → Choose → trees → REPTree. Introducir los parámetros anteriores.
4. Test options → Supplied test set → Set → `validacion.arff`. More options → Output predictions → CSV. Start.
5. Repetir con RandomForest. Comparar MAE de validación y conservar el modelo ganador; no elegir mirando prueba.
6. Evaluar el modelo fijado en `prueba.arff`. Si se reutiliza desde Result list, usar Re-evaluate model on current test set. Guardar modelo y resultados.
7. Repetir h2, h3 y h4. Cada horizonte tiene entrenamiento propio; no confundir el lag `demanda_hace_7_dias` relativo al origen con el naive semanal relativo a la fecha objetivo.
8. Predecir con `predecir.arff`: la clase `?` significa desconocida, nunca cero. El corte es 23/11; h1–h4 corresponden a 24–27/11/2026. Son predicciones desde ese corte histórico, aunque alguna fecha ya haya pasado al abrir el archivo.

### Cross-Validation

El campo de WEKA `Cross-validation → Folds=10` produce folds aleatorios, normalmente estratificados para clase nominal. Puede ensayarse como demostración didáctica en entrenamiento, pero **no es la estimación principal de rendimiento futuro** de estas series. Repetir productos y días cercanos en train/test favorece estimaciones optimistas.

En este laboratorio se ejecutan tres folds temporales de ventana expansiva para el modelo h1 elegido: entrenamiento hasta días 200/250/300, evaluación en siguientes 50 días. Los archivos están en `datos/cv*_train.arff` y `cv*_test.arff`; cargarlos como entrenamiento y supplied test set. No se mezclan filas aleatoriamente. Los folds son un diagnóstico dentro del entrenamiento, no un CV anidado ni una evaluación imparcial del proceso completo de selección. La elección final usa la validación posterior y la prueba permanece fuera de esa selección.

Si se extiende el procedimiento a h2–h4, asegurar que cada etiqueta de entrenamiento ya sea observable al origen de la primera predicción del fold (purga de h−1 días respecto a la frontera de fecha objetivo). No usar KFold por filas para sustituir esta condición.

### Clasificación, ROC y errores

1. Abrir `datos/presion_entrenamiento.arff`; Class=`presion_demanda {no,si}`.
2. Classify → J48 o RandomForest; evaluar en `presion_validacion.arff` con los parámetros documentados.
3. Elegir algoritmo por ROC-AUC de validación. Elegir umbral en validación minimizando `(5 FN + FP)/N`. La relación 5:1 es un supuesto, no coste contable conocido.
4. Fijar modelo y umbral, evaluar en `presion_prueba.arff` una vez. La clasificación estándar de WEKA usa argmax; la matriz entregada aplica el umbral elegido a la probabilidad de `si`, por lo que puede diferir de la matriz por defecto del Explorer.
5. Clic derecho en Result list → Visualize threshold curve → clase `si`. Ver ROC y área; cambiar ejes para Precision/Recall. Visualize classifier errors muestra puntos mal clasificados. En Preprocess/Visualize se inspeccionan relaciones entre atributos; eso no dibuja automáticamente la frontera del modelo.
6. La frontera entregada evalúa el propio RandomForest/J48 WEKA sobre una malla bidimensional, fijando el resto de atributos a una fila real de entrenamiento. Es una sección condicional, no frontera completa ni efecto causal. Algunas combinaciones sintéticas de la malla pueden estar fuera del soporte o ser incompatibles con los otros lags.

## 7. Evaluación matemática y lectura de gráficos

MAE = media(|y−ŷ|), RMSE = raíz(media((y−ŷ)²)), sesgo = media(y−ŷ), WAPE = suma(|y−ŷ|)/suma(y). Sesgo positivo indica subestimación. No llamar accuracy al error de regresión. La diagonal del gráfico observado/predicho representa acierto; estructura en residuos indica patrones no capturados. La escala de los productos grandes pesa más en WAPE agregado.

ROC enfrenta TPR=TP/(TP+FN) y FPR=FP/(FP+TN); AUC mide ordenamiento, no exactitud ni calibración. Precision–Recall resulta más informativa cuando los positivos son escasos; la prevalencia es su referencia. Brier=media((p−y)²) y el gráfico de calibración comparan probabilidades con frecuencias.

Margen probabilístico = (2y−1)(2p−1); valores negativos implican error al umbral 0.5. El umbral operativo puede ser distinto; su coste se muestra separadamente. El bootstrap de MAE remuestrea bloques de siete fechas con todas las series juntas para preservar parte de la dependencia. Su intervalo es aproximado y no cubre deriva del simulador a datos reales.

## 8. Despliegue propuesto y arquitectura

Este cierre entrega un prototipo analítico offline y su plan de integración; no despliega un servicio ni modifica el simulador.

La capacidad de decisiones en `services/simulacion-logistica` debe ser propietaria de la recomendación. Definir un puerto de pronóstico en Application y un adaptador WEKA en Infrastructure. Domain recibe cantidades, horizontes y restricciones sin depender de WEKA. Mantener esquema y orden nominal junto al modelo y versionar fecha de entrenamiento, semilla, horizonte, transformaciones y checksum.

Contrato propuesto: entrada con producto, almacén, instante de corte, calendario conocido y lags; salida con vector h1–h4, versión del modelo y fecha máxima de datos. Rechazar esquemas incompatibles y datos futuros. Proponer fallback al naive ante modelo ausente, fallo de esquema o latencia excesiva; marcar explícitamente su uso.

El gateway compone HTTP sin leer bases; simulación conserva su propiedad de escritura. Aprendizaje puede recibir posteriormente un evento de recomendación/resultado para explicar decisiones pedagógicas, con contrato e idempotencia antes de implementarlo. No reutilizar accesos de bases entre servicios.

La política propuesta calcula `ceil(max(0, suma(pronosticos_h1..h4) + seguridad − stock_final − pedidos_pendientes))`. La seguridad se recalibra por producto/almacén con el percentil 95 del máximo error acumulado positivo sobre horizontes 1..4 de orígenes comunes en validación. El archivo de pedidos sustituye la decisión baseline del corte; no sumarla otra vez. La nueva recepción ocurre en h3, por lo que no resuelve un faltante de mañana.

Antes de automatizar: hacer replay de política con pedidos/recepciones recalculados, comparar mismo stock inicial y demanda, medir stock medio, unidades perdidas, fill rate y servicio por ciclos completos, además del coste acordado. Los pedidos entregados son propuestas de una decisión desde el estado baseline; no prueban desempeño de una política ejecutada durante 75 días. Vigilar error, sesgo, deriva y cobertura semanalmente; revisar reentrenamiento al degradarse frente al baseline en varias ventanas.

## Fuentes

- [CRISP-DM, IBM](https://www.ibm.com/docs/en/spss-modeler/saas?topic=dm-crisp-help-overview).
- [Instalación WEKA](https://ml.cms.waikato.ac.nz/weka/downloading.html) y [Java requerido](https://waikato.github.io/weka-wiki/requirements/).
- [REPTree](https://weka.sourceforge.io/doc.stable/weka/classifiers/trees/REPTree.html), [árboles WEKA](https://weka.sourceforge.io/doc.stable/weka/classifiers/trees/package-summary.html), [SMOreg](https://weka.sourceforge.io/doc.stable/weka/classifiers/functions/SMOreg.html), [FilteredClassifier](https://weka.sourceforge.io/doc.stable-3-8/weka/classifiers/meta/FilteredClassifier.html).
- [Validación temporal, Hyndman y Athanasopoulos](https://otexts.com/fpp3/tscv.html).
- Evidencia local: README y generador del historial; `docs/ARQUITECTURA-ACTUAL.md` y código de los servicios.
