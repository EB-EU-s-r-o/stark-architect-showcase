import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface RouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (route: string) => void;
}

export function BuilderRouteDialog({ open, onOpenChange, onCreate }: RouteDialogProps) {
  const [route, setRoute] = useState("/");
  useEffect(() => { if (open) setRoute("/"); }, [open]);
  const normalized = route.startsWith("/") ? route : `/${route}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New route</DialogTitle>
          <DialogDescription>Add another page to the generated app.</DialogDescription>
        </DialogHeader>
        <Input value={route} onChange={(event) => setRoute(event.target.value)} placeholder="/about" autoFocus />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={normalized === "/"} onClick={() => onCreate(normalized)}>Create route</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (staged: boolean) => void;
}

export function BuilderExportDialog({ open, onOpenChange, onExport }: ExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export ZIP</DialogTitle>
          <DialogDescription>Choose how the generated page should open outside Builder.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" className="h-auto items-start justify-start whitespace-normal p-4 text-left" onClick={() => onExport(false)}>
            <Download className="mt-0.5" />
            <span><strong className="block">Full page</strong><small className="text-muted-foreground">Production-ready full viewport.</small></span>
          </Button>
          <Button variant="outline" className="h-auto items-start justify-start whitespace-normal p-4 text-left" onClick={() => onExport(true)}>
            <Download className="mt-0.5" />
            <span><strong className="block">Staged preview</strong><small className="text-muted-foreground">Compact animated presentation.</small></span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}