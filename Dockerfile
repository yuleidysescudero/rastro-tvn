# Motor RASTRO (API FastAPI). Compatible con Hugging Face Spaces (Docker, puerto 7860) y cualquier host Docker.
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 HF_HOME=/app/.hf PORT=7860
RUN useradd -m -u 1000 user
WORKDIR /app
COPY api/requirements.txt api/requirements.txt
RUN pip install -r api/requirements.txt
COPY rastro rastro
COPY api api
COPY scripts/exportar_web.py scripts/exportar_web.py
COPY data/processed data/processed
COPY data/benchmark data/benchmark
# Procesa el snapshot y descarga el modelo de embeddings durante el build: el arranque no depende de internet
RUN python -c "from rastro import pipeline; pipeline.procesar()" && chown -R user:user /app
USER user
EXPOSE 7860
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT}"]
