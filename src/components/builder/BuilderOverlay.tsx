import { useEffect, useRef, useState } from "react";
import { X, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Pin { id: string; x: number; y: number; text: string; }

interface Props {
  mode: "annotate" | "comment" | "none";
  pins: Pin[];
  onPinsChange: (p: Pin[]) => void;
  onSendComments: () => void;
}

// SVG-based freehand annotate + comment pins overlay over the preview.
export default function BuilderOverlay({ mode, pins, onPinsChange, onSendComments }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [editingPin, setEditingPin] = useState<string | null>(null);

  useEffect(() => {
    // Clear strokes when switching away from annotate
    if (mode !== "annotate") { setPaths([]); setCurrent(null); }
  }, [mode]);

  if (mode === "none") return null;

  const rel = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: React.PointerEvent) => {
    if (mode === "annotate") {
      const { x, y } = rel(e);
      setCurrent(`M${x} ${y}`);
      (e.target as Element).setPointerCapture(e.pointerId);
    } else if (mode === "comment") {
      const target = e.target as Element;
      if (target.closest("[data-pin]")) return;
      const { x, y } = rel(e);
      const id = crypto.randomUUID();
      onPinsChange([...pins, { id, x, y, text: "" }]);
      setEditingPin(id);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (mode !== "annotate" || !current) return;
    const { x, y } = rel(e);
    setCurrent((p) => `${p} L${x} ${y}`);
  };
  const onUp = () => {
    if (mode === "annotate" && current) {
      setPaths((p) => [...p, current]);
      setCurrent(null);
    }
  };

  return (
    <div
      className="absolute inset-6 z-20"
      style={{ cursor: mode === "annotate" ? "crosshair" : "copy" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      {mode === "annotate" && (
        <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none">
          {paths.map((d, i) => (
            <path key={i} d={d} stroke="#00e5ff" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.9} />
          ))}
          {current && <path d={current} stroke="#00e5ff" strokeWidth={3} fill="none" strokeLinecap="round" />}
        </svg>
      )}

      {mode === "comment" && pins.map((pin, i) => (
        <div
          key={pin.id}
          data-pin
          className="absolute"
          style={{ left: pin.x - 12, top: pin.y - 12 }}
          onPointerDown={(e) => { e.stopPropagation(); setEditingPin(pin.id); }}
        >
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.6)] border-2 border-background cursor-pointer">
            {i + 1}
          </div>
          {editingPin === pin.id && (
            <div className="absolute left-8 top-0 w-56 p-2 bg-background border border-primary/40 rounded-lg shadow-xl z-30 space-y-1" onPointerDown={(e) => e.stopPropagation()}>
              <textarea
                autoFocus
                value={pin.text}
                onChange={(e) => onPinsChange(pins.map((p) => p.id === pin.id ? { ...p, text: e.target.value } : p))}
                placeholder="Komentár k tomuto miestu…"
                className="w-full text-xs font-mono bg-muted/40 rounded p-1.5 outline-none resize-none border border-border/40 focus:border-primary/50"
                rows={3}
              />
              <div className="flex justify-between">
                <button className="text-[10px] text-destructive hover:underline flex items-center gap-1"
                  onClick={() => { onPinsChange(pins.filter((p) => p.id !== pin.id)); setEditingPin(null); }}>
                  <Trash2 className="w-3 h-3" /> delete
                </button>
                <button className="text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setEditingPin(null)}>close</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Toolbar for comments (send batch) */}
      {mode === "comment" && pins.length > 0 && (
        <div className="absolute top-2 right-2 flex gap-1 pointer-events-auto">
          <Button size="sm" onClick={onSendComments} className="h-7 gap-1 text-xs">
            <Send className="w-3 h-3" /> Send {pins.length} to AI
          </Button>
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => onPinsChange([])}>
            <X className="w-3 h-3" /> Clear
          </Button>
        </div>
      )}
      {mode === "annotate" && paths.length > 0 && (
        <div className="absolute top-2 right-2 pointer-events-auto">
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setPaths([])}>
            <X className="w-3 h-3" /> Clear
          </Button>
        </div>
      )}
    </div>
  );
}
