"""Paso 3 · Borrador: paquete editorial con una fuente por oración."""
import streamlit as st

from rastro import agente
from ui import comun as u

C = u.corpus()
u.barra_pasos(3)
ev = u.evento_actual(C)
st.title("Borrador")
u.cambiar_evento(C, "borr-sel")
st.markdown(f'<div class="tarjeta-titulo">{ev["titulo"]}</div>{u.insignia_evidencia(ev["estado_evidencia"])}',
            unsafe_allow_html=True)
u.aviso_titulares()

p = u.paquete(C, ev)
m = p["metricas"]
if p["sospechosas"]:
    st.error(f"Se excluyeron {len(p['sospechosas'])} fuente(s) que intentaban dar instrucciones al sistema.")
if p["abstencion"]:
    st.warning(f"No hay base suficiente para un borrador: {p['motivo_abstencion']}")

c1, c2, c3 = st.columns(3)
c1.metric("Brief · máx. 250", f"{m['palabras_brief']} palabras")
c2.metric("Guion · 45 a 60 s", f"{m['segundos_guion']} s")
c3.metric("Copy · 60 a 80", f"{m['palabras_copy']} palabras")
st.caption("Cada afirmación lleva su fuente. Colores: "
           + " · ".join(f'<span style="color:{c}">■</span> {n}' for c, n in u.TIPO_ORACION.values()), unsafe_allow_html=True)

st.markdown("### Título propuesto")
u.oraciones(p["titulo_propuesto"], p["evidencia"], "tit")
st.markdown(f"**Enfoque de interés público:** {p['enfoque_interes_publico']}")

t1, t2, t3 = st.tabs(["Brief", "Guion de TV", "Copy digital"])
with t1:
    u.oraciones(p["brief"], p["evidencia"], "brief")
with t2:
    u.oraciones(p["guion"], p["evidencia"], "guion")
with t3:
    u.oraciones(p["copy"], p["evidencia"], "copy")

if p["rechazadas"]:
    with st.expander(f"El verificador quitó {len(p['rechazadas'])} oración(es) sin respaldo"):
        for r in p["rechazadas"]:
            st.markdown(f"- ~~{r['texto']}~~ · {r['motivo']}")

st.markdown("### Defiende tu nota")
st.caption("Pega tu párrafo: RASTRO lo revisa como lo haría tu editor.")
texto = st.text_area("Tu párrafo", value=" ".join(o["texto"] for o in p["brief"][:2]), height=110,
                     label_visibility="collapsed")
if st.button("Revisar mi párrafo"):
    obs = agente.defender_nota(texto, ev, p["evidencia"])
    if not obs:
        st.success("Sin observaciones: cada afirmación tiene respaldo.")
    for o in obs:
        st.error(f"**{u.lenguaje(o['problema'])}**  \n💡 {o['arreglo']}")

motor = p["meta"].get("motor")
st.caption(("Redactado con " + (p["meta"].get("modelo") or "LLM") if motor == "llm" else "Redactado con plantilla extractiva (sin conexión)")
           + (" · guardado para la demo" if p["meta"].get("desde_demo") or p["meta"].get("cache") else ""))

u.botones_navegacion(3)
