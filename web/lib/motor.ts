import "server-only";
// Puente al motor Python (api/main.py). RASTRO_API_URL es una variable de servidor: el navegador nunca la ve.
const BASE = (process.env.RASTRO_API_URL || "").replace(/\/$/, "");

export const motorConfigurado = Boolean(BASE);

export async function llamarMotor<T>(ruta: string, cuerpo?: unknown, ms = 25000): Promise<T | null> {
  if (!BASE) return null;
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), ms);
  try {
    const r = await fetch(`${BASE}${ruta}`, {
      method: cuerpo === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...(process.env.RASTRO_API_TOKEN ? { Authorization: `Bearer ${process.env.RASTRO_API_TOKEN}` } : {}) },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: control.signal,
      cache: "no-store",
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
