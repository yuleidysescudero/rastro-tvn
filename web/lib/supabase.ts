"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cliente: SupabaseClient | null = null;

/** Cliente de Supabase o null si no está configurado (modo local: la demo sigue funcionando). */
export function supabase(): SupabaseClient | null {
  if (!URL || !ANON) return null;
  if (!cliente) cliente = createClient(URL, ANON, { auth: { persistSession: true, storageKey: "rastro-auth" } });
  return cliente;
}

export const supabaseConfigurado = Boolean(URL && ANON);
