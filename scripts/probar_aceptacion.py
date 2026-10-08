"""Ejecuta T01–T10 y guarda la evidencia en data/resultados/pruebas.json (para Notion)."""
from __future__ import annotations

import json
import platform
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from dotenv import load_dotenv  # noqa: E402

load_dotenv()
from rastro import aceptacion, config  # noqa: E402


def main() -> int:
    filas = []
    for tid, prueba, esperado, fn in aceptacion.PRUEBAS:
        t0 = time.perf_counter()
        try:
            ok, evidencia = fn()
        except Exception as e:  # una prueba que explota es una prueba fallida, con su traza
            ok, evidencia = False, f"ERROR: {e!r} · {traceback.format_exc(limit=2)}"
        filas.append({"id": tid, "prueba": prueba, "resultado_esperado": esperado,
                      "resultado": "pasa" if ok else "falla", "resultado_observado": evidencia,
                      "segundos": round(time.perf_counter() - t0, 2)})
        print(f"{tid} {'PASA' if ok else 'FALLA'} · {evidencia}")
    salida = {"fecha_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
              "entorno": f"{platform.system()} {platform.release()} · Python {platform.python_version()}",
              "reglas": config.REGLAS_VERSION, "pruebas": filas}
    (config.RESULTADOS / "pruebas.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n{sum(f['resultado'] == 'pasa' for f in filas)}/{len(filas)} pasan → data/resultados/pruebas.json")
    return 0 if all(f["resultado"] == "pasa" for f in filas) else 1


if __name__ == "__main__":
    sys.exit(main())
