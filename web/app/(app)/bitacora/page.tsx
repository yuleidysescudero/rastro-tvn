"use client";
import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { type Entrada, listarBitacora } from "@/lib/store";
import { useSesion } from "@/lib/sesion";
import { fechaPa } from "@/components/ui";

const NOMBRE: Record<string, string> = {
  revision: "Decisión de revisión", cambio_de_pesos: "Cambio de pesos del puntaje", copiar_paquete: "Copió un paquete editorial",
  defiende_tu_nota: "Revisó una nota", etiqueta: "Etiquetó",
};

export default function BitacoraPage() {
  const { usuario } = useSesion();
  const [filas, setFilas] = useState<Entrada[] | null>(null);
  useEffect(() => { listarBitacora(usuario).then(setFilas); }, [usuario]);
  return (
    <div className="space-y-6">
      <div>
        <div className="etiqueta-sec">Trazabilidad</div>
        <h1 className="mt-1 text-[28px] font-bold tracking-tight text-tinta">Bitácora</h1>
        <p className="mt-1 text-[14.5px] text-suave">Cada acción humana queda registrada con persona, rol y hora. Solo inserción: nada se edita ni se borra.</p>
      </div>
      <div className="tarjeta p-5">
        {filas === null && <p className="text-sm text-suave">Cargando…</p>}
        {filas?.length === 0 && <p className="py-8 text-center text-sm text-suave"><History className="mx-auto mb-2 h-6 w-6" />Aún no hay acciones registradas.</p>}
        <ol className="relative space-y-4 border-l-2 border-borde pl-6">
          {filas?.map((f, k) => (
            <li key={k} className="relative">
              <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-senal" />
              <div className="text-[12px] text-suave">{fechaPa(f.created_at)} · <b className="text-texto">{f.persona}</b>{f.rol && ` (${f.rol})`}</div>
              <div className="text-[14px] font-semibold text-tinta">{NOMBRE[f.accion] ?? f.accion}</div>
              <div className="mt-0.5 text-[12.5px] text-slate-600">
                {Object.entries(f.detalle || {}).map(([k2, v]) => <span key={k2} className="mr-3"><span className="text-suave">{k2}:</span> {typeof v === "object" ? JSON.stringify(v) : String(v)}</span>)}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
