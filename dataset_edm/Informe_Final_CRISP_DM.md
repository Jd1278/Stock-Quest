# Stock-Quest: informe técnico de minería de datos educativa bajo CRISP-DM

**Fecha:** 25 de noviembre de 2026. **Estado:** auditoría ejecutada; evaluación independiente pendiente de corregir la partición. **Unidad de análisis:** sesión simulada de un aprendiz. **Variable objetivo:** `clase_perfil_aprendiz` ∈ {`Apto`, `Bloqueo_Cognitivo`, `Exceso_Confianza`}.

## Alcance y dictamen de evidencia

La carpeta real es `dataset_edm`. Se examinaron `stockquest_edm_100000.csv`, `train_80.arff`, `test_20.arff`, `auditoria_NO_ENTRENAR.csv`, `verificacion.json`, `j48_resultados.txt` y el generador `../generar_edm.py`. No existe aquí `stock_quest_clean.arff`; el nombre del CSV difiere del planteamiento inicial. El archivo `j48.model` existe, pero no se reentrenó ni se presume que constituye una evaluación independiente.

**La evidencia disponible no demuestra una mejora por limpieza sobre un test del 20%.** El CSV contiene exactamente 20.000 anomalías inyectadas; el pipeline guardado imputa ausentes, elimina duplicados y agrega indicadores IQR, pero conserva extremos y errores de formato. El test guardado es un subconjunto del entrenamiento. El informe separa resultados observados, reconstrucciones matemáticas y protocolo pendiente; no convierte expectativas pedagógicas en conclusiones experimentales.

### Evidencia reproducible

Ejecutar desde la raíz del repositorio:

```powershell
python -m pip install numpy pandas scipy matplotlib
python dataset_edm/audit_metrics.py
python dataset_edm/audit_metrics.py --strict --no-plots
```

El modo normal genera resultados aunque encuentre defectos; `--strict` devuelve código 2 si entrenamiento/prueba no cumplen 80/20 disjunto. Los originales no se modifican. `auditoria_matematica/resumen.json` registra versiones, SHA-256, cardinalidades, solapamiento y concordancia de las banderas. Los CSV auxiliares contienen valores con precisión de cálculo; el texto redondea para lectura. La referencia por reglas de 80.000 filas es un contrafactual de auditoría y **no** un ARFF limpio ya producido por Weka. El script está orientado al esquema denso de estos archivos; no admite ARFF disperso ni instancias ponderadas.

## Fase 1. Comprensión del negocio y del problema educativo

### Pregunta de decisión y utilidad

Se busca reconocer cuándo una sesión requiere andamiaje por alta latencia y consulta reiterada, y cuándo requiere verificación deliberada por decisiones rápidas, escasa consulta y errores operativos. `Apto` representa desempeño compatible con el escenario simulado, no ausencia universal de dificultades. Las clases son estados conductuales sintéticos, no diagnósticos psicológicos ni rasgos permanentes del usuario.

[INSERTAR GRÁFICA DE WEKA: Hipótesis pedagógica; X=tiempo_decision_critica_seg; Y=frecuencia_consulta_pistas; Color=clase_perfil_aprendiz]

En Explorer → Visualize seleccionar esos atributos y colorear por la clase. El bloqueo se espera en la región de mayor latencia y mayor consulta; exceso de confianza, en baja latencia y baja consulta. Esa proyección no basta para distinguir al aprendiz eficiente del impulsivo: debe contrastarse con errores logísticos. Se conservará el solapamiento visible, evitando presentar las clases como separables mediante una regla universal de dos variables.

[INSERTAR GRÁFICA DE WEKA: Consecuencias de decidir rápido; X=tiempo_decision_critica_seg; Y=quiebres_stock_generados; Color=clase_perfil_aprendiz]

La hipótesis de exceso de confianza se apoya cuando la zona de baja latencia concentra más quiebres, mientras que `Apto` combina tiempos moderados y pocos quiebres. Este conteo significa días con demanda no atendida durante 14 días; no representa unidades faltantes. No existe un atributo literal de “error operativo”: se operacionaliza con quiebres y costos, reconociendo que costo alto por sí solo no define el perfil.

### Criterio de éxito y momento predictivo

El éxito técnico exige test independiente, recall por cada perfil de riesgo, control de falsos avisos sobre `Apto`, discriminación probabilística y resultados interpretables. La decisión educativa se formaliza como:

\[
a^*(x)=\arg\min_a\sum_{c\in\{A,B,E\}}L(a,c)\,P(c\mid x).
\]

La matriz de costos educativos \(L\) debe acordarse con docentes antes de evaluar: omitir bloqueo puede impedir apoyo; confundir exceso de confianza con aptitud puede reforzar decisiones incorrectas. No se inventan umbrales institucionales de aceptación: **[COMPLETAR: recall mínimo por B/E, tasa máxima de falso aviso y responsable]**.

