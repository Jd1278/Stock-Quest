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
