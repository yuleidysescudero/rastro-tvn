import { eventos, indicePaquetes, resumen } from "@/lib/datos";
import { RevisionCliente } from "./RevisionCliente";

export const metadata = { title: "Mesa de revisión" };

export default function RevisionPage() {
  const ids = new Set([...resumen().agenda, ...indicePaquetes()]);
  const casos = eventos().filter((e) => ids.has(e.id_evento)).map((e) => ({
    id_evento: e.id_evento, titulo: e.titulo, tema_nombre: e.tema_nombre, puntaje: e.puntaje, nivel: e.nivel,
    estado_evidencia: e.estado_evidencia, n_titulares: e.n_titulares, n_procedencias: e.n_procedencias,
    agenda: resumen().agenda.includes(e.id_evento),
  }));
  return <RevisionCliente casos={casos} />;
}
