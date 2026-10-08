"""Configuración central de RASTRO: rutas, temas, pesos y umbrales.

Todo valor que cambie el comportamiento del sistema vive aquí y se versiona
con REGLAS_VERSION (el reto pide mostrar la versión de reglas, pág. 4).
"""
from __future__ import annotations

import os
from pathlib import Path
from zoneinfo import ZoneInfo

RAIZ = Path(__file__).resolve().parents[1]
DATA = RAIZ / "data"
PROC = DATA / "processed"
CACHE = DATA / "cache"
RESULTADOS = DATA / "resultados"
for _d in (CACHE, RESULTADOS):
    _d.mkdir(parents=True, exist_ok=True)

TZ_PANAMA = ZoneInfo("America/Panama")
REGLAS_VERSION = "reglas-v1.1"

# --- Temas del reto (pág. 3) ------------------------------------------------
# La descripción alimenta la clasificación semántica (embeddings);
# las palabras clave alimentan el baseline de reglas.
TEMAS: dict[str, dict] = {
    "economia": {
        "nombre": "Economía",
        "descripcion": "economía, inflación, precios, empleo, desempleo, salarios, PIB, crecimiento, "
                       "comercio, exportaciones, inversión, finanzas públicas, deuda, impuestos, bancos",
        "claves": ["econom", "inflaci", "precio", "empleo", "desemple", "salari", "pib", "crecimiento",
                   "comercio", "export", "import", "inversi", "deuda", "impuesto", "banco", "fiscal",
                   "presupuesto", "mef", "dólar", "mercado", "costo"],
    },
    "logistica_canal": {
        "nombre": "Logística / Canal",
        "descripcion": "Canal interoceánico, tránsito de buques por las esclusas, puertos, carga, contenedores, navieras, "
                       "logística, transporte marítimo, calado del Canal, cupos de tránsito, Autoridad del Canal ACP, "
                       "zona libre de Colón, ruta marítima",
        "claves": ["canal", "buque", "puerto", "carga", "contenedor", "navier", "logíst", "logist",
                   "esclusa", "calado", "acp", "tránsito", "transito", "marítim", "maritim", "colón"],
    },
    "turismo": {
        "nombre": "Turismo",
        "descripcion": "turismo, turistas, visitantes, hoteles, aerolíneas, vuelos, aeropuerto de Tocumen, "
                       "cruceros, ocupación hotelera, ATP Autoridad de Turismo",
        "claves": ["turis", "visitante", "hotel", "aerolínea", "aerolinea", "vuelo", "tocumen",
                   "crucero", "copa airlines", "atp", "viajer"],
    },
    "servicios_publicos": {
        "nombre": "Servicios públicos",
        "descripcion": "agua potable, IDAAN, corte de agua, plantas potabilizadoras, fugas y tuberías, electricidad, "
                       "apagones, ETESA, tarifa eléctrica, transporte público, Metro línea 1 línea 2 línea 3, teleférico, "
                       "MiBus, salud pública, hospitales, Caja de Seguro Social, educación, recolección de basura",
        "claves": ["agua", "idaan", "electric", "apagón", "apagon", "energía", "energia", "metro",
                   "mibus", "hospital", "css", "caja de seguro", "salud", "escuela", "educaci",
                   "basura", "potable", "servicio"],
    },
    "eventos_naturales": {
        "nombre": "Eventos naturales",
        "descripcion": "sismo, terremoto, temblor, lluvias, inundaciones, deslizamientos, tormentas, "
                       "sequía, El Niño, clima extremo, SINAPROC, alerta meteorológica",
        "claves": ["sismo", "terremoto", "temblor", "lluvia", "inundaci", "deslizamiento", "tormenta",
                   "sequía", "sequia", "el niño", "sinaproc", "alerta", "huracán", "huracan",
                   "magnitud", "oleaje", "clima"],
    },
    "regulacion": {
        "nombre": "Regulación",
        "descripcion": "leyes, decretos, Asamblea Nacional, resoluciones, Corte Suprema, regulación, "
                       "normas, gabinete, contrataciones públicas, reformas, Gaceta Oficial",
        "claves": ["ley ", "leyes", "decreto", "asamblea", "resoluci", "corte suprema", "regulaci",
                   "norma", "gabinete", "reforma", "gaceta", "proyecto de ley", "diputad", "contralor"],
    },
}
TEMA_OTRO = "otro"
# Prototipos de temas FUERA del reto: si un titular se parece más a uno de estos, va a "otro".
# Evita, por ejemplo, que "canal" de televisión en una nota deportiva cuente como Canal de Panamá.
TEMAS_FUERA = {
    "deportes": "fútbol, selección nacional, partido, gol, marcador, béisbol, Mundial, eliminatorias, liga, "
                "dónde ver el partido en vivo, canal de transmisión deportiva, atletas, campeonato",
    "entretenimiento": "farándula, música, concierto, cine, festival, celebridades, artistas, reality, espectáculo",
    "sucesos": "homicidio, crimen, policía, aprehensión, audiencia judicial, detenido, robo, balacera, accidente de tránsito",
    "diplomacia": "relaciones diplomáticas, visita oficial, cancillería, embajador, socio estratégico, acuerdo bilateral",
    "corporativo_tvn": "TVN Media firma alianza, patrocinio, concurso, promoción, programa de televisión",
}
UMBRAL_TEMA = 0.18  # similitud mínima tema↔titular; por debajo → "otro"

