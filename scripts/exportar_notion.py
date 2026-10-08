"""Genera las 8 páginas obligatorias de Notion (pág. 5) en notion/*.md a partir de los datos reales.

Importar en Notion: ··· → Importar → Markdown (o copiar y pegar cada archivo).
Se regenera tras cada corrida para que Notion refleje exactamente lo que el sistema hace.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from rastro import config, pipeline, priorizar, revision  # noqa: E402

DEST = config.RAIZ / "notion"
DECISIONES = config.RAIZ / "notion" / "decisiones.json"


def tabla(filas: list[dict], columnas: list[str]) -> str:
    out = ["| " + " | ".join(columnas) + " |", "|" + "---|" * len(columnas)]
    for f in filas:
        out.append("| " + " | ".join(str(f.get(c, "")).replace("|", "/").replace("\n", " ") for c in columnas) + " |")
    return "\n".join(out)


def main() -> None:
    DEST.mkdir(exist_ok=True)
    c = pipeline.procesar()
    m = c.manifest
    pruebas = json.loads((config.RESULTADOS / "pruebas.json").read_text(encoding="utf-8")) if (config.RESULTADOS / "pruebas.json").exists() else {"pruebas": []}
    metr = json.loads((config.RESULTADOS / "metricas.json").read_text(encoding="utf-8")) if (config.RESULTADOS / "metricas.json").exists() else {}
    decisiones = json.loads(DECISIONES.read_text(encoding="utf-8"))

    # 3 · Catálogo de datos
    filas = []
    for fuente, consultas in m.get("consultas", {}).items():
        for q in consultas:
            filas.append({"fuente": q.get("fuente", fuente), "consulta": q.get("nombre") or q.get("indicador") or q.get("medio") or "",
                          "url": q.get("url", ""), "registros": q.get("registros", ""), "estado": q.get("estado", "ok")})
    archivos = [{"archivo": k, "sha256": v["sha256"], "bytes": v["bytes"]} for k, v in m.get("archivos", {}).items()]
    (DEST / "03_catalogo_de_datos.md").write_text(f"""# Catálogo de datos

**Paquete:** {m.get('paquete')} {m.get('version')} · **Corte:** {m.get('fecha_corte_UTC')} UTC · **Ventana de noticias:** {config.VENTANA_COBERTURA_DIAS} días

## Archivos y hash del snapshot
{tabla(archivos, ['archivo', 'sha256', 'bytes'])}

## Licencias / condiciones por fuente
{chr(10).join(f'- **{k}:** {v}' for k, v in m.get('licencias', {}).items())}
- **google_news_rss / rss_medios (respaldo):** solo metadatos públicos (titular, medio, fecha, enlace). No se redistribuye contenido. Ver D-03.

## Transformaciones
{chr(10).join(f'- {t}' for t in m.get('transformaciones', []))}

## Desviaciones documentadas
{chr(10).join(f'- {t}' for t in m.get('desviaciones_documentadas', []))}

## Cobertura efectiva
- Titulares válidos tras la carga: **{len(c.noticias)}** (de {c.calidad[0]['total']}); separados: {c.calidad[0]['con_error']} (fuera de ventana o con error).
- Titulares de TVN: **{int((c.noticias['medio'] == 'tvn-2.com').sum())}** (mínimo exigido: 20).
- Medios distintos: **{c.noticias['medio'].nunique()}** · Eventos: **{len(c.eventos)}**

## Consultas ejecutadas
{tabla(filas, ['fuente', 'consulta', 'registros', 'estado', 'url'])}
""", encoding="utf-8")

    # 2 · Plan y decisiones
    (DEST / "02_plan_y_decisiones.md").write_text("# Plan y decisiones\n\n## Decisiones técnicas y de producto\n\n" + "\n\n".join(
        f"### {d['id']} · {d['titulo']}\n**Fecha:** {d['fecha']} · **Responsable:** {d['responsable']}\n\n"
        f"**Contexto:** {d['contexto']}\n\n**Decisión:** {d['decision']}\n\n**Evidencia:** {d['evidencia']}"
        for d in decisiones) + "\n", encoding="utf-8")

    # 5 · Casos y evidencias: fichas de la agenda + un caso con evidencia insuficiente
    agenda = priorizar.agenda_diversa(c.eventos, 5)
    insuf = next((e for e in c.eventos if e["estado_evidencia"] == "insuficiente" and e["n_titulares"] > 1), None)
    casos = agenda + ([insuf] if insuf and insuf not in agenda else [])
    fichas_md = []
    for ev in casos:
        f = revision.ficha(ev, None)
        fichas_md.append(revision.ficha_markdown(f, ev))
    (DEST / "05_casos_y_evidencias.md").write_text(
        "# Casos y evidencias\n\nFichas trazables (IDs, fuentes, puntaje desglosado, estado de evidencia, borrador y persona revisora). "
        "Se completan desde la pantalla **✅ Revisión** de RASTRO (botón «Guardar ficha»).\n\n" + "\n---\n".join(fichas_md), encoding="utf-8")

    # 6 · Pruebas y métricas
    b = metr.get("benchmark", {})
    (DEST / "06_pruebas_y_metricas.md").write_text(f"""# Pruebas y métricas

## Matriz T01–T10 (ejecutada {pruebas.get('fecha_utc', '—')} · {pruebas.get('entorno', '')})
{tabla(pruebas['pruebas'], ['id', 'prueba', 'resultado_esperado', 'resultado', 'resultado_observado'])}

## Benchmark de desarrollo ({b.get('n', '—')} consultas)
| Métrica | Resultado | Meta del reto |
|---|---|---|
| Abstención correcta en consultas sin respuesta | {b.get('abstencion_correcta_sin_respuesta', '—')} | ≥ 80 % |
| Abstenciones incorrectas en preguntas respondibles | {b.get('abstenciones_incorrectas', '—')} | registrar |
| Resistencia adversarial | {b.get('resistencia_adversarial', '—')} | — |
| Consultas sustentadas respondidas | {b.get('respondidas_sustentadas', '—')} | — |
| Tiempo mediano / p95 | {b.get('tiempo_mediano_s', '—')} s / {b.get('tiempo_p95_s', '—')} s | mediana ≤ 15 s |
| Costo total | US$ {b.get('costo_total_usd', '—')} | — |

**Fallos:** {json.dumps(b.get('fallos', []), ensure_ascii=False)}

## IA vs baseline
- Clasificación de temas: {json.dumps(metr.get('clasificacion_temas', {}), ensure_ascii=False)}
- Agrupación de eventos: {json.dumps(metr.get('agrupacion_eventos', {}), ensure_ascii=False)}
- Ranking (Precision@5): {json.dumps(metr.get('ranking', {}), ensure_ascii=False)}

## Prueba fallida y su corrección
Ver decisiones **D-09** (benchmark: abstención 2/7 → 6/7) y **D-10** (T09: guion de 18 s aceptado por una prueba débil → prueba endurecida a 45–60 s).
""", encoding="utf-8")
    print(f"[ok] páginas generadas en {DEST}")


if __name__ == "__main__":
    main()
