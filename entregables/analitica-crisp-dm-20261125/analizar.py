"""Experimento reproducible: modelos WEKA; estadística y gráficas en Python.
Ejecutar desde cualquier directorio. Dependencias opcionales en .stockquest-local.
"""
from pathlib import Path
import sys, os, json, subprocess, hashlib
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'.stockquest-local/analitica/python'))
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve,roc_auc_score,average_precision_score,precision_recall_curve,confusion_matrix

OUT=Path(__file__).parent
SRC=ROOT/'entregables/historial-temporal-20261124'
JAVA=os.environ.get('SQ_JAVA',r'C:\Program Files\Java\jdk-21.0.11\bin\java.exe')
CP=os.pathsep.join([str(ROOT/'.stockquest-local/analitica/*'),str(OUT)])
for folder in ['modelos','predicciones','graficas','datos']: (OUT/folder).mkdir(exist_ok=True)
plt.rcParams.update({'figure.dpi':130,'font.size':11,'axes.spines.top':False,'axes.spines.right':False})
def save(name):
    plt.tight_layout(); plt.savefig(OUT/'graficas'/f'{name}.png'); plt.savefig(OUT/'graficas'/f'{name}.svg'); plt.close()
def run(train,test,cls,opts,name):
    prefix=OUT/'modelos'/name
    # Caché verificable por contenidos, configuración y clase Java.
    signature=hashlib.sha256((str(cls)+opts).encode()+Path(train).read_bytes()+Path(test).read_bytes()+(OUT/'WekaRun.class').read_bytes())
    if cls=='LOAD': signature.update(Path(opts).read_bytes())
    signature=signature.hexdigest(); stamp=Path(str(prefix)+'.sha256')
    if stamp.exists() and stamp.read_text()==signature and Path(str(prefix)+'.csv').exists():
        return pd.read_csv(str(prefix)+'.csv')
    cmd=[JAVA,'-Xmx2g','-cp',CP,'WekaRun',str(train),str(test),cls,opts,str(prefix)]
    print(name,flush=True)
    env=os.environ.copy();env['WEKA_HOME']=str(ROOT/'.stockquest-local/analitica/wekafiles')
    p=subprocess.run(cmd,capture_output=True,text=True,env=env)
    (OUT/'modelos'/f'{name}.log').write_text(p.stdout+p.stderr,encoding='utf8')
    if p.returncode: raise RuntimeError(p.stderr)
    stamp.write_text(signature)
    return pd.read_csv(str(prefix)+'.csv')
def predict(train,test,model,name):return run(train,test,'LOAD',str(OUT/'modelos'/f'{model}.model'),name)
def metric(y,p):
    p=np.maximum(0,p); e=np.asarray(y)-p
    return dict(MAE=float(np.abs(e).mean()),RMSE=float(np.sqrt((e*e).mean())),sesgo=float(e.mean()),WAPE=float(np.abs(e).sum()/np.sum(y)))
def arff(df,path,header):path.write_text(header+'\n@data\n'+df.to_csv(index=False,header=False,na_rep='?'),encoding='utf8')

