"""Despliegue automático: Supabase (proyecto, tablas, cuentas demo, snapshot), motor en Hugging Face Spaces
y variables de entorno en Vercel. Lee los tokens de .env y escribe ahí las claves generadas (nunca se imprimen).

  python scripts/desplegar_nube.py supabase
  python scripts/desplegar_nube.py motor
  python scripts/desplegar_nube.py vercel
"""
from __future__ import annotations

import os
import re
import secrets
import shutil
import string
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import requests
from dotenv import dotenv_values

RAIZ = Path(__file__).resolve().parents[1]
ENV = RAIZ / ".env"
API = "https://api.supabase.com/v1"
PROYECTO = "rastro-tvn"
ESPACIO = "rastro-motor"


def env() -> dict:
    return {k: v for k, v in dotenv_values(ENV).items() if v}


def guardar(clave: str, valor: str) -> None:
    texto = ENV.read_text(encoding="utf-8") if ENV.exists() else ""
    if re.search(rf"^{clave}=.*$", texto, flags=re.M):
        texto = re.sub(rf"^{clave}=.*$", f"{clave}={valor}", texto, flags=re.M)
    else:
        texto = texto.rstrip("\n") + f"\n{clave}={valor}\n"
    ENV.write_text(texto, encoding="utf-8")


def clave_aleatoria(n: int = 20) -> str:
    return "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(n))


# ---------------------------------------------------------------- Supabase
def supabase() -> None:
    e = env()
    tok = e.get("SUPABASE_ACCESS_TOKEN") or sys.exit("Falta SUPABASE_ACCESS_TOKEN en .env")
    h = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}

    proyectos = requests.get(f"{API}/projects", headers=h, timeout=30)
    proyectos.raise_for_status()
    p = next((x for x in proyectos.json() if x["name"] == PROYECTO), None)
    if p is None:
        orgs = requests.get(f"{API}/organizations", headers=h, timeout=30).json()
        if not orgs:
            r = requests.post(f"{API}/organizations", headers=h, json={"name": "BillieJSON"}, timeout=30)
            r.raise_for_status()
            orgs = [r.json()]
        db_pass = e.get("SUPABASE_DB_PASSWORD") or clave_aleatoria(24)
        guardar("SUPABASE_DB_PASSWORD", db_pass)
        r = requests.post(f"{API}/projects", headers=h, timeout=60, json={
            "name": PROYECTO, "organization_id": orgs[0]["id"], "db_pass": db_pass, "region": "us-east-1"})
        if r.status_code >= 300:
            sys.exit(f"No se pudo crear el proyecto: {r.status_code} {r.text[:300]}")
        p = r.json()
        print(f"  proyecto creado: {p['id']}")
    ref = p["id"]
    print("  esperando a que la base esté lista…", end="", flush=True)
    for _ in range(90):
        st = requests.get(f"{API}/projects/{ref}", headers=h, timeout=30).json().get("status")
        if st == "ACTIVE_HEALTHY":
            break
        print(".", end="", flush=True)
        time.sleep(10)
    print(" lista")

    sql = (RAIZ / "supabase" / "esquema.sql").read_text(encoding="utf-8")
    r = requests.post(f"{API}/projects/{ref}/database/query", headers=h, json={"query": sql}, timeout=120)
    if r.status_code >= 300:
        sys.exit(f"Error al crear tablas: {r.status_code} {r.text[:400]}")
    print("  tablas y políticas creadas")

    claves = requests.get(f"{API}/projects/{ref}/api-keys?reveal=true", headers=h, timeout=30).json()
    por_nombre = {k.get("name"): k.get("api_key") for k in claves}
    guardar("SUPABASE_URL", f"https://{ref}.supabase.co")
    guardar("SUPABASE_ANON_KEY", por_nombre["anon"])
    guardar("SUPABASE_SERVICE_ROLE_KEY", por_nombre["service_role"])
    if not env().get("RASTRO_DEMO_CLAVE"):
        guardar("RASTRO_DEMO_CLAVE", "Rastro-" + clave_aleatoria(8))
    print("  claves guardadas en .env (no se muestran)")

    subprocess.run([sys.executable, "-X", "utf8", str(RAIZ / "scripts" / "supabase_setup.py")], check=True)


