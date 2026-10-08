"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

export type Rol = "editor" | "productor" | "revisor" | "jurado";
export type Usuario = { id: string; nombre: string; email: string; rol: Rol; modo: "supabase" | "local" };

export const ROLES: Record<Rol, { nombre: string; descripcion: string }> = {
  editor: { nombre: "Editor/a", descripcion: "Agenda priorizada, fichas y decisión editorial" },
  productor: { nombre: "Productor/a digital", descripcion: "Titulares, resumen web y copy social" },
  revisor: { nombre: "Revisor/a", descripcion: "Aprueba, corrige o descarta borradores" },
  jurado: { nombre: "Jurado", descripcion: "Recorrido completo, métricas y pruebas" },
};

// Cuentas de demostración (datos públicos del snapshot; solo pueden agregar registros, no borrarlos)
export const DEMO: Record<Rol, { email: string; nombre: string }> = {
  editor: { email: "editor@rastro-demo.com", nombre: "Mesa editorial (demo)" },
  productor: { email: "digital@rastro-demo.com", nombre: "Producción digital (demo)" },
  revisor: { email: "revisor@rastro-demo.com", nombre: "Revisión (demo)" },
  jurado: { email: "jurado@rastro-demo.com", nombre: "Jurado hackIAthon" },
};
export const DEMO_CLAVE = process.env.NEXT_PUBLIC_DEMO_CLAVE || "";

type Ctx = {
  usuario: Usuario | null;
  cargando: boolean;
  entrar: (email: string, clave: string) => Promise<string | null>;
  entrarDemo: (rol: Rol) => Promise<string | null>;
  salir: () => Promise<void>;
};
const SesionCtx = createContext<Ctx | null>(null);
const LOCAL = "rastro-sesion-local";

function desdeSupabase(u: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Usuario {
  const m = u.user_metadata || {};
  const rol = (m.rol as Rol) || "editor";
  return { id: u.id, email: u.email || "", nombre: (m.nombre as string) || u.email || "Usuario", rol, modo: "supabase" };
}

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const sb = supabase();
    if (!sb) {
      try {
        const guardado = localStorage.getItem(LOCAL);
        if (guardado) setUsuario(JSON.parse(guardado));
      } catch {}
      setCargando(false);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      setUsuario(data.session ? desdeSupabase(data.session.user) : null);
      setCargando(false);
    });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setUsuario(s ? desdeSupabase(s.user) : null));
    return () => data.subscription.unsubscribe();
  }, []);

  const entrar = useCallback(async (email: string, clave: string) => {
    const sb = supabase();
    if (!sb) return "Supabase no está configurado: usa un acceso de demostración.";
    const { error } = await sb.auth.signInWithPassword({ email, password: clave });
    return error ? "Correo o contraseña incorrectos." : null;
  }, []);

  const entrarDemo = useCallback(async (rol: Rol) => {
    const sb = supabase();
    if (sb && DEMO_CLAVE) {
      const { error } = await sb.auth.signInWithPassword({ email: DEMO[rol].email, password: DEMO_CLAVE });
      if (!error) return null;
    }
    // Modo local: sesión en este navegador (sin base de datos compartida)
    const u: Usuario = { id: `local-${rol}`, email: DEMO[rol].email, nombre: DEMO[rol].nombre, rol, modo: "local" };
    try { localStorage.setItem(LOCAL, JSON.stringify(u)); } catch {}
    setUsuario(u);
    return null;
  }, []);

  const salir = useCallback(async () => {
    try { localStorage.removeItem(LOCAL); } catch {}
    await supabase()?.auth.signOut();
    setUsuario(null);
  }, []);

  const valor = useMemo(() => ({ usuario, cargando, entrar, entrarDemo, salir }), [usuario, cargando, entrar, entrarDemo, salir]);
  return <SesionCtx.Provider value={valor}>{children}</SesionCtx.Provider>;
}

export function useSesion() {
  const c = useContext(SesionCtx);
  if (!c) throw new Error("useSesion fuera de SesionProvider");
  return c;
}
