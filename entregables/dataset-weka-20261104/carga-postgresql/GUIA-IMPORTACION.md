# Importar el dataset en PostgreSQL, paso a paso

## Destino acordado

El usuario eligio crear una base de laboratorio separada en el mismo PostgreSQL de Stock Quest. Nombre propuesto: `stockquest_dataset_lab`, servidor `127.0.0.1`, puerto `5432`.

Las tres bases de los microservicios y las bases CI no se modifican. Las nuevas tablas no se convierten automaticamente en usuarios, lecciones o partidas, ni aparecen en la interfaz: son un laboratorio para consultar y comparar el dataset.

Esta entrega prepara los archivos y verifica la sintaxis del cargador PowerShell. **La importacion PostgreSQL aun no se ha ejecutado.** El resultado se debe comprobar al realizar estos pasos.

## 1. Crear la base desde pgAdmin

1. Abre pgAdmin y conectate a tu servidor PostgreSQL como administrador, usando su contrasena habitual.
2. Revisa las propiedades del servidor: Host `127.0.0.1`, puerto `5432`.
3. Actualiza la lista Databases y comprueba si ya existe `stockquest_dataset_lab`. Si existe, revisa su contenido antes de usarla; no la borres ni sobrescribas.
4. Si no existe: clic derecho en **Databases → Create → Database**.
5. Database = `stockquest_dataset_lab`. Owner = `postgres` (cuenta administrativa de este laboratorio local).
6. Pulsa Save.
7. Sobre esa nueva base abre **Query Tool** y ejecuta:

```sql
SELECT current_database(), current_user,
       inet_server_addr(), inet_server_port();
```

La base debe ser stockquest_dataset_lab. No selecciones una base de personas, aprendizaje, simulacion o CI.

## 2. Localizar el paquete

Los CSV original y limpio estan en la carpeta principal del paquete. La subcarpeta carga-postgresql contiene el importador y dos archivos SQL. Mantener esta estructura: el importador encuentra los CSV por sus rutas relativas, no por la carpeta actual de la terminal.

En este equipo, desde PowerShell normal:

```powershell
Set-Location 'C:\Users\LENOVO\Documents\Codex\2026-09-05\files-mentioned-by-the-user-desarrrollo\outputs\Stock-Quest\entregables\dataset-weka-20261104'

Test-Path '.\stockquest_100000_15_original.csv'
Test-Path '.\stockquest_88000_15_limpio_weka.csv'
Test-Path '.\carga-postgresql\importar-dataset.ps1'
```

Los tres deben devolver True. Si trabajas desde otra carpeta donde descomprimiste el paquete, cambia Set-Location a esa carpeta.

## 3. Ejecutar la carga

```powershell
& '.\carga-postgresql\importar-dataset.ps1' `
    -Database 'stockquest_dataset_lab' `
    -DbUser 'postgres'
```

Cuando psql solicite la contrasena, escribe la de PostgreSQL. No se mostrara mientras la escribes. No es la contrasena de Jenkins ni la de los usuarios de CI. No necesitas cambiar credenciales de Jenkins.

El script usa `C:/Program Files/PostgreSQL/17/bin/psql.exe`, cliente ya localizado en este equipo. Esto no significa que el servidor sea PostgreSQL 17: se conecta al servidor real del puerto 5432. Si cambias de equipo, ajusta -PsqlPath al ejecutable existente.

Si quieres cargar tu CSV exportado desde WEKA en lugar del resultado limpio de referencia, usa:

```powershell
& '.\carga-postgresql\importar-dataset.ps1' `
    -Database 'stockquest_dataset_lab' `
    -DbUser 'postgres' `
    -CleanCsv 'C:/ruta/mi_stockquest_limpio.csv'
