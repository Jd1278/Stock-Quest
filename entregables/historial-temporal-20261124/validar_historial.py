"""Comprobacion independiente de dimensiones, inventario, lags y particiones."""
from pathlib import Path
from collections import defaultdict
from datetime import date, timedelta
import csv
import hashlib
import json
import math

ROOT=Path(__file__).resolve().parent
metadata=json.loads((ROOT/'control_historial.json').read_text(encoding='utf-8'))
series=defaultdict(list)
keys=set()
with (ROOT/'historial_100000_15.csv').open(encoding='utf-8',newline='') as f:
    reader=csv.reader(f);assert len(next(reader))==15
    for r in reader:
        assert len(r)==15 and '?' not in r and '' not in r
        key=tuple(r[:3]);assert key not in keys;keys.add(key)
        series[(r[1],r[2])].append(r)
assert len(keys)==100000 and len(series)==200
for key,rows in series.items():
    assert len(rows)==500
    for i,r in enumerate(rows):
        initial,received,demand,sold,final,order,pending,lead=map(int,r[6:14])
        assert lead==3 and min(initial,received,demand,sold,final,order,pending)>=0
        assert sold==min(initial+received,demand) and final==initial+received-sold
        assert r[14]==('si' if sold<demand else 'no')
        if i:assert date.fromisoformat(r[0])-date.fromisoformat(rows[i-1][0])==timedelta(days=1) and initial==int(rows[i-1][10])
        assert received==(int(rows[i-3][11]) if i>=3 else 0)
        assert pending==sum(int(rows[j][11]) for j in range(max(0,i-2),i+1))

counts={}
for h in range(1,5):
    counts[f'h{h}']={}
    for split in ['entrenamiento','validacion','prueba','predecir']:
        file=ROOT/'weka'/f'h{h}'/(split+'.csv');n=0
        with file.open(encoding='utf-8',newline='') as f:
            reader=csv.reader(f);assert len(next(reader))==15
            for r in reader:
                assert len(r)==15
                target=int(r[3])-1;origin=target-h
                assert origin>=28 and origin<=499
                history=series[(r[0],r[1])];d=[int(x[8]) for x in history[max(0,origin-27):origin+1]]
                assert int(r[8])==int(history[origin][8])
                assert int(r[9])==int(history[origin-1][8])
                assert int(r[10])==int(history[origin-7][8])
                assert abs(float(r[11])-sum(d[-7:])/7)<1.1e-6
                assert abs(float(r[12])-sum(d)/28)<1.1e-6
                assert abs(float(r[13])-(sum(d[-7:])/7-sum(d[-14:-7])/7))<1.1e-6
                if split=='predecir':assert origin==499 and target==499+h and r[14]=='?'
                else:
                    assert r[14]==history[target][8] and r[6]==history[target][4] and r[7]==history[target][5]
                    assert (target<350 if split=='entrenamiento' else 350<=target<425 if split=='validacion' else 425<=target<500)
                n+=1
        assert n==metadata['splitInfo'][f'h{h}'][split]
        arff=file.with_suffix('.arff').read_text(encoding='utf-8').splitlines()
        assert sum(l.lower().startswith('@attribute ') for l in arff)==15
        start=next(i for i,l in enumerate(arff) if l.lower()=='@data')+1
        assert len([l for l in arff[start:] if l.strip()])==n
        counts[f'h{h}'][split]=n

with (ROOT/'estado_para_reponer.csv').open(encoding='utf-8',newline='') as f:
    states=list(csv.DictReader(f));assert len(states)==200
    for state in states:
        last=series[(state['producto'],state['almacen'])][-1]
        assert int(state['stock_final'])==int(last[10])
        assert int(state['pedidos_pendientes'])+int(state['pedido_baseline_hoy_no_incluido'])==int(last[12])
        assert sum(int(state[f'recepcion_programada_h{h}']) for h in range(1,5))==int(state['pedidos_pendientes'])
for name,sha in metadata['sha256'].items():assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==sha
result={'status':'PASS','historyRows':100000,'historyFields':15,'series':200,'daysPerSeries':500,
    'checks':['unique product/warehouse/date keys','consecutive dates','stock carryover and balance',
    'sales constrained by availability','receipts exactly three days after orders','pipeline conservation',
    'lag windows stay within series','lag and average values recomputed independently',
    'split by target date','forecast labels missing','15-field ARFF structures',
    'stock before replacing last baseline order','dataset SHA-256'],
    'counts':counts,'WEKAModelTrained':False,'GUIExecuted':False,'productionServiceCertified':False}
(ROOT/'validacion_historial.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
