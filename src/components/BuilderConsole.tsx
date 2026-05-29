import { useEffect, useRef, useState } from "react";
import { Terminal, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConsoleEntry {
  id: number;
  level: "log" | "warn" | "error" | "info";
  args: string[];
  ts: number;
}

interface Props {
  entries: ConsoleEntry[];
  onClear: () => void;
}

const LEVEL_COLOR: Record<ConsoleEntry["level"], string> = {
  log: "text-muted-foreground",
  info: "text-cyan-400",
  warn: "text-yellow-400",
  error: "text-red-400",
};

export default function BuilderConsole({ entries, onClear }: Props) {
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries, open]);

  const errorCount = entries.filter((e) => e.level === "error").length;

  return (
    <div className="border-t border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-3 py-1.5 text-xs">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          <Terminal className="w-3 h-3" />
          <span>Console</span>
          <span className="text-muted-foreground/70">({entries.length})</span>
          {errorCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
              {errorCount} err
            </span>
          )}
        </button>
        <button
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground p-1"
          title="Clear console"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      {open && (
        <div
          ref={ref}
          className="max-h-40 overflow-y-auto px-3 pb-2 font-mono text-xs space-y-0.5"
        >
          {entries.length === 0 ? (
            <div className="text-muted-foreground/50 py-2">No console output yet</div>
          ) : (
            entries.map((e) => (
              <div key={e.id} className={cn("flex gap-2", LEVEL_COLOR[e.level])}>
                <span className="text-muted-foreground/40 shrink-0">
                  {new Date(e.ts).toLocaleTimeString()}
                </span>
                <span className="shrink-0">[{e.level}]</span>
                <span className="break-all">{e.args.join(" ")}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
