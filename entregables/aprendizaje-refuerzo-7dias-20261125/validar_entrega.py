from pathlib import Path
from datetime import date,timedelta
from collections import Counter,defaultdict
import csv,json,hashlib,os

ROOT=Path(__file__).resolve().parent
if os.name=='nt' and not str(ROOT).startswith('\\\\?\\'):ROOT=Path('\\\\?\\'+str(ROOT))
def read(path):
    with (ROOT/path).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def key(r):return r['id_aprendiz_sintetico'],r.get('fecha_corte',r.get('fecha_actual')),r['modulo']
def main():
    meta=json.loads((ROOT/'control_pares.json').read_text(encoding='utf-8'))
    current=read('diagnostico_actual_100000_15.csv');future=read('diagnostico_7dias_despues_100000_15.csv')
    pairs=read('modelado/refuerzo_7dias_100000_15.csv');contrast=read('contraste_actual_vs_7dias_100000.csv')
    ref=read('referencia_evaluaciones_104000_NO_PREDICTORES.csv');refs={key(r):r for r in ref}
    originals={key(r):r for r in current};seen=set();overlap=0
    assert len(current)==len(future)==len(pairs)==len(contrast)==100000
    assert len(originals)==100000 and len(refs)==104000
    for a,b,p,c in zip(current,future,pairs,contrast):
        assert len(a)==len(b)==len(p)==15
        assert a['id_aprendiz_sintetico']==b['id_aprendiz_sintetico'] and a['modulo']==b['modulo']
        assert date.fromisoformat(b['fecha_corte'])-date.fromisoformat(a['fecha_corte'])==timedelta(days=7)
        assert key(a)==key(p)==key(c) and key(a) not in seen;seen.add(key(a))
        for n in list(a)[:-1]:assert p[n]==a[n]
        ra,rb=refs[key(a)],refs[key(b)]
        for r in [ra,rb]:
            assert int(r['preguntas_nuevas'])==20 and int(r['aciertos'])*5==float(r['nota_evaluacion_actual'])
            label='inicial' if float(r['nota_evaluacion_actual'])<60 else 'intermedio' if float(r['nota_evaluacion_actual'])<80 else 'avanzado'
            assert label==r['nivel_actual']
        assert a['nivel_actual']==ra['nivel_actual'] and b['nivel_actual']==rb['nivel_actual']
        target='si' if rb['nivel_actual']=='inicial' else 'no'
        assert p['requiere_refuerzo_7dias']==target==c['requiere_refuerzo_7dias_referencia']
        assert c['fecha_objetivo']==b['fecha_corte']
        assert c['nivel_actual_referencia']==a['nivel_actual'] and c['nivel_7dias_referencia']==b['nivel_actual']
        assert float(c['cambio_puntos'])==float(rb['nota_evaluacion_actual'])-float(ra['nota_evaluacion_actual'])
        if key(b) in originals:assert b==originals[key(b)];overlap+=1
    assert overlap==96000
    assigned=set()
    for split,detail in meta['splits'].items():
        rows=read('weka/'+split+'.csv');assert len(rows)==detail['rows']
        for r in rows:
            assert key(r) not in assigned;assigned.add(key(r))
            assert detail['featureFirst']<=r['fecha_corte']<=detail['featureLast']
    assert assigned==seen
    unknown=read('weka/predecir_ultimo_corte_4000.csv');assert len(unknown)==4000
    for r in unknown:
        assert r['fecha_corte']=='2026-11-24' and r['requiere_refuerzo_7dias']=='?'
        for n in list(r)[:-1]:assert r[n]==originals[key(r)][n]
    for name,sha in meta['hashes'].items():assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==sha,name
    # Reconciliar los indicadores nuevos del 1 de diciembre con 28.000 eventos diarios.
    daily=read('actividad_semana_adicional_28000.csv');groups=defaultdict(list)
    assert len(daily)==28000
    for r in daily:groups[r['id_aprendiz_sintetico'],r['modulo']].append(r)
    new=[r for r in future if r['fecha_corte']=='2026-12-01'];assert len(new)==4000
    for r in new:
        es=groups[r['id_aprendiz_sintetico'],r['modulo']];assert len(es)==7
        assert sorted(e['fecha'] for e in es)==[(date(2026,11,25)+timedelta(days=i)).isoformat() for i in range(7)]
        attempts=sum(int(e['intentos']) for e in es);sessions=sum(int(e['sesiones_practica']) for e in es);sims=sum(int(e['simulaciones']) for e in es)
        expected={'minutos_estudio_7dias':sum(int(e['minutos']) for e in es),
            'intentos_desafio_7dias':attempts,'simulaciones_completadas_7dias':sims,
            'nota_media_desafios_7dias':sum(float(e['suma_notas_intentos']) for e in es)/attempts if attempts else None,
            'acierto_primer_intento_7dias':sum(int(e['primeros_intentos_correctos']) for e in es)/sessions if sessions else None,
            'puntaje_medio_simulaciones_7dias':sum(float(e['suma_puntajes_simulacion']) for e in es)/sims if sims else None}
        for n,v in expected.items():
            assert r[n]=='?' if v is None else abs(float(r[n])-v)<1.1e-6
    report=json.loads((ROOT/'resultados/metricas_modelo.json').read_text(encoding='utf-8'))
    pred=read('resultados/predicciones_ultimo_corte_4000.csv');assert len(pred)==4000
    ids=read('resultados/priorizacion_2000_aprendices.csv');assert len(ids)==2000
    assert sum(r['alerta_refuerzo']=='si' for r in pred)==report['latest']['moduleAlerts']
    assert sum(r['requiere_revision']=='si' for r in ids)==report['latest']['learnersWithAtLeastOneAlert']
    for r in pred:
        assert r['alerta_refuerzo']==('si' if float(r['probabilidad_modelo_no_calibrada'])>=report['selectedThreshold'] else 'no')
    for m in [report['metrics']['prueba']['model'],report['metrics']['ultimo_corte']]:
        assert m['TP']+m['FP']+m['TN']+m['FN']==m['rows']
        assert m['TP']+m['FN']==m['positives']
    result={'status':'PASS','pairedRows':100000,'fieldsPerDataset':15,'priorRowsReconciled':96000,
        'newWeeklyCasesReconciledWithDailyEvents':4000,'newDailyEvents':28000,
        'temporalGapBetweenPartitions':True,'futureLabelsOutsideFeatures':True,
        'latestPredictions':4000,'learnersPrioritized':2000,
        'calibrationValidated':False,'realWorldValidation':False,
        'checks':['one-to-one learner/module pairing','exactly seven days','15 fields and original features preserved',
        'independent 20-item reference labels','nonoverlapping temporal partitions with gaps',
        'all exported data hashes','new weekly aggregates from daily events','prediction threshold and counts']}
    (ROOT/'validacion_entrega.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,indent=2))
if __name__=='__main__':main()
