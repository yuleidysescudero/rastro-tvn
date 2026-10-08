"use client";
import { useState } from "react";
import clsx from "clsx";
import { ExternalLink, Quote } from "lucide-react";
import type { Oracion } from "@/lib/tipos";
import { TIPO } from "./ui";

type Evidencia = Record<string, Record<string, unknown>>;

function etiquetaFuente(id: string, ev: Evidencia) {
  const e = ev[id] || {};
  if (e.medio) return String(e.medio);
  if (e.fuente) return String(e.fuente);
  if (id.startsWith("EV-")) return "Análisis RASTRO";
  return id;
}

/** Oraciones con tipo (hecho/declaración/inferencia/hipótesis) y citas que abren el campo exacto de la evidencia. */
export function Oraciones({ lista, evidencia, grande = false }: { lista: Oracion[]; evidencia: Evidencia; grande?: boolean }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  if (!lista.length) return <p className="text-sm text-suave">Sin oraciones aceptadas por el verificador.</p>;
  return (
    <div className="space-y-2.5">
      {lista.map((o, k) => {
        const t = TIPO[o.tipo] ?? TIPO.inferencia;
        const fuentes = [...new Set(o.citas.map((c) => c.id))];
        return (
          <div key={k} className={clsx("rounded-xl border border-borde border-l-4 bg-white px-4 py-3", t.borde)}>
            <div className="flex flex-wrap items-start gap-2">
              <span className={clsx("mt-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white", t.clase)}>{t.nombre}</span>
              <p className={clsx("min-w-0 flex-1 leading-relaxed", grande ? "text-[16px]" : "text-[14.5px]")}>{o.texto}</p>
            </div>
            {fuentes.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-0.5">
                {fuentes.map((id) => {
                  const clave = `${k}-${id}`;
                  return (
                    <button key={id} onClick={() => setAbierta(abierta === clave ? null : clave)}
                      className={clsx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-medium transition",
                        abierta === clave ? "border-senal bg-teal-50 text-senal-2" : "border-borde bg-papel text-slate-600 hover:border-senal")}>
                      <Quote className="h-3 w-3" />{etiquetaFuente(id, evidencia)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-1.5 text-[11.5px] text-suave">Sin cita: {o.tipo === "hipotesis" || o.tipo === "inferencia" ? "es una inferencia/hipótesis marcada como tal." : "—"}</div>
            )}
            {fuentes.map((id) => abierta === `${k}-${id}` && (
              <div key={id} className="aparecer mt-2 rounded-lg border border-teal-200 bg-teal-50/50 p-3 text-[12.5px]">
                <div className="font-mono font-bold text-tinta">{id}</div>
                <table className="mt-1.5 w-full">
                  <tbody>
                    {o.citas.filter((c) => c.id === id).map((c) => (
                      <tr key={c.campo} className="align-top">
                        <td className="w-28 py-0.5 pr-2 font-mono text-[11.5px] text-senal-2">{c.campo}</td>
                        <td className="py-0.5">{String(evidencia[id]?.[c.campo] ?? "—")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {evidencia[id]?.alcance ? <div className="mt-1 text-[11.5px] italic text-suave">{String(evidencia[id].alcance)}</div> : null}
                {evidencia[id]?.url ? (
                  <a href={String(evidencia[id].url)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-senal-2 hover:underline">
                    Abrir fuente original<ExternalLink className="h-3 w-3" /></a>
                ) : null}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function LeyendaTipos() {
  return (
    <div className="flex flex-wrap gap-3 text-[11.5px] text-suave">
      {Object.values(TIPO).map((t) => (
        <span key={t.nombre} className="flex items-center gap-1.5"><span className={clsx("h-2.5 w-2.5 rounded-sm", t.clase)} />{t.nombre}</span>
      ))}
    </div>
  );
}
