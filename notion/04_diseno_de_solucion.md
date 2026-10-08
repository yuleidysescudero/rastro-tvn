# Diseño de solución

## Arquitectura
```
Fuentes públicas (TVN RSS · Google News RSS · RSS medios · GDELT · Banco Mundial · USGS)
   → scripts/extraer_datos.py (snapshot congelado + manifest SHA-256)
   → 1 Cargar      rastro/carga.py         validación, reporte de calidad, ventana de cobertura
   → 2 Organizar   rastro/organizar.py     temas (embeddings), eventos (clustering), procedencias, conflictos, recirculación
   → 3 Contexto    rastro/contexto.py      Banco Mundial / USGS solo con relación explícita
   → 4 Priorizar   rastro/priorizar.py     P = 30R+25I+20U+15N+10E, estado de evidencia, agenda diversa
   → 5 Explicar    app.py (Ficha)
   → 6 Producir    rastro/redaccion.py → Claude (JSON estricto) | plantilla offline → rastro/verificador.py
   → 7 Revisar     rastro/revision.py      estados humanos, fichas.jsonl, Markdown para Notion
   Transversal: rastro/escudo.py (anti-inyección) · rastro/agente.py (Compañero de mesa)
```

## Modelo de datos (pág. 7)
- `noticias.csv`: id_noticia, titulo, url, medio, idioma, fecha_publicacion, fecha_deteccion, fecha_extraccion, tema, origen, alcance_texto
- `indicadores.csv`: pais_iso3, indicador_id, anio, valor (nullable), unidad, fuente_url, fecha_extraccion, licencia
- `eventos.geojson`: id, magnitude, time, updated, longitude, latitude, depth, place, status, url
- `fichas.jsonl`: id_caso, modalidad, ids_fuente, afirmaciones, citas, puntaje, componentes, estado_evidencia, borrador, estado_revision
- `manifest.json`: versión, fecha_corte_UTC, consultas, cantidad por archivo, licencias, SHA-256, transformaciones

## Reglas (versión `reglas-v1.1`)
- R: 0,6 × relación con Panamá + 0,4 × pertenece a los 6 temas.
- I: 0,5 × procedencias independientes (tope 4) + 0,3 × tema de interés público + 0,2 × dato oficial vinculado.
- U: decaimiento exponencial, vida media 48 h. N: 1 − similitud máxima con eventos anteriores. E: 0,6 × procedencias (tope 3) + 0,4 × fuente oficial.
- Rangos: bajo [0,40), medio [40,70), alto [70,100]. Empates: urgencia y luego ID.
- Evidencia: suficiente si ≥3 procedencias o ≥2 + dato oficial; parcial si 2 o dato oficial; si hay cifras incompatibles, como máximo parcial.

## Modelos
| Componente | Modelo / versión | Parámetros |
|---|---|---|
| Embeddings | sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (CPU) | normalizados; umbral evento 0,66; réplica 0,90 |
| Clustering | scikit-learn AgglomerativeClustering | coseno, enlace promedio, ventana 72 h |
| Redacción | Claude `claude-opus-5-5` (Anthropic) | salida JSON estricta, effort medium, fallbacks del servidor, caché en disco |
| Respaldo | Plantilla extractiva determinista | sin red / sin credencial |

## Prompts
Ver `rastro/redaccion.py` (SISTEMA) y `rastro/agente.py` (SISTEMA_RESPUESTA). Las fuentes viajan como datos
escapados dentro de `<evidencia>…</evidencia>`, separadas de las instrucciones.

## Límites del sistema
Solo titulares/metadatos; procedencia inferida; modelo de embeddings pequeño; GDELT bloqueado durante la extracción (D-03).
