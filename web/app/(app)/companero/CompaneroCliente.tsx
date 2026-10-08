"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Ban, Bot, ChevronDown, CircleSlash, Cpu, Database, Hand, ListOrdered, Send, ShieldAlert, Sparkles, Wrench } from "lucide-react";
import type { RespuestaAgente } from "@/lib/tipos";
import { Oraciones } from "@/components/Oraciones";
import { InsigniaEvidencia, InsigniaPrioridad } from "@/components/ui";
import { registrarConsulta } from "@/lib/store";
import { useSesion } from "@/lib/sesion";

type Turno = { pregunta: string; r?: RespuestaAgente; error?: string };

const ICONO_HERRAMIENTA: Record<string, React.ElementType> = {
  escudo: ShieldAlert, buscar_eventos: Database, buscar_indicador: Database, verificar_afirmacion: Wrench,
  redactar: Cpu, abstenerse: Hand, respaldo: CircleSlash,
};

function Pasos({ r }: { r: RespuestaAgente }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="mt-3 rounded-xl border border-borde bg-papel/60">
      <button onClick={() => setVer(!ver)} className="flex w-full items-center justify-between px-3.5 py-2 text-[12.5px] font-semibold text-suave">
        <span className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" />Pasos del agente ({r.pasos.length}){r.segundos !== undefined && ` · ${r.segundos.toFixed(2)} s`}
          {r.origen === "respaldo" && <span className="ml-1 rounded bg-amber-100 px-1.5 text-amber-800">respuesta guardada</span>}</span>
        <ChevronDown className={clsx("h-4 w-4 transition", ver && "rotate-180")} />
      </button>
      {ver && (
        <ol className="space-y-1.5 border-t border-borde px-3.5 py-3">
          {r.pasos.map((p, k) => {
            const I = ICONO_HERRAMIENTA[p.herramienta] ?? Wrench;
            return (
              <li key={k} className="flex gap-2.5 text-[12.5px]">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-tinta text-white"><I className="h-3 w-3" /></span>
                <span><code className="font-semibold text-senal-2">{p.herramienta}</code> — {p.detalle}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function Respuesta({ r }: { r: RespuestaAgente }) {
  if (r.tipo === "rechazo") return (
    <div className="rounded-xl border border-ev-bad/30 bg-ev-bad-bg p-4">
      <div className="flex items-center gap-2 font-bold text-ev-bad"><Ban className="h-5 w-5" />Consulta rechazada por el escudo</div>
      <p className="mt-1 text-[14px] text-slate-700">{r.motivo}</p>
    </div>
  );
  if (r.tipo === "abstencion") return (
    <div className="rounded-xl border border-ev-mid/30 bg-ev-mid-bg p-4">
      <div className="flex items-center gap-2 font-bold text-ev-mid"><Hand className="h-5 w-5" />Me abstengo: no hay evidencia suficiente</div>
      <p className="mt-1 text-[14px] text-slate-700">{r.motivo}</p>
      {r.falta && r.falta.length > 0 && (<><div className="etiqueta-sec mt-3">Qué haría falta para responder</div>
        <ul className="mt-1 list-disc pl-5 text-[13.5px]">{r.falta.map((f) => <li key={f}>{f}</li>)}</ul></>)}
      {r.encontrado && r.encontrado.length > 0 && (<><div className="etiqueta-sec mt-3">Lo más cercano que encontré (no responde la pregunta)</div>
        <ul className="mt-1 list-disc pl-5 text-[13px] text-suave">{r.encontrado.map((f) => <li key={f}>{f}</li>)}</ul></>)}
      <p className="mt-3 text-[12px] font-semibold text-ev-mid">Ninguna cifra ni cita inventada.</p>
    </div>
  );
  if (r.tipo === "sin_motor") return <div className="rounded-xl border border-borde bg-slate-50 p-4 text-[14px] text-slate-700">{r.motivo}</div>;
  if (r.tipo === "ranking") return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[14px] font-semibold"><ListOrdered className="h-4 w-4 text-senal" />Estos son los cinco temas con mayor puntaje de atención (sin repetir historias):</div>
      <ol className="space-y-2">{(r.eventos || []).map((e, k) => (
        <li key={e.id_evento}><Link href={`/tema/${e.id_evento}`} className="flex items-start gap-3 rounded-xl border border-borde p-3 hover:border-senal">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-tinta text-[13px] font-bold text-white">{k + 1}</span>
          <div className="min-w-0"><div className="text-[14px] font-semibold">{e.titulo}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5"><InsigniaPrioridad nivel={e.nivel} puntaje={e.puntaje} /><InsigniaEvidencia estado={e.estado_evidencia} /></div>
            <div className="mt-1 text-[12.5px] text-suave">{e.n_titulares} titulares → {e.n_procedencias} fuentes reales · {e.motivo_evidencia}</div></div>
        </Link></li>
      ))}</ol>
    </div>
  );
  return (
    <div>
      <Oraciones lista={r.respuesta} evidencia={r.evidencia || {}} />
      {r.eventos && r.eventos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">{r.eventos.slice(0, 3).map((e) => (
          <Link key={e.id_evento} href={`/tema/${e.id_evento}`} className="rounded-lg border border-borde px-2.5 py-1 text-[12px] font-medium hover:border-senal">Abrir ficha: {e.titulo.slice(0, 50)}…</Link>
        ))}</div>
      )}
    </div>
  );
}

export function CompaneroCliente({ sugeridas }: { sugeridas: { texto: string; tipo: string }[] }) {
  const { usuario } = useSesion();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turnos]);

  async function preguntar(q: string) {
    if (!q.trim() || ocupado) return;
    setTexto(""); setOcupado(true);
    const idx = turnos.length;
    setTurnos((t) => [...t, { pregunta: q }]);
    try {
      const res = await fetch("/api/consulta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pregunta: q }) });
      const r = (await res.json()) as RespuestaAgente & { error?: string };
      setTurnos((t) => t.map((x, k) => (k === idx ? (r.error ? { ...x, error: r.error } : { ...x, r }) : x)));
      if (!r.error) registrarConsulta(usuario, q, r.tipo, r.segundos, r.origen || "");
    } catch {
      setTurnos((t) => t.map((x, k) => (k === idx ? { ...x, error: "No se pudo conectar." } : x)));
    } finally { setOcupado(false); }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="tarjeta flex min-h-[calc(100vh-170px)] flex-col">
        <div className="border-b border-borde px-5 py-4">
          <h1 className="flex items-center gap-2 text-[20px] font-bold text-tinta"><Bot className="h-6 w-6 text-senal" />Compañero de mesa</h1>
          <p className="text-[13px] text-suave">Pregunta en español. Responde solo con evidencia del corpus, cita cada oración y se abstiene cuando no hay sustento.</p>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {turnos.length === 0 && (
            <div className="grid place-items-center py-10 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-50"><Sparkles className="h-7 w-7 text-senal" /></div>
              <div className="mt-3 text-[16px] font-bold text-tinta">¿Qué necesitas sostener hoy?</div>
              <p className="mt-1 max-w-md text-[13.5px] text-suave">Prueba una de las consultas de la derecha: incluyen casos que deben responderse, abstenerse y rechazarse.</p>
            </div>
          )}
          {turnos.map((t, k) => (
            <div key={k} className="aparecer space-y-3">
              <div className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-br-md bg-tinta px-4 py-2.5 text-[14.5px] text-white">{t.pregunta}</div></div>
              <div className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-teal-50"><Bot className="h-[18px] w-[18px] text-senal-2" /></span>
                <div className="min-w-0 flex-1">
                  {!t.r && !t.error && <div className="flex items-center gap-2 text-[13.5px] text-suave"><span className="h-2 w-2 animate-pulse rounded-full bg-senal" />Buscando evidencia, verificando cada oración…</div>}
                  {t.error && <p className="text-[14px] text-rose-700">{t.error}</p>}
                  {t.r && <><Respuesta r={t.r} /><Pasos r={t.r} /></>}
                </div>
              </div>
            </div>
          ))}
          <div ref={fin} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); preguntar(texto); }} className="flex gap-2 border-t border-borde p-4">
          <input className="entrada" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={500} placeholder="Ej.: ¿Qué se sabe del agua potable en Panamá Oeste?" />
          <button className="boton-primario" disabled={ocupado || texto.trim().length < 2}><Send className="h-4 w-4" /></button>
        </form>
      </div>
      <aside className="space-y-4">
        <div className="tarjeta p-4">
          <div className="etiqueta-sec mb-2">Consultas de demostración</div>
          <div className="space-y-2">{sugeridas.map((s) => (
            <button key={s.texto} disabled={ocupado} onClick={() => preguntar(s.texto)} className="block w-full rounded-xl border border-borde p-2.5 text-left transition hover:border-senal hover:bg-teal-50/40">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-senal-2">{s.tipo}</div>
              <div className="text-[13px] font-medium leading-snug">{s.texto}</div>
            </button>
          ))}</div>
        </div>
        <div className="tarjeta p-4 text-[12.5px] leading-relaxed text-suave">
          <div className="mb-1 font-bold text-tinta">Cómo decide</div>
          1) Escudo anti-inyección y privacidad · 2) Recuperación semántica (embeddings multilingües) + anclaje léxico ·
          3) ¿La evidencia contiene el tipo de dato pedido y del período pedido? · 4) Redacción con citas · 5) Verificador determinista ·
          abstención en dos capas.
        </div>
      </aside>
    </div>
  );
}
