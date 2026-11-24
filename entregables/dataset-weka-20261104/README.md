# Dataset sintético de inventario para WEKA

Práctica independiente de Stock Quest. No contiene datos personales reales ni copias de las bases operativas.

## Contenido

El original contiene **100.000 filas y 15 campos**: 80.000 normales, 10.000 con outliers y otras 10.000 con datos sucios. Los grupos son excluyentes y el porcentaje corresponde a filas, no celdas. El resultado limpio contiene 88.000 filas y 15 campos tras retirar 2.000 duplicados y 10.000 outliers.

| Archivo | Uso |
|---|---|
| `stockquest_100000_15_original.csv` / `.arff` | Datos originales para la práctica |
| `stockquest_88000_15_limpio_weka.csv` / `.arff` | Resultado de referencia |
| `diccionario_campos.csv` | Definición y orden de los 15 campos |
| `referencia_anomalias_NO_IMPORTAR_EN_WEKA.csv` | Control de anomalías por fila; no usar como predictor |
| `outliers_detectados_revision.csv` | Filas retiradas para revisión |
| `control-generacion.json` y `validacion_weka.json` | Semilla, recuentos, checksums y alcance de las comprobaciones |
| `generar-dataset.cjs` y `ALGORITMO-GENERACION.md` | Generador reproducible y explicación |
| `GUIA-LIMPIEZA-WEKA.md` y `limpiar-con-weka.ps1` | Limpieza manual y por filtros CLI |
| `carga-postgresql/` | Guía, SQL y cargador para una base de laboratorio |

**Orden de limpieza en Explorer:** duplicados, categorías, negativos a faltantes, imputación, InterquartileRange, retirada de outliers y retirada de indicadores. La imputación debe preceder a InterquartileRange porque su comprobación de capacidades rechaza faltantes en Explorer.

Los datasets son sintéticos; una detección perfecta en esta distribución didáctica no acredita precisión equivalente en datos reales. La guía documenta las decisiones y limitaciones.

## PostgreSQL

El destino acordado para la práctica es una base separada `stockquest_dataset_lab`, en el mismo servidor PostgreSQL. La carga crea solamente el esquema `dataset_lab` y dos tablas, sin modificar las tablas de los microservicios. Su preparación no acredita que se haya ejecutado la importación.

Las rutas `C:/Users/LENOVO/...` de las guías describen el equipo original. En un equipo restaurado utiliza la carpeta actual del checkout. El generador guarda junto a su propio archivo y el cargador resuelve los CSV respecto a su carpeta.

No se versionan carpetas de resultados intermedios ni duplicados extraídos del ZIP. El paquete completo está en `../Dataset-WEKA-StockQuest-con-PostgreSQL.zip`.
