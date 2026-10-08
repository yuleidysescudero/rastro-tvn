"""Piezas compartidas de la interfaz: estilo, colores, lenguaje de redacción, pasos y navegación.

Solo presentación: no cambia la lógica de datos ni el puntaje.
"""
from __future__ import annotations

import json
import re

import pandas as pd
import streamlit as st

from rastro import config, pipeline, priorizar, redaccion

# --- Rutas de las pantallas (st.navigation / st.switch_page) ---------------------------------
PASOS = [("vistas/radar.py", "Radar", "📡"), ("vistas/ficha.py", "Ficha", "🗂️"),
         ("vistas/borrador.py", "Borrador", "✍️"), ("vistas/revision.py", "Revisión", "✅")]
COMPANERO = ("vistas/companero.py", "Compañero de mesa", "💬")
TECNICAS = [("vistas/tec_salud.py", "Salud del corpus", "🩺"), ("vistas/tec_comparar.py", "Sin IA vs Con IA", "⚖️"),
            ("vistas/tec_laboratorio.py", "Laboratorio de pruebas", "🧪")]

# --- Colores: evidencia = semáforo; prioridad = escala neutra (no se confunde con la evidencia) ---
EVIDENCIA = {
    "suficiente para el borrador": ("#1e8449", "#e8f6ee", "Suficiente"),
    "parcial": ("#b9770e", "#fdf3e1", "Parcial"),
    "insuficiente": ("#c0392b", "#fbeaea", "Insuficiente"),
}
PRIORIDAD = {"alto": ("#1f3a5f", "#e6ecf4"), "medio": ("#4a6787", "#eef2f7"), "bajo": ("#7a8696", "#f3f5f8")}
TIPO_ORACION = {"hecho": ("#1e8449", "Hecho"), "declaracion": ("#2c5d9e", "Declaración"),
                "inferencia": ("#8a6d1f", "Inferencia"), "hipotesis": ("#6c4a9e", "Hipótesis")}

CSS = """
<style>
html, body, [class*="css"] { font-size: 17px; }
.block-container, [data-testid="stMainBlockContainer"] { max-width: 900px !important;
  padding-top: 4.5rem !important; padding-bottom: 4rem !important; }
p, li { line-height: 1.6; }
h1 { font-size: 1.9rem !important; margin-bottom: .2rem !important; }
h3 { margin-top: 1.4rem !important; }
.paso-barra { display:flex; gap:.5rem; margin: 0 0 1.6rem 0; }
.paso { flex:1; text-align:center; padding:.55rem .3rem; border-radius:10px; font-size:.9rem;
        background:#f1f3f6; color:#8a94a3; border:1px solid #e3e7ed; }
.paso b { display:inline-block; width:1.6rem; height:1.6rem; line-height:1.6rem; border-radius:50%;
          background:#d9dee6; color:#fff; margin-right:.35rem; font-size:.85rem; }
.paso.hecho { color:#4a6787; } .paso.hecho b { background:#7a93b3; }
.paso.actual { background:#1f3a5f; color:#fff; border-color:#1f3a5f; font-weight:600; }
.paso.actual b { background:#fff; color:#1f3a5f; }
.insignia { display:inline-block; padding:.28rem .8rem; border-radius:999px; font-size:.86rem;
            font-weight:600; margin:0 .4rem .3rem 0; border:1px solid; }
.tarjeta-titulo { font-size:1.18rem; font-weight:650; line-height:1.4; margin:.1rem 0 .3rem 0; }
.tarjeta-tema { font-size:.85rem; color:#6b7685; text-transform:uppercase; letter-spacing:.04em; }
.porque { color:#3d4652; margin:.5rem 0 .2rem 0; }
.resumen { border-left:4px solid #1f3a5f; background:#f6f8fb; padding:.9rem 1.1rem; border-radius:6px; margin:.6rem 0 1.2rem 0; }
.resumen p { margin:.25rem 0; }
.aviso { font-size:.86rem; color:#5d6672; background:#fbf6e6; border-radius:6px; padding:.45rem .8rem; margin:.3rem 0 1.2rem 0; }
.oracion { padding:.6rem .9rem; margin:.45rem 0; border-left:4px solid #ccc; background:rgba(127,127,127,.05); border-radius:4px; }
.etq { display:inline-block; padding:.05rem .55rem; border-radius:4px; font-size:.75rem; color:#fff; margin-right:.5rem; }
.fuente { display:inline-block; padding:.05rem .55rem; margin:.25rem .3rem 0 0; border-radius:999px; font-size:.78rem;
          background:#eef2f7; color:#3d4652; border:1px solid #dbe2ea; }
.leyenda-grafo { font-size:.85rem; color:#5d6672; }
</style>
"""


