# RASTRO · copiloto editorial de evidencia para TVN Media

> *No te dice qué es verdad. Te dice qué puedes sostener.*

**hackIAthon Panamá 2026 · Reto TVN Media «De la señal a la decisión» · team BillieJSON · modalidad editorial**

RASTRO convierte noticias públicas e indicadores oficiales en una agenda priorizada para la mesa editorial
de TVN. Cada tema se mide en **tres ejes que nunca se mezclan**:

| Eje | Pregunta | Cómo se calcula |
|---|---|---|
| Prioridad | ¿Merece atención? | P = 30R + 25I + 20U + 15N + 10E (0–100), con componentes visibles y versión de reglas |
| Procedencia | ¿Cuántas fuentes reales hay detrás? | N titulares → M procedencias independientes (réplicas y agencias cuentan una vez) |
| Evidencia | ¿Qué se puede afirmar hoy? | insuficiente / parcial / suficiente para el borrador (independiente del puntaje) |

## Flujo de 7 etapas (pág. 3 del reto)

| Etapa | Módulo | Qué hace |
|---|---|---|
| 1 Cargar | `rastro/carga.py` | Valida IDs, URLs, fechas y nulos; separa errores sin bloquear; reporte de calidad |
| 2 Organizar | `rastro/organizar.py` | Clasificación semántica en 6 temas, agrupación en eventos, procedencias, conflictos, recirculación |
| 3 Contextualizar | `rastro/contexto.py` | Vincula Banco Mundial / USGS solo si el titular nombra la variable; etiqueta país·año·unidad |
| 4 Priorizar | `rastro/priorizar.py` | Puntaje R·I·U·N·E, estado de evidencia, agenda sin historias repetidas |
| 5 Explicar | `app.py` (Ficha) | Qué se reporta, quién, qué está respaldado, qué falta, siguiente acción |
| 6 Producir | `rastro/redaccion.py` + `rastro/verificador.py` | Brief ≤250 palabras, guion 45–60 s, copy ≤80 palabras, cita por oración, verificador determinista |
| 7 Revisar | `rastro/revision.py` | 5 estados humanos, persona responsable, `fichas.jsonl` y ficha en Markdown para Notion |

Transversales: `rastro/escudo.py` (anti-inyección), `rastro/agente.py` (Compañero de mesa con abstención
en dos capas y «Defiende tu nota»), `rastro/aceptacion.py` (T01–T10).

## Instalación

