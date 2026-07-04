import { type Version } from "@/lib/builder-versions";
import { Button } from "@/components/ui/button";
import { Clock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  versions: Version[];
  activeId?: string;
  onRestore: (v: Version) => void;
}

export default function BuilderVersions({ versions, activeId, onRestore }: Props) {
  if (versions.length === 0) {
    return <div className="p-6 text-center text-xs text-muted-foreground">Zatiaľ žiadne verzie</div>;
  }
  return (
    <div className="space-y-1 p-2 overflow-y-auto">
      {versions.map((v, i) => (
        <button
          key={v.id}
          onClick={() => onRestore(v)}
          className={cn(
            "w-full text-left p-2 rounded-lg border border-border/40 hover:border-primary/50 transition-all group",
            activeId === v.id && "border-primary bg-primary/5"
          )}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-mono text-primary">v{versions.length - i}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> {new Date(v.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="text-xs truncate text-foreground/80">{v.prompt || "(no prompt)"}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{v.route} · {v.code.length} chars</div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
            <RotateCcw className="w-3 h-3 inline mr-1" /> <span className="text-[10px]">Restore</span>
          </div>
        </button>
      ))}
    </div>
  );
}