Los resultados de costos y quiebres solo existen al terminar la simulación. Con ellos el sistema clasifica retrospectivamente la sesión. Para afirmar predicción anticipada se requiere otro conjunto de variables disponibles antes del instante de alerta y validación temporal; no basta cambiar el nombre del modelo.

## Fase 2. Comprensión de los datos

### Procedencia, población y contaminación

El generador declara semilla 42, 5.000 usuarios ficticios con múltiples sesiones y 100.000 filas. La clase interviene en la simulación de latencia, pistas y decisiones logísticas: la separación observada es consistente con el diseño sintético y no prueba validez externa con estudiantes reales. El archivo externo de auditoría nunca debe ingresar como predictor.

[INSERTAR GRÁFICA DE WEKA: Distribución original de perfiles; X=clase_perfil_aprendiz; Y=frecuencia de instancias en histograma de Preprocess; Color=clase_perfil_aprendiz]

En Preprocess, seleccionar la clase para mostrar el histograma; allí Y es el conteo calculado automáticamente, no un atributo seleccionable. El original contiene 49.779 `Apto`, 25.248 `Bloqueo_Cognitivo` y 24.973 `Exceso_Confianza`. La exactitud global favorece la clase mayoritaria; deben examinarse recall, F1 y ROC por perfil, además de promedios macro y ponderados.

La auditoría confirma 10.000 outliers inyectados, 3.334 filas con un nulo, 3.333 duplicados excedentes y 3.333 errores de formato o rango. Son 20.000 filas contaminadas bajo la convención de conservar una copia por duplicado. Tras mezclar filas, la primera copia retenida puede estar etiquetada como “duplicado” en la auditoría; la equivalencia se juzga por contenido, no por cuál copia apareció primero.

### Estadística descriptiva, forma y normalidad

[INSERTAR GRÁFICA DE WEKA: Distribución de latencia por perfil; X=tiempo_decision_critica_seg; Y=frecuencia en histograma de Preprocess; Color=clase_perfil_aprendiz]

Complementar con cajas y Q–Q generados externamente; el visualizador estándar de Weka no ofrece de forma general esos gráficos. Mantener paneles separados para original y referencia válida; no truncar silenciosamente el valor 9.999. Para cada variable y clase se reportan \(n\), ausentes, media, desviación muestral, mínimo, máximo, cuartiles, asimetría y curtosis excesiva:

\[
\bar x=\frac1n\sum_i x_i,\qquad s^2=\frac1{n-1}\sum_i(x_i-\bar x)^2,\qquad IQR=Q_3-Q_1.
\]

En la referencia por reglas, las medianas de latencia son 65,22 s (`Apto`), 260,39 s (bloqueo) y 13,98 s (exceso); las medianas de pistas son 1, 5 y 0, respectivamente. La media de quiebres es 0,000502, 0,422742 y 2,799800 en ese mismo orden. Estos valores respaldan la hipótesis interna de generación, sin demostrar eficacia de una intervención educativa.

Para Shapiro–Wilk:

\[
W=\frac{(\sum_i a_i x_{(i)})^2}{\sum_i(x_i-\bar x)^2},\qquad H_0:X\sim N(\mu,\sigma^2).
\]

El script aplica Shapiro a una muestra reproducible de hasta 5.000 observaciones por variable/grupo y D’Agostino–Pearson a los valores completos disponibles: \(K^2=Z_{asimetría}^2+Z_{curtosis}^2\), aproximadamente \(\chi^2_2\) bajo la hipótesis nula. Una muestra constante no admite Shapiro y queda sin p-valor. Se recomienda \(\alpha=0,05\) para análisis exploratorio; con tantas comparaciones debe preespecificarse un contraste o aplicar corrección, por ejemplo Benjamini–Hochberg, antes de declarar descubrimientos. Los p-valores del CSV son **sin ajuste**.

Las sesiones repetidas violan independencia simple y 100.000 filas amplifican diferencias pequeñas. El diagnóstico se basa también en forma, cuantiles y magnitud, no solo en p<0,05. Los conteos de pistas/quiebres son discretos; su falta de normalidad es esperable. J48, redes y regresión logística no requieren predictores gaussianos; rechazar normalidad no obliga a eliminar filas ni a transformar todas las variables.

### Correlaciones y separación de mecanismos

[INSERTAR GRÁFICA DE WEKA: Latencia y ayuda; X=tiempo_decision_critica_seg; Y=frecuencia_consulta_pistas; Color=clase_perfil_aprendiz]

[INSERTAR GRÁFICA DE WEKA: Riesgo operativo; X=frecuencia_consulta_pistas; Y=quiebres_stock_generados; Color=clase_perfil_aprendiz]

