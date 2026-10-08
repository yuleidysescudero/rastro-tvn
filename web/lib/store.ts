"use client";
// Registro de acciones humanas: revisiones, bitácora, consultas y etiquetas.
// Supabase (compartido, solo inserción) si hay sesión; si no, este navegador (modo local).
import { supabase } from "./supabase";
import type { Usuario } from "./sesion";
import type { EstadoRevision, Revision } from "./tipos";

const REGLAS = "reglas-v1.1";

function local<T>(clave: string): T[] {
  try { return JSON.parse(localStorage.getItem(clave) || "[]") as T[]; } catch { return []; }
}
function guardarLocal<T>(clave: string, fila: T) {
  try { localStorage.setItem(clave, JSON.stringify([...local<T>(clave), fila])); } catch {}
}
const usaSupabase = (u: Usuario | null) => Boolean(u && u.modo === "supabase" && supabase());

export async function listarRevisiones(u: Usuario | null): Promise<Revision[]> {
  if (usaSupabase(u)) {
    const { data, error } = await supabase()!.from("revisiones").select("*").order("created_at", { ascending: true });
    if (!error && data) return data as Revision[];
  }
  return local<Revision>("rastro-revisiones");
}

export async function registrarRevision(u: Usuario, id_evento: string, estado: EstadoRevision, nota: string): Promise<Revision> {
  if (!u.nombre.trim()) throw new Error("La revisión requiere una persona responsable.");
  const fila: Revision = { id_evento, estado, persona: u.nombre, rol: u.rol, nota: nota.trim(), reglas: REGLAS,
    created_at: new Date().toISOString() };
  if (usaSupabase(u)) {
    const { data, error } = await supabase()!.from("revisiones")
      .insert({ id_evento, estado, persona: u.nombre, rol: u.rol, nota: fila.nota, reglas: REGLAS, usuario_id: u.id })
      .select().single();
    if (error) throw new Error(error.message);
    await bitacora(u, "revision", { id_evento, estado, nota: fila.nota });
    return data as Revision;
  }
  guardarLocal("rastro-revisiones", fila);
  await bitacora(u, "revision", { id_evento, estado, nota: fila.nota });
  return fila;
}

/** Estado vigente de cada caso: la última revisión registrada (el historial nunca se borra). */
export function estadoActual(revs: Revision[]): Record<string, Revision> {
  const out: Record<string, Revision> = {};
  for (const r of revs) out[r.id_evento] = r;
  return out;
}

export type Entrada = { accion: string; detalle: Record<string, unknown>; persona: string; rol?: string; created_at: string };

export async function bitacora(u: Usuario | null, accion: string, detalle: Record<string, unknown>) {
  const fila: Entrada = { accion, detalle, persona: u?.nombre || "anónimo", rol: u?.rol, created_at: new Date().toISOString() };
  if (usaSupabase(u)) {
    await supabase()!.from("bitacora").insert({ accion, detalle, persona: fila.persona, rol: u?.rol, usuario_id: u!.id });
    return;
  }
  guardarLocal("rastro-bitacora", fila);
}

export async function listarBitacora(u: Usuario | null): Promise<Entrada[]> {
  if (usaSupabase(u)) {
    const { data } = await supabase()!.from("bitacora").select("*").order("created_at", { ascending: false }).limit(300);
    if (data) return data as Entrada[];
  }
  return local<Entrada>("rastro-bitacora").reverse();
}

export async function registrarConsulta(u: Usuario | null, pregunta: string, tipo: string, segundos: number | undefined, origen: string) {
  if (usaSupabase(u)) {
    await supabase()!.from("consultas").insert({ pregunta, tipo, segundos, origen, persona: u!.nombre, usuario_id: u!.id });
    return;
  }
  guardarLocal("rastro-consultas", { pregunta, tipo, segundos, origen, persona: u?.nombre, created_at: new Date().toISOString() });
}

export type Etiqueta = { tipo: "tema" | "par" | "top5"; item_id: string; valor: string; persona: string; created_at: string };

export async function guardarEtiqueta(u: Usuario, tipo: Etiqueta["tipo"], item_id: string, valor: string) {
  const fila: Etiqueta = { tipo, item_id, valor, persona: u.nombre, created_at: new Date().toISOString() };
  if (usaSupabase(u)) {
    const { error } = await supabase()!.from("etiquetas").insert({ tipo, item_id, valor, persona: u.nombre, usuario_id: u.id });
    if (error) throw new Error(error.message);
    return fila;
  }
  guardarLocal("rastro-etiquetas", fila);
  return fila;
}

export async function listarEtiquetas(u: Usuario | null): Promise<Etiqueta[]> {
  if (usaSupabase(u)) {
    const { data } = await supabase()!.from("etiquetas").select("*").order("created_at", { ascending: true });
    if (data) return data as Etiqueta[];
  }
  return local<Etiqueta>("rastro-etiquetas");
}