history=pd.read_csv(SRC/'historial_100000_15.csv')
assert len(history)==100000 and not history.isna().any().any()
assert not history.duplicated(['fecha','producto','almacen']).any()
assert (history.stock_inicial+history.unidades_recibidas-history.unidades_vendidas==history.stock_final).all()
eda={'filas':len(history),'faltantes':int(history.isna().sum().sum()),'duplicados':int(history.duplicated(['fecha','producto','almacen']).sum()),'agotamiento_tasa':float((history.agotamiento=='si').mean()),'demanda':history.demanda.describe().to_dict()}
(OUT/'estadistica.json').write_text(json.dumps(eda,indent=2))
history.select_dtypes('number').describe().to_csv(OUT/'datos/descriptivos.csv')
fig,ax=plt.subplots(1,2,figsize=(12,4)); history.demanda.hist(bins=45,ax=ax[0],color='#168B89'); ax[0].set(xlabel='Demanda (unidades/día)',ylabel='Frecuencia',title='Distribución de demanda sintética')
history.groupby('fecha').demanda.sum().plot(ax=ax[1],color='#2463A0');ax[1].set(xlabel='Fecha',ylabel='Unidades/día',title='Demanda agregada de 200 series'); ax[1].tick_params(axis='x',rotation=25);save('01_exploracion')
metrics=[]; chosen={}; dfs={}; predictions={}
configs={'REPTree':('weka.classifiers.trees.REPTree','-M 20 -L 12 -S 20261125'), 'RandomForest':('weka.classifiers.trees.RandomForest','-I 50 -depth 16 -M 5 -S 20261125 -num-slots 2')}
for h in range(1,5):
    folder=SRC/f'weka/h{h}'; dfs[h]={s:pd.read_csv(folder/f'{s}.csv') for s in ['entrenamiento','validacion','prueba','predecir']}
    scores={}
    for name,(cls,opts) in configs.items():
        result=run(folder/'entrenamiento.arff',folder/'validacion.arff',cls,opts,f'h{h}_{name}')
        m=metric(result.actual,result.prediccion); metrics.append(dict(h=h,modelo=name,particion='validacion',**m));scores[name]=m['MAE']
    name=min(scores,key=scores.get);chosen[h]=name
    predictions[h]={}
    for split in ['validacion','prueba','predecir']:
        result=predict(folder/'entrenamiento.arff',folder/f'{split}.arff',f'h{h}_{name}',f'h{h}_{split}')
        predictions[h][split]=np.maximum(0,result.prediccion.to_numpy())
        output=dfs[h][split][['producto','almacen','indice_tiempo_objetivo']].copy()
        output['real']=result.actual;output['prediccion']=predictions[h][split];output.to_csv(OUT/'predicciones'/f'h{h}_{split}.csv',index=False)
        if split=='prueba':metrics.append(dict(h=h,modelo=name,particion=split,**metric(result.actual,result.prediccion)))
    # Baseline semanal exacto: demanda objetivo menos siete días, ajustada por promoción.
    for split in ['validacion','prueba']:
        frame=dfs[h][split]; lagdate=pd.Timestamp('2025-07-12')+pd.to_timedelta(frame.indice_tiempo_objetivo-1-7,unit='D')
        keys=pd.DataFrame({'fecha':lagdate.dt.strftime('%Y-%m-%d'),'producto':frame.producto,'almacen':frame.almacen})
        old=keys.merge(history[['fecha','producto','almacen','demanda','promocion']],on=['fecha','producto','almacen'],validate='many_to_one')
        # Factor del generador, verificado en su función baseline.
        base=old.demanda.to_numpy()*np.where(frame.promocion_objetivo=='si',1.35,1)/np.where(old.promocion=='si',1.35,1)
        metrics.append(dict(h=h,modelo='Naive_semanal_ajustado',particion=split,**metric(frame.demanda_objetivo,base)))

pd.DataFrame(metrics).to_csv(OUT/'metricas_regresion.csv',index=False)
# Validación cruzada temporal expanding-window: tres bloques dentro del entrenamiento h1.
header=(SRC/'weka/h1/entrenamiento.arff').read_text().split('@data')[0]
cv=[]; frame=dfs[1]['entrenamiento'];name=chosen[1]
for k,(cut,end) in enumerate([(200,250),(250,300),(300,350)],1):
    a=OUT/'datos'/f'cv{k}_train.arff';b=OUT/'datos'/f'cv{k}_test.arff'
    arff(frame[frame.indice_tiempo_objetivo<=cut],a,header);arff(frame[(frame.indice_tiempo_objetivo>cut)&(frame.indice_tiempo_objetivo<=end)],b,header)
    r=run(a,b,*configs[name],f'cv{k}');cv.append(dict(fold=k,train_fin=cut,test_fin=end,**metric(r.actual,r.prediccion)))
pd.DataFrame(cv).to_csv(OUT/'validacion_cruzada_temporal.csv',index=False)

# Clasificación auxiliar: presión sobre una cobertura de referencia de 1.2 medias semanales.
# Umbral de negocio fijado a priori; NO es agotamiento físico.
class_header=header.replace('@attribute demanda_objetivo numeric','@attribute presion_demanda {no,si}')
classframes={}
for split in ['entrenamiento','validacion','prueba']:
    d=dfs[1][split].copy();labels=np.where(d.demanda_objetivo>1.2*d.media_demanda_7_dias,'si','no');d=d.drop(columns='demanda_objetivo');d['presion_demanda']=labels;classframes[split]=d
    arff(d,OUT/'datos'/f'presion_{split}.arff',class_header)
cscores={}; cresults={}
for name,cls,opts in [('J48','weka.classifiers.trees.J48','-C 0.25 -M 30'),('RandomForest','weka.classifiers.trees.RandomForest','-I 50 -depth 16 -M 5 -S 20261125 -num-slots 2')]:
    r=run(OUT/'datos/presion_entrenamiento.arff',OUT/'datos/presion_validacion.arff',cls,opts,'presion_'+name)
    cscores[name]=roc_auc_score(r.actual,r.probabilidad_si);cresults[name]=r
