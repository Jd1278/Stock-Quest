"""Dataset sintetico de diagnostico actual, sin consultar usuarios ni bases reales."""
from pathlib import Path
from datetime import date, timedelta
from collections import Counter, deque
from statistics import mean
import csv
import hashlib
import json
import math
import random

ROOT = Path(__file__).resolve().parent
SEED = 20261125
LEARNERS = 2000
WEEKS = 25
END = date(2026,11,24)
FIRST_CUT = END-timedelta(days=7*(WEEKS-1))
START = FIRST_CUT-timedelta(days=6)
NAMES = ['id_aprendiz_sintetico','fecha_corte','modulo','nota_diagnostica_inicial',
    'lecciones_asignadas','lecciones_completadas','minutos_estudio_7dias',
    'intentos_desafio_7dias','nota_media_desafios_7dias','acierto_primer_intento_7dias',
    'simulaciones_completadas_7dias','puntaje_medio_simulaciones_7dias',
    'dias_desde_ultima_actividad','mejora_semanal','nivel_actual']
LEVELS = ['inicial','intermedio','avanzado']
MODULES = [f'M{i:02d}' for i in range(1,10)]
TYPES = ['string','date "yyyy-MM-dd"','{'+','.join(MODULES)+'}']+['numeric']*11+['{'+','.join(LEVELS)+'}']
assert len(NAMES)==len(TYPES)==15

def writer(name, header):
    f=(ROOT/name).open('w',encoding='utf-8',newline='')
    w=csv.writer(f,lineterminator='\n');w.writerow(header)
    return f,w

def dump_dataset(stem, rows, unknown=False):
    stem.parent.mkdir(parents=True,exist_ok=True)
    with stem.with_suffix('.csv').open('w',encoding='utf-8',newline='') as cf, stem.with_suffix('.arff').open('w',encoding='utf-8',newline='') as af:
        cw=csv.writer(cf,lineterminator='\n');aw=csv.writer(af,lineterminator='\n')
        cw.writerow(NAMES)
        af.write('% Datos sinteticos. Nivel actual por modulo, no XP ni nivel futuro.\n@relation diagnostico_actual_stockquest\n\n')
        for name,typ in zip(NAMES,TYPES):af.write(f'@attribute {name} {typ}\n')
        af.write('\n@data\n')
        for row in rows:
            out=list(row)
            if unknown:out[-1]='?'
            cw.writerow(out);aw.writerow(out)

def clip(x,lo=0,hi=1):return min(hi,max(lo,x))
def score(rng,knowledge,n,difficulty):
    # Evaluacion con preguntas nuevas; independiente de los aciertos de practica.
    p=clip(.04+.93*knowledge-.055*difficulty,.03,.98)
    hits=sum(rng.random()<p for _ in range(n))
    return hits,hits*100/n

