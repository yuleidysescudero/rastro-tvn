import { readFileSync } from "node:fs";
import path from "node:path";
import { llamarMotor } from "@/lib/motor";
import type { RespuestaAgente } from "@/lib/tipos";

export const dynamic = "force-dynamic";

let respaldo: Record<string, RespuestaAgente> | null = null;
function respuestasGuardadas() {
  if (!respaldo) {
    try {
      respaldo = JSON.parse(readFileSync(path.join(process.cwd(), "public", "data", "respuestas_respaldo.json"), "utf-8"));
    } catch { respaldo = {}; }
  }
  return respaldo!;
}
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, "").trim();

export async function POST(req: Request) {
  const { pregunta } = (await req.json().catch(() => ({}))) as { pregunta?: string };
  if (!pregunta || pregunta.trim().length < 2 || pregunta.length > 500) {
    return Response.json({ error: "Escribe una pregunta de 2 a 500 caracteres." }, { status: 400 });
  }
  const r = await llamarMotor<RespuestaAgente>("/consulta", { pregunta });
  if (r) return Response.json({ ...r, origen: "motor" });

  // Respaldo (T10): respuesta guardada del mismo motor para las consultas sugeridas
  const guardadas = respuestasGuardadas();
  const clave = Object.keys(guardadas).find((k) => norm(k) === norm(pregunta));
  if (clave) return Response.json({ ...guardadas[clave], origen: "respaldo" });
  return Response.json({
    tipo: "sin_motor", origen: "respaldo", respuesta: [],
    motivo: "El motor de IA no está disponible en este momento y esta pregunta no tiene una respuesta guardada. "
      + "Prueba una consulta sugerida o usa la demo local (python -m uvicorn api.main:app).",
    pasos: [{ herramienta: "respaldo", detalle: "Motor no disponible; sin respuesta guardada para esta consulta." }],
  } satisfies RespuestaAgente);
}
