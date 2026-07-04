import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, Tablet, RefreshCw, ExternalLink, Download, Zap, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  routes: string[];
  route: string;
  onRouteChange: (r: string) => void;
  onAddRoute: () => void;
  device: "mobile" | "tablet" | "desktop";
  onDeviceChange: (d: "mobile" | "tablet" | "desktop") => void;
  onRefresh: () => void;
  onOpenNew: () => void;
  onExport: () => void;
  onPublish: () => void;
}

export default function BuilderRouteBar({
  routes, route, onRouteChange, onAddRoute,
  device, onDeviceChange, onRefresh, onOpenNew, onExport, onPublish,
}: Props) {
  return (
    <div className="flex items-center gap-2 px-3 h-11 border-b border-border/50 bg-background/60 backdrop-blur-md">
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40 border border-border/40">
          <span className="w-2 h-2 rounded-full bg-red-500/70" />
          <span className="w-2 h-2 rounded-full bg-yellow-500/70" />
          <span className="w-2 h-2 rounded-full bg-green-500/70" />
        </div>
        <Select value={route} onValueChange={onRouteChange}>
          <SelectTrigger className="h-8 max-w-[240px] font-mono text-xs bg-muted/30 border-border/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {routes.map((r) => (
              <SelectItem key={r} value={r} className="font-mono text-xs">{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={onAddRoute} title="Add route" className="h-8 w-8 p-0">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/40 border border-border/40">
        {(["desktop", "tablet", "mobile"] as const).map((d) => {
          const Icon = d === "mobile" ? Smartphone : d === "tablet" ? Tablet : Monitor;
          return (
            <button
              key={d}
              onClick={() => onDeviceChange(d)}
              className={cn(
                "p-1.5 rounded-md transition-all",
                device === d
                  ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={d}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="sm" onClick={onRefresh} title="Refresh" className="h-8 w-8 p-0">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenNew} title="Open in new tab" className="h-8 w-8 p-0">
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onExport} title="Export ZIP" className="h-8 w-8 p-0">
          <Download className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          onClick={onPublish}
          className="h-8 gap-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40"
        >
          <Zap className="w-3.5 h-3.5" /> <span className="text-xs font-mono">PUBLISH</span>
        </Button>
      </div>
    </div>
  );
}
