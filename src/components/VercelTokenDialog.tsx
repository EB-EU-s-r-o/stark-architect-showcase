import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Loader2, ExternalLink, Unplug } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchVercelProjects,
  getVercelToken,
  setVercelToken,
  clearVercelToken,
  getSelectedProjects,
  setSelectedProjects,
  getProductionUrl,
  getScreenshotUrl,
  getRepoUrl,
  toSelectedProject,
  type VercelProject,
  type SelectedProject,
} from "@/lib/vercel";

interface Props {
  onProjectsChange: (projects: SelectedProject[]) => void;
}

const VercelTokenDialog = ({ onProjectsChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<VercelProject[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"token" | "select">("token");
  const isConnected = !!getVercelToken();

  useEffect(() => {
    const saved = getSelectedProjects();
    if (saved.length) {
      setSelectedIds(new Set(saved.map((p) => p.id)));
    }
  }, []);

  const handleConnect = async () => {
    if (!token.trim()) return;
    setLoading(true);
    try {
      const fetched = await fetchVercelProjects(token.trim());
      setVercelToken(token.trim());
      setProjects(fetched);
      setStep("select");
      toast({ title: `${fetched.length} projektov načítaných` });
    } catch (e: any) {
      toast({ title: "Chyba", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    clearVercelToken();
    setProjects([]);
    setSelectedIds(new Set());
    setStep("token");
    setToken("");
    onProjectsChange([]);
    toast({ title: "Vercel odpojený" });
  };

  const toggleProject = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 8) {
        next.add(id);
      } else {
        toast({ title: "Maximum 8 projektov", variant: "destructive" });
      }
      return next;
    });
  };

  const handleSave = () => {
    const selected = projects
      .filter((p) => selectedIds.has(p.id))
      .map(toSelectedProject);
    setSelectedProjects(selected);
    onProjectsChange(selected);
    setOpen(false);
    toast({ title: `${selected.length} projektov uložených` });
  };

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && isConnected) {
      const savedToken = getVercelToken();
      if (savedToken) {
        setToken(savedToken);
        setLoading(true);
        try {
          const fetched = await fetchVercelProjects(savedToken);
          setProjects(fetched);
          setStep("select");
        } catch {
          setStep("token");
        } finally {
          setLoading(false);
        }
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant={isConnected ? "outline" : "default"}
          className="gap-2 font-mono text-xs"
        >
          {isConnected ? (
            <>
              <Settings className="w-4 h-4" /> Vercel Connected
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4" /> Connect Vercel
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">
            {step === "token" ? "Pripojiť Vercel" : `Vybrať projekty (${selectedIds.size}/8)`}
          </DialogTitle>
        </DialogHeader>

        {step === "token" ? (
          <div className="space-y-4 pt-2">
            <p className="text-muted-foreground font-mono text-sm">
              Zadaj svoj Vercel API token pre načítanie projektov. Token ostáva len v tvojom prehliadači.
            </p>
            <Input
              type="password"
              placeholder="vercel_xxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="font-mono"
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            />
            <div className="flex gap-2">
              <Button onClick={handleConnect} disabled={loading || !token.trim()} className="gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Pripojiť
              </Button>
              {isConnected && (
                <Button variant="destructive" onClick={handleDisconnect} className="gap-2">
                  <Unplug className="w-4 h-4" /> Odpojiť
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projects.map((project) => {
                    const prodUrl = getProductionUrl(project);
                    const checked = selectedIds.has(project.id);
                    return (
                      <div
                        key={project.id}
                        onClick={() => toggleProject(project.id)}
                        className={`cursor-pointer border rounded p-3 transition-all ${
                          checked
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        {prodUrl && (
                          <div className="aspect-video mb-2 rounded overflow-hidden bg-secondary">
                            <img
                              src={getScreenshotUrl(prodUrl)}
                              alt={project.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={checked}
                            className="mt-1 shrink-0"
                            onCheckedChange={() => toggleProject(project.id)}
                          />
                          <div className="min-w-0">
                            <p className="font-mono text-sm text-foreground truncate">{project.name}</p>
                            {project.framework && (
                              <span className="text-mono text-[10px] text-muted-foreground">
                                {project.framework}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={handleDisconnect} className="gap-2 font-mono text-xs">
                    <Unplug className="w-4 h-4" /> Odpojiť
                  </Button>
                  <Button onClick={handleSave} disabled={selectedIds.size === 0} className="font-mono text-xs">
                    Uložiť výber ({selectedIds.size})
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VercelTokenDialog;