def estilo() -> None:
    st.markdown(CSS, unsafe_allow_html=True)


@st.cache_resource(show_spinner="Preparando el corpus (solo la primera vez)…")
def corpus():
    return pipeline.procesar()


# --- Lenguaje de redacción ---------------------------------------------------------------------
_REEMPLAZOS = [
    (r"procedencias? independientes?", "fuentes reales"), (r"procedencia\(s\) independiente\(s\)", "fuente(s) real(es)"),
    (r"procedencia\(s\)", "fuente(s) real(es)"), (r"procedencias", "fuentes reales"), (r"procedencia", "fuente real"),
    (r"titulares", "titulares"),
]


def lenguaje(texto: str) -> str:
    """Traduce términos técnicos a lenguaje de redacción («procedencias» → «fuentes reales»)."""
    for patron, nuevo in _REEMPLAZOS:
        texto = re.sub(patron, nuevo, texto or "")
    return texto


def tema(ev: dict) -> str:
    return config.TEMAS.get(ev["tema"], {}).get("nombre", "Otros temas")


def fuentes_reales(ev: dict) -> str:
    n, t = ev["n_procedencias"], ev["n_titulares"]
    real = "1 fuente real" if n == 1 else f"{n} fuentes reales"
    return f"{t} titular{'es' if t != 1 else ''} · {real}"


def por_que(ev: dict) -> str:
    """Una frase de «por qué» en lenguaje de redacción, derivada de los componentes (sin cambiarlos)."""
    c = ev["componentes"]
    razones = {"R": "está muy ligado a Panamá", "I": "tiene alcance público", "U": "es reciente",
               "N": "es un tema nuevo en la agenda", "E": "tiene evidencia disponible"}
    principal = razones[max(c, key=c.get)]
    if ev["n_titulares"] > ev["n_procedencias"]:
        eco = f"Ojo: {ev['n_titulares']} titulares, pero solo {ev['n_procedencias']} fuente{'s' if ev['n_procedencias'] != 1 else ''} real{'es' if ev['n_procedencias'] != 1 else ''}."
    else:
        eco = f"{fuentes_reales(ev).split(' · ')[1].capitalize()}."
    return f"Sube porque {principal}. {eco}"


def que_falta(ev: dict) -> str:
    faltas = []
    if ev["estado_evidencia"] != "suficiente para el borrador":
        faltas.append("una fuente oficial o una segunda fuente real")
    if ev["conflictos"]:
        faltas.append("aclarar cifras que no coinciden")
    if ev.get("recirculacion"):
        faltas.append("confirmar qué hay de nuevo (el tema ya circulaba)")
    return ("Falta " + ", ".join(faltas) + ".") if faltas else "Nada crítico para un borrador."


def proximo_paso(ev: dict) -> str:
    return {"insuficiente": "Investigar antes de redactar: buscar una segunda fuente real u oficial.",
            "parcial": "Redactar como borrador atribuido y completar lo que falta confirmar.",
            "suficiente para el borrador": "Pasar al borrador y a revisión editorial."}[ev["estado_evidencia"]]


# --- Insignias -------------------------------------------------------------------------------------
def insignia_evidencia(estado: str) -> str:
    color, fondo, nombre = EVIDENCIA[estado]
    return f'<span class="insignia" style="color:{color};background:{fondo};border-color:{color}">Evidencia: {nombre}</span>'


def insignia_prioridad(ev: dict) -> str:
    color, fondo = PRIORIDAD[ev["nivel"]]
    return (f'<span class="insignia" style="color:{color};background:{fondo};border-color:{color}">'
            f'Prioridad {ev["nivel"]} · {ev["puntaje"]:.0f}</span>')


def aviso_titulares() -> None:
    st.markdown(f'<div class="aviso">Basado únicamente en titulares y metadatos. RASTRO no dice qué es verdad: '
                f'muestra qué se puede sostener.</div>', unsafe_allow_html=True)


# --- Pasos y navegación ----------------------------------------------------------------------------------
def barra_pasos(actual: int) -> None:
    celdas = []
    for k, (_, nombre, _) in enumerate(PASOS, 1):
        clase = "actual" if k == actual else ("hecho" if k < actual else "")
        celdas.append(f'<div class="paso {clase}"><b>{k}</b>{nombre}</div>')
    st.markdown(f'<div class="paso-barra">{"".join(celdas)}</div>', unsafe_allow_html=True)


