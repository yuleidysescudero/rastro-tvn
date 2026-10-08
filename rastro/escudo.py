"""Escudo anti-inyección (T07): el texto de una fuente es dato, nunca instrucción.

1. Detecta patrones de inyección en titulares/fuentes y en consultas.
2. Una fuente marcada deja de contar como evidencia y se muestra como "no confiable".
3. Las fuentes se envían al LLM dentro de delimitadores, escapadas, separadas de las reglas.
"""
from __future__ import annotations

import html
import json
import re

from .organizar import normalizar

PATRONES = [
    (r"ignor\w*\s+(todas?\s+)?(las\s+|tus\s+|the\s+|all\s+|previous\s+|anteriores\s+)*(instruc|reglas|instructions|rules)", "pide ignorar instrucciones"),
    (r"olvida\w*\s+(todo|tus|las)", "pide olvidar reglas"),
    (r"(revela|muestra|imprime|dime|reveal|print|show)\w*\s+.{0,30}(prompt|instruc|secret|contraseñ|password|api.?key|token|clave)", "pide revelar secretos"),
    (r"(system\s*prompt|prompt\s+del\s+sistema|developer\s+message)", "menciona el prompt del sistema"),
    (r"(actua|act[uú]a|act|pretend|finge)\w*\s+(como|as)\b", "intenta cambiar el rol"),
    (r"(you are now|ahora eres|a partir de ahora (eres|debes))", "intenta cambiar el rol"),
    (r"(marca|cambia|aprueba|publica|approve|publish)\w*\s+.{0,40}(aprobad|publicad|verdader|approved|true)", "intenta ejecutar una acción"),
    (r"<\s*/?\s*(script|system|instrucciones|evidencia)\b", "inserta etiquetas de control"),
    (r"(nueva|new)\s+(instrucci|instruction|regla|rule)", "introduce nuevas reglas"),
]
_COMPILADOS = [(re.compile(p, re.I), m) for p, m in PATRONES]


def analizar(texto: str) -> list[str]:
    t = normalizar(texto or "")
    return sorted({motivo for patron, motivo in _COMPILADOS if patron.search(t) or patron.search(texto or "")})


def es_sospechosa(texto: str) -> bool:
    return bool(analizar(texto))


def empaquetar_evidencia(evidencias: list[dict]) -> str:
    """Serializa la evidencia como datos escapados dentro de un único bloque delimitado."""
    seguras = []
    for ev in evidencias:
        e = dict(ev)
        for k, v in e.items():
            if isinstance(v, str):
                e[k] = html.escape(v, quote=False)
        seguras.append(e)
    return "<evidencia>\n" + json.dumps(seguras, ensure_ascii=False, indent=1, default=str) + "\n</evidencia>"
