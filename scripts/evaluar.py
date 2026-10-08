"""Evaluación reproducible: IA vs baseline y benchmark (pág. 9).

Reporta numerador, denominador y fallos; nunca solo un promedio.
  python scripts/evaluar.py                 # conjunto de desarrollo
  python scripts/evaluar.py --reservado     # conjunto reservado (solo al final / jurado)
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from dotenv import load_dotenv  # noqa: E402

load_dotenv()
from rastro import agente, config, organizar, pipeline  # noqa: E402

ETQ = config.DATA / "etiquetas"


def macro_f1(y_true, y_pred) -> dict:
    from sklearn.metrics import f1_score, precision_recall_fscore_support
    etiquetas = sorted(set(y_true))
    p, r, f, s = precision_recall_fscore_support(y_true, y_pred, labels=etiquetas, zero_division=0)
    return {"macro_f1": round(f1_score(y_true, y_pred, labels=etiquetas, average="macro", zero_division=0), 3),
            "por_tema": {t: {"precision": round(a, 2), "recall": round(b, 2), "f1": round(c, 2), "n": int(d)}
                         for t, a, b, c, d in zip(etiquetas, p, r, f, s)}}


def eval_temas(c) -> dict:
    ruta = ETQ / "temas.csv"
    if not ruta.exists():
        return {"estado": "pendiente: ejecutar preparar_etiquetado.py y etiquetar"}
    et = pd.read_csv(ruta, dtype=str, keep_default_na=False)
    et = et[et["tema_humano"].str.strip() != ""]
    if et.empty:
        return {"estado": "pendiente: sin etiquetas humanas todavía"}
    m = et.merge(c.noticias[["id_noticia", "tema", "tema_baseline"]], on="id_noticia")
    return {"n_etiquetas": len(m), "metodo": "una persona etiqueta sin ver la predicción",
            "ia_embeddings": macro_f1(m["tema_humano"], m["tema"]),
            "baseline_palabras_clave": macro_f1(m["tema_humano"], m["tema_baseline"])}


def eval_pares(c) -> dict:
    ruta = ETQ / "pares.csv"
    if not ruta.exists():
        return {"estado": "pendiente"}
    pr = pd.read_csv(ruta, dtype=str, keep_default_na=False)
    pr = pr[pr["mismo_evento_humano"].str.lower().isin(["si", "sí", "no"])]
    if pr.empty:
        return {"estado": "pendiente: sin etiquetas humanas todavía"}
    clus = dict(zip(c.noticias["id_noticia"], c.noticias["cluster"]))
    base = dict(zip(c.noticias["id_noticia"], organizar.agrupar_baseline(c.noticias)))
    out = {"n_pares": len(pr)}
    for nombre, asign in (("ia_embeddings", clus), ("baseline_url_o_3_palabras", base)):
        vp = fp = fn = 0
        for _, r in pr.iterrows():
            real = r["mismo_evento_humano"].lower() in ("si", "sí")
            pred = asign.get(r["id_a"]) == asign.get(r["id_b"])
            vp += real and pred
            fp += (not real) and pred
            fn += real and not pred
        out[nombre] = {"precision": f"{vp}/{vp + fp}", "recall": f"{vp}/{vp + fn}",
                       "precision_valor": round(vp / (vp + fp), 3) if vp + fp else None,
                       "recall_valor": round(vp / (vp + fn), 3) if vp + fn else None}
    return out


def eval_ranking(c) -> dict:
    ruta = ETQ / "top5_editor.csv"
    if not ruta.exists():
        return {"estado": "pendiente"}
    t = pd.read_csv(ruta, dtype=str, keep_default_na=False)
    elegidos = set(t.loc[t["elegido_por_editor"].str.lower().isin(["si", "sí"]), "id_evento"])
    if not elegidos:
        return {"estado": "pendiente: el editor aún no elige"}
    cand = set(t["id_evento"])
    rastro = [e["id_evento"] for e in c.eventos if e["id_evento"] in cand][:5]
    por_fecha = [e["id_evento"] for e in sorted(c.eventos, key=lambda e: e["ultima_fecha"], reverse=True)
                 if e["id_evento"] in cand][:5]
    return {"advertencia": "exploratoria si quien elige no es especialista editorial",
            "rastro_precision_at_5": f"{len(set(rastro) & elegidos)}/5",
            "baseline_fecha_precision_at_5": f"{len(set(por_fecha) & elegidos)}/5"}


def eval_benchmark(c, conjunto: str) -> dict:
    ruta = config.DATA / "benchmark" / "benchmark.jsonl"
    if not ruta.exists():
        return {"estado": "pendiente"}
    items = [json.loads(l) for l in ruta.read_text(encoding="utf-8").splitlines() if l.strip()]
    items = [i for i in items if i["conjunto"] == conjunto]
    filas, tiempos, costos = [], [], []
    for i in items:
        t0 = time.perf_counter()
        r = agente.responder(c, i["consulta"])
        tiempos.append(time.perf_counter() - t0)
        costos.append((r.get("meta") or {}).get("costo_usd") or 0)
        obtenido = r["tipo"]
        esp = i["esperado"]
        correcto = {"respuesta": obtenido in ("respuesta", "ranking"),
                    "mostrar_versiones": obtenido in ("respuesta", "abstencion"),
                    "abstencion": obtenido == "abstencion",
                    "rechazo_o_abstencion": obtenido in ("rechazo", "abstencion")}.get(esp, False)
        filas.append({"id": i["id"], "tipo": i["tipo"], "esperado": esp, "obtenido": obtenido, "correcto": correcto})
    df = pd.DataFrame(filas)

    def razon(mask):
        sub = df[mask]
        return f"{int(sub['correcto'].sum())}/{len(sub)}"

    abst_incorrectas = df[(df["esperado"] == "respuesta") & (df["obtenido"] == "abstencion")]
    tiempos_ord = sorted(tiempos)
    return {"conjunto": conjunto, "n": len(df),
            "abstencion_correcta_sin_respuesta": razon(df["tipo"] == "sin_respuesta"),
            "resistencia_adversarial": razon(df["tipo"] == "adversarial"),
            "respondidas_sustentadas": razon(df["tipo"] == "sustentada"),
            "abstenciones_incorrectas": f"{len(abst_incorrectas)}/{int((df['esperado'] == 'respuesta').sum())}",
            "tiempo_mediano_s": round(statistics.median(tiempos), 2) if tiempos else None,
            "tiempo_p95_s": round(tiempos_ord[int(0.95 * (len(tiempos_ord) - 1))], 2) if tiempos else None,
            "costo_total_usd": round(sum(costos), 4),
            "fallos": df[~df["correcto"]].to_dict("records")}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--reservado", action="store_true")
    args = ap.parse_args()
    c = pipeline.procesar()
    salida = {"fecha_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"), "reglas": config.REGLAS_VERSION,
              "motor_embeddings": c.motor_embeddings, "llm": config.LLM_MODELO,
              "clasificacion_temas": eval_temas(c), "agrupacion_eventos": eval_pares(c),
              "ranking": eval_ranking(c),
              "benchmark": eval_benchmark(c, "reservado" if args.reservado else "desarrollo")}
    nombre = "metricas_reservado.json" if args.reservado else "metricas.json"
    (config.RESULTADOS / nombre).write_text(json.dumps(salida, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
    print(json.dumps({k: v for k, v in salida.items() if k != "benchmark"}, ensure_ascii=False, indent=1, default=str))
    b = salida["benchmark"]
    print({k: v for k, v in b.items() if k != "fallos"} if isinstance(b, dict) else b)


if __name__ == "__main__":
    main()
