"""Etapa 2 · Organizar: temas, eventos, procedencias, conflictos y recirculación.

Cada tarea de IA tiene su baseline simple al lado (pág. 8):
  - clasificar_semantico  vs  clasificar_baseline   (reglas de palabras clave)
  - agrupar_eventos       vs  agrupar_baseline      (misma URL o ≥3 palabras en común)
"""
from __future__ import annotations

import hashlib
import re
import unicodedata
from collections import Counter, defaultdict

import numpy as np
import pandas as pd

from . import config
from .embeddings import codificar

DOMINIOS_PANAMA = ("tvn-2.com", "prensa.com", "laestrella.com.pa", "critica.com.pa", "telemetro.com",
                   "ecotvpanama.com", "panamaamerica.com.pa", "metrolibre.com", "midiario.com",
                   "newsroompanama.com", "martesfinanciero.com", ".pa")
STOP = set("""a al algo ante con contra de del desde el ella en entre es esta este hacia hasta la las lo los
mas más no o para pero por que se sin sobre su sus tras un una y ya the of to in and for on with""".split())


def normalizar(t: str) -> str:
    t = unicodedata.normalize("NFKD", (t or "").lower())
    return "".join(c for c in t if not unicodedata.combining(c))


# --- Temas ----------------------------------------------------------------------
def clasificar_baseline(titulos: list[str]) -> list[str]:
    """Baseline: el tema con más palabras clave presentes; sin coincidencias → 'otro'."""
    salida = []
    for t in titulos:
        tn = normalizar(t)
        conteo = {k: sum(normalizar(c) in tn for c in v["claves"]) for k, v in config.TEMAS.items()}
        mejor = max(conteo, key=conteo.get)
        salida.append(mejor if conteo[mejor] > 0 else config.TEMA_OTRO)
    return salida


def _prototipos() -> tuple[list[str], np.ndarray]:
    claves, vecs = [], []
    descripciones = {**{k: v["descripcion"] for k, v in config.TEMAS.items()}, **config.TEMAS_FUERA}
    for k, desc in descripciones.items():
        frases = [f.strip() for f in desc.split(",") if f.strip()]
        e = codificar(frases)
        p = e.mean(axis=0)
        claves.append(k)
        vecs.append(p / np.linalg.norm(p))
    return claves, np.vstack(vecs)


def clasificar_semantico(titulos: list[str], emb: np.ndarray | None = None) -> tuple[list[str], np.ndarray]:
    """Similitud coseno contra prototipos de cada tema (zero-shot con embeddings)."""
    claves, protos = _prototipos()
    emb = codificar(titulos) if emb is None else emb
    sim = emb @ protos.T
    idx = sim.argmax(axis=1)
    temas = [claves[i] if (sim[j, i] >= config.UMBRAL_TEMA and claves[i] in config.TEMAS) else config.TEMA_OTRO
             for j, i in enumerate(idx)]
    return temas, sim.max(axis=1)


def texto_para_agrupar(titulo: str) -> str:
    """Quita la entidad omnipresente del corpus ("Panamá") y prefijos de formato para que la
    similitud mida de qué trata la noticia y no dónde ocurre."""
    t = re.sub(r"(?i)\bcanal de panam[aá]\b", "Canal", titulo or "")  # conservar la entidad «el Canal»
    t = re.sub(r"(?i)\b(rep[uú]blica de |ciudad de )?panam[aá]\b|\bpaname[nñ]\w*", " ", t)
    t = re.sub(r"(?i)^\s*(\(\w+\)|v[ií]deo\s*\|)\s*", "", t)
    return re.sub(r"\s+", " ", t).strip(" :,-|") or (titulo or "")


def relacion_panama(titulo: str, medio: str) -> float:
    """0–1: menciona Panamá en el titular (1.0) o es un medio panameño (0.7)."""
    if re.search(r"panam", normalizar(titulo)):
        return 1.0
    return 0.7 if any(medio.endswith(d) or medio == d for d in DOMINIOS_PANAMA) else 0.0


# --- Eventos ------------------------------------------------------------------------
class _UF:
    def __init__(self, n: int) -> None:
        self.p = list(range(n))

    def find(self, x: int) -> int:
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def union(self, a: int, b: int) -> None:
        self.p[self.find(a)] = self.find(b)

    def grupos(self) -> list[list[int]]:
        g = defaultdict(list)
        for i in range(len(self.p)):
            g[self.find(i)].append(i)
        return list(g.values())


