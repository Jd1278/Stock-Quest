"""Informe vigente: contaminacion controlada, limpieza real WEKA y prediccion."""
from estilo_informe import *
Q=json.loads((BASE/'validacion_calidad_v2.json').read_text(encoding='utf-8'))
C=json.loads((BASE/'limpios/parametros_limpieza.json').read_text(encoding='utf-8'))
RAW=json.loads((BASE/'resultados_sin_limpieza/metricas_modelo.json').read_text(encoding='utf-8'))
RM=RAW['metrics']['prueba']['model']

add('VERSIÓN 2 CORREGIDA / DATOS, LIMPIEZA Y PREDICCIÓN','SmallSQ')
add('¿Quién podría necesitar<br/>refuerzo en siete días?','TitleSQ')
add('Stock Quest: dos datasets de 100.000 filas y 15 campos, con 10% de valores atípicos y otro 10% de datos sucios.','LeadSQ')
table([['Composición de cada dataset crudo','Filas','Porcentaje'],
    ['Sin alteración intencional','80.000','80%'],['Con valores atípicos','10.000','10%'],
    ['Con errores de calidad','10.000','10%']],[310,100,97])
note('Los grupos son excluyentes y los porcentajes se refieren a filas. Se modifica una celda por fila afectada. '
    'La versión anterior no incorporaba esas anomalías; queda sustituida por esta entrega corregida.')
add('Trabajo realizado','SubSQ')
add('Se contaminaron de forma trazable ambos datasets, se ejecutó la limpieza con filtros de WEKA 3.8.6, '
    'se verificó el resultado y se repitió el entrenamiento y la evaluación temporal. Las versiones limpias conservan '
    '<b>100.000 filas y 15 campos cada una</b>.')
add(f'En prueba temporal, el flujo con limpieza obtiene <b>{pct(M["precision"])}</b> de precisión de alerta, '
    f'<b>{pct(M["recall"])}</b> de recall y AUC <b>{M["ROC_AUC"]:.3f}</b>. El flujo sin limpieza alerta a todos en esa prueba.')
note('El modelo todavía genera muchas falsas alertas. Los resultados son un laboratorio sintético de priorización, '
    'no una validación para asignar refuerzo automáticamente a usuarios reales.',True)
add('Corte de inferencia: 24/11/2026. Fecha objetivo: 01/12/2026. Los resultados futuros son simulados; no son '
    'observaciones reales de una fecha todavía no ocurrida. Elaborado el 25/11/2026.','SmallSQ')

newpage();title(2,'Datasets y contaminación congruente')
add('Una fila representa un aprendiz, un módulo y un corte semanal. La base incluye 2.000 aprendices ficticios, '
    'dos módulos por persona y 25 cortes. No representa 100.000 personas distintas.')
table([['Archivo','Fechas de observación','Tamaño'],
    ['Situación actual','09/06 a 24/11/2026','100.000 x 15'],
    ['Situación siete días después','16/06 a 01/12/2026','100.000 x 15']], [190,205,112])
table([['Alteración en cada archivo','Campo','Filas'],
    ['Minutos extremos: entre 5.000 y 9.000','7','10.000'],
    ['Puntaje medio de simulación negativo','12','2.500'],
    ['Nota media de desafíos superior a 100','9','2.500'],
    ['Acierto inicial superior a 1','10','2.500'],
    ['Módulos en minúsculas: m01 a m09','3','2.500']], [350,60,97])
add('La selección usa semilla 2026112502 y asigna 400 atípicos y 400 sucios por corte de 4.000 casos. '
    'Se decide por observación, no por archivo: las <b>96.000 observaciones compartidas</b> reciben exactamente '
    'la misma alteración en ambos datasets. Se verificó también su igualdad después de limpiar.')
add('Se protegen ID, fecha y etiqueta de nivel. La práctica evalúa limpieza de predictores, no recuperación de '
    'etiquetas erróneas. Los archivos de auditoría registran grupo, campo, valor base y valor alterado fuera '
    'de las 15 columnas. No se entregan al clasificador como variables de entrada.')
note('Los faltantes legítimos que ya existían, como una semana sin simulaciones, no se contabilizan como '
    'las 10.000 filas sucias introducidas. Una fila sin alteración puede contener ausencia legítima de medición.')
