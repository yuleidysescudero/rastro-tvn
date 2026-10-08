import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardList, Cpu, FlaskConical, Gauge, GitBranch, ListChecks, Tags, XCircle } from "lucide-react";
import { decisiones, metricas, metricasReservado, pruebas, resumen } from "@/lib/datos";
import { Kpi, Seccion, fechaPa } from "@/components/ui";
import { BotonImprimir } from "@/components/BotonImprimir";

export const metadata = { title: "Reportes y métricas" };

type Bench = { conjunto: string; n: number; abstencion_correcta_sin_respuesta: string; resistencia_adversarial: string;
  respondidas_sustentadas: string; abstenciones_incorrectas: string; tiempo_mediano_s: number; tiempo_p95_s: number;
  costo_total_usd: number; fallos: { id: string; tipo: string; esperado: string; obtenido: string }[] };

const pct = (r: string) => { const [a, b] = r.split("/").map(Number); return b ? Math.round((100 * a) / b) : 0; };

function FilaBench({ etiqueta, valor, meta, invertida = false }: { etiqueta: string; valor: string; meta: string; invertida?: boolean }) {
  const p = pct(valor);
  const ok = invertida ? p <= 20 : p >= 80;
  return (
    <tr>
      <td className="py-2">{etiqueta}</td>
      <td className="font-mono font-bold tabular-nums">{valor}</td>
      <td className="w-40"><div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${ok ? "bg-ev-ok" : "bg-ev-mid"}`} style={{ width: `${p}%` }} /></div></td>
      <td className="tabular-nums">{p}%</td>
      <td className="text-suave">{meta}</td>
    </tr>
  );
}

function TablaBench({ b, titulo }: { b?: Bench; titulo: string }) {
  if (!b) return <p className="text-sm text-suave">{titulo}: sin ejecutar.</p>;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-tinta">{titulo} <span className="font-normal text-suave">· {b.n} consultas</span></h3>
        <span className="text-[12px] text-suave">mediana {b.tiempo_mediano_s} s · p95 {b.tiempo_p95_s} s · costo US${b.costo_total_usd}</span>
      </div>
      <table className="w-full text-[13.5px]">
        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-suave"><th className="pb-1">Métrica</th><th>Resultado</th><th></th><th></th><th>Meta del reto</th></tr></thead>
        <tbody className="divide-y divide-borde">
          <FilaBench etiqueta="Abstención correcta (sin respuesta)" valor={b.abstencion_correcta_sin_respuesta} meta="≥ 80 %" />
          <FilaBench etiqueta="Resistencia adversarial" valor={b.resistencia_adversarial} meta="rechazo o abstención" />
          <FilaBench etiqueta="Respondidas con sustento" valor={b.respondidas_sustentadas} meta="responder si hay evidencia" />
          <FilaBench etiqueta="Abstenciones incorrectas" valor={b.abstenciones_incorrectas} meta="registrar (menos es mejor)" invertida />
        </tbody>
      </table>
      {b.fallos.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[13px]">
          <div className="font-semibold text-amber-900">Fallos ({b.fallos.length}) — no se esconden tras un promedio</div>
          <ul className="mt-1 space-y-0.5">{b.fallos.map((f) => <li key={f.id}><span className="font-mono">{f.id}</span> · {f.tipo}: esperaba <b>{f.esperado}</b>, obtuvo <b>{f.obtenido}</b></li>)}</ul>
        </div>
      )}
    </div>
  );
}

function Pendiente({ texto }: { texto: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-4 text-[13.5px]">
      <span className="flex items-center gap-2 text-amber-900"><AlertTriangle className="h-4 w-4" />{texto}</span>
      <Link href="/etiquetar" className="boton-senal !py-2"><Tags className="h-4 w-4" />Ir a etiquetar</Link>
    </div>
  );
}

export default function ReportesPage() {
  const p = pruebas();
  const m = metricas() as Record<string, unknown>;
  const mr = metricasReservado() as Record<string, unknown>;
  const r = resumen();
  const pasan = p.pruebas.filter((x) => x.resultado === "pasa").length;
  const b = m.benchmark as Bench | undefined;
  const br = mr.benchmark as Bench | undefined;
  const cls = m.clasificacion_temas as Record<string, unknown> | undefined;
  const agr = m.agrupacion_eventos as Record<string, unknown> | undefined;
  const rank = m.ranking as Record<string, unknown> | undefined;
  const decs = decisiones() as { id: string; titulo: string; fecha: string; responsable: string; contexto: string; decision: string; evidencia?: string }[];
  const fallidas = decs.filter((d) => d.titulo.toLowerCase().includes("fallida"));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="etiqueta-sec">Pruebas de aceptación y métricas · pág. 9</div>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-tinta">Reportes y métricas</h1>
          <p className="mt-1 text-[14.5px] text-suave">Ejecución final: {fechaPa(p.fecha_utc)} · {p.entorno} · {p.reglas}. Numerador, denominador y fallos visibles.</p>
        </div>
        <BotonImprimir texto="Reporte para el jurado (PDF)" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiqueta="Pruebas T01–T11" valor={<span className="text-ev-ok">{pasan}/{p.pruebas.length}</span>} detalle="pasan en la ejecución final" icono={<ListChecks className="h-4 w-4" />} acento />
        <Kpi etiqueta="Abstención correcta" valor={b?.abstencion_correcta_sin_respuesta ?? "—"} detalle="desarrollo · meta ≥ 80 %" icono={<FlaskConical className="h-4 w-4" />} />
        <Kpi etiqueta="Resistencia adversarial" valor={b?.resistencia_adversarial ?? "—"} detalle="inyección y perfilamiento" icono={<CheckCircle2 className="h-4 w-4" />} />
        <Kpi etiqueta="Tiempo mediano" valor={`${b?.tiempo_mediano_s ?? "—"} s`} detalle={`p95 ${b?.tiempo_p95_s ?? "—"} s · meta ≤ 15 s`} icono={<Gauge className="h-4 w-4" />} />
      </div>

      <Seccion titulo="Matriz de pruebas de aceptación" icono={<ClipboardList className="h-[18px] w-[18px] text-senal" />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-suave"><th className="pb-2">ID</th><th>Prueba</th><th>Resultado esperado</th><th>Resultado observado</th><th>Estado</th><th className="text-right">s</th></tr></thead>
            <tbody className="divide-y divide-borde align-top">
              {p.pruebas.map((t) => (
                <tr key={String(t.id)}>
                  <td className="py-2.5 pr-3 font-mono font-bold">{String(t.id)}</td>
                  <td className="pr-3 font-medium">{String(t.prueba)}</td>
                  <td className="pr-3 text-suave">{String(t.resultado_esperado)}</td>
                  <td className="pr-3">{String(t.resultado_observado)}</td>
                  <td className="pr-3">{t.resultado === "pasa"
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-ev-ok-bg px-2 py-0.5 text-xs font-bold text-ev-ok"><CheckCircle2 className="h-3.5 w-3.5" />pasa</span>
                    : <span className="inline-flex items-center gap-1 rounded-full bg-ev-bad-bg px-2 py-0.5 text-xs font-bold text-ev-bad"><XCircle className="h-3.5 w-3.5" />falla</span>}</td>
                  <td className="text-right tabular-nums text-suave">{Number(t.segundos).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      <Seccion titulo="Benchmark de consultas (60: 40 desarrollo / 20 reservadas)" icono={<FlaskConical className="h-[18px] w-[18px] text-senal" />}>
        <div className="grid gap-6 lg:grid-cols-2">
          <TablaBench b={b} titulo="Desarrollo" />
          <TablaBench b={br} titulo="Reservado (sin ajustar)" />
        </div>
        <p className="mt-3 text-[12.5px] text-suave">Las preguntas reservadas no se publican en la app ni se mezclan con el corpus del agente (pág. 7). Los casos alterados están marcados como sintéticos.</p>
      </Seccion>

      <Seccion titulo="IA vs baseline" icono={<Cpu className="h-[18px] w-[18px] text-senal" />}>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { t: "Clasificación de temas", ia: "Embeddings multilingües vs prototipos", base: "Palabras clave", d: cls },
            { t: "Agrupación de eventos", ia: "Clustering aglomerativo (coseno) + 72 h", base: "Misma URL o ≥3 palabras", d: agr },
            { t: "Utilidad del ranking (Precision@5)", ia: "Puntaje R·I·U·N·E", base: "Orden por fecha", d: rank },
          ].map(({ t, ia, base, d }) => (
            <div key={t} className="rounded-xl border border-borde p-4">
              <div className="font-semibold text-tinta">{t}</div>
              <div className="mt-1 text-[12.5px] text-suave"><b>IA:</b> {ia}<br /><b>Baseline:</b> {base}</div>
              <div className="mt-3">
                {d && "estado" in d
                  ? <span className="text-[13px] font-semibold text-amber-800">{String(d.estado)}</span>
                  : <pre className="max-h-48 overflow-auto rounded-lg bg-papel p-2 text-[11.5px]">{JSON.stringify(d, null, 1)}</pre>}
              </div>
            </div>
          ))}
        </div>
        {cls && "estado" in cls && <div className="mt-4"><Pendiente texto="Las métricas IA vs baseline necesitan etiquetas humanas (150 titulares, 40 pares y el top 5 del editor)." /></div>}
        <p className="mt-3 text-[12.5px] text-suave">Cuándo no ayuda la IA: el modelo de embeddings es pequeño (CPU) y subestima algunas paráfrasis; se complementa con señales léxicas. Solo hay titulares: la procedencia es inferida.</p>
      </Seccion>

      <div className="grid gap-6 xl:grid-cols-2">
        <Seccion titulo="Calidad de datos (etapa 1)" icono={<ListChecks className="h-[18px] w-[18px] text-senal" />}>
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-suave"><th className="pb-1.5">Archivo</th><th>Total</th><th>Válidas</th><th>Separadas</th><th>Nulos conservados</th></tr></thead>
            <tbody className="divide-y divide-borde">
              {r.calidad.map((c) => (
                <tr key={c.archivo} className="align-top">
                  <td className="py-2 font-mono">{c.archivo}</td><td className="tabular-nums">{c.total}</td><td className="tabular-nums text-ev-ok">{c.validas}</td>
                  <td className="tabular-nums text-ev-mid">{c.con_error}</td>
                  <td className="text-[12px] text-suave">{Object.entries(c.nulos_por_campo).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}
                    {c.advertencias.map((a) => <div key={a} className="text-amber-700">{a}</div>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <details className="mt-3 text-[12.5px]">
            <summary className="cursor-pointer font-semibold">Registros separados sin bloquear la carga ({r.errores_carga.length})</summary>
            <div className="mt-2 max-h-56 overflow-auto">
              {r.errores_carga.slice(0, 60).map((e, k) => (
                <div key={k} className="border-b border-borde py-1"><span className="font-mono">{String(e.id_noticia)}</span> (fila {String(e.fila)}): {(e.motivos as string[]).join("; ")}</div>
              ))}
            </div>
          </details>
        </Seccion>

        <Seccion titulo="Pruebas fallidas y su corrección" icono={<GitBranch className="h-[18px] w-[18px] text-senal" />}
          accion={<Link href="/datos#decisiones" className="text-[12.5px] font-semibold text-senal-2">Ver las {decs.length} decisiones</Link>}>
          <div className="space-y-3">
            {fallidas.map((d) => (
              <div key={d.id} className="rounded-xl border border-borde p-3.5">
                <div className="flex items-center justify-between text-[12px] text-suave"><span className="font-mono font-bold text-tinta">{d.id}</span><span>{d.fecha} · {d.responsable}</span></div>
                <div className="mt-1 font-semibold text-tinta">{d.titulo}</div>
                <p className="mt-1 text-[13px] text-slate-600"><b>Qué falló:</b> {d.contexto}</p>
                <p className="mt-1 text-[13px] text-slate-600"><b>Corrección:</b> {d.decision}</p>
                {d.evidencia && <p className="mt-1 text-[12.5px] text-suave"><b>Evidencia:</b> {d.evidencia}</p>}
              </div>
            ))}
          </div>
        </Seccion>
      </div>

      <Seccion titulo="Rendimiento del motor" icono={<Gauge className="h-[18px] w-[18px] text-senal" />}>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(r.tiempos_s).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-papel p-3"><div className="etiqueta-sec">{k.replace(/_/g, " ")}</div><div className="mt-1 text-xl font-bold tabular-nums">{v.toFixed(2)} s</div></div>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-suave">Procesamiento por lote del snapshot completo en CPU ({r.motor_embeddings}: {r.modelo_embeddings}). La app web lee el resultado congelado; las consultas libres van al motor.</p>
      </Seccion>
    </div>
  );
}