```

Ese CSV debe contener 88000 filas, 15 campos en el mismo orden, cabecera, coma como separador y punto decimal. No debe contener los indicadores Outlier/ExtremeValue. No guardes de nuevo el CSV con otra configuracion regional sin comprobar delimitador y decimales.

## 4. Que hace el importador

1. Comprueba que existen psql y ambos CSV.
2. Se conecta a la base indicada y solicita contrasena sin guardarla.
3. Inicia una sola transaccion mediante psql --single-transaction y ON_ERROR_STOP.
4. Crea un esquema nuevo dataset_lab y dos tablas de 15 campos.
5. Importa el original mediante `\copy`, convirtiendo los `?` no entrecomillados en SQL NULL. La tabla original permite duplicados y negativos para conservar las anomalias del ejercicio.
6. Importa el limpio en otra tabla, con clave primaria y restricciones de valores y ecuaciones de stock. Los campos monetarios tienen seis decimales para conservar las medias imputadas exportadas por WEKA.
7. Comprueba recuentos y anomalias; solo confirma la transaccion si todo coincide.

Se usa \copy porque lee el archivo desde tu equipo cliente. COPY con una ruta de archivo la lee desde el proceso servidor y puede fallar por permisos de carpetas de Windows. No es necesario conceder superusuario a los usuarios de los microservicios para esta carga.

El script no contiene DROP, TRUNCATE, borrado de registros previos ni cambios a tablas de negocio. Si ya existe dataset_lab, se detiene: no anade otras 100000 filas ni sobrescribe una carga anterior. Si hay error, no seguir ejecutando comandos sueltos; comparte el primer error. No cambies restricciones para forzar una carga sin revisar el CSV.

## 5. Resultado esperado

Durante la carga deben aparecer `COPY 100000` y `COPY 88000`. Al terminar, el script imprime:

```text
Carga confirmada: 100000 filas originales y 88000 limpias, 15 campos por tabla.
```

Son 188000 filas almacenadas entre dos tablas distintas. El dataset original sigue teniendo 100000 registros; no se han agregado los limpios al original.

En pgAdmin: **stockquest_dataset_lab → Schemas → Refresh → dataset_lab → Tables**. Deben aparecer inventario_original e inventario_limpio.

## 6. Consultas para la comprobacion

Ejecutar desde Query Tool conectado a stockquest_dataset_lab:

```sql
SELECT current_database() AS base_actual;

SELECT 'original' AS conjunto, count(*) AS filas
FROM dataset_lab.inventario_original
UNION ALL
SELECT 'limpio', count(*)
FROM dataset_lab.inventario_limpio;

SELECT table_name, count(*) AS campos
FROM information_schema.columns
WHERE table_schema = 'dataset_lab'
GROUP BY table_name
ORDER BY table_name;

SELECT
    count(*) FILTER (WHERE almacen IS NULL) AS almacen_faltante,
    count(*) FILTER (WHERE costo_pedido IS NULL) AS costo_pedido_faltante,
    count(*) FILTER (WHERE costo_pedido < 0) AS costo_negativo,
    count(*) FILTER (WHERE almacen IN ('NORTE','SUR','CENTRO')) AS categoria_inconsistente,
    count(*) - count(DISTINCT id_registro) AS ids_repetidos
FROM dataset_lab.inventario_original;

SELECT * FROM dataset_lab.inventario_original LIMIT 10;
SELECT * FROM dataset_lab.inventario_limpio LIMIT 10;
```

Resultados: original 100000, limpio 88000, 15 campos por tabla; la consulta de suciedad devuelve 2000 en cada una de sus cinco columnas. Los faltantes suman 4000: almacen y costo. Los otros tres controles corresponden a categorias, negativos y copias.

El indicador de IDs repetidos se usa porque este generador repite el ID al copiar filas exactas. No es una definicion general de duplicado para cualquier dataset.

## 7. Guardar la evidencia

Captura la conexion a la base correcta, la carga confirmada, los recuentos 100000/88000, los 15 campos por tabla y los cinco controles de suciedad. No captures contrasenas.

## Fuentes oficiales

- [psql, \copy y --single-transaction](https://www.postgresql.org/docs/16/app-psql.html).
- [COPY: CSV, HEADER y NULL](https://www.postgresql.org/docs/16/sql-copy.html).
