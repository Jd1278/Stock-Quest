"""Auditoría reproducible Stock-Quest. No modifica las fuentes ni entrena modelos.

Python >=3.10; pip install numpy pandas scipy matplotlib
python dataset_edm/audit_metrics.py
python dataset_edm/audit_metrics.py --data-dir otra_carpeta --strict
--strict devuelve 2 si la partición existente no es 80/20 disjunta.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import re
from collections import Counter
from itertools import combinations
from pathlib import Path

import numpy as np
import pandas as pd
import scipy
from scipy import stats

TARGET = "clase_perfil_aprendiz"
CLASSES = ["Apto", "Bloqueo_Cognitivo", "Exceso_Confianza"]
IDS = ["user_id", "simulacion_id"]


def read_arff(path):
    """ARFF denso Weka; admite string y nominal, sin cargar enormes dominios."""
    attrs, relation = [], ""
    with path.open(encoding="utf-8-sig") as f:
        for line in f:
            s = line.strip()
            if s.lower().startswith("@relation"):
                relation = s[9:].strip()
            elif s.lower().startswith("@attribute"):
                m = re.match(r"@attribute\s+(?:'([^']+)'|\"([^\"]+)\"|(\S+))\s+(.+)", s, re.I)
                if not m:
                    raise ValueError(f"Cabecera no admitida: {path}")
                attrs.append((next(x for x in m.groups()[:3] if x is not None), m[4]))
            elif s.lower() == "@data":
                break
        else:
            raise ValueError(f"Falta @data: {path}")
        frame = pd.read_csv(f, names=[a[0] for a in attrs], quotechar="'",
                            na_values=["?"], keep_default_na=False, low_memory=False)
    for name, kind in attrs:
        if kind.lower() in {"numeric", "real", "integer"}:
            frame[name] = pd.to_numeric(frame[name], errors="raise")
    return frame, relation, dict(attrs)


def dump_json(path, obj):
    def clean(v):
        if isinstance(v, dict):
            return {str(k): clean(x) for k, x in v.items()}
        if isinstance(v, (list, tuple)):
            return [clean(x) for x in v]
        if isinstance(v, np.generic):
            return clean(v.item())
        if isinstance(v, float) and not np.isfinite(v):
            return None
        return v
    path.write_text(json.dumps(clean(obj), ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")


def weka_quartiles(x):
    """Índices de InterquartileRange.computeThresholds Weka 3.8.
    No equivale a np.quantile(method='linear'). Solo valores completos.
    Referencia: Waikato/weka-3.8, InterquartileRange.java.
    """
    x = np.sort(np.asarray(x, dtype=float))
    if len(x) < 4 or not np.isfinite(x).all():
        raise ValueError("IQR Weka requiere >=4 valores finitos en esta auditoría")
    n, h = len(x), len(x) // 2
    q = h // 2
    q2 = x[h] if n % 2 else (x[h] + x[h + 1]) / 2
    if h % 2:
        return x[q], q2, x[n-q-1]
    return (x[q] + x[q+1])/2, q2, (x[n-q-1] + x[n-q])/2


def signatures(df, cols):
    # ARFF guarda seis decimales: canonizar también números escritos como string.
    norm = pd.DataFrame(index=df.index)
    for c in cols:
        s = df[c]
        n = pd.to_numeric(s, errors="coerce")
        norm[c] = s.fillna("<NA>").astype(str)
        ok = n.notna()
        norm.loc[ok, c] = n[ok].map(lambda v: f"{v:.6f}")
    return Counter(pd.util.hash_pandas_object(norm, index=False).tolist())


def numeric_frame(df, names):
    return df[names].apply(pd.to_numeric, errors="coerce")


def describe_stage(name, df, numeric, out, normality, correlations, descriptives):
    num = numeric_frame(df, numeric)
    groups = [("TODOS", num)] + [(c, num.loc[df[TARGET] == c]) for c in CLASSES]
    for label, group in groups:
        d = group.describe(percentiles=[.25, .5, .75]).T
        d["missing"] = group.isna().sum()
        d["skew"] = group.skew()
        d["excess_kurtosis"] = group.kurt()
        d["stage"], d["class"] = name, label
        descriptives.append(d.rename_axis("attribute").reset_index())
        for col in numeric:
            x = group[col].dropna().to_numpy(dtype=float)
            if len(x) < 8 or np.ptp(x) == 0:
                continue
            # Shapiro solo hasta 5000, muestra determinista independiente por grupo.
            sample = np.random.default_rng(42).choice(x, min(5000, len(x)), replace=False)
            w, pw = stats.shapiro(sample) if np.ptp(sample) > 0 else (np.nan, np.nan)
            k, pk = stats.normaltest(x)
            normality.append(dict(stage=name, clase=label, attribute=col, n=len(x),
                                  shapiro_n=len(sample), W=w, shapiro_p=pw, K2=k, dagostino_p=pk))
        for a, b in combinations(numeric, 2):
            pair = group[[a, b]].dropna()
            if len(pair) < 3 or pair[a].nunique() < 2 or pair[b].nunique() < 2:
                continue
            r, p = stats.pearsonr(pair[a], pair[b])
            rho, ps = stats.spearmanr(pair[a], pair[b])
            correlations.append(dict(stage=name, clase=label, x=a, y=b, n=len(pair),
                                     pearson=r, pearson_p=p, spearman=rho, spearman_p=ps))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--data-dir", type=Path, default=Path(__file__).resolve().parent)
    ap.add_argument("--output", type=Path)
    ap.add_argument("--strict", action="store_true")
    ap.add_argument("--no-plots", action="store_true")
    args = ap.parse_args()
    root = args.data_dir.resolve()
    out = args.output or root / "auditoria_matematica"
    out.mkdir(parents=True, exist_ok=True)
    candidates = [root / "stock_quest_100k_raw.csv", root / "stockquest_edm_100000.csv"]
    raw_path = next((p for p in candidates if p.exists()), None)
    if raw_path is None:
        raise FileNotFoundError("No se encontró CSV original")
    raw = pd.read_csv(raw_path, low_memory=False)
    train, tr_rel, tr_types = read_arff(root / "train_80.arff")
    test, te_rel, te_types = read_arff(root / "test_20.arff")
    numeric = [c for c, t in tr_types.items() if t.lower() in {"numeric", "real", "integer"}]
    # Puntaje contaminado es STRING en los ARFF, pero se analiza numéricamente
    # con errores explícitos. Nunca se usa esta coerción para simular IQR Weka.
    stats_numeric = list(dict.fromkeys(numeric + ["puntaje_evaluacion_teorica"]))
    score = pd.to_numeric(raw.puntaje_evaluacion_teorica, errors="coerce")
    masks = pd.DataFrame({
        "outlier_inyectado": (raw.tiempo_decision_critica_seg == 9999) | (raw.costo_operativo_resultante == -1000000) | (raw.variacion_stock_seguridad_pct == 5000),
        "nulo": raw.isna().any(axis=1),
        "formato_o_imposible": score.isna() | ~score.between(0, 100),
        "duplicado_excedente": raw.duplicated(),
    })
    masks.assign(fila_csv=np.arange(len(raw))+2).to_csv(out / "anomalias_por_fila.csv", index=False)
    # Contrafactual documental, NO un archivo limpio realmente guardado en Weka.
    reference = raw.loc[~masks.any(axis=1)].copy()
    # Reconstruye el estado anterior al IQR que consta en las relaciones.
    pre_iqr = raw.copy()
    imputation = []
    for c in numeric:
        v = pd.to_numeric(pre_iqr[c], errors="raise")
        imputation.append(dict(attribute=c, missing=int(v.isna().sum()), mean=v.mean()))
        pre_iqr[c] = v.fillna(v.mean())
    pre_iqr = pre_iqr.drop_duplicates().reset_index(drop=True)
    pd.DataFrame(imputation).to_csv(out / "imputacion.csv", index=False)
    thresholds, flags = [], {}
    for stage, df in [("pre_iqr_reconstruido", pre_iqr), ("referencia_reglas", reference), ("train", train)]:
        fo, fe = np.zeros(len(df), bool), np.zeros(len(df), bool)
        for c in numeric:
            x = pd.to_numeric(df[c], errors="raise").to_numpy(float)
            q1, q2, q3 = weka_quartiles(x)
            iqr = q3-q1
            lo, hi, le, he = q1-3*iqr, q3+3*iqr, q1-6*iqr, q3+6*iqr
            o = ((x < lo) & (x >= le)) | ((x > hi) & (x <= he))
            e = (x < le) | (x > he)
            fo |= o
            fe |= e
            thresholds.append(dict(stage=stage, attribute=c, Q1=q1, median=q2, Q3=q3, IQR=iqr,
                                   lower_outlier=lo, upper_outlier=hi, lower_extreme=le, upper_extreme=he,
                                   outlier_count=int(o.sum()), extreme_count=int(e.sum()),
                                   pandas_Q1=np.quantile(x,.25), pandas_Q3=np.quantile(x,.75)))
        flags[stage] = (fo, fe)
    pd.DataFrame(thresholds).to_csv(out / "umbrales_iqr_weka.csv", index=False)
    pre_iqr["Outlier"] = np.where(flags["pre_iqr_reconstruido"][0], "yes", "no")
    pre_iqr["ExtremeValue"] = np.where(flags["pre_iqr_reconstruido"][1], "yes", "no")
    # Contraste de cada bandera guardada contra reconstrucción por ID único.
    flag_check = {}
    for label, df in [("train", train), ("test", test)]:
        joined = df.merge(pre_iqr[["simulacion_id", "Outlier", "ExtremeValue"]], on="simulacion_id", suffixes=("", "_replay"), validate="many_to_one")
        flag_check[label] = {c: int((joined[c] != joined[c+"_replay"]).sum()) for c in ["Outlier", "ExtremeValue"]}
        flag_check[label]["matched"] = len(joined)
    cols = list(raw.columns)
    a, b = signatures(train, cols), signatures(test, cols)
    overlap = sum((a & b).values())
    union = sum((a | b).values())
    partition = dict(train_n=len(train), test_n=len(test), row_overlap=overlap, union_n=union,
                     test_fraction_of_sum=len(test)/(len(train)+len(test)),
                     test_subset_of_train=not bool(b-a),
                     shared_users=len(set(train.user_id) & set(test.user_id)),
                     shared_simulations=len(set(train.simulacion_id) & set(test.simulacion_id)),
                     exact_80_20_counts=(len(train)==4*len(test)),
                     valid_disjoint_80_20=(len(train)==4*len(test) and overlap==0),
                     train_relation=tr_rel, test_relation=te_rel, same_schema=tr_types==te_types)
    clean_path = root / "stock_quest_clean.arff"
    clean_status = {"exists": clean_path.exists()}
    stages = [("raw", raw), ("referencia_reglas_NO_weka", reference), ("train", train), ("test", test)]
    if clean_path.exists():
        clean, _, _ = read_arff(clean_path)
        cs = signatures(clean, cols)
        clean_status.update(n=len(clean), union_equals_clean=(a+b==cs))
        stages.append(("clean_archivo", clean))
    norm, corr, desc = [], [], []
    for label, df in stages:
        print(f"Analizando {label}: {len(df)} filas", flush=True)
        describe_stage(label, df, stats_numeric, out, norm, corr, desc)
    pd.concat(desc, ignore_index=True).to_csv(out / "descriptivos.csv", index=False)
    pd.DataFrame(norm).to_csv(out / "normalidad.csv", index=False)
    pd.DataFrame(corr).to_csv(out / "correlaciones.csv", index=False)
    class_rows = []
    for label, df in stages:
        for c in CLASSES:
            n = int((df[TARGET] == c).sum())
            class_rows.append(dict(stage=label, clase=c, n=n, fraction=n/len(df)))
    pd.DataFrame(class_rows).to_csv(out / "distribucion_clases.csv", index=False)
    audit_path = root / "auditoria_NO_ENTRENAR.csv"
    injection = {}
    if audit_path.exists():
        truth = pd.read_csv(audit_path)
        expected = np.arange(len(raw))+2
        if not np.array_equal(truth.fila_csv, expected):
            raise ValueError("La auditoría no está alineada con filas del CSV")
        injection = truth.tipo_inyeccion.value_counts().to_dict()
        # Para duplicados importa el conjunto de copias, no cuál aparece primero.
        pd.crosstab(truth.tipo_inyeccion, masks.any(axis=1), dropna=False).to_csv(out / "inyeccion_vs_reglas.csv")
        lookup = raw[["simulacion_id"]].assign(tipo=truth.tipo_inyeccion)
        lookup = lookup.loc[lookup.tipo != "duplicado"].drop_duplicates("simulacion_id")
        pd.concat([df[["simulacion_id"]].merge(lookup, on="simulacion_id").assign(stage=s) for s,df in [("train",train),("test",test)]]).groupby(["stage","tipo"]).size().to_csv(out / "anomalias_retenidas.csv", header=["n"])
    result = dict(versions=dict(python=platform.python_version(), numpy=np.__version__, pandas=pd.__version__, scipy=scipy.__version__),
                  raw_n=len(raw), detected=masks.sum().to_dict(), union_anomalies=int(masks.any(axis=1).sum()),
                  reference_n=len(reference), pre_iqr_n=len(pre_iqr), injection=injection, partition=partition,
                  clean_file=clean_status, flag_mismatches=flag_check,
                  warning="Referencia por reglas no demuestra limpieza Weka ni mejora de modelos. P-valores no corrigen dependencia por usuario.")
    result["sha256"] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in [raw_path,root/"train_80.arff",root/"test_20.arff",root/"j48_resultados.txt"] if p.exists()}
    dump_json(out / "resumen.json", result)
    # Métricas de matriz publicada, no una nueva evaluación sobre test.
    log_path = root / "j48_resultados.txt"
    if log_path.exists():
        log = log_path.read_text(encoding="utf-8-sig")
        rows = re.findall(r"^\s*(\d+)\s+(\d+)\s+(\d+)\s*\|\s*\w\s*=\s*(\S+)", log, re.M)
        if len(rows) == 3:
            cm = np.array([[int(v) for v in r[:3]] for r in rows])
            labels = [r[3] for r in rows]
            pd.DataFrame(cm,index=labels,columns=labels).to_csv(out / "j48_cv_matriz.csv")
            n = cm.sum(); po = np.trace(cm)/n; pe = cm.sum(0) @ cm.sum(1)/n**2
            metrics = []
            for i,c in enumerate(labels):
                precision=cm[i,i]/cm[:,i].sum(); recall=cm[i,i]/cm[i,:].sum()
                metrics.append(dict(clase=c,precision=precision,recall=recall,F1=2*precision*recall/(precision+recall)))
            pd.DataFrame(metrics).to_csv(out / "j48_cv_metricas.csv", index=False)
            dump_json(out / "j48_cv_resumen.json", dict(n=n, accuracy=po, kappa=(po-pe)/(1-pe),
                evaluation="10-fold CV original; NO holdout", MAE_RMSE_ROC="Consultar log; no recuperables desde matriz"))
    if not args.no_plots:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        colors = ["#237a57", "#bb6221", "#425dbb"]
        fig, axes = plt.subplots(1,2,figsize=(12,5))
        for c,color in zip(CLASSES,colors):
            part = reference.loc[reference[TARGET]==c].sample(n=min(1500,int((reference[TARGET]==c).sum())),random_state=42)
            axes[0].scatter(part.tiempo_decision_critica_seg,part.frecuencia_consulta_pistas,s=7,alpha=.25,label=c,color=color)
            axes[1].scatter(part.tiempo_decision_critica_seg,part.quiebres_stock_generados,s=7,alpha=.25,color=color)
        for ax in axes:
            ax.set_xlabel("tiempo_decision_critica_seg"); ax.grid(alpha=.15)
        axes[0].set_ylabel("frecuencia_consulta_pistas"); axes[1].set_ylabel("quiebres_stock_generados")
        axes[0].legend(fontsize=8)
        fig.suptitle("Referencia por reglas; no equivale a limpieza Weka verificada")
        fig.tight_layout(); fig.savefig(out/"perfiles_referencia.png",dpi=160); plt.close(fig)
    print(json.dumps(result["partition"],ensure_ascii=False,indent=2))
    print(f"Resultados: {out.resolve()}")
    return 2 if args.strict and not partition["valid_disjoint_80_20"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
