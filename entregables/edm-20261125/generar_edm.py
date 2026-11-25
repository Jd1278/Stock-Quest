"""Stock-Quest EDM: 100000 filas; ejecutar con Python 3.10+.
Instalación: python -m pip install pandas numpy Faker
Uso: python generar_edm.py --salida ./dataset_edm
Etiquetas conductuales sintéticas, no diagnósticos de personas.
"""
from pathlib import Path
import argparse
import json
import re
import time
import numpy as np
import pandas as pd
from faker import Faker

SEED = 42
TOTAL, LIMPIOS, OUTLIERS = 100_000, 80_000, 10_000
NULOS, DUPLICADOS, FORMATOS = 3_334, 3_333, 3_333
CLASES = np.array(["Apto", "Bloqueo_Cognitivo", "Exceso_Confianza"])
COLUMNAS = [
    "user_id", "nivel_experiencia_previa", "horas_capacitacion_teorica",
    "modulos_completados", "puntaje_evaluacion_teorica", "intentos_quiz",
    "tiempo_lectura_contenido_seg", "tasa_acierto_conceptual",
    "simulacion_id", "tiempo_decision_critica_seg",
    "variacion_stock_seguridad_pct", "frecuencia_consulta_pistas",
    "cambios_orden_antes_confirmar", "costo_operativo_resultante",
    "quiebres_stock_generados", "sobrecosto_almacenamiento",
    "nivel_riesgo_asumido", "clase_perfil_aprendiz",
]


def simular(rng, clase, habilidad, variacion):
    """14 días vectorizados por cohorte; balance inspirado en MotorInventario.
    Un bucle de 14 pasos temporales, nunca un bucle por las 100000 filas.
    Costos ficticios: unidad=10, pedido=25, tenencia=0.4, faltante=18.
    """
    n, dias, plazo = len(clase), 14, 3
    demanda = rng.poisson(35, size=(dias, n))
    ordenes = np.zeros((dias, n), dtype=np.int64)
    stock = np.full(n, 140, dtype=np.int64)
    costo = stock.astype(float) * 10  # adquisición del inventario inicial
    quiebres = np.zeros(n, dtype=np.int64)
    exceso_coste = np.zeros(n)
    proteccion = 20 * (1 + variacion / 100)
    sesgo = np.array([1.0, 0.92, 0.70])[clase]
    ruido = np.array([0.06, 0.23, 0.25])[clase]
    for dia in range(dias):
        recibido = ordenes[dia - plazo] if dia >= plazo else 0
        disponible = stock + recibido
        vendido = np.minimum(disponible, demanda[dia])
        perdido = demanda[dia] - vendido
        stock = disponible - vendido
        # Solo pedidos pendientes y expectativa de demanda, sin mirar el futuro.
        pendiente = ordenes[max(0, dia - plazo + 1):dia].sum(axis=0)
        factor = np.clip(rng.normal(sesgo, ruido), 0.2, 1.8)
        objetivo = 35 * (plazo + 1) * factor + proteccion
        pedido = np.clip(np.rint(objetivo - stock - pendiente), 0, 500).astype(int)
        pausa = (clase == 1) & (rng.random(n) < 0.10 * (1.2 - habilidad))
        pedido[pausa] = 0
        ordenes[dia] = pedido
        costo += pedido * 10 + (pedido > 0) * 25 + stock * 0.4 + perdido * 18
        quiebres += perdido > 0  # días con demanda no atendida, no unidades
        exceso_coste += np.maximum(stock - 70, 0) * 0.4
    return np.round(costo, 2), quiebres, np.round(exceso_coste, 2)


