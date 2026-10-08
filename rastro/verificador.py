"""Verificador determinista de borradores. No es el LLM: es código.

Reglas (págs. 3, 7, 8):
  V1  Toda oración de tipo hecho/declaración debe tener ≥1 cita.
  V2  Cada cita debe apuntar a un ID de evidencia existente y a un campo de esa evidencia.
  V3  Toda cifra de la oración debe aparecer en el valor de algún campo citado.
  V4  Si se cita un indicador anual (WB:), la oración debe mencionar el año del dato.
  V5  Inferencias e hipótesis se permiten sin cita, pero deben quedar etiquetadas como tales.
Las oraciones que fallan se eliminan y quedan registradas con su motivo.
Así la cobertura de citas de lo emitido es 100% por construcción.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

TIPOS = ("hecho", "declaracion", "inferencia", "hipotesis")
RE_NUM = re.compile(r"\d+(?:[.,]\d+)*")


def _nums(texto: str) -> set[str]:
    salida = set()
    for n in RE_NUM.findall(texto or ""):
        base = n.replace(".", "").replace(",", "") if re.fullmatch(r"\d{1,3}([.,]\d{3})+", n) else n.replace(",", ".")
        salida.add(base.rstrip("0").rstrip(".") if "." in base else base)
    return salida


def _num_en(n: str, valores: set[str]) -> bool:
    if n in valores:
        return True
    try:  # tolerancia de redondeo: 2,7 vs 2.74784
        x = float(n)
        return any(abs(float(v) - x) <= 0.051 * max(1, abs(x)) and len(n.split(".")[-1]) <= 2 for v in valores
                   if re.fullmatch(r"-?\d+(\.\d+)?", v))
    except ValueError:
        return False


@dataclass
class Resultado:
    aceptadas: list[dict] = field(default_factory=list)
    rechazadas: list[dict] = field(default_factory=list)

    @property
    def cobertura(self) -> tuple[int, int]:
        factuales = [o for o in self.aceptadas if o["tipo"] in ("hecho", "declaracion")]
        return sum(1 for o in factuales if o.get("citas")), len(factuales)


def verificar(oraciones: list[dict], evidencia: dict[str, dict]) -> Resultado:
    """oraciones: [{texto, tipo, citas:[{id, campo}]}]; evidencia: {id: {campo: valor}}."""
    res = Resultado()
    for o in oraciones:
        texto = (o.get("texto") or "").strip()
        tipo = o.get("tipo", "hecho")
        citas = o.get("citas") or []
        motivo = None
        if not texto:
            continue
        if tipo not in TIPOS:
            motivo = f"tipo desconocido '{tipo}'"
        elif tipo in ("hecho", "declaracion") and not citas:
            motivo = "V1: afirmación sin cita"
        else:
            valores_citados: set[str] = set()
            for c in citas:
                ev = evidencia.get(c.get("id", ""))
                if ev is None:
                    motivo = f"V2: cita a ID inexistente '{c.get('id')}'"
                    break
                campo = c.get("campo", "")
                if campo not in ev:
                    motivo = f"V2: el campo '{campo}' no existe en {c['id']}"
                    break
                valores_citados |= _nums(str(ev[campo]))
                if c["id"].startswith("WB:"):
                    valores_citados |= _nums(str(ev.get("anio", ""))) | _nums(str(ev.get("valor", "")))
                    if str(ev.get("anio", "")) not in texto:
                        motivo = f"V4: dato anual de {c['id']} sin mencionar el año {ev.get('anio')}"
                        break
                if c["id"].startswith(("TVN-", "GD-", "GN-", "RS-")):
                    valores_citados |= _nums(str(ev.get("titulo", ""))) | _nums(str(ev.get("fecha", "")))
            if motivo is None and citas:
                sueltos = [n for n in _nums(texto) if not _num_en(n, valores_citados)]
                if sueltos:
                    motivo = f"V3: cifra(s) {', '.join(sueltos)} no aparecen en la evidencia citada"
            if motivo is None and not citas and _nums(texto) and tipo in ("inferencia", "hipotesis"):
                motivo = "V3: una inferencia/hipótesis no puede introducir cifras sin cita"
        destino = res.rechazadas if motivo else res.aceptadas
        destino.append({**o, "texto": texto, "tipo": tipo, "citas": citas, **({"motivo": motivo} if motivo else {})})
    return res


def palabras(oraciones: list[dict]) -> int:
    return sum(len(o["texto"].split()) for o in oraciones)


def segundos_lectura(oraciones: list[dict], palabras_por_minuto: int = 150) -> int:
    """Cronómetro: duración estimada del guion leído en voz alta."""
    return round(palabras(oraciones) * 60 / palabras_por_minuto)
