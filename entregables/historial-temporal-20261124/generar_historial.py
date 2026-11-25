"""Historial sintetico reproducible; biblioteca estandar, sin acceso a BD o GitHub."""
from pathlib import Path
from datetime import date, timedelta
from collections import deque
from statistics import mean, pstdev
import csv
import hashlib
import json
import math
import random

ROOT = Path(__file__).resolve().parent
SEED = 20261124
END = date(2026, 11, 23)
DAYS = 500
START = END - timedelta(days=DAYS - 1)
DATES = [START + timedelta(days=i) for i in range(DAYS + 4)]
PRODUCTS = [f'P{i:03d}' for i in range(1, 101)]
WAREHOUSES = ['norte', 'sur']
WEEK = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
CATEGORIES = ['alimentos','aseo','papeleria','tecnologia']
HISTORY_NAMES = ['fecha','producto','almacen','categoria','precio_unitario','promocion',
    'stock_inicial','unidades_recibidas','demanda','unidades_vendidas','stock_final',
    'unidades_pedidas','pedidos_en_transito','plazo_entrega_dias','agotamiento']
FEATURE_NAMES = ['producto','almacen','dia_semana_objetivo','indice_tiempo_objetivo',
    'sin_anual_objetivo','cos_anual_objetivo','precio_objetivo','promocion_objetivo',
    'demanda_hoy','demanda_ayer','demanda_hace_7_dias','media_demanda_7_dias',
    'media_demanda_28_dias','tendencia_7_dias','demanda_objetivo']
HISTORY_TYPES = ['date "yyyy-MM-dd"','{' + ','.join(PRODUCTS) + '}', '{norte,sur}',
    '{' + ','.join(CATEGORIES) + '}', 'numeric','{no,si}'] + ['numeric']*8 + ['{no,si}']
FEATURE_TYPES = ['{' + ','.join(PRODUCTS) + '}', '{norte,sur}', '{' + ','.join(WEEK) + '}',
    'numeric','numeric','numeric','numeric','{no,si}'] + ['numeric']*7

class DatasetWriter:
    def __init__(self, stem, names, types, relation):
        stem.parent.mkdir(parents=True, exist_ok=True)
        self.cf = stem.with_suffix('.csv').open('w', encoding='utf-8', newline='')
        self.af = stem.with_suffix('.arff').open('w', encoding='utf-8', newline='')
        self.csv = csv.writer(self.cf, lineterminator='\n')
        self.arff = csv.writer(self.af, lineterminator='\n')
        self.csv.writerow(names)
        self.af.write('% Datos sinteticos. No son observaciones reales.\n@relation ' + relation + '\n\n')
        for name, typ in zip(names, types):
            self.af.write('@attribute ' + name + ' ' + typ + '\n')
        self.af.write('\n@data\n')
        self.count = 0
    def write(self, row):
        assert len(row) == 15
        self.csv.writerow(row)
        self.arff.writerow(row)
        self.count += 1
    def close(self):
        self.cf.close()
        self.af.close()

def quantile95(values):
    ordered = sorted(values)
    return ordered[math.ceil(.95 * len(ordered)) - 1]

def plan(pid, idx):
    """Calendario publicado de precios/promociones; disponible antes del pronostico."""
    promo = (idx + pid * 3) % 28 < 5
    reference = 10 + (pid * 137 % 9000) / 100
    price = round(reference * (1 + .04 * math.sin(idx / 40 + pid)) * (.9 if promo else 1), 2)
    return price, 'si' if promo else 'no', reference

def baseline(demands, pid, origin, horizon):
    """Naive estacional, con ajuste de promocion fijado como supuesto de gestion."""
    lag = origin + horizon - 7
    if lag < 0:
        return mean(demands[:origin + 1])
    old_promo = plan(pid, lag)[1] == 'si'
    new_promo = plan(pid, origin + horizon)[1] == 'si'
    return max(0, demands[lag] / (1.35 if old_promo else 1) * (1.35 if new_promo else 1))

