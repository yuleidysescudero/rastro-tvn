"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  AlertOctagon, ArrowLeft, Check, CheckCircle2, ClipboardCopy, FileText, Mic, Pause, Play, Printer, RotateCcw,
  Search, ShieldQuestion, Smartphone, Sparkles, XCircle,
} from "lucide-react";
import type { EstadoEvidencia, Paquete } from "@/lib/tipos";
import { LeyendaTipos, Oraciones } from "@/components/Oraciones";
import { AvisoTitulares, InsigniaEvidencia, InsigniaPrioridad } from "@/components/ui";
import { EstadoCaso } from "../EstadoCaso";
import { bitacora } from "@/lib/store";
import { useSesion } from "@/lib/sesion";

type Ev = { id_evento: string; titulo: string; tema_nombre: string; estado_evidencia: EstadoEvidencia; n_titulares: number;
  n_procedencias: number; nivel: "alto" | "medio" | "bajo"; puntaje: number };
type Pestana = "brief" | "guion" | "copy" | "investigacion";

function Medidor({ etiqueta, valor, ok, detalle }: { etiqueta: string; valor: string; ok: boolean; detalle: string }) {
  return (
    <div className="tarjeta flex items-center gap-3 p-3.5">
      <span className={clsx("grid h-9 w-9 place-items-center rounded-xl", ok ? "bg-ev-ok-bg text-ev-ok" : "bg-ev-mid-bg text-ev-mid")}>
        {ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertOctagon className="h-5 w-5" />}
      </span>
      <div><div className="text-[11px] font-semibold uppercase tracking-wider text-suave">{etiqueta}</div>
        <div className="text-[16px] font-bold tabular-nums text-tinta">{valor}</div>
        <div className="text-[11px] text-suave">{detalle}</div></div>
    </div>
  );
}

function Teleprompter({ texto, segundos }: { texto: string; segundos: number }) {
  const [t, setT] = useState(0);
  const [corre, setCorre] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!corre) return;
    const i = setInterval(() => setT((x) => { if (x >= segundos) { setCorre(false); return x; } return x + 0.1; }), 100);
    return () => clearInterval(i);
  }, [corre, segundos]);
  useEffect(() => {
    const c = caja.current;
    if (c) c.scrollTop = (c.scrollHeight - c.clientHeight) * (t / (segundos || 1));
  }, [t, segundos]);
  return (
    <div className="overflow-hidden rounded-2xl bg-tinta text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-slate-300"><Mic className="h-4 w-4 text-senal" />Modo teleprompter</span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[15px] tabular-nums">{t.toFixed(0).padStart(2, "0")}s / {segundos}s</span>
          <button onClick={() => setCorre(!corre)} className="rounded-lg bg-senal p-1.5 hover:bg-senal-2">{corre ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
          <button onClick={() => { setT(0); setCorre(false); }} className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20"><RotateCcw className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="h-1 bg-white/10"><div className="h-full bg-senal transition-all" style={{ width: `${(t / (segundos || 1)) * 100}%` }} /></div>
      <div ref={caja} className="h-[240px] overflow-hidden px-8 py-6 text-[24px] font-semibold leading-[1.6]">{texto}</div>
    </div>
  );
}