add('Los archivos sin contaminar se conservan en referencia_sin_contaminar para comprobar y reproducir '
    'las alteraciones. La limpieza no los consulta para restaurar valores.','SmallSQ')

newpage();title(3,'Limpieza ejecutada con WEKA')
table([['Operación','Tratamiento'],
    ['Categorías','RenameNominalValues: m01...m09 a M01...M09'],
    ['Rangos de puntajes','NumericCleaner en 9 y 12: inválidos fuera de 0-100 a NaN'],
    ['Rango de proporciones','NumericCleaner en 10: inválidos fuera de 0-1 a NaN'],
    ['Primera imputación','ReplaceMissingValues ajustado únicamente con entrenamiento'],
    ['Detección de atípicos','InterquartileRange en 7; factores 6 y 12; extremos también atípicos'],
    ['Reparación de minutos','NumericCleaner: valores superiores a 473 a NaN'],
    ['Esquema final','Remove 16-17 y segunda imputación de minutos']], [150,357])
add('El ajuste utilizó únicamente las 64.000 filas de entrenamiento temporal. Los mismos filtros y estadísticas '
    'se guardaron para limpiar el resto de las particiones y los dos datasets completos. No se aprendieron medias '
    'sobre el futuro ni se consultó la auditoría para identificar qué valor restaurar.')
table([['Control','Actual','A siete días'],
    ['Filas crudas / limpias','100.000 / 100.000','100.000 / 100.000'],
    ['Campos finales','15','15'],['Filas sucias reparadas','10.000','10.000'],
    ['Atípicos detectados y reparados','10.000','10.000'],
    ['Faltantes previos imputados (celdas)','73.393','69.642'],
    ['Faltantes finales (celdas)','0','0']],[275,116,116])
note('La imputación estima valores y no recupera las mediciones originales. Una nota imputada sin actividad '
    'no demuestra una calificación observada. Se conservan los conteos de intentos y simulaciones para interpretar la ausencia de actividad.')
add('Parámetros de minutos aprendidos: Q1=39, Q3=101, IQR=62, mediana=67, límite superior '
    '101 + 6 x 62 = 473. Tras retirar los minutos extremos del cálculo, su media de imputación es '
    '64.04085069444444. La media contaminada de 758,59 no se utiliza para repararlos.','SmallSQ')

newpage();title(4,'Guía WEKA: categorías, rangos y faltantes')
add('Realizar estos pasos por separado para cada ARFF crudo de 100.000 filas. Mantener Class = nivel_actual. '
    'Las constantes siguientes provienen del entrenamiento y evitan aprender medias con todo el archivo.')
for txt in [
    '<b>1.</b> Explorer > Preprocess > Open file. Verificar Instances=100000 y Attributes=15. Guardar las etapas con otros nombres.',
    '<b>2.</b> StringToNominal: attributeRange=1. Evita un problema del filtro manual de constantes con atributos string en WEKA 3.8.6. Solo cambia temporalmente el tipo del ID.',
    '<b>3.</b> RenameNominalValues: selectedAttributes=3; valueReplacements=m01:M01,m02:M02,...,m09:M09; ignoreCase=False. La guía Markdown incluye la cadena completa.',
    '<b>4.</b> NumericCleaner: attributeIndices=9,12; minThreshold=0; maxThreshold=100; minDefault=NaN; maxDefault=NaN; closeToTolerance=0; decimals=-1; includeClass=False.',
    '<b>5.</b> NumericCleaner: attributeIndices=10, mismos ajustes, pero maxThreshold=1. Las 7.500 celdas numéricas inválidas quedan como ?.'
]:add(txt)
add('6. ReplaceMissingWithUserConstant, una aplicación por atributo','SubSQ')
table([['attributes','Campo','numericReplacementValue'],
    ['9','Nota media de desafíos','66.46403370812234'],
    ['10','Acierto en primer intento','0.5806821701948335'],
    ['12','Puntaje medio de simulaciones','57.5929528925265'],
    ['13','Días sin actividad','1.3708088950224258'],
    ['14','Mejora semanal','0.7429423196691798']],[65,218,224])
add('En cada aplicación: elegir el atributo, copiar la constante con punto decimal y pulsar OK > Apply. '
    'No configurar sustituciones de nominal/string o fecha. Los predictores deben quedar sin faltantes.')
note('No aplicar ReplaceMissingValues ajustándolo con las 100.000 filas antes de evaluar el modelo. '
    'La ruta automática lo ajusta solo con entrenamiento; la ruta manual reutiliza esas medias como constantes.')

