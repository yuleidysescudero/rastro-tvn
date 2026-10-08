"""RASTRO · interfaz Streamlit (flujo guiado).  Ejecutar:  streamlit run app.py"""
from __future__ import annotations

import streamlit as st
from dotenv import load_dotenv

load_dotenv()

from rastro import config  # noqa: E402
from ui import comun  # noqa: E402

st.set_page_config(page_title="RASTRO · TVN", page_icon="🧭", layout="centered")

paginas = [st.Page(ruta, title=nombre, icon=icono, default=(k == 0))
           for k, (ruta, nombre, icono) in enumerate(comun.PASOS + [comun.COMPANERO] + comun.TECNICAS)]
actual = st.navigation(paginas, position="hidden")
comun.estilo()

with st.sidebar:
    st.markdown("## 🧭 RASTRO")
    st.caption("No te dice qué es verdad. Te dice qué puedes sostener.")
    st.markdown("**Flujo editorial**")
    for k, (ruta, nombre, icono) in enumerate(comun.PASOS, 1):
        st.page_link(ruta, label=f"{k} · {nombre}", icon=icono)
    st.markdown("**Asistente**")
    st.page_link(comun.COMPANERO[0], label=comun.COMPANERO[1], icon=comun.COMPANERO[2])
    st.write("")
    with st.expander("Modo técnico (jurado)"):
        for ruta, nombre, icono in comun.TECNICAS:
            st.page_link(ruta, label=nombre, icon=icono)
        C = comun.corpus()
        st.caption(f"Corte: {comun.hora_pa(C.corte)} (Panamá)")
        st.caption(f"Reglas {config.REGLAS_VERSION} · {len(C.noticias)} titulares → {len(C.eventos)} temas")
        st.caption(f"Embeddings: {C.motor_embeddings} · LLM: {config.LLM_MODELO}")
    st.caption("Team BillieJSON · hackIAthon 2026")

actual.run()