def generate(module_titles):
    ROOT.mkdir(parents=True,exist_ok=True)
    ids=[f'A{i:04d}' for i in range(1,LEARNERS+1)]
    order=list(ids);random.Random(SEED+777).shuffle(order)
    split_by_id={x:'entrenamiento' if i<1400 else 'validacion' if i<1700 else 'prueba' for i,x in enumerate(order)}
    daily_file,daily=writer('actividad_diaria_sintetica.csv',[
        'fecha','id_aprendiz_sintetico','modulo','minutos','intentos','suma_notas_intentos',
        'sesiones_practica','primeros_intentos_correctos','simulaciones','suma_puntajes_simulacion',
        'lecciones_completadas_acumuladas'])
    ref_file,reference=writer('referencia_evaluacion_NO_USAR_COMO_PREDICTOR.csv',[
        'id_aprendiz_sintetico','fecha_corte','modulo','preguntas_nuevas','aciertos',
        'nota_evaluacion_actual','nivel_actual','particion'])
    rows=[];profiles=[]
    for number,learner in enumerate(ids,1):
        rng_person=random.Random(SEED+number*1009)
        prior=rng_person.uniform(.12,.90)
        engagement=rng_person.betavariate(2.4,1.8)
        efficiency=rng_person.uniform(.010,.034)
        forgetting=rng_person.uniform(.0015,.006)
        profiles.append([learner,split_by_id[learner]])
        assignments=[(number-1)%9,((number-1)%9+4)%9]
        for mi in assignments:
            rng=random.Random(SEED+number*1009+mi*47)
            module=MODULES[mi]
            difficulty=[.1,.25,.15,.6,.65,.55,.35,.45,.2][mi]
            knowledge=clip(prior+rng.gauss(0,.09),.05,.96)
            _,pretest=score(rng,knowledge,10,difficulty)
            completed=0
            last_active=None
            events=deque(maxlen=7)
            prev_mean=None
            for day_index in range(WEEKS*7):
                day=START+timedelta(days=day_index)
                knowledge=clip(knowledge-forgetting*knowledge)
                active=rng.random()<clip(.08+.78*engagement-(.12 if day.weekday()>=5 else 0),.03,.95)
                minutes=attempts=score_sum=sessions=first_correct=simulations=sim_sum=0
                if active:
                    minutes=max(4,min(95,round(rng.lognormvariate(2.8,.5))))
                    sessions=rng.choices([0,1,2,3],[.18,.42,.30,.10])[0]
                    for session in range(sessions):
                        # Practicas con hasta cuatro intentos; lectura y repeticion no equivalen a dominio.
                        p=clip(.12+.80*knowledge-.07*difficulty,.08,.95)
                        hit=False
                        for attempt in range(4):
                            correct=rng.random()<clip(p+.07*attempt,.05,.98)
                            attempts+=1;score_sum+=100*int(correct)
                            if attempt==0:first_correct+=int(correct)
                            if correct:
                                hit=True
                                break
                        if hit and not completed and rng.random()<.65:completed=1
                    simulations=int(rng.random()<.23)
                    if simulations:sim_sum=round(clip(.08+.85*knowledge-.08*difficulty+rng.gauss(0,.10))*100)
                    fatigue=.6 if minutes>55 else 1
                    knowledge=clip(knowledge+efficiency*(math.sqrt(minutes)/4)*(1-knowledge)*(1-.25*difficulty)*fatigue)
                    last_active=day
                event=[day.isoformat(),learner,module,minutes,attempts,score_sum,sessions,first_correct,simulations,sim_sum,completed]
                daily.writerow(event);events.append(event)
                if day_index%7!=6:continue
                att=sum(e[4] for e in events);ses=sum(e[6] for e in events);sim=sum(e[8] for e in events)
                avg=round(sum(e[5] for e in events)/att,6) if att else '?'
                accuracy=round(sum(e[7] for e in events)/ses,6) if ses else '?'
                sim_avg=round(sum(e[9] for e in events)/sim,6) if sim else '?'
                improvement=round(avg-prev_mean,6) if avg!='?' and prev_mean is not None else '?'
                inactive=(day-last_active).days if last_active is not None else '?'
                hits,current=score(rng,knowledge,20,difficulty)
                level='inicial' if current<60 else 'intermedio' if current<80 else 'avanzado'
                row=[learner,day.isoformat(),module,pretest,1,completed,sum(e[3] for e in events),
                    att,avg,accuracy,sim,sim_avg,inactive,improvement,level]
                assert len(row)==15
                rows.append(row)
                reference.writerow([learner,day.isoformat(),module,20,hits,current,level,split_by_id[learner]])
                prev_mean=avg if avg!='?' else None
    daily_file.close();ref_file.close()
    rows.sort(key=lambda r:(r[1],r[0],r[2]))
    dump_dataset(ROOT/'diagnostico_actual_100000_15',rows)
    split_counts={}
    for split in ['entrenamiento','validacion','prueba']:
        selected=[r for r in rows if split_by_id[r[0]]==split]
        dump_dataset(ROOT/'weka'/split,selected)
        split_counts[split]={'rows':len(selected),'learners':len({r[0] for r in selected}),
            'levels':dict(Counter(r[-1] for r in selected))}
    latest=[r for r in rows if r[1]==END.isoformat()]
    dump_dataset(ROOT/'weka'/'diagnosticar_ultimo_corte',latest,unknown=True)
    f,w=writer('particiones_aprendices.csv',['id_aprendiz_sintetico','particion']);w.writerows(profiles);f.close()
    f,w=writer('catalogo_modulos.csv',['codigo_sintetico','titulo_stockquest','lecciones_asignadas_en_esta_simulacion'])
    w.writerows([[MODULES[i],title,1] for i,title in enumerate(module_titles)]);f.close()
    descriptions=[
        'ID ficticio de trazabilidad; retirar antes de modelar.',
        'Cierre semanal; la actividad agregada precede la evaluacion de ese corte.',
        'Uno de los nueve temas de Stock Quest, con codigo sintetico.',
        'Pretest inicial de diez preguntas, anterior a la actividad del periodo.',
        'Una leccion por modulo en el contenido actual de la aplicacion.',
        'Acumulado no decreciente, de cero a una leccion.',
        'Minutos simulados de actividad en este modulo durante siete dias.',
        'Todos los intentos, correctos o incorrectos, en siete dias.',
        'Media de notas 0/100 de los intentos; ? si no hubo intentos.',
        'Proporcion de primeras respuestas correctas por sesion de practica; ? si no hubo sesiones.',
        'Numero de simulaciones didacticas asignadas a este modulo; vinculacion propuesta.',
        'Media de puntajes de esas simulaciones; ? si no hubo simulaciones.',
        'Dias desde la ultima actividad del modulo; ? si nunca hubo actividad.',
        'Diferencia de medias de desafios entre dos semanas; ? si falta alguna de ellas.',
        'Etiqueta de evaluacion independiente actual: <60 inicial, [60,80) intermedio, >=80 avanzado.'
    ]
    f,w=writer('diccionario_campos.csv',['posicion','campo','tipo_arff','descripcion'])
    w.writerows([[i+1,n,t,d] for i,(n,t,d) in enumerate(zip(NAMES,TYPES,descriptions))]);f.close()
    train_levels=Counter(r[-1] for r in rows if split_by_id[r[0]]=='entrenamiento')
    majority=train_levels.most_common(1)[0][0]
    baseline={s:round(c['levels'].get(majority,0)/c['rows'],6) for s,c in split_counts.items() if s!='entrenamiento'}
    metadata={'synthetic':True,'seed':SEED,'rows':len(rows),'fields':15,'learners':LEARNERS,
        'modulesAvailable':9,'modulesPerLearner':2,'weeklyCutsPerLearnerModule':25,
        'activityStart':START.isoformat(),'firstCut':FIRST_CUT.isoformat(),'lastCut':END.isoformat(),
        'levels':dict(Counter(r[-1] for r in rows)),'splits':split_counts,
        'latestUnknownCases':len(latest),'intentionalDirtyData':False,
        'missingPolicy':'? means no observation or insufficient prior window, not an invalid zero',
        'referenceRubric':{'assessmentItems':20,'initial':'score < 60','intermediate':'60 <= score < 80','advanced':'score >= 80',
            'validatedByEducator':False,'note':'Didactic provisional labels; not psychometrically validated proficiency'},
        'applicationAlignment':{'existing':['module titles','lesson completions','challenge attempts and scores','simulation results'],
            'proposedInstrumentation':['study minutes','initial pretest','new independent diagnostic assessment','first-attempt-per-session metric','simulation-to-module association'],
            'practiceBank':'Synthetic additional practice questions; production currently has one challenge per lesson'},
        'evaluationScope':'Current mastery in unseen learners in the same synthetic period; not a 7-day forecast',
        'majorityBaseline':{'classFromTraining':majority,'accuracy':baseline,'trainedWEKAModel':False},
        'futurePhase':{'target7DaysCreated':False,'possiblePairedRowsWithinHistory':96000,
            'latestRowsWithoutFutureAssessment':4000,'note':'Preserve dated assessments for later pairing; do not invent last-week future labels'},
        'sha256':{}}
    for file in sorted(ROOT.rglob('*')):
        if file.is_file() and file.suffix in ('.csv','.arff'):
            metadata['sha256'][file.relative_to(ROOT).as_posix()]=hashlib.sha256(file.read_bytes()).hexdigest()
    (ROOT/'control_generacion.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:metadata[k] for k in ['rows','fields','learners','firstCut','lastCut','levels','splits','majorityBaseline']},ensure_ascii=False,indent=2))

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser()
    parser.add_argument('--content',type=Path,default=ROOT.parents[1]/'content'/'stockquest.json')
    args=parser.parse_args()
    content=json.loads(args.content.read_text(encoding='utf-8'))
    titles=[x['title'] for x in content['lessons']]
    if len(titles)!=9:raise ValueError('Se esperaban los nueve modulos del contenido actual.')
    generate(titles)