def generar_base(rng, fake):
    n = TOTAL - DUPLICADOS
    usuarios = 5_000
    indice = np.arange(n)
    usuario = indice % usuarios
    sesion = indice // usuarios + 1
    # Faker crea un espacio de IDs ficticio; NumPy construye todos los IDs.
    prefijo = fake.uuid4()[:8]
    ids = np.char.add(f"u_{prefijo}_", np.char.zfill(np.arange(usuarios).astype(str), 5))
    experiencia = rng.choice(3, size=usuarios, p=[0.45, 0.40, 0.15])
    ritmo = rng.uniform(0.35, 1.15, size=usuarios)
    aptitud = rng.beta(5, 3, size=usuarios)
    horas = np.round(sesion * ritmo[usuario], 2)
    modulos = np.minimum(9, np.floor(horas / 2)).astype(int)
    habilidad = np.clip(0.4 * aptitud[usuario] + 0.13 * experiencia[usuario]
                        + 0.018 * horas, 0.1, 0.95)
    # Un estado por sesión: no convertir la etiqueta en un rasgo fijo del usuario.
    clase = rng.choice(3, size=n, p=[0.50, 0.25, 0.25])
    dominio = np.clip(np.array([0.79, 0.60, 0.76])[clase]
                      + 0.22 * (habilidad - 0.5) + rng.normal(0, 0.07, n), 0.15, 0.98)
    puntaje = rng.binomial(20, dominio) * 5  # media de 20 respuestas 0/100
    acierto = rng.binomial(20, np.clip(dominio - 0.03, 0.05, 0.98)) / 20
    intentos = np.clip(1 + rng.poisson(0.4 + 3 * (1 - dominio)), 1, 8)
    lectura = np.clip(rng.lognormal(np.log(400 + 250 * (1 - habilidad)), 0.4), 60, 2400)
    tiempo = np.clip(rng.lognormal(np.log(np.array([65, 260, 14])[clase]), 0.45), 3, 1200)
    pistas = rng.poisson(np.array([1.0, 5.5, 0.10])[clase])
    pistas = np.minimum(pistas, 25)
    cambios = np.minimum(rng.poisson(np.array([1.1, 5.0, 0.6])[clase]), 25)
    variacion = np.clip(rng.normal(np.array([8, 48, -42])[clase],
                                  np.array([14, 35, 24])[clase]), -80, 180)
    riesgo = np.clip(np.array([0.35, 0.30, 0.78])[clase]
                     + rng.normal(0, 0.20, n), 0, 1)
    costos, quiebres, exceso = simular(rng, clase, habilidad, variacion)
    datos = pd.DataFrame({
        "user_id": ids[usuario],
        "nivel_experiencia_previa": np.array(["Principiante", "Intermedio", "Avanzado"])[experiencia[usuario]],
        "horas_capacitacion_teorica": horas,
        "modulos_completados": modulos,
        "puntaje_evaluacion_teorica": puntaje,
        "intentos_quiz": intentos,
        "tiempo_lectura_contenido_seg": np.rint(lectura).astype(int),
        "tasa_acierto_conceptual": acierto,
        "simulacion_id": np.char.add(f"sim_{prefijo}_", np.char.zfill(indice.astype(str), 6)),
        "tiempo_decision_critica_seg": np.round(tiempo, 2),
        "variacion_stock_seguridad_pct": np.round(variacion, 2),
        "frecuencia_consulta_pistas": pistas,
        "cambios_orden_antes_confirmar": cambios,
        "costo_operativo_resultante": costos,
        "quiebres_stock_generados": quiebres,
        "sobrecosto_almacenamiento": exceso,
        "nivel_riesgo_asumido": np.array(["Bajo", "Medio", "Alto"])[np.digitize(riesgo, [0.40, 0.70])],
        "clase_perfil_aprendiz": CLASES[clase],
    }, columns=COLUMNAS)
    assert not datos.isna().any().any() and datos.simulacion_id.is_unique
    assert (datos.sobrecosto_almacenamiento <= datos.costo_operativo_resultante).all()
    assert datos.quiebres_stock_generados.between(0, 14).all()
    return datos.iloc[rng.permutation(n)].reset_index(drop=True)


def contaminar(base, rng):
    datos = base.copy()
    tipo = np.full(len(base), "limpio", dtype=object)
    ini, fin = LIMPIOS, LIMPIOS + OUTLIERS
    tipo[ini:fin] = "outlier"
    # Un extremo inyectado por fila; no se superpone con nulos o formatos.
    ix = np.arange(ini, fin)
    datos.loc[ix[::3], "tiempo_decision_critica_seg"] = 9999.0
    datos.loc[ix[1::3], "costo_operativo_resultante"] = -1_000_000.0
    datos.loc[ix[2::3], "variacion_stock_seguridad_pct"] = 5000.0
    ini, fin = fin, fin + NULOS
    tipo[ini:fin] = "nulo"
    # Exactamente una celda ausente en cada una de 3334 filas.
    datos["tiempo_lectura_contenido_seg"] = datos.tiempo_lectura_contenido_seg.astype(float)
    datos.loc[np.arange(ini, fin), "tiempo_lectura_contenido_seg"] = np.nan
    ini, fin = fin, fin + FORMATOS
    tipo[ini:fin] = "formato_o_imposible"
    datos["puntaje_evaluacion_teorica"] = datos.puntaje_evaluacion_teorica.astype(object)
    datos.loc[np.arange(ini, fin), "puntaje_evaluacion_teorica"] = np.resize(
        np.array([-15, 150, "ERROR_TIPO"], dtype=object), FORMATOS)
    # Copias exactas de filas limpias distintas; no añadir un ID de fila al CSV.
    fuentes = rng.choice(LIMPIOS, size=DUPLICADOS, replace=False)
    datos = pd.concat([datos, datos.iloc[fuentes].copy()], ignore_index=True)
    tipo = np.concatenate([tipo, np.full(DUPLICADOS, "duplicado", dtype=object)])
    orden = rng.permutation(TOTAL)
    return datos.iloc[orden].reset_index(drop=True), tipo[orden]


