# Plan y decisiones

## Decisiones técnicas y de producto

### D-01 · Modalidad editorial TVN
**Fecha:** 2026-10-07 · **Responsable:** Yuls (dev)

**Contexto:** El reto recomienda la modalidad editorial y admite la bancaria sin exigir dos productos (pág. 1).

**Decisión:** Construir solo la modalidad editorial con un recorrido completo; la bancaria queda como próximo paso (mismo núcleo).

**Evidencia:** Pág. 1 y pág. 11: «limitarse a una modalidad y un recorrido convincente antes de añadir funcionalidades».

### D-02 · Ventana de noticias: últimos 30–90 días
**Fecha:** 2026-10-07 · **Responsable:** Yuls (dev)

**Contexto:** La pág. 6 pide noticias de los 30 días previos a la extracción; la pág. 7 pide excluir lo que esté fuera de [2024-01-01, 2025-10-01). Con una extracción en octubre de 2026 ambas reglas son incompatibles. La organización no entregó un paquete congelado.

**Decisión:** Seguir la pág. 6: noticias de los 30 días previos al corte; se excluyen y reportan registros con más de 90 días.

**Evidencia:** manifest.json → desviaciones_documentadas; reporte de calidad de la carga (filas «fuera de la ventana»).

### D-03 · Google News RSS como respaldo de GDELT
**Fecha:** 2026-10-07 · **Responsable:** Yuls (dev)

**Contexto:** GDELT DOC 2.0 respondió «Please limit requests to one every 5 seconds» a todas las consultas desde nuestra red, incluso con esperas de 60 s.

**Decisión:** Mantener el extractor de GDELT (con caché y freno automático) y usar Google News RSS por tema + RSS de medios panameños como respaldo, solo metadatos. Reintentar GDELT desde otra red antes del cierre.

