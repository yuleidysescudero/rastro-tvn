import { llamarMotor } from "@/lib/motor";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => ({}))) as { id_evento?: string; texto?: string };
  if (!cuerpo.id_evento || !cuerpo.texto || cuerpo.texto.length > 4000) {
    return Response.json({ error: "Falta el texto o el tema." }, { status: 400 });
  }
  const r = await llamarMotor<{ observaciones: unknown[] }>("/defender", cuerpo);
  if (!r) return Response.json({ error: "El motor de IA no está disponible para revisar la nota en este momento." }, { status: 503 });
  return Response.json(r);
}
