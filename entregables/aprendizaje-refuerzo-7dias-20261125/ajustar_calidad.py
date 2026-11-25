"""Version 2: 80% base, 10% atipicos y 10% errores; porcentajes por filas."""
from pathlib import Path
from collections import defaultdict,Counter
import csv,json,random,os,shutil,hashlib

ROOT=Path(__file__).resolve().parent
if os.name=='nt' and not str(ROOT).startswith('\\\\?\\'):ROOT=Path('\\\\?\\'+str(ROOT))
DIAG=ROOT.parent/'aprendizaje-diagnostico-20261125'
REF=ROOT/'referencia_sin_contaminar'
SEED=2026112502
NAMES=['id_aprendiz_sintetico','fecha_corte','modulo','nota_diagnostica_inicial',
    'lecciones_asignadas','lecciones_completadas','minutos_estudio_7dias','intentos_desafio_7dias',
    'nota_media_desafios_7dias','acierto_primer_intento_7dias','simulaciones_completadas_7dias',
    'puntaje_medio_simulaciones_7dias','dias_desde_ultima_actividad','mejora_semanal','nivel_actual']
MOD=[f'M{i:02d}' for i in range(1,10)]
RAW_TYPES=['string','date "yyyy-MM-dd"','{'+','.join(MOD+[x.lower() for x in MOD])+'}']+['numeric']*11+['{inicial,intermedio,avanzado}']

def read(p):
    with p.open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def key(r):return r['id_aprendiz_sintetico'],r['fecha_corte'],r['modulo'].upper()
def write(stem,names,rows,types=None):
    rows=list(rows)
    stem.parent.mkdir(parents=True,exist_ok=True)
    csv_tmp=stem.with_suffix('.csv.tmp')
    with csv_tmp.open('w',encoding='utf-8',newline='') as f:
        w=csv.writer(f,lineterminator='\n');w.writerow(names);w.writerows(rows)
    csv_tmp.replace(stem.with_suffix('.csv'))
    if types:
        arff_tmp=stem.with_suffix('.arff.tmp')
        with arff_tmp.open('w',encoding='utf-8',newline='') as f:
            f.write('% Sintetico V2: 10% atipicos y otro 10% errores por filas.\n@relation stockquest_calidad_v2\n\n')
            for n,t in zip(names,types):f.write(f'@attribute {n} {t}\n')
            f.write('\n@data\n');csv.writer(f,lineterminator='\n').writerows(rows)
        arff_tmp.replace(stem.with_suffix('.arff'))
