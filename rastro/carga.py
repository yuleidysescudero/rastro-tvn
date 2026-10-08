"""Etapa 1 · Cargar: lectura del snapshot y reporte de calidad (T01).

Las filas con errores se separan y se reportan; nunca bloquean la carga.
Los nulos se conservan (no se rellenan con cero).
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd

from . import config

OBLIGATORIOS_NOTICIAS = ["id_noticia", "titulo", "url", "medio"]
RE_URL = re.compile(r"^https?://[^\s/$.?#].[^\s]*$", re.I)


@dataclass
class ReporteCalidad:
    archivo: str
    total: int = 0
    validas: int = 0
    errores: list[dict] = field(default_factory=list)
    nulos_por_campo: dict[str, int] = field(default_factory=dict)
    advertencias: list[str] = field(default_factory=list)

    def resumen(self) -> dict:
        return {"archivo": self.archivo, "total": self.total, "validas": self.validas,
                "con_error": len(self.errores), "nulos_por_campo": self.nulos_por_campo,
                "advertencias": self.advertencias}


def _fecha(serie: pd.Series) -> pd.Series:
    return pd.to_datetime(serie.replace("", None), utc=True, errors="coerce", format="ISO8601")


def cargar_noticias(ruta: Path | None = None,
                    corte_ventana_dias: int | None = config.VENTANA_COBERTURA_DIAS) -> tuple[pd.DataFrame, ReporteCalidad]:
    ruta = ruta or config.PROC / "noticias.csv"
    df = pd.read_csv(ruta, dtype=str, keep_default_na=False)
    rep = ReporteCalidad(archivo=ruta.name, total=len(df))
    rep.nulos_por_campo = {c: int((df[c].str.strip() == "").sum()) for c in df.columns}

    motivos: dict[int, list[str]] = {}

    def marcar(mask: pd.Series, motivo: str) -> None:
        for i in df.index[mask]:
            motivos.setdefault(i, []).append(motivo)

    for c in OBLIGATORIOS_NOTICIAS:
        if c not in df.columns:
            rep.advertencias.append(f"falta la columna obligatoria '{c}'")
            df[c] = ""
        marcar(df[c].str.strip() == "", f"{c} vacío")

    marcar(df["id_noticia"].duplicated(keep="first") & (df["id_noticia"] != ""), "id duplicado")
    marcar((df["url"] != "") & ~df["url"].str.match(RE_URL), "url inválida")

    for c in ("fecha_publicacion", "fecha_deteccion"):
        if c not in df.columns:
            df[c] = ""
        bruto = df[c].str.strip()
        parseada = _fecha(df[c])
        marcar((bruto != "") & parseada.isna(), f"{c} inválida")
        df[c + "_dt"] = parseada

    sin_fecha = df["fecha_publicacion_dt"].isna() & df["fecha_deteccion_dt"].isna()
    marcar(sin_fecha, "sin fecha de publicación ni de detección")

    # Ventana de cobertura (pág. 6: 30 días, ampliable a 90). Lo que queda fuera se excluye y se reporta.
    fecha_ref = df["fecha_publicacion_dt"].fillna(df["fecha_deteccion_dt"])
    if "fecha_extraccion" in df.columns and corte_ventana_dias:
        corte = pd.to_datetime(df["fecha_extraccion"].replace("", None), utc=True, errors="coerce").max()
        if pd.notna(corte):
            marcar(fecha_ref < corte - pd.Timedelta(days=corte_ventana_dias),
                   f"fuera de la ventana de {corte_ventana_dias} días (excluido, no es error de formato)")
            marcar(fecha_ref > corte + pd.Timedelta(hours=1), "fecha posterior al corte del snapshot")

    for i, ms in motivos.items():
        rep.errores.append({"fila": int(i) + 2, "id_noticia": df.at[i, "id_noticia"], "motivos": ms})
    validas = df.drop(index=list(motivos)).copy()
    # Fecha de referencia: publicación si existe; si no, detección (nunca se mezclan en el CSV)
    validas["fecha_ref"] = validas["fecha_publicacion_dt"].fillna(validas["fecha_deteccion_dt"])
    validas["fecha_ref_tipo"] = validas["fecha_publicacion_dt"].notna().map(
        {True: "publicación", False: "detección GDELT"})
    rep.validas = len(validas)
    return validas.reset_index(drop=True), rep


def cargar_indicadores(ruta: Path | None = None) -> tuple[pd.DataFrame, ReporteCalidad]:
    ruta = ruta or config.PROC / "indicadores.csv"
    df = pd.read_csv(ruta, dtype={"anio": "Int64"})
    rep = ReporteCalidad(archivo=ruta.name, total=len(df), validas=len(df))
    rep.nulos_por_campo = {c: int(df[c].isna().sum()) for c in df.columns}
    if rep.nulos_por_campo.get("valor"):
        rep.advertencias.append(f"{rep.nulos_por_campo['valor']} combinaciones sin valor (se conservan como nulas)")
    return df, rep


def cargar_sismos(ruta: Path | None = None) -> tuple[pd.DataFrame, ReporteCalidad]:
    ruta = ruta or config.PROC / "eventos.geojson"
    geo = json.loads(Path(ruta).read_text(encoding="utf-8"))
    df = pd.DataFrame([f["properties"] for f in geo.get("features", [])])
    rep = ReporteCalidad(archivo=Path(ruta).name, total=len(df), validas=len(df))
    if not df.empty:
        df["time_dt"] = pd.to_datetime(df["time"], utc=True, errors="coerce")
    rep.advertencias.append("La caja regional (lat 5–12, lon −86 a −76) no equivale al territorio de Panamá.")
    return df, rep


def cargar_manifest() -> dict:
    ruta = config.PROC / "manifest.json"
    return json.loads(ruta.read_text(encoding="utf-8")) if ruta.exists() else {}
