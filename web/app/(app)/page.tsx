import { agenda, eventosLigeros, resumen } from "@/lib/datos";
import { RadarCliente } from "./RadarCliente";

export const metadata = { title: "Radar de agenda" };

export default function RadarPage() {
  const r = resumen();
  const total = r.calidad.find((c) => c.archivo === "noticias.csv");
  return (
    <RadarCliente
      eventos={eventosLigeros()}
      agendaMotor={agenda().map((e) => e.id_evento)}
      historias={Object.fromEntries(agenda().map((e) => [e.id_evento, { historia: e.historia, medios: e.medios.slice(0, 4), relacionados: e.relacionados.length }]))}
      resumen={{ corte: r.corte, reglas: r.reglas, componentes: r.componentes, temas: r.temas, conteos: r.conteos,
        brutos: total?.total ?? r.conteos.titulares, separados: total?.con_error ?? 0 }}
    />
  );
}