cname=max(cscores,key=cscores.get);r=cresults[cname]
thresholds=np.arange(.05,.951,.01)
costs=[(5*((r.actual==1)&(r.probabilidad_si<t)).sum()+((r.actual==0)&(r.probabilidad_si>=t)).sum())/len(r) for t in thresholds]
threshold=float(thresholds[np.argmin(costs)])
test=predict(OUT/'datos/presion_entrenamiento.arff',OUT/'datos/presion_prueba.arff','presion_'+cname,'presion_prueba')
y=test.actual.to_numpy();p=test.probabilidad_si.to_numpy();hat=p>=threshold; cm=confusion_matrix(y,hat)
report={'modelo':cname,'AUC_validacion':cscores,'umbral':threshold,'coste_FN_FP':5,'prevalencia_test':float(y.mean()),'ROC_AUC':float(roc_auc_score(y,p)),'PR_AUC_AP':float(average_precision_score(y,p)),'Brier':float(np.mean((y-p)**2)),'precision':float(cm[1,1]/max(1,cm[:,1].sum())),'recall':float(cm[1,1]/max(1,cm[1].sum())),'matriz_confusion':cm.tolist()}
(OUT/'clasificacion.json').write_text(json.dumps(report,indent=2))
fig,ax=plt.subplots(1,2,figsize=(11,4));fpr,tpr,_=roc_curve(y,p);ax[0].plot(fpr,tpr,label=f"AUC={report['ROC_AUC']:.3f}");ax[0].plot([0,1],[0,1],'--',color='gray');ax[0].set(xlabel='Tasa de falsos positivos',ylabel='Sensibilidad',title='ROC · presión de demanda · test');ax[0].legend()
prec,rec,_=precision_recall_curve(y,p);ax[1].plot(rec,prec,label=f"AP={report['PR_AUC_AP']:.3f}");ax[1].axhline(y.mean(),ls='--',color='gray');ax[1].set(xlabel='Recall',ylabel='Precisión',title='Precision–Recall');ax[1].legend();save('03_roc_pr')
fig,ax=plt.subplots(1,2,figsize=(11,4));ax[0].hist((2*y-1)*(2*p-1),bins=40,color='#168B89');ax[0].set(xlabel='Margen probabilístico firmado',ylabel='Frecuencia',title='Margen respecto al umbral 0.5');ax[0].axvline(0,color='red')
ax[1].plot(thresholds,costs);ax[1].axvline(threshold,color='red',ls='--');ax[1].set(xlabel='Umbral de alerta',ylabel='(5 FN + FP) / N',title='Coste en validación · supuesto 5:1');save('04_margen_coste')
fig,ax=plt.subplots(1,2,figsize=(11,4));ax[0].imshow(cm,cmap='Blues');ax[0].set(xticks=[0,1],xticklabels=['no','si'],yticks=[0,1],yticklabels=['no','si'],xlabel='Predicción',ylabel='Clase real',title=f'Confusión · umbral {threshold:.2f}')
for i in range(2):
    for j in range(2):ax[0].text(j,i,str(cm[i,j]),ha='center',va='center',color='white' if cm[i,j]>cm.max()/2 else 'black')
bins=np.linspace(0,1,11);xs=[];ys=[]
for lo,hi in zip(bins[:-1],bins[1:]):
    mask=(p>=lo)&(p<hi if hi<1 else p<=hi)
    if mask.sum():xs.append(p[mask].mean());ys.append(y[mask].mean())
