"""Orquestador de las etapas 1–4. Resultado cacheado por hash del snapshot (T10)."""
from __future__ import annotations

import hashlib
import pickle
import time
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from . import carga, config, contexto, embeddings, organizar, priorizar


@dataclass
class Corpus:
    noticias: pd.DataFrame
    emb: np.ndarray
    eventos: list[dict]
    indicadores: pd.DataFrame
    sismos: pd.DataFrame
    calidad: list[dict]
    errores_carga: list[dict]
    corte: pd.Timestamp
    manifest: dict
    motor_embeddings: str
    tiempos: dict = field(default_factory=dict)

    def evento(self, id_evento: str) -> dict | None:
        return next((e for e in self.eventos if e["id_evento"] == id_evento), None)

    def noticia(self, id_noticia: str) -> dict | None:
        fila = self.noticias[self.noticias["id_noticia"] == id_noticia]
        return None if fila.empty else fila.iloc[0].to_dict()

    def evento_de(self, id_noticia: str) -> dict | None:
        return next((e for e in self.eventos if id_noticia in e["ids"]), None)

    def repriorizar(self, pesos: dict[str, float]) -> list[dict]:
        return priorizar.priorizar(self.eventos, self.corte, pesos)


def _huella() -> str:
    h = hashlib.sha256()
    for nombre in ("noticias.csv", "indicadores.csv", "eventos.geojson"):
        ruta = config.PROC / nombre
        if ruta.exists():
            h.update(ruta.read_bytes())
    h.update(config.REGLAS_VERSION.encode())
    for modulo in sorted((config.RAIZ / "rastro").glob("*.py")):  # cambiar reglas o código invalida el caché
        h.update(modulo.read_bytes())
    return h.hexdigest()[:16]


def procesar(usar_cache: bool = True) -> Corpus:
    huella = _huella()
    ruta_cache = config.CACHE / f"corpus_{huella}.pkl"
    if usar_cache and ruta_cache.exists():
        with open(ruta_cache, "rb") as f:
            return pickle.load(f)

    t = {}
    t0 = time.perf_counter()
    noticias, rep_n = carga.cargar_noticias()
    indicadores, rep_i = carga.cargar_indicadores()
    sismos, rep_s = carga.cargar_sismos()
    manifest = carga.cargar_manifest()
    corte = pd.Timestamp(manifest.get("fecha_corte_UTC") or pd.Timestamp.now(tz="UTC"))
    t["cargar"] = time.perf_counter() - t0

    t0 = time.perf_counter()
    titulos = noticias["titulo"].tolist()
    if embeddings.motor() == "tfidf":
        embeddings.ajustar_tfidf(titulos)
    emb = embeddings.codificar(titulos)  # titular completo: búsqueda y relación con Panamá
    # Sin la entidad omnipresente ("Panamá"): clasificar temas, agrupar eventos y detectar réplicas
    emb_evento = embeddings.codificar([organizar.texto_para_agrupar(t) for t in titulos])
    temas, conf = organizar.clasificar_semantico(titulos, emb_evento)
    noticias["tema"] = temas
    noticias["confianza_tema"] = conf
    noticias["tema_baseline"] = organizar.clasificar_baseline(titulos)
    etiquetas = organizar.agrupar_eventos(noticias, emb_evento)
    noticias["cluster"] = etiquetas
    eventos = organizar.construir_eventos(noticias, emb_evento, etiquetas, corte)
    t["organizar"] = time.perf_counter() - t0

    t0 = time.perf_counter()
    contexto.contextualizar(eventos, dict(zip(noticias["id_noticia"], titulos)), indicadores, sismos)
    eventos = priorizar.priorizar(eventos, corte)
    t["contextualizar_priorizar"] = time.perf_counter() - t0

    corpus = Corpus(noticias=noticias, emb=emb, eventos=eventos, indicadores=indicadores, sismos=sismos,
                    calidad=[rep_n.resumen(), rep_i.resumen(), rep_s.resumen()], errores_carga=rep_n.errores,
                    corte=corte, manifest=manifest, motor_embeddings=embeddings.motor(), tiempos=t)
    with open(ruta_cache, "wb") as f:
        pickle.dump(corpus, f)
    return corpus
