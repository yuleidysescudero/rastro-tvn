"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  BarChart3, ClipboardCheck, Database, History, LogOut, Menu, MessagesSquare, Radar, Tags, X, ShieldCheck,
} from "lucide-react";
import { Logo } from "./Logo";
import { ROLES, useSesion } from "@/lib/sesion";
import { supabaseConfigurado } from "@/lib/supabase";
import { fechaPa } from "./ui";

const NAV = [
  { grupo: "Flujo editorial", items: [
    { href: "/", nombre: "Radar de agenda", icono: Radar },
    { href: "/revision", nombre: "Mesa de revisión", icono: ClipboardCheck },
    { href: "/companero", nombre: "Compañero de mesa", icono: MessagesSquare },
  ] },
  { grupo: "Evidencia y control", items: [
    { href: "/reportes", nombre: "Reportes y métricas", icono: BarChart3 },
    { href: "/datos", nombre: "Catálogo de datos", icono: Database },
    { href: "/etiquetar", nombre: "Etiquetado humano", icono: Tags },
    { href: "/bitacora", nombre: "Bitácora", icono: History },
  ] },
];

type Info = { corte: string; reglas: string; titulares: number; temas: number };

export function Shell({ info, children }: { info: Info; children: React.ReactNode }) {
  const { usuario, cargando, salir } = useSesion();
  const router = useRouter();
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [motor, setMotor] = useState<"ok" | "respaldo" | "?">("?");

  useEffect(() => {
    if (!cargando && !usuario) router.replace(`/login?siguiente=${encodeURIComponent(ruta)}`);
  }, [cargando, usuario, router, ruta]);

  useEffect(() => {
    fetch("/api/salud").then((r) => r.json()).then((d) => setMotor(d.motor ? "ok" : "respaldo")).catch(() => setMotor("respaldo"));
  }, []);

  useEffect(() => setAbierto(false), [ruta]);

  if (cargando || !usuario) {
    return <div className="grid min-h-screen place-items-center text-sm text-suave">Cargando RASTRO…</div>;
  }

  const activo = (href: string) => (href === "/" ? ruta === "/" || ruta.startsWith("/tema") : ruta.startsWith(href));

  const lateral = (
    <aside className="flex h-full w-[260px] flex-col bg-tinta text-slate-300">
      <div className="px-5 pb-4 pt-5"><Logo claro /></div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {NAV.map((g) => (
          <div key={g.grupo}>
            <div className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[.12em] text-slate-500">{g.grupo}</div>
            <ul className="space-y-0.5">
              {g.items.map(({ href, nombre, icono: Icono }) => (
                <li key={href}>
                  <Link href={href} className={clsx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition",
                    activo(href) ? "bg-tinta-3 text-white shadow-inner" : "hover:bg-tinta-2 hover:text-white")}>
                    <Icono className={clsx("h-[18px] w-[18px]", activo(href) ? "text-senal" : "text-slate-500")} />
                    {nombre}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="m-3 rounded-xl bg-tinta-2 p-3 text-[11.5px] leading-relaxed text-slate-400">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200"><ShieldCheck className="h-3.5 w-3.5 text-senal" />Control humano</div>
        Los borradores no se publican solos. Aprobar ≠ publicar.
      </div>
      <div className="px-5 pb-4 text-[11px] text-slate-500">Team BillieJSON · hackIAthon 2026</div>
    </aside>
  );

  return (
    <div className="flex min-h-screen">
      <div className="no-imprimir sticky top-0 hidden h-screen lg:block">{lateral}</div>
      {abierto && (
        <div className="no-imprimir fixed inset-0 z-50 flex lg:hidden">
          <div className="h-full">{lateral}</div>
          <button className="flex-1 bg-black/40" aria-label="Cerrar menú" onClick={() => setAbierto(false)} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-imprimir sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-borde bg-white/85 px-4 backdrop-blur md:px-8">
          <button className="rounded-lg p-2 hover:bg-papel lg:hidden" onClick={() => setAbierto(!abierto)} aria-label="Menú">
            {abierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="hidden items-center gap-4 text-xs text-suave md:flex">
            <span><b className="text-texto">Corte:</b> {fechaPa(info.corte)} (Panamá)</span>
            <span className="h-4 w-px bg-borde" />
            <span><b className="text-texto">{info.titulares}</b> titulares → <b className="text-texto">{info.temas}</b> temas</span>
            <span className="h-4 w-px bg-borde" />
            <span className="font-mono">{info.reglas}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span title={motor === "ok" ? "Motor de IA en línea" : "Modo respaldo: snapshot local y respuestas guardadas"}
              className={clsx("hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold sm:inline-flex",
                motor === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>
              <span className={clsx("h-1.5 w-1.5 rounded-full", motor === "ok" ? "bg-emerald-500" : "bg-amber-500")} />
              {motor === "ok" ? "Motor IA en línea" : motor === "?" ? "Conectando…" : "Modo respaldo"}
            </span>
            {!supabaseConfigurado || usuario.modo === "local" ? (
              <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-600 sm:inline">Sesión local</span>
            ) : null}
            <div className="flex items-center gap-2.5 rounded-full border border-borde bg-white py-1 pl-1 pr-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-tinta text-xs font-bold text-white">
                {usuario.nombre.slice(0, 1).toUpperCase()}
              </span>
              <div className="hidden leading-tight sm:block">
                <div className="text-[13px] font-semibold">{usuario.nombre}</div>
                <div className="text-[11px] text-suave">{ROLES[usuario.rol]?.nombre}</div>
              </div>
            </div>
            <button onClick={() => salir().then(() => router.replace("/login"))} className="rounded-lg p-2 text-suave hover:bg-papel hover:text-texto" title="Salir">
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
