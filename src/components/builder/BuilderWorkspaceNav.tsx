import {
  Code2,
  Eye,
  GitCompare,
  History,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Version } from "@/lib/builder-versions";

export type WorkspaceView = "chat" | "preview" | "code" | "diff" | "console" | "versions";

const VIEWS = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "preview", label: "Preview", icon: Eye },
  { id: "code", label: "Code", icon: Code2 },
  { id: "diff", label: "Diff", icon: GitCompare },
  { id: "console", label: "Console", icon: Terminal },
  { id: "versions", label: "Versions", icon: History },
] as const;

interface Props {
  activeView: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  versions: Version[];
  search: string;
  onSearchChange: (value: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onRestoreVersion: (version: Version) => void;
}

export default function BuilderWorkspaceNav({
  activeView,
  onViewChange,
  expanded,
  onExpandedChange,
  versions,
  search,
  onSearchChange,
  onNewChat,
  onOpenSettings,
  onRestoreVersion,
}: Props) {
  const filtered = versions.filter((version) => version.prompt.toLowerCase().includes(search.toLowerCase())).slice(0, 12);

  return (
    <aside className="relative hidden h-full shrink-0 border-r border-border bg-card/40 md:flex">
      <nav className="flex w-14 flex-col items-center border-r border-border py-2" aria-label="Builder views">
        <div className="mb-3 flex size-9 items-center justify-center rounded-md border border-primary/30 bg-primary/10 font-mono text-[11px] font-bold text-primary">&gt;_</div>
        <div className="flex flex-1 flex-col gap-1">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={label}
                  onClick={() => onViewChange(id)}
                  className={cn("h-9 w-9 text-muted-foreground", activeView === id && "bg-primary/10 text-primary")}
                >
                  <Icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onOpenSettings} aria-label="Settings" className="h-9 w-9 text-muted-foreground"><Settings /></Button>
          </TooltipTrigger>
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>
      </nav>

      <div className={cn("overflow-hidden transition-[width] duration-200", expanded ? "w-64" : "w-0")}>
        <div className="flex h-full w-64 flex-col">
          <div className="flex h-12 items-center justify-between border-b border-border px-3">
            <span className="text-xs font-semibold">Builder history</span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => onExpandedChange(false)} aria-label="Collapse history"><PanelLeftClose /></Button>
          </div>
          <div className="space-y-2 border-b border-border p-3">
            <Button type="button" variant="outline" onClick={onNewChat} className="w-full justify-start text-xs"><Plus /> New build</Button>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search generations" className="h-8 pl-8 text-xs" />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">No saved generations yet.</p>
            ) : filtered.map((version) => (
              <Button
                key={version.id}
                type="button"
                variant="ghost"
                onClick={() => onRestoreVersion(version)}
                className="mb-1 h-auto w-full items-start justify-start whitespace-normal px-2 py-2 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs text-foreground">{version.prompt || "Untitled build"}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{version.route} · {new Date(version.timestamp).toLocaleDateString()}</p>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </div>
      {!expanded && (
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => onExpandedChange(true)} aria-label="Expand history" className="absolute left-14 top-3 z-30 h-7 w-7 border border-border bg-background"><PanelLeftOpen /></Button>
      )}
    </aside>
  );
}