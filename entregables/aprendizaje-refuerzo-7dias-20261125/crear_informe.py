"""Informe PDF con resultados calculados, tablas y figuras vectoriales."""
from pathlib import Path
import json, csv, os
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, String, Line

BASE=Path(__file__).resolve().parent
if os.name=='nt' and not str(BASE).startswith('\\\\?\\'):BASE=Path('\\\\?\\'+str(BASE))
PROJECT=BASE.parent.parent
OUT=PROJECT/'output/pdf';OUT.mkdir(parents=True,exist_ok=True)
META=json.loads((BASE/'control_pares.json').read_text(encoding='utf-8'))
R=json.loads((BASE/'resultados/metricas_modelo.json').read_text(encoding='utf-8'))
M=R['metrics']['prueba']['model'];L=R['latest'];LAST=R['metrics']['ultimo_corte']
NAVY=colors.HexColor('#142D43');TEAL=colors.HexColor('#007F82');PALE=colors.HexColor('#E9F5F4')
INK=colors.HexColor('#253846');GRAY=colors.HexColor('#586A76');LINE=colors.HexColor('#D9E2E8')
ORANGE=colors.HexColor('#A8471C');CREAM=colors.HexColor('#FFF1E9');WHITE=colors.white
FONT='Helvetica';BOLD='Helvetica-Bold'
if Path('C:/Windows/Fonts/segoeui.ttf').exists():
    pdfmetrics.registerFont(TTFont('Segoe','C:/Windows/Fonts/segoeui.ttf'))
    pdfmetrics.registerFont(TTFont('SegoeBold','C:/Windows/Fonts/segoeuib.ttf'))
    FONT='Segoe';BOLD='SegoeBold'
