import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download, ExternalLink } from "lucide-react";
import { useState } from "react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; onExport: () => void; }

export default function BuilderPublishSheet({ open, onOpenChange, onExport }: Props) {
  const [copied, setCopied] = useState("");
  const cmd = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 1500);
  };

  const netlify = "npx netlify-cli deploy --prod --dir=.";
  const vercel = "npx vercel --prod";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono">⚡ Publish app</DialogTitle>
          <DialogDescription>Export bundle a nasaď na akýkoľvek static host. Preview HTML je 100% samostatný — žiadny build.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-1">1. STIAHNI BUNDLE</p>
            <Button onClick={onExport} className="w-full gap-2" variant="secondary">
              <Download className="w-4 h-4" /> Download ZIP (index.html + App.jsx + README)
            </Button>
          </div>

          <div>
            <p className="text-xs font-mono text-muted-foreground mb-1">2. NASAĎ (rozbaľ ZIP a spusti v priečinku)</p>
            <div className="space-y-2">
              {[
                { id: "netlify", label: "Netlify", cmd: netlify, url: "https://netlify.com" },
                { id: "vercel", label: "Vercel", cmd: vercel, url: "https://vercel.com" },
              ].map((p) => (
                <div key={p.id} className="rounded-md border border-border/50 p-2 bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-semibold">{p.label}</span>
                    <a href={p.url} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5">
                      docs <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="flex items-center gap-1">
                    <code className="flex-1 text-[11px] font-mono bg-background/60 px-2 py-1 rounded truncate">{p.cmd}</code>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => cmd(p.id, p.cmd)}>
                      <Copy className="w-3 h-3" /> {copied === p.id ? "✓" : ""}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground">Tip: pre viac-route apps otvor každý `index.html` osobne alebo pridaj SPA fallback do host configu.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
