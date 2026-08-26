// sistema-visual-etapa-1.md §3 — "Badge hexagonal de AC: clip-path de
// escudo, fondo plano surface-high, borde outline."
export function AcBadge({ value, size = 56 }: { value: number; size?: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex items-center justify-center bg-gothic-surface-high ring-1 ring-gothic-outline"
        style={{
          width: size,
          height: size,
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
        }}
      >
        <span className="font-mono text-lg font-bold text-gothic-on-surface">{value}</span>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-gothic-outline">CA</span>
    </div>
  );
}
