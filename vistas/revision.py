"""Paso 4 · Revisión: la decisión es de una persona. Aprobar no es publicar."""
import pandas as pd
import streamlit as st

from rastro import config, revision
from ui import comun as u

C = u.corpus()
u.barra_pasos(4)
ev = u.evento_actual(C)
st.title("Revisión editorial")
u.cambiar_evento(C, "rev-sel")
st.markdown(f'<div class="tarjeta-titulo">{ev["titulo"]}</div>{u.insignia_evidencia(ev["estado_evidencia"])}',
            unsafe_allow_html=True)

actual = revision.estado_actual(ev["id_evento"])
st.markdown(f"**Estado actual:** {actual['estado']}" + (f" · decidió {actual['persona']}" if actual["persona"] else ""))
st.caption("Aprobar como borrador no significa publicar.")

with st.form("decision"):
    estado = st.radio("Decisión", config.ESTADOS_REVISION, index=config.ESTADOS_REVISION.index(actual["estado"]),
                      horizontal=True)
    persona = st.text_input("Persona responsable")
    nota = st.text_area("Nota (qué se corrigió o por qué se descarta)", height=90)
    enviar = st.form_submit_button("Registrar decisión", type="primary")
if enviar:
    try:
        revision.registrar(ev["id_evento"], estado, persona, nota)
        p = st.session_state.get("paquetes", {}).get((ev["id_evento"], False))
        revision.guardar_ficha(revision.ficha(ev, p))
        st.success("Decisión registrada y ficha guardada.")
        st.rerun()
    except ValueError as e:
        st.error(str(e))

h = revision.historial(ev["id_evento"])
if h:
    st.markdown("### Historial")
    st.dataframe(pd.DataFrame(h)[["fecha_utc", "estado", "persona", "nota"]].rename(
        columns={"fecha_utc": "Fecha (UTC)", "estado": "Estado", "persona": "Persona", "nota": "Nota"}),
        hide_index=True, width="stretch")

with st.expander("Ficha para Notion (ver evidencia)"):
    p = st.session_state.get("paquetes", {}).get((ev["id_evento"], False))
    st.code(revision.ficha_markdown(revision.ficha(ev, p), ev), language="markdown")

st.divider()
izq, _, der = st.columns([1, 1, 2])
if izq.button("← Volver", width="stretch"):
    st.switch_page(u.PASOS[2][0])
if der.button("Siguiente tema del Radar →", type="primary", width="stretch"):
    st.switch_page(u.PASOS[0][0])
