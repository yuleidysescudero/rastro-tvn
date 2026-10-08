"use client";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Check, ChevronLeft, ChevronRight, Download, EyeOff, Layers, Star, Tag } from "lucide-react";
import { type Etiqueta, guardarEtiqueta, listarEtiquetas } from "@/lib/store";
import { useSesion } from "@/lib/sesion";

type Props = {
  temas: { id: string; titulo: string; medio: string }[];
  pares: { id: string; a: string; b: string }[];
  top5: { id: string; titulo: string; titulares: string }[];
  opciones: { id: string; nombre: string }[];
};
type Modo = "tema" | "par" | "top5";

function csv(filas: string[][]) {
  return filas.map((f) => f.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n") + "\n";
}
function descargar(nombre: string, contenido: string) {
  const url = URL.createObjectURL(new Blob(["﻿" + contenido], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = nombre; a.click(); URL.revokeObjectURL(url);
}

export function EtiquetarCliente({ temas, pares, top5, opciones }: Props) {
  const { usuario } = useSesion();
  const [modo, setModo] = useState<Modo>("tema");
  const [etqs, setEtqs] = useState<Etiqueta[]>([]);
  const [i, setI] = useState(0);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { listarEtiquetas(usuario).then(setEtqs); }, [usuario]);
  const ultima = useMemo(() => {
    const m: Record<string, Etiqueta> = {};
    for (const e of etqs) m[`${e.tipo}:${e.item_id}`] = e;
    return m;
  }, [etqs]);
  const valor = (tipo: Modo, id: string) => ultima[`${tipo}:${id}`]?.valor;

  const lista = modo === "tema" ? temas : modo === "par" ? pares : top5;
  const hechos = lista.filter((x) => valor(modo, x.id)).length;
  const elegidosTop = top5.filter((t) => valor("top5", t.id) === "si").length;

  async function marcar(tipo: Modo, id: string, v: string, avanzar = true) {
    if (!usuario) return;
    setGuardando(true);
    try {
      const e = await guardarEtiqueta(usuario, tipo, id, v);
      setEtqs((x) => [...x, e]);
      if (avanzar) setI((k) => Math.min(k + 1, lista.length - 1));
    } finally { setGuardando(false); }
  }

  function siguientePendiente() {
    const k = lista.findIndex((x, n) => n > i && !valor(modo, x.id));
    const primera = lista.findIndex((x) => !valor(modo, x.id));
    setI(k >= 0 ? k : Math.max(primera, 0));
  }

  function exportar() {
    descargar("temas.csv", csv([["id_noticia", "titulo", "medio", "tema_humano", "opciones"],
      ...temas.map((t) => [t.id, t.titulo, t.medio, valor("tema", t.id) || "", opciones.map((o) => o.id).join("|")])]));
    descargar("pares.csv", csv([["id_a", "titulo_a", "id_b", "titulo_b", "mismo_evento_humano"],
      ...pares.map((p) => { const [a, b] = p.id.split("|"); return [a, p.a, b, p.b, valor("par", p.id) || ""]; })]));
    descargar("top5_editor.csv", csv([["id_evento", "titulo", "titulares", "elegido_por_editor"],
      ...top5.map((t) => [t.id, t.titulo, t.titulares, valor("top5", t.id) || ""])]));
  }

  const actual = lista[Math.min(i, lista.length - 1)];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="etiqueta-sec">Evaluación reproducible · pág. 9</div>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-tinta">Etiquetado humano</h1>
          <p className="mt-1 max-w-3xl text-[14.5px] text-suave">Las etiquetas las pone una persona, nunca el sistema. Se etiqueta <b>a ciegas</b>: no se muestra la predicción de la IA.
            Con ellas se calcula macro-F1 (temas), precisión/recall (agrupación) y Precision@5 (ranking) frente al baseline.</p>
        </div>
        <button className="boton-borde" onClick={exportar}><Download className="h-4 w-4" />Descargar CSV (data/etiquetas)</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {([["tema", "Temas", temas, Tag], ["par", "¿Mismo evento?", pares, Layers], ["top5", "Top 5 del editor", top5, Star]] as const).map(([m, nombre, l, Icono]) => {
          const n = l.filter((x) => valor(m, x.id)).length;
          return (
            <button key={m} onClick={() => { setModo(m); setI(0); }}
              className={clsx("tarjeta p-4 text-left transition", modo === m ? "border-senal ring-2 ring-senal/20" : "hover:border-senal/50")}>
              <div className="flex items-center gap-2 font-bold text-tinta"><Icono className="h-4 w-4 text-senal" />{nombre}</div>
              <div className="mt-2 flex items-baseline justify-between"><span className="text-2xl font-bold tabular-nums">{m === "top5" ? `${elegidosTop}/5` : `${n}/${l.length}`}</span>
                <span className="text-[12px] text-suave">{m === "top5" ? `${l.length} candidatos` : `${Math.round((100 * n) / (l.length || 1))}%`}</span></div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-senal" style={{ width: `${m === "top5" ? elegidosTop * 20 : (100 * n) / (l.length || 1)}%` }} /></div>
            </button>
          );
        })}
      </div>

      {modo === "top5" ? (
        <div className="tarjeta p-5">
          <p className="mb-4 text-[14px] text-slate-600">Como editor/a, elige los <b>5 temas</b> que pondrías en la agenda de hoy, sin mirar el ranking de RASTRO. Si no hay especialista editorial, la evaluación se declara exploratoria.</p>
          <div className="grid gap-2 md:grid-cols-2">{top5.map((t) => {
            const si = valor("top5", t.id) === "si";
            return (
              <button key={t.id} disabled={guardando || (!si && elegidosTop >= 5)} onClick={() => marcar("top5", t.id, si ? "no" : "si", false)}
                className={clsx("flex items-start gap-3 rounded-xl border p-3 text-left text-[13.5px] transition disabled:opacity-40",
                  si ? "border-senal bg-teal-50/60" : "border-borde hover:bg-papel")}>
                <span className={clsx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border", si ? "border-senal bg-senal text-white" : "border-slate-300")}>{si && <Check className="h-3.5 w-3.5" />}</span>
                <span><span className="font-medium">{t.titulo}</span> <span className="text-suave">· {t.titulares} titular(es)</span></span>
              </button>
            );
          })}</div>
        </div>
      ) : actual && (
        <div className="tarjeta mx-auto max-w-3xl p-6">
          <div className="flex items-center justify-between text-[12.5px] text-suave">
            <span className="flex items-center gap-1.5"><EyeOff className="h-3.5 w-3.5" />A ciegas · {i + 1} de {lista.length} · {hechos} hechos</span>
            <div className="flex gap-1">
              <button className="rounded-lg border border-borde p-1.5" disabled={i === 0} onClick={() => setI(i - 1)}><ChevronLeft className="h-4 w-4" /></button>
              <button className="rounded-lg border border-borde p-1.5" disabled={i >= lista.length - 1} onClick={() => setI(i + 1)}><ChevronRight className="h-4 w-4" /></button>
              <button className="rounded-lg border border-borde px-2 text-[12px] font-semibold" onClick={siguientePendiente}>Siguiente pendiente</button>
            </div>
          </div>
          {modo === "tema" && "titulo" in actual && "medio" in actual && (
            <>
              <div className="mt-5 text-[21px] font-bold leading-snug text-tinta">{actual.titulo}</div>
              <div className="mt-1 text-[13px] text-suave">{actual.medio}</div>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">{opciones.map((o) => (
                <button key={o.id} disabled={guardando} onClick={() => marcar("tema", actual.id, o.id)}
                  className={clsx("rounded-xl border px-4 py-3 text-left text-[14.5px] font-semibold transition",
                    valor("tema", actual.id) === o.id ? "border-senal bg-senal text-white" : "border-borde hover:border-senal hover:bg-teal-50/40")}>
                  {o.nombre}</button>
              ))}</div>
            </>
          )}
          {modo === "par" && "a" in actual && (
            <>
              <p className="mt-4 text-[14px] text-slate-600">¿Estos dos titulares hablan del <b>mismo hecho</b>?</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-papel p-4 text-[16px] font-semibold leading-snug">{actual.a}</div>
                <div className="rounded-xl bg-papel p-4 text-[16px] font-semibold leading-snug">{actual.b}</div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[["si", "Sí, mismo evento"], ["no", "No, son distintos"]].map(([v, t]) => (
                  <button key={v} disabled={guardando} onClick={() => marcar("par", actual.id, v)}
                    className={clsx("rounded-xl border px-4 py-3 text-[15px] font-bold transition",
                      valor("par", actual.id) === v ? "border-senal bg-senal text-white" : "border-borde hover:border-senal")}>{t}</button>
                ))}
              </div>
            </>
          )}
          <p className="mt-5 text-[12px] text-suave">Etiqueta: <b>{usuario?.nombre}</b> · {usuario?.modo === "supabase" ? "se guarda en Supabase y la ve todo el equipo" : "se guarda en este navegador; descarga los CSV al terminar"}.</p>
        </div>
      )}
    </div>
  );
}
