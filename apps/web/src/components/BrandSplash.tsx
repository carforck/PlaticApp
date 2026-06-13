import { BrandIcon } from "@/components/BrandIcon";

/** Pantalla de carga con el logo completo (ícono + «PlaticApp!»). */
export function BrandSplash() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-[#0b1020] via-[#131a33] to-[#1a1430]">
      <div className="animate-float-in flex items-center gap-3">
        <BrandIcon size={66} className="rounded-[24%] shadow-lg" />
        <span className="bg-gradient-to-r from-[#4aa3ff] to-[#c98cff] bg-clip-text text-[40px] font-bold tracking-tight text-transparent">
          PlaticApp!
        </span>
      </div>
      <span className="flex gap-1.5">
        <span className="h-2 w-2 animate-bounce rounded-full bg-white/50 [animation-delay:-0.2s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-white/50 [animation-delay:-0.1s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-white/50" />
      </span>
    </div>
  );
}
