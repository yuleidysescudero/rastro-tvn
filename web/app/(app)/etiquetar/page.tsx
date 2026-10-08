import { etiquetado, resumen } from "@/lib/datos";
import { EtiquetarCliente } from "./EtiquetarCliente";

export const metadata = { title: "Etiquetado humano" };

export default function EtiquetarPage() {
  const e = etiquetado();
  const temas = resumen().temas;
  return (
    <EtiquetarCliente
      temas={(e.temas || []).map((t) => ({ id: t.id_noticia, titulo: t.titulo, medio: t.medio }))}
      pares={(e.pares || []).map((p) => ({ id: `${p.id_a}|${p.id_b}`, a: p.titulo_a, b: p.titulo_b }))}
      top5={(e.top5_editor || []).map((t) => ({ id: t.id_evento, titulo: t.titulo, titulares: t.titulares }))}
      opciones={Object.entries(temas).map(([id, nombre]) => ({ id, nombre }))}
    />
  );
}