VENTANA_COBERTURA_DIAS = 90  # pág. 6: 30 días previos al corte, ampliable a 90

# --- Agrupación en eventos y réplicas ----------------------------------------
MODELO_EMBEDDINGS = os.getenv("RASTRO_EMBEDDINGS", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
UMBRAL_EVENTO = 0.66       # similitud coseno mínima para mismo evento (sobre titulares sin "Panamá")
VENTANA_EVENTO_H = 72      # ±3 días
UMBRAL_REPLICA = 0.90      # titulares casi idénticos = réplica (misma procedencia)
AGENCIAS = ["efe", "afp", "reuters", "ap ", "(ap)", "europa press", "ansa", "xinhua", "bloomberg", "dpa"]

# --- Puntaje de atención (pág. 4) ----------------------------------------------
PESOS = {"R": 30, "I": 25, "U": 20, "N": 15, "E": 10}
RANGOS = [(70, "alto"), (40, "medio"), (0, "bajo")]
VIDA_MEDIA_URGENCIA_H = 48
DOMINIOS_OFICIALES = (".gob.pa", "presidencia.gob.pa", "pancanal.com", "minsa.gob.pa", "mef.gob.pa",
                      "inec.gob.pa", "sinaproc.gob.pa", "superbancos.gob.pa")

ESTADOS_EVIDENCIA = ["insuficiente", "parcial", "suficiente para el borrador"]
ESTADOS_REVISION = ["nuevo", "en revisión", "requiere evidencia", "aprobado como borrador", "descartado"]

# --- Recuperación y abstención ---------------------------------------------------
UMBRAL_RECUPERACION = 0.52   # bajo esto: abstención antes de llamar al LLM
ANCLAJE_MIN_PALABRAS = 2     # palabras de contenido compartidas pregunta↔titular si la similitud no es alta
UMBRAL_SIM_ALTA = 0.65
TOP_K = 8

# --- LLM --------------------------------------------------------------------------
LLM_MODELO = os.getenv("RASTRO_LLM_MODELO", "claude-opus-5-5")
LLM_EFFORT = os.getenv("RASTRO_LLM_EFFORT", "medium")
# Precio por millón de tokens (USD) para medir costo; ajustar si cambia el modelo.
LLM_PRECIO_MTOK = {"claude-opus-5-5": (4.0, 20.0), "claude-sonnet-5-5": (2.0, 10.0),
                   "claude-haiku-4-5": (1.0, 5.0)}
LEYENDA_TITULAR = "basado únicamente en titular/metadatos"
