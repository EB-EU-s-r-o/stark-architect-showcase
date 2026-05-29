import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Trash2, History, ChevronDown, KeyRound, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BUILDER_PRESETS, getHistory, clearHistory, type GenerationHistoryItem } from "@/lib/builder-presets";
import { cacheClear } from "@/lib/builder-cache";
import { getSession, clearSession, formatCost } from "@/lib/builder-cost";
import { getModel } from "@/lib/builder-models";
import { cn } from "@/lib/utils";

interface BuilderSettingsProps {
  preset: string;
  onPresetChange: (preset: string) => void;
  customSystemPrompt: string;
  onCustomSystemPromptChange: (prompt: string) => void;
  darkPreview: boolean;
  onDarkPreviewChange: (dark: boolean) => void;
  onLoadHistory: (item: GenerationHistoryItem) => void;
  fallbackEnabled: boolean;
  onFallbackEnabledChange: (v: boolean) => void;
  byokKey: string;
  onByokKeyChange: (v: string) => void;
}

export default function BuilderSettings({
  preset,
  onPresetChange,
  customSystemPrompt,
  onCustomSystemPromptChange,
  darkPreview,
  onDarkPreviewChange,
  onLoadHistory,
  fallbackEnabled,
  onFallbackEnabledChange,
  byokKey,
  onByokKeyChange,
}: BuilderSettingsProps) {
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [, force] = useState(0);
  const history = getHistory();
  const session = getSession();

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="text-muted-foreground">
        <Settings className="w-4 h-4" />
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-96 bg-background border-l border-border z-50 overflow-y-auto"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">Settings</h3>
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-4 space-y-6">
                {/* Preset */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Output Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {BUILDER_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onPresetChange(p.id)}
                        className={cn(
                          "p-3 rounded-lg border text-left transition-all text-sm",
                          preset === p.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="text-lg mb-1">{p.icon}</div>
                        <div className="font-medium">{p.label}</div>
                        <div className="text-xs text-muted-foreground">{p.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {preset === "custom" && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">System Prompt</label>
                    <Textarea
                      value={customSystemPrompt}
                      onChange={(e) => onCustomSystemPromptChange(e.target.value)}
                      placeholder="Define how the AI should generate code..."
                      className="min-h-[120px] text-sm"
                    />
                  </div>
                )}

                {/* Mistral BYOK */}
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <label className="text-sm font-medium">Mistral API key (BYOK)</label>
                  </div>
                  <Input
                    type="password"
                    value={byokKey}
                    onChange={(e) => onByokKeyChange(e.target.value)}
                    placeholder="sk-... (session-only)"
                    className="text-xs font-mono"
                  />
                  {byokKey && (
                    <div className="flex items-start gap-1.5 text-[11px] text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>
                        Kľúč žije iba v session storage tejto karty. Pre produkciu pridaj do projektových secrets.
                      </span>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Získaj na console.mistral.ai → API Keys. Ak nezadáš, použije sa serverový secret (ak existuje).
                  </p>
                </div>

                {/* Auto-fallback */}
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">Auto-fallback na Gemini</div>
                    <div className="text-[11px] text-muted-foreground">
                      Pri 429/401/5xx z Mistral automaticky prepne na Gemini.
                    </div>
                  </div>
                  <Switch checked={fallbackEnabled} onCheckedChange={onFallbackEnabledChange} />
                </div>

                {/* Preview theme */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Preview Theme</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onDarkPreviewChange(true)}
                      className={cn(
                        "flex-1 p-3 rounded-lg border text-sm font-medium transition-all",
                        darkPreview ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                      )}
                    >
                      🌙 Dark
                    </button>
                    <button
                      onClick={() => onDarkPreviewChange(false)}
                      className={cn(
                        "flex-1 p-3 rounded-lg border text-sm font-medium transition-all",
                        !darkPreview ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                      )}
                    >
                      ☀️ Light
                    </button>
                  </div>
                </div>

                {/* Session cost */}
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Session usage</span>
                    <span className="text-sm font-mono text-primary">{formatCost(session.total)}</span>
                  </div>
                  {Object.keys(session.byModel).length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Žiadne generácie zatiaľ.</p>
                  ) : (
                    <div className="space-y-1">
                      {Object.entries(session.byModel).map(([id, v]) => (
                        <div key={id} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground truncate">{getModel(id)?.label ?? id}</span>
                          <span className="font-mono">
                            {v.calls}× · {v.tokens} tok · {formatCost(v.cost)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearSession();
                      force((n) => n + 1);
                    }}
                    className="w-full text-xs"
                  >
                    Reset session usage
                  </Button>
                </div>

                {/* Cache */}
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      cacheClear();
                      force((n) => n + 1);
                    }}
                    className="w-full"
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Clear generation cache
                  </Button>
                </div>

                {/* History */}
                <div>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground mb-2"
                  >
                    <span className="flex items-center gap-2">
                      <History className="w-4 h-4" />
                      History ({history.length})
                    </span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform", showHistory && "rotate-180")} />
                  </button>

                  {showHistory && (
                    <div className="space-y-2">
                      {history.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No history yet</p>
                      ) : (
                        <>
                          {history.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                onLoadHistory(item);
                                setOpen(false);
                              }}
                              className="w-full p-2 rounded-lg border border-border hover:border-primary/50 text-left text-xs transition-all"
                            >
                              <div className="font-medium truncate">{item.prompt}</div>
                              <div className="text-muted-foreground mt-1">
                                {new Date(item.timestamp).toLocaleString()}
                              </div>
                            </button>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              clearHistory();
                              setShowHistory(false);
                            }}
                            className="w-full text-destructive"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Clear history
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
