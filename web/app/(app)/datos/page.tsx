import { Database, ExternalLink, FileCheck2, GitBranch, Scale, ShieldCheck } from "lucide-react";
import { decisiones, manifest, resumen } from "@/lib/datos";
import { Kpi, Seccion, fechaPa } from "@/components/ui";

export const metadata = { title: "Catálogo de datos" };

type Consulta = { fuente: string; url: string; registros: number; nombre?: string; indicador?: string; query?: string };

const NOMBRE: Record<string, string> = { tvn_rss: "TVN · RSS público", worldbank: "Banco Mundial · Indicators API v2",
  usgs: "USGS · catálogo sísmico", respaldo: "Google News RSS (respaldo de GDELT)", gdelt: "GDELT DOC 2.0" };

const DICCIONARIO = [
  { archivo: "noticias.csv", campos: "id_noticia, titulo, url, medio, idioma, fecha_publicacion, fecha_deteccion, fecha_extraccion, tema, origen, alcance_texto" },
  { archivo: "indicadores.csv", campos: "pais_iso3, indicador_id, anio, valor (nullable), unidad, fuente_url, fecha_extraccion, licencia" },
  { archivo: "eventos.geojson", campos: "id, magnitude, time, updated, longitude, latitude, depth, place, status, url" },
  { archivo: "fichas.jsonl", campos: "id_caso, modalidad, ids_fuente, afirmaciones, citas, puntaje, componentes, estado_evidencia, borrador, estado_revision" },
  { archivo: "manifest.json", campos: "versión, fecha_corte_UTC, consultas, cantidad por archivo, licencia/condiciones, SHA-256, transformaciones" },
];

export default function DatosPage() {
  const m = manifest() as Record<string, unknown>;
  const r = resumen();
  const consultas = m.consultas as Record<string, Consulta[]>;
  const archivos = m.archivos as Record<string, { sha256: string; bytes: number }>;
  const licencias = m.licencias as Record<string, string>;
  const not = m.noticias as { brutos: number; unicos: number; duplicados_url: number };
  const decs = decisiones() as { id: string; titulo: string; fecha: string; responsable: string; contexto: string; decision: string; evidencia?: string }[];

  return (
    <div className="space-y-6">
      <div>
        <div className="etiqueta-sec">Paquete «{String(m.paquete)}» {String(m.version)}</div>
        <h1 className="mt-1 text-[28px] font-bold tracking-tight text-tinta">Catálogo de datos</h1>
        <p className="mt-1 text-[14.5px] text-suave">Snapshot congelado el {fechaPa(String(m.fecha_corte_UTC))} (Panamá). Datos públicos y reproducibles; no se redistribuyen artículos.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiqueta="Noticias únicas" valor={not.unicos} detalle={`${not.brutos} brutas · ${not.duplicados_url} duplicadas por URL`} />
        <Kpi etiqueta="TVN" valor={r.conteos.tvn} detalle="titulares del RSS del patrocinador" />
        <Kpi etiqueta="Banco Mundial" valor={r.conteos.indicadores} detalle="6 países × 6 indicadores × 15 años" />
        <Kpi etiqueta="Sismos USGS 2024" valor={r.conteos.sismos} detalle="caja lat 5–12, lon −86 a −76, M ≥ 3" />
      </div>

      <Seccion titulo="Fuentes y consultas" icono={<Database className="h-[18px] w-[18px] text-senal" />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-suave"><th className="pb-2">Fuente</th><th>Consulta</th><th className="text-right">Registros</th><th>Licencia / condiciones</th></tr></thead>
            <tbody className="divide-y divide-borde align-top">
              {Object.entries(consultas).flatMap(([fuente, lista]) => lista.map((c, k) => (
                <tr key={`${fuente}-${k}`}>
                  <td className="py-2 pr-3 font-semibold">{k === 0 ? NOMBRE[fuente] ?? fuente : ""}</td>
                  <td className="pr-3"><a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-senal-2 hover:underline">
                    {c.indicador || c.nombre || c.query || c.url.slice(0, 60)}<ExternalLink className="h-3 w-3 shrink-0" /></a></td>
                  <td className="pr-3 text-right tabular-nums">{c.registros}</td>
                  <td className="text-[12px] text-suave">{k === 0 ? licencias[fuente] ?? licencias[fuente === "respaldo" ? "gdelt" : fuente] ?? "Solo metadatos públicos (titular, medio, fecha, enlace)." : ""}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </Seccion>

      <div className="grid gap-6 xl:grid-cols-2">
        <Seccion titulo="Integridad del snapshot (SHA-256)" icono={<FileCheck2 className="h-[18px] w-[18px] text-senal" />}>
          <div className="space-y-2">{Object.entries(archivos).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-papel p-3"><div className="flex justify-between text-[13px] font-semibold"><span className="font-mono">{k}</span><span className="text-suave">{(v.bytes / 1024).toFixed(0)} KB</span></div>
              <div className="mt-1 break-all font-mono text-[11px] text-suave">{v.sha256}</div></div>
          ))}</div>
        </Seccion>
        <Seccion titulo="Transformaciones y desviaciones documentadas" icono={<Scale className="h-[18px] w-[18px] text-senal" />}>
          <ul className="list-disc space-y-1 pl-5 text-[13px]">{(m.transformaciones as string[]).map((t) => <li key={t}>{t}</li>)}</ul>
          <div className="etiqueta-sec mb-1 mt-4">Desviaciones respecto del documento del reto</div>
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-amber-900">{(m.desviaciones_documentadas as string[]).map((t) => <li key={t}>{t}</li>)}</ul>
        </Seccion>
      </div>

      <Seccion titulo="Diccionario de datos (contrato, pág. 7)" icono={<ShieldCheck className="h-[18px] w-[18px] text-senal" />}>
        <table className="w-full text-[13px]"><tbody className="divide-y divide-borde">
          {DICCIONARIO.map((d) => <tr key={d.archivo}><td className="w-40 py-2 font-mono font-semibold">{d.archivo}</td><td className="text-slate-600">{d.campos}</td></tr>)}
        </tbody></table>
        <p className="mt-3 text-[12.5px] text-suave">UTF-8, IDs estables, fechas ISO 8601 en UTC (la interfaz muestra hora de Panamá). Los nulos y las unidades originales se conservan; nunca se rellena con cero.</p>
      </Seccion>

      <section id="decisiones">
        <Seccion titulo={`Decisiones técnicas y de producto (${decs.length})`} icono={<GitBranch className="h-[18px] w-[18px] text-senal" />}>
          <div className="grid gap-3 lg:grid-cols-2">{decs.map((d) => (
            <div key={d.id} className="rounded-xl border border-borde p-3.5">
              <div className="flex items-center justify-between text-[12px] text-suave"><span className="font-mono font-bold text-tinta">{d.id}</span><span>{d.fecha} · {d.responsable}</span></div>
              <div className="mt-1 font-semibold text-tinta">{d.titulo}</div>
              <p className="mt-1 text-[12.5px] text-slate-600"><b>Contexto:</b> {d.contexto}</p>
              <p className="mt-1 text-[12.5px] text-slate-600"><b>Decisión:</b> {d.decision}</p>
            </div>
          ))}</div>
        </Seccion>
      </section>
    </div>
  );
}