series = []
catalogue = []
audit_rows = []
states = []
for pid, product in enumerate(PRODUCTS, 1):
    category = CATEGORIES[(pid - 1) % len(CATEGORIES)]
    catalogue.append([product, category, round(plan(pid, 0)[2], 2), 3])
    for wi, warehouse in enumerate(WAREHOUSES):
        rng = random.Random(SEED + pid * 100 + wi)
        base = 18 + pid % 43
        demand, history, forecasts = [], [], []
        pipeline = {}
        stock = math.ceil(base * 8 * (1.15 if wi else 1))
        error_state = 0.0
        calibration = deque(maxlen=60)
        for t in range(DAYS):
            day = DATES[t]
            price, promo, reference = plan(pid, t)
            annual = 1 + .18 * math.sin(2 * math.pi * day.timetuple().tm_yday / 365.25)
            weekly = [.85,.90,1,1.05,1.25,1.35,.80][day.weekday()]
            expected = base * (1.15 if wi else 1) * weekly * annual * (1 + .0005*t)
            expected *= (1.35 if promo == 'si' else 1) * (price / reference) ** -.7
            expected *= 1.1 if day.day >= 28 else 1
            error_state = .55 * error_state + rng.gauss(0, base * .05)
            quantity = max(0, round(expected + error_state + rng.gauss(0, base * .06)))
            demand.append(quantity)
            initial = stock
            received = pipeline.pop(t, 0)
            sold = min(initial + received, quantity)
            stock = initial + received - sold
            point = [baseline(demand, pid, t, h) for h in range(1,5)]
            forecasts.append(point)
            # Solo errores de pronosticos cuyo horizonte completo ya se observo.
            if t >= 4:
                j = t - 4
                cumulative = 0.0
                prefix_errors = []
                for h in range(1,5):
                    cumulative += demand[j+h] - forecasts[j][h-1]
                    prefix_errors.append(cumulative)
                calibration.append(max(0, max(prefix_errors)))
            if len(calibration) >= 20:
                safety = math.ceil(quantile95(calibration))
            else:
                safety = math.ceil(max(base*.5, 1.645 * pstdev(demand[-28:]) * 2))
            pending_before = sum(pipeline.values())
            position = stock + pending_before
            order = max(0, math.ceil(sum(point) + safety - position))
            pipeline[t+3] = pipeline.get(t+3, 0) + order
            pending_after = sum(pipeline.values())
            history.append([day.isoformat(),product,warehouse,category,price,promo,
                initial,received,quantity,sold,stock,order,pending_after,3,'si' if sold < quantity else 'no'])
            audit_rows.append([day.isoformat(),product,warehouse,*[round(x,6) for x in point],
                safety,position,order,pending_after,len(calibration),int(len(calibration)<20)])
        # Estado para reemplazar la ultima decision baseline, sin contar ese pedido dos veces.
        states.append([END.isoformat(),product,warehouse,stock,pending_before,
            *[pipeline.get(DAYS-1+h,0)-(order if h==3 else 0) for h in range(1,5)],
            safety,3,1,.95,order,'antes_del_pedido_baseline_del_ultimo_dia'])
        series.append({'pid':pid,'product':product,'warehouse':warehouse,'history':history,'demand':demand})

# Orden global por fecha; los lags nunca cruzan producto/almacen.
history_writer = DatasetWriter(ROOT/'historial_100000_15',HISTORY_NAMES,HISTORY_TYPES,'historial_stockquest_sintetico')
for t in range(DAYS):
    for item in series:
        history_writer.write(item['history'][t])
history_writer.close()

def features(item, origin, target):
    d = item['demand']
    price,promo,_ = plan(item['pid'], target)
    angle = 2*math.pi*DATES[target].timetuple().tm_yday/365.25
    return [item['product'],item['warehouse'],WEEK[DATES[target].weekday()],target+1,
        round(math.sin(angle),6),round(math.cos(angle),6),price,promo,
        d[origin],d[origin-1],d[origin-7],round(mean(d[origin-6:origin+1]),6),
        round(mean(d[origin-27:origin+1]),6),
        round(mean(d[origin-6:origin+1])-mean(d[origin-13:origin-6]),6),
        d[target] if target < DAYS else '?']

split_info = {}
for horizon in range(1,5):
    folder = ROOT/'weka'/f'h{horizon}'
    writers = {split:DatasetWriter(folder/split,FEATURE_NAMES,FEATURE_TYPES,'demanda_h'+str(horizon))
               for split in ['entrenamiento','validacion','prueba','predecir']}
    errors = []
    for target in range(28+horizon, DAYS):
        origin = target-horizon
        split = 'entrenamiento' if target < 350 else 'validacion' if target < 425 else 'prueba'
        for item in series:
            writers[split].write(features(item,origin,target))
            if split == 'prueba':
                pred = baseline(item['demand'],item['pid'],origin,horizon)
                errors.append(item['demand'][target]-pred)
    for item in series:
        writers['predecir'].write(features(item,DAYS-1,DAYS-1+horizon))
    split_info[f'h{horizon}'] = {name:writer.count for name,writer in writers.items()}
    split_info[f'h{horizon}']['baselineTest'] = {'MAE':round(mean(abs(e) for e in errors),4),
        'RMSE':round(math.sqrt(mean(e*e for e in errors)),4), 'trainedWEKAModel':False}
    for writer in writers.values():writer.close()

def write_csv(name, header, rows):
    with (ROOT/name).open('w',encoding='utf-8',newline='') as f:
        writer=csv.writer(f,lineterminator='\n');writer.writerow(header);writer.writerows(rows)

