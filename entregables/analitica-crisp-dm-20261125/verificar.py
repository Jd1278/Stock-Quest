"""Verificación independiente de particiones, métricas y recomendaciones."""
from pathlib import Path
import json,csv,math,hashlib
from html.parser import HTMLParser
P=Path(__file__).parent; S=P.parent/'historial-temporal-20261124'
def rows(p):
    with p.open(encoding='utf8',newline='') as f:return list(csv.DictReader(f))
checks=[]
m=rows(P/'metricas_regresion.csv')
for h in range(1,5):
    src=rows(S/f'weka/h{h}/prueba.csv'); pred=rows(P/f'predicciones/h{h}_prueba.csv')
    assert len(src)==len(pred)==15000
    for a,b in zip(src,pred):
        assert a['producto']==b['producto'] and a['almacen']==b['almacen']
        assert float(a['demanda_objetivo'])==float(b['real'])
        assert 426<=int(a['indice_tiempo_objetivo'])<=500
    mae=sum(abs(float(r['real'])-float(r['prediccion'])) for r in pred)/len(pred)
    recorded=next(float(r['MAE']) for r in m if r['h']==str(h) and r['particion']=='prueba' and r['modelo']=='RandomForest')
    assert abs(mae-recorded)<1e-10
    future=rows(P/f'predicciones/h{h}_predecir.csv');assert len(future)==200
    assert all(float(r['prediccion'])>=0 for r in future)
checks.append('Filas, claves, objetivos y MAE recomputados para h1-h4; 800 predicciones nuevas no negativas')
c=json.loads((P/'clasificacion.json').read_text());r=rows(P/'modelos/presion_prueba.csv');cm=[[0,0],[0,0]]
for row in r:
    y=int(float(row['actual']));p=float(row['probabilidad_si']);assert 0<=p<=1;cm[y][int(p>=c['umbral'])]+=1
assert cm==c['matriz_confusion']
# AUC por rangos promedio, independiente de sklearn.metrics.
pairs=sorted((float(x['probabilidad_si']),int(float(x['actual']))) for x in r)
npos=sum(y for _,y in pairs);rank_sum=0;i=0
while i<len(pairs):
    j=i+1
    while j<len(pairs) and pairs[j][0]==pairs[i][0]:j+=1
    rank_sum+=sum(y for _,y in pairs[i:j])*((i+1+j)/2);i=j
auc=(rank_sum-npos*(npos+1)/2)/(npos*(len(pairs)-npos));assert abs(auc-c['ROC_AUC'])<1e-12
checks.append('Matriz de confusión y AUC independientes de sklearn verificadas')
orders=rows(P/'pedidos_propuestos_simulacion.csv');assert len(orders)==200
for o in orders:
    q=math.ceil(max(0,sum(float(o[f'pronostico_h{h}']) for h in range(1,5))+float(o['stock_seguridad_modelo'])-float(o['stock_final'])-float(o['pedidos_pendientes'])))
    assert q==float(o['pedido_propuesto'])
checks.append('200 recomendaciones recalculadas; pedidos no negativos y sin doble conteo del baseline')
sha=hashlib.sha256((S/'historial_100000_15.csv').read_bytes()).hexdigest()
assert sha==json.loads((P/'resumen.json').read_text())['sha256_historial']
checks.append('SHA-256 de fuente original conservado')
class LinkCheck(HTMLParser):
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in ('href','src') and not value.startswith(('http','page:','#')):
                assert (P/value).exists(),value
LinkCheck().feed((P/'INFORME.html').read_text(encoding='utf8'))
checks.append('Enlaces y gráficas locales del informe existentes')
result={'status':'PASS','checks':checks,'GUI_ejecutada':False,'politica_replay_ejecutada':False,'despliegue':False}
(P/'verificacion.json').write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf8');print(json.dumps(result,indent=2,ensure_ascii=False))
