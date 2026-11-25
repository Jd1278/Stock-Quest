"""Lee un reporte real WEKA y exporta métricas y PNG; no reentrena.
Uso: python visualizar_j48.py [--reporte ruta/j48_resultados.txt]
Dependencias: numpy pandas matplotlib.
"""
from pathlib import Path
import sys, re, json, argparse, hashlib
ROOT = Path(__file__).resolve().parents[2]
local = ROOT / '.stockquest-local/analitica/python'
if local.exists(): sys.path.insert(0, str(local))
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def leer(path):
    text = path.read_text(encoding='utf-8-sig')
    matrix_text = text.split('=== Confusion Matrix ===')[-1]
    rows, labels = [], []
    for line in matrix_text.splitlines():
        m = re.match(r'^\s*([\d\s]+)\|\s*\w+\s*=\s*(\S+)\s*$', line)
        if m:
            rows.append([int(x) for x in m[1].split()]); labels.append(m[2])
    cm = np.array(rows)
    assert cm.shape == (len(labels), len(labels)) and len(labels) > 1
    n = int(cm.sum()); correct = int(np.trace(cm))
    stated = re.search(r'Correctly Classified Instances\s+(\d+)\s+([\d.,]+)', text)
    assert correct == int(stated[1])
    assert abs(100 * correct / n - float(stated[2].replace(',', '.'))) < .00051
    assert n == int(re.search(r'Total Number of Instances\s+(\d+)', text)[1])
    pe = float(cm.sum(0) @ cm.sum(1) / n**2)
    kappa = (correct/n-pe)/(1-pe)
    reported = float(re.search(r'Kappa statistic\s+([\d.,]+)', text)[1].replace(',', '.'))
    assert abs(kappa-reported) < .000051
    tp = cm.diagonal(); precision = tp/cm.sum(0); recall = tp/cm.sum(1)
    metrics = pd.DataFrame({'clase': labels, 'soporte':cm.sum(1), 'precision':precision,
                           'recall':recall, 'f1':2*precision*recall/(precision+recall)})
    body = text.split('J48 pruned tree')[1].split('Number of Leaves')[0]
    branches = []
    for line in body.splitlines():
        m = re.match(r'^((?:\|   )*)([a-zA-Z_][^\n]*)$', line)
        if m: branches.append((len(m[1])//4,m[2]))
    return text, cm, metrics, branches, dict(n=n, correctos=correct, errores=n-correct,
        exactitud=correct/n, kappa=kappa, acuerdo_azar=pe,
        hojas=int(re.search(r'Number of Leaves\s*:\s*(\d+)',text)[1]),
        nodos=int(re.search(r'Size of the tree\s*:\s*(\d+)',text)[1]))

def matriz(cm, labels, out, summary):
    rates = cm/cm.sum(1,keepdims=True)*100
    fig, ax = plt.subplots(figsize=(11,7.5), layout='constrained')
    im=ax.imshow(rates,cmap='Blues',vmin=0,vmax=100)
    names=[s.replace('_','\n') for s in labels]
    ax.set(xticks=range(len(labels)),xticklabels=names,yticks=range(len(labels)),
           yticklabels=names,xlabel='Clase predicha',ylabel='Clase real')
    ax.tick_params(length=0,labelsize=12)
    for i in range(len(labels)):
        for j in range(len(labels)):
            ax.text(j,i,f'{cm[i,j]:,}\n{rates[i,j]:.2f}%',ha='center',va='center',
                    fontsize=17,color='white' if rates[i,j]>50 else '#102a43')
    fig.colorbar(im,ax=ax,label='% de la clase real')
    ax.set_title('Stock-Quest · J48 · Matriz de confusión\n'
                 f'CV estratificada de 10 folds | N={summary["n"]:,} | '
                 f'Exactitud={summary["exactitud"]:.3%}',fontsize=16,pad=20)
    fig.savefig(out/'matriz_confusion_j48.png',dpi=200)
    fig.savefig(out/'matriz_confusion_j48.svg');plt.close(fig)

def arbol(branches, out):
    # Extrae automáticamente raíz, hijos y siguientes decisiones del texto WEKA.
    roots=[i for i,(d,_) in enumerate(branches) if d==0]
    assert len(roots)==2
    def condition(s): return s.split(':')[0]
    def feature(s): return re.split(r'\s+(?:<=|>=|=|>|<)\s+',condition(s))[0]
    friendly={'tiempo_decision_critica_seg':'Tiempo de decisión (s)',
              'quiebres_stock_generados':'Días con quiebre de stock',
              'frecuencia_consulta_pistas':'Consultas de pistas',
              'costo_operativo_resultante':'Costo operativo'}
    def node_name(s): return friendly.get(feature(s),feature(s).replace('_',' '))
    def edge(s): return condition(s).replace(feature(s),'',1).strip()
    fig,ax=plt.subplots(figsize=(16,8));ax.set(xlim=(0,1),ylim=(0,1));ax.axis('off')
    def box(x,y,label,leaf=False):
        ax.text(x,y,label,ha='center',va='center',fontsize=12,
            bbox=dict(boxstyle='round,pad=0.7',fc='#d8f2ea' if leaf else '#edf3f8',ec='#34617b'))
    def arrow(a,b,label):
        ax.annotate('',xy=(b[0],b[1]+.065),xytext=(a[0],a[1]-.055),
                    arrowprops=dict(arrowstyle='->',color='#34617b',lw=1.5))
        ax.text((a[0]+b[0])/2,(a[1]+b[1])/2,label,ha='center',fontsize=12,
                bbox=dict(fc='white',ec='none',pad=2))
    box(.5,.85,node_name(branches[0][1]))
    for side,start in enumerate(roots):
        end=roots[side+1] if side+1<len(roots) else len(branches)
        kids=[i for i in range(start+1,end) if branches[i][0]==1]
        assert len(kids)==2
        x=.25 if side==0 else .75
        box(x,.58,node_name(branches[kids[0]][1]));arrow((.5,.85),(x,.58),edge(branches[start][1]))
        for k,idx in enumerate(kids):
            bx=x+(-.12 if k==0 else .12);line=branches[idx][1]
            if ':' in line:
                label=line.split(':',1)[1].strip().replace(' (','\n(')
                label+='\nHoja del modelo completo'
                leaf=True
            else:
                assert branches[idx+1][0]==2
                label=node_name(branches[idx+1][1])+'\nSubárbol omitido';leaf=False
            box(bx,.25,label,leaf);arrow((x,.58),(bx,.25),edge(line))
    ax.set_title('Primeras decisiones del árbol J48',fontsize=22,pad=18)
    fig.text(.5,.035,'Vista parcial fiel al reporte: 323 nodos y 167 hojas en el árbol completo.\n'
             'Los soportes de hojas pertenecen al ajuste completo; la matriz evalúa diez folds.',
             ha='center',fontsize=11)
    fig.savefig(out/'arbol_j48_resumido.png',dpi=200,bbox_inches='tight')
    fig.savefig(out/'arbol_j48_resumido.svg',bbox_inches='tight');plt.close(fig)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--reporte',type=Path,default=ROOT/'dataset_edm/j48_resultados.txt')
    p.add_argument('--salida',type=Path,default=Path(__file__).parent)
    args=p.parse_args();out=args.salida;out.mkdir(parents=True,exist_ok=True)
    text,cm,metrics,branches,summary=leer(args.reporte)
    summary['fuente']=str(args.reporte.resolve())
    summary['sha256_reporte']=hashlib.sha256(args.reporte.read_bytes()).hexdigest()
    summary['test_mode']=re.search(r'Test mode:\s*(.+)',text)[1]
    summary['reentrenado']=False
    # Audita archivos presentes sin atribuirles las métricas del reporte.
    data_path=args.reporte.parent/'stockquest_edm_100000.csv'
    if data_path.exists():
        d=pd.read_csv(data_path,low_memory=False)
        assert np.array_equal(d.clase_perfil_aprendiz.value_counts().reindex(metrics.clase).values,cm.sum(1))
        summary['dataset']={'filas':len(d),'usuarios':int(d.user_id.nunique()),
            'duplicados_excedentes':int(d.duplicated().sum()),'filas_con_nulos':int(d.isna().any(axis=1).sum()),
            'costos_negativos':int((d.costo_operativo_resultante<0).sum()),
            'tiempos_9999':int((d.tiempo_decision_critica_seg==9999).sum())}
    summary['arff_presentes']={}
    for name in ['train_80.arff','test_20.arff']:
        file=args.reporte.parent/name
        if file.exists():
            lines=file.read_text(encoding='utf-8-sig').splitlines()
            attrs=[re.match(r'@attribute\s+(\S+)',s,re.I)[1] for s in lines if s.lower().startswith('@attribute')]
            pos=next(i for i,s in enumerate(lines) if s.strip().lower()=='@data')
            summary['arff_presentes'][name]={'atributos':attrs,'filas':sum(bool(s.strip()) and not s.startswith('%') for s in lines[pos+1:])}
    metrics.to_csv(out/'metricas_por_clase.csv',index=False,encoding='utf-8')
    pd.DataFrame(cm,index=metrics.clase,columns=metrics.clase).to_csv(out/'matriz_confusion.csv',encoding='utf-8')
    (out/'metricas_verificadas.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    matriz(cm,metrics.clase.tolist(),out,summary);arbol(branches,out)
    print(json.dumps(summary,ensure_ascii=False,indent=2));print(metrics.to_string(index=False))

if __name__=='__main__':main()