def dump(p,data):p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def main():
    REF.mkdir(exist_ok=True)
    for name in ['diagnostico_actual_100000_15','diagnostico_7dias_despues_100000_15']:
        for ext in ['csv','arff']:
            target=REF/f'{name}.{ext}'
            if not target.exists():shutil.copy2(ROOT/f'{name}.{ext}',target)
    for source,name in [(DIAG/'control_generacion.json','control_diagnostico_v1.json'),(ROOT/'control_pares.json','control_pares_v1.json')]:
        if not (REF/name).exists():shutil.copy2(source,REF/name)
    current=read(REF/'diagnostico_actual_100000_15.csv');future=read(REF/'diagnostico_7dias_despues_100000_15.csv')
    observations={key(r):r for r in current+future};assert len(observations)==104000
    dates=defaultdict(list)
    for k in observations:dates[k[1]].append(k)
    mutations={}
    for day,keys in sorted(dates.items()):
        ordered=sorted(keys);assert len(ordered)==4000
        rng=random.Random(SEED+int(day.replace('-','')));rng.shuffle(ordered)
        for i,k in enumerate(ordered[:800]):
            original=observations[k]
            if i<400:group='atipico';field='minutos_estudio_7dias';value=str(rng.randint(5000,9000));kind='minutos_extremos'
            else:
                group='sucio';kind=['puntaje_negativo','nota_mayor_100','proporcion_mayor_1','modulo_minusculas'][(i-400)%4]
                field,value={
                    'puntaje_negativo':('puntaje_medio_simulaciones_7dias',str(-rng.randint(10,100))),
                    'nota_mayor_100':('nota_media_desafios_7dias',str(rng.randint(150,500))),
                    'proporcion_mayor_1':('acierto_primer_intento_7dias',str(round(rng.uniform(1.2,3),3))),
                    'modulo_minusculas':('modulo',original['modulo'].lower())}[kind]
            mutations[k]=(group,kind,field,original[field],value)
    reports={};rawsets={}
    audit_names=['id_aprendiz_sintetico','fecha_corte','modulo_canonico','grupo','tipo_error','campo','valor_base','valor_crudo']
    for label,base,stem in [('actual',current,'diagnostico_actual_100000_15'),('futuro',future,'diagnostico_7dias_despues_100000_15')]:
        raw=[];audit=[];counts=Counter();kinds=Counter()
        for row in base:
            k=key(row);r=dict(row)
            if k in mutations:
                group,kind,field,before,value=mutations[k];r[field]=value;kinds[kind]+=1
            else:group='sin_alteracion';kind=field=before=value=''
            counts[group]+=1;raw.append(r);audit.append([k[0],k[1],k[2],group,kind,field,before,value])
        assert counts=={'sin_alteracion':80000,'atipico':10000,'sucio':10000}
        write(ROOT/stem,NAMES,([r[n] for n in NAMES] for r in raw),RAW_TYPES)
        write(ROOT/f'auditoria_{label}_NO_USAR_COMO_PREDICTOR',audit_names,audit)
        if label=='actual':
            for ext in ['csv','arff']:shutil.copy2(ROOT/f'{stem}.{ext}',DIAG/f'{stem}.{ext}')
            shutil.copy2(ROOT/f'auditoria_{label}_NO_USAR_COMO_PREDICTOR.csv',DIAG/'auditoria_calidad_NO_USAR_COMO_PREDICTOR.csv')
        rawsets[label]=raw;reports[label]={'rows':len(raw),'fields':15,'groups':dict(counts),'alterationTypes':dict(kinds)}
    # Coincidencia exacta de observaciones compartidas incluso despues de la corrupcion.
    now={key(r):r for r in rawsets['actual']};later={key(r):r for r in rawsets['futuro']}
    shared=now.keys()&later.keys();assert len(shared)==96000
    for k in shared:assert now[k]==later[k]
    # Objetivo protegido; solo se ensucian predictores. Contraste se mantiene independiente.
    model_names=NAMES[:-1]+['requiere_refuerzo_7dias'];model_types=RAW_TYPES[:-1]+['{no,si}']
    pairs=[];inference=[]
    for a,b in zip(rawsets['actual'],rawsets['futuro']):
        target='si' if b['nivel_actual']=='inicial' else 'no'
        pairs.append([a[n] for n in NAMES[:-1]]+[target])
        if a['fecha_corte']=='2026-11-24':inference.append([a[n] for n in NAMES[:-1]]+['?'])
    write(ROOT/'modelado/refuerzo_7dias_100000_15',model_names,pairs,model_types)
    splits=json.loads((ROOT/'control_pares.json').read_text(encoding='utf-8'))['splits']
    for split,info in splits.items():
        rows=[r for r in pairs if info['featureFirst']<=r[1]<=info['featureLast']]
        assert len(rows)==info['rows'];write(ROOT/'weka'/split,model_names,rows,model_types)
    write(ROOT/'weka/predecir_ultimo_corte_4000',model_names,inference,model_types)
    # Particiones del diagnostico: entradas crudas V2, no datos limpios antiguos.
    by_id={r['id_aprendiz_sintetico']:r['particion'] for r in read(DIAG/'particiones_aprendices.csv')}
    for split in ['entrenamiento','validacion','prueba']:
        rows=[[r[n] for n in NAMES] for r in rawsets['actual'] if by_id[r['id_aprendiz_sintetico']]==split]
        write(DIAG/'weka'/split,NAMES,rows,RAW_TYPES)
    unknown=[[r[n] for n in NAMES[:-1]]+['?'] for r in rawsets['actual'] if r['fecha_corte']=='2026-11-24']
    write(DIAG/'weka/diagnosticar_ultimo_corte',NAMES,unknown,RAW_TYPES)
    control={'version':2,'synthetic':True,'seedContamination':SEED,'percentagesReferToRows':True,
        'disjointGroups':True,'oneAlteredCellPerAffectedRow':True,'datasets':reports,
        'sharedObservationsExactlyEqual':len(shared),'protectedFields':['ID','date','target nivel_actual'],
        'naturalMissingValuesAreNotCountedAsDirtyRows':True,
        'cleaningUsesAuditOrGoldenValues':False,'plannedCleaning':'WEKA train-fitted filters; repair and impute; retain 100000 rows',
        'hashes':{}}
    for path in sorted(ROOT.rglob('*')):
        if path.is_file() and path.suffix in ['.csv','.arff'] and not any(x.startswith('resultados') for x in path.parts) and 'limpios' not in path.parts:
            control['hashes'][path.relative_to(ROOT).as_posix()]=hashlib.sha256(path.read_bytes()).hexdigest()
    dump(ROOT/'control_calidad_v2.json',control)
    print(json.dumps({k:control[k] for k in ['datasets','sharedObservationsExactlyEqual']},indent=2))

if __name__=='__main__':main()
