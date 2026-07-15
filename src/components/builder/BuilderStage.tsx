import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  html: string;
  previewKey: number;
  isStreaming: boolean;
  zoom: number;
  deviceFrame: string;
  route: string;
  onIframeLoad: () => void;
  error?: string | null;
  onRetry?: () => void;
  onFixWithAi?: () => void;
}

/**
 * Preview "stage" — locks the generated app inside a compact card sitting on a
 * grid backdrop, with staggered reveal + shimmer skeleton while streaming, and
 * a clear error overlay + retry button when the iframe build fails.
 */
export default function BuilderStage({
  html, previewKey, isStreaming, zoom, deviceFrame, route, onIframeLoad,
  error, onRetry, onFixWithAi,
}: Props) {
  return (
    <div
      className="w-full h-full p-6 flex items-center justify-center overflow-auto relative bg-[radial-gradient(ellipse_at_center,_rgba(0,229,255,0.06),_transparent_60%)]"
      style={{
        backgroundImage: `linear-gradient(rgba(0,229,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.04) 1px,transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    >
      <motion.div
        layout
        className={cn(
          "relative flex flex-col bg-slate-950/90 backdrop-blur",
          "border border-primary/25 shadow-[0_0_60px_-10px_rgba(0,229,255,0.35)]",
          "rounded-2xl overflow-hidden",
          deviceFrame,
        )}
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: "center center",
          maxHeight: "min(72vh, 720px)",
        }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Chrome */}
        <div className="flex items-center gap-2 px-3 h-8 border-b border-border/40 bg-background/50 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-2 py-0.5 rounded bg-muted/40 border border-border/40 text-[10px] font-mono text-muted-foreground max-w-[60%] truncate">
              {route}
            </div>
          </div>
          <span className="w-10" />
        </div>

        {/* Preview surface */}
        <div className="relative flex-1 bg-slate-950">
          <AnimatePresence mode="wait">
            <motion.iframe
              key={previewKey}
              srcDoc={html}
              className="w-full h-full border-0 block"
              sandbox="allow-scripts"
              title="Live Preview"
              onLoad={onIframeLoad}
              initial={{ opacity: 0, scale: 0.995 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            />
          </AnimatePresence>

          {/* Streaming skeleton overlay */}
          <AnimatePresence>
            {isStreaming && !error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex flex-col gap-3 p-5 bg-slate-950/85 backdrop-blur-sm"
              >
                {[
                  "h-6 w-1/3",
                  "h-24 w-full",
                  "h-4 w-4/5",
                  "h-4 w-2/3",
                  "h-16 w-full",
                  "h-8 w-1/4",
                ].map((c, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={cn(
                      "rounded-md relative overflow-hidden",
                      "bg-gradient-to-r from-slate-800/50 via-primary/10 to-slate-800/50",
                      "bg-[length:200%_100%] animate-[shimmer_1.4s_ease-in-out_infinite]",
                      c,
                    )}
                  />
                ))}
                <div className="mt-auto flex items-center gap-2 text-[10px] font-mono text-primary/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  streaming component…
                </div>
                <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error overlay */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-sm"
              >
                <div className="max-w-md w-full rounded-xl border border-destructive/50 bg-destructive/10 p-4 space-y-3 shadow-[0_0_30px_-5px_rgba(255,80,80,0.35)]">
                  <div className="flex items-center gap-2 text-destructive font-mono text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    PREVIEW BUILD FAILED
                  </div>
                  <pre className="text-[11px] font-mono text-destructive/90 whitespace-pre-wrap break-words max-h-40 overflow-auto">
{error}
                  </pre>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    // JSX sa nepodarilo vyrenderovať. Skús retry alebo nechaj AI opraviť kód.
                  </p>
                  <div className="flex gap-2 pt-1">
                    {onRetry && (
                      <Button size="sm" variant="secondary" onClick={onRetry} className="h-7 gap-1 flex-1">
                        <RotateCw className="w-3 h-3" /> Retry
                      </Button>
                    )}
                    {onFixWithAi && (
                      <Button size="sm" variant="destructive" onClick={onFixWithAi} className="h-7 gap-1 flex-1">
                        <AlertTriangle className="w-3 h-3" /> Fix with AI
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