# ---------------------------------------------------------------- Hugging Face Spaces
def motor() -> None:
    from huggingface_hub import HfApi

    e = env()
    api = HfApi(token=e.get("HF_TOKEN") or sys.exit("Falta HF_TOKEN en .env"))
    usuario = api.whoami()["name"]
    repo = f"{usuario}/{ESPACIO}"
    api.create_repo(repo, repo_type="space", space_sdk="docker", exist_ok=True, private=False)
    token_api = e.get("RASTRO_API_TOKEN") or clave_aleatoria(32)
    guardar("RASTRO_API_TOKEN", token_api)
    api.add_space_secret(repo, "RASTRO_API_TOKEN", token_api)

    with tempfile.TemporaryDirectory() as tmp:
        t = Path(tmp)
        for carpeta in ("rastro", "api", "data/processed", "data/benchmark"):
            shutil.copytree(RAIZ / carpeta, t / carpeta, ignore=shutil.ignore_patterns("__pycache__"))
        (t / "scripts").mkdir()
        shutil.copy(RAIZ / "scripts" / "exportar_web.py", t / "scripts" / "exportar_web.py")
        shutil.copy(RAIZ / "Dockerfile", t / "Dockerfile")
        (t / "README.md").write_text(
            "---\ntitle: RASTRO motor\nemoji: 🧭\ncolorFrom: green\ncolorTo: blue\nsdk: docker\napp_port: 7860\n"
            "pinned: false\n---\n\nMotor de evidencia de RASTRO (hackIAthon Panamá 2026 · TVN Media · team BillieJSON). "
            "Código: https://github.com/yuleidysescudero/rastro-tvn\n", encoding="utf-8")
        api.upload_folder(folder_path=str(t), repo_id=repo, repo_type="space", commit_message="Motor RASTRO")
    url = f"https://{usuario.lower().replace('_', '-')}-{ESPACIO}.hf.space"
    guardar("RASTRO_API_URL", url)
    print(f"  Space: https://huggingface.co/spaces/{repo}\n  API: {url} (el build tarda ~5–10 min)")


# ---------------------------------------------------------------- Vercel
def vercel() -> None:
    e = env()
    web = RAIZ / "web"
    vars_ = {
        "NEXT_PUBLIC_SUPABASE_URL": e.get("SUPABASE_URL"),
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": e.get("SUPABASE_ANON_KEY"),
        "NEXT_PUBLIC_DEMO_CLAVE": e.get("RASTRO_DEMO_CLAVE"),
        "RASTRO_API_URL": e.get("RASTRO_API_URL"),
        "RASTRO_API_TOKEN": e.get("RASTRO_API_TOKEN"),
    }
    vc = shutil.which("vercel") or shutil.which("vercel.cmd") or "vercel"
    for k, v in vars_.items():
        if not v:
            print(f"  {k}: (sin valor, se omite)")
            continue
        subprocess.run([vc, "env", "rm", k, "production", "--yes"], cwd=web, capture_output=True)
        r = subprocess.run([vc, "env", "add", k, "production"], cwd=web, input=v, text=True, capture_output=True)
        print(f"  {k}: {'ok' if r.returncode == 0 else 'error ' + r.stderr[-200:]}")
    r = subprocess.run([vc, "deploy", "--prod", "--yes"], cwd=web, capture_output=True, text=True)
    print("  despliegue:", "ok" if r.returncode == 0 else r.stderr[-400:])


if __name__ == "__main__":
    {"supabase": supabase, "motor": motor, "vercel": vercel}[sys.argv[1]]()