\[
r_{XY}=\frac{\sum_i(x_i-\bar x)(y_i-\bar y)}{\sqrt{\sum_i(x_i-\bar x)^2\sum_i(y_i-\bar y)^2}},\qquad
\rho_s=r_{R(X),R(Y)}.
\]

Spearman usa rangos medios para empates; la fórmula simplificada sin empates no corresponde a los conteos de este dataset. Python calcula ambos coeficientes y p-valores con eliminación por pares, conservando el tamaño efectivo de cada par. Se calculan resultados globales y por clase para distinguir asociación inducida por mezcla de perfiles de asociación dentro de cada perfil. No se codifican las clases como 0/1/2 para correlacionarlas: no tienen escala ordinal. Tampoco se correlacionan identificadores. **[COMPLETAR: r y rho por pares centrales desde correlaciones.csv, clase y etapa indicadas]**.

## Fase 3. Preparación y trazabilidad de datos

### Pipeline efectivamente observado

La relación del entrenamiento conserva esta secuencia, con nombres y opciones:

```text
weka.filters.unsupervised.attribute.ReplaceMissingValues
weka.filters.unsupervised.instance.RemoveDuplicates
weka.filters.unsupervised.attribute.InterquartileRange -R first-last -O 3.0 -E 6.0
weka.filters.unsupervised.instance.Resample -S 1 -Z 80.0 -no-replacement
```

La relación del test agrega después otro `weka.filters.unsupervised.instance.Resample -S 1 -Z 20.0 -no-replacement`. La cabecera es una pista de procedencia, no un registro inmutable de ejecución; por eso se verificaron filas y banderas.

`ReplaceMissingValues` imputa media en numéricos y moda en nominales; no elimina 3.334 sesiones ni sanea una cadena `ERROR_TIPO`. `RemoveDuplicates` elimina 3.333 copias excedentes, dejando 96.667 filas. `InterquartileRange` agrega `Outlier` y `ExtremeValue`: **no elimina las filas señaladas**. `puntaje_evaluacion_teorica` figura como `string` en ambos ARFF y no participa en IQR. En el reporte J48 se observa otro flujo: `StringToNominal -R 5`; convertir los puntajes a categorías no corrige −15, 150 o `ERROR_TIPO`.

La reconstrucción Python de imputación, deduplicación y límites produce **cero discrepancias** en `Outlier` y `ExtremeValue` para las 77.333 filas de train y las 15.466 de test. Esto respalda el comportamiento de las banderas, no una eliminación de 20.000 filas ni la procedencia del modelo serializado.

### IQR exacto y protección de perfiles legítimos

[INSERTAR GRÁFICA DE WEKA: Señalamiento IQR de latencia; X=tiempo_decision_critica_seg; Y=frecuencia_consulta_pistas; Color=ExtremeValue]

Repetir el panel con Color=`clase_perfil_aprendiz` para mostrar si se marcaron sesiones de bloqueo legítimas. Para \(OF=3\), \(EVF=6\):

\[
L_O=Q_1-3IQR,\ U_O=Q_3+3IQR,\quad L_E=Q_1-6IQR,\ U_E=Q_3+6IQR.
\]
\[
O(x)=\mathbb1\{L_E\le x<L_O\ \lor\ U_O<x\le U_E\},\quad
E(x)=\mathbb1\{x<L_E\ \lor\ x>U_E\}.
\]