export function PaqueteCliente({ paq, ev }: { paq: Paquete; ev: Ev }) {
  const { usuario } = useSesion();
  const [pestana, setPestana] = useState<Pestana>("brief");
  const [copiado, setCopiado] = useState(false);
  const [nota, setNota] = useState("");
  const [obs, setObs] = useState<{ oracion: string; problema: string; arreglo: string }[] | null>(null);
  const [errorNota, setErrorNota] = useState<string | null>(null);
  const [revisando, setRevisando] = useState(false);
  const m = paq.metricas;
  const ev_ = paq.evidencia;
  const textoGuion = paq.guion.map((o) => o.texto).join(" ");
  const textoCopy = paq.copy.map((o) => o.texto).join(" ");
  const motorLLM = paq.meta.motor !== "plantilla";

  async function copiarTodo() {
    const t = [`TÍTULO: ${paq.titulo_propuesto.map((o) => o.texto).join(" ")}`, `ENFOQUE: ${paq.enfoque_interes_publico}`,
      `BRIEF: ${paq.brief.map((o) => o.texto).join(" ")}`, `GUION: ${textoGuion}`, `COPY: ${textoCopy}`,
      `PREGUNTAS: ${paq.preguntas_investigacion.join(" / ")}`, `(basado únicamente en titular/metadatos · ${ev.id_evento})`].join("\n\n");
    await navigator.clipboard.writeText(t);
    setCopiado(true); setTimeout(() => setCopiado(false), 1800);
    bitacora(usuario, "copiar_paquete", { id_evento: ev.id_evento });
  }

  async function defender() {
    setRevisando(true); setErrorNota(null); setObs(null);
    const r = await fetch("/api/defender", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_evento: ev.id_evento, texto: nota }) });
    const d = await r.json();
    setRevisando(false);
    if (!r.ok) { setErrorNota(d.error || "No se pudo revisar."); return; }
    setObs(d.observaciones);
    bitacora(usuario, "defiende_tu_nota", { id_evento: ev.id_evento, observaciones: d.observaciones.length });
  }

  const PESTANAS: { id: Pestana; nombre: string; icono: React.ElementType }[] = [
    { id: "brief", nombre: "Brief", icono: FileText }, { id: "guion", nombre: "Guion 45–60 s", icono: Mic },
    { id: "copy", nombre: "Copy digital", icono: Smartphone }, { id: "investigacion", nombre: "Investigación", icono: Search },
  ];

  return (
    <div className="space-y-6">
      <div className="no-imprimir flex flex-wrap items-center justify-between gap-3">
        <Link href={`/tema/${ev.id_evento}`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-suave hover:text-texto"><ArrowLeft className="h-4 w-4" />Volver a la ficha</Link>
        <div className="flex flex-wrap gap-2">
          <EstadoCaso id={ev.id_evento} titulo={ev.titulo} />
          <button className="boton-borde" onClick={copiarTodo}>{copiado ? <Check className="h-4 w-4 text-ev-ok" /> : <ClipboardCopy className="h-4 w-4" />}{copiado ? "Copiado" : "Copiar paquete"}</button>
          <button className="boton-borde" onClick={() => window.print()}><Printer className="h-4 w-4" />PDF</button>
        </div>
      </div>

      <header>
        <div className="etiqueta-sec flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-senal" />Paquete editorial TVN · {ev.tema_nombre}</div>
        <h1 className="mt-1 text-[24px] font-bold leading-tight text-tinta">{ev.titulo}</h1>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <InsigniaPrioridad nivel={ev.nivel} puntaje={ev.puntaje} />
          <InsigniaEvidencia estado={ev.estado_evidencia} />
          <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-semibold", motorLLM ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-700")}>
            Redacción: {motorLLM ? `LLM ${String(paq.meta.modelo || "")}` : "plantilla extractiva (sin LLM)"} + verificador determinista
          </span>
        </div>
      </header>
      <AvisoTitulares />

      {paq.abstencion && (
        <div className="flex items-start gap-3 rounded-2xl border border-ev-bad/30 bg-ev-bad-bg px-5 py-4 text-[14px] text-ev-bad">
          <ShieldQuestion className="h-5 w-5 shrink-0" /><div><b>El sistema se abstuvo.</b> {paq.motivo_abstencion}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Medidor etiqueta="Brief" valor={`${m.palabras_brief} palabras`} ok={m.palabras_brief <= 250} detalle="máximo 250" />
        <Medidor etiqueta="Guion" valor={`${m.segundos_guion} s`} ok={m.segundos_guion >= 45 && m.segundos_guion <= 60} detalle="entre 45 y 60 s" />
        <Medidor etiqueta="Copy" valor={`${m.palabras_copy} palabras`} ok={m.palabras_copy <= 80} detalle="máximo 80" />
        <Medidor etiqueta="Citas" valor={`${m.con_cita}/${m.afirmaciones_factuales}`} ok={m.con_cita === m.afirmaciones_factuales} detalle="afirmaciones factuales con cita" />
        <Medidor etiqueta="Verificador" valor={`${m.rechazadas_por_verificador} eliminadas`} ok detalle="oraciones sin sustento" />
      </div>

      <div className="tarjeta overflow-hidden">
        <div className="no-imprimir flex overflow-x-auto border-b border-borde bg-papel/60 px-2">
          {PESTANAS.map(({ id, nombre, icono: Icono }) => (
            <button key={id} onClick={() => setPestana(id)}
              className={clsx("flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-[14px] font-semibold transition",
                pestana === id ? "border-senal text-tinta" : "border-transparent text-suave hover:text-texto")}>
              <Icono className="h-4 w-4" />{nombre}
            </button>
          ))}
          <div className="ml-auto hidden items-center pr-3 md:flex"><LeyendaTipos /></div>
        </div>
        <div className="p-5">
          {pestana === "brief" && (
            <div className="space-y-5">
              <div><div className="etiqueta-sec mb-2">Título propuesto</div><Oraciones lista={paq.titulo_propuesto} evidencia={ev_} grande /></div>
              <div><div className="etiqueta-sec mb-1">Enfoque de interés público</div><p className="text-[14.5px] text-slate-700">{paq.enfoque_interes_publico}</p></div>
              <div><div className="etiqueta-sec mb-2">Brief</div><Oraciones lista={paq.brief} evidencia={ev_} /></div>
            </div>
          )}
          {pestana === "guion" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Teleprompter texto={textoGuion} segundos={m.segundos_guion} />
              <div><div className="etiqueta-sec mb-2">Guion con citas</div><Oraciones lista={paq.guion} evidencia={ev_} /></div>
            </div>
          )}
          {pestana === "copy" && (
            <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
              <div className="mx-auto w-[320px] rounded-[2.2rem] border-[10px] border-tinta bg-white p-4 shadow-xl">
                <div className="mx-auto mb-3 h-1.5 w-20 rounded-full bg-slate-200" />
                <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-tinta text-[11px] font-bold text-white">MESA</span>
                  <div className="leading-tight"><div className="text-[13px] font-bold">Borrador · mesa digital</div><div className="text-[11px] text-suave">Vista previa · no publicado</div></div></div>
                <p className="mt-3 text-[14px] leading-relaxed">{textoCopy}</p>
                <div className="mt-3 rounded-xl bg-slate-100 p-3 text-[12px] text-suave">Basado únicamente en titular/metadatos</div>
                <div className="mt-3 text-right text-[11px] text-suave">{textoCopy.split(/\s+/).filter(Boolean).length}/80 palabras</div>
              </div>
              <div><div className="etiqueta-sec mb-2">Copy con citas</div><Oraciones lista={paq.copy} evidencia={ev_} />
                <p className="mt-3 text-[12.5px] text-suave">No se inventan entrevistas, citas textuales, imágenes disponibles ni afirmaciones sin respaldo.</p></div>
            </div>
          )}
          {pestana === "investigacion" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <div className="etiqueta-sec mb-2">3 preguntas de investigación</div>
                <ol className="space-y-2">{paq.preguntas_investigacion.map((p, k) => (
                  <li key={k} className="flex gap-3 rounded-xl border border-borde p-3 text-[14px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-tinta text-xs font-bold text-white">{k + 1}</span>{p}</li>
                ))}</ol>
                <div className="etiqueta-sec mb-2 mt-5">Fuentes y verificaciones pendientes</div>
                <ul className="space-y-1.5">{paq.verificaciones_pendientes.map((v) => (
                  <li key={v} className="flex gap-2 text-[14px]"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ev-mid" />{v}</li>
                ))}</ul>
              </div>
              <div>
                <div className="etiqueta-sec mb-2">Eliminadas por el verificador ({paq.rechazadas.length})</div>
                {paq.rechazadas.length === 0 ? <p className="text-[13.5px] text-suave">Ninguna: todas las oraciones factuales tienen cita válida.</p> : (
                  <div className="space-y-2">{paq.rechazadas.map((o, k) => (
                    <div key={k} className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-[13px]">
                      <div className="flex items-center gap-1.5 font-semibold text-rose-700"><XCircle className="h-4 w-4" />{String(o.motivo || "sin sustento")} · {o.seccion}</div>
                      <div className="mt-1 text-slate-600 line-through decoration-rose-300">{o.texto}</div>
                    </div>
                  ))}</div>
                )}
                <p className="mt-3 text-[12.5px] text-suave">El verificador no es un LLM: elimina toda oración sin cita, con un ID inexistente, con cifras que no aparecen en la evidencia o con un dato anual sin su año.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="tarjeta no-imprimir p-5">
        <h2 className="flex items-center gap-2 font-bold text-tinta"><ShieldQuestion className="h-[18px] w-[18px] text-senal" />Defiende tu nota</h2>
        <p className="text-[13px] text-suave">Pega tu párrafo. RASTRO lo revisa como lo haría la mesa: certeza sin respaldo, cifras sueltas, repetición tomada como corroboración, datos anuales usados como de hoy y acusaciones sin atribución.</p>
        <textarea className="entrada mt-3 min-h-[110px]" value={nota} onChange={(e) => setNota(e.target.value)}
          placeholder="Ej.: Varios medios confirman que la economía creció 9% hoy. Es un hecho." />
        <div className="mt-2 flex justify-end"><button className="boton-primario" disabled={nota.trim().length < 10 || revisando} onClick={defender}>{revisando ? "Revisando…" : "Revisar mi nota"}</button></div>
        {errorNota && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{errorNota}</p>}
        {obs && (obs.length === 0
          ? <p className="mt-3 flex items-center gap-2 rounded-xl bg-ev-ok-bg px-4 py-3 text-[14px] font-semibold text-ev-ok"><CheckCircle2 className="h-5 w-5" />Sin observaciones: el texto respeta la evidencia disponible.</p>
          : <div className="mt-3 space-y-2">{obs.map((o, k) => (
            <div key={k} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-[13.5px]">
              <div className="font-semibold text-tinta">«{o.oracion}»</div>
              <div className="mt-1 text-amber-900">{o.problema}</div>
              <div className="mt-1 text-ev-ok"><b>Arreglo:</b> {o.arreglo}</div>
            </div>
          ))}</div>)}
      </section>
    </div>
  );
}