def agrupar_eventos(df: pd.DataFrame, emb: np.ndarray) -> np.ndarray:
    """Clustering aglomerativo (coseno, enlace promedio) + corte por ventana temporal."""
    from sklearn.cluster import AgglomerativeClustering
    n = len(df)
    if n < 2:
        return np.zeros(n, dtype=int)
    etiquetas = AgglomerativeClustering(
        n_clusters=None, metric="cosine", linkage="average",
        distance_threshold=1 - config.UMBRAL_EVENTO,
    ).fit_predict(emb)
    # Un evento abarca como máximo la ventana temporal desde su primer registro: así los
    # pronósticos diarios o las notas recurrentes no se encadenan en un solo "evento".
    fechas = df["fecha_ref"].values
    nuevas = np.empty(n, dtype=int)
    siguiente = 0
    ventana = np.timedelta64(config.VENTANA_EVENTO_H, "h")
    for c in np.unique(etiquetas):
        miembros = np.where(etiquetas == c)[0]
        orden = miembros[np.argsort(fechas[miembros])]
        inicio = fechas[orden[0]]
        for b in orden:
            if fechas[b] - inicio > ventana:
                siguiente += 1
                inicio = fechas[b]
            nuevas[b] = siguiente
        siguiente += 1
    return nuevas


def _palabras(t: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9ñ]{4,}", normalizar(t)) if w not in STOP}


def agrupar_baseline(df: pd.DataFrame) -> np.ndarray:
    """Baseline: misma URL o ≥3 palabras de contenido en común."""
    n = len(df)
    uf = _UF(n)
    pals = [_palabras(t) for t in df["titulo"]]
    urls = df["url"].str.lower().str.rstrip("/").tolist()
    for i in range(n):
        for j in range(i + 1, n):
            if urls[i] == urls[j] or len(pals[i] & pals[j]) >= 3:
                uf.union(i, j)
    etiquetas = np.empty(n, dtype=int)
    for k, g in enumerate(uf.grupos()):
        etiquetas[g] = k
    return etiquetas


# --- Procedencia ------------------------------------------------------------------
def agencia_en(titulo: str) -> str | None:
    tn = " " + normalizar(titulo) + " "
    for a in config.AGENCIAS:
        if re.search(r"[\s(\-|]" + re.escape(a.strip("() ")) + r"[\s)\-|:,.]", tn):
            return a.strip("() ").upper()
    return None


def procedencias(sub: pd.DataFrame, emb: np.ndarray) -> list[dict]:
    """Agrupa los titulares de un evento en procedencias independientes.

    Misma procedencia si: mismo medio, titulares casi idénticos (réplica) o la
    misma agencia citada. Una agencia replicada por cinco medios cuenta como una.
    """
    n = len(sub)
    uf = _UF(n)
    medios = sub["medio"].tolist()
    ags = [agencia_en(t) for t in sub["titulo"]]
    sim = emb @ emb.T if n > 1 else np.ones((1, 1))
    motivos = defaultdict(set)
    for i in range(n):
        for j in range(i + 1, n):
            m = None
            if medios[i] == medios[j]:
                m = "mismo medio"
            elif ags[i] and ags[i] == ags[j]:
                m = f"misma agencia ({ags[i]})"
            elif sim[i, j] >= config.UMBRAL_REPLICA:
                m = f"titular casi idéntico (sim {sim[i, j]:.2f})"
            if m:
                uf.union(i, j)
                motivos[(i, j)].add(m)
    salida = []
    for g in uf.grupos():
        g = sorted(g, key=lambda k: sub["fecha_ref"].iloc[k])
        razones = sorted({r for (a, b), rs in motivos.items() if a in g and b in g for r in rs})
        salida.append({
            "ids": [sub["id_noticia"].iloc[k] for k in g],
            "medios": sorted({medios[k] for k in g}),
            "agencia": next((ags[k] for k in g if ags[k]), None),
            "primer_registro": sub["fecha_ref"].iloc[g[0]],
            "tipo_fecha": sub["fecha_ref_tipo"].iloc[g[0]],
            "razones": razones,
            "oficial": any(any(medios[k].endswith(d) for d in config.DOMINIOS_OFICIALES) for k in g),
        })
    return sorted(salida, key=lambda p: p["primer_registro"])


# --- Conflictos de cifras (T05) ---------------------------------------------------
RE_CIFRA = re.compile(
    r"(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(%|por ciento|millones|mil millones|muertos|fallecidos|heridos|"
    r"personas|buques|días|dias|casos|grados|metros|toneladas|dólares|dolares|kilómetros|km)", re.I)


CONECTORES = STOP | {"baja", "sube", "cae", "llega", "alcanza", "supera", "registra", "deja", "suma", "hasta",
                      "unos", "unas", "cerca", "casi", "mas", "menos", "segun", "tras", "crece", "crecio"}