La fila recibe cada bandera si al menos un atributo numérico cumple su condición. Sin `-E-as-O`, un extremo no se marca automáticamente como outlier para ese atributo; una fila puede recibir ambas banderas por atributos diferentes. Filtrar solo `Outlier=yes` deja extremos. El factor habitual 1,5 de un boxplot **no es** el configurado aquí. Esta semántica corresponde al [filtro oficial InterquartileRange](https://weka.sourceforge.io/doc.dev/weka/filters/unsupervised/attribute/InterquartileRange.html).

La auditoría replica los índices de cuartiles de `computeThresholds` y exporta además los cuantiles lineales de NumPy para evidenciar diferencias. En el estado reconstruido previo a IQR: latencia \(Q_1=29,85\), \(Q_3=164,58\), \(IQR=134,73\); límite superior de outlier 568,77 s y de extremo 972,96 s. Se marcan 917 outliers y 3.385 extremos en latencia. Pistas tiene límites superiores 12 y 21, con 112 outliers y cero extremos. Costos tiene límites inferiores 5.523,80 y 4.173,20, y 3.333 extremos. Conteos por atributo se solapan y **no se suman como filas únicas**.

El generador permite latencias legítimas hasta 1.200 s. Eliminar todas las colas IQR puede excluir precisamente bloqueo cognitivo; no es correcto forzar 10.000 eliminaciones mediante un factor estadístico elegido a posteriori. Las reglas del generador permiten identificar las inyecciones exactas: 9.999 s, costo −1.000.000 y variación 5.000%; estos límites son específicos del experimento sintético. El archivo de auditoría se usa solo para verificar detección y falsos positivos.

### Conciliación de limpieza y partición

[INSERTAR GRÁFICA DE WEKA: Contaminación retenida; X=tiempo_decision_critica_seg; Y=costo_operativo_resultante; Color=ExtremeValue]

El entrenamiento contiene 7.992 outliers inyectados, 2.654 filas originalmente nulas ahora imputadas y 2.692 errores de formato/rango. El test contiene 1.670, 505 y 559, respectivamente. Son categorías de origen, no necesariamente defectos aún presentes después de imputación. El archivo `anomalias_retenidas.csv` documenta esta conciliación.

La partición actual tiene \(|T|=77.333\), \(|V|=15.466\), \(|T\cap V|=15.466\). Todo el test está en train; su fracción sobre la suma es 16,6661%, y la suma cuenta sesiones dos veces. Se comparten 4.839 usuarios. **No es un holdout válido** aunque los archivos se llamen 80 y 20.

Para cumplir estrictamente el protocolo sobre 80.000 registros válidos:

1. Conservar los originales y generar una versión nueva con manifiesto de filas descartadas. Decidir explícitamente si se eliminan las filas nulas o se imputan: imputarlas produce otra población y no equivale a eliminar las 20.000 anomalías.
2. Para la población de referencia de este informe, excluir los 10.000 extremos inyectados mediante reglas de dominio, las 3.334 filas ausentes y los 3.333 errores, y conservar una copia de cada duplicado: quedan 80.000. Convertir el puntaje válido a numérico. No usar la etiqueta pedagógica para seleccionar qué filas conservar.
3. Los filtros de Weka para eliminación incluyen `weka.filters.unsupervised.instance.RemoveWithValues` (atributo y valor documentados) y `weka.filters.unsupervised.instance.SubsetByExpression` (si el paquete correspondiente está instalado). No se atribuye su ejecución a los archivos actuales. Para retirar variables usar `weka.filters.unsupervised.attribute.Remove`; para recodificar categorías, `weka.filters.unsupervised.attribute.NominalToBinary`. Registrar las opciones reales, índices y tipos después de cada transformación.
4. Aplicar `Resample` al **mismo archivo limpio y en el mismo orden** en dos ejecuciones independientes, con `randomSeed=1`, `sampleSizePercent=80`, `noReplacement=True`. Para train: `invertSelection=False`; para test: `invertSelection=True`. El complemento se obtiene con `-V`, no aplicando 20% al train:

```powershell
java -cp "C:/Program Files/Weka-3-8-7/weka.jar" weka.filters.unsupervised.instance.Resample -i stock_quest_clean.arff -o train_80_corregido.arff -S 1 -Z 80 -no-replacement
java -cp "C:/Program Files/Weka-3-8-7/weka.jar" weka.filters.unsupervised.instance.Resample -i stock_quest_clean.arff -o test_20_corregido.arff -S 1 -Z 80 -no-replacement -V
```

Estos comandos son el protocolo pendiente, no fueron ejecutados sobre un archivo inexistente. La semilla 1 es de Weka; no confundirla con 42 del generador. NumPy con semilla 1 no reproduce necesariamente la selección Java. Ver [Resample oficial](https://weka.sourceforge.io/doc.stable/weka/filters/unsupervised/instance/Resample.html).

5. Exigir \(|T|=64.000\), \(|V|=16.000\), \(T\cap V=\varnothing\), \(T\cup V=D_{limpio}\), mismo esquema y misma clase. El muestreo no supervisado no garantiza exactamente 80/20 dentro de cada clase: reportar su distribución.
6. Una partición disjunta por sesión aún puede compartir usuarios. Para generalización a usuarios nuevos, separar por `user_id`; para futuro de usuarios existentes, separar por tiempo. Ese diseño es distinto a `Resample` por filas y se debe informar por separado, sin prometer simultáneamente aislamiento de usuarios y cardinalidad exacta sin comprobar ambos.

La imputación, normalización y umbrales aprendidos para un pipeline desplegable deben ajustarse en train y aplicarse congelados en test. En validación cruzada, ajustarlos dentro de cada fold mediante `weka.classifiers.meta.FilteredClassifier`. La limpieza global observada introduce información de la distribución de prueba y limita las conclusiones. Las reglas fijas del generador se distinguen de parámetros estimados con toda la muestra.

## Fase 4. Modelado

### Preparación común y registro de experimentos

Seleccionar explícitamente `clase_perfil_aprendiz` como clase: en los ARFF actuales **no es la última columna**, pues siguen las banderas IQR. Excluir `user_id`, `simulacion_id`, `Outlier`, `ExtremeValue` y cualquier dato de auditoría del vector predictor. Corregir el puntaje string antes de modelos que no lo admiten. Guardar versión de Weka, opciones completas, semillas, esquema, hash de entradas y salidas. Ajustar hiperparámetros exclusivamente dentro de train; usar el test corregido como “Supplied test set”.

Solo se encontró una ejecución documentada de J48; Logistic, MultilayerPerceptron y SimpleKMeans son modelos propuestos cuya formulación se presenta a continuación. **[COMPLETAR: logs y parámetros efectivamente ejecutados de cada modelo]**. No se les asignan resultados inexistentes.

### J48: fronteras interpretables mediante particiones

[INSERTAR GRÁFICA DE WEKA: Árbol J48; X=no aplica; Y=no aplica; Visualize tree del modelo entrenado]

El árbol no es una dispersión con ejes seleccionables. Se lee desde raíz a hojas; cada camino define una conjunción de restricciones. Para nodo \(S\), proporciones \(p_c\) y partición \(S_v\):

\[
H(S)=-\sum_{c=1}^{3}p_c\log_2p_c,\qquad
IG(S,A)=H(S)-\sum_v\frac{|S_v|}{|S|}H(S_v),
\]
\[
SI(S,A)=-\sum_v\frac{|S_v|}{|S|}\log_2\frac{|S_v|}{|S|},\qquad GR(S,A)=\frac{IG(S,A)}{SI(S,A)}.
\]

J48 implementa C4.5: no se limita a maximizar ganancia de información bruta; usa gain ratio, restricciones de ganancia y tratamiento de cortes numéricos, además de poda. Para latencia, un corte \(t\) crea \(x_j\le t\) y \(x_j>t\); pistas y quiebres pueden refinar regiones. Ver [C45Split](https://weka.sourceforge.io/doc.stable-3-8/weka/classifiers/trees/j48/C45Split.html).

El log existente usa `weka.classifiers.trees.J48 -C 0.25 -M 2`: factor de confianza de poda 0,25 y mínimo 2 instancias por hoja. Tiene 167 hojas, 323 nodos y raíz `tiempo_decision_critica_seg <= 28.96`. Ese corte pertenece al modelo ajustado sobre todo el original; no es una frontera validada sobre el test corregido. Revisar caminos completos: poca latencia aislada no basta para afirmar exceso de confianza. En las hojas, `(n/e)` resume peso de entrenamiento y errores estimados en esa hoja, no recall de prueba ni intervalo de confianza.

### Regresión logística multinomial: probabilidades y fronteras lineales

[INSERTAR GRÁFICA DE WEKA: Errores de Logistic en el espacio pedagógico; X=tiempo_decision_critica_seg; Y=frecuencia_consulta_pistas; Color=clase_perfil_aprendiz; Visualize classifier errors]

Con \(z_c=\beta_{c0}+\boldsymbol\beta_c^T\mathbf x\), la generalización multinomial es:

\[
P(Y=c\mid x)=\frac{e^{z_c}}{\sum_{k=1}^{3}e^{z_k}},\qquad
\log\frac{P(B\mid x)}{P(E\mid x)}=(\beta_{B0}-\beta_{E0})+(\boldsymbol\beta_B-\boldsymbol\beta_E)^Tx.
\]

La frontera B/E satisface log-odds cero. Coeficientes positivos de latencia/pistas en ese contraste serían consistentes con bloqueo, pero su signo y magnitud se verifican en el modelo y dependen de escala y covariables. En binario, \(P(B\mid x)=\sigma(z)=1/(1+e^{-z})\). `weka.classifiers.functions.Logistic` usa una clase de referencia y \(K-1\) vectores, con penalización ridge:

\[
\mathcal L=-\sum_i\sum_c y_{ic}\log p_{ic}+\lambda\sum_{c,j}\beta_{cj}^{2}.
\]

La forma de referencia es equivalente a softmax con logits de referencia cero. Eliminar identificadores y validar escalas antes de interpretar coeficientes. Registrar ridge y convergencia reales. Una nube de errores no dibuja automáticamente la frontera de alta dimensión; para una superficie de probabilidad se necesita una malla externa fijando las demás variables. [Documentación Logistic](https://weka.sourceforge.io/doc.stable/weka/classifiers/functions/Logistic.html).

### Red neuronal: interacciones no lineales

[INSERTAR GRÁFICA DE WEKA: Errores de MultilayerPerceptron; X=tiempo_decision_critica_seg; Y=quiebres_stock_generados; Color=clase_perfil_aprendiz; Visualize classifier errors]

\[
h_j=\sigma\left(b_j+\sum_m w_{jm}x_m\right),\quad
o_c=\sigma\left(a_c+\sum_j v_{cj}h_j\right),\quad \sigma(u)=\frac1{1+e^{-u}}.
\]

Las composiciones permiten que la evidencia de baja latencia dependa simultáneamente de pistas, riesgo y errores. `weka.classifiers.functions.MultilayerPerceptron` clásico utiliza unidades sigmoides para clase nominal; **no se debe afirmar que su salida implementa softmax**. Sus salidas nominales se normalizan para producir la distribución de clases; softmax es la formulación multinomial anterior y una alternativa arquitectónica, no un ajuste observado de esta red. Registrar capas, learning rate, momentum, épocas, semilla y validación interna. Ver [MultilayerPerceptron](https://weka.sourceforge.io/doc.stable/weka/classifiers/functions/MultilayerPerceptron.html).

Para escalar puede usarse `weka.filters.unsupervised.attribute.Standardize`, \(z_j=(x_j-\mu_{j,T})/s_{j,T}\), o `weka.filters.unsupervised.attribute.Normalize`, \(z_j=(x_j-\min_Tx_j)/(\max_Tx_j-\min_Tx_j)\). Son alternativas propuestas; no aparecen en la cadena guardada. Documentar normalización interna del clasificador para evitar duplicarla y tratar constantes sin dividir por cero.

### K-Means: estructura no supervisada

[INSERTAR GRÁFICA DE WEKA: Dispersión de clústeres SimpleKMeans; X=tiempo_decision_critica_seg; Y=frecuencia_consulta_pistas; Color=Cluster; Visualize cluster assignments]

[INSERTAR GRÁFICA DE WEKA: Validación operativa de clústeres; X=tiempo_decision_critica_seg; Y=quiebres_stock_generados; Color=Cluster]

\[
d(x,\mu_k)=\sqrt{\sum_{j=1}^p(z_j-\mu_{kj})^2},\quad
J=\sum_i\min_k\|z_i-\mu_k\|_2^2,\quad
\mu_k=\frac1{|C_k|}\sum_{i\in C_k}z_i.
\]

La frontera entre dos centroides satisface \(2(\mu_E-\mu_B)^Tz=\|\mu_E\|^2-\|\mu_B\|^2\). Son regiones de Voronoi, no fronteras supervisadas de perfiles. Usar `weka.clusterers.SimpleKMeans`, proponer `numClusters=3` como hipótesis inicial y registrar semilla, iteraciones, inicialización y distancia. Evaluar otras K solo con train y estabilidad; tres etiquetas no garantizan tres grupos naturales.

Con `weka.core.EuclideanDistance` revisar la normalización por rangos interna; `-D` la desactiva. Para esta formulación, usar variables numéricas escaladas y categorías codificadas explícitamente o excluidas. En datos nominales nativos Weka usa discrepancias categóricas y modos para centroides; no corresponde interpretar todo como medias euclidianas continuas. La clase y los IDs deben excluirse de la distancia. Usar “Classes to clusters evaluation” solo para contrastar posteriormente con etiquetas. El cluster 0/1/2 no tiene significado pedagógico fijo: asignarlo por sus centroides y composición, sin usar test para optimizar la correspondencia. [SimpleKMeans](https://weka.sourceforge.io/doc.stable-3-8/weka/clusterers/SimpleKMeans.html).

## Fase 5. Evaluación

### Resultados existentes y alcance real

[INSERTAR GRÁFICA DE WEKA: Matriz de confusión visual del J48 original; X=clase predicha; Y=clase real; representación externa de la matriz de Weka]

Weka imprime esta matriz en texto; el mapa de calor se genera externamente, sin atribuirlo al selector de ejes estándar. Filas/columnas en orden Apto, Bloqueo, Exceso:

\[
C=\begin{pmatrix}49480&247&52\\233&25008&7\\78&9&24886\end{pmatrix}.
\]

El reporte corresponde a **validación cruzada estratificada de 10 folds sobre 100.000 filas**, con exactitud 99,374%, Kappa impreso 0,99, MAE 0,0061 y RMSE 0,0626. Kappa recalculado desde la matriz es 0,9900010172. ROC Area reportada es 0,997 para Apto, 0,997 para bloqueo y 0,999 para exceso; promedio ponderado 0,997. No son resultados de `test_20.arff` ni una comparación antes/después de limpieza.

Se confunden 7 sesiones de bloqueo con exceso y 9 de exceso con bloqueo. Sin embargo, 233 bloqueos y 78 excesos son clasificados como Apto: estos falsos negativos también son críticos para el apoyo educativo. Los duplicados y sesiones del mismo usuario pueden atravesar folds; además, los predictores contienen mecanismos usados por el generador de etiquetas. La elevada exactitud describe este experimento, no garantiza rendimiento con alumnos nuevos.

### Métricas y errores educativos

Para cada clase tratada como positiva frente al resto:

\[
Precision_c=\frac{TP_c}{TP_c+FP_c},\quad Recall_c=\frac{TP_c}{TP_c+FN_c},\quad
F1_c=\frac{2Precision_cRecall_c}{Precision_c+Recall_c}.
\]
\[
\kappa=\frac{p_o-p_e}{1-p_e},\quad p_o=\frac{\sum_c C_{cc}}N,\quad
p_e=\sum_c\frac{C_{c+}C_{+c}}{N^2}.
\]

Reportar soporte, Precision, Recall, F-Measure y ROC Area de las tres clases, macro-F1 y promedio ponderado; estos promedios no sustituyen el examen B/E. Kappa mide acuerdo corregido por el esperado a partir de marginales, no confiabilidad causal ni porcentaje de mejora.

En clasificación nominal no ponderada de K=3 clases:

\[
MAE=\frac1{NK}\sum_{i,c}|p_{ic}-y_{ic}|,\qquad
RMSE=\sqrt{\frac1{NK}\sum_{i,c}(p_{ic}-y_{ic})^2}.
\]

Se calculan sobre probabilidades y etiquetas one-hot, no sobre códigos 0/1/2. RMSE penaliza más errores confiados; un exceso clasificado como Apto con alta probabilidad es especialmente relevante. La matriz de confusión no permite recuperar MAE, RMSE ni AUC: se necesitan las distribuciones predichas o el reporte original. [Evaluation de Weka](https://weka.sourceforge.io/doc.dev/weka/classifiers/Evaluation.html).

### ROC y selección de umbrales

[INSERTAR GRÁFICA DE WEKA: ROC de Bloqueo_Cognitivo; X=False Positive Rate; Y=True Positive Rate; Visualize threshold curve]

[INSERTAR GRÁFICA DE WEKA: ROC de Exceso_Confianza; X=False Positive Rate; Y=True Positive Rate; Visualize threshold curve]

En Classify, botón derecho sobre el resultado → Visualize threshold curve → seleccionar clase. Cada curva es uno-contra-resto:

\[
TPR_c(t)=\frac{TP_c(t)}{TP_c(t)+FN_c(t)},\quad FPR_c(t)=\frac{FP_c(t)}{FP_c(t)+TN_c(t)},\quad
AUC_c=\int_0^1 TPR_c(u)\,du.
\]

La cercanía a la esquina superior izquierda indica mayor discriminación. AUC no es exactitud, calibración ni recall a un umbral operativo; la diagonal representa ordenamiento aleatorio. Seleccionar umbrales con validación dentro de train y costos de intervención, congelarlos y evaluar test una vez. Añadir curvas precision-recall cuando cambien las prevalencias. Una ROC B contra el resto puede ocultar confusión B/E: acompañar con los conteos cruzados y, si se calcula una ROC restringida a B/E, identificarla como un análisis distinto.

### Distribución espacial de errores

[INSERTAR GRÁFICA DE WEKA: Errores de clasificación por latencia y ayuda; X=tiempo_decision_critica_seg; Y=frecuencia_consulta_pistas; Color=clase_perfil_aprendiz; Visualize classifier errors]

Interpretar las marcas de acierto/error usando la leyenda de la versión instalada y abrir puntos para comprobar clase real/predicha. Repetir con Y=`quiebres_stock_generados`. Los errores cerca del solapamiento sugieren ambigüedad conductual; errores aislados sobre valores imposibles sugieren problemas de preparación. Ninguna proyección de dos atributos demuestra por sí sola la frontera completa. **[COMPLETAR: regiones, número de errores y ejemplos anonimizados del test corregido]**.

### ¿La limpieza mejoró el modelo?

[INSERTAR GRÁFICA DE WEKA: Comparación ROC de pipelines sobre el mismo test independiente; X=False Positive Rate; Y=True Positive Rate; paneles por Bloqueo_Cognitivo y Exceso_Confianza]

**Estado actual: no demostrado.** Comparar la CV original de 100.000 con un holdout de otra población no estima el efecto de limpieza. Diseñar pares de pipelines con el mismo test limpio congelado y las mismas sesiones/usuarios reservados antes de preparar datos. El baseline requiere saneamiento mínimo de tipos para ser entrenable; documentarlo. Aplicar solo al entrenamiento las variantes de tratamiento de contaminación y usar igual presupuesto de ajuste. Nunca introducir duplicados del test en ninguna variante de train.

Calcular \(\Delta F1_c=F1_{c,limpio}-F1_{c,base}\), \(\Delta AUC_c\), \(\Delta\kappa\) y reducción de RMSE sobre las mismas filas. Estimar incertidumbre con bootstrap pareado por usuario; para desacuerdo binario acierto/error puede utilizarse McNemar, declarando la dependencia de sesiones. Reportar también pérdida de recall de bloqueo por eliminación agresiva de colas. Si no mejora, debe informarse; no ajustar limpieza para conseguir una conclusión prefijada.

**[COMPLETAR: hashes del test común, métricas por modelo/pipeline, intervalos, cambios de B→E, E→B, B→A y E→A]**. Los resultados de Logistic, red y K-Means continúan pendientes; SSE de clustering no es comparable numéricamente con exactitud supervisada.

## Fase 6. Despliegue, seguimiento y cierre

### Uso educativo controlado

[INSERTAR GRÁFICA DE WEKA: Seguimiento por lote de sesiones; X=tiempo_decision_critica_seg; Y=frecuencia_consulta_pistas; Color=clase predicha en ARFF de seguimiento]

No existe todavía ese ARFF de seguimiento: crearlo con predicciones del pipeline congelado y mantener aparte los identificadores operativos. Comparar con la distribución de referencia, registrando cambios de escala, frecuencia de consultas, prevalencia predicha y errores confirmados por docentes. Para evolución temporal usar un panel externo con X=fecha/lote, Y=recall por perfil cuando existan etiquetas verificadas; no confundir prevalencia predicha con calidad.

Ante alta probabilidad de bloqueo, proponer explicación paso a paso y revisar si la ayuda reduce latencia sin aumentar errores. Ante exceso de confianza, solicitar justificación y comprobación de inventario antes de confirmar. `Apto` permite continuar con retroalimentación habitual. Los casos ambiguos se derivan a revisión; una clasificación no determina sanciones ni calificaciones automáticamente.

El paquete de despliegue debe contener esquema de entrada y momento de disponibilidad, filtros entrenados, modelo serializado, versión Java/Weka, semillas, hashes, matriz de costos, umbrales, resultados independientes y procedimiento de reversión. Registrar calidad de datos, drift, calibración y feedback humano. La efectividad pedagógica requiere una evaluación de intervención separada del desempeño predictivo.

### Criterios de cierre y verificación

- Se cubren las seis fases CRISP-DM y cada visualización se vincula a bloqueo, exceso de confianza o calidad que afecta su discriminación.
- La inyección de 20.000 anomalías queda comprobada; su eliminación en Weka no queda acreditada. La referencia matemática contiene 80.000 filas válidas por las reglas del generador.
- La partición suministrada **no cumple** independencia ni 80/20; el protocolo correcto exige 64.000/16.000 y complemento de una única selección, con comprobación de cobertura y disjunción.
- El único rendimiento observado es J48 con CV de 10 folds sobre el original. Las métricas de prueba corregida y la mejora por limpieza quedan delimitadas como pendientes, no rellenadas con estimaciones.
- La salida de auditoría verifica estadísticos, normalidad, correlaciones, cuartiles Weka, anomalías, retención y solapamiento. Los gráficos de referencia en Python se identifican como tales, sin presentarlos como capturas de Weka.

**Conclusión técnica:** los datos sintéticos permiten demostrar los mecanismos conductuales buscados y reproducir las banderas IQR. Los artefactos actuales no permiten sostener una mejora en generalización por limpieza. Corregir preparación y partición, evaluar los modelos sobre el mismo test independiente y validar con evidencia educativa externa son condiciones para cerrar el informe como experimento predictivo, en lugar de una auditoría con protocolo pendiente.

## Anexo. Navegación de los resultados de auditoría

`resumen.json`: integridad, versiones, partición y banderas; `descriptivos.csv`: estadísticos por etapa y clase; `normalidad.csv`: pruebas y tamaños efectivos; `correlaciones.csv`: Pearson/Spearman globales y por clase; `umbrales_iqr_weka.csv`: cuartiles exactos Weka y comparación con cuantiles lineales; `imputacion.csv`: valores de reemplazo; `anomalias_por_fila.csv`: reglas observables; `inyeccion_vs_reglas.csv`: contraste con auditoría externa; `anomalias_retenidas.csv`: origen de contaminación en particiones; `distribucion_clases.csv`: proporciones; `j48_cv_*`: métricas recalculadas de la matriz publicada; `perfiles_referencia.png`: apoyo visual externo.

Los cuartiles Weka siguen el [código de InterquartileRange](https://github.com/Waikato/weka-3.8/blob/master/weka/src/main/java/weka/filters/unsupervised/attribute/InterquartileRange.java); no deben sustituirse por la interpolación por defecto de pandas al justificar igualdad exacta. Los enlaces de implementación respaldan la semántica de los algoritmos; las cifras del experimento proceden de los archivos locales y del script, no de esas páginas.
