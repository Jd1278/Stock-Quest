# Diagnóstico actual del aprendizaje - versión 2 corregida

La entrega vigente cumple el criterio de **100.000 filas y 15 campos con 10% de valores atípicos y otro 10% de datos sucios**. La versión 1 no incluía esas alteraciones; las métricas e instrucciones anteriores quedan sustituidas por la versión 2.

| Grupo de filas crudas | Cantidad |
|---|---:|
| Sin alteración intencional | 80.000 |
| Con valor atípico | 10.000 |
| Con error de calidad | 10.000 |

Los grupos son excluyentes y los porcentajes se refieren a filas. Se altera una celda por fila afectada. Los faltantes legítimos previos no se cuentan como suciedad inyectada. Se preservan ID, fecha y etiqueta diagnóstica.

## Archivos vigentes

- `diagnostico_actual_100000_15.csv/.arff`: entradas CRUDAS con las anomalías requeridas.
- `limpios/diagnostico_actual_100000_15_limpio.csv/.arff`: resultado real de limpieza con WEKA, 100.000 filas y 15 campos.
- `auditoria_calidad_NO_USAR_COMO_PREDICTOR.csv`: fila, tipo, celda alterada y valores antes/después de la inyección; no introducir al modelo.
- `weka/`: particiones CRUDAS del diagnóstico por aprendiz, regeneradas con las anomalías V2. No utilizarlas para evaluar el pronóstico temporal de siete días.
- `control_generacion.json` y `validacion_diagnostico.json`: parámetros y evidencias de la versión corregida.
- `actividad_diaria_sintetica.csv`: respaldo de la base simulada anterior a la contaminación; sirve para auditoría, no para restaurar valores durante la limpieza.

Los datos representan 2.000 aprendices ficticios, dos módulos por persona y 25 cortes semanales. El último corte es 24/11/2026. La clase actual deriva de una evaluación independiente: <60 inicial, [60,80) intermedio, >=80 avanzado. Es una rúbrica provisional, no validada pedagógicamente.

La guía completa, el segundo dataset, los filtros, la predicción reevaluada y las evidencias están en [la entrega a siete días](../aprendizaje-refuerzo-7dias-20261125/README.md). Seguir [la limpieza paso a paso en WEKA](../aprendizaje-refuerzo-7dias-20261125/GUIA-LIMPIEZA-WEKA-V2.md).

Se repararon las 10.000 filas sucias y se imputaron los minutos de los 10.000 atípicos; no se eliminaron filas. Las medias y el límite de reparación se ajustaron exclusivamente con las 64.000 filas del entrenamiento temporal. También se imputaron 73.393 celdas que seguían faltantes en el crudo antes de invalidar errores. Una imputación es una estimación, no una calificación observada ni una recuperación exacta del original.

`generar_aprendizaje.py` invoca la preparación V2 y requiere la carpeta vecina de refuerzo. `validar_aprendizaje.py` ejecuta la verificación conjunta. El paquete ZIP completo y el checkout mantienen ambas carpetas juntas. El generador base V1 se conserva, con nombre explícito, en la carpeta de refuerzo; no ejecutarlo sobre los archivos vigentes.

Estos datasets son exclusivamente sintéticos. No se modificaron bases de Stock Quest ni se desplegó el modelo en producción.
