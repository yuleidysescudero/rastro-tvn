"""Precalcula los paquetes editoriales de los eventos de la demo y los guarda en disco.

  python scripts/preparar_demo.py            # agenda top 5 + casos especiales
Con ANTHROPIC_API_KEY en .env usa Claude (y su respuesta también queda en el caché del LLM);
sin clave usa la plantilla extractiva. La app lee data/resultados/demo/<evento>.json antes de
generar nada, así la demo funciona sin conexión (T10).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from dotenv import load_dotenv  # noqa: E402

load_dotenv()
from rastro import config, pipeline, priorizar, redaccion  # noqa: E402

DEMO = config.RESULTADOS / "demo"


def eventos_demo(c) -> list[dict]:
    agenda = priorizar.agenda_diversa(c.eventos, 5)
    especiales = [
        next((e for e in c.eventos if e["conflictos"]), None),                                    # T05 en vivo
        next((e for e in c.eventos if e["n_titulares"] > e["n_procedencias"] + 2), None),         # eco informativo
        next((e for e in c.eventos if e["estado_evidencia"] == "insuficiente" and e["nivel"] == "alto"), None),
        next((e for e in c.eventos if e["indicadores"]), None),                                    # dato con año
        next((e for e in c.eventos if e.get("recirculacion")), None),                              # T03 en vivo
    ]
    vistos, salida = set(), []
    for e in agenda + [x for x in especiales if x]:
        if e["id_evento"] not in vistos:
            vistos.add(e["id_evento"])
            salida.append(e)
    return salida


def main() -> None:
    DEMO.mkdir(parents=True, exist_ok=True)
    c = pipeline.procesar()
    for ev in eventos_demo(c):
        p = redaccion.generar_paquete(c, ev)
        (DEMO / f"{ev['id_evento']}.json").write_text(json.dumps(p, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
        m = p["metricas"]
        print(f"{ev['id_evento']} · motor {p['meta'].get('motor')} · copy {m['palabras_copy']} palabras · "
              f"guion {m['segundos_guion']} s · citas {m['con_cita']}/{m['afirmaciones_factuales']} · {ev['titulo'][:60]}")


if __name__ == "__main__":
    main()
