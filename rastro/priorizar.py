"""Etapa 4 · Priorizar: puntaje de atención 0–100 y estado de evidencia (pág. 4).

P = 30R + 25I + 20U + 15N + 10E. Cada componente se normaliza a 0–1 con los
criterios documentados en COMPONENTES. El puntaje ordena; no es probabilidad de
verdad. El estado de evidencia se calcula aparte y nunca depende del puntaje.
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd

from . import config

TEMAS_INTERES_PUBLICO = {"economia", "logistica_canal", "servicios_publicos", "eventos_naturales"}

COMPONENTES = {
    "R": "Relevancia: 0,6 × relación con Panamá (titular menciona Panamá = 1; medio panameño = 0,7) "
         "+ 0,4 × pertenece a uno de los 6 temas del reto.",
    "I": "Impacto potencial: 0,5 × procedencias independientes (tope 4) + 0,3 × tema de interés público "
         "(economía, logística/Canal, servicios públicos, eventos naturales) + 0,2 × existe dato oficial vinculado. "
         "La cantidad de titulares repetidos no suma.",
    "U": f"Urgencia: decaimiento exponencial desde el último registro, vida media {config.VIDA_MEDIA_URGENCIA_H} h.",
    "N": "Novedad: 1 − similitud máxima con eventos anteriores del corpus. Las réplicas no la aumentan.",
    "E": "Evidencia disponible: 0,6 × procedencias independientes (tope 3) + 0,4 × fuente primaria u oficial vinculada.",
}


def _novedad(eventos: list[dict]) -> list[float]:
    orden = sorted(range(len(eventos)), key=lambda i: eventos[i]["primera_fecha"])
    cents = np.vstack([e["centroide"] for e in eventos]) if eventos else np.zeros((0, 1))
    nov = [1.0] * len(eventos)
    for pos, i in enumerate(orden):
        previos = orden[:pos]
        if previos:
            nov[i] = float(max(0.0, 1 - float((cents[previos] @ cents[i]).max())))
    return nov


def componentes(ev: dict, corte: pd.Timestamp, novedad: float) -> dict[str, float]:
    tema_valido = 1.0 if ev["tema"] in config.TEMAS else 0.0
    oficial = any(p["oficial"] for p in ev["procedencias"])
    dato_oficial = bool(ev.get("indicadores")) or bool(ev.get("sismo") and ev["sismo"].get("encontrado"))
    horas = max(0.0, (corte - ev["ultima_fecha"]).total_seconds() / 3600)
    return {
        "R": round(0.6 * ev["relacion_panama"] + 0.4 * tema_valido, 3),
        "I": round(0.5 * min(1, ev["n_procedencias"] / 4) + 0.3 * (ev["tema"] in TEMAS_INTERES_PUBLICO)
                   + 0.2 * dato_oficial, 3),
        "U": round(math.exp(-math.log(2) * horas / config.VIDA_MEDIA_URGENCIA_H), 3),
        "N": round(min(1.0, novedad), 3),
        "E": round(0.6 * min(1, ev["n_procedencias"] / 3) + 0.4 * (oficial or dato_oficial), 3),
    }


def nivel(p: float) -> str:
    return next(n for umbral, n in config.RANGOS if p >= umbral)


def estado_evidencia(ev: dict) -> tuple[str, str]:
    dato_oficial = bool(ev.get("indicadores")) or bool(ev.get("sismo") and ev["sismo"].get("encontrado"))
    oficial = any(p["oficial"] for p in ev["procedencias"]) or dato_oficial
    n = ev["n_procedencias"]
    if ev["conflictos"]:
        if n >= 2:
            return "parcial", "Hay versiones incompatibles de una cifra; requiere verificar con fuente primaria."
        return "insuficiente", "Versión única con cifras incompatibles."
    if n >= 3 or (n >= 2 and oficial):
        return "suficiente para el borrador", f"{n} procedencias independientes" + (" y dato oficial vinculado." if oficial else ".")
    if n == 2 or oficial:
        return "parcial", f"{n} procedencia(s) independiente(s)" + (" con dato oficial de contexto." if oficial else "; falta una fuente primaria.")
    return "insuficiente", "Una sola procedencia: los titulares adicionales son réplicas, no corroboración."


def priorizar(eventos: list[dict], corte: pd.Timestamp, pesos: dict[str, float] | None = None) -> list[dict]:
    pesos = pesos or config.PESOS
    total = sum(pesos.values()) or 1
    nov = _novedad(eventos)
    for ev, n in zip(eventos, nov):
        c = componentes(ev, corte, n)
        ev["componentes"] = c
        ev["puntaje"] = round(100 * sum(pesos[k] * c[k] for k in c) / total, 1)
        ev["nivel"] = nivel(ev["puntaje"])
        ev["estado_evidencia"], ev["motivo_evidencia"] = estado_evidencia(ev)
        ev["historia"] = historia(ev)
    # Empates: mayor urgencia y luego ID (pág. 4)
    return sorted(eventos, key=lambda e: (-e["puntaje"], -e["componentes"]["U"], e["id_evento"]))


def agenda_diversa(eventos: list[dict], k: int = 5, umbral: float = 0.72) -> list[dict]:
    """Top-k sin repetir la misma historia: un evento muy parecido a uno ya elegido se
    registra como «relacionado» en vez de ocupar otro puesto de la agenda."""
    from .embeddings import codificar
    from .organizar import texto_para_agrupar

    candidatos = eventos[: k * 6]
    reps = codificar([texto_para_agrupar(e["titulo"]) for e in candidatos])
    rep_de = {e["id_evento"]: v for e, v in zip(candidatos, reps)}

    from .organizar import _palabras

    def parecidos(a: dict, b: dict) -> bool:
        # Señal semántica (embeddings) o léxica (Jaccard de palabras de contenido): el modelo
        # pequeño subestima pares como «amplía programa de cupos…» (sim 0,57); el solapamiento léxico lo corrige.
        pa, pb = _palabras(texto_para_agrupar(a["titulo"])), _palabras(texto_para_agrupar(b["titulo"]))
        jaccard = len(pa & pb) / len(pa | pb) if pa | pb else 0.0
        return (float(a["centroide"] @ b["centroide"]) >= umbral
                or float(rep_de[a["id_evento"]] @ rep_de[b["id_evento"]]) >= umbral
                or jaccard >= 0.34)

    elegidos: list[dict] = []
    for ev in candidatos:
        gemelo = next((e for e in elegidos if parecidos(e, ev)), None)
        if gemelo is not None:
            gemelo.setdefault("relacionados", [])
            if ev["id_evento"] not in gemelo["relacionados"]:
                gemelo["relacionados"].append(ev["id_evento"])
            continue
        elegidos.append(ev)
        if len(elegidos) == k:
            break
    return elegidos


def historia(ev: dict) -> str:
    """Una frase que explica el número, sin sensacionalismo."""
    c = ev["componentes"]
    fuerte = max(c, key=c.get)
    nombres = {"R": "muy ligado a Panamá", "I": "de alcance público", "U": "reciente", "N": "novedoso",
               "E": "con evidencia disponible"}
    eco = (f"{ev['n_titulares']} titulares pero solo {ev['n_procedencias']} procedencia(s) independiente(s)"
           if ev["n_titulares"] > ev["n_procedencias"] else f"{ev['n_procedencias']} procedencia(s) independiente(s)")
    return f"Sube por ser {nombres[fuerte]}; {eco}. Evidencia: {ev['estado_evidencia']}."
