# Historial temporal de Stock Quest para pronosticar demanda y reposición

## Alcance

Dataset nuevo, **sintético y limpio**, independiente del ejercicio anterior de datos sucios. Tiene **100.000 registros, 15 campos, 100 productos y dos almacenes (norte/sur)**. Cada una de las 200 series tiene 500 días consecutivos, del **12 de julio de 2025 al 23 de noviembre de 2026**. No proviene de las bases de Stock Quest.

Incluye diferencias entre productos y almacenes, patrón semanal, variación anual, tendencia, promociones planificadas, precios y ruido temporalmente correlacionado. La continuidad temporal no se obtiene reordenando el archivo anterior: se generó un proceso nuevo.

Parámetros acordados: plazo de entrega **tres días**, revisión **diaria al cierre**, objetivo **95 % de ciclos sin agotamiento** y cobertura de reposición de cuatro días. La demanda no atendida se pierde; no hay pedidos atrasados de clientes.

No se introdujeron faltantes, duplicados ni outliers artificiales: eliminar días extremos con IQR en una serie de ventas puede destruir señales de demanda. El dataset contaminado anterior sigue disponible para practicar limpieza, sin modificaciones.

## Archivos principales

| Archivo / carpeta | Contenido |
|---|---|
| `historial_100000_15.csv` y `.arff` | Historial diario completo de 15 campos |
| `weka/h1/` | Pronóstico a un día: entrenamiento, validación, prueba y filas nuevas |
| `weka/h2/`, `h3/`, `h4/` | Lo mismo para los otros tres días de cobertura |
| `diccionario_historial.csv` / `diccionario_weka.csv` | Orden y tipos de los campos |
| `catalogo_productos.csv` | Productos, categorías y precio de referencia |
| `auditoria_reposicion.csv` | Pronósticos baseline, seguridad y decisiones históricas |
| `estado_para_reponer.csv` | Estado de 200 series antes de sustituir la última decisión baseline |
| `contexto_prediccion.csv` | Correspondencia entre filas WEKA, producto, almacén, origen y fecha objetivo |
| `control_historial.json` | Semilla, fechas, particiones, parámetros y métricas de referencia |
| `validacion_historial.json` | Comprobaciones independientes del conjunto generado |

El historial y cada dataset de modelado tienen 15 campos, pero **son estructuras diferentes**: el primero registra operaciones y los segundos transforman el historial en ejemplos supervisados. Los archivos de auditoría/control pueden tener otras estructuras y no se añaden como predictores.

## Los 15 campos históricos

1. `fecha`: fecha de operación.
2. `producto`: P001 a P100.
3. `almacen`: norte/sur.
4. `categoria`: alimentos, aseo, papeleria, tecnologia.
5. `precio_unitario`: unidades monetarias ficticias.
6. `promocion`: no/si, definida en un calendario conocido.
7. `stock_inicial`: stock antes de las recepciones del día.
8. `unidades_recibidas`: pedidos que llegan al empezar el día.
9. `demanda`: unidades solicitadas, incluida la demanda no satisfecha.
10. `unidades_vendidas`: mínimo entre disponibilidad y demanda.
11. `stock_final`: stock_inicial + unidades_recibidas − unidades_vendidas.
12. `unidades_pedidas`: decisión al cierre del día.
13. `pedidos_en_transito`: total pendiente después de emitir ese pedido.
14. `plazo_entrega_dias`: tres.
15. `agotamiento`: si hubo demanda no atendida. Vender exactamente todo sin demanda pendiente no cuenta como faltante.

El stock inicial de mañana coincide con el stock final de hoy. El pedido del cierre del día t se recibe al inicio del día t+3. Las primeras recepciones son cero, porque la simulación parte sin pedidos anteriores; el stock inicial cubre el calentamiento. Los pedidos de los últimos días siguen pendientes al corte.

## Preparación supervisada sin información futura

Los archivos WEKA contienen producto, almacén, día de semana objetivo, índice temporal objetivo, seno/coseno anual objetivo, precio y promoción objetivo planificados, demanda de hoy/ayer/hace siete días, medias de siete/28 días, tendencia semanal y **`demanda_objetivo` como campo 15**.

Los valores calendario y los precios/promociones futuros son conocidos porque el escenario supone un calendario comercial anunciado de antemano. No se incluyen demanda futura, stock futuro real, ventas futuras ni pedidos futuros como predictores. La demanda histórica es observable en esta simulación; si en la aplicación real solo se registran ventas, habrá que estimar o registrar ventas perdidas.

Un ejemplo del archivo h3 representa: información conocida al cierre de t → demanda observada en t+3. Los lags se calculan dentro de cada producto/almacén, nunca sobre otra serie.

La división se realiza por **fecha del objetivo**, con las mismas fronteras para los cuatro horizontes:

- Entrenamiento: objetivos hasta el día 350 del historial. Se omiten los días iniciales sin una ventana completa de lags.
- Validación: siguientes 75 días, para elegir configuración y calibrar el modelo.
- Prueba: últimos 75 días, reservados para la evaluación final.
- `predecir`: 200 filas por horizonte, con respuesta `?`, emitidas al corte del 23/11/2026 para 24, 25, 26 y 27/11/2026.

Las fechas futuras corresponden al corte de este dataset didáctico. No son observaciones reales ni resultados ya predichos.