S=getSampleStyleSheet()
S.add(ParagraphStyle(name='TitleSQ',fontName=BOLD,fontSize=27,leading=33,textColor=NAVY,spaceAfter=14))
S.add(ParagraphStyle(name='LeadSQ',fontName=FONT,fontSize=12,leading=18,textColor=INK,spaceAfter=12))
S.add(ParagraphStyle(name='HeadSQ',fontName=BOLD,fontSize=16,leading=21,textColor=NAVY,spaceAfter=10))
S.add(ParagraphStyle(name='SubSQ',fontName=BOLD,fontSize=11,leading=15,textColor=TEAL,spaceBefore=10,spaceAfter=6))
S.add(ParagraphStyle(name='BodySQ',fontName=FONT,fontSize=9.5,leading=14,textColor=INK,spaceAfter=8))
S.add(ParagraphStyle(name='SmallSQ',fontName=FONT,fontSize=8,leading=11,textColor=GRAY,spaceAfter=6))
S.add(ParagraphStyle(name='CellSQ',fontName=FONT,fontSize=8.3,leading=11,textColor=INK))
S.add(ParagraphStyle(name='WhiteSQ',fontName=BOLD,fontSize=8.5,leading=11,textColor=WHITE))
S.add(ParagraphStyle(name='KPI',fontName=BOLD,fontSize=23,leading=28,textColor=TEAL))
W=507
story=[]
def p(text,style='BodySQ'):return Paragraph(text,S[style])
def add(text,style='BodySQ'):story.append(p(text,style))
def title(n,text):add(f'{n:02d} / {text}','HeadSQ')
def table(rows,widths,header=True):
    data=[[p(str(v),'WhiteSQ' if header and i==0 else 'CellSQ') for v in row] for i,row in enumerate(rows)]
    t=Table(data,colWidths=widths,repeatRows=1 if header else 0,hAlign='LEFT')
    styles=[('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),
        ('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
        ('LINEBELOW',(0,0),(-1,0),.6,LINE),('LINEBELOW',(0,-1),(-1,-1),.6,LINE)]
    if header:styles += [('BACKGROUND',(0,0),(-1,0),NAVY)]
    for i in range(1 if header else 0,len(rows)):
        if i%2:styles.append(('BACKGROUND',(0,i),(-1,i),colors.HexColor('#F3F7F9')))
    t.setStyle(TableStyle(styles));story.append(t);story.append(Spacer(1,10));return t
def note(text,warning=False):
    t=Table([[p(text)]],colWidths=[W]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),CREAM if warning else PALE),
        ('BOX',(0,0),(-1,-1),.6,colors.HexColor('#E9CCBC') if warning else colors.HexColor('#B8DAD7')),
        ('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),
        ('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
    story.append(t);story.append(Spacer(1,10))
def pct(x):return f'{100*x:.1f} %'
def num(x):return f'{x:,}'.replace(',','.')
def newpage():story.append(PageBreak())
def level_chart():
    d=Drawing(W,155);maxv=2000;start=104;scale=310/maxv
    for i,(label,key) in enumerate([('Inicial','inicial'),('Intermedio','intermedio'),('Avanzado','avanzado')]):
        y=118-i*42;d.add(String(0,y+1,label,fontName=FONT,fontSize=9,fillColor=INK))
        for yy,count,color in [(y+6,L['currentLevels'][key],GRAY),(y-8,L['futureLevels'][key],TEAL)]:
            d.add(Rect(start,yy,count*scale,10,fillColor=color,strokeColor=None))
            d.add(String(start+count*scale+6,yy+1,num(count),fontName=FONT,fontSize=8,fillColor=INK))
    d.add(Rect(0,0,9,9,fillColor=GRAY,strokeColor=None));d.add(String(14,1,'24/11: diagnóstico de referencia',fontName=FONT,fontSize=8,fillColor=GRAY))
    d.add(Rect(250,0,9,9,fillColor=TEAL,strokeColor=None));d.add(String(264,1,'01/12: resultado futuro sintético',fontName=FONT,fontSize=8,fillColor=GRAY))
    return d
def footer(canvas,doc):
    canvas.setStrokeColor(LINE);canvas.line(44,798,551,798)
    canvas.setFont(BOLD,8);canvas.setFillColor(NAVY);canvas.drawString(44,810,'STOCK QUEST / ANALÍTICA DEL APRENDIZAJE')
    canvas.setFont(FONT,8);canvas.setFillColor(GRAY);canvas.drawRightString(551,810,'25 NOV 2026')
    canvas.line(44,42,551,42);canvas.drawString(44,29,'Laboratorio sintético | No evalúa personas reales')
    canvas.drawRightString(551,29,f'{doc.page}')

# 1 Executive overview
add('DIAGNÓSTICO + PRONÓSTICO A SIETE DÍAS','SmallSQ')
add('¿Quién podría necesitar\nrefuerzo en los próximos días?'.replace('\n','<br/>'),'TitleSQ')
add('Contraste de dos datasets de 100.000 registros y evaluación real de un clasificador WEKA.','LeadSQ')
cards=[]
for value,label in [('100.000','pares temporales'),('2.000','aprendices ficticios'),('15','campos por dataset')]:
    cards.append([[p(value,'KPI')],[p(label,'SmallSQ')]])
t=Table([[Table(c,colWidths=[153]) for c in cards]],colWidths=[169]*3)
t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),8)]));story.append(t);story.append(Spacer(1,18))
add('Resultado principal','SubSQ')
add(f'En prueba temporal, el modelo detecta <b>{pct(M["recall"])}</b> de los casos que quedan en nivel inicial, '
    f'pero su precisión de alerta es <b>{pct(M["precision"])}</b>. La capacidad de ordenar el riesgo alcanza un AUC de <b>{M["ROC_AUC"]:.3f}</b>.')
note(f'El umbral sensible produce <b>{num(L["moduleAlerts"])}</b> alertas entre 4.000 casos del último corte y señala '
    f'a <b>{num(L["learnersWithAtLeastOneAlert"])}</b> de 2.000 aprendices ficticios. Es demasiado amplio para asignar refuerzo automáticamente.',True)
