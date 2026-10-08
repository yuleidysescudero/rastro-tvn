"""Modo técnico · Salud del corpus."""
import pandas as pd
import streamlit as st

from ui import comun as u

C = u.corpus()
m = C.manifest
st.title("Salud del corpus")
st.caption(f"{m.get('paquete')} {m.get('version')} · corte {m.get('fecha_corte_UTC')} UTC")
cols = st.columns(len(C.calidad))
for col, rep in zip(cols, C.calidad):
    col.metric(rep["archivo"], f"{rep['validas']}/{rep['total']}", f"{rep['con_error']} separadas", delta_color="off")
with st.expander("Filas separadas (no bloquean la carga)"):
    st.dataframe(pd.DataFrame(C.errores_carga), hide_index=True, width="stretch")
with st.expander("Nulos por campo (se conservan)"):
    st.json(C.calidad[0]["nulos_por_campo"])
st.markdown("### Composición")
st.bar_chart(C.noticias["medio"].value_counts().head(12), horizontal=True)
st.bar_chart(C.noticias["tema"].value_counts(), horizontal=True)
st.markdown("### Integridad (SHA-256)")
st.dataframe(pd.DataFrame([{"archivo": k, **v} for k, v in m.get("archivos", {}).items()]), hide_index=True, width="stretch")
st.markdown("### Desviaciones documentadas")
for d in m.get("desviaciones_documentadas", []):
    st.markdown(f"- {d}")
