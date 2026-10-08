"use client";
import { useState } from "react";
import clsx from "clsx";
import { CheckCircle2, X } from "lucide-react";
import type { EstadoRevision, Revision } from "@/lib/tipos";
import { registrarRevision } from "@/lib/store";
import { ROLES, useSesion } from "@/lib/sesion";
import { REVISION } from "./ui";

const ESTADOS: { estado: EstadoRevision; ayuda: string }[] = [
  { estado: "en revisión", ayuda: "Alguien de la mesa lo está mirando." },
  { estado: "requiere evidencia", ayuda: "Falta una fuente real u oficial antes de seguir." },
  { estado: "aprobado como borrador", ayuda: "Sirve como borrador interno. No significa publicar." },
  { estado: "descartado", ayuda: "No entra a la agenda (indica el motivo)." },
  { estado: "nuevo", ayuda: "Devolver a la bandeja sin decisión." },
];

export function DialogoRevision({ id, titulo, actual, onCerrar, onGuardado }:
  { id: string; titulo: string; actual: EstadoRevision; onCerrar: () => void; onGuardado: (r: Revision) => void }) {
  const { usuario } = useSesion();
  const [estado, setEstado] = useState<EstadoRevision>(actual === "nuevo" ? "en revisión" : actual);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const notaObligatoria = estado === "descartado" || estado === "requiere evidencia";

  async function guardar() {
    if (!usuario) return;
    if (notaObligatoria && nota.trim().length < 5) { setError("Explica el motivo: queda en el historial del caso."); return; }
    setOcupado(true); setError(null);
    try {
      const r = await registrarRevision(usuario, id, estado, nota);
      onGuardado(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar.");
    } finally { setOcupado(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-tinta/50 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div className="tarjeta aparecer w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="etiqueta-sec">Decisión humana · {id}</div>
            <h3 className="mt-1 text-[17px] font-bold leading-snug text-tinta">{titulo}</h3>
          </div>
          <button onClick={onCerrar} className="rounded-lg p-1.5 text-suave hover:bg-papel"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 grid gap-2">
          {ESTADOS.map(({ estado: e, ayuda }) => (
            <button key={e} onClick={() => setEstado(e)}
              className={clsx("flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition",
                estado === e ? "border-senal bg-teal-50/60 ring-2 ring-senal/20" : "border-borde hover:bg-papel")}>
              <span className={clsx("h-2.5 w-2.5 rounded-full", REVISION[e].punto)} />
              <div><div className="text-[14px] font-semibold capitalize">{e}</div><div className="text-[12px] text-suave">{ayuda}</div></div>
              {estado === e && <CheckCircle2 className="ml-auto h-5 w-5 text-senal" />}
            </button>
          ))}
        </div>
        <textarea className="entrada mt-3 min-h-[80px]" value={nota} onChange={(e) => setNota(e.target.value)}
          placeholder={notaObligatoria ? "Motivo (obligatorio)" : "Nota o corrección (opcional)"} />
        <div className="mt-2 text-[12px] text-suave">
          Responsable: <b className="text-texto">{usuario?.nombre}</b> · {usuario ? ROLES[usuario.rol].nombre : ""}. El registro no se puede editar ni borrar.
        </div>
        {error && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button className="boton-borde" onClick={onCerrar}>Cancelar</button>
          <button className="boton-primario" disabled={ocupado} onClick={guardar}>{ocupado ? "Registrando…" : "Registrar decisión"}</button>
        </div>
      </div>
    </div>
  );
}
