"use client";
import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import type { Revision } from "@/lib/tipos";
import { listarRevisiones } from "@/lib/store";
import { useSesion } from "@/lib/sesion";
import { DialogoRevision } from "@/components/DialogoRevision";
import { InsigniaRevision } from "@/components/ui";

export function EstadoCaso({ id, titulo = "" }: { id: string; titulo?: string }) {
  const { usuario } = useSesion();
  const [hist, setHist] = useState<Revision[]>([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    listarRevisiones(usuario).then((r) => setHist(r.filter((x) => x.id_evento === id)));
  }, [usuario, id]);

  const actual = hist.at(-1);
  return (
    <>
      <button className="boton-borde" onClick={() => setAbierto(true)} title={actual ? `${actual.persona}: ${actual.nota}` : "Sin revisión"}>
        <ClipboardCheck className="h-4 w-4" />
        <InsigniaRevision estado={actual?.estado ?? "nuevo"} />
      </button>
      {abierto && (
        <DialogoRevision id={id} titulo={titulo || document.title} actual={actual?.estado ?? "nuevo"}
          onCerrar={() => setAbierto(false)} onGuardado={(r) => { setHist([...hist, r]); setAbierto(false); }} />
      )}
    </>
  );
}
