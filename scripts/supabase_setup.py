"""Configura Supabase: cuentas de demostración y carga del snapshot público (noticias, eventos, indicadores).

Requisitos en .env (nunca en el repositorio):
  SUPABASE_URL=https://xxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=...      # solo en tu máquina; no va a Vercel ni al navegador
  RASTRO_DEMO_CLAVE=...              # contraseña de las cuentas de demostración

Antes: pega supabase/esquema.sql en el SQL Editor de Supabase y ejecútalo.
  python scripts/supabase_setup.py              # cuentas + snapshot
  python scripts/supabase_setup.py --etiquetas  # baja las etiquetas humanas a data/etiquetas/*.csv
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parents[1]
load_dotenv(RAIZ / ".env")
WEB = RAIZ / "web" / "public" / "data"
ETQ = RAIZ / "data" / "etiquetas"

URL = os.getenv("SUPABASE_URL", "").rstrip("/")
KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

DEMO = {
    "editor": ("editor@rastro-demo.com", "Mesa editorial (demo)"),
    "productor": ("digital@rastro-demo.com", "Producción digital (demo)"),
    "revisor": ("revisor@rastro-demo.com", "Revisión (demo)"),
    "jurado": ("jurado@rastro-demo.com", "Jurado hackIAthon"),
}


def cuentas() -> None:
    clave = os.getenv("RASTRO_DEMO_CLAVE", "")
    if len(clave) < 8:
        sys.exit("Define RASTRO_DEMO_CLAVE (mínimo 8 caracteres) en .env")
    existentes = requests.get(f"{URL}/auth/v1/admin/users?per_page=200", headers=H, timeout=30).json().get("users", [])
    por_email = {u["email"]: u["id"] for u in existentes}
    for rol, (email, nombre) in DEMO.items():
        cuerpo = {"email": email, "password": clave, "email_confirm": True, "user_metadata": {"rol": rol, "nombre": nombre}}
        if email in por_email:
            r = requests.put(f"{URL}/auth/v1/admin/users/{por_email[email]}", headers=H, json=cuerpo, timeout=30)
        else:
            r = requests.post(f"{URL}/auth/v1/admin/users", headers=H, json=cuerpo, timeout=30)
        print(f"  cuenta {rol:<10} {email:<28} → {r.status_code}")
        r.raise_for_status()


def subir(tabla: str, filas: list[dict], conflicto: str) -> None:
    h = {**H, "Prefer": "resolution=merge-duplicates,return=minimal"}
    for i in range(0, len(filas), 500):
        r = requests.post(f"{URL}/rest/v1/{tabla}?on_conflict={conflicto}", headers=h,
                          data=json.dumps(filas[i:i + 500], ensure_ascii=False, default=str).encode("utf-8"), timeout=60)
        if r.status_code >= 300:
            sys.exit(f"{tabla}: {r.status_code} {r.text[:300]}")
    print(f"  {tabla}: {len(filas)} filas")


def snapshot() -> None:
    ev = json.loads((WEB / "eventos.json").read_text(encoding="utf-8"))
    no = json.loads((WEB / "noticias.json").read_text(encoding="utf-8"))
    ind = json.loads((WEB / "indicadores.json").read_text(encoding="utf-8"))
    reglas = json.loads((WEB / "resumen.json").read_text(encoding="utf-8"))["reglas"]
    subir("noticias", [{"id_noticia": n["id"], "titulo": n["titulo"], "url": n["url"], "medio": n["medio"],
                        "idioma": n["idioma"], "fecha_ref": n["fecha"], "fecha_tipo": n["fecha_tipo"], "tema": n["tema"],
                        "tema_baseline": n["tema_baseline"], "confianza_tema": n["confianza_tema"], "origen": n["origen"],
                        "id_evento": n["evento"], "alcance_texto": n["alcance"]} for n in no], "id_noticia")
    subir("eventos", [{k: e[k] for k in ("id_evento", "rank", "titulo", "tema", "n_titulares", "n_procedencias", "puntaje",
                                         "nivel", "estado_evidencia", "motivo_evidencia", "componentes", "primera_fecha",
                                         "ultima_fecha", "recirculacion", "conflictos", "procedencias")} | {"reglas": reglas}
                      for e in ev], "id_evento")
    subir("indicadores", [{k: i.get(k) for k in ("pais_iso3", "indicador_id", "indicador_nombre", "anio", "valor", "unidad",
                                                 "fuente_url", "fecha_extraccion", "licencia")} for i in ind],
          "pais_iso3,indicador_id,anio")


def etiquetas() -> None:
    """Las etiquetas las ponen personas en /etiquetar; aquí solo se copian a los CSV que lee evaluar.py.
    Si un ítem tiene varias etiquetas, gana la más reciente."""
    filas = requests.get(f"{URL}/rest/v1/etiquetas?select=*&order=created_at.asc", headers=H, timeout=30).json()
    ultimas = {}
    for f in filas:
        ultimas[(f["tipo"], f["item_id"])] = f
    print(f"  {len(filas)} etiquetas ({len(ultimas)} ítems)")
    for tipo, archivo, col_id, col_valor in (("tema", "temas.csv", "id_noticia", "tema_humano"),
                                             ("par", "pares.csv", None, "mismo_evento_humano"),
                                             ("top5", "top5_editor.csv", "id_evento", "elegido_por_editor")):
        ruta = ETQ / archivo
        df = pd.read_csv(ruta, dtype=str, keep_default_na=False)
        ids = (df["id_a"] + "|" + df["id_b"]) if col_id is None else df[col_id]
        n = 0
        for k, item in enumerate(ids):
            f = ultimas.get((tipo, item))
            if f:
                df.loc[k, col_valor] = f["valor"]
                n += 1
        df.to_csv(ruta, index=False, encoding="utf-8")
        print(f"  {archivo}: {n}/{len(df)} etiquetados")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--etiquetas", action="store_true")
    a = ap.parse_args()
    if not URL or not KEY:
        sys.exit("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env")
    if a.etiquetas:
        etiquetas()
    else:
        cuentas()
        snapshot()