Requisitos: Python 3.12, ~2 GB libres (modelo de embeddings en CPU).

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate    ·    Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # opcional: agrega ANTHROPIC_API_KEY para redacción con LLM
```

## Interfaz

Flujo guiado de 4 pasos: **1 Radar → 2 Ficha → 3 Borrador → 4 Revisión**, con indicador de paso y botones
Siguiente/Volver. Aparte: **Compañero de mesa** (preguntas en español). Las vistas para el jurado (Salud del
corpus, Sin IA vs Con IA, Laboratorio) están en la sección plegable **Modo técnico (jurado)**.
Colores: verde/ámbar/rojo = evidencia suficiente/parcial/insuficiente; azul neutro = prioridad y acciones.

## Ejecución

```bash
streamlit run app.py                         # interfaz
python scripts/preparar_demo.py              # guarda los paquetes de la demo (usa Claude si hay ANTHROPIC_API_KEY)
python scripts/probar_aceptacion.py          # T01–T11 → data/resultados/pruebas.json
pytest                                       # mismas pruebas con pytest
python scripts/evaluar.py                    # métricas IA vs baseline + benchmark de desarrollo
python scripts/evaluar.py --reservado        # conjunto reservado (solo para la evaluación final)
```

Actualizar el paquete de datos (no es necesario para la demo):

```bash
python scripts/extraer_datos.py                  # todas las fuentes
python scripts/extraer_datos.py --solo tvn       # una fuente (tvn | gdelt | respaldo | worldbank | usgs)
python scripts/preparar_etiquetado.py            # plantillas de etiquetado humano y benchmark
```

## Modo sin internet (T10)

La demo funciona sin conexión: el snapshot está en `data/processed/`, los embeddings se cachean en
`data/cache/` y, si no hay credencial o red, la redacción usa una **plantilla extractiva determinista**
que solo atribuye lo que dicen los titulares. Las respuestas del LLM también se cachean para repetir la demo.

## Datos (págs. 6–7)

| Archivo | Fuente | Licencia / condiciones |
|---|---|---|
| `noticias.csv` | TVN RSS · Google News RSS · RSS de medios panameños · GDELT DOC 2.0 (cuando responde) | Solo metadatos: titular, medio, fecha, URL. No se redistribuyen artículos |
| `indicadores.csv` | Banco Mundial API v2 · 6 países × 6 indicadores × 2010–2024 = 540 combinaciones | CC BY 4.0 |
| `eventos.geojson` | USGS · sismos 2024, lat 5–12, lon −86 a −76, M ≥ 3 | Dominio público |
| `manifest.json` | Versión, corte UTC, consultas, conteos, SHA-256, transformaciones y desviaciones | — |

Toda salida lleva la leyenda **«basado únicamente en titular/metadatos»**.

## IA y baselines

| Tarea | IA | Baseline |
|---|---|---|
| Temas | Embeddings multilingües (`paraphrase-multilingual-MiniLM-L12-v2`) contra prototipos de los 6 temas y de temas fuera del reto | Palabras clave |
| Eventos | Clustering aglomerativo (coseno) sobre titulares sin la entidad omnipresente «Panamá» + ventana de 72 h | Misma URL o ≥3 palabras en común |
| Procedencia | Similitud de réplica ≥0,90, misma agencia, mismo medio | — |
| Consultas | Recuperación semántica + anclaje léxico + abstención en dos capas | Búsqueda por palabras clave |
| Redacción | Claude (`claude-opus-5-5`, salida JSON estricta, effort `medium`) + verificador determinista | Plantilla extractiva |

El verificador **no es el LLM**: elimina toda oración sin cita, con un ID inexistente, con cifras que no
aparecen en la evidencia citada o con un dato anual sin su año.

## Seguridad y ética

- Control humano: nuevo → en revisión → requiere evidencia → aprobado como borrador → descartado. Aprobar no es publicar.
- Anti-inyección: el texto de una fuente es dato; las fuentes con instrucciones incrustadas se excluyen de la evidencia.
- Privacidad: no se perfilan personas ni se arman listas de sospechosos; acusaciones solo como declaraciones atribuidas.
- Credenciales solo en `.env` (excluido del repositorio). Nada de secretos en Notion, capturas ni logs.

## Limitaciones conocidas

- Solo titulares y metadatos: la procedencia es **inferida** (no se leen los artículos).
- GDELT bloqueó las consultas desde nuestra red durante la extracción; se usó Google News RSS como respaldo documentado.
- El modelo de embeddings es pequeño (CPU): subestima algunas paráfrasis; se complementa con señales léxicas.
- Las métricas de clasificación y ranking dependen del etiquetado humano del equipo (`data/etiquetas/`).

## Estructura

```
app.py                 enrutador de la interfaz (st.navigation)
ui/comun.py            estilo, colores, lenguaje de redacción, pasos y navegación
vistas/                pantallas: radar, ficha, borrador, revision, companero, tec_*
rastro/                núcleo (carga, organizar, contexto, priorizar, redaccion, verificador, escudo, agente, revision)
scripts/               extracción, etiquetado, evaluación y pruebas de aceptación
data/processed/        snapshot congelado + manifest
data/etiquetas/        etiquetas humanas
data/benchmark/        60 consultas (40 desarrollo / 20 reservadas)
data/resultados/       pruebas.json, metricas.json, fichas.jsonl, revisiones.jsonl, llm_log.jsonl
tests/                 pytest
```
