"""Etapa 3 · Contextualizar: el dato oficial con su fecha, o "sin dato oficial pertinente".

La relación noticia↔indicador solo se crea con evidencia explícita en el titular
(palabras que nombran la variable). Nunca se fuerza (pág. 3).
"""
from __future__ import annotations

import re

import pandas as pd

from . import config
from .organizar import normalizar

# variable mencionada en el titular → indicador del Banco Mundial
VINCULOS = [
    (r"inflaci|precios? al consumidor|costo de (la )?vida|ipc", "FP.CPI.TOTL.ZG", "Inflación, precios al consumidor (% anual)"),
    (r"desemple|empleo|trabajo informal|plazas de trabajo", "SL.UEM.TOTL.ZS", "Desempleo (% de la fuerza laboral)"),
    (r"\bpib\b|crecimiento econ|producto interno|economia (crece|creci|se contrae)", "NY.GDP.MKTP.KD.ZG", "Crecimiento del PIB (% anual)"),
    (r"export", "NE.EXP.GNFS.ZS", "Exportaciones de bienes y servicios (% del PIB)"),
    (r"internet|conectividad|digital", "IT.NET.USER.ZS", "Personas que usan internet (% de la población)"),
    (r"poblaci|habitantes|censo", "SP.POP.TOTL", "Población total"),
]
NOMBRE_PAIS = {"PAN": "Panamá", "CRI": "Costa Rica", "COL": "Colombia", "DOM": "Rep. Dominicana",
               "MEX": "México", "GTM": "Guatemala"}
RE_SISMO = re.compile(r"sismo|temblor|terremoto|magnitud", re.I)


def indicadores_para(titulos: list[str], indicadores: pd.DataFrame) -> list[dict]:
    texto = normalizar(" ".join(titulos))
    salida = []
    for patron, ind, nombre in VINCULOS:
        m = re.search(patron, texto)
        if not m:
            continue
        serie = indicadores[(indicadores["indicador_id"] == ind) & (indicadores["pais_iso3"] == "PAN")]
        con_valor = serie.dropna(subset=["valor"]).sort_values("anio")
        if con_valor.empty:
            salida.append({"indicador_id": ind, "nombre": nombre, "motivo": f"el titular menciona «{m.group(0)}»",
                           "ultimo": None, "aviso": "Sin valor disponible en el paquete para Panamá."})
            continue
        ult = con_valor.iloc[-1]
        anio = int(ult["anio"])
        region = indicadores[(indicadores["indicador_id"] == ind) & (indicadores["anio"] == anio)]
        salida.append({
            "indicador_id": ind,
            "nombre": nombre,
            "motivo": f"el titular menciona «{m.group(0)}»",
            "ultimo": {"pais": "PAN", "anio": anio, "valor": float(ult["valor"]), "unidad": ult["unidad"],
                       "fuente_url": ult["fuente_url"]},
            "etiqueta": f"Panamá · {anio} · {ult['unidad']} · Banco Mundial (dato anual, no es una cifra de hoy)",
            "serie": [{"anio": int(r.anio), "valor": None if pd.isna(r.valor) else float(r.valor)}
                      for r in serie.sort_values("anio").itertuples()],
            "region": [{"pais": NOMBRE_PAIS.get(r.pais_iso3, r.pais_iso3), "valor": None if pd.isna(r.valor) else float(r.valor)}
                       for r in region.itertuples()],
            "evidencia_id": f"WB:{ind}:PAN:{anio}",
        })
    return salida


def sismos_para(evento: dict, sismos: pd.DataFrame) -> dict | None:
    """Solo para hechos sísmicos. Nunca como evidencia de inundación o pérdidas."""
    if sismos.empty or not any(RE_SISMO.search(t or "") for t in [evento["titulo"]]):
        return None
    ini = evento["primera_fecha"] - pd.Timedelta(days=2)
    fin = evento["ultima_fecha"] + pd.Timedelta(days=1)
    cand = sismos[(sismos["time_dt"] >= ini) & (sismos["time_dt"] <= fin)].sort_values("magnitude", ascending=False)
    if cand.empty:
        cobertura = f"{sismos['time_dt'].min():%Y-%m-%d} a {sismos['time_dt'].max():%Y-%m-%d}"
        return {"encontrado": False,
                "nota": f"El paquete USGS no registra sismos en estas fechas (cobertura {cobertura}). "
                        "No se afirma ni se descarta el evento."}
    s = cand.iloc[0]
    return {"encontrado": True, "id": s["id"], "magnitud": s["magnitude"], "lugar": s["place"],
            "hora_utc": s["time"], "url": s["url"], "evidencia_id": f"USGS:{s['id']}",
            "nota": "Dato sísmico oficial. La caja regional no equivale al territorio de Panamá; no implica daños."}


def contextualizar(eventos: list[dict], titulos_por_id: dict[str, str], indicadores: pd.DataFrame,
                   sismos: pd.DataFrame) -> None:
    for ev in eventos:
        ev["indicadores"] = indicadores_para([titulos_por_id[i] for i in ev["ids"]], indicadores)
        ev["sismo"] = sismos_para(ev, sismos)
        ev["sin_dato_oficial"] = not ev["indicadores"] and not (ev["sismo"] and ev["sismo"].get("encontrado"))
