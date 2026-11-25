"""Continuacion reproducible de datos sinteticos; no conecta con bases reales."""
from pathlib import Path
from datetime import date, timedelta
from collections import Counter
import csv, json, hashlib, importlib.util, shutil, tempfile, os

ROOT = Path(__file__).resolve().parent
if os.name=='nt' and not str(ROOT).startswith('\\\\?\\'):ROOT=Path('\\\\?\\'+str(ROOT))
SOURCE = ROOT.parent / 'aprendizaje-diagnostico-20261125'
if not SOURCE.exists():SOURCE=ROOT

def read(path):
    with path.open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))

def write(path, names, rows, types=None, relation='stockquest_refuerzo_7dias'):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.with_suffix('.csv').open('w', encoding='utf-8', newline='') as f:
        w=csv.writer(f,lineterminator='\n');w.writerow(names);w.writerows(rows)
    if types:
        with path.with_suffix('.arff').open('w',encoding='utf-8',newline='') as f:
            f.write('% Exclusivamente sintetico. No representa resultados reales.\n@relation '+relation+'\n\n')
            for name,typ in zip(names,types): f.write(f'@attribute {name} {typ}\n')
            f.write('\n@data\n');csv.writer(f,lineterminator='\n').writerows(rows)

def key(r): return (r['id_aprendiz_sintetico'],r['fecha_corte'],r['modulo'])