def botones_navegacion(actual: int) -> None:
    st.divider()
    izq, _, der = st.columns([1, 2, 1])
    if actual > 1 and izq.button("← Volver", width="stretch"):
        st.switch_page(PASOS[actual - 2][0])
    if actual < len(PASOS) and der.button("Siguiente →", type="primary", width="stretch"):
        st.switch_page(PASOS[actual][0])


def abrir_ficha(id_evento: str) -> None:
    st.session_state["evento"] = id_evento
    st.switch_page(PASOS[1][0])


# --- Evento seleccionado -------------------------------------------------------------------------------
def agenda(C) -> list[dict]:
    pesos = st.session_state.get("pesos", config.PESOS)
    eventos = C.repriorizar(pesos)
    for e in eventos:
        e.pop("relacionados", None)
    return priorizar.agenda_diversa(eventos, 5)


def evento_actual(C) -> dict:
    ev = C.evento(st.session_state.get("evento", "")) if st.session_state.get("evento") else None
    if ev is None:
        ev = agenda(C)[0]
        st.session_state["evento"] = ev["id_evento"]
    return ev


def cambiar_evento(C, clave: str) -> None:
    """Selector discreto (solo títulos) para cambiar el evento en curso."""
    with st.expander("Cambiar de tema"):
        candidatos = agenda(C) + [e for e in C.eventos[:40] if e not in agenda(C)]
        titulos = {f"{e['titulo'][:95]}": e["id_evento"] for e in candidatos}
        actual = st.session_state.get("evento")
        opciones = list(titulos)
        idx = next((k for k, t in enumerate(opciones) if titulos[t] == actual), 0)
        elegido = st.selectbox("Tema", opciones, index=idx, key=clave, label_visibility="collapsed")
        if titulos[elegido] != actual:
            st.session_state["evento"] = titulos[elegido]
            st.rerun()


# --- Paquete editorial (sesión → disco de la demo → generar) ------------------------------------------------
def paquete(C, ev: dict, forzar_plantilla: bool = False) -> dict:
    cache = st.session_state.setdefault("paquetes", {})
    clave = (ev["id_evento"], forzar_plantilla)
    if clave not in cache:
        ruta = config.RESULTADOS / "demo" / f"{ev['id_evento']}.json"
        if ruta.exists() and not forzar_plantilla:
            cache[clave] = json.loads(ruta.read_text(encoding="utf-8"))
            cache[clave]["meta"]["desde_demo"] = True
        else:
            with st.spinner("Redactando con evidencia y verificando cada oración…"):
                cache[clave] = redaccion.generar_paquete(C, ev, forzar_plantilla=forzar_plantilla)
    return cache[clave]


def oraciones(lista: list[dict], evidencia: dict, clave: str) -> None:
    """Oraciones con color por tipo y fuentes por nombre de medio; los IDs solo dentro de «ver evidencia»."""
    for k, o in enumerate(lista):
        color, nombre = TIPO_ORACION.get(o["tipo"], ("#999", o["tipo"]))
        medios = []
        for c in o["citas"]:
            ev = evidencia.get(c["id"], {})
            etiqueta = ev.get("medio") or ev.get("fuente") or ("Análisis RASTRO" if c["id"].startswith("EV-") else "Fuente")
            if etiqueta not in medios:
                medios.append(etiqueta)
        chips = "".join(f'<span class="fuente">{m}</span>' for m in medios)
        texto, lado = st.columns([9, 2], vertical_alignment="center")
        texto.markdown(f'<div class="oracion" style="border-left-color:{color}"><span class="etq" style="background:{color}">'
                       f'{nombre}</span>{lenguaje(o["texto"])}<br>{chips}</div>', unsafe_allow_html=True)
        if o["citas"]:
            with lado.popover("Ver evidencia", type="tertiary", key=f"pop-{clave}-{k}"):
                for c in o["citas"]:
                    ev = evidencia.get(c["id"], {})
                    st.markdown(f"**{c['id']}** · campo `{c['campo']}`")
                    st.write(ev.get(c["campo"], "—"))
                    if ev.get("url"):
                        st.caption(ev["url"])


def hora_pa(ts) -> str:
    return pd.Timestamp(ts).tz_convert(config.TZ_PANAMA).strftime("%d/%m/%Y %H:%M") if ts is not None else "—"
