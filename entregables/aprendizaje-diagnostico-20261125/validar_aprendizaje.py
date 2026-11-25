"""Verificacion independiente por agregacion de eventos y evaluaciones de referencia."""
from pathlib import Path
from datetime import date, timedelta
from collections import Counter,defaultdict
import csv
import hashlib
import json

ROOT=Path(__file__).resolve().parent
meta=json.loads((ROOT/'control_generacion.json').read_text(encoding='utf-8'))
def data(name):
    with (ROOT/name).open(encoding='utf-8',newline='') as f:
        yield from csv.DictReader(f)
def key(r):return (r['id_aprendiz_sintetico'],r['fecha_corte'],r['modulo'])
rows={};by_pair=defaultdict(list);labels=Counter()
for row in data('diagnostico_actual_100000_15.csv'):
    assert len(row)==15 and key(row) not in rows
    assert row['nivel_actual'] in ['inicial','intermedio','avanzado']
    assert 0<=int(row['lecciones_completadas'])<=int(row['lecciones_asignadas'])==1
    assert 0<=float(row['nota_diagnostica_inicial'])<=100
    for col in ['minutos_estudio_7dias','intentos_desafio_7dias','simulaciones_completadas_7dias']:
        assert int(row[col])>=0
    rows[key(row)]=row;by_pair[(row['id_aprendiz_sintetico'],row['modulo'])].append(row)
    labels[row['nivel_actual']]+=1
assert len(rows)==100000 and len(by_pair)==4000
assert len({k[0] for k in rows})==2000
for pair,items in by_pair.items():
    items.sort(key=lambda r:r['fecha_corte']);assert len(items)==25
    assert len({r['nota_diagnostica_inicial'] for r in items})==1
    for a,b in zip(items,items[1:]):
        assert date.fromisoformat(b['fecha_corte'])-date.fromisoformat(a['fecha_corte'])==timedelta(days=7)
        assert int(a['lecciones_completadas'])<=int(b['lecciones_completadas'])

# El diario esta ordenado por aprendiz/modulo/fecha; solo se conserva una semana.
current=None;week=[];last_active=None;previous_score=None;previous_date=None;events=0;checked_snapshots=0
for event in data('actividad_diaria_sintetica.csv'):
    pair=(event['id_aprendiz_sintetico'],event['modulo'])
    if pair!=current:
        assert not week
        current=pair;last_active=None;previous_score=None;previous_date=None
    today=date.fromisoformat(event['fecha'])
    if previous_date is not None:assert today-previous_date==timedelta(days=1)
    previous_date=today
    numeric={c:int(event[c]) for c in ['minutos','intentos','suma_notas_intentos','sesiones_practica',
        'primeros_intentos_correctos','simulaciones','suma_puntajes_simulacion','lecciones_completadas_acumuladas']}
    assert all(v>=0 for v in numeric.values())
    assert numeric['sesiones_practica']<=numeric['intentos']<=4*numeric['sesiones_practica']
    assert numeric['primeros_intentos_correctos']<=numeric['sesiones_practica']
    assert numeric['suma_notas_intentos']<=100*numeric['intentos']
    assert numeric['suma_puntajes_simulacion']<=100*numeric['simulaciones']
    if numeric['minutos']>0:last_active=today
    week.append(numeric);events+=1
    if len(week)!=7:continue
    row=rows[(pair[0],today.isoformat(),pair[1])]
    attempts=sum(x['intentos'] for x in week);sessions=sum(x['sesiones_practica'] for x in week);sim=sum(x['simulaciones'] for x in week)
    avg=sum(x['suma_notas_intentos'] for x in week)/attempts if attempts else None
    expected={'minutos_estudio_7dias':sum(x['minutos'] for x in week),'intentos_desafio_7dias':attempts,
        'nota_media_desafios_7dias':avg,'acierto_primer_intento_7dias':sum(x['primeros_intentos_correctos'] for x in week)/sessions if sessions else None,
        'simulaciones_completadas_7dias':sim,'puntaje_medio_simulaciones_7dias':sum(x['suma_puntajes_simulacion'] for x in week)/sim if sim else None,
        'dias_desde_ultima_actividad':(today-last_active).days if last_active else None,
        'mejora_semanal':round(avg,6)-previous_score if avg is not None and previous_score is not None else None,
        'lecciones_completadas':week[-1]['lecciones_completadas_acumuladas']}
    for col,value in expected.items():
        if value is None:assert row[col]=='?',(col,row[col])
        else:assert abs(float(row[col])-value)<1.1e-6,(col,row[col],value)
    previous_score=round(avg,6) if avg is not None else None
    checked_snapshots+=1;week=[]
assert events==700000 and checked_snapshots==100000 and not week

reference_seen=set()
for r in data('referencia_evaluacion_NO_USAR_COMO_PREDICTOR.csv'):
    k=key(r);assert k not in reference_seen;reference_seen.add(k)
    assert int(r['preguntas_nuevas'])==20 and 0<=int(r['aciertos'])<=20
    score=int(r['aciertos'])*5;assert score==float(r['nota_evaluacion_actual'])
    label='inicial' if score<60 else 'intermedio' if score<80 else 'avanzado'
    assert label==r['nivel_actual']==rows[k]['nivel_actual']
assert len(reference_seen)==100000

splits={};split_keys={}
for split,n,learners in [('entrenamiento',70000,1400),('validacion',15000,300),('prueba',15000,300)]:
    selected=list(data(f'weka/{split}.csv'));assert len(selected)==n
    ids={r['id_aprendiz_sintetico'] for r in selected};assert len(ids)==learners
    for r in selected:assert r==rows[key(r)]
    splits[split]=ids;split_keys[split]={key(r) for r in selected}
assert not(splits['entrenamiento']&splits['validacion'] or splits['entrenamiento']&splits['prueba'] or splits['validacion']&splits['prueba'])
assert set.union(*split_keys.values())==set(rows)
unknown=list(data('weka/diagnosticar_ultimo_corte.csv'));assert len(unknown)==4000
for r in unknown:
    assert r['nivel_actual']=='?' and r['fecha_corte']==meta['lastCut']
    for col in r:
        if col!='nivel_actual':assert r[col]==rows[key(r)][col]
for filename,sha in meta['sha256'].items():assert hashlib.sha256((ROOT/filename).read_bytes()).hexdigest()==sha
missing=Counter(col for r in rows.values() for col,v in r.items() if v=='?')
result={'status':'PASS','rows':100000,'fields':15,'learners':2000,'learnerModulePairs':4000,
    'snapshotsPerPair':25,'dailyEventsReconciled':events,'weeklyAggregatesReconciled':checked_snapshots,
    'labelsFromIndependentAssessmentReconciled':100000,'classCounts':dict(labels),'missingByField':dict(missing),
    'learnersDisjointAcrossSplits':True,'unknownCurrentDiagnosisCases':4000,
    'checks':['unique learner/module/cut','consecutive weekly dates','nondecreasing lesson completion',
        'weekly features reconstructed from preceding daily activity','scores only missing without observations',
        'labels verified against held-out current assessment','no current assessment score among predictors',
        'no learner overlap across splits','all CSV/ARFF SHA-256 verified'],
    'WEKAModelTrained':False,'educatorRubricValidation':False,'future7DayForecastCreated':False}
(ROOT/'validacion_diagnostico.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