El test simula pronósticos emitidos diariamente con los datos que ya se habrían observado a cada cierre. Para h2–h4 el último ejemplo de entrenamiento se origina antes de la frontera, para que su objetivo permanezca en entrenamiento. No usar una división aleatoria 80/20 ni validación cruzada aleatoria como evidencia de rendimiento temporal.

## Primer pronóstico en WEKA

1. Abre **Explorer → Preprocess → Open file** y carga `weka/h1/entrenamiento.arff`.
2. Comprueba 15 atributos y selecciona **Class = demanda_objetivo**. Es una variable numérica: corresponde a regresión.
3. En **Classify → Choose → trees → REPTree**, usa por ejemplo `minNum = 20`, `maxDepth = 12`, `seed = 1`. Es una configuración inicial, no una ya validada.
4. En **Test options → Supplied test set → Set**, selecciona `weka/h1/validacion.arff` y ejecuta Start.
5. Examina MAE/RMSE y compara con el baseline indicado en control_historial.json. Ajusta usando solo validación.
6. Una vez fijado el modelo, cambia el supplied test set a `weka/h1/prueba.arff` y ejecuta la evaluación final. No elijas parámetros mirando repetidamente ese test.
7. Para obtener estimaciones nuevas, carga `weka/h1/predecir.arff` como supplied test set y activa la salida de predicciones en More options / Output predictions (PlainText o CSV según versión). Las clases reales figuran como `?`: WEKA puede predecir, pero no calcular un error contra valores que no conocemos.
8. Repite el procedimiento con h2, h3 y h4: cada carpeta conserva el mismo esquema pero tiene su propio horizonte y modelo. Usa contexto_prediccion.csv para relacionar cada fila con su serie/fecha.

No se ha entrenado aquí un modelo WEKA ni ejecutado su interfaz. Se entregan datos y particiones para hacerlo. El baseline calculado es un naive semanal con un ajuste de promoción definido como supuesto de gestión, no un resultado de REPTree. Para horizontes hasta cuatro días toma el mismo día de la semana anterior; por eso sus métricas de prueba coinciden entre horizontes.

## Convertir pronósticos en ventas y pedidos

Para cada producto y almacén, combina las cuatro predicciones nuevas. Usa estado_para_reponer.csv, que muestra el estado al cierre **antes del último pedido baseline**, para sustituir esa decisión en una simulación. El pedido baseline original se documenta por separado y no está incluido en las recepciones pendientes de ese estado.

```text
ventas_estimadas_manana = min(pronostico_h1, stock_final + recepcion_programada_h1)
inventario_objetivo = pronostico_h1 + h2 + h3 + h4 + stock_seguridad
pedido_recomendado = ceil(max(0, inventario_objetivo - stock_final - pedidos_pendientes))
```

Trunca cualquier pronóstico negativo a cero. Las unidades solicitadas se redondean hacia arriba al hacer el pedido. El nuevo pedido llega en h3 y no cambia las ventas posibles de mañana. La regla no considera lotes mínimos, capacidad, caducidad o compras por volumen: se incorporarían como restricciones adicionales.

**Seguridad y 95 %:** la política histórica utiliza errores baseline de cuatro días ya completamente observados (hasta 60 orígenes recientes). Toma el percentil 95 del máximo error acumulado positivo dentro de los cuatro días. Durante el calentamiento usa una aproximación conservadora basada en variabilidad pasada. No usa errores futuros.

Ese stock de seguridad pertenece al baseline: al cambiar a WEKA debe **recalibrarse con errores de validación del nuevo modelo**, conservando juntos los cuatro horizontes de cada origen. El 95 % es un objetivo, no un 5 % fijo de inventario ni una exactitud del pronóstico. Para evaluar ciclos, se mide cada intervalo completo entre recepciones positivas y se omite el último ciclo censurado; también se informa la métrica diaria por separado.

Un servicio simulado superior al 95 % no acredita eficiencia de inventario: la política puede ser demasiado conservadora. Evaluar también stock medio, unidades perdidas y costos antes de optimizar. No se certifica un 95 % para producción ni para cada serie individual.

## Reproducibilidad y límites

`generar_historial.py` usa Python estándar con semilla fija 20261124. Para reproducir, copia el generador a otra carpeta y ejecútalo allí; escribe junto a su propio archivo. No consulta ni modifica bases de datos, Jenkins o GitHub. No uses el importador del dataset anterior: las columnas de este historial son diferentes.

Los datos incluyen patrones deliberados y no constituyen evidencia de demanda real. El calendario de promociones no cambia por decisiones del modelo; no se simulan proveedores con retrasos aleatorios ni cambios de plazo. El comportamiento real necesita validación con datos operativos.

Fuentes metodológicas: [evaluación temporal y baselines](https://otexts.com/fpp3/toolbox.html), [WEKA REPTree](https://weka.sourceforge.io/doc.stable/weka/classifiers/trees/REPTree.html).

## Verificación realizada

El validador independiente comprobó las 100.000 claves producto/almacén/fecha, continuidad diaria, ecuaciones de stock, recepción a tres días, conservación de pedidos pendientes, lags/medias dentro de cada serie, fronteras de fecha, respuestas desconocidas en predicción y SHA-256. WEKA 3.8.6 leyó los 17 archivos ARFF, todos de 15 atributos; los objetivos de los archivos de pronóstico son numéricos. Esto valida los archivos y no significa que se haya entrenado o evaluado REPTree.
