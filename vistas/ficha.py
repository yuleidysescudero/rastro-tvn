"""Paso 2 · Ficha del tema: qué pasó, cuántas fuentes reales hay y qué falta confirmar."""
import math

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from rastro import config
from ui import comun as u

def corto(medio: str) -> str:
    """bloomberglinea.com → bloomberglinea · es.finance.yahoo.com → yahoo (etiquetas legibles en el grafo)."""
    partes = [x for x in medio.replace("www.", "").split(".") if x not in ("com", "pa", "co", "cl", "net", "org", "es", "news", "finance")]
    return max(partes, key=len) if partes else medio


C = u.corpus()
u.barra_pasos(2)
ev = u.evento_actual(C)
st.title("Ficha del tema")
u.cambiar_evento(C, "ficha-sel")
st.markdown(f'<div class="tarjeta-tema">{u.tema(ev)}</div><div class="tarjeta-titulo">{ev["titulo"]}</div>'
            f'{u.insignia_prioridad(ev)}{u.insignia_evidencia(ev["estado_evidencia"])}', unsafe_allow_html=True)

# Resumen de 3 líneas
primera = ev["procedencias"][0]
quien = primera["agencia"] or primera["medios"][0]
otros = len(ev["medios"]) - 1
st.markdown(f"""<div class="resumen">
<p><b>Qué pasó:</b> según {quien}{f' y {otros} medio(s) más' if otros > 0 else ''}, desde el {u.hora_pa(ev['primera_fecha'])[:10]}: «{ev['titulo'][:110]}».</p>
<p><b>Fuentes reales:</b> {u.fuentes_reales(ev)}.</p>
<p><b>Qué falta confirmar:</b> {u.que_falta(ev)[6:] if u.que_falta(ev).startswith('Falta ') else u.que_falta(ev)}</p>
</div>""", unsafe_allow_html=True)
st.success(f"**Próximo paso:** {u.proximo_paso(ev)}")
if ev.get("recirculacion"):
    st.warning("Este tema ya circulaba antes: no lo presentes como nuevo sin verificar qué cambió.")
u.aviso_titulares()

t1, t2, t3, t4 = st.tabs(["Fuentes reales", "Dato oficial", "Versiones distintas", "Preguntas"])