def main():
    ROOT.mkdir(parents=True,exist_ok=True)
    original=read(SOURCE/'diagnostico_actual_100000_15.csv')
    names=list(original[0]);assert len(original)==100000 and len(names)==15
    meta_file=SOURCE/('control_generacion.json' if SOURCE!=ROOT else 'control_diagnostico_original.json')
    meta=json.loads(meta_file.read_text(encoding='utf-8'))
    for name in ['diagnostico_actual_100000_15.csv','diagnostico_actual_100000_15.arff','catalogo_modulos.csv']:
        assert hashlib.sha256((SOURCE/name).read_bytes()).hexdigest()==meta['sha256'][name],name
    generator_file=SOURCE/('generar_aprendizaje.py' if SOURCE!=ROOT else 'generador_diagnostico_original.py')
    spec=importlib.util.spec_from_file_location('original_generator',generator_file)
    gen=importlib.util.module_from_spec(spec);spec.loader.exec_module(gen)
    titles=[r['titulo_stockquest'] for r in read(SOURCE/'catalogo_modulos.csv')]
    original_by_key={key(r):r for r in original}
    assert len(original_by_key)==100000
    with tempfile.TemporaryDirectory(prefix='sq-future-') as temp:
        gen.ROOT=Path(temp)
        # Conservar START/FIRST_CUT y las semillas originales. Solo ampliar el final.
        gen.WEEKS=26;gen.END=date(2026,12,1)
        gen.generate(titles)
        extended=read(gen.ROOT/'diagnostico_actual_100000_15.csv')
        extended_by_key={key(r):r for r in extended}
        for k,r in original_by_key.items(): assert extended_by_key[k]==r,k
        ref=read(gen.ROOT/'referencia_evaluacion_NO_USAR_COMO_PREDICTOR.csv')
        ref_by_key={key(r):r for r in ref}
        ref_names=list(ref[0])
        write(ROOT/'referencia_evaluaciones_104000_NO_PREDICTORES',ref_names,([r[n] for n in ref_names] for r in ref))
        with (gen.ROOT/'actividad_diaria_sintetica.csv').open(encoding='utf-8',newline='') as f:
            daily=csv.DictReader(f);daily_names=daily.fieldnames
            new_daily=[[r[n] for n in daily_names] for r in daily if r['fecha']>'2026-11-24']
        assert len(new_daily)==28000
        write(ROOT/'actividad_semana_adicional_28000',daily_names,new_daily)
    future=[];pairs=[];contrast=[];inference=[];dates=sorted({r['fecha_corte'] for r in original})
    split_dates={'entrenamiento':dates[:16],'separacion_1':dates[16:17],
                 'validacion':dates[17:20],'separacion_2':dates[20:21],'prueba':dates[21:]}
    split_lookup={d:s for s,ds in split_dates.items() for d in ds}
    for row in original:
        target=(date.fromisoformat(row['fecha_corte'])+timedelta(days=7)).isoformat()
        fk=(row['id_aprendiz_sintetico'],target,row['modulo'])
        nxt=extended_by_key[fk];future.append([nxt[n] for n in names])
        current_ref=ref_by_key[key(row)];next_ref=ref_by_key[fk]
        risk='si' if float(next_ref['nota_evaluacion_actual'])<60 else 'no'
        assert (risk=='si')==(nxt['nivel_actual']=='inicial')
        pairs.append([row[n] for n in names[:-1]]+[risk])
        contrast.append([row['id_aprendiz_sintetico'],row['modulo'],row['fecha_corte'],target,
            current_ref['nota_evaluacion_actual'],next_ref['nota_evaluacion_actual'],
            row['nivel_actual'],nxt['nivel_actual'],
            float(next_ref['nota_evaluacion_actual'])-float(current_ref['nota_evaluacion_actual']),
            risk,split_lookup[row['fecha_corte']]])
        if row['fecha_corte']==dates[-1]: inference.append([row[n] for n in names[:-1]]+['?'])
    if SOURCE!=ROOT:
        for suffix in ['csv','arff']:
            shutil.copy2(SOURCE/f'diagnostico_actual_100000_15.{suffix}', ROOT/f'diagnostico_actual_100000_15.{suffix}')
        shutil.copy2(generator_file,ROOT/'generador_diagnostico_original.py')
        shutil.copy2(SOURCE/'catalogo_modulos.csv',ROOT/'catalogo_modulos.csv')
        shutil.copy2(meta_file,ROOT/'control_diagnostico_original.json')
    write(ROOT/'diagnostico_7dias_despues_100000_15',names,future,gen.TYPES,'nivel_observado_sintetico_t_mas_7')
    model_names=names[:-1]+['requiere_refuerzo_7dias'];model_types=gen.TYPES[:-1]+['{no,si}']
    write(ROOT/'modelado'/'refuerzo_7dias_100000_15',model_names,pairs,model_types)
    for split,ds in split_dates.items():
        selected=[r for r in pairs if r[1] in ds]
        write(ROOT/'weka'/split,model_names,selected,model_types)
    write(ROOT/'weka'/'predecir_ultimo_corte_4000',model_names,inference,model_types)
    cn=['id_aprendiz_sintetico','modulo','fecha_actual','fecha_objetivo','nota_actual_referencia',
        'nota_7dias_referencia','nivel_actual_referencia','nivel_7dias_referencia',
        'cambio_puntos','requiere_refuerzo_7dias_referencia','particion_temporal']
    write(ROOT/'contraste_actual_vs_7dias_100000',cn,contrast)
    distribution=Counter(r[7] for r in contrast);transition=Counter((r[6],r[7]) for r in contrast)
    split_summary={s:{'rows':4000*len(ds),'featureFirst':ds[0],'featureLast':ds[-1],
        'labelFirst':(date.fromisoformat(ds[0])+timedelta(days=7)).isoformat(),
        'labelLast':(date.fromisoformat(ds[-1])+timedelta(days=7)).isoformat()} for s,ds in split_dates.items()}
    assert split_summary['entrenamiento']['labelLast']<split_summary['validacion']['featureFirst']
    assert split_summary['validacion']['labelLast']<split_summary['prueba']['featureFirst']
    report={'synthetic':True,'seed':20261125,'rowsEachDiagnostic':100000,'fieldsEachDiagnostic':15,
        'originalRowsPreservedExactly':100000,'pairedExactly7Days':100000,'additionalDailyRows':28000,
        'sourceFeatureDates':[dates[0],dates[-1]],'futureObservationDates':[future[0][1],future[-1][1]],
        'riskDefinition':'independent synthetic assessment at t+7 < 60; provisional didactic rubric',
        'labelAt15':'requiere_refuerzo_7dias {no,si}',
        'predictors':'original fields 1-14 at t; Remove 1-2 excludes ID/date inside fitted model',
        'futureObservationsNeverUsedAsFeatures':True,'latestInferenceRows':len(inference),
        'currentDistribution':dict(Counter(r['nivel_actual'] for r in original)),
        'futureDistribution':dict(distribution),
        'transitionMatrix':{a:{b:transition[a,b] for b in gen.LEVELS} for a in gen.LEVELS},
        'splits':split_summary,'evaluationScope':'Same synthetic learners, later weeks; not unseen-learner or real-world validation',
        'hashes':{}}
    for p in sorted(ROOT.rglob('*')):
        if p.is_file() and p.suffix in ['.csv','.arff']:
            report['hashes'][p.relative_to(ROOT).as_posix()]=hashlib.sha256(p.read_bytes()).hexdigest()
    (ROOT/'control_pares.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['originalRowsPreservedExactly','pairedExactly7Days','futureDistribution','transitionMatrix','splits']},indent=2))

if __name__=='__main__':main()
