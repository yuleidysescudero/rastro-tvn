// Marca RASTRO: radar con un rastro de señales que converge en un punto verificable.
export function LogoMarca({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="#0a1628" />
      <circle cx="24" cy="24" r="15" fill="none" stroke="#1c3150" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="9" fill="none" stroke="#1c3150" strokeWidth="1.5" />
      <path d="M24 24 L24 9 A15 15 0 0 1 37 16.5 Z" fill="url(#rg)" opacity=".35" />
      <path d="M11 33 L18 27 L24 29 L31 20 L37 16.5" fill="none" stroke="url(#rg)" strokeWidth="2.6"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="37" cy="16.5" r="3.2" fill="#2dd4bf" />
      <circle cx="11" cy="33" r="1.8" fill="#5eead4" opacity=".7" />
      <circle cx="18" cy="27" r="1.8" fill="#5eead4" opacity=".7" />
    </svg>
  );
}

export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMarca />
      <div className="leading-tight">
        <div className={`text-[17px] font-extrabold tracking-[.14em] ${claro ? "text-white" : "text-tinta"}`}>RASTRO</div>
        <div className={`text-[10.5px] font-medium ${claro ? "text-slate-400" : "text-suave"}`}>Copiloto editorial de evidencia</div>
      </div>
    </div>
  );
}
