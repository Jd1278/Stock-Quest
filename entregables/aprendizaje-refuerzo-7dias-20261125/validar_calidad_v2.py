from pathlib import Path
from collections import Counter
from statistics import mean
from datetime import date,timedelta
import csv,json,os,hashlib
ROOT=Path(__file__).resolve().parent
if os.name=='nt' and not str(ROOT).startswith('\\\\?\\'):ROOT=Path('\\\\?\\'+str(ROOT))
def read(p):
    with (ROOT/p).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def key(r):return r['id_aprendiz_sintetico'],r['fecha_corte'],r.get('modulo',r.get('modulo_canonico')).upper()
def number(v):return None if v=='?' else float(v)
def main():
    meta=json.loads((ROOT/'control_calidad_v2.json').read_text(encoding='utf-8'))
    stats=json.loads((ROOT/'limpios/parametros_limpieza.json').read_text(encoding='utf-8'))
    assert stats['trainingRows']==64000 and not stats['usesAuditOrGoldenReference']
    datasets={};summary={}
    for label,stem in [('actual','diagnostico_actual_100000_15'),('futuro','diagnostico_7dias_despues_100000_15')]:
        raw=read(stem+'.csv');base=read('referencia_sin_contaminar/'+stem+'.csv');clean=read('limpios/'+stem+'_limpio.csv')
        audit=read(f'auditoria_{label}_NO_USAR_COMO_PREDICTOR.csv')
        assert len(raw)==len(base)==len(clean)==len(audit)==100000
        assert len({key(r) for r in raw})==100000
        groups=Counter(a['grupo'] for a in audit);assert groups=={'sin_alteracion':80000,'atipico':10000,'sucio':10000}
        changes=[];natural=0
        for r,b,c,a in zip(raw,base,clean,audit):
            assert len(r)==len(c)==15 and key(r)==key(b)==key(c)==key(a)
            modified=[n for n in r if r[n]!=b[n]]
            assert len(modified)==(0 if a['grupo']=='sin_alteracion' else 1)
            if modified:assert modified==[a['campo']] and r[a['campo']]==a['valor_crudo'] and b[a['campo']]==a['valor_base']
            assert r['nivel_actual']==b['nivel_actual']==c['nivel_actual']
            assert c['modulo'] in [f'M{i:02d}' for i in range(1,10)]
            assert not any(v=='?' for v in c.values())
            assert 0<=float(c['nota_media_desafios_7dias'])<=100
            assert 0<=float(c['puntaje_medio_simulaciones_7dias'])<=100
            assert 0<=float(c['acierto_primer_intento_7dias'])<=1
            assert 0<=float(c['minutos_estudio_7dias'])<=stats['upperFence']
            for i,n in enumerate(r):
                if i<3 or i==14:changed=r[n]!=c[n]
                else:changed=r[n]=='?' or abs(float(r[n])-float(c[n]))>1.1e-6
                if not changed:continue
                if r[n]=='?':reason='faltante_preexistente_imputado';natural+=1
                elif a['grupo']!='sin_alteracion' and n==a['campo']:reason=a['tipo_error']
                else:raise AssertionError(('Unexpected alteration',key(r),n,r[n],c[n]))
                changes.append([r['id_aprendiz_sintetico'],r['fecha_corte'],c['modulo'],n,r[n],c[n],reason])
        reasons=Counter(r[-1] for r in changes)
        for typ in ['puntaje_negativo','nota_mayor_100','proporcion_mayor_1','modulo_minusculas']:assert reasons[typ]==2500
        assert reasons['minutos_extremos']==10000
        with (ROOT/f'limpios/auditoria_cambios_{label}.csv').open('w',encoding='utf-8',newline='') as f:
            w=csv.writer(f,lineterminator='\n');w.writerow(['id_aprendiz_sintetico','fecha_corte','modulo','campo','valor_crudo','valor_limpio','motivo']);w.writerows(changes)
        assert stats['diagnosticOutliers'][stem]==10000
        summary[label]={'rawRows':100000,'cleanRows':100000,'fields':15,'rawGroups':dict(groups),
            'outliersDetectedAndRepaired':10000,'dirtyRowsRepaired':10000,
            'preexistingMissingCellsImputed':natural,'changesByReason':dict(reasons),'remainingMissingCells':0}
        datasets[label]=(raw,clean)
    rawnow={key(r):r for r in datasets['actual'][0]};rawnext={key(r):r for r in datasets['futuro'][0]}
    shared=rawnow.keys()&rawnext.keys();assert len(shared)==96000
    cleannow={key(r):r for r in datasets['actual'][1]};cleannext={key(r):r for r in datasets['futuro'][1]}
    for k in shared:assert rawnow[k]==rawnext[k] and cleannow[k]==cleannext[k]
    for a,b in zip(datasets['actual'][0],datasets['futuro'][0]):
        assert (date.fromisoformat(b['fecha_corte'])-date.fromisoformat(a['fecha_corte'])).days==7
        assert a['id_aprendiz_sintetico']==b['id_aprendiz_sintetico'] and a['modulo'].upper()==b['modulo'].upper()
    train=read('weka/entrenamiento.csv');cleantrain=read('limpios/weka/entrenamiento.csv');assert len(train)==len(cleantrain)==64000
    for pos,lo,hi in [(9,0,100),(10,0,1),(12,0,100)]:
        n=list(train[0])[pos-1];values=[float(r[n]) for r in train if r[n]!='?' and lo<=float(r[n])<=hi]
        expected=mean(values);assert abs(expected-stats['firstImputationMeansByOneBasedAttribute'][str(pos)])<1e-8
        for a,b in zip(train,cleantrain):
            if a[n]=='?' or not lo<=float(a[n])<=hi:assert abs(float(b[n])-expected)<1.1e-6
    validminutes=[float(r['minutos_estudio_7dias']) for r in train if float(r['minutos_estudio_7dias'])<=stats['upperFence']]
    assert abs(mean(validminutes)-stats['imputedMinutesMean'])<1e-8
    assert stats['trainingOutliers']==6400
    assert max(float(r['minutos_estudio_7dias']) for r in read('referencia_sin_contaminar/diagnostico_actual_100000_15.csv'))<stats['upperFence']<5000
    rawpairs=read('modelado/refuerzo_7dias_100000_15.csv');assert len(rawpairs)==100000
    for a,b,p in zip(datasets['actual'][0],datasets['futuro'][0],rawpairs):
        for n in list(a)[:-1]:assert p[n]==a[n]
        assert p['requiere_refuerzo_7dias']==('si' if b['nivel_actual']=='inicial' else 'no')
    for filename,sha in meta['hashes'].items():assert hashlib.sha256((ROOT/filename).read_bytes()).hexdigest()==sha,filename
    model=json.loads((ROOT/'resultados/metricas_modelo.json').read_text(encoding='utf-8'))
    assert model['datasetVersion']==2 and model['cleaningApplied'] and not model['testUsedToTune']
    predictions=read('resultados/predicciones_ultimo_corte_4000.csv')
    people=read('resultados/priorizacion_2000_aprendices.csv')
    assert len(predictions)==4000 and len(people)==2000
    for p in predictions:
        assert p['fecha_corte']=='2026-11-24' and p['fecha_objetivo']=='2026-12-01'
        assert p['alerta_refuerzo']==('si' if float(p['probabilidad_modelo_no_calibrada'])>=model['selectedThreshold'] else 'no')
    assert sum(p['alerta_refuerzo']=='si' for p in predictions)==model['latest']['moduleAlerts']
    assert sum(p['requiere_revision']=='si' for p in people)==model['latest']['learnersWithAtLeastOneAlert']
    m=model['metrics']['prueba']['model'];assert m['TP']+m['TN']+m['FP']+m['FN']==16000
    assert m['TP']+m['FN']==m['positives']==4511
    pairs=json.loads((ROOT/'control_pares.json').read_text(encoding='utf-8'))['splits']
    assert pairs['entrenamiento']['labelLast']<pairs['validacion']['featureFirst']
    assert pairs['validacion']['labelLast']<pairs['prueba']['featureFirst']
    result={'status':'PASS','version':2,'datasets':summary,'sharedRawAndCleanObservations':96000,
        'pairedExactly7Days':100000,'imputationMeansIndependentlyRecomputedFromTraining':True,
        'allRawDataHashesVerified':True,'futureFeaturesOutsidePredictors':True,
        'predictionsChecked':4000,'learnersChecked':2000,'temporalGapsChecked':True,
        'labelsPreserved':True,'cleaningRestoresOriginalTrueValues':False,
        'note':'Imputation estimates damaged/missing values; it does not recover lost true measurements.'}
    (ROOT/'validacion_calidad_v2.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
