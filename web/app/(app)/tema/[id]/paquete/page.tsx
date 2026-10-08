import { notFound } from "next/navigation";
import { evento, indicePaquetes, paquete } from "@/lib/datos";
import { PaqueteCliente } from "./PaqueteCliente";

export function generateStaticParams() {
  return indicePaquetes().map((id) => ({ id }));
}

export const metadata = { title: "Paquete editorial" };

export default async function PaquetePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ev = evento(id);
  const paq = paquete(id);
  if (!ev || !paq) notFound();
  return (
    <PaqueteCliente paq={paq} ev={{ id_evento: ev.id_evento, titulo: ev.titulo, tema_nombre: ev.tema_nombre,
      estado_evidencia: ev.estado_evidencia, n_titulares: ev.n_titulares, n_procedencias: ev.n_procedencias,
      nivel: ev.nivel, puntaje: ev.puntaje }} />
  );
}
