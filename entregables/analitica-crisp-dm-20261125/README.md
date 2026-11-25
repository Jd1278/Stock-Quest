# Minería de datos Stock-Quest · 25/11/2026

Se entrenaron y evaluaron modelos **WEKA 3.8.6** sobre datos sintéticos. Esta carpeta contiene el laboratorio reproducible, resultados, visualizaciones y guía completa. La aplicación y sus bases no fueron modificadas.

## Resultado principal

RandomForest fue elegido por MAE de validación para los cuatro horizontes. En prueba temporal:

| Horizonte | MAE RandomForest | RMSE RandomForest | MAE naive semanal |
|---|---:|---:|---:|
| 1 día | 3,129 | 4,125 | 4,409 |
| 2 días | 3,304 | 4,336 | 4,409 |
| 3 días | 3,375 | 4,459 | 4,409 |
| 4 días | 3,498 | 4,587 | 4,409 |

La mejora de MAE a un día es 29,03%; IC95% aproximado del MAE: [3,000; 3,284] mediante bootstrap de bloques de siete fechas. El sesgo de −0,959 unidades indica sobreestimación media, relevante para inventario. El MAE de los tres folds temporales h1 fue 5,431 / 4,005 / 3,350: el rendimiento varía por período.

La clasificación complementaria mide **presión de demanda**, no agotamiento: mañana > 1,2 veces la media de los últimos siete días. Solo existen ocho agotamientos reales en el historial sintético. J48 obtuvo AUC de validación 0,97547 frente a 0,97499 de RandomForest: selección por una diferencia pequeña, sin demostrar superioridad estadística. En prueba: ROC-AUC 0,97436, AP 0,92186, precisión 73,77%, recall 96,85%. Umbral 0,09 elegido en validación con coste supuesto FN:FP=5:1. Matriz [TN,FP;FN,TP] = [10093,1257;115,3535].

## Abrir los entregables

- [Informe gráfico navegable](INFORME.html): figuras, resultados e interpretación, funciona localmente sin servidor.
- [Guía CRISP-DM y WEKA](GUIA_CRISP_DM.md): negocio, Java, instalación, ARFF, filtros, modelos, CV temporal y lectura de curvas.
- [Presentación ejecutiva](page://page_59ee32ede2cc81919f888ab9c16efaf0): material en Spaces; también accesible mediante el enlace del chat. No se ha publicado para acceso anónimo.
- `graficas/`: nueve láminas analíticas, cada una en PNG y SVG.
- `metricas_regresion.csv`, `clasificacion.json`, `validacion_cruzada_temporal.csv`, `resumen.json`: resultados auditables.
- `predicciones/`: validación, prueba y 200 filas nuevas por horizonte, con producto/almacén e índice de fecha objetivo.
- `pedidos_propuestos_simulacion.csv`: 200 recomendaciones desde el corte del 23/11/2026; stock de seguridad recalibrado con 72 orígenes comunes por serie en validación. No son órdenes ejecutadas.
- `datos/presion_*.arff`: clasificación; `datos/cv*.arff`: folds temporales para Explorer; los ARFF de regresión permanecen en la carpeta del historial original.
- `modelos/`: reglas de árboles, logs, predicciones y `.model` locales. Los binarios se excluyen de Git y se regeneran.

## Reproducción y alcance

`analizar.py` ejecuta WEKA real mediante `WekaRun.java`; Python calcula métricas, genera gráficas y recomendaciones. No sustituye J48 por árboles de scikit-learn. No ejecutó la interfaz gráfica de WEKA. `verificar.py` recomputa independientemente MAE, AUC por rangos, confusión, fórmulas de pedidos y checksum; ver `verificacion.json`.

Las versiones y hashes se guardan en `entorno.json`. Las instrucciones de compilación e instalación están en la guía. Los datos nuevos mantienen la respuesta desconocida. Los archivos de caché se invalidan ante cambios en datos, opciones, clase Java o modelo cargado; si se cambia la versión de WEKA, borrar únicamente los `.sha256` de esta carpeta de modelos antes de repetir.

El despliegue de CRISP-DM se concreta aquí en artefactos offline y un diseño de integración. Falta validar una política completa mediante replay, costes reales, demanda observada y criterios de aceptación del negocio antes de integrar. Ningún resultado acredita 95% de servicio operativo.

Los resultados reflejan regularidades del generador sintético. No se realizó tuning exhaustivo, validación externa ni demostración de ahorro económico. SMO/SMOreg, regresión lineal y MLP están propuestos y explicados, no se presentan como ejecutados.
