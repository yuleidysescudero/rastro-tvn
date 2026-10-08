"use client";
import { Printer } from "lucide-react";

export function BotonImprimir({ texto = "Exportar PDF" }: { texto?: string }) {
  return <button onClick={() => window.print()} className="boton-borde no-imprimir"><Printer className="h-4 w-4" />{texto}</button>;
}
