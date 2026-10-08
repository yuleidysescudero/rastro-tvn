"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { ArrowRight, BadgeCheck, FileSearch, Gavel, Newspaper, PenLine, ShieldCheck, Smartphone } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ROLES, type Rol, useSesion } from "@/lib/sesion";
import { supabaseConfigurado } from "@/lib/supabase";

const ICONO_ROL: Record<Rol, React.ElementType> = { editor: Newspaper, productor: Smartphone, revisor: BadgeCheck, jurado: Gavel };

function RadarAnimado() {
  const puntos = [[70, 52, 0], [128, 84, 0.6], [96, 138, 1.2], [150, 140, 1.8], [52, 112, 0.9]];
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full">
      <defs>
        <radialGradient id="fondo" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#14b8a6" stopOpacity=".18" />
          <stop offset="1" stopColor="#14b8a6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="haz" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2dd4bf" stopOpacity="0" />
          <stop offset="1" stopColor="#2dd4bf" stopOpacity=".55" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="url(#fondo)" />
      {[30, 55, 80].map((r) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#1c3150" strokeWidth="1" />)}
      <line x1="100" y1="4" x2="100" y2="196" stroke="#1c3150" /><line x1="4" y1="100" x2="196" y2="100" stroke="#1c3150" />
      <g className="radar-barrido"><path d="M100 100 L100 20 A80 80 0 0 1 169 60 Z" fill="url(#haz)" /></g>
      <polyline points="52,112 70,52 96,138 128,84 150,140" fill="none" stroke="#2dd4bf" strokeOpacity=".35" strokeDasharray="3 4" />
      {puntos.map(([x, y, d], k) => (
        <circle key={k} cx={x} cy={y} r={k === 1 ? 5 : 3.2} fill={k === 1 ? "#2dd4bf" : "#5eead4"} className="radar-punto"
          style={{ animationDelay: `${d}s` }} />
      ))}
    </svg>
  );
}

function Formulario() {
  const { usuario, entrar, entrarDemo } = useSesion();
  const router = useRouter();
  const siguiente = useSearchParams().get("siguiente") || "/";
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  useEffect(() => { if (usuario) router.replace(siguiente); }, [usuario, router, siguiente]);

  async function demo(rol: Rol) {
    setOcupado(rol); setError(null);
    const e = await entrarDemo(rol);
    setOcupado(null);
    if (e) setError(e);
  }
  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setOcupado("form"); setError(null);
    const e = await entrar(email, clave);
    setOcupado(null);
    if (e) setError(e);
  }

  return (
    <div className="w-full max-w-[440px]">
      <div className="lg:hidden"><Logo /></div>
      <h1 className="mt-8 text-[28px] font-bold tracking-tight text-tinta lg:mt-0">Entrar a la mesa</h1>
      <p className="mt-1.5 text-[15px] text-suave">Elige tu rol para recorrer el flujo completo con datos públicos del snapshot.</p>

      <div className="mt-7 grid grid-cols-2 gap-3">
        {(Object.keys(ROLES) as Rol[]).map((rol) => {
          const Icono = ICONO_ROL[rol];
          return (
            <button key={rol} onClick={() => demo(rol)} disabled={Boolean(ocupado)}
              className={clsx("group tarjeta flex flex-col items-start gap-2 p-4 text-left transition hover:-translate-y-0.5 hover:border-senal hover:shadow-lg",
                rol === "jurado" && "border-senal/50 bg-gradient-to-br from-white to-teal-50")}>
              <span className={clsx("grid h-9 w-9 place-items-center rounded-xl", rol === "jurado" ? "bg-senal text-white" : "bg-tinta text-white")}>
                <Icono className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[14px] font-bold text-tinta">{ocupado === rol ? "Entrando…" : ROLES[rol].nombre}</span>
              <span className="text-[12px] leading-snug text-suave">{ROLES[rol].descripcion}</span>
            </button>
          );
        })}
      </div>

      {supabaseConfigurado && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-suave"><span className="h-px flex-1 bg-borde" />o con tu cuenta<span className="h-px flex-1 bg-borde" /></div>
          <form onSubmit={enviar} className="space-y-3">
            <input className="entrada" type="email" placeholder="tu.correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="entrada" type="password" placeholder="Contraseña" value={clave} onChange={(e) => setClave(e.target.value)} required />
            <button className="boton-primario w-full" disabled={Boolean(ocupado)}>
              {ocupado === "form" ? "Verificando…" : <>Entrar <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        </>
      )}
      {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <p className="mt-6 text-[12px] leading-relaxed text-suave">
        Las sesiones de demostración solo pueden <b>agregar</b> revisiones y etiquetas: el historial no se edita ni se borra.
        No se guardan datos personales más allá del nombre de quien revisa.
      </p>
    </div>
  );
}

export default function Login() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-tinta p-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 opacity-[.07]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="relative"><Logo claro /></div>
        <div className="relative my-auto">
          <div className="mx-auto mb-10 h-[300px] w-[300px]"><RadarAnimado /></div>
          <h2 className="max-w-[520px] text-[34px] font-bold leading-[1.15] tracking-tight">
            No te dice qué es verdad.<br /><span className="text-senal">Te dice qué puedes sostener.</span>
          </h2>
          <ul className="mt-8 grid max-w-[540px] gap-4 text-[14.5px] text-slate-300">
            <li className="flex gap-3"><FileSearch className="mt-0.5 h-5 w-5 shrink-0 text-senal" />De cientos de titulares a 5 temas priorizados, con el puntaje desglosado.</li>
            <li className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-senal" />Cuenta fuentes reales, no ecos: cinco medios que replican una agencia son una sola fuente.</li>
            <li className="flex gap-3"><PenLine className="mt-0.5 h-5 w-5 shrink-0 text-senal" />Brief, guion y copy con una cita por oración. Si no hay evidencia, se abstiene.</li>
          </ul>
        </div>
        <div className="relative text-xs text-slate-500">hackIAthon Panamá 2026 · Reto TVN Media «De la señal a la decisión» · Team BillieJSON</div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <Suspense fallback={null}><Formulario /></Suspense>
      </div>
    </div>
  );
}