write_csv('auditoria_reposicion.csv',['fecha','producto','almacen','pronostico_base_h1','pronostico_base_h2',
    'pronostico_base_h3','pronostico_base_h4','stock_seguridad','posicion_antes_pedir','pedido',
    'transito_despues_pedir','errores_pasados_disponibles','calentamiento'],audit_rows)
write_csv('estado_para_reponer.csv',['fecha_corte','producto','almacen','stock_final','pedidos_pendientes',
    'recepcion_programada_h1','recepcion_programada_h2','recepcion_programada_h3','recepcion_programada_h4',
    'stock_seguridad_baseline','plazo_dias','revision_dias','nivel_servicio_objetivo',
    'pedido_baseline_hoy_no_incluido','momento_estado'],states)
write_csv('catalogo_productos.csv',['producto','categoria','precio_referencia','plazo_entrega_dias'],catalogue)
write_csv('contexto_prediccion.csv',['fila_archivo_weka','horizonte','fecha_origen','fecha_objetivo','producto','almacen'],
    [[i+1,h,END.isoformat(),DATES[DAYS-1+h].isoformat(),item['product'],item['warehouse']]
     for h in range(1,5) for i,item in enumerate(series)])
write_csv('diccionario_historial.csv',['posicion','campo','tipo_arff'],[[i+1,n,t] for i,(n,t) in enumerate(zip(HISTORY_NAMES,HISTORY_TYPES))])
write_csv('diccionario_weka.csv',['posicion','campo','tipo_arff'],[[i+1,n,t] for i,(n,t) in enumerate(zip(FEATURE_NAMES,FEATURE_TYPES))])
stockout_test = sum(r[14]=='si' for item in series for r in item['history'][425:])
complete_cycles = cycles_with_shortage = 0
for item in series:
    cycle_start = None
    lost = False
    for t,row in enumerate(item['history']):
        if row[7] > 0:
            if cycle_start is not None and cycle_start >= 425:
                complete_cycles += 1
                cycles_with_shortage += int(lost)
            cycle_start = t
            lost = False
        lost = lost or row[14] == 'si'
    # Ultimo ciclo sin siguiente recepcion: censurado, no se cuenta como exitoso.
metadata = {'synthetic':True,'seed':SEED,'historyRows':100000,'historyFields':15,'products':100,
    'warehouses':WAREHOUSES,'series':200,'daysPerSeries':500,'start':START.isoformat(),'end':END.isoformat(),
    'policy':{'leadTimeDays':3,'reviewDays':1,'coverageDays':4,'targetCycleService':.95,
        'lostSalesNoBackorders':True,'orderAt':'close of day t','receiptAt':'start of day t+3',
        'calibration':'95th percentile of nonnegative maximum cumulative 1..4-day forecast errors, latest 60 fully observed origins; warmup documented in audit',
        'initialInventory':'8 days of product base demand, not a forecast result'},
    'dateSplits':{'trainTargetEnd':DATES[349].isoformat(),'validationTargetStart':DATES[350].isoformat(),
        'validationTargetEnd':DATES[424].isoformat(),'testTargetStart':DATES[425].isoformat(),'testTargetEnd':END.isoformat()},
    'splitInfo':split_info,'nextTargets':[DATES[DAYS-1+h].isoformat() for h in range(1,5)],
    'serviceSimulation':{'definition':'fraction of fully observed replenishment cycles without unsatisfied demand; lost sales',
        'testCompleteReplenishmentCycles':complete_cycles,'testCyclesWithShortage':cycles_with_shortage,
        'observedCycleService':1-cycles_with_shortage/complete_cycles,
        'cycleBoundary':'start of a positive receipt through the day before the next positive receipt; test starts >= day 425; final censored cycle omitted',
        'testDailyIntervals':15000,'testIntervalsWithShortage':stockout_test,
        'observedTestDailyService':1-stockout_test/15000,'productionCertification':False,
        'note':'Baseline historical policy; not evaluation of a trained WEKA policy; not a guarantee of 95% for each series'},
    'temporalLeakageControls':['lags at or before origin','target prices and promotions from preannounced calendar',
        'split by target date','predecir labels missing','raw future demand not generated beyond cutoff'],
    'sha256':{}}
for file in sorted(ROOT.rglob('*')):
    if file.is_file() and file.suffix in ('.csv','.arff'):
        metadata['sha256'][file.relative_to(ROOT).as_posix()] = hashlib.sha256(file.read_bytes()).hexdigest()
(ROOT/'control_historial.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:metadata[k] for k in ['historyRows','historyFields','series','start','end','splitInfo','serviceSimulation']},ensure_ascii=False,indent=2))