def verificar(datos, tipo):
    assert len(datos) == TOTAL and list(datos.columns) == COLUMNAS
    assert all(re.fullmatch(r"[a-z][a-z0-9_]*", c) for c in datos.columns)
    conteos = pd.Series(tipo).value_counts().to_dict()
    assert conteos == {"limpio": LIMPIOS, "outlier": OUTLIERS, "nulo": NULOS,
                       "duplicado": DUPLICADOS, "formato_o_imposible": FORMATOS}
    assert sum(conteos.values()) == TOTAL
    nulos = datos.isna()
    extremos = ((datos.tiempo_decision_critica_seg == 9999)
                | (datos.costo_operativo_resultante == -1_000_000)
                | (datos.variacion_stock_seguridad_pct == 5000))
    score = pd.to_numeric(datos.puntaje_evaluacion_teorica, errors="coerce")
    errores = score.isna() | ~score.between(0, 100)
    assert nulos.any(axis=1).sum() == nulos.to_numpy().sum() == NULOS
    assert datos.duplicated(keep="first").sum() == DUPLICADOS
    assert datos.duplicated(keep=False).sum() == 2 * DUPLICADOS
    assert extremos.sum() == OUTLIERS and errores.sum() == FORMATOS
    assert np.array_equal(extremos.to_numpy(), tipo == "outlier")
    assert np.array_equal(nulos.any(axis=1).to_numpy(), tipo == "nulo")
    assert np.array_equal(errores.to_numpy(), tipo == "formato_o_imposible")
    assert datos.clase_perfil_aprendiz.isin(CLASES).all()
    return conteos


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--salida", type=Path, default=Path("dataset_edm"))
    args = parser.parse_args()
    inicio = time.perf_counter()
    np.random.seed(SEED)
    rng = np.random.default_rng(SEED)
    fake = Faker("es_CO")
    fake.seed_instance(SEED)
    datos, tipo = contaminar(generar_base(rng, fake), rng)
    conteos = verificar(datos, tipo)
    args.salida.mkdir(parents=True, exist_ok=True)
    archivo = args.salida / "stockquest_edm_100000.csv"
    datos.to_csv(archivo, index=False, encoding="utf-8", na_rep="", lineterminator="\n")
    # Referencia de laboratorio separada: nunca incluirla como predictor.
    pd.DataFrame({"fila_csv": np.arange(TOTAL) + 2, "tipo_inyeccion": tipo}).to_csv(
        args.salida / "auditoria_NO_ENTRENAR.csv", index=False, encoding="utf-8")
    recargado = pd.read_csv(archivo, encoding="utf-8", low_memory=False)
    verificar(recargado, tipo)  # también comprueba el CSV realmente exportado
    distribucion = recargado.clase_perfil_aprendiz.value_counts().reindex(CLASES)
    reporte = {"semilla": SEED, "filas": TOTAL, "columnas": len(COLUMNAS),
               "inyeccion": conteos, "clases": distribucion.to_dict(),
               "numpy": np.__version__, "pandas": pd.__version__}
    (args.salida / "verificacion.json").write_text(
        json.dumps(reporte, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\n=== VERIFICACION STOCK-QUEST EDM: PASS ===")
    print(f"Total: {len(recargado):,} registros | {len(COLUMNAS)} columnas | UTF-8")
    for nombre in ["limpio", "outlier", "nulo", "duplicado", "formato_o_imposible"]:
        cantidad = conteos[nombre]
        print(f"{nombre:22s}: {cantidad:6,d} | {cantidad / TOTAL:.3%}")
    print(f"Datos sucios totales   : {NULOS + DUPLICADOS + FORMATOS:,} | 10.000%")
    print(f"Celdas nulas           : {NULOS:,}/{TOTAL * len(COLUMNAS):,} "
          f"= {NULOS / (TOTAL * len(COLUMNAS)):.6%}")
    print(f"Filas en pares duplicados: {2 * DUPLICADOS:,} | "
          f"{2 * DUPLICADOS / TOTAL:.3%}; copias excedentes: {DUPLICADOS:,}")
    print("Distribucion de clases:")
    for clase, cantidad in distribucion.items():
        print(f"  {clase:20s}: {cantidad:6,d} | {cantidad / TOTAL:.3%}")
    print(f"CSV: {archivo.resolve()}")
    print(f"Tiempo total con exportacion/verificacion: {time.perf_counter() - inicio:.2f} s")
    print("Outliers = extremos inyectados verificables; no una deteccion estadistica.")
    print("Etiquetas sinteticas de sesion, no diagnosticos. No entrenar con auditoria ni IDs.")


if __name__ == "__main__":
    main()