add('Qué se entrega','SubSQ')
add('Dos datasets completos, contraste registro a registro, particiones temporales, modelo WEKA guardado, '
    'predicciones por módulo, lista por aprendiz, código reproducible y controles de integridad.')
add('La fecha de corte es el 24/11/2026 y el objetivo es el 01/12/2026. Los resultados del 01/12 se simularon; '
    'no son observaciones reales de una fecha que todavía no ha ocurrido. La evaluación es un ensayo retrospectivo simulado.','SmallSQ')
note('Necesidad de refuerzo = nota de evaluación independiente a t+7 inferior a 60/100. '
    'La regla y las categorías de dominio son provisionales; requieren revisión pedagógica.')

# 2 data design
newpage();title(2,'Datos y variable que se predice')
add('Cada fila representa un aprendiz, un módulo y un corte semanal. El historial contiene 25 cortes para dos módulos '
    'por cada uno de los 2.000 aprendices ficticios. No son 100.000 personas distintas.')
table([['Archivo conceptual','Fechas de sus observaciones','Tamaño'],
    ['Diagnóstico actual','09/06/2026 a 24/11/2026','100.000 x 15'],
    ['Diagnóstico siete días después','16/06/2026 a 01/12/2026','100.000 x 15'],
    ['Datos para el modelo','Indicadores de t + etiqueta de t+7','100.000 x 15']], [165,230,112])
add('Estructura de los 15 campos','SubSQ')
fieldrows=[['Posición','Campo o grupo','Tratamiento en el modelo'],
    ['1-2','ID sintético y fecha de corte','Trazabilidad; excluir del predictor'],
    ['3','Módulo','Categoría M01 a M09'],
    ['4','Nota diagnóstica inicial','Pretest previo al historial'],
    ['5-6','Lecciones asignadas y completadas','Estado acumulado en t'],
    ['7','Minutos de estudio en siete días','Ventana conocida hasta t'],
    ['8-10','Intentos, nota media y acierto inicial','Ventana conocida hasta t'],
    ['11-12','Simulaciones y puntaje medio','Ventana conocida hasta t'],
    ['13-14','Días sin actividad y mejora semanal','Disponibles en t'],
    ['15','Nivel actual / requiere_refuerzo_7dias','Clase de diagnóstico / objetivo binario']]
table(fieldrows,[55,228,224])
add('La base futura contiene sus propios indicadores y nivel en t+7 para contrastar. <b>Esos indicadores futuros '
    'no se introducen en el clasificador</b>: este recibe exclusivamente los 14 primeros campos del diagnóstico de t '
    'y aprende la etiqueta sí/no del futuro. Tras Remove 1-2, WEKA utiliza 12 predictores y una clase.')
add('Los signos ? indican medidas no observadas, como una semana sin simulaciones. No equivalen a cero ni son '
    'datos sucios deliberados. La nota exacta de la evaluación actual/futura permanece en un archivo de referencia separado.','SmallSQ')

# 3 contrast
newpage();title(3,'Contraste actual frente a siete días después')
add('Transiciones en los 100.000 pares históricos','SubSQ')
rows=[['Nivel en t / nivel en t+7','Inicial','Intermedio','Avanzado','Total en t']]
for a in ['inicial','intermedio','avanzado']:
    counts=META['transitionMatrix'][a];rows.append([a.capitalize()]+[num(counts[b]) for b in ['inicial','intermedio','avanzado']]+[num(sum(counts.values()))])
rows.append(['Total en t+7']+[num(META['futureDistribution'][b]) for b in ['inicial','intermedio','avanzado']]+['100.000'])
table(rows,[187,80,80,80,80])
add('Se mantienen en inicial 25.152 casos y aparecen <b>11.935 casos nuevos de nivel inicial</b> '
    '(10.505 desde intermedio y 1.430 desde avanzado). Al mismo tiempo, 13.226 casos salen de inicial. '
    'Los totales globales pueden mejorar mientras algunos aprendices empeoran.')
