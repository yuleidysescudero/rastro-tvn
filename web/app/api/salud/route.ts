import { llamarMotor } from "@/lib/motor";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await llamarMotor<Record<string, unknown>>("/salud", undefined, 8000);
  return Response.json({ motor: Boolean(s?.ok), detalle: s ?? null });
}
