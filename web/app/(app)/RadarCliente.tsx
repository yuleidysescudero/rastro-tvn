"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, Filter, Layers, Newspaper, Printer, RefreshCcw,
  Search, SlidersHorizontal, Sparkles, Users,
} from "lucide-react";
import type { Componentes, EventoLigero } from "@/lib/tipos";
import { agendaDiversa, PESOS_BASE, repriorizar } from "@/lib/priorizar";
import { BarraComponentes, COMP, EVIDENCIA, fechaPa, hace, InsigniaEvidencia, InsigniaPrioridad, Kpi } from "@/components/ui";
import { bitacora } from "@/lib/store";
import { useSesion } from "@/lib/sesion";

type Props = {
  eventos: EventoLigero[];
  agendaMotor: string[];
  historias: Record<string, { historia: string; medios: string[]; relacionados: number }>;
  resumen: { corte: string; reglas: string; componentes: Record<string, string>; temas: Record<string, string>;
    conteos: { titulares: number; temas: number; procedencias: number; tvn: number; medios: number };
    brutos: number; separados: number };
};

const RAZON: Record<keyof Componentes, string> = {
  R: "está muy ligado a Panamá", I: "tiene alcance público", U: "es reciente", N: "es un tema nuevo", E: "tiene evidencia disponible",
};

function porQue(e: EventoLigero, w: Componentes) {
  const k = (Object.keys(e.componentes) as (keyof Componentes)[]).reduce((a, b) =>
    e.componentes[a] * w[a] >= e.componentes[b] * w[b] ? a : b);
  return `Sube porque ${RAZON[k]}.`;
}

