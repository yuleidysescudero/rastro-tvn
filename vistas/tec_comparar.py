"""Modo técnico · Sin IA vs Con IA."""
import json

import streamlit as st

from rastro import config
from ui import comun as u

C = u.corpus()
ev = u.evento_actual(C)
st.title("Sin IA vs Con IA")
st.caption("El mismo tema: titulares ordenados por fecha (baseline) frente a RASTRO.")
u.cambiar_evento(C, "cmp-sel")
a, b = st.columns(2)
with a:
    st.markdown("### Sin IA")
    sub = C.noticias[C.noticias["id_noticia"].isin(ev["ids"])].sort_values("fecha_ref", ascending=False)
    st.metric("Lo que parece", f"{len(sub)} noticias")
    for _, n in sub.iterrows():
        st.markdown(f"- {n['medio']}: {n['titulo']}")
with b:
    st.markdown("### Con RASTRO")
    st.metric("Lo que hay detrás", f"{ev['n_procedencias']} fuente(s) real(es)")
    st.markdown(u.insignia_evidencia(ev["estado_evidencia"]), unsafe_allow_html=True)
    st.markdown(u.por_que(ev))
ruta = config.RESULTADOS / "metricas.json"
if ruta.exists():
    with st.expander("Métricas IA vs baseline"):
        st.json(json.loads(ruta.read_text(encoding="utf-8")))
