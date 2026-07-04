import { MousePointer2, Type, Pencil, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type BuilderTool = "none" | "select" | "text" | "annotate" | "comment";

interface Props { tool: BuilderTool; onChange: (t: BuilderTool) => void; }

const TOOLS: { id: BuilderTool; icon: typeof MousePointer2; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "text", icon: Type, label: "Text edit" },
  { id: "annotate", icon: Pencil, label: "Annotate" },
  { id: "comment", icon: MessageCircle, label: "Comment" },
];

export default function BuilderFloatingToolbar({ tool, onChange }: Props) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 rounded-full bg-background/90 backdrop-blur-xl border border-primary/30 shadow-[0_0_30px_rgba(0,229,255,0.15)] z-20">
      {TOOLS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(tool === id ? "none" : id)}
          title={label}
          className={cn(
            "p-2 rounded-full transition-all",
            tool === id
              ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,229,255,0.5)]"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