newpage();title(5,'Guía WEKA: atípicos y resultado final')
add('<b>7. InterquartileRange.</b> attributeIndices=7; configurar extremeValuesFactor=12 primero y luego '
    'outlierFactor=6; extremeValuesAsOutliers=True; detectionPerAttribute=False; outputOffsetMultiplier=False. Apply.')
note('Ahora deben aparecer <b>100.000 filas y 17 atributos</b>. Seleccionar Outlier, columna 16: '
    '<b>no=90.000, yes=10.000</b>. La columna 17 es ExtremeValue. Mantener la clase en nivel_actual, columna 15.')
add('El IQR de la vista completa se usa para visualizar y contar. El límite que se aplica a la reparación '
    'sigue siendo el aprendido en entrenamiento: 473. Los cuartiles calculados al inspeccionar el archivo completo '
    'no se reutilizan para ajustar el clasificador.')
for txt in [
    '<b>8.</b> NumericCleaner en 7: minThreshold=0; maxThreshold=473; minDefault=NaN; maxDefault=NaN; closeToTolerance=0; decimals=-1. Apply. Los 10.000 minutos extremos quedan como ?.',
    '<b>9.</b> Remove: attributeIndices=16-17, invertSelection=False. Apply. Volvemos a 15 columnas. No usar RemoveWithValues, porque aquí conservamos todas las filas.',
    '<b>10.</b> ReplaceMissingWithUserConstant: attributes=7; numericReplacementValue=64.04085069444444. Apply.',
    '<b>11.</b> NominalToString: attributeIndexes=1. Apply. El identificador recupera su tipo string.',
    '<b>12.</b> Comprobar 100.000 filas, 15 campos, nueve módulos canónicos, rangos válidos y ningún faltante restante. Save > ARFF con nombre limpio. Repetir con el archivo de siete días y las mismas constantes.'
]:add(txt)
add('Si InterquartileRange no permite Apply','SubSQ')
add('Comprobar que se aplicaron las cinco imputaciones, que el campo 7 es numérico y que la clase permanece '
    'en nivel_actual. Revisar Log. Esta versión rechaza faltantes en predictores; no desactivar las capacidades para ocultar el problema.')
add('La equivalencia de este procedimiento con la limpieza automática se comprobó mediante la API de WEKA '
    'sobre las 200.000 filas, con tolerancia numérica de 0,0000011 por redondeo de exportación. No se automatizó la interfaz gráfica.','SmallSQ')

newpage();title(6,'Construcción del pronóstico a siete días')
add('Objetivo: <b>requiere_refuerzo_7dias=si</b> cuando la evaluación independiente de t+7 quede por debajo '
    'de 60/100; en otro caso, no. Inicial es <60, intermedio [60,80) y avanzado >=80. La rúbrica requiere validación pedagógica.')
add('Se emparejan aprendiz, módulo canónico y fecha +7. El clasificador recibe los 14 indicadores de t y '
    'la etiqueta futura, manteniendo 15 columnas. ID y fecha se excluyen de los predictores. No se introducen '
    'los indicadores de t+7, las notas independientes exactas ni los archivos de auditoría.')
table([['Partición','Fechas de indicadores','Etiquetas','Filas'],
    ['Entrenamiento','09/06 a 22/09','16/06 a 29/09','64.000'],
    ['Separación 1','29/09','06/10','4.000'],
    ['Validación','06/10 a 20/10','13/10 a 27/10','12.000'],
    ['Separación 2','27/10','03/11','4.000'],
    ['Prueba temporal','03/11 a 24/11','10/11 a 01/12','16.000']], [112,145,145,105])
add('Se entrenaron dos J48 por flujo, con mínimo de 20 o 100 instancias por hoja, confianza 0,25 y '
    'Laplace. Se seleccionaron árbol y umbral exclusivamente con validación, maximizando F2 entre '
    'umbrales de 0,05 a 0,95. La prueba no intervino en esa selección.')
note(f'Flujo vigente: <b>limpieza WEKA dentro de FilteredClassifier + Remove 1-2 + J48</b>. '
    f'Mínimo por hoja seleccionado: <b>{R["selectedMinNumObj"]}</b>. Umbral de alerta: <b>{R["selectedThreshold"]:.2f}</b>. '
    'El modelo guardado recibe los archivos CRUDOS V2, no los ya limpiados.')