export function RadarCliente({ eventos, agendaMotor, historias, resumen }: Props) {
  const { usuario } = useSesion();
  const [w, setW] = useState<Componentes>(PESOS_BASE);
  const [verPesos, setVerPesos] = useState(false);
  const [justificacion, setJustificacion] = useState("");
  const [guardado, setGuardado] = useState(false);
  const [q, setQ] = useState("");
  const [tema, setTema] = useState("todos");
  const [evid, setEvid] = useState("todas");
  const [pagina, setPagina] = useState(0);

  const modificado = (Object.keys(w) as (keyof Componentes)[]).some((k) => w[k] !== PESOS_BASE[k]);
  const ordenados = useMemo(() => (modificado ? repriorizar(eventos, w) : eventos), [eventos, w, modificado]);
  const top = useMemo(() => {
    if (!modificado) {
      const porId = new Map(eventos.map((e) => [e.id_evento, e]));
      return agendaMotor.map((id) => porId.get(id)!).filter(Boolean);
    }
    return agendaDiversa(ordenados.filter((e) => e.tema !== "otro"), 5);
  }, [modificado, ordenados, eventos, agendaMotor]);

  const insuf = eventos.filter((e) => e.estado_evidencia === "insuficiente").length;
  const conOficial = eventos.filter((e) => e.oficial).length;
  const altos = ordenados.filter((e) => e.nivel === "alto").length;

  const porTema = useMemo(() => {
    const m: Record<string, Record<string, number | string>> = {};
    for (const e of eventos) {
      const t = e.tema_nombre;
      m[t] ??= { tema: t, Suficiente: 0, Parcial: 0, Insuficiente: 0 };
      const k = EVIDENCIA[e.estado_evidencia].corto;
      m[t][k] = (m[t][k] as number) + 1;
    }
    return Object.values(m).sort((a, b) =>
      (b.Suficiente as number) + (b.Parcial as number) + (b.Insuficiente as number)
      - ((a.Suficiente as number) + (a.Parcial as number) + (a.Insuficiente as number)));
  }, [eventos]);

  const filtrados = ordenados.filter((e) =>
    (tema === "todos" || e.tema === tema) && (evid === "todas" || e.estado_evidencia === evid)
    && (!q || e.titulo.toLowerCase().includes(q.toLowerCase())));
  const POR_PAG = 12;
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAG));
  const visibles = filtrados.slice(pagina * POR_PAG, (pagina + 1) * POR_PAG);

  async function registrarPesos() {
    await bitacora(usuario, "cambio_de_pesos", { pesos: w, justificacion, reglas: resumen.reglas });
    setGuardado(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="etiqueta-sec flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-senal" />CU-01 · Agenda de Panamá</div>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-tinta">¿Qué cinco temas merecen revisión hoy?</h1>
          <p className="mt-1 text-[14.5px] text-suave">Corte {fechaPa(resumen.corte)} (hora de Panamá) · Ordenado por puntaje de atención; la evidencia se mide aparte.</p>
        </div>
        <div className="no-imprimir flex gap-2">
          <button onClick={() => setVerPesos(!verPesos)} className={clsx("boton-borde", verPesos && "border-senal text-senal-2")}>
            <SlidersHorizontal className="h-4 w-4" />Ajustar pesos
          </button>
          <button onClick={() => window.print()} className="boton-borde"><Printer className="h-4 w-4" />Exportar PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi etiqueta="Titulares válidos" valor={resumen.conteos.titulares} icono={<Newspaper className="h-4 w-4" />}
          detalle={`${resumen.brutos} cargados · ${resumen.separados} separados sin bloquear`} />
        <Kpi etiqueta="Temas agrupados" valor={resumen.conteos.temas} icono={<Layers className="h-4 w-4" />}
          detalle={`${resumen.conteos.medios} medios · ${resumen.conteos.tvn} titulares TVN`} />
        <Kpi etiqueta="Fuentes reales" valor={resumen.conteos.procedencias} icono={<Users className="h-4 w-4" />} acento
          detalle="Las réplicas y agencias cuentan una vez" />
        <Kpi etiqueta="Evidencia insuficiente" valor={<span className="text-ev-bad">{insuf}<span className="text-base text-suave">/{eventos.length}</span></span>}
          icono={<AlertTriangle className="h-4 w-4" />} detalle={`${conOficial} con dato oficial · ${altos} de prioridad alta`} />
      </div>

      {verPesos && (
        <div className="tarjeta no-imprimir aparecer p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-tinta">Pesos del puntaje · P = {w.R}R + {w.I}I + {w.U}U + {w.N}N + {w.E}E</h2>
              <p className="text-[13px] text-suave">Cambiar pesos reordena la agenda. Todo cambio debe justificarse y queda en la bitácora.</p>
            </div>
            <button className="boton-borde" onClick={() => { setW(PESOS_BASE); setGuardado(false); }}><RefreshCcw className="h-4 w-4" />Restaurar {resumen.reglas}</button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-5">
            {(Object.keys(COMP) as (keyof Componentes)[]).map((k) => (
              <label key={k} className="block">
                <div className="flex items-center justify-between text-[13px] font-semibold">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COMP[k].color }} />{k} · {COMP[k].nombre}</span>
                  <span className="tabular-nums">{w[k]}</span>
                </div>
                <input type="range" min={0} max={50} value={w[k]} onChange={(e) => { setW({ ...w, [k]: +e.target.value }); setGuardado(false); }}
                  className="mt-2 w-full" style={{ accentColor: COMP[k].color }} />
                <p className="mt-1 text-[11.5px] leading-snug text-suave">{resumen.componentes[k]}</p>
              </label>
            ))}
          </div>
          {modificado && (
            <div className="mt-4 flex flex-wrap gap-2">
              <input className="entrada flex-1" placeholder="Justificación del cambio (obligatoria para registrarlo)" value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)} />
              <button className="boton-senal" disabled={justificacion.trim().length < 8 || guardado} onClick={registrarPesos}>
                {guardado ? "Registrado en bitácora ✓" : "Registrar cambio"}
              </button>
            </div>
          )}
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-tinta">Agenda priorizada {modificado && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">pesos modificados</span>}</h2>
          <div className="hidden items-center gap-3 text-[11.5px] text-suave md:flex">
            {(Object.keys(COMP) as (keyof Componentes)[]).map((k) => (
              <span key={k} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COMP[k].color }} />{COMP[k].nombre}</span>
            ))}
          </div>
        </div>
        <div className="grid gap-3">
          {top.map((e, i) => {
            const h = historias[e.id_evento];
            return (
              <article key={e.id_evento} className="tarjeta aparecer group grid gap-4 p-5 transition hover:border-senal/60 hover:shadow-md md:grid-cols-[56px_1fr_220px]"
                style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-start gap-3 md:block">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-tinta text-xl font-black text-white">{i + 1}</div>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="etiqueta-sec">{e.tema_nombre}</span>
                    <span className="text-[12px] text-suave">· {hace(e.ultima_fecha, resumen.corte)}</span>
                    {e.tiene_tvn && <span className="rounded-md bg-tinta px-1.5 py-0.5 text-[10.5px] font-bold text-white">TVN</span>}
                  </div>
                  <Link href={`/tema/${e.id_evento}`} className="mt-1 block text-[18px] font-bold leading-snug text-tinta hover:text-senal-2">{e.titulo}</Link>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <InsigniaPrioridad nivel={e.nivel} puntaje={e.puntaje} />
                    <InsigniaEvidencia estado={e.estado_evidencia} />
                    {e.conflictos > 0 && <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">Cifras que no coinciden</span>}
                    {e.recirculacion && <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">Tema que ya circulaba</span>}
                  </div>
                  <p className="mt-2.5 text-[14px] text-slate-600">
                    {porQue(e, w)}{" "}
                    {e.n_titulares > e.n_procedencias
                      ? <>Ojo: <b>{e.n_titulares} titulares</b>, pero solo <b>{e.n_procedencias} fuente{e.n_procedencias !== 1 && "s"} real{e.n_procedencias !== 1 && "es"}</b>.</>
                      : <><b>{e.n_procedencias} fuente{e.n_procedencias !== 1 && "s"} real{e.n_procedencias !== 1 && "es"}</b>.</>}
                    {h?.medios?.length ? <span className="text-suave"> · {h.medios.join(", ")}</span> : null}
                  </p>
                </div>
                <div className="flex flex-col justify-between gap-3">
                  <div>
                    <div className="mb-1.5 flex justify-between text-[11.5px] text-suave"><span>Componentes</span><span className="font-mono">{e.puntaje.toFixed(1)}/100</span></div>
                    <BarraComponentes c={e.componentes} pesos={w} alto="h-3" />
                    <div className="mt-1.5 grid grid-cols-5 text-center text-[10.5px] tabular-nums text-suave">
                      {(Object.keys(COMP) as (keyof Componentes)[]).map((k) => <span key={k}>{k} {e.componentes[k].toFixed(2)}</span>)}
                    </div>
                  </div>
                  <div className="no-imprimir flex gap-2">
                    <Link href={`/tema/${e.id_evento}`} className="boton-primario flex-1 !py-2">Abrir ficha<ArrowRight className="h-4 w-4" /></Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.35fr]">
        <section className="tarjeta p-5">
          <h2 className="font-bold text-tinta">Temas por eje y estado de evidencia</h2>
          <p className="text-[13px] text-suave">Prioridad y evidencia son ejes distintos: muchos temas visibles no tienen respaldo suficiente.</p>
          <div className="mt-3 h-[330px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porTema} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid horizontal={false} stroke="#eef1f5" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="tema" width={118} tick={{ fontSize: 11.5 }} />
                <Tooltip cursor={{ fill: "#f5f7fb" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Suficiente" stackId="a" fill="#15803d" radius={[4, 0, 0, 4]} />
                <Bar dataKey="Parcial" stackId="a" fill="#d97706" />
                <Bar dataKey="Insuficiente" stackId="a" fill="#dc2626" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="tarjeta p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-tinta">Todos los temas <span className="font-normal text-suave">({filtrados.length})</span></h2>
            <div className="no-imprimir flex flex-wrap gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" />
                <input className="entrada !w-48 !py-2 pl-9" placeholder="Buscar titular…" value={q} onChange={(e) => { setQ(e.target.value); setPagina(0); }} />
              </div>
              <select className="entrada !w-auto !py-2" value={tema} onChange={(e) => { setTema(e.target.value); setPagina(0); }}>
                <option value="todos">Todos los ejes</option>
                {Object.entries(resumen.temas).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select className="entrada !w-auto !py-2" value={evid} onChange={(e) => { setEvid(e.target.value); setPagina(0); }}>
                <option value="todas">Toda evidencia</option>
                {Object.keys(EVIDENCIA).map((k) => <option key={k} value={k}>{EVIDENCIA[k as keyof typeof EVIDENCIA].corto}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 divide-y divide-borde">
            {visibles.map((e) => (
              <Link key={e.id_evento} href={`/tema/${e.id_evento}`} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 py-2.5 hover:bg-papel/70">
                <span className="text-right font-mono text-[15px] font-bold tabular-nums text-tinta">{e.puntaje.toFixed(0)}</span>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium">{e.titulo}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-suave">
                    <span>{e.tema_nombre}</span>·<span>{e.n_titulares} tit. → {e.n_procedencias} fuente{e.n_procedencias !== 1 && "s"}</span>
                  </div>
                </div>
                <span className={clsx("h-2.5 w-2.5 rounded-full", EVIDENCIA[e.estado_evidencia].punto)} title={`Evidencia ${EVIDENCIA[e.estado_evidencia].corto}`} />
              </Link>
            ))}
            {visibles.length === 0 && <p className="py-8 text-center text-sm text-suave"><Filter className="mx-auto mb-2 h-5 w-5" />Ningún tema coincide con el filtro.</p>}
          </div>
          <div className="no-imprimir mt-3 flex items-center justify-between text-[13px] text-suave">
            <span>Página {pagina + 1} de {paginas}</span>
            <div className="flex gap-1">
              <button className="rounded-lg border border-borde p-1.5 disabled:opacity-40" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}><ChevronLeft className="h-4 w-4" /></button>
              <button className="rounded-lg border border-borde p-1.5 disabled:opacity-40" disabled={pagina >= paginas - 1} onClick={() => setPagina(pagina + 1)}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
