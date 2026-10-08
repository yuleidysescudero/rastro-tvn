"""API del motor RASTRO para la app web: mismas funciones que pasan T01–T10, sin lógica duplicada.

  uvicorn api.main:app --port 8000          # local
El corpus se procesa una vez al arrancar (cacheado por hash del snapshot, ver pipeline.py).
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from dotenv import load_dotenv  # noqa: E402

load_dotenv()
from rastro import agente, config, pipeline, redaccion  # noqa: E402
from rastro.embeddings import codificar  # noqa: E402

sys.path.insert(0, str(config.RAIZ / "scripts"))
from exportar_web import limpio  # noqa: E402

app = FastAPI(title="RASTRO · motor", version=config.REGLAS_VERSION)
origenes = [o.strip() for o in os.getenv("RASTRO_ORIGENES", "*").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origenes, allow_methods=["GET", "POST"], allow_headers=["*"])

C = pipeline.procesar()
codificar(["calentar el modelo"])  # la primera consulta no paga la carga del modelo


class Consulta(BaseModel):
    pregunta: str = Field(min_length=2, max_length=500)


class Nota(BaseModel):
    id_evento: str = Field(max_length=40)
    texto: str = Field(min_length=2, max_length=4000)


@app.middleware("http")
async def token(request: Request, siguiente):
    """Si RASTRO_API_TOKEN está definido, solo la app web (que lo envía desde el servidor) puede consultar."""
    esperado = os.getenv("RASTRO_API_TOKEN")
    if esperado and request.url.path != "/salud" and request.headers.get("authorization") != f"Bearer {esperado}":
        return JSONResponse({"detail": "no autorizado"}, status_code=401)
    return await siguiente(request)


@app.get("/salud")
def salud() -> dict:
    return {"ok": True, "reglas": config.REGLAS_VERSION, "temas": len(C.eventos), "titulares": len(C.noticias),
            "motor_embeddings": C.motor_embeddings, "llm": bool(os.getenv("ANTHROPIC_API_KEY"))}


@app.post("/consulta")
def consulta(q: Consulta) -> dict:
    t0 = time.perf_counter()
    r = agente.responder(C, q.pregunta)
    r["segundos"] = round(time.perf_counter() - t0, 3)
    return limpio(r)


@app.post("/defender")
def defender(n: Nota) -> dict:
    ev = C.evento(n.id_evento)
    if ev is None:
        raise HTTPException(404, "tema no encontrado")
    evidencia, _ = redaccion.evidencia_evento(C, ev)
    return {"observaciones": agente.defender_nota(n.texto, ev, evidencia)}