add('Último corte: 4.000 casos, del 24/11 al 01/12','SubSQ');story.append(level_chart());story.append(Spacer(1,10))
table([['Transición del último corte','Casos'],['Permanecen en inicial','648'],
    ['Llegan a inicial desde otros niveles','478'],['Salen del nivel inicial','487'],
    ['Total en inicial siete días después','1.126']],[380,127])
note('El modelo debe anticipar tanto dificultad persistente como dificultad emergente. Una alerta no equivale '
    'a una caída confirmada. Los cambios de categoría también reflejan la variación de una evaluación simulada '
    'de veinte preguntas; el contraste no demuestra causas ni el efecto de una intervención.')

# 4 methodology
newpage();title(4,'Entrenamiento y evaluación sin información futura')
add('Separación temporal, con dos semanas excluidas','SubSQ')
table([['Partición','Cortes de indicadores','Resultados objetivo','Filas'],
    ['Entrenamiento','09/06 a 22/09','16/06 a 29/09','64.000'],
    ['Separación 1','29/09','06/10','4.000'],
    ['Validación','06/10 a 20/10','13/10 a 27/10','12.000'],
    ['Separación 2','27/10','03/11','4.000'],
    ['Prueba final','03/11 a 24/11','10/11 a 01/12','16.000']], [102,148,155,102])
add('Las 8.000 filas de separación se conservan en los archivos, pero no intervienen en el ajuste ni en las métricas. '
    'La última fecha de etiqueta de entrenamiento es anterior al primer corte de validación; se aplica el mismo criterio antes de prueba.')
add('Procedimiento ejecutado','SubSQ')
for text in [
    '<b>1.</b> Continuar el mismo generador y sus semillas durante una semana adicional; comprobar que los 100.000 registros anteriores coinciden exactamente.',
    '<b>2.</b> Emparejar por ID, módulo y fecha +7; definir refuerzo si la evaluación independiente futura queda por debajo de 60.',
    '<b>3.</b> Entrenar dos J48 reales en WEKA 3.8.6: mínimo de 20 o 100 instancias por hoja, confianza 0,25 y suavizado Laplace. Remove 1-2 forma parte del modelo.',
    '<b>4.</b> Elegir modelo y umbral exclusivamente con validación: 38 combinaciones (dos árboles y umbrales de 0,05 a 0,95). Maximizar F2, que da más peso a recuperar casos de dificultad.',
    '<b>5.</b> Fijar J48 con mínimo 100 y umbral 0,15; calcular después las métricas finales de prueba. No reajustar para mejorar esos resultados.'
]:add(text)
note('La evaluación cubre semanas posteriores de los mismos aprendices sintéticos. No demuestra funcionamiento '
    'con personas nuevas ni con usuarios reales. Se excluyen los IDs, pero no se hace una prueba de generalización a alumnos no vistos.')
add('Las puntuaciones de salida no se calibraron. El umbral 0,15 es una política de alerta seleccionada en laboratorio, '
    'no una probabilidad mínima pedagógicamente validada ni una garantía de necesidad de refuerzo.','SmallSQ')

# 5 results
newpage();title(5,'Resultados de la prueba temporal')
add('Conjunto final: 16.000 casos; 4.511 requieren refuerzo según la referencia sintética.','BodySQ')
table([['Indicador','Validación','Prueba final'],
    ['Recall: dificultad detectada',pct(R['metrics']['validacion']['model']['recall']),pct(M['recall'])],
    ['Precisión de las alertas',pct(R['metrics']['validacion']['model']['precision']),pct(M['precision'])],
    ['F1',f'{R["metrics"]["validacion"]["model"]["F1"]:.3f}',f'{M["F1"]:.3f}'],
    ['F2, criterio de selección',f'{R["metrics"]["validacion"]["model"]["F2"]:.3f}',f'{M["F2"]:.3f}'],
    ['AUC ROC',f'{R["metrics"]["validacion"]["model"]["ROC_AUC"]:.3f}',f'{M["ROC_AUC"]:.3f}'],
    ['Precisión media de ranking (AP)',f'{R["metrics"]["validacion"]["model"]["average_precision"]:.3f}',f'{M["average_precision"]:.3f}']], [277,115,115])
