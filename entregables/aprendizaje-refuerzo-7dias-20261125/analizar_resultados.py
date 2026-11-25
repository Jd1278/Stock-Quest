from pathlib import Path
from collections import Counter, defaultdict
from datetime import date,timedelta
import csv, json, math, shutil, os

ROOT=Path(__file__).resolve().parent
if os.name=='nt' and not str(ROOT).startswith('\\\\?\\'):ROOT=Path('\\\\?\\'+str(ROOT))
def read(p):
    with p.open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def dump(p,obj):p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def write(p,rows):
    with p.open('w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator='\n');w.writeheader();w.writerows(rows)
def key(r):return r['id_aprendiz_sintetico'],r.get('fecha_corte',r.get('fecha_actual')),r['modulo']

def metrics(y,p,t):
    tp=sum(a and b>=t for a,b in zip(y,p));fn=sum(a and b<t for a,b in zip(y,p))
    fp=sum(not a and b>=t for a,b in zip(y,p));tn=len(y)-tp-fn-fp
    div=lambda a,b:a/b if b else 0
    precision=div(tp,tp+fp);recall=div(tp,tp+fn)
    groups=defaultdict(lambda:[0,0])
    for a,b in zip(y,p):groups[b][int(a)]+=1
    pos=sum(y);neg=len(y)-pos;cumpos=cumneg=area=ap=0
    for _,(n0,n1) in sorted(groups.items(),reverse=True):
        oldpos,oldneg=cumpos,cumneg;cumpos+=n1;cumneg+=n0
        area+=(cumneg-oldneg)*(oldpos+cumpos)/2
        ap+=div(n1,pos)*div(cumpos,cumpos+cumneg)
    return {'rows':len(y),'positives':pos,'alerts':tp+fp,'TP':tp,'FN':fn,'FP':fp,'TN':tn,
        'accuracy':div(tp+tn,len(y)),'precision':precision,'recall':recall,
        'specificity':div(tn,tn+fp),'F1':div(2*precision*recall,precision+recall),
        'F2':div(5*precision*recall,4*precision+recall),'ROC_AUC':div(area,pos*neg),
        'average_precision':ap,'Brier':sum((a-b)**2 for a,b in zip(y,p))/len(y)}

def main():
    contrast=read(ROOT/'contraste_actual_vs_7dias_100000.csv');by_key={key(r):r for r in contrast}
    results=ROOT/'resultados';candidates=[]
    # Elegir exclusivamente con validacion, sin consultar las etiquetas de prueba.
    for minimum in [20,100]:
        val=read(results/f'M{minimum}/validacion_probabilidades.csv')
        y=[r['clase_referencia']=='si' for r in val];p=[float(r['probabilidad_refuerzo']) for r in val]
        for i in range(1,20):
            t=i/20;m=metrics(y,p,t)
            candidates.append({'minNumObj':minimum,'threshold':t,'validation':m})
    best=max(candidates,key=lambda x:(x['validation']['F2'],x['validation']['precision'],x['threshold'],x['minNumObj']))
    dump(results/'seleccion_solo_validacion.json',{'criterion':'Maximum validation F2 on predefined minNumObj={20,100}, threshold=0.05..0.95; recall weighted four times in F2',
        'testLabelsUsedForSelection':False,'candidates':candidates,'selected':best})
    minimum=best['minNumObj'];threshold=best['threshold'];chosen=results/f'M{minimum}'
    shutil.copy2(chosen/'refuerzo.model',results/'refuerzo_7dias.model')
    shutil.copy2(chosen/'arbol.txt',results/'arbol_seleccionado.txt')
    summaries={}
    train=read(ROOT/'weka/entrenamiento.csv')
    train_prevalence=sum(r['requiere_refuerzo_7dias']=='si' for r in train)/len(train)
    for split in ['validacion','prueba']:
        data=read(chosen/f'{split}_probabilidades.csv')
        y=[r['clase_referencia']=='si' for r in data];p=[float(r['probabilidad_refuerzo']) for r in data]
        persist=[int(by_key[key(r)]['nivel_actual_referencia']=='inicial') for r in data]
        constant=[train_prevalence]*len(y)
        summaries[split]={'model':metrics(y,p,threshold),
            'majorityBaseline':metrics(y,constant,.5),
            'alertEveryoneBaseline':metrics(y,[1.0]*len(y),.5),
            'persistenceWithIndependentCurrentAssessment':metrics(y,persist,.5)}
        for r in data:
            assert r['clase_referencia']==by_key[key(r)]['requiere_refuerzo_7dias_referencia']
    latest=read(chosen/'predecir_ultimo_corte_4000_probabilidades.csv');predictions=[]
    for r in latest:
        assert r['clase_referencia']=='?'
        c=by_key[key(r)];p=float(r['probabilidad_refuerzo']);alert=p>=threshold
        # Reference fields appended only AFTER score generation for synthetic audit.
        predictions.append({'id_aprendiz_sintetico':r['id_aprendiz_sintetico'],'modulo':r['modulo'],
            'fecha_corte':r['fecha_corte'],'fecha_objetivo':c['fecha_objetivo'],
            'probabilidad_modelo_no_calibrada':p,'umbral_alerta':threshold,
            'alerta_refuerzo':'si' if alert else 'no','nivel_actual_referencia':c['nivel_actual_referencia'],
            'nivel_7dias_referencia_sintetica':c['nivel_7dias_referencia'],
            'refuerzo_referencia_sintetica':c['requiere_refuerzo_7dias_referencia'],
            'accion_propuesta':'Revisar dificultad del modulo y ofrecer practica guiada' if alert else 'Seguimiento habitual; no garantiza ausencia de dificultad'})
    predictions.sort(key=lambda r:(-r['probabilidad_modelo_no_calibrada'],r['id_aprendiz_sintetico'],r['modulo']))
    write(results/'predicciones_ultimo_corte_4000.csv',predictions)
    alerts=[r for r in predictions if r['alerta_refuerzo']=='si']
    write(results/'alertas_refuerzo_por_modulo.csv',alerts)
    by_person=defaultdict(list)
    for r in predictions:by_person[r['id_aprendiz_sintetico']].append(r)
    people=[]
    for learner,rows in by_person.items():
        flagged=[r['modulo'] for r in rows if r['alerta_refuerzo']=='si']
        people.append({'id_aprendiz_sintetico':learner,'fecha_corte':rows[0]['fecha_corte'],
            'fecha_objetivo':rows[0]['fecha_objetivo'],'modulos_con_alerta':';'.join(flagged),
            'cantidad_modulos_con_alerta':len(flagged),
            'maximo_indice_riesgo_modulo':max(r['probabilidad_modelo_no_calibrada'] for r in rows),
            'requiere_revision':'si' if flagged else 'no'})
    people.sort(key=lambda r:(-r['maximo_indice_riesgo_modulo'],r['id_aprendiz_sintetico']))
    write(results/'priorizacion_2000_aprendices.csv',people)
    latest_y=[r['refuerzo_referencia_sintetica']=='si' for r in predictions]
    latest_p=[r['probabilidad_modelo_no_calibrada'] for r in predictions]
    summaries['ultimo_corte']=metrics(latest_y,latest_p,threshold)
    all_trans=Counter((r['nivel_actual_referencia'],r['nivel_7dias_referencia']) for r in contrast)
    new_risk=sum(r['nivel_actual_referencia']!='inicial' and r['requiere_refuerzo_7dias_referencia']=='si' for r in contrast)
    latest_new_risk=sum(r['nivel_actual_referencia']!='inicial' and r['refuerzo_referencia_sintetica']=='si' for r in predictions)
    new_alerts=[r for r in predictions if r['nivel_actual_referencia']!='inicial' and r['alerta_refuerzo']=='si']
    latest_current=Counter(r['nivel_actual_referencia'] for r in predictions)
    latest_future=Counter(r['nivel_7dias_referencia_sintetica'] for r in predictions)
    latest_transition=Counter((r['nivel_actual_referencia'],r['nivel_7dias_referencia_sintetica']) for r in predictions)
    model_report={'syntheticOnly':True,'weka':'3.8.6','algorithm':'FilteredClassifier(Remove 1-2, J48 Laplace C=.25)',
        'selectedMinNumObj':minimum,'selectedThreshold':threshold,'thresholdCriterion':'validation F2',
        'calibratedProbabilities':False,'trainingRows':64000,'trainingPrevalence':train_prevalence,
        'testUsedToTune':False,'metrics':summaries,'allPairedNewRiskCases':new_risk,
        'latest':{'cut':'2026-11-24','target':'2026-12-01','moduleCases':4000,'learners':2000,
            'moduleAlerts':len(alerts),'learnersWithAtLeastOneAlert':sum(r['requiere_revision']=='si' for r in people),
            'currentLevels':dict(latest_current),'futureLevels':dict(latest_future),
            'observedNewRiskSynthetic':latest_new_risk,'newAlertsAmongCurrentlyNonInitial':len(new_alerts),
            'detectedNewRiskSynthetic':sum(r['refuerzo_referencia_sintetica']=='si' for r in new_alerts),
            'top10Learners':people[:10],
            'learnersTiedAtHighestModuleRisk':sum(r['maximo_indice_riesgo_modulo']==people[0]['maximo_indice_riesgo_modulo'] for r in people),
            'transition':{a:{b:latest_transition[a,b] for b in ['inicial','intermedio','avanzado']} for a in ['inicial','intermedio','avanzado']}},
        'scope':'Later observations of same synthetic learners; probabilities uncalibrated; no real deployment or pedagogical certification',
        'persistenceBaselineCaveat':'Uses independent current assessment unavailable to this predictor; useful stronger reference, not identical information budget',
        'action':'Human review and optional practice; never punitive or automatic pass/fail decisions'}
    dump(results/'metricas_modelo.json',model_report)
    print(json.dumps(model_report,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
