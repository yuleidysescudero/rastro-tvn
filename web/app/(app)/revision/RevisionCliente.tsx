"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Download, FileDown, History, Star } from "lucide-react";
import type { EstadoEvidencia, EstadoRevision, Revision } from "@/lib/tipos";
import { estadoActual, listarRevisiones } from "@/lib/store";
import { useSesion } from "@/lib/sesion";
import { DialogoRevision } from "@/components/DialogoRevision";
import { EVIDENCIA, fechaPa, InsigniaRevision, REVISION } from "@/components/ui";

type Caso = { id_evento: string; titulo: string; tema_nombre: string; puntaje: number; nivel: string; estado_evidencia: EstadoEvidencia;
  n_titulares: number; n_procedencias: number; agenda: boolean };

const COLUMNAS: EstadoRevision[] = ["nuevo", "en revisión", "requiere evidencia", "aprobado como borrador", "descartado"];

function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement("a");
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
}

export function RevisionCliente({ casos }: { casos: Caso[] }) {
  const { usuario } = useSesion();
  const [revs, setRevs] = useState<Revision[]>([]);
  const [abierto, setAbierto] = useState<Caso | null>(null);
  const [soloAgenda, setSoloAgenda] = useState(true);

  useEffect(() => { listarRevisiones(usuario).then(setRevs); }, [usuario]);
  const actual = useMemo(() => estadoActual(revs), [revs]);
  const visibles = casos.filter((c) => !soloAgenda || c.agenda || actual[c.id_evento]);
  const porColumna = (e: EstadoRevision) => visibles.filter((c) => (actual[c.id_evento]?.estado ?? "nuevo") === e);
  const decididos = casos.filter((c) => actual[c.id_evento] && actual[c.id_evento].estado !== "nuevo").length;

  async function exportar(formato: "jsonl" | "md") {
    const fichas = (await fetch("/data/fichas.json").then((r) => r.json())) as Record<string, unknown>[];
    const conEstado: Record<string, unknown>[] = fichas.map((f) => {
      const r = actual[f.id_caso as string];
      return { ...f, estado_revision: r?.estado ?? "nuevo", persona_revisora: r?.persona ?? "", nota_revision: r?.nota ?? "",
        fecha_revision_utc: r?.created_at ?? "" };
    }).filter((f) => f.estado_revision !== "nuevo" || formato === "jsonl");
    if (formato === "jsonl") {
      descargar("fichas.jsonl", conEstado.map((f) => JSON.stringify(f)).join("\n") + "\n", "application/jsonl");
    } else {
      const md = conEstado.map((f) => {
        const c = f.componentes as Record<string, number>;
        const b = (f.borrador || {}) as Record<string, unknown>;
        return `## ${f.id_caso} · ${f.titulo}\n\n**Modalidad:** ${f.modalidad} · **Reglas:** ${f.reglas} · *${f.alcance}*\n\n` +
          `| Puntaje | R | I | U | N | E | Evidencia | Revisión |\n|---|---|---|---|---|---|---|---|\n` +
          `| ${f.puntaje} | ${c.R} | ${c.I} | ${c.U} | ${c.N} | ${c.E} | ${f.estado_evidencia} | ${f.estado_revision} (${f.persona_revisora}) |\n\n` +
          `**Motivo del estado de evidencia:** ${f.motivo_evidencia}\n\n**IDs de fuente:** ${(f.ids_fuente as string[]).join(", ")}\n\n` +
          `**Brief:** ${b.brief ?? "—"}\n\n**Guion:** ${b.guion ?? "—"}\n\n**Copy:** ${b.copy ?? "—"}\n\n` +
          `**Nota de la persona revisora:** ${f.nota_revision || "—"} (${fechaPa(String(f.fecha_revision_utc))})\n`;
      }).join("\n---\n\n");
      descargar("fichas_notion.md", md || "Sin fichas revisadas todavía.", "text/markdown");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="etiqueta-sec">Etapa 7 · Revisar</div>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-tinta">Mesa de revisión</h1>
          <p className="mt-1 text-[14.5px] text-suave">Una persona responsable acepta, corrige o descarta. Aprobar como borrador no es publicar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-borde bg-white px-3 py-2 text-[13px]">
            <input type="checkbox" checked={soloAgenda} onChange={(e) => setSoloAgenda(e.target.checked)} />Solo agenda y revisados
          </label>
          <button className="boton-borde" onClick={() => exportar("jsonl")}><Download className="h-4 w-4" />fichas.jsonl</button>
          <button className="boton-borde" onClick={() => exportar("md")}><FileDown className="h-4 w-4" />Fichas para Notion</button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="tarjeta p-4"><div className="etiqueta-sec">Casos con decisión</div><div className="mt-1 text-2xl font-bold">{decididos}<span className="text-base text-suave">/{casos.length}</span></div></div>
        <div className="tarjeta p-4"><div className="etiqueta-sec">Decisiones registradas</div><div className="mt-1 text-2xl font-bold">{revs.length}</div></div>
        <div className="tarjeta p-4"><div className="etiqueta-sec">Almacenamiento</div><div className="mt-1 text-[15px] font-bold">{usuario?.modo === "supabase" ? "Supabase · compartido" : "Este navegador (modo local)"}</div></div>
      </div>

      <div className="grid gap-4 overflow-x-auto pb-2 lg:grid-cols-5">
        {COLUMNAS.map((col) => (
          <div key={col} className="min-w-[240px] rounded-2xl bg-slate-100/70 p-2.5">
            <div className="flex items-center justify-between px-1.5 pb-2.5 pt-1">
              <span className="flex items-center gap-2 text-[13px] font-bold capitalize text-tinta"><span className={clsx("h-2 w-2 rounded-full", REVISION[col].punto)} />{col}</span>
              <span className="rounded-full bg-white px-2 text-[12px] font-semibold text-suave">{porColumna(col).length}</span>
            </div>
            <div className="space-y-2.5">
              {porColumna(col).map((c) => {
                const r = actual[c.id_evento];
                const n = revs.filter((x) => x.id_evento === c.id_evento).length;
                return (
                  <button key={c.id_evento} onClick={() => setAbierto(c)} className="tarjeta block w-full p-3 text-left transition hover:-translate-y-0.5 hover:border-senal hover:shadow-md">
                    <div className="flex items-center justify-between text-[11px] text-suave">
                      <span className="font-semibold uppercase tracking-wide">{c.tema_nombre}</span>
                      {c.agenda && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                    </div>
                    <div className="mt-1 line-clamp-3 text-[13.5px] font-semibold leading-snug text-tinta">{c.titulo}</div>
                    <div className="mt-2 flex items-center gap-2 text-[11.5px]">
                      <span className="rounded bg-tinta px-1.5 py-0.5 font-mono font-bold text-white">{c.puntaje.toFixed(0)}</span>
                      <span className={clsx("font-semibold", EVIDENCIA[c.estado_evidencia].texto)}>{EVIDENCIA[c.estado_evidencia].corto}</span>
                      <span className="text-suave">· {c.n_procedencias} fuente{c.n_procedencias !== 1 && "s"}</span>
                    </div>
                    {r && <div className="mt-2 border-t border-borde pt-2 text-[11.5px] text-suave"><b className="text-texto">{r.persona}</b>{r.nota ? `: ${r.nota.slice(0, 70)}` : ""} {n > 1 && `· ${n} decisiones`}</div>}
                  </button>
                );
              })}
              {porColumna(col).length === 0 && <div className="rounded-xl border-2 border-dashed border-slate-200 py-6 text-center text-[12px] text-slate-400">Vacío</div>}
            </div>
          </div>
        ))}
      </div>

      <section className="tarjeta p-5">
        <h2 className="flex items-center gap-2 font-bold text-tinta"><History className="h-[18px] w-[18px] text-senal" />Historial de decisiones</h2>
        <div className="mt-3 divide-y divide-borde">
          {[...revs].reverse().slice(0, 40).map((r, k) => {
            const c = casos.find((x) => x.id_evento === r.id_evento);
            return (
              <div key={k} className="flex flex-wrap items-center gap-3 py-2.5 text-[13px]">
                <span className="w-36 text-suave">{fechaPa(r.created_at)}</span>
                <InsigniaRevision estado={r.estado} />
                <Link href={`/tema/${r.id_evento}`} className="min-w-0 flex-1 truncate font-medium hover:text-senal-2">{c?.titulo ?? r.id_evento}</Link>
                <span className="text-suave"><b className="text-texto">{r.persona}</b>{r.nota && ` — ${r.nota}`}</span>
              </div>
            );
          })}
          {revs.length === 0 && <p className="py-6 text-center text-sm text-suave">Aún no hay decisiones. Abre un caso y registra la primera.</p>}
        </div>
      </section>

      {abierto && (
        <DialogoRevision id={abierto.id_evento} titulo={abierto.titulo} actual={actual[abierto.id_evento]?.estado ?? "nuevo"}
          onCerrar={() => setAbierto(null)} onGuardado={(r) => { setRevs([...revs, r]); setAbierto(null); }} />
      )}
    </div>
  );
}