table([['Predicción / referencia','Necesita refuerzo','No necesita refuerzo'],
    ['Alerta',num(M['TP'])+' verdaderos positivos',num(M['FP'])+' falsos positivos'],
    ['Sin alerta',num(M['FN'])+' falsos negativos',num(M['TN'])+' verdaderos negativos']], [187,160,160])
add('Comparación con reglas sencillas','SubSQ')
baseline=R['metrics']['prueba']
table([['Regla','Recall','Precisión','F2'],
    ['J48 con umbral 0,15',pct(M['recall']),pct(M['precision']),f'{M["F2"]:.3f}'],
    ['Alertar a todos',pct(baseline['alertEveryoneBaseline']['recall']),pct(baseline['alertEveryoneBaseline']['precision']),f'{baseline["alertEveryoneBaseline"]["F2"]:.3f}'],
    ['Mantener el nivel inicial actual*',pct(baseline['persistenceWithIndependentCurrentAssessment']['recall']),pct(baseline['persistenceWithIndependentCurrentAssessment']['precision']),f'{baseline["persistenceWithIndependentCurrentAssessment"]["F2"]:.3f}'],
    ['Nunca alertar (clase mayoritaria)','0,0 %','No definida','0,000']], [252,85,85,85])
note('El F2 del modelo apenas supera a alertar a todos. Su alta sensibilidad se obtiene a costa de '
    f'{num(M["FP"])} falsas alertas. La exactitud global es {pct(M["accuracy"])}; no se presenta como éxito operativo. '
    'El AUC indica cierta capacidad de ordenar riesgo, pero hace falta mejorar la selectividad.',True)
add('* La persistencia usa una evaluación independiente actual, que no está entre los predictores del modelo. '
    'Es una referencia más informada, no una comparación con idénticos datos de entrada. Nunca alertar tiene '
    f'exactitud {pct(baseline["majorityBaseline"]["accuracy"])} y no detecta ningún caso.','SmallSQ')

# 6 who
newpage();title(6,'¿Quién queda priorizado en el último corte?')
add(f'Para el 01/12 se señalan <b>{num(L["moduleAlerts"])}</b> casos aprendiz/módulo de 4.000 y '
    f'<b>{num(L["learnersWithAtLeastOneAlert"])}</b> aprendices de 2.000 con al menos una alerta. '
    'La lista completa está en los CSV de resultados; todos los identificadores son ficticios.')
table([['Auditoría del último corte','Casos'],
    ['Necesidad de refuerzo en referencia sintética',num(LAST['positives'])],
    ['Detectados / omitidos',f'{num(LAST["TP"])} / {num(LAST["FN"])}'],
    ['Falsas alertas',num(LAST['FP'])],
    ['Dificultad nueva: detectada / existente',f'{L["detectedNewRiskSynthetic"]} / {L["observedNewRiskSynthetic"]}']], [380,127])
add('Diez ejemplos del grupo con mayor puntuación','SubSQ')
rankrows=[['Aprendiz ficticio','Módulos señalados','Índice máximo*']]
for person in L['top10Learners']:
    rankrows.append([person['id_aprendiz_sintetico'],person['modulos_con_alerta'].replace(';',', '),f'{person["maximo_indice_riesgo_modulo"]:.3f}'])
table(rankrows,[145,220,142])
add(f'* Hay <b>{L["learnersTiedAtHighestModuleRisk"]} aprendices empatados</b> en el índice máximo. Estos diez se muestran '
    'por orden de ID dentro del empate; no hay evidencia para situar uno por encima de otro. El índice es el máximo '
    'de las dos puntuaciones por módulo: no es una probabilidad calibrada de la persona.','SmallSQ')
note('Acción propuesta: revisar el módulo señalado y ofrecer una práctica breve con retroalimentación. '
    'Confirmar la dificultad con una actividad diagnóstica antes de asignar una intervención intensiva. '
    'Una alerta es una invitación a revisar; no es una etiqueta permanente del aprendiz.')