add('Las dos semanas de separación evitan que etiquetas de un bloque alcancen el inicio del siguiente. '
    'La evaluación cubre semanas posteriores de los mismos aprendices sintéticos. Es la prueba temporal '
    'reevaluada tras corregir la calidad; nuevos ajustes necesitarán una nueva reserva prospectiva.','SmallSQ')

newpage();title(7,'Evaluación: con y sin limpieza')
add('Prueba temporal: 16.000 casos y 4.511 positivos según la referencia sintética. Cada flujo seleccionó '
    'su configuración y umbral únicamente con validación.')
table([['Indicador de prueba','Sin limpieza','Con limpieza'],
    ['AUC ROC',f'{RM["ROC_AUC"]:.3f}',f'{M["ROC_AUC"]:.3f}'],
    ['Precisión de alerta',pct(RM['precision']),pct(M['precision'])],
    ['Recall / dificultad detectada',pct(RM['recall']),pct(M['recall'])],
    ['F1',f'{RM["F1"]:.3f}',f'{M["F1"]:.3f}'],
    ['F2, criterio de selección',f'{RM["F2"]:.3f}',f'{M["F2"]:.3f}'],
    ['Exactitud global',pct(RM['accuracy']),pct(M['accuracy'])],
    ['Alertas',num(RM['alerts']),num(M['alerts'])]], [277,115,115])
add('Matriz de confusión del flujo con limpieza','SubSQ')
table([['Predicción / referencia','Necesita refuerzo','No necesita refuerzo'],
    ['Alerta',num(M['TP'])+' verdaderos positivos',num(M['FP'])+' falsos positivos'],
    ['Sin alerta',num(M['FN'])+' falsos negativos',num(M['TN'])+' verdaderos negativos']], [187,160,160])
add('El flujo sin limpieza seleccionó mínimo 100 y umbral 0,10, y termina alertando a todos en prueba. '
    'El flujo limpio seleccionó mínimo 20 y umbral 0,15. Se comparan procedimientos completos; '
    'la diferencia no es una estimación causal aislada de la limpieza.')
note(f'El flujo limpio sigue generando <b>{num(M["FP"])} falsas alertas</b>. Su F2 de {M["F2"]:.3f} '
    f'solo supera ligeramente al baseline de alertar a todos ({R["metrics"]["prueba"]["alertEveryoneBaseline"]["F2"]:.3f}). '
    'No está listo para asignación automática de refuerzo.',True)
add('El AUC evalúa ordenación del riesgo; no equivale a exactitud. Las probabilidades no están calibradas. '
    'F2 favorece recuperar dificultad y tolera falsas alertas, por eso deben revisarse también precisión y carga de atención.','SmallSQ')

newpage();title(8,'¿Quién podría necesitar refuerzo?')
add(f'En el último corte se señalan <b>{num(L["moduleAlerts"])}</b> de 4.000 casos y '
    f'<b>{num(L["learnersWithAtLeastOneAlert"])}</b> de los 2.000 aprendices ficticios en al menos un módulo. '
    'El objetivo es el 01/12/2026, partiendo del 24/11/2026.')
table([['Comprobación del último corte','Casos'],
    ['Refuerzo según evaluación futura sintética',num(LAST['positives'])],
    ['Detectados / omitidos',f'{num(LAST["TP"])} / {num(LAST["FN"])}'],
    ['Falsas alertas',num(LAST['FP'])],
    ['Dificultad nueva detectada / existente',f'{L["detectedNewRiskSynthetic"]} / {L["observedNewRiskSynthetic"]}']], [380,127])
add('Ejemplos del grupo con mayor puntuación','SubSQ')
rows=[['Aprendiz ficticio','Módulos señalados','Índice máximo']]
for person in L['top10Learners'][:8]:rows.append([person['id_aprendiz_sintetico'],person['modulos_con_alerta'].replace(';',', '),f'{person["maximo_indice_riesgo_modulo"]:.3f}'])
table(rows,[145,220,142])
add(f'Hay {L["learnersTiedAtHighestModuleRisk"]} aprendices empatados en el máximo. Los ejemplos se ordenan por ID '
    'dentro del empate, sin evidencia para situar uno por encima de otro. El máximo entre módulos no es '
    'una probabilidad calibrada de la persona.','SmallSQ')
