import { Shell } from "@/components/Shell";
import { resumen } from "@/lib/datos";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const r = resumen();
  return (
    <Shell info={{ corte: r.corte, reglas: r.reglas, titulares: r.conteos.titulares, temas: r.conteos.temas }}>
      {children}
    </Shell>
  );
}
