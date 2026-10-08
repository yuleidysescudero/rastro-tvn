// Piezas visuales compartidas: insignias de evidencia/prioridad, barra de componentes, KPIs y fechas.
import clsx from "clsx";
import type { Componentes, EstadoEvidencia, EstadoRevision, TipoOracion } from "@/lib/tipos";

export const EVIDENCIA: Record<EstadoEvidencia, { corto: string; texto: string; fondo: string; borde: string; punto: string }> = {
  "suficiente para el borrador": { corto: "Suficiente", texto: "text-ev-ok", fondo: "bg-ev-ok-bg", borde: "border-ev-ok/30", punto: "bg-ev-ok" },
  parcial: { corto: "Parcial", texto: "text-ev-mid", fondo: "bg-ev-mid-bg", borde: "border-ev-mid/30", punto: "bg-ev-mid" },
  insuficiente: { corto: "Insuficiente", texto: "text-ev-bad", fondo: "bg-ev-bad-bg", borde: "border-ev-bad/30", punto: "bg-ev-bad" },
};

export const NIVEL = {
  alto: "bg-[#1f3a5f] text-white",
  medio: "bg-[#dfe7f1] text-[#1f3a5f]",
  bajo: "bg-[#eef1f5] text-[#5b6b80]",
};

export const COMP: Record<keyof Componentes, { nombre: string; color: string; bg: string }> = {
  R: { nombre: "Relevancia", color: "#2563eb", bg: "bg-c-r" },
  I: { nombre: "Impacto", color: "#7c3aed", bg: "bg-c-i" },
  U: { nombre: "Urgencia", color: "#ea580c", bg: "bg-c-u" },
  N: { nombre: "Novedad", color: "#0891b2", bg: "bg-c-n" },
  E: { nombre: "Evidencia", color: "#65a30d", bg: "bg-c-e" },
};

export const TIPO: Record<TipoOracion, { nombre: string; clase: string; borde: string }> = {
  hecho: { nombre: "Hecho", clase: "bg-emerald-600", borde: "border-l-emerald-600" },
  declaracion: { nombre: "Declaración", clase: "bg-blue-600", borde: "border-l-blue-600" },
  inferencia: { nombre: "Inferencia", clase: "bg-amber-600", borde: "border-l-amber-600" },
  hipotesis: { nombre: "Hipótesis", clase: "bg-violet-600", borde: "border-l-violet-600" },
};

export const REVISION: Record<EstadoRevision, { clase: string; punto: string }> = {
  nuevo: { clase: "bg-slate-100 text-slate-700", punto: "bg-slate-400" },
  "en revisión": { clase: "bg-blue-50 text-blue-700", punto: "bg-blue-500" },
  "requiere evidencia": { clase: "bg-amber-50 text-amber-800", punto: "bg-amber-500" },
  "aprobado como borrador": { clase: "bg-emerald-50 text-emerald-700", punto: "bg-emerald-500" },
  descartado: { clase: "bg-rose-50 text-rose-700", punto: "bg-rose-400" },
};

export function InsigniaEvidencia({ estado, grande = false }: { estado: EstadoEvidencia; grande?: boolean }) {
  const e = EVIDENCIA[estado];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full border font-semibold", e.texto, e.fondo, e.borde,
      grande ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs")}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", e.punto)} />
      Evidencia {e.corto.toLowerCase()}
    </span>
  );
}

export function InsigniaPrioridad({ nivel, puntaje, grande = false }: { nivel: "alto" | "medio" | "bajo"; puntaje: number; grande?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full font-semibold tabular-nums", NIVEL[nivel],
      grande ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs")}>
      Prioridad {nivel} · {puntaje.toFixed(0)}
    </span>
  );
}

export function InsigniaRevision({ estado }: { estado: EstadoRevision }) {
  const r = REVISION[estado];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", r.clase)}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", r.punto)} />
      {estado}
    </span>
  );
}

/** Barra apilada: cuánto aporta cada componente (peso × valor) al puntaje 0–100. */
export function BarraComponentes({ c, pesos, alto = "h-2.5" }: { c: Componentes; pesos: Componentes; alto?: string }) {
  const total = Object.values(pesos).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className={clsx("flex w-full overflow-hidden rounded-full bg-slate-100", alto)}>
      {(Object.keys(COMP) as (keyof Componentes)[]).map((k) => (
        <div key={k} title={`${COMP[k].nombre}: ${(c[k] * pesos[k] * 100 / total).toFixed(1)} pts`}
          className={COMP[k].bg} style={{ width: `${(c[k] * pesos[k] * 100) / total}%` }} />
      ))}
    </div>
  );
}

export function Kpi({ etiqueta, valor, detalle, icono, acento = false }:
  { etiqueta: string; valor: React.ReactNode; detalle?: React.ReactNode; icono?: React.ReactNode; acento?: boolean }) {
  return (
    <div className={clsx("tarjeta p-4", acento && "border-senal/40 bg-gradient-to-br from-white to-teal-50/60")}>
      <div className="flex items-center justify-between">
        <span className="etiqueta-sec">{etiqueta}</span>
        {icono && <span className="text-suave">{icono}</span>}
      </div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums text-tinta">{valor}</div>
      {detalle && <div className="mt-0.5 text-xs text-suave">{detalle}</div>}
    </div>
  );
}

export function Seccion({ titulo, icono, accion, children, className }:
  { titulo: string; icono?: React.ReactNode; accion?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("tarjeta p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-tinta">{icono}{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

const TZ = "America/Panama";
export function fechaPa(iso?: string | null, conHora = true) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(+d)) return iso;
  // dd/mm/aaaa hh:mm en hora de Panamá (formato fijo, sin depender del locale del navegador)
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year}` + (conHora ? ` ${p.hour}:${p.minute}` : "");
}

export function hace(iso?: string | null, ref?: string) {
  if (!iso) return "";
  const h = ((ref ? +new Date(ref) : Date.now()) - +new Date(iso)) / 36e5;
  if (h < 1) return "hace minutos";
  if (h < 24) return `hace ${Math.round(h)} h`;
  return `hace ${Math.round(h / 24)} d`;
}

export function AvisoTitulares({ className }: { className?: string }) {
  return (
    <div className={clsx("flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2 text-[13px] text-amber-900", className)}>
      <span aria-hidden>ⓘ</span>
      <span>Basado únicamente en titular/metadatos. RASTRO no dice qué es verdad: muestra qué se puede sostener.</span>
    </div>
  );
}
