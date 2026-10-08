// Lectura del snapshot congelado (solo servidor). Se ejecuta en el build: la demo no depende de una fuente en vivo.
import "server-only";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { Evento, EventoLigero, Noticia, Paquete, Resumen } from "./tipos";

const DIR = path.join(process.cwd(), "public", "data");
const memo = new Map<string, unknown>();

function leer<T>(nombre: string, defecto?: T): T {
  if (memo.has(nombre)) return memo.get(nombre) as T;
  const ruta = path.join(DIR, nombre);
  if (!existsSync(ruta)) {
    if (defecto !== undefined) return defecto;
    throw new Error(`Falta ${nombre}: ejecuta python scripts/exportar_web.py`);
  }
  const datos = JSON.parse(readFileSync(ruta, "utf-8")) as T;
  memo.set(nombre, datos);
  return datos;
}

export const resumen = () => leer<Resumen>("resumen.json");
export const eventos = () => leer<Evento[]>("eventos.json");
export const noticias = () => leer<Noticia[]>("noticias.json");
export const indicePaquetes = () => leer<string[]>("paquetes/indice.json", []);
export const paquete = (id: string) => leer<Paquete | null>(`paquetes/${id}.json`, null);
export const indicadoresWB = () => leer<Record<string, unknown>[]>("indicadores.json", []);
export const sismos = () => leer<Record<string, unknown>[]>("sismos.json", []);
export const metricas = () => leer<Record<string, unknown>>("metricas.json", {});
export const metricasReservado = () => leer<Record<string, unknown>>("metricas_reservado.json", {});
export const pruebas = () => leer<{ fecha_utc: string; entorno: string; reglas: string; pruebas: Record<string, unknown>[] }>(
  "pruebas.json", { fecha_utc: "", entorno: "", reglas: "", pruebas: [] });
export const manifest = () => leer<Record<string, unknown>>("manifest.json", {});
export const decisiones = () => leer<Record<string, unknown>[]>("decisiones.json", []);
export const etiquetado = () => leer<Record<string, Record<string, string>[]>>("etiquetado.json", {});
export const benchmark = () => leer<Record<string, unknown>[]>("benchmark_desarrollo.json", []);
export const fichas = () => leer<Record<string, unknown>[]>("fichas.json", []);

export function evento(id: string): Evento | undefined {
  return eventos().find((e) => e.id_evento === id);
}

export function noticiasDe(ev: Evento): Noticia[] {
  const set = new Set(ev.ids);
  return noticias().filter((n) => set.has(n.id));
}

export function agenda(): Evento[] {
  const r = resumen();
  const porId = new Map(eventos().map((e) => [e.id_evento, e]));
  return r.agenda.map((id) => porId.get(id)).filter(Boolean) as Evento[];
}

/** Versión liviana de los eventos para tablas y gráficos del cliente. */
export function eventosLigeros(): EventoLigero[] {
  return eventos().map((e) => ({
    id_evento: e.id_evento, rank: e.rank, titulo: e.titulo, tema: e.tema, tema_nombre: e.tema_nombre,
    n_titulares: e.n_titulares, n_procedencias: e.n_procedencias, componentes: e.componentes, puntaje: e.puntaje,
    nivel: e.nivel, estado_evidencia: e.estado_evidencia, ultima_fecha: e.ultima_fecha, primera_fecha: e.primera_fecha,
    recirculacion: e.recirculacion, conflictos: e.conflictos.length, tiene_tvn: e.tiene_tvn,
    oficial: e.indicadores.some((i) => i.ultimo) || Boolean(e.sismo?.encontrado),
  }));
}
