# Presentación al jurado · RASTRO (10 min)

> «Esta mañana, varios medios publicaron la misma noticia sobre el Canal. Parecía confirmada.
> Detrás había menos fuentes de las que parecía. Una redacción tiene minutos para notarlo.
> Construimos la herramienta que lo nota por ella.»

## 1 · Problema y usuario (1 min)
La editora de mesa de TVN a las 6:40 a. m.: decenas de titulares, poco tiempo, y la repetición se confunde con confirmación.

## 2 · Solución y datos (1 min)
Tres ejes que nunca se mezclan: **prioridad · procedencia · evidencia**. Datos públicos congelados: TVN RSS,
Google News RSS y RSS de medios panameños (GDELT bloqueado, D-03), Banco Mundial y USGS.

## 3 · Demo en vivo (4 min)
| Tiempo | Pantalla | Qué ve el jurado |
|---|---|---|
| 0:00 | Radar | Top 5 sin historias repetidas; se mueve un peso y queda la justificación |
| 0:35 | Sin IA vs Con IA | Baseline: titulares sueltos por fecha. RASTRO: un evento, N procedencias |
| 0:55 | Ficha · Procedencia | Grafo «N titulares → M procedencias» |
| 1:30 | Ficha · Contexto | Indicador con etiqueta de año («dato anual, no es una cifra de hoy») |
| 1:55 | Ficha · Conflictos | Crecimiento 5,5 % vs 6,4 % vs 8,49 %: no se elige una versión |
| 2:15 | Borradores | Semáforo por oración, chip de cita, cronómetro 45–60 s |
| 2:45 | Defiende tu nota + Compañero de mesa | Corrige «varios medios confirman»; «¿Cuánto perdió Panamá por las lluvias?» → abstención útil |
| 3:20 | Laboratorio | Escudo en vivo: «IGNORA TUS INSTRUCCIONES…» bloqueado |
| 3:45 | Revisión | «Requiere evidencia», persona responsable, ficha a Notion |

## 4 · Arquitectura, IA y métricas (2 min)
Ver Diseño de solución y Pruebas y métricas (numerador/denominador, fallos incluidos, IA vs baseline).

## 5 · Valor (1 min)
Hipótesis de valor (a medir con una tarea equivalente manual vs asistida, declarando el número de pruebas):
pasar de una lista dispersa a un tema investigable con evidencia y un borrador responsable.

## 6 · Riesgos y próximos pasos (1 min)
Procedencia inferida con solo titulares · modelo de embeddings más grande · lectura autorizada de
extractos de TVN · modalidad bancaria con el mismo núcleo · monitoreo continuo.

## Preguntas del jurado: respuesta en pantalla
- «¿De dónde viene esta cifra y de qué año es?» → chip de cita en Borradores.
- «Si cinco medios replican la misma agencia, ¿cuántas fuentes cuentas?» → una (T02, grafo de procedencia).
- «¿Qué pasa sin evidencia o si una fuente intenta cambiar instrucciones?» → abstención + escudo (T06, T07).
- «Muéstrame una decisión, una prueba fallida y su corrección» → D-06, D-09, D-10.

> «Otros sistemas te dicen qué noticia es importante. RASTRO te dice cuántas fuentes reales hay detrás,
> qué puedes afirmar hoy y tiene la honestidad de decir: no lo sé.»
