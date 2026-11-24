# Algoritmo exacto de generacion

## Alcance

Se generan 100000 registros de 15 campos: 80000 normales, 10000 con outliers y 10000 con suciedad. No se generaron 100000 filas sucias. Los porcentajes se aplican a filas y los grupos son disjuntos. Todo es sintetico, sin extraer datos de PostgreSQL.

La implementacion exacta esta en `generar-dataset.cjs`, JavaScript para Node.js, sin paquetes externos. Semilla fija: 20261104. Usa el generador pseudoaleatorio Mulberry32; sus operaciones enteras/bit a bit hacen reproducible la secuencia. No es un generador criptografico ni un modelo estadistico ajustado a datos reales.

## Procedimiento

1. Inicializar Mulberry32 con la semilla.
2. Crear 100000 filas inicialmente validas, con ID 1 a 100000.
3. Sortear enteros uniformes dentro de cada rango. Para dinero, sortear centavos enteros y dividir entre 100. Las categorias se eligen equiprobablemente.
4. Calcular vendidos = min(stock_inicial + recibidas, demanda), stock_final = stock_inicial + recibidas - vendidos y precio = redondear(costo * margen, 2). No sortear de forma independiente cantidades que deben cuadrar.
5. Barajar la lista de indices con Fisher-Yates. Elegir sin reemplazo los primeros 10000 para outliers y los siguientes 10000 para suciedad. Los 80000 restantes conservan el estado normal.
6. Inyectar tres clases de outliers en el primer grupo: 4000 plazos de 365 a 730 dias; 3000 costos de 5000 a 20000 conservando el margen de precio; 3000 demandas de 5000 a 10000 recalculando vendidos y stock_final. Registrar valores anteriores y cambios.
7. En el grupo sucio: poner `?` en almacen de 2000 filas y en costo_pedido de otras 2000; convertir el almacen a mayusculas en otras 2000; poner costo_pedido entre -30 y -0.01 en otras 2000; reemplazar otras 2000 por copias exactas de 2000 filas normales distintas. Se repite el ID de la fila fuente para que la copia sea exacta.
8. Barajar todas las filas con Fisher-Yates para no agrupar los errores por posicion.
9. Exportar CSV con cabecera y ARFF con los tipos declarados. Mantener las etiquetas/control fuera de los 15 campos.
10. Validar dimensiones, porcentajes, 2000 duplicados exactos y 4000 celdas faltantes. Calcular SHA-256 de los originales.

Los rangos ordinarios y la definicion de los 15 campos estan en `diccionario_campos.csv`. En el muestreo uniforme `entero(a,b)`, ambos extremos se incluyen: a + floor(azar * (b-a+1)).

## Pseudocodigo

```text
azar = Mulberry32(20261104)
registros = generar_100000_movimientos_validos(azar)
indices = FisherYates([0..99999], azar)
outliers = indices[0..9999]
sucios = indices[10000..19999]
normales = indices[20000..99999]

modificar_outliers(outliers[0..3999], plazo_extremo)
modificar_outliers(outliers[4000..6999], costo_y_precio_extremos)
modificar_outliers(outliers[7000..9999], demanda_extrema_recalculando_stock)

poner_faltante(sucios[0..1999], almacen)
poner_faltante(sucios[2000..3999], costo_pedido)
poner_mayusculas(sucios[4000..5999], almacen)
poner_negativo(sucios[6000..7999], costo_pedido)
copiar_filas_exactas(normales[0..1999], sucios[8000..9999])

FisherYates(registros, azar)
exportar_CSV_y_ARFF(registros)
exportar_referencia_separada()
verificar_100000_por_15_y_porcentajes()
```

## Reproducir sin sobrescribir tu practica

Copia `generar-dataset.cjs` a una carpeta nueva y ejecuta desde PowerShell:

```powershell
node.exe 'C:/ruta/nueva/generar-dataset.cjs'
```

El script guarda los archivos en la misma carpeta donde esta el `.cjs`. No requiere npm install. Si lo ejecutas directamente dentro de la carpeta original, vuelve a escribir los archivos generados: por eso se recomienda otra carpeta. La limpieza WEKA es un proceso separado; este script no crea el resultado limpio.

## Limitaciones

Los extremos estan deliberadamente separados de la distribucion ordinaria para una practica didactica. Detectarlos al 100 % aqui no acredita esa precision en datos reales. Los errores estan controlados, las categorias son uniformes y no se modelan estacionalidad ni correlaciones reales adicionales. Un outlier no es automaticamente un dato incorrecto. Las etiquetas de control no deben incorporarse como predictores de un modelo.