note('Acción propuesta: revisar los módulos señalados, ofrecer una actividad breve con retroalimentación '
    'y confirmar la dificultad antes de asignar apoyo intensivo. No utilizar estas alertas como etiquetas '
    'permanentes, sanciones o decisiones automáticas de aprobación.')
add('La lista completa se entrega en resultados/priorizacion_2000_aprendices.csv y el detalle de cada '
    'módulo en resultados/predicciones_ultimo_corte_4000.csv. Las referencias futuras se añaden después de predecir para auditoría.','SmallSQ')

newpage();title(9,'Evidencias, reproducción y límites')
add('Comprobaciones realizadas','SubSQ')
add('Se verificaron los dos contratos 100.000 x 15; exactamente 10.000 atípicos y 10.000 sucios por archivo; '
    'grupos excluyentes y una alteración por fila; reparación de categorías y rangos; 10.000 minutos atípicos '
    'reparados por dataset; medias de entrenamiento recalculadas independientemente; igualdad de 96.000 '
    'observaciones compartidas; etiquetas protegidas; emparejamiento +7 y predictores sin información futura.')
add('Se entrenaron modelos reales con WEKA, se guardaron y se comprobó su recarga. La guía manual se '
    'contrastó programáticamente con 200.000 filas. Los hashes, los cambios por celda, las etapas con '
    '17 columnas temporales y las métricas completas se conservan en la entrega.')
add('Cómo reproducir','SubSQ')
add('Extraer el paquete completo en una ruta corta. Seguir README.md: ajustar ruta de WEKA, ejecutar '
    'ajustar_calidad.py, LimpiezaRefuerzo.java, verificar-guia, compilar los dos Java, entrenar ambos '
    'flujos, analizar_resultados.py y validar_calidad_v2.py. La predicción puede ejecutarse sin '
    'reentrenar cargando resultados/refuerzo_7dias.model.')
add('En Explorer cargar el modelo y reevaluar el ARFF crudo de inferencia con salida de probabilidades. '
    'Aplicar alerta si la puntuación de <b>si</b> es >=0,15. La clase más probable de WEKA no reproduce '
    'automáticamente este umbral. Si se trabaja con limpios/weka, entrenar un modelo sin repetir la limpieza.')
add('Límites materiales','SubSQ')
add('La separación artificial de los atípicos facilita su detección perfecta y no valida un detector real. '
    'La imputación no recupera datos verdaderos. La rúbrica, las probabilidades y las intervenciones necesitan '
    'validación pedagógica y prospectiva. Parte de los indicadores aún requiere instrumentación en la aplicación. '
    'No se probaron nuevos aprendices, no se acreditó eficacia de refuerzo y no se desplegó en producción.')
note('Toda la información es sintética. No se modificaron bases operativas ni se utilizaron datos personales '
    'reales. El informe sustituye las conclusiones de la versión previa sin contaminación.')
add('Documentación técnica','SubSQ')
add('<link href="https://weka.sourceforge.io/doc.stable/weka/filters/unsupervised/attribute/NumericCleaner.html" color="#007F82">WEKA NumericCleaner</link>; '
    '<link href="https://weka.sourceforge.io/doc.dev/weka/filters/unsupervised/attribute/InterquartileRange.html" color="#007F82">InterquartileRange</link>; '
    '<link href="https://weka.sourceforge.io/doc.dev/weka/filters/unsupervised/attribute/RenameNominalValues.html" color="#007F82">RenameNominalValues</link>; '
    '<link href="https://weka.sourceforge.io/doc.stable-3-8/weka/classifiers/meta/FilteredClassifier.html" color="#007F82">FilteredClassifier/J48</link>. '
    'También se verificó el código fuente distribuido con WEKA 3.8.6 para los filtros y el tratamiento de faltantes.','SmallSQ')

path=OUT/'StockQuest-Refuerzo-Aprendizaje-7dias.pdf'
doc=SimpleDocTemplate(str(path),pagesize=(595.2756,841.8898),rightMargin=44,leftMargin=44,topMargin=58,bottomMargin=56,
    title='Stock Quest V2 - Limpieza y pronostico de refuerzo a siete dias',author='Stock Quest | Laboratorio sintetico',
    subject='Dos datasets 100000 x 15, 10% atipicos, 10% datos sucios, limpieza WEKA y evaluacion temporal')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(str(path).removeprefix('\\\\?\\'))