# 7 guide and limitations
newpage();title(7,'Reproducir en WEKA y siguiente validación')
add('Uso guiado del modelo y de los archivos','SubSQ')
for text in [
    '<b>1.</b> Abrir weka/entrenamiento.arff en Explorer: 64.000 instancias, 15 atributos y Class = requiere_refuerzo_7dias.',
    '<b>2.</b> En Classify elegir meta.FilteredClassifier. Filtro: unsupervised.attribute.Remove, attributeIndices = 1-2 e invertSelection = False.',
    '<b>3.</b> Clasificador trees.J48: minNumObj = 100, confidenceFactor = 0.25 y useLaplace = True. Para repetir la selección original usar también el candidato de mínimo 20.',
    '<b>4.</b> Usar Supplied test set con validacion.arff para seleccionar; reservar prueba.arff para la evaluación final. No usar validación cruzada aleatoria para este pronóstico.',
    '<b>5.</b> Para inferencia, cargar el modelo guardado resultados/refuerzo_7dias.model y usar predecir_ultimo_corte_4000.arff como test. La clase es ? en las 4.000 filas.',
    '<b>6.</b> Mostrar la distribución de probabilidades. Aplicar alerta si la puntuación de la clase si es >= 0,15. La etiqueta estándar de WEKA suele elegir la clase más probable: no reproduce este umbral personalizado.',
    '<b>7.</b> Para reproducir exactamente, ejecutar EntrenarRefuerzo.java y analizar_resultados.py siguiendo README.md. Los CSV de resultados ya incluyen el umbral correcto.'
]:add(text)
add('Qué falta antes de usarlo con usuarios reales','SubSQ')
add('Validar la rúbrica con el equipo pedagógico; recoger los indicadores que aún no existen en la aplicación; '
    'calibrar probabilidades; acordar capacidad y coste de las intervenciones; probar un umbral más selectivo en '
    'nueva validación temporal; evaluar subgrupos y nuevos aprendices; comprobar con datos reales y supervisión humana. '
    'No se conectó este modelo a Stock Quest ni se modificaron sus bases de datos.')
add('Controles y trazabilidad','SubSQ')
add('Se comprobaron los 100.000 emparejamientos, el intervalo exacto de siete días, los 15 campos, las etiquetas '
    'independientes, las particiones y sus separaciones, los hashes de los archivos y los nuevos agregados semanales '
    'contra 28.000 eventos diarios. El modelo se entrenó y exportó con WEKA; la precisión predictiva real sigue sin validarse.','SmallSQ')
add('Fuentes metodológicas','SubSQ')
add('WEKA: <link href="https://weka.sourceforge.io/doc.stable-3-8/weka/classifiers/meta/FilteredClassifier.html" color="#007F82">FilteredClassifier y opciones J48</link>. '
    'WEKA: <link href="https://weka.sourceforge.io/doc.stable/weka/classifiers/trees/J48.html" color="#007F82">distribución de clases J48</link>. '
    'scikit-learn: <link href="https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html" color="#007F82">separación temporal y gap</link>. '
    'Se consultaron como documentación técnica; no se entrenó con scikit-learn.','SmallSQ')
add('Datos y cálculo: generador de Stock Quest (semilla 20261125), control_pares.json, metricas_modelo.json y '
    'validacion_entrega.json incluidos en el paquete. Informe elaborado el 25/11/2026.','SmallSQ')

path=OUT/'StockQuest-Refuerzo-Aprendizaje-7dias.pdf'
doc=SimpleDocTemplate(str(path),pagesize=(595.2756,841.8898),rightMargin=44,leftMargin=44,
    topMargin=58,bottomMargin=56,title='Stock Quest - Diagnóstico y refuerzo a siete días',
    author='Stock Quest | Laboratorio de analítica',subject='Contraste sintético y evaluación temporal WEKA')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(str(path).removeprefix('\\\\?\\'))
