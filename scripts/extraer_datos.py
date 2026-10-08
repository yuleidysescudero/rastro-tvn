"""Extractor del paquete público "Panamá · Señales y Evidencias" (RASTRO).

Construye el snapshot congelado que pide el reto (págs. 6-7):
  data/raw/...                    respuestas originales de cada fuente
  data/processed/noticias.csv     TVN RSS + GDELT DOC 2.0
  data/processed/indicadores.csv  Banco Mundial (cuadrícula completa, nulos conservados)
  data/processed/eventos.geojson  USGS (sismos 2024, caja regional)
  data/processed/manifest.json    versión, corte UTC, consultas, conteos, licencias, SHA-256

Uso:
  python scripts/extraer_datos.py               # todo
  python scripts/extraer_datos.py --solo gdelt  # una fuente
Las respuestas crudas se cachean: volver a correr no repite consultas ya hechas.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import quote

import requests

RAIZ = Path(__file__).resolve().parents[1]
RAW = RAIZ / "data" / "raw"
PROC = RAIZ / "data" / "processed"
VERSION = "v1"
UA = {"User-Agent": "Mozilla/5.0 (compatible; RASTRO-hackIAthon/1.0; team BillieJSON)"}

# --- Configuración de fuentes (pág. 6) -------------------------------------
TVN_RSS = "https://www.tvn-2.com/rss/"

GDELT_API = "https://api.gdeltproject.org/api/v2/doc/doc"
GDELT_ESPERA_S = 7  # la API exige ≤1 consulta cada 5 s
GDELT_DIAS = 30     # pág. 6: 30 días previos a la extracción (ampliable a 90)
GDELT_TRAMO_DIAS = 10
GDELT_CONSULTAS = {
    "general": "panamá sourcelang:spanish",
    "logistica_canal": '"canal de panamá"',
    "economia": "panamá (economía OR inflación OR empleo OR exportaciones OR PIB) sourcelang:spanish",
    "turismo": "panamá (turismo OR turistas OR hoteles) sourcelang:spanish",
    "eventos_naturales": "panamá (sismo OR temblor OR inundación OR lluvias OR deslizamiento) sourcelang:spanish",
    "servicios_publicos": "panamá (agua OR IDAAN OR electricidad OR apagón OR transporte) sourcelang:spanish",
    "regulacion": "panamá (ley OR decreto OR regulación OR resolución OR Asamblea) sourcelang:spanish",
    "panama_en": "panama sourcelang:english",
    "tvn_historico": "domain:tvn-2.com",
}

WB_PAISES = ["PAN", "CRI", "COL", "DOM", "MEX", "GTM"]
WB_ISO2 = {"PAN": "PA", "CRI": "CR", "COL": "CO", "DOM": "DO", "MEX": "MX", "GTM": "GT"}
WB_ANIOS = list(range(2010, 2025))
WB_INDICADORES = {
    "NY.GDP.MKTP.KD.ZG": "%",          # crecimiento del PIB (anual %)
    "FP.CPI.TOTL.ZG": "%",             # inflación, precios al consumidor (anual %)
    "SL.UEM.TOTL.ZS": "% fuerza laboral",
    "SP.POP.TOTL": "personas",
    "IT.NET.USER.ZS": "% población",
    "NE.EXP.GNFS.ZS": "% del PIB",
}

USGS_API = "https://earthquake.usgs.gov/fdsnws/event/1/query"
USGS_PARAMS = {
    "format": "geojson", "starttime": "2024-01-01", "endtime": "2025-01-01",
    "minlatitude": 5, "maxlatitude": 12, "minlongitude": -86, "maxlongitude": -76,
    "minmagnitude": 3, "orderby": "time-asc",
}

LICENCIAS = {
    "tvn_rss": "Metadatos públicos del RSS de TVN. No implica licencia sobre artículos, videos ni imágenes; solo se guardan titular, URL y fechas.",
    "gdelt": "GDELT DOC 2.0 API (uso abierto con atribución a The GDELT Project). No transfiere derechos de los medios enlazados; solo metadatos.",
    "worldbank": "CC BY 4.0 (World Bank Open Data), salvo excepciones indicadas en metadatos del indicador.",
    "usgs": "Dominio público (USGS Earthquake Hazards Program); confirmar condiciones de terceros.",
}


def ahora_utc() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def iso(dt: datetime | None) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if dt else ""


def sha256(ruta: Path) -> str:
    h = hashlib.sha256()
    with open(ruta, "rb") as f:
        for bloque in iter(lambda: f.read(65536), b""):
            h.update(bloque)
    return h.hexdigest()


def id_estable(prefijo: str, url: str) -> str:
    return f"{prefijo}-{hashlib.sha1(url.strip().lower().encode()).hexdigest()[:10]}"


def medio_desde_url(url: str) -> str:
    m = re.match(r"https?://(?:www\.)?([^/]+)", url or "")
    return m.group(1).lower() if m else ""


# --- TVN RSS ----------------------------------------------------------------
def extraer_tvn(corte: datetime, con_descripcion: bool) -> tuple[list[dict], dict]:
    destino = RAW / "tvn" / f"rss_{corte:%Y%m%dT%H%M%SZ}.xml"
    destino.parent.mkdir(parents=True, exist_ok=True)
    r = requests.get(TVN_RSS, headers=UA, timeout=30)
    r.raise_for_status()
    destino.write_bytes(r.content)

    filas = []
    for item in ET.fromstring(r.content).iter("item"):
        url = (item.findtext("link") or "").strip()
        titulo = (item.findtext("title") or "").strip()
        pub = item.findtext("pubDate")
        try:
            fpub = parsedate_to_datetime(pub) if pub else None
        except (TypeError, ValueError):
            fpub = None
        desc = (item.findtext("description") or "").strip()
        filas.append({
            "id_noticia": id_estable("TVN", url),
            "titulo": titulo,
            "url": url,
            "medio": "tvn-2.com",
            "idioma": "es",
            "fecha_publicacion": iso(fpub),
            "fecha_deteccion": "",  # el RSS no tiene fecha de detección: se deja nula
            "fecha_extraccion": iso(corte),
            "tema": "",             # lo asigna el pipeline de clasificación
            "origen": "tvn_rss",
            "alcance_texto": "titular+descripcion" if (con_descripcion and desc) else "titular/metadatos",
            "descripcion": desc if con_descripcion else "",
        })
    consulta = {"fuente": "tvn_rss", "url": TVN_RSS, "registros": len(filas), "raw": str(destino.relative_to(RAIZ))}
    print(f"[TVN] {len(filas)} items del RSS")
    return filas, consulta


# --- GDELT DOC 2.0 ------------------------------------------------------------
def _gdelt_get(params: dict, cache: Path) -> dict | None:
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    for intento in range(3):
        time.sleep(GDELT_ESPERA_S if intento == 0 else 60)
        try:
            r = requests.get(GDELT_API, params=params, headers=UA, timeout=60)
        except requests.RequestException as e:
            print(f"   red: {e}; reintento {intento + 1}")
            continue
        texto = r.text.strip()
        if r.status_code == 429 or texto.startswith("Please limit"):
            print(f"   GDELT pidió esperar; reintento {intento + 1}")
            continue
        if not texto:
            datos = {"articles": []}
        else:
            try:
                datos = json.loads(texto)
            except json.JSONDecodeError:
                print(f"   respuesta no JSON: {texto[:120]!r}")
                datos = {"articles": [], "_error": texto[:500]}
        cache.write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")
        return datos
    return None


def extraer_gdelt(corte: datetime, dias: int) -> tuple[list[dict], list[dict]]:
    carpeta = RAW / "gdelt"
    carpeta.mkdir(parents=True, exist_ok=True)
    filas, consultas = [], []
    inicio_total = corte - timedelta(days=dias)
    fallas_seguidas = 0
    for nombre, q in GDELT_CONSULTAS.items():
        ini = inicio_total
        while ini < corte:
            if fallas_seguidas >= 3:
                print("[GDELT] 3 tramos bloqueados seguidos: se detiene para no saturar la API. "
                      "Reintentar más tarde o desde otra red; el caché conserva lo ya obtenido.")
                return filas, consultas
            fin = min(ini + timedelta(days=GDELT_TRAMO_DIAS), corte)
            params = {
                "query": q, "mode": "artlist", "format": "json", "maxrecords": 250,
                "sort": "datedesc",
                "startdatetime": ini.strftime("%Y%m%d%H%M%S"),
                "enddatetime": fin.strftime("%Y%m%d%H%M%S"),
            }
            cache = carpeta / f"{nombre}_{ini:%Y%m%d}_{fin:%Y%m%d}.json"
            datos = _gdelt_get(params, cache)
            fallas_seguidas = 0 if datos is not None else fallas_seguidas + 1
            n = 0
            if datos is not None:
                for a in datos.get("articles", []):
                    url = a.get("url", "")
                    try:
                        fdet = datetime.strptime(a.get("seendate", ""), "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
                    except ValueError:
                        fdet = None
                    filas.append({
                        "id_noticia": id_estable("GD", url),
                        "titulo": (a.get("title") or "").strip(),
                        "url": url,
                        "medio": (a.get("domain") or medio_desde_url(url)).lower(),
                        "idioma": a.get("language", ""),
                        "fecha_publicacion": "",  # GDELT no da publicación; seendate es detección (pág. 7)
                        "fecha_deteccion": iso(fdet),
                        "fecha_extraccion": iso(corte),
                        "tema": "",
                        "origen": f"gdelt:{nombre}",
                        "alcance_texto": "titular/metadatos",
                        "descripcion": "",
                    })
                    n += 1
            estado = "ok" if datos is not None else "fallida"
            consultas.append({
                "fuente": "gdelt", "nombre": nombre, "query": q,
                "desde": iso(ini), "hasta": iso(fin), "registros": n, "estado": estado,
                "url": f"{GDELT_API}?query={quote(q)}&mode=artlist&format=json&maxrecords=250"
                       f"&startdatetime={params['startdatetime']}&enddatetime={params['enddatetime']}",
            })
            print(f"[GDELT] {nombre} {ini:%m-%d}→{fin:%m-%d}: {n} ({estado})")
            ini = fin
    return filas, consultas


# --- Respaldo: Google News RSS + RSS de medios panameños ---------------------------
# Se usa porque GDELT bloqueó nuestras consultas (ver Decisión D-03). Solo metadatos:
# titular, medio de origen, fecha de publicación y enlace.
GNEWS = "https://news.google.com/rss/search?q={q}%20when:{dias}d&hl=es-419&gl=PA&ceid=PA:es-419"
GNEWS_CONSULTAS = {
    "general": "Panamá",
    "logistica_canal": '"Canal de Panamá"',
    "economia": "Panamá (economía OR inflación OR empleo OR exportaciones)",
    "turismo": "Panamá (turismo OR turistas OR hoteles)",
    "eventos_naturales": "Panamá (sismo OR temblor OR inundación OR lluvias)",
    "servicios_publicos": "Panamá (IDAAN OR agua OR electricidad OR apagón OR metro)",
    "regulacion": "Panamá (ley OR decreto OR Asamblea OR resolución)",
}
RSS_MEDIOS = {
    "prensa.com": "https://www.prensa.com/arc/outboundfeeds/rss/",
    "critica.com.pa": "https://www.critica.com.pa/rss.xml",
    "panamaamerica.com.pa": "https://www.panamaamerica.com.pa/rss.xml",
    "ensegundos.com.pa": "https://www.ensegundos.com.pa/feed/",
}


def _items_rss(contenido: bytes):
    for item in ET.fromstring(contenido).iter("item"):
        pub = item.findtext("pubDate")
        try:
            fpub = parsedate_to_datetime(pub) if pub else None
        except (TypeError, ValueError):
            fpub = None
        src = item.find("source")
        yield item, fpub, src


def extraer_respaldo(corte: datetime, dias: int) -> tuple[list[dict], list[dict]]:
    carpeta = RAW / "respaldo"
    carpeta.mkdir(parents=True, exist_ok=True)
    filas, consultas = [], []
    for nombre, q in GNEWS_CONSULTAS.items():
        url = GNEWS.format(q=quote(q), dias=dias)
        cache = carpeta / f"gnews_{nombre}_{corte:%Y%m%d}.xml"
        if not cache.exists():
            time.sleep(2)
            r = requests.get(url, headers=UA, timeout=30)
            r.raise_for_status()
            cache.write_bytes(r.content)
        n = 0
        for item, fpub, src in _items_rss(cache.read_bytes()):
            titulo = (item.findtext("title") or "").strip()
            medio_nombre = src.text.strip() if src is not None and src.text else ""
            medio = medio_desde_url(src.get("url", "")) if src is not None else ""
            if medio_nombre and titulo.endswith(" - " + medio_nombre):
                titulo = titulo[: -len(medio_nombre) - 3].strip()
            enlace = (item.findtext("link") or "").strip()
            filas.append({
                "id_noticia": id_estable("GN", enlace), "titulo": titulo, "url": enlace, "medio": medio,
                "idioma": "es", "fecha_publicacion": iso(fpub), "fecha_deteccion": "",
                "fecha_extraccion": iso(corte), "tema": "", "origen": f"gnews:{nombre}",
                "alcance_texto": "titular/metadatos", "descripcion": "",
            })
            n += 1
        consultas.append({"fuente": "google_news_rss", "nombre": nombre, "query": q, "url": url, "registros": n})
        print(f"[GNEWS] {nombre}: {n}")
    for medio, url in RSS_MEDIOS.items():
        cache = carpeta / f"rss_{medio}_{corte:%Y%m%dT%H%M}.xml"
        try:
            r = requests.get(url, headers=UA, timeout=30)
            r.raise_for_status()
            cache.write_bytes(r.content)
        except requests.RequestException as e:
            print(f"[RSS] {medio}: falló ({e})")
            consultas.append({"fuente": "rss_medio", "medio": medio, "url": url, "registros": 0, "estado": "fallida"})
            continue
        n = 0
        for item, fpub, _ in _items_rss(r.content):
            enlace = (item.findtext("link") or "").strip()
            filas.append({
                "id_noticia": id_estable("RS", enlace), "titulo": (item.findtext("title") or "").strip(),
                "url": enlace, "medio": medio, "idioma": "es", "fecha_publicacion": iso(fpub),
                "fecha_deteccion": "", "fecha_extraccion": iso(corte), "tema": "", "origen": f"rss:{medio}",
                "alcance_texto": "titular/metadatos", "descripcion": "",
            })
            n += 1
        consultas.append({"fuente": "rss_medio", "medio": medio, "url": url, "registros": n})
        print(f"[RSS] {medio}: {n}")
    return filas, consultas


# --- Banco Mundial ------------------------------------------------------------
def extraer_worldbank(corte: datetime) -> tuple[list[dict], list[dict]]:
    carpeta = RAW / "worldbank"
    carpeta.mkdir(parents=True, exist_ok=True)
    valores, nombres, consultas = {}, {}, []
    paises = ";".join(WB_PAISES)
    for ind in WB_INDICADORES:
        url = (f"https://api.worldbank.org/v2/country/{paises}/indicator/{ind}"
               f"?date={WB_ANIOS[0]}:{WB_ANIOS[-1]}&format=json&per_page=2000")
        cache = carpeta / f"{ind}.json"
        if cache.exists():
            datos = json.loads(cache.read_text(encoding="utf-8"))
        else:
            r = requests.get(url, headers=UA, timeout=60)
            r.raise_for_status()
            datos = r.json()
            cache.write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")
        filas = datos[1] if isinstance(datos, list) and len(datos) > 1 and datos[1] else []
        for f in filas:
            nombres[ind] = f["indicator"]["value"]
            valores[(f["countryiso3code"], ind, int(f["date"]))] = f["value"]
        consultas.append({"fuente": "worldbank", "indicador": ind, "url": url, "registros": len(filas)})
        print(f"[WB] {ind}: {len(filas)} filas")

    # Cuadrícula completa país × indicador × año; los faltantes quedan nulos (pág. 6-7)
    salida = []
    for p in WB_PAISES:
        for ind, unidad in WB_INDICADORES.items():
            for anio in WB_ANIOS:
                salida.append({
                    "pais_iso3": p, "indicador_id": ind, "indicador_nombre": nombres.get(ind, ""),
                    "anio": anio, "valor": valores.get((p, ind, anio)), "unidad": unidad,
                    "fuente_url": f"https://data.worldbank.org/indicator/{ind}?locations={WB_ISO2[p]}",
                    "fecha_extraccion": iso(corte), "licencia": "CC BY 4.0",
                })
    return salida, consultas


# --- USGS ---------------------------------------------------------------------
def extraer_usgs(corte: datetime) -> tuple[dict, dict]:
    carpeta = RAW / "usgs"
    carpeta.mkdir(parents=True, exist_ok=True)
    cache = carpeta / "sismos_2024.geojson"
    if cache.exists():
        datos = json.loads(cache.read_text(encoding="utf-8"))
    else:
        r = requests.get(USGS_API, params=USGS_PARAMS, headers=UA, timeout=60)
        r.raise_for_status()
        datos = r.json()
        cache.write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")
    feats = []
    for f in datos.get("features", []):
        p, (lon, lat, prof) = f["properties"], f["geometry"]["coordinates"][:3]
        feats.append({
            "type": "Feature", "geometry": f["geometry"],
            "properties": {
                "id": f["id"], "magnitude": p.get("mag"),
                "time": iso(datetime.fromtimestamp(p["time"] / 1000, tz=timezone.utc)) if p.get("time") else "",
                "updated": iso(datetime.fromtimestamp(p["updated"] / 1000, tz=timezone.utc)) if p.get("updated") else "",
                "longitude": lon, "latitude": lat, "depth": prof, "place": p.get("place"),
                "status": p.get("status"), "url": p.get("url"),
            },
        })
    print(f"[USGS] {len(feats)} sismos")
    consulta = {"fuente": "usgs", "url": USGS_API, "params": USGS_PARAMS, "registros": len(feats)}
    return {"type": "FeatureCollection", "features": feats}, consulta


# --- Escritura y manifest -----------------------------------------------------
CAMPOS_NOTICIAS = ["id_noticia", "titulo", "url", "medio", "idioma", "fecha_publicacion",
                   "fecha_deteccion", "fecha_extraccion", "tema", "origen", "alcance_texto", "descripcion"]


def escribir_noticias(filas: list[dict]) -> dict:
    """Deduplica por URL (pág. 6) y conserva todos los orígenes de cada registro."""
    por_url: dict[str, dict] = {}
    for f in filas:
        clave = f["url"].strip().lower().rstrip("/")
        if not clave:
            continue
        if clave in por_url:
            previo = por_url[clave]
            if f["origen"] not in previo["origen"].split("|"):
                previo["origen"] += "|" + f["origen"]
            # el RSS de TVN aporta fecha de publicación real; no se pierde
            previo["fecha_publicacion"] = previo["fecha_publicacion"] or f["fecha_publicacion"]
            previo["fecha_deteccion"] = previo["fecha_deteccion"] or f["fecha_deteccion"]
        else:
            por_url[clave] = dict(f)
    unicas = sorted(por_url.values(), key=lambda r: r["id_noticia"])
    ruta = PROC / "noticias.csv"
    with open(ruta, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=CAMPOS_NOTICIAS)
        w.writeheader()
        w.writerows(unicas)
    return {"brutos": len(filas), "unicos": len(unicas), "duplicados_url": len(filas) - len(unicas)}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--solo", choices=["tvn", "gdelt", "respaldo", "worldbank", "usgs"])
    ap.add_argument("--dias", type=int, default=GDELT_DIAS)
    ap.add_argument("--con-descripcion", action="store_true",
                    help="guarda la descripción del RSS de TVN (solo con autorización del patrocinador)")
    args = ap.parse_args()

    PROC.mkdir(parents=True, exist_ok=True)
    corte = ahora_utc()
    manifest_path = PROC / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    manifest.setdefault("consultas", {})
    fuentes = [args.solo] if args.solo else ["tvn", "gdelt", "respaldo", "worldbank", "usgs"]

    noticias_previas: list[dict] = []
    if (PROC / "noticias.csv").exists() and args.solo in ("tvn", "gdelt", "respaldo"):
        with open(PROC / "noticias.csv", encoding="utf-8") as fh:
            noticias_previas = list(csv.DictReader(fh))

    nuevas: list[dict] = []
    if "tvn" in fuentes:
        filas, c = extraer_tvn(corte, args.con_descripcion)
        nuevas += filas
        manifest["consultas"]["tvn_rss"] = [c]
    if "gdelt" in fuentes:
        filas, c = extraer_gdelt(corte, args.dias)
        nuevas += filas
        manifest["consultas"]["gdelt"] = c
    if "respaldo" in fuentes:
        filas, c = extraer_respaldo(corte, args.dias)
        nuevas += filas
        manifest["consultas"]["respaldo"] = c
    if nuevas:
        stats = escribir_noticias(noticias_previas + nuevas)
        manifest["noticias"] = stats
        print(f"[noticias] {stats}")

    if "worldbank" in fuentes:
        filas, c = extraer_worldbank(corte)
        with open(PROC / "indicadores.csv", "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(filas[0].keys()))
            w.writeheader()
            w.writerows(filas)
        manifest["consultas"]["worldbank"] = c
        manifest["indicadores"] = {"combinaciones": len(filas),
                                   "con_valor": sum(f["valor"] is not None for f in filas)}

    if "usgs" in fuentes:
        geo, c = extraer_usgs(corte)
        (PROC / "eventos.geojson").write_text(json.dumps(geo, ensure_ascii=False, indent=1), encoding="utf-8")
        manifest["consultas"]["usgs"] = [c]

    archivos = {}
    for nombre in ["noticias.csv", "indicadores.csv", "eventos.geojson"]:
        ruta = PROC / nombre
        if ruta.exists():
            archivos[nombre] = {"sha256": sha256(ruta), "bytes": ruta.stat().st_size}
    manifest.update({
        "paquete": "Panamá · Señales y Evidencias",
        "version": VERSION,
        "fecha_corte_UTC": iso(corte),
        "archivos": archivos,
        "licencias": LICENCIAS,
        "transformaciones": [
            "Deduplicación por URL normalizada (minúsculas, sin '/' final); se conservan todos los orígenes.",
            "Fechas en ISO 8601 UTC. fecha_publicacion (RSS) y fecha_deteccion (seendate GDELT) se mantienen separadas.",
            "Campos ausentes se dejan vacíos/nulos; nunca se rellenan con cero.",
            "Banco Mundial: cuadrícula completa 6 países × 6 indicadores × 15 años = 540 combinaciones con nulos explícitos.",
            "USGS: solo campos del contrato (pág. 7); la caja regional no equivale al territorio de Panamá.",
        ],
        "desviaciones_documentadas": [
            "Ventana de noticias: últimos %d días antes del corte (pág. 6). La regla de exclusión [2024-01-01, 2025-10-01) "
            "de la pág. 7 contradice la pág. 6 para una extracción en 2026; ver Decisión D-01 en Notion." % args.dias,
            "La pág. 6 menciona 1.350 combinaciones, pero 6 × 6 × 15 = 540; se usa 540 (Decisión D-02).",
            "Descripciones del RSS de TVN excluidas por defecto (derechos no confirmados, pág. 6)."
            if not args.con_descripcion else "Descripciones del RSS de TVN incluidas con autorización.",
        ],
    })
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[manifest] {manifest_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
