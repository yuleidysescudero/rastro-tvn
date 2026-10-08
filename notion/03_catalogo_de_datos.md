# Catálogo de datos

**Paquete:** Panamá · Señales y Evidencias v1 · **Corte:** 2026-10-07T18:21:04Z UTC · **Ventana de noticias:** 90 días

## Archivos y hash del snapshot
| archivo | sha256 | bytes |
|---|---|---|
| noticias.csv | 614a0e5e3fae1f9883845dfe45ae1525c3d2eda5e94fe52baa70b3b3b2a2be2d | 430299 |
| indicadores.csv | eeba286df22a5c8683633eae39c5df9f018583eda3594ec7a0b2fea29d54504d | 99004 |
| eventos.geojson | 4dbd43a35c226f9de70a8c2d6e9bd98e98706f2a05502982c01eae88e112af0b | 42976 |

## Licencias / condiciones por fuente
- **tvn_rss:** Metadatos públicos del RSS de TVN. No implica licencia sobre artículos, videos ni imágenes; solo se guardan titular, URL y fechas.
- **gdelt:** GDELT DOC 2.0 API (uso abierto con atribución a The GDELT Project). No transfiere derechos de los medios enlazados; solo metadatos.
- **worldbank:** CC BY 4.0 (World Bank Open Data), salvo excepciones indicadas en metadatos del indicador.
- **usgs:** Dominio público (USGS Earthquake Hazards Program); confirmar condiciones de terceros.
- **google_news_rss / rss_medios (respaldo):** solo metadatos públicos (titular, medio, fecha, enlace). No se redistribuye contenido. Ver D-03.

## Transformaciones
- Deduplicación por URL normalizada (minúsculas, sin '/' final); se conservan todos los orígenes.
- Fechas en ISO 8601 UTC. fecha_publicacion (RSS) y fecha_deteccion (seendate GDELT) se mantienen separadas.
- Campos ausentes se dejan vacíos/nulos; nunca se rellenan con cero.
- Banco Mundial: cuadrícula completa 6 países × 6 indicadores × 15 años = 540 combinaciones con nulos explícitos.
- USGS: solo campos del contrato (pág. 7); la caja regional no equivale al territorio de Panamá.

## Desviaciones documentadas
- Ventana de noticias: últimos 30 días antes del corte (pág. 6). La regla de exclusión [2024-01-01, 2025-10-01) de la pág. 7 contradice la pág. 6 para una extracción en 2026; ver Decisión D-01 en Notion.
- La pág. 6 menciona 1.350 combinaciones, pero 6 × 6 × 15 = 540; se usa 540 (Decisión D-02).
- Descripciones del RSS de TVN excluidas por defecto (derechos no confirmados, pág. 6).

## Cobertura efectiva
- Titulares válidos tras la carga: **677** (de 763); separados: 86 (fuera de ventana o con error).
- Titulares de TVN: **143** (mínimo exigido: 20).
- Medios distintos: **146** · Eventos: **459**

## Consultas ejecutadas
| fuente | consulta | registros | estado | url |
|---|---|---|---|---|
| tvn_rss |  | 153 | ok | https://www.tvn-2.com/rss/ |
| worldbank | NY.GDP.MKTP.KD.ZG | 90 | ok | https://api.worldbank.org/v2/country/PAN;CRI;COL;DOM;MEX;GTM/indicator/NY.GDP.MKTP.KD.ZG?date=2010:2024&format=json&per_page=2000 |
| worldbank | FP.CPI.TOTL.ZG | 90 | ok | https://api.worldbank.org/v2/country/PAN;CRI;COL;DOM;MEX;GTM/indicator/FP.CPI.TOTL.ZG?date=2010:2024&format=json&per_page=2000 |
| worldbank | SL.UEM.TOTL.ZS | 90 | ok | https://api.worldbank.org/v2/country/PAN;CRI;COL;DOM;MEX;GTM/indicator/SL.UEM.TOTL.ZS?date=2010:2024&format=json&per_page=2000 |
| worldbank | SP.POP.TOTL | 90 | ok | https://api.worldbank.org/v2/country/PAN;CRI;COL;DOM;MEX;GTM/indicator/SP.POP.TOTL?date=2010:2024&format=json&per_page=2000 |
| worldbank | IT.NET.USER.ZS | 90 | ok | https://api.worldbank.org/v2/country/PAN;CRI;COL;DOM;MEX;GTM/indicator/IT.NET.USER.ZS?date=2010:2024&format=json&per_page=2000 |
| worldbank | NE.EXP.GNFS.ZS | 90 | ok | https://api.worldbank.org/v2/country/PAN;CRI;COL;DOM;MEX;GTM/indicator/NE.EXP.GNFS.ZS?date=2010:2024&format=json&per_page=2000 |
| usgs |  | 82 | ok | https://earthquake.usgs.gov/fdsnws/event/1/query |
| google_news_rss | general | 100 | ok | https://news.google.com/rss/search?q=Panam%C3%A1%20when:30d&hl=es-419&gl=PA&ceid=PA:es-419 |
| google_news_rss | logistica_canal | 100 | ok | https://news.google.com/rss/search?q=%22Canal%20de%20Panam%C3%A1%22%20when:30d&hl=es-419&gl=PA&ceid=PA:es-419 |
| google_news_rss | economia | 88 | ok | https://news.google.com/rss/search?q=Panam%C3%A1%20%28econom%C3%ADa%20OR%20inflaci%C3%B3n%20OR%20empleo%20OR%20exportaciones%29%20when:30d&hl=es-419&gl=PA&ceid=PA:es-419 |
| google_news_rss | turismo | 65 | ok | https://news.google.com/rss/search?q=Panam%C3%A1%20%28turismo%20OR%20turistas%20OR%20hoteles%29%20when:30d&hl=es-419&gl=PA&ceid=PA:es-419 |
| google_news_rss | eventos_naturales | 100 | ok | https://news.google.com/rss/search?q=Panam%C3%A1%20%28sismo%20OR%20temblor%20OR%20inundaci%C3%B3n%20OR%20lluvias%29%20when:30d&hl=es-419&gl=PA&ceid=PA:es-419 |
| google_news_rss | servicios_publicos | 100 | ok | https://news.google.com/rss/search?q=Panam%C3%A1%20%28IDAAN%20OR%20agua%20OR%20electricidad%20OR%20apag%C3%B3n%20OR%20metro%29%20when:30d&hl=es-419&gl=PA&ceid=PA:es-419 |
| google_news_rss | regulacion | 85 | ok | https://news.google.com/rss/search?q=Panam%C3%A1%20%28ley%20OR%20decreto%20OR%20Asamblea%20OR%20resoluci%C3%B3n%29%20when:30d&hl=es-419&gl=PA&ceid=PA:es-419 |
| rss_medio | prensa.com | 0 | fallida | https://www.prensa.com/arc/outboundfeeds/rss/ |
| rss_medio | critica.com.pa | 10 | ok | https://www.critica.com.pa/rss.xml |
| rss_medio | panamaamerica.com.pa | 5 | ok | https://www.panamaamerica.com.pa/rss.xml |
| rss_medio | ensegundos.com.pa | 0 | fallida | https://www.ensegundos.com.pa/feed/ |
