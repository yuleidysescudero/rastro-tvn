"""Etapa 7 · Revisar: estados humanos, registro de decisiones y exportación de fichas.

Solo una persona cambia el estado. "Aprobado como borrador" no significa publicar.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from . import config

LOG = config.RESULTADOS / "revisiones.jsonl"
FICHAS = config.RESULTADOS / "fichas.jsonl"


def registrar(id_evento: str, estado: str, persona: str, nota: str = "") -> dict:
    if estado not in config.ESTADOS_REVISION:
        raise ValueError(f"estado inválido: {estado}")
    if not persona.strip():
        raise ValueError("la revisión requiere una persona responsable")
    entrada = {"id_evento": id_evento, "estado": estado, "persona": persona.strip(), "nota": nota.strip(),
               "fecha_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
               "reglas": config.REGLAS_VERSION}
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(entrada, ensure_ascii=False) + "\n")
    return entrada


def historial(id_evento: str | None = None) -> list[dict]:
    if not LOG.exists():
        return []
    filas = [json.loads(l) for l in LOG.read_text(encoding="utf-8").splitlines() if l.strip()]
    return [f for f in filas if id_evento is None or f["id_evento"] == id_evento]


def estado_actual(id_evento: str) -> dict:
    h = historial(id_evento)
    return h[-1] if h else {"estado": "nuevo", "persona": "", "nota": "", "fecha_utc": ""}


def ficha(ev: dict, paquete: dict | None) -> dict:
    """Registro con los campos del contrato fichas.jsonl (pág. 7)."""
    rev = estado_actual(ev["id_evento"])
    afirmaciones, citas = [], []
    if paquete:
        for o in paquete["brief"] + paquete["guion"] + paquete["copy"]:
            afirmaciones.append({"texto": o["texto"], "tipo": o["tipo"]})
            citas.append(o["citas"])
    return {
        "id_caso": ev["id_evento"], "modalidad": "editorial TVN", "titulo": ev["titulo"],
        "ids_fuente": ev["ids"], "afirmaciones": afirmaciones, "citas": citas,
        "puntaje": ev["puntaje"], "componentes": ev["componentes"], "reglas": config.REGLAS_VERSION,
        "estado_evidencia": ev["estado_evidencia"], "motivo_evidencia": ev["motivo_evidencia"],
        "procedencias": ev["n_procedencias"], "titulares": ev["n_titulares"],
        "borrador": None if not paquete else {
            "titulo": [o["texto"] for o in paquete["titulo_propuesto"]],
            "brief": " ".join(o["texto"] for o in paquete["brief"]),
            "guion": " ".join(o["texto"] for o in paquete["guion"]),
            "copy": " ".join(o["texto"] for o in paquete["copy"]),
            "preguntas": paquete["preguntas_investigacion"], "motor": paquete["meta"].get("motor")},
        "estado_revision": rev["estado"], "persona_revisora": rev["persona"], "nota_revision": rev["nota"],
        "alcance": config.LEYENDA_TITULAR,
    }


def guardar_ficha(f: dict) -> None:
    existentes = []
    if FICHAS.exists():
        existentes = [json.loads(l) for l in FICHAS.read_text(encoding="utf-8").splitlines() if l.strip()]
    existentes = [x for x in existentes if x["id_caso"] != f["id_caso"]] + [f]
    FICHAS.write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in existentes) + "\n", encoding="utf-8")


def ficha_markdown(f: dict, ev: dict) -> str:
    """Texto listo para pegar en la base «Casos y evidencias» de Notion."""
    c = f["componentes"]
    fuentes = "\n".join(f"- P{k + 1}: {', '.join(p['medios'])} · {len(p['ids'])} titular(es)"
                        + (f" · agencia {p['agencia']}" if p["agencia"] else "") for k, p in enumerate(ev["procedencias"]))
    b = f["borrador"] or {}
    return f"""## {f['id_caso']} · {f['titulo']}

**Modalidad:** {f['modalidad']} · **Reglas:** {f['reglas']} · *{f['alcance']}*

| Puntaje | R | I | U | N | E | Estado de evidencia | Revisión |
|---|---|---|---|---|---|---|---|
| {f['puntaje']} | {c['R']} | {c['I']} | {c['U']} | {c['N']} | {c['E']} | {f['estado_evidencia']} | {f['estado_revision']} ({f['persona_revisora'] or 'sin asignar'}) |

**Motivo del estado de evidencia:** {f['motivo_evidencia']}

**Procedencias independientes ({f['procedencias']} de {f['titulares']} titulares):**
{fuentes}

**IDs de fuente:** {', '.join(f['ids_fuente'])}

**Brief:** {b.get('brief', '—')}

**Guion:** {b.get('guion', '—')}

**Copy:** {b.get('copy', '—')}

**Preguntas de investigación:** {' / '.join(b.get('preguntas', [])) or '—'}

**Nota de la persona revisora:** {f['nota_revision'] or '—'}
"""
