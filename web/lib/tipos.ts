// Tipos del snapshot exportado por scripts/exportar_web.py (contrato de datos, pág. 7 del reto)

export type Componentes = { R: number; I: number; U: number; N: number; E: number };
export type EstadoEvidencia = "insuficiente" | "parcial" | "suficiente para el borrador";
export type EstadoRevision = "nuevo" | "en revisión" | "requiere evidencia" | "aprobado como borrador" | "descartado";

export type Procedencia = {
  ids: string[];
  medios: string[];
  agencia: string | null;
  oficial: boolean;
  primer_registro?: string;
  [k: string]: unknown;
};

export type Indicador = {
  indicador_id: string;
  nombre: string;
  motivo: string;
  ultimo: { pais: string; anio: number; valor: number; unidad: string; fuente_url: string } | null;
  etiqueta?: string;
  aviso?: string;
  serie?: { anio: number; valor: number | null }[];
  region?: { pais: string; valor: number | null }[];
  evidencia_id?: string;
};

export type Conflicto = { [k: string]: unknown };

export type Evento = {
  id_evento: string;
  rank: number;
  titulo: string;
  tema: string;
  tema_nombre: string;
  ids: string[];
  n_titulares: number;
  medios: string[];
  procedencias: Procedencia[];
  n_procedencias: number;
  primera_fecha: string;
  ultima_fecha: string;
  recirculacion: string | null;
  conflictos: Conflicto[];
  relacion_panama: number;
  confianza_tema: number;
  tiene_tvn: boolean;
  indicadores: Indicador[];
  sismo: { encontrado: boolean; id?: string; magnitud?: number; lugar?: string; hora_utc?: string; url?: string; evidencia_id?: string; [k: string]: unknown } | null;
  sin_dato_oficial: boolean;
  componentes: Componentes;
  puntaje: number;
  nivel: "alto" | "medio" | "bajo";
  estado_evidencia: EstadoEvidencia;
  motivo_evidencia: string;
  historia: string;
  relacionados: string[];
};

export type Noticia = {
  id: string;
  titulo: string;
  medio: string;
  url: string;
  idioma: string | null;
  fecha: string | null;
  fecha_tipo: string;
  fecha_publicacion: string | null;
  tema: string;
  tema_baseline: string;
  confianza_tema: number;
  origen: string;
  evento: string | null;
  alcance: string;
};

export type Cita = { id: string; campo: string };
export type TipoOracion = "hecho" | "declaracion" | "inferencia" | "hipotesis";
export type Oracion = { texto: string; tipo: TipoOracion; citas: Cita[]; motivo?: string; seccion?: string };

export type Paquete = {
  meta: { motor: string; motivo?: string; modelo?: string; latencia_total_s?: number; costo_usd?: number; [k: string]: unknown };
  evidencia: Record<string, Record<string, unknown>>;
  sospechosas: { id: string; titulo: string; motivos: string[] }[];
  abstencion: boolean;
  motivo_abstencion: string;
  enfoque_interes_publico: string;
  preguntas_investigacion: string[];
  verificaciones_pendientes: string[];
  rechazadas: Oracion[];
  titulo_propuesto: Oracion[];
  brief: Oracion[];
  guion: Oracion[];
  copy: Oracion[];
  metricas: {
    palabras_brief: number;
    palabras_copy: number;
    segundos_guion: number;
    afirmaciones_factuales: number;
    con_cita: number;
    rechazadas_por_verificador: number;
  };
};

export type Resumen = {
  generado_utc: string;
  corte: string;
  reglas: string;
  motor_embeddings: string;
  modelo_embeddings: string;
  llm: string;
  pesos: Componentes;
  rangos: [number, string][];
  componentes: Record<keyof Componentes, string>;
  temas: Record<string, string>;
  estados_evidencia: EstadoEvidencia[];
  estados_revision: EstadoRevision[];
  leyenda: string;
  conteos: { titulares: number; temas: number; procedencias: number; tvn: number; medios: number; indicadores: number; sismos: number };
  calidad: { archivo: string; total: number; validas: number; con_error: number; nulos_por_campo: Record<string, number>; advertencias: string[] }[];
  errores_carga: Record<string, unknown>[];
  tiempos_s: Record<string, number>;
  agenda: string[];
};

export type Paso = { herramienta: string; detalle: string };
export type RespuestaAgente = {
  tipo: "respuesta" | "abstencion" | "rechazo" | "ranking" | "sin_motor";
  motivo?: string;
  respuesta: Oracion[];
  rechazadas?: Oracion[];
  evidencia?: Record<string, Record<string, unknown>>;
  eventos?: Evento[];
  encontrado?: string[];
  falta?: string[];
  pasos: Paso[];
  meta?: Record<string, unknown>;
  segundos?: number;
  origen?: "motor" | "respaldo";
};

export type Revision = {
  id?: number;
  id_evento: string;
  estado: EstadoRevision;
  persona: string;
  rol?: string;
  nota: string;
  created_at: string;
  reglas?: string;
};

export type EventoLigero = {
  id_evento: string; rank: number; titulo: string; tema: string; tema_nombre: string;
  n_titulares: number; n_procedencias: number; componentes: Componentes; puntaje: number;
  nivel: "alto" | "medio" | "bajo"; estado_evidencia: EstadoEvidencia; ultima_fecha: string; primera_fecha: string;
  recirculacion: string | null; conflictos: number; tiene_tvn: boolean; oficial: boolean;
};