ax[1].plot(xs,ys,'o-');ax[1].plot([0,1],[0,1],'--');ax[1].set(xlabel='Probabilidad media predicha',ylabel='Frecuencia observada',title='Calibración en test');save('05_errores_calibracion')
d=dfs[1]['entrenamiento'];cols=['demanda_hoy','media_demanda_7_dias','tendencia_7_dias','demanda_objetivo']
sample=d[cols].sample(1800,random_state=42); colors=np.where(sample.demanda_objetivo>1.2*sample.media_demanda_7_dias,'#D95C41','#168B89')
pd.plotting.scatter_matrix(sample,figsize=(10,10),c=colors,alpha=.25,diagonal='hist');save('02_matriz_dispersion')
corr=d.select_dtypes('number').corr();fig,ax=plt.subplots(figsize=(10,8));im=ax.imshow(corr,vmin=-1,vmax=1,cmap='RdBu_r');ax.set(xticks=range(len(corr)),xticklabels=corr.columns,yticks=range(len(corr)),yticklabels=corr.columns,title='Correlación de Pearson · entrenamiento');plt.xticks(rotation=80);fig.colorbar(im);save('02b_correlaciones')
# Sección 2D del clasificador WEKA completo; otros atributos fijados a una fila real.
grid=classframes['entrenamiento'].iloc[[len(d)//2]].copy();xx,yy=np.meshgrid(np.linspace(0,80,50),np.linspace(1,60,50))
grid=pd.concat([grid]*xx.size,ignore_index=True);grid['demanda_hoy']=xx.ravel();grid['media_demanda_7_dias']=yy.ravel();grid.iloc[:,-1]='?'
arff(grid,OUT/'datos/frontera.arff',class_header)
boundary=predict(OUT/'datos/presion_entrenamiento.arff',OUT/'datos/frontera.arff','presion_'+cname,'frontera')
fig,ax=plt.subplots(figsize=(9,5));im=ax.contourf(xx,yy,boundary.probabilidad_si.to_numpy().reshape(xx.shape),levels=np.linspace(0,1,11),cmap='RdYlBu_r');ax.contour(xx,yy,boundary.probabilidad_si.to_numpy().reshape(xx.shape),levels=[threshold],colors='black');fig.colorbar(im,label='P(presión=si)');ax.set(xlabel='Demanda de hoy',ylabel='Media de demanda de 7 días',title='Sección 2D del modelo WEKA · resto de atributos fijos');save('06_frontera_condicional')
real=dfs[1]['prueba'].demanda_objetivo.to_numpy();pred=predictions[1]['prueba'];res=real-pred
fig,ax=plt.subplots(1,3,figsize=(15,4));ax[0].hexbin(real,pred,gridsize=40,mincnt=1,cmap='viridis');ax[0].plot([0,100],[0,100],'--',color='red');ax[0].set(xlabel='Demanda observada',ylabel='Predicción',title='h1 · test temporal');ax[1].scatter(pred,res,s=3,alpha=.15);ax[1].axhline(0,color='red');ax[1].set(xlabel='Predicción',ylabel='Real − predicción',title='Residuos');ax[2].hist(res,bins=40);ax[2].set(xlabel='Error (unidades)',ylabel='Frecuencia',title='Distribución de errores');save('07_regresion_residuos')
mt=pd.DataFrame(metrics);fig,ax=plt.subplots(figsize=(9,4))
for model in mt.modelo.unique():
    q=mt[(mt.modelo==model)&(mt.particion=='prueba')]
    if not q.empty: ax.plot(q.h,q.MAE,'o-',label=model)
ax.set(xlabel='Horizonte (días)',ylabel='MAE (unidades)',xticks=[1,2,3,4],title='Error fuera de muestra');ax.legend();save('08_error_horizonte')
# Seguridad conjunta por origen: solo orígenes cuyos cuatro objetivos son validación.
aligned=[]
for h in range(1,5):
    f=dfs[h]['validacion'][['producto','almacen','indice_tiempo_objetivo']].copy();f['origen']=f.indice_tiempo_objetivo-h;f[f'e{h}']=dfs[h]['validacion'].demanda_objetivo-predictions[h]['validacion'];aligned.append(f.drop(columns='indice_tiempo_objetivo'))
joint=aligned[0]
for f in aligned[1:]:joint=joint.merge(f,on=['producto','almacen','origen'],validate='one_to_one')
joint['max_error_acumulado']=np.maximum(0,np.cumsum(joint[[f'e{h}' for h in range(1,5)]].values,axis=1).max(axis=1))
safety=joint.groupby(['producto','almacen']).max_error_acumulado.quantile(.95).rename('stock_seguridad_modelo')
orders=pd.read_csv(SRC/'estado_para_reponer.csv').merge(safety,on=['producto','almacen'],validate='one_to_one')
for h in range(1,5):
    f=dfs[h]['predecir'][['producto','almacen']].copy();f[f'pronostico_h{h}']=predictions[h]['predecir'];orders=orders.merge(f,on=['producto','almacen'],validate='one_to_one')
orders['pedido_propuesto']=np.ceil(np.maximum(0,orders[[f'pronostico_h{h}' for h in range(1,5)]].sum(axis=1)+orders.stock_seguridad_modelo-orders.stock_final-orders.pedidos_pendientes))
orders.to_csv(OUT/'pedidos_propuestos_simulacion.csv',index=False)
# Intervalo de incertidumbre MAE mediante bootstrap por fecha; dependencia entre series conservada.
daily=pd.DataFrame({'dia':dfs[1]['prueba'].indice_tiempo_objetivo,'error':np.abs(res)}).groupby('dia').error.mean().values
rng=np.random.default_rng(20261125);n=len(daily);boot=[]
for _ in range(1000):
    starts=rng.integers(0,n,size=int(np.ceil(n/7)));ix=np.concatenate([(s+np.arange(7))%n for s in starts])[:n];boot.append(daily[ix].mean())
summary={'modelos_elegidos':chosen,'clasificacion':report,'MAE_h1_IC95_bootstrap_bloques_7dias':np.quantile(boot,[.025,.975]).tolist(),'origenes_calibracion_por_serie':int(joint.groupby(['producto','almacen']).size().min()),'semilla':20261125,'weka':'3.8.6','java':'21.0.11','datos_sinteticos':True,'sha256_historial':hashlib.sha256((SRC/'historial_100000_15.csv').read_bytes()).hexdigest()}
(OUT/'resumen.json').write_text(json.dumps(summary,indent=2))
print(json.dumps(summary,indent=2),flush=True)
