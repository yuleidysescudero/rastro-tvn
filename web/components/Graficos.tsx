"use client";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Indicador } from "@/lib/tipos";

export function SerieIndicador({ ind }: { ind: Indicador }) {
  const datos = (ind.serie || []).map((p) => ({ anio: p.anio, valor: p.valor === null ? null : Math.round(p.valor * 100) / 100 }));
  const region = (ind.region || []).filter((r) => r.valor !== null).map((r) => ({ ...r, valor: Math.round((r.valor as number) * 100) / 100 }))
    .sort((a, b) => (b.valor as number) - (a.valor as number));
  return (
    <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
      <div className="h-[200px]">
        <div className="mb-1 text-[11.5px] text-suave">Panamá · serie anual 2010–2024 ({ind.ultimo?.unidad})</div>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={datos} margin={{ left: -10, right: 10, top: 6 }}>
            <CartesianGrid stroke="#eef1f5" />
            <XAxis dataKey="anio" tick={{ fontSize: 10.5 }} />
            <YAxis tick={{ fontSize: 10.5 }} />
            <Tooltip formatter={(v) => (v === null ? "sin dato (nulo conservado)" : `${v} ${ind.ultimo?.unidad ?? ""}`)} />
            <Line type="monotone" dataKey="valor" stroke="#0d9488" strokeWidth={2.4} dot={{ r: 2.5 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="h-[200px]">
        <div className="mb-1 text-[11.5px] text-suave">Comparación regional · {ind.ultimo?.anio}</div>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={region} layout="vertical" margin={{ left: 0, right: 16 }}>
            <XAxis type="number" tick={{ fontSize: 10.5 }} />
            <YAxis type="category" dataKey="pais" width={108} tick={{ fontSize: 10.5 }} />
            <Tooltip formatter={(v) => `${v} ${ind.ultimo?.unidad ?? ""}`} />
            <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
              {region.map((r) => <Cell key={r.pais} fill={r.pais === "Panamá" ? "#0d9488" : "#cbd5e1"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
