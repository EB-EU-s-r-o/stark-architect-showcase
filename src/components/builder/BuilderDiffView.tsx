import { useMemo } from "react";
import { diffLines } from "diff";
import { cn } from "@/lib/utils";

interface Props { previous: string; current: string; }

export default function BuilderDiffView({ previous, current }: Props) {
  const parts = useMemo(() => diffLines(previous || "", current || ""), [previous, current]);
  return (
    <div className="font-mono text-xs bg-[#0d1117] overflow-auto h-full">
      {parts.map((p, i) => (
        <pre
          key={i}
          className={cn(
            "px-3 whitespace-pre-wrap",
            p.added && "bg-emerald-500/10 text-emerald-300",
            p.removed && "bg-rose-500/10 text-rose-300 line-through opacity-70",
            !p.added && !p.removed && "text-muted-foreground"
          )}
        >
          {p.value.split("\n").map((line, j) => (
            line || j === 0 ? <span key={j} className="block">{p.added ? "+ " : p.removed ? "- " : "  "}{line}</span> : null
          ))}
        </pre>
      ))}
      {parts.length === 1 && !parts[0].added && !parts[0].removed && (
        <div className="p-4 text-muted-foreground text-center">No changes</div>
      )}
    </div>
  );
}
