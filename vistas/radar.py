"""Paso 1 · Radar: ¿qué merece revisión hoy?"""
import json
from datetime import datetime, timezone

import pandas as pd
import streamlit as st

from rastro import config, priorizar
from ui import comun as u

C = u.corpus()
u.barra_pasos(1)
st.title("¿Qué merece revisión hoy?")
u.aviso_titulares()

pesos = st.session_state.get("pesos", config.PESOS)
eventos = C.repriorizar(pesos)
agenda = u.agenda(C)
# Contador sobre TODOS los eventos, no solo el top 5
n_ins = sum(e["estado_evidencia"] == "insuficiente" for e in eventos)
c1, c2, c3 = st.columns(3)
c1.metric("Temas detectados", len(eventos))
c2.metric("Para revisar hoy", len(agenda))
c3.metric("Con evidencia insuficiente", n_ins)

for pos, ev in enumerate(agenda, 1):
    with st.container(border=True):
        st.markdown(f'<div class="tarjeta-tema">#{pos} · {u.tema(ev)}</div>'
                    f'<div class="tarjeta-titulo">{ev["titulo"]}</div>'
                    f'{u.insignia_prioridad(ev)}{u.insignia_evidencia(ev["estado_evidencia"])}'
                    f'<p class="porque">{u.por_que(ev)}</p>', unsafe_allow_html=True)
        a, b = st.columns([3, 1])
        with a.expander("Ver cálculo"):
            comp = ev["componentes"]
            st.dataframe(pd.DataFrame([{"Componente": k, "Valor (0–1)": v, "Peso": pesos[k],
                                        "Aporte": round(pesos[k] * v * 100 / sum(pesos.values()), 1)}
                                       for k, v in comp.items()]), hide_index=True, width="stretch")
            st.caption(f"Puntaje {ev['puntaje']} · reglas {config.REGLAS_VERSION}. "
                       "Ordena la revisión; no es una probabilidad de verdad.")
            if ev.get("relacionados"):
                st.caption(f"Incluye {len(ev['relacionados'])} tema(s) relacionado(s) que no se repiten en la agenda.")
        if b.button("Abrir ficha →", key=f"abrir-{ev['id_evento']}", type="primary", width="stretch"):
            u.abrir_ficha(ev["id_evento"])

with st.expander("Ajustar pesos"):
    st.caption("P = 30R + 25I + 20U + 15N + 10E. Cambiar los pesos exige una justificación que queda registrada.")
    cols = st.columns(5)
    nuevos = {k: cols[i].slider(k, 0, 50, pesos[k], key=f"w{k}") for i, k in enumerate(["R", "I", "U", "N", "E"])}
    for k, v in priorizar.COMPONENTES.items():
        st.caption(f"**{k}** · {v.split(':')[0]}")
    just = st.text_input("¿Por qué cambias los pesos?")
    if st.button("Aplicar pesos", disabled=not just.strip()):
        st.session_state["pesos"] = nuevos
        with open(config.RESULTADOS / "cambios_pesos.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps({"pesos": nuevos, "justificacion": just, "reglas": config.REGLAS_VERSION,
                                "fecha_utc": datetime.now(timezone.utc).isoformat(timespec="seconds")},
                               ensure_ascii=False) + "\n")
        st.rerun()
    if pesos != config.PESOS and st.button("Restaurar pesos del reto"):
        st.session_state.pop("pesos", None)
        st.rerun()

u.botones_navegacion(1)