def cifras(titulo: str) -> list[tuple[str, str, str]]:
    """(valor, unidad, variable). La variable es la palabra de contenido más cercana antes de la
    cifra (p. ej. «desempleo … 8,5 %» vs «informalidad 45,8 %»), para no comparar peras con manzanas."""
    salida = []
    for m in RE_CIFRA.finditer(titulo or ""):
        previas = [w for w in re.findall(r"[a-zñ]+", normalizar(titulo[: m.start()]))[-4:] if w not in CONECTORES]
        variable = previas[-1][:5] if previas else ""
        salida.append((m.group(1).replace(",", "."), normalizar(m.group(2)).replace("dias", "días"), variable))
    return salida


def conflictos(sub: pd.DataFrame, procs: list[dict]) -> list[dict]:
    """Misma variable y unidad con valores distintos en procedencias distintas → versiones a revisar."""
    por_clave = defaultdict(lambda: defaultdict(list))
    proc_de = {i: k for k, p in enumerate(procs) for i in p["ids"]}
    for _, r in sub.iterrows():
        for v, u, var in cifras(r["titulo"]):
            por_clave[(u, var)][v].append((r["id_noticia"], proc_de.get(r["id_noticia"])))
    salida = []
    for (u, var), valores in por_clave.items():
        if len(valores) > 1:
            procs_distintas = {p for regs in valores.values() for _, p in regs}
            if len(procs_distintas) > 1:
                salida.append({"unidad": u, "variable": var, "versiones": [
                    {"valor": v, "ids": [i for i, _ in regs]} for v, regs in valores.items()],
                    "nota": "Las cifras difieren; pueden referirse a mediciones o períodos distintos. Verificar."})
    return salida


# --- Construcción de eventos ---------------------------------------------------------
def construir_eventos(df: pd.DataFrame, emb: np.ndarray, etiquetas: np.ndarray, corte: pd.Timestamp) -> list[dict]:
    eventos = []
    for c in np.unique(etiquetas):
        pos = np.where(etiquetas == c)[0]
        sub = df.iloc[pos].reset_index(drop=True)
        e = emb[pos]
        centro = e.mean(axis=0)
        rep = int(np.argmax(e @ centro))
        procs = procedencias(sub, e)
        ids = sorted(sub["id_noticia"])
        primera, ultima = sub["fecha_ref"].min(), sub["fecha_ref"].max()
        recirc = None
        if ultima - primera > pd.Timedelta(days=7):
            recirc = (f"Tema registrado por primera vez el {primera.tz_convert(config.TZ_PANAMA):%d/%m/%Y}; "
                      f"reaparece el {ultima.tz_convert(config.TZ_PANAMA):%d/%m/%Y}. No presentarlo como hecho nuevo.")
        tema = Counter(sub["tema"]).most_common(1)[0][0]
        eventos.append({
            "id_evento": "EV-" + hashlib.sha1("|".join(ids).encode()).hexdigest()[:8],
            "titulo": sub["titulo"].iloc[rep],
            "tema": tema,
            "ids": ids,
            "n_titulares": len(sub),
            "medios": sorted(set(sub["medio"])),
            "procedencias": procs,
            "n_procedencias": len(procs),
            "primera_fecha": primera,
            "ultima_fecha": ultima,
            "recirculacion": recirc,
            "conflictos": conflictos(sub, procs),
            "relacion_panama": float(np.mean([relacion_panama(t, m) for t, m in zip(sub["titulo"], sub["medio"])])),
            "confianza_tema": float(sub["confianza_tema"].mean()),
            "solo_titular": bool((sub["alcance_texto"] == "titular/metadatos").all()),
            "centroide": centro / (np.linalg.norm(centro) or 1),
            "tiene_tvn": bool((sub["medio"] == "tvn-2.com").any()),
        })
    marcar_recirculacion(eventos)
    return eventos


def marcar_recirculacion(eventos: list[dict], umbral: float = 0.85, dias: int = 7) -> None:
    """Un evento muy parecido a otro anterior (más de `dias` antes) es un tema que reaparece (T03)."""
    orden = sorted(eventos, key=lambda e: e["primera_fecha"])
    for k, ev in enumerate(orden):
        if ev["recirculacion"]:
            continue
        for previo in orden[:k]:
            if (ev["primera_fecha"] - previo["primera_fecha"] > pd.Timedelta(days=dias)
                    and float(ev["centroide"] @ previo["centroide"]) >= umbral):
                ev["recirculacion"] = (f"Tema muy similar registrado antes ({previo['id_evento']}, "
                                       f"{previo['primera_fecha'].tz_convert(config.TZ_PANAMA):%d/%m/%Y}): "
                                       f"«{previo['titulo'][:80]}». No presentarlo como hecho nuevo sin verificar qué cambió.")
                ev["evento_previo"] = previo["id_evento"]
                break
