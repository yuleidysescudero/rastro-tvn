// Re-priorización en el cliente con pesos ajustados (pág. 4: «permitir justificar cambios de pesos»).
// Los componentes vienen del motor; aquí solo se recombinan. Misma fórmula que rastro/priorizar.py.
import type { Componentes, EventoLigero } from "./tipos";

export const PESOS_BASE: Componentes = { R: 30, I: 25, U: 20, N: 15, E: 10 };

export function nivel(p: number): "alto" | "medio" | "bajo" {
  return p >= 70 ? "alto" : p >= 40 ? "medio" : "bajo";
}

export function puntaje(c: Componentes, w: Componentes): number {
  const total = w.R + w.I + w.U + w.N + w.E || 1;
  return Math.round((1000 * (w.R * c.R + w.I * c.I + w.U * c.U + w.N * c.N + w.E * c.E)) / total) / 10;
}

export function repriorizar(evs: EventoLigero[], w: Componentes): EventoLigero[] {
  return evs
    .map((e) => { const p = puntaje(e.componentes, w); return { ...e, puntaje: p, nivel: nivel(p) }; })
    // Empates: mayor urgencia y luego ID (pág. 4)
    .sort((a, b) => b.puntaje - a.puntaje || b.componentes.U - a.componentes.U || a.id_evento.localeCompare(b.id_evento));
}

const VACIAS = new Set("de la el en y a los las del por con para un una se que al su sus es lo como mas más sobre tras ante panama panamá".split(" "));
const palabras = (t: string) =>
  new Set(t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]/g, " ")
    .split(/\s+/).filter((w) => w.length > 2 && !VACIAS.has(w)));

/** Top-k sin repetir la misma historia (aproximación léxica de agenda_diversa en el motor). */
export function agendaDiversa(evs: EventoLigero[], k = 5): EventoLigero[] {
  const elegidos: EventoLigero[] = [];
  for (const e of evs) {
    const pe = palabras(e.titulo);
    const repetido = elegidos.some((x) => {
      const px = palabras(x.titulo);
      const inter = [...pe].filter((w) => px.has(w)).length;
      return inter / (new Set([...pe, ...px]).size || 1) >= 0.34;
    });
    if (!repetido) elegidos.push(e);
    if (elegidos.length === k) break;
  }
  return elegidos;
}