**Evidencia:** data/raw/respaldo/*; manifest.json → consultas.respaldo (645 titulares de 7 consultas); log de bloqueos de GDELT.

### D-04 · Banco Mundial: 540 combinaciones, no 1.350
**Fecha:** 2026-10-07 · **Responsable:** Yuls (dev)

**Contexto:** La pág. 6 menciona una cuadrícula de 1.350 combinaciones, pero 6 países × 6 indicadores × 15 años = 540.

**Decisión:** Construir la cuadrícula completa de 540 combinaciones con nulos explícitos.

**Evidencia:** indicadores.csv (540 filas); manifest.json → indicadores.

### D-05 · Stack: Python + Streamlit + embeddings locales + Claude con respaldo offline
**Fecha:** 2026-10-07 · **Responsable:** Yuls (dev)

**Contexto:** Equipo de 1 dev + 2 ciberseguridad, ~35 h, demo obligatoria sin internet (T10).

**Decisión:** Streamlit para la interfaz; paraphrase-multilingual-MiniLM-L12-v2 en CPU; Claude (claude-opus-5-5, salida JSON estricta) para redactar; plantilla extractiva determinista cuando no hay red ni credencial; cachés en disco.

**Evidencia:** T10 pasa sin credenciales y con Hugging Face offline (data/resultados/pruebas.json).

### D-06 · Agrupar eventos sin la entidad omnipresente «Panamá»
**Fecha:** 2026-10-07 · **Responsable:** Yuls (dev)

**Contexto:** Con titulares completos, un solo «evento» juntaba 71 titulares distintos sobre el Canal (cupos, Cuarto Puente, sequía, presupuesto): «Canal de Panamá» dominaba los embeddings.

**Decisión:** Para agrupar y clasificar se quita «Panamá» (conservando «el Canal»); umbral 0,66; ventana máxima de 72 h por evento.

**Evidencia:** Antes: cluster máximo 71 titulares. Después: máximo 10, clusters coherentes (p. ej., «Sinaproc extiende aviso…» 8 titulares → 4 procedencias).

### D-07 · Prototipos de temas fuera del reto
**Fecha:** 2026-10-07 · **Responsable:** Yuls (dev)

**Contexto:** «Ecuador vs Panamá: horario, canal y dónde ver» se clasificaba como Logística/Canal y llegaba al top 5.

**Decisión:** Añadir prototipos de deportes, entretenimiento, sucesos, diplomacia y notas corporativas de TVN; si ganan, el titular va a «otro».

**Evidencia:** El partido salió del ranking; Servicios públicos pasó de 7 a 34 titulares tras enriquecer su descripción.

### D-08 · Agenda sin historias repetidas
**Fecha:** 2026-10-07 · **Responsable:** Yuls (dev)

**Contexto:** El top 5 mostraba dos veces la ampliación de cupos del Canal. El modelo pequeño da similitud 0,57 a ese par (igual que a pares no relacionados).

**Decisión:** Selección diversa del top 5 con señal semántica + Jaccard léxico ≥ 0,34; los gemelos se muestran como «relacionados».

**Evidencia:** EV-1f05e216 aparece como relacionado del #3 en lugar de ocupar el #5.

### D-09 · Prueba fallida: abstención 2/7 → 6/7
**Fecha:** 2026-10-07 · **Responsable:** Yuls (dev)

**Contexto:** Primera corrida del benchmark de desarrollo: solo 2 de 7 consultas sin respuesta se abstuvieron (meta ≥ 80 %). Ej.: «¿Cuánto dinero perdió Panamá por las lluvias?» respondía con titulares no relacionados.

**Decisión:** Tres reglas generales: (1) la cifra pedida debe ser del mismo tipo (dinero, personas, %); (2) umbral de recuperación 0,52 + anclaje léxico; (3) período compatible (año pedido, proyecciones, «hoy»). Más rechazo de consultas que piden perfilar personas.

**Evidencia:** Desarrollo: abstención 6/7, adversarial 7/7, sustentadas 20/20, abstenciones incorrectas 0/26. Reservado (sin ajustar): 2/3, 3/3, 9/10, 1/13. Fallo pendiente: B042 («¿inflación en 2027?»).

### D-10 · Prueba fallida: T09 aceptaba un guion de 18 s
**Fecha:** 2026-10-07 · **Responsable:** Yuls (dev)

**Contexto:** T09 pasaba aunque el guion de la plantilla duraba 18 s (el reto pide 45–60 s): la prueba no medía la duración.

**Decisión:** Endurecer T09 (45–60 s obligatorio, evento real con ≥3 procedencias) y rehacer el guion de la plantilla con cronómetro y recorte automático.

**Evidencia:** T09: guion 53 s, citas 11/11.

### D-11 · Descripciones del RSS de TVN excluidas
**Fecha:** 2026-10-07 · **Responsable:** Yuls (dev)

**Contexto:** El RSS de TVN trae descripciones, pero el reto indica que el patrocinio no concede derechos de republicación (pág. 6).

**Decisión:** Guardar solo titular, URL y fechas; todas las salidas dicen «basado únicamente en titular/metadatos». Se puede activar --con-descripcion si TVN lo autoriza.

**Evidencia:** scripts/extraer_datos.py (flag --con-descripcion); noticias.csv con alcance_texto = titular/metadatos.

### D-12 · Prueba fallida: abstención por tipo de dato (4/5 respondían)
**Fecha:** 2026-10-07 · **Responsable:** Yuls (dev)

**Contexto:** «¿Cuánto perdió Panamá por el Canal?» y 3 de sus 4 paráfrasis se respondían con titulares del Canal: cualquier monto del tema (p. ej. «subastas por US$5 millones») contaba como si fuera una pérdida.

**Decisión:** Detectar el tipo de dato pedido (pérdida, %, fecha, personas, monto, cifra) y exigir que UN MISMO titular relevante contenga ese tipo de dato y hable del tema. La similitud alta no basta. Mensaje: «No hay evidencia de [dato] sobre [tema]. Haría falta: …».

**Evidencia:** T11: 5/5 paráfrasis se abstienen; controles con dato existente (subastas, inflación) siguen respondiendo 2/2. Benchmark de desarrollo sin regresión.

### D-13 · Interfaz: flujo guiado de 4 pasos
**Fecha:** 2026-10-07 · **Responsable:** Yuls (dev)

**Contexto:** 8 pantallas sueltas con lenguaje técnico (procedencias, IDs) hacían difícil seguir la demo y usar la herramienta en una redacción.

**Decisión:** Radar → Ficha → Borrador → Revisión con indicador de paso y botones Siguiente/Volver; Compañero de mesa aparte; vistas técnicas en «Modo técnico (jurado)». Lenguaje de redacción («fuentes reales», «qué falta confirmar», «próximo paso»); IDs solo en «ver evidencia». Evidencia en semáforo; prioridad y acciones en azul neutro.

**Evidencia:** Prueba de interfaz: 8/8 pantallas sin errores; «Abrir ficha →» abre la ficha de ese tema; el contador de evidencia insuficiente se calcula sobre todos los temas (340/459).

### D-14 · Copy de 60–80 palabras y paquetes de la demo guardados
**Fecha:** 2026-10-07 · **Responsable:** Yuls (dev)

**Contexto:** El copy de la plantilla tenía ~20 palabras y la demo dependía de generar en vivo.

**Decisión:** Copy con ajuste de largo (60–80) y guion con relleno útil (45–60 s); scripts/preparar_demo.py guarda los paquetes de los temas de la demo en data/resultados/demo/.

**Evidencia:** T09: copy 73 palabras, guion 53 s, citas 13/13; 7 paquetes de demo guardados.