with t1:
    procs = ev["procedencias"]
    paleta = ["#2c5d9e", "#1e8449", "#b9770e", "#6c4a9e", "#c0392b", "#16a085", "#7a8696", "#d35400"]
    xs, ys, etiquetas, hover, colores, tamanos, pos_texto, ex, ey = [0], [0], ["Tema"], [ev["titulo"]], ["#1f3a5f"], [30], ["middle center"], [], []
    for k, p in enumerate(procs):
        ang = 2 * math.pi * k / max(1, len(procs)) + math.pi / 2
        px, py = 2 * math.cos(ang), 2 * math.sin(ang)
        nombre = p["agencia"] or (corto(p["medios"][0]) if len(p["medios"]) == 1 else f"{corto(p['medios'][0])} +{len(p['medios']) - 1}")
        xs.append(px); ys.append(py); colores.append(paleta[k % len(paleta)]); tamanos.append(22)
        etiquetas.append(nombre); hover.append(", ".join(p["medios"])); pos_texto.append("top center")
        ex += [0, px, None]; ey += [0, py, None]
        for m, i in enumerate(p["ids"]):
            a2 = ang + (m - (len(p["ids"]) - 1) / 2) * 0.62
            nx, ny = px + 1.45 * math.cos(a2), py + 1.45 * math.sin(a2)
            n = C.noticia(i)
            xs.append(nx); ys.append(ny); colores.append(paleta[k % len(paleta)]); tamanos.append(10)
            etiquetas.append(corto(n["medio"])); hover.append(n["titulo"])
            # etiqueta hacia afuera del círculo para que no choque con las vecinas
            pos_texto.append(("top" if math.sin(a2) > 0.3 else "bottom" if math.sin(a2) < -0.3 else "middle")
                             + (" right" if math.cos(a2) > 0.3 else " left" if math.cos(a2) < -0.3 else " center"))
            ex += [px, nx, None]; ey += [py, ny, None]
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=ex, y=ey, mode="lines", line=dict(color="#cfd6df", width=1), hoverinfo="skip"))
    fig.add_trace(go.Scatter(x=xs, y=ys, mode="markers+text", text=etiquetas, textposition=pos_texto,
                             textfont=dict(size=11, color="#3d4652"), hovertext=hover, hoverinfo="text",
                             marker=dict(size=tamanos, color=colores, line=dict(color="#fff", width=1.5))))
    fig.update_layout(showlegend=False, height=500, margin=dict(l=10, r=10, t=10, b=10),
                      xaxis=dict(visible=False, range=[-4.6, 4.6]), yaxis=dict(visible=False, scaleanchor="x", range=[-4.4, 4.4]),
                      plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)")
    st.plotly_chart(fig, width="stretch")
    st.markdown('<p class="leyenda-grafo">● grande = fuente real (medio o agencia de origen) · ● pequeño = titular publicado · '
                'mismo color = misma fuente: repetir no es confirmar.</p>', unsafe_allow_html=True)
    for k, p in enumerate(procs, 1):
        nombre = p["agencia"] or ", ".join(p["medios"])
        with st.expander(f"Fuente real {k}: {nombre} · {len(p['ids'])} titular(es)" + (" · oficial" if p["oficial"] else "")):
            for i in p["ids"]:
                n = C.noticia(i)
                st.markdown(f"- [{n['titulo']}]({n['url']}) — {n['medio']}, {u.hora_pa(n['fecha_ref'])}")
            if p["razones"]:
                st.caption("Se agrupan como una sola fuente porque: " + u.lenguaje(", ".join(p["razones"])) + ".")

with t2:
    if ev["indicadores"]:
        for ind in ev["indicadores"]:
            st.markdown(f"**{ind['nombre']}**")
            if ind.get("ultimo"):
                st.info(f"{ind['ultimo']['valor']:.2f} · {ind['etiqueta']}")
                serie = pd.DataFrame(ind["serie"]).dropna()
                st.line_chart(serie.set_index("anio")["valor"], height=200)
                with st.expander("Comparación con la región (mismo año)"):
                    st.dataframe(pd.DataFrame(ind["region"]).rename(columns={"pais": "País", "valor": "Valor"}),
                                 hide_index=True, width="stretch")
            else:
                st.warning(ind["aviso"])
    if ev.get("sismo"):
        (st.info if ev["sismo"]["encontrado"] else st.warning)(ev["sismo"]["nota"])
    if ev["sin_dato_oficial"]:
        st.markdown("No hay un dato oficial pertinente en el paquete. RASTRO no fuerza relaciones que el titular no menciona.")

with t3:
    if ev["conflictos"]:
        for cf in ev["conflictos"]:
            st.markdown("**Los medios publican cifras distintas.** No elegimos una hasta verificarla.")
            cols = st.columns(min(4, len(cf["versiones"])))
            for col, v in zip(cols, cf["versiones"]):
                with col.container(border=True):
                    st.markdown(f"### {v['valor']} {cf['unidad']}")
                    st.caption(", ".join(sorted({C.noticia(i)["medio"] for i in v["ids"]})))
            st.caption(cf.get("nota", ""))
    else:
        st.markdown("Las fuentes no publican cifras incompatibles.")

with t4:
    p = u.paquete(C, ev)
    st.markdown("**Preguntas para investigar**")
    for q in p["preguntas_investigacion"]:
        st.markdown(f"- {q}")
    st.markdown("**Qué falta confirmar**")
    for q in p["verificaciones_pendientes"]:
        st.markdown(f"- {q}")

u.botones_navegacion(2)
