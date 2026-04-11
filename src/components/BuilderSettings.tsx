import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Trash2, History, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BUILDER_PRESETS, getHistory, clearHistory, type GenerationHistoryItem } from "@/lib/builder-presets";
import { cn } from "@/lib/utils";

interface BuilderSettingsProps {
  preset: string;
  onPresetChange: (preset: string) => void;
  customSystemPrompt: string;
  onCustomSystemPromptChange: (prompt: string) => void;
  darkPreview: boolean;
  onDarkPreviewChange: (dark: boolean) => void;
  onLoadHistory: (item: GenerationHistoryItem) => void;
}

export default function BuilderSettings({
  preset,
  onPresetChange,
  customSystemPrompt,
  onCustomSystemPromptChange,
  darkPreview,
  onDarkPreviewChange,
  onLoadHistory,
}: BuilderSettingsProps) {
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const history = getHistory();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground"
      >
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
              className="fixed right-0 top-0 h-full w-80 bg-background border-l border-border z-50 overflow-y-auto"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">Settings</h3>
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-4 space-y-6">
                {/* Preset selector */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Output Type
                  </label>
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

                {/* Custom system prompt */}
                {preset === "custom" && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      System Prompt
                    </label>
                    <Textarea
                      value={customSystemPrompt}
                      onChange={(e) => onCustomSystemPromptChange(e.target.value)}
                      placeholder="Define how the AI should generate code..."
                      className="min-h-[120px] text-sm"
                    />
                  </div>
                )}

                {/* Preview theme */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Preview Theme
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onDarkPreviewChange(true)}
                      className={cn(
                        "flex-1 p-3 rounded-lg border text-sm font-medium transition-all",
                        darkPreview
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      🌙 Dark
                    </button>
                    <button
                      onClick={() => onDarkPreviewChange(false)}
                      className={cn(
                        "flex-1 p-3 rounded-lg border text-sm font-medium transition-all",
                        !darkPreview
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      ☀️ Light
                    </button>
                  </div>
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
