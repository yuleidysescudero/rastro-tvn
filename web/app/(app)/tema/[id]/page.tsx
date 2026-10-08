import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle, ArrowRight, BookOpenCheck, Building2, ChevronRight, CircleHelp, Clock, ExternalLink, FileText,
  Landmark, Repeat2, Scale, ShieldAlert, Target, Users,
} from "lucide-react";
import { evento, eventos, indicePaquetes, noticiasDe, paquete, resumen } from "@/lib/datos";
import type { Componentes, Evento } from "@/lib/tipos";
import { SerieIndicador } from "@/components/Graficos";
import { AvisoTitulares, BarraComponentes, COMP, fechaPa, InsigniaEvidencia, InsigniaPrioridad, Seccion } from "@/components/ui";
import { EstadoCaso } from "./EstadoCaso";

export function generateStaticParams() {
  return eventos().map((e) => ({ id: e.id_evento }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: evento(id)?.titulo.slice(0, 60) ?? "Tema" };
}

function queFalta(ev: Evento): string[] {
  const f: string[] = [];
  if (ev.estado_evidencia !== "suficiente para el borrador") f.push("Una fuente oficial o una segunda fuente real e independiente.");
  if (ev.conflictos.length) f.push("Aclarar cifras que no coinciden entre medios (pueden ser períodos distintos).");
  if (ev.recirculacion) f.push("Confirmar qué hay de nuevo: el tema ya circulaba antes.");
  if (ev.sin_dato_oficial) f.push("Un dato oficial que contextualice el tema (no hay uno vinculado en el paquete).");
  f.push("Leer el artículo completo en el medio: RASTRO solo usa titulares y metadatos.");
  return f;
}

const ACCION = {
  insuficiente: { texto: "Investigar antes de redactar: buscar una segunda fuente real u oficial.", clase: "border-ev-bad/30 bg-ev-bad-bg text-ev-bad" },
  parcial: { texto: "Redactar como borrador atribuido y completar lo que falta confirmar.", clase: "border-ev-mid/30 bg-ev-mid-bg text-ev-mid" },
  "suficiente para el borrador": { texto: "Pasar al borrador y a revisión editorial.", clase: "border-ev-ok/30 bg-ev-ok-bg text-ev-ok" },
};

export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ev = evento(id);
  if (!ev) notFound();
  const r = resumen();
  const notas = noticiasDe(ev).sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
  const porId = new Map(notas.map((n) => [n.id, n]));
  const tienePaquete = indicePaquetes().includes(id);
  const paq = tienePaquete ? paquete(id) : null;
  const pesos = r.pesos;
  const total = Object.values(pesos).reduce((a, b) => a + b, 0);
  const accion = ACCION[ev.estado_evidencia];
  const sismo = ev.sismo;

  return (
    <div className="space-y-6">
      <nav className="no-imprimir flex items-center gap-1.5 text-[13px] text-suave">
        <Link href="/" className="hover:text-texto">Radar</Link><ChevronRight className="h-3.5 w-3.5" />
        <span>{ev.tema_nombre}</span><ChevronRight className="h-3.5 w-3.5" /><span className="font-mono">{ev.id_evento}</span>
      </nav>

      <header className="tarjeta overflow-hidden">
        <div className="bg-gradient-to-r from-tinta to-tinta-3 px-6 py-6 text-white">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-300">
            <span className="rounded-md bg-white/10 px-2 py-0.5 font-semibold uppercase tracking-wider">{ev.tema_nombre}</span>
            <span>#{ev.rank} de {r.conteos.temas}</span>
            {ev.tiene_tvn && <span className="rounded-md bg-senal px-1.5 py-0.5 font-bold text-white">TVN</span>}
          </div>
          <h1 className="mt-2 max-w-4xl text-[25px] font-bold leading-tight">{ev.titulo}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-slate-300">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Primer registro {fechaPa(ev.primera_fecha)}</span>
            <span>Último {fechaPa(ev.ultima_fecha)} (Panamá)</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-6 py-4">
          <InsigniaPrioridad nivel={ev.nivel} puntaje={ev.puntaje} grande />
          <InsigniaEvidencia estado={ev.estado_evidencia} grande />
          <span className="text-[13.5px] text-suave"><b className="text-texto">{ev.n_titulares}</b> titulares → <b className="text-texto">{ev.n_procedencias}</b> fuente{ev.n_procedencias !== 1 && "s"} real{ev.n_procedencias !== 1 && "es"}</span>
          <div className="no-imprimir ml-auto flex flex-wrap gap-2">
            <EstadoCaso id={ev.id_evento} titulo={ev.titulo} />
            {tienePaquete && <Link href={`/tema/${id}/paquete`} className="boton-senal"><FileText className="h-4 w-4" />Paquete editorial<ArrowRight className="h-4 w-4" /></Link>}
          </div>
        </div>
      </header>

      <AvisoTitulares />

      {ev.nivel === "alto" && ev.estado_evidencia !== "suficiente para el borrador" && (
        <div className="flex items-start gap-3 rounded-2xl border border-ev-bad/30 bg-ev-bad-bg px-5 py-4 text-[14px] text-ev-bad">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div><b>Prioridad alta con evidencia {ev.estado_evidencia}.</b> Requiere investigación: la prioridad no habilita la publicación.</div>
        </div>
      )}
      {ev.recirculacion && (
        <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 text-[14px] text-violet-800">
          <Repeat2 className="mt-0.5 h-5 w-5 shrink-0" /><div><b>Noticia recirculada.</b> {ev.recirculacion}</div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Seccion titulo="Ficha de investigación" icono={<BookOpenCheck className="h-[18px] w-[18px] text-senal" />}>
            <ol className="space-y-4">
              <li className="grid grid-cols-[28px_1fr] gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-tinta text-xs font-bold text-white">1</span>
                <div><div className="font-semibold text-tinta">Qué se reporta</div>
                  <p className="text-[14px] text-slate-600">«{ev.titulo}» y {ev.n_titulares - 1} titular{ev.n_titulares - 1 !== 1 && "es"} más sobre el mismo hecho, agrupados por similitud semántica en una ventana de 72 h.</p></div>
              </li>
              <li className="grid grid-cols-[28px_1fr] gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-tinta text-xs font-bold text-white">2</span>
                <div><div className="font-semibold text-tinta">Quién lo reporta</div>
                  <p className="text-[14px] text-slate-600">{ev.medios.length} medio{ev.medios.length !== 1 && "s"} ({ev.medios.slice(0, 6).join(", ")}{ev.medios.length > 6 ? "…" : ""}), que equivalen a <b>{ev.n_procedencias} procedencia{ev.n_procedencias !== 1 && "s"} independiente{ev.n_procedencias !== 1 && "s"}</b>.</p></div>
              </li>
              <li className="grid grid-cols-[28px_1fr] gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-ev-ok text-xs font-bold text-white">3</span>
                <div><div className="font-semibold text-tinta">Qué está respaldado</div>
                  <p className="text-[14px] text-slate-600">{ev.motivo_evidencia}{ev.indicadores.filter((i) => i.ultimo).map((i) => ` Contexto oficial: ${i.etiqueta}.`).join("")}</p></div>
              </li>
              <li className="grid grid-cols-[28px_1fr] gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-ev-mid text-xs font-bold text-white">4</span>
                <div><div className="font-semibold text-tinta">Qué falta comprobar</div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[14px] text-slate-600">
                    {queFalta(ev).map((f) => <li key={f}>{f}</li>)}
                    {paq?.verificaciones_pendientes.slice(0, 3).map((v) => <li key={v}>{v}</li>)}
                  </ul></div>
              </li>
              <li className="grid grid-cols-[28px_1fr] gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-senal text-xs font-bold text-white"><Target className="h-3.5 w-3.5" /></span>
                <div><div className="font-semibold text-tinta">Acción recomendada</div>
                  <p className={`mt-1 inline-block rounded-lg border px-3 py-1.5 text-[14px] font-semibold ${accion.clase}`}>{accion.texto}</p></div>
              </li>
            </ol>
          </Seccion>

          <Seccion titulo={`Fuentes reales: ${ev.n_procedencias} de ${ev.n_titulares} titulares`} icono={<Users className="h-[18px] w-[18px] text-senal" />}>
            <p className="-mt-1 mb-3 text-[13px] text-suave">Repetición no es corroboración: réplicas casi idénticas (similitud ≥ 0,90), una misma agencia o un mismo medio cuentan como una sola procedencia (CU-03).</p>
            <div className="grid gap-3 md:grid-cols-2">
              {ev.procedencias.map((p, k) => (
                <div key={k} className="rounded-xl border border-borde bg-papel/60 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[13px] font-bold text-tinta">P{k + 1}</span>
                    <span className="text-[12px] text-suave">{p.ids.length} titular{p.ids.length !== 1 && "es"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.medios.map((m) => <span key={m} className="rounded-full border border-borde bg-white px-2 py-0.5 text-[12px]">{m}</span>)}
                    {p.agencia && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[12px] font-semibold text-blue-700">Agencia {p.agencia}</span>}
                    {p.oficial && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[12px] font-semibold text-emerald-700">Oficial</span>}
                  </div>
                  {Array.isArray(p.razones) && (p.razones as string[]).length > 0 && (
                    <div className="mt-2 text-[12px] text-suave">Agrupadas por: {(p.razones as string[]).join("; ")}</div>
                  )}
                </div>
              ))}
            </div>
          </Seccion>

          {ev.conflictos.length > 0 && (
            <Seccion titulo="Versiones que no coinciden" icono={<Scale className="h-[18px] w-[18px] text-orange-600" />}>
              <p className="-mt-1 mb-3 text-[13px] text-suave">RASTRO no escoge una versión: muestra todas, su alcance y deja la verificación pendiente (T05).</p>
              {ev.conflictos.map((c, k) => {
                const versiones = (c.versiones as { valor: string; ids: string[] }[]) || [];
                return (
                  <div key={k} className="space-y-2">
                    {versiones.map((v) => (
                      <div key={v.valor} className="grid grid-cols-[80px_1fr] items-start gap-3 rounded-xl border border-orange-200 bg-orange-50/50 p-3">
                        <span className="font-mono text-lg font-bold text-orange-700">{v.valor}{String(c.unidad || "")}</span>
                        <div className="space-y-1 text-[13px]">
                          {v.ids.map((i) => <div key={i}><span className="font-semibold">{porId.get(i)?.medio}</span>: {porId.get(i)?.titulo} <span className="font-mono text-[11px] text-suave">{i}</span></div>)}
                        </div>
                      </div>
                    ))}
                    <p className="text-[13px] font-medium text-orange-800">{String(c.nota || "")}</p>
                  </div>
                );
              })}
            </Seccion>
          )}

          <Seccion titulo="Línea de tiempo de titulares" icono={<Clock className="h-[18px] w-[18px] text-senal" />}>
            <ol className="relative space-y-3 border-l-2 border-borde pl-5">
              {notas.map((n) => {
                const pk = ev.procedencias.findIndex((p) => p.ids.includes(n.id));
                return (
                  <li key={n.id} className="relative">
                    <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-senal" />
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-suave">
                      <span className="font-semibold text-texto">{n.medio}</span>
                      <span>{fechaPa(n.fecha)} · {n.fecha_tipo}</span>
                      <span className="rounded bg-slate-100 px-1.5 font-mono text-[11px]">P{pk + 1}</span>
                      <span className="font-mono text-[11px]">{n.id}</span>
                    </div>
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="group mt-0.5 flex items-start gap-1.5 text-[14px] font-medium hover:text-senal-2">
                      {n.titulo}<ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
                    </a>
                  </li>
                );
              })}
            </ol>
          </Seccion>
        </div>

        <div className="space-y-6">
          <Seccion titulo="Puntaje de atención" icono={<Target className="h-[18px] w-[18px] text-senal" />}
            accion={<span className="font-mono text-[12px] text-suave">{r.reglas}</span>}>
            <div className="flex items-end gap-2">
              <span className="text-[44px] font-black leading-none tabular-nums text-tinta">{ev.puntaje.toFixed(1)}</span>
              <span className="pb-1.5 text-sm text-suave">/ 100 · nivel {ev.nivel}</span>
            </div>
            <div className="mt-3"><BarraComponentes c={ev.componentes} pesos={pesos} alto="h-3.5" /></div>
            <table className="mt-4 w-full text-[13px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-suave"><th className="pb-1.5">Componente</th><th>Valor</th><th>Peso</th><th className="text-right">Aporte</th></tr></thead>
              <tbody className="divide-y divide-borde">
                {(Object.keys(COMP) as (keyof Componentes)[]).map((k) => (
                  <tr key={k} title={r.componentes[k]}>
                    <td className="py-1.5"><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: COMP[k].color }} />{k} · {COMP[k].nombre}</td>
                    <td className="tabular-nums">{ev.componentes[k].toFixed(3)}</td>
                    <td className="tabular-nums">{pesos[k]}</td>
                    <td className="text-right font-semibold tabular-nums">{((pesos[k] * ev.componentes[k] * 100) / total).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <details className="mt-3 text-[12.5px] text-suave">
              <summary className="cursor-pointer font-semibold text-texto">Cómo se calcula cada componente</summary>
              <ul className="mt-2 space-y-1.5">{(Object.keys(COMP) as (keyof Componentes)[]).map((k) => <li key={k}><b>{k}:</b> {r.componentes[k]}</li>)}</ul>
              <p className="mt-2">Rangos: bajo [0,40) · medio [40,70) · alto [70,100]. Empates: mayor urgencia y luego ID. Es un orden, no una probabilidad de verdad.</p>
            </details>
          </Seccion>

          <Seccion titulo="Contexto oficial" icono={<Landmark className="h-[18px] w-[18px] text-senal" />}>
            {ev.indicadores.length === 0 && !sismo?.encontrado && (
              <p className="flex items-start gap-2 text-[13.5px] text-slate-600"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-suave" />
                No hay un indicador oficial que el titular nombre. RASTRO no fuerza una relación sin sustento.</p>
            )}
            <div className="space-y-5">
              {ev.indicadores.map((ind) => (
                <div key={ind.indicador_id}>
                  <div className="font-semibold text-tinta">{ind.nombre}</div>
                  <div className="text-[12px] text-suave">Vinculado porque {ind.motivo}.</div>
                  {ind.ultimo ? (
                    <>
                      <div className="mt-2 flex flex-wrap items-baseline gap-2">
                        <span className="text-2xl font-bold tabular-nums">{ind.ultimo.valor.toFixed(2)}</span>
                        <span className="text-sm text-suave">{ind.ultimo.unidad} · {ind.ultimo.anio}</span>
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[12px] font-semibold text-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5" />Dato anual {ind.ultimo.anio}: no es una cifra de hoy
                      </div>
                      <div className="mt-3"><SerieIndicador ind={ind} /></div>
                      <a href={ind.ultimo.fuente_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] text-senal-2 hover:underline">
                        Banco Mundial · CC BY 4.0 · <span className="font-mono">{ind.evidencia_id}</span><ExternalLink className="h-3 w-3" /></a>
                    </>
                  ) : <p className="mt-1 text-[13px] text-suave">{ind.aviso}</p>}
                </div>
              ))}
              {sismo && (
                <div className="rounded-xl border border-borde p-3 text-[13px]">
                  <div className="flex items-center gap-1.5 font-semibold"><Building2 className="h-4 w-4" />USGS · catálogo sísmico</div>
                  {sismo.encontrado
                    ? <p className="mt-1">M{String(sismo.magnitud)} · {String(sismo.lugar)} · {fechaPa(String(sismo.hora_utc))}. <a className="text-senal-2 underline" href={String(sismo.url)} target="_blank" rel="noopener noreferrer">Ver evento</a></p>
                    : <p className="mt-1 text-suave">{String(sismo.nota || "")}</p>}
                  <p className="mt-1 text-[11.5px] text-suave">La caja regional no equivale al territorio de Panamá. Solo respalda hechos sísmicos.</p>
                </div>
              )}
            </div>
          </Seccion>

          {paq && paq.sospechosas.length > 0 && (
            <Seccion titulo="Fuentes no confiables excluidas" icono={<ShieldAlert className="h-[18px] w-[18px] text-ev-bad" />}>
              {paq.sospechosas.map((s) => (
                <div key={s.id} className="rounded-xl bg-ev-bad-bg p-3 text-[13px]"><b>{s.id}</b>: {s.titulo}<div className="text-ev-bad">{s.motivos.join(", ")}</div></div>
              ))}
            </Seccion>
          )}

          {!tienePaquete && (
            <div className="tarjeta p-5 text-[13.5px] text-suave">
              El paquete editorial está pregenerado para los temas de la agenda y los primeros {indicePaquetes().length} del ranking.
              Puedes consultar este tema en el <Link href="/companero" className="font-semibold text-senal-2">Compañero de mesa</Link>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
