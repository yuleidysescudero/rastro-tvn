"""Embeddings multilingües con caché en disco.

- Modelo por defecto: paraphrase-multilingual-MiniLM-L12-v2 (corre en CPU, sin internet
  una vez descargado).
- Cada texto se cachea por hash: la demo offline no recalcula nada (T10).
- Si el modelo no puede cargarse, se usa TF-IDF de n-gramas de caracteres como
  respaldo declarado (motor = "tfidf"), para que la app nunca se caiga.
"""
from __future__ import annotations

import hashlib
import json
from functools import lru_cache

import numpy as np

from . import config

_CACHE_NPZ = config.CACHE / "embeddings.npz"
_CACHE_IDX = config.CACHE / "embeddings_idx.json"


def _clave(texto: str) -> str:
    return hashlib.sha1(texto.strip().lower().encode("utf-8")).hexdigest()


@lru_cache(maxsize=1)
def _modelo():
    try:
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer(config.MODELO_EMBEDDINGS, device="cpu")
    except Exception as e:  # sin red y sin modelo en caché, o librería ausente
        print(f"[embeddings] modelo no disponible ({e}); se usa TF-IDF de respaldo")
        return None


def motor() -> str:
    return "sentence-transformers" if _modelo() is not None else "tfidf"


class _Cache:
    def __init__(self) -> None:
        self.idx: dict[str, int] = {}
        self.vecs = np.zeros((0, 0), dtype=np.float32)
        if _CACHE_NPZ.exists() and _CACHE_IDX.exists():
            self.idx = json.loads(_CACHE_IDX.read_text(encoding="utf-8"))
            self.vecs = np.load(_CACHE_NPZ)["v"]

    def guardar(self) -> None:
        np.savez_compressed(_CACHE_NPZ, v=self.vecs)
        _CACHE_IDX.write_text(json.dumps(self.idx), encoding="utf-8")


_cache: _Cache | None = None


def codificar(textos: list[str]) -> np.ndarray:
    """Devuelve vectores normalizados (norma 1) para cada texto."""
    global _cache
    if not textos:
        return np.zeros((0, 1), dtype=np.float32)
    m = _modelo()
    if m is None:
        return _tfidf(textos)
    if _cache is None:
        _cache = _Cache()
    claves = [_clave(t) for t in textos]
    faltan = sorted({k: t for k, t in zip(claves, textos) if k not in _cache.idx}.items())
    if faltan:
        nuevos = m.encode([t for _, t in faltan], batch_size=64, normalize_embeddings=True,
                          show_progress_bar=False).astype(np.float32)
        base = len(_cache.idx)
        for j, (k, _) in enumerate(faltan):
            _cache.idx[k] = base + j
        _cache.vecs = nuevos if _cache.vecs.size == 0 else np.vstack([_cache.vecs, nuevos])
        _cache.guardar()
    return _cache.vecs[[_cache.idx[k] for k in claves]]


_tfidf_vectorizador = None


def ajustar_tfidf(corpus: list[str]) -> None:
    """Fija el vocabulario TF-IDF sobre el corpus (solo se usa en modo respaldo)."""
    global _tfidf_vectorizador
    from sklearn.feature_extraction.text import TfidfVectorizer
    _tfidf_vectorizador = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=1).fit(corpus)


def _tfidf(textos: list[str]) -> np.ndarray:
    if _tfidf_vectorizador is None:
        ajustar_tfidf(textos)
    v = _tfidf_vectorizador.transform(textos).toarray().astype(np.float32)
    n = np.linalg.norm(v, axis=1, keepdims=True)
    return v / np.where(n == 0, 1, n)
