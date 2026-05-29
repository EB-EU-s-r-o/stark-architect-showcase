import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Smartphone,
  Monitor,
  Tablet,
  Copy,
  Check,
  Sparkles,
  Code2,
  Eye,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  AlertTriangle,
  Wand2,
  RefreshCw,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildPreviewHtml, extractCodeFromResponse, validateJsx } from "@/lib/builder-preview";
import { BUILDER_PRESETS, saveToHistory, type GenerationHistoryItem } from "@/lib/builder-presets";
import { DEFAULT_MODEL_ID, FALLBACK_MODEL_ID, getModel, MODELS } from "@/lib/builder-models";
import { addToSession, approxTokens, calcCostUsd, formatCost, type Usage } from "@/lib/builder-cost";
import { cacheGet, cachePut, makeKey } from "@/lib/builder-cache";
import BuilderSettings from "@/components/BuilderSettings";
import BuilderModelPicker from "@/components/BuilderModelPicker";
import BuilderConsole, { type ConsoleEntry } from "@/components/BuilderConsole";
import BuilderCodeView from "@/components/BuilderCodeView";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  usage?: Usage;
  fromCache?: boolean;
  fallbackFrom?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-chat`;
const BYOK_KEY = "builder-byok-mistral";

const DEFAULT_CODE = `function App() {
  const [count, setCount] = React.useState(0);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">✨ AI Code Builder</h1>
        <p className="text-slate-400 mb-8">Vyber model · napíš prompt · live preview</p>
        <button
          onClick={() => setCount(c => c + 1)}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all"
        >
          Clicked {count} times
        </button>
      </div>
    </div>
  );
}`;

export default function BuilderDemo() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "👋 Vitaj! Vyber model (Gemini ready, Mistral cez secret/BYOK) a popíš čo postaviť. Skús: *„Pricing card s monthly/yearly toggle"*",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentCode, setCurrentCode] = useState(DEFAULT_CODE);
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [copied, setCopied] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [preset, setPreset] = useState("component");
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [darkPreview, setDarkPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [model, setModel] = useState<string>(DEFAULT_MODEL_ID);
  const [byokKey, setByokKey] = useState<string>(() => sessionStorage.getItem(BYOK_KEY) ?? "");
  const [fallbackEnabled, setFallbackEnabled] = useState(true);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [previewKey, setPreviewKey] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const consoleIdRef = useRef(0);
  const { toast } = useToast();

  const currentPreset = BUILDER_PRESETS.find((p) => p.id === preset);
  const currentModel = getModel(model);
  const isMistral = currentModel?.provider === "mistral";

  useEffect(() => {
    sessionStorage.setItem(BYOK_KEY, byokKey);
  }, [byokKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Iframe messages: preview errors + console output
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "preview-error") {
        setPreviewError(e.data.error);
      } else if (e.data?.type === "builder-console") {
        setConsoleEntries((prev) => {
          const next: ConsoleEntry = {
            id: ++consoleIdRef.current,
            level: e.data.level,
            args: e.data.args,
            ts: Date.now(),
          };
          const updated = [...prev, next];
          return updated.length > 200 ? updated.slice(-200) : updated;
        });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const streamChat = useCallback(
    async (
      allMessages: Message[],
      opts: { useModel: string; useByok?: string; presetOverride?: string }
    ): Promise<{ content: string; usage: Usage | null }> => {
      const controller = new AbortController();
      abortRef.current = controller;
      const startedAt = performance.now();
      let firstTokenAt = 0;
      let usage: Usage | null = null;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          preset: opts.presetOverride ?? preset,
          model: opts.useModel,
          customSystemPrompt: preset === "custom" ? customSystemPrompt : undefined,
          userApiKey: opts.useByok || undefined,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        const err = new Error(data.error || `HTTP ${resp.status}`) as Error & {
          status?: number;
          fallback?: string | null;
          provider?: string;
        };
        err.status = resp.status;
        err.fallback = data.fallback ?? null;
        err.provider = data.provider;
        throw err;
      }
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      const flushBuffer = () => {
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              if (!firstTokenAt) firstTokenAt = performance.now();
              fullContent += content;
              setTokenCount(approxTokens(fullContent));
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && last.id === "streaming") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: fullContent } : m
                  );
                }
                return [...prev, { id: "streaming", role: "assistant", content: fullContent }];
              });
            }
            // Both providers emit final usage chunk with choices=[] when stream_options.include_usage=true
            if (parsed.usage) {
              usage = {
                promptTokens: parsed.usage.prompt_tokens ?? 0,
                completionTokens: parsed.usage.completion_tokens ?? 0,
                model: opts.useModel,
                latencyMs: Math.round(performance.now() - startedAt),
              };
            }
          } catch {
            // partial chunk — put back
            buffer = line + "\n" + buffer;
            return;
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        flushBuffer();
      }
      // Flush remaining
      if (buffer.length) flushBuffer();

      if (!usage) {
        usage = {
          promptTokens: approxTokens(allMessages.map((m) => m.content).join("\n")),
          completionTokens: approxTokens(fullContent),
          model: opts.useModel,
          latencyMs: Math.round(performance.now() - startedAt),
        };
      }
      setLatencyMs(usage.latencyMs);
      return { content: fullContent, usage };
    },
    [preset, customSystemPrompt]
  );

  const applyGeneration = (
    code: string,
    promptText: string,
    usage: Usage,
    extra: { fromCache?: boolean; fallbackFrom?: string } = {}
  ) => {
    setCurrentCode(code);
    setPreviewKey((k) => k + 1);
    setConsoleEntries([]);
    setPreviewError(null);
    addToSession(usage);
    saveToHistory({ prompt: promptText, code, preset });
    // Finalize streaming message with metadata
    setMessages((prev) =>
      prev.map((m) =>
        m.id === "streaming"
          ? { ...m, id: Date.now().toString(), usage, ...extra }
          : m
      )
    );
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const promptText = input;
    setInput("");
    setIsStreaming(true);
    setPreviewError(null);
    setTokenCount(0);
    setLatencyMs(null);

    // Cache lookup
    try {
      const key = await makeKey({ model, prompt: promptText, preset, customSystemPrompt });
      const hit = cacheGet(key);
      if (hit) {
        const usage: Usage = {
          promptTokens: hit.promptTokens,
          completionTokens: hit.completionTokens,
          model: hit.model,
          latencyMs: hit.latencyMs,
        };
        setMessages((prev) => [
          ...prev,
          {
            id: "streaming",
            role: "assistant",
            content: "♻️ Načítané z cache",
          },
        ]);
        applyGeneration(hit.code, promptText, usage, { fromCache: true });
        setIsStreaming(false);
        return;
      }
    } catch (e) {
      console.warn("cache lookup failed", e);
    }

    const tryStream = async (useModel: string, fallbackFrom?: string) => {
      const { content, usage } = await streamChat(newMessages, {
        useModel,
        useByok: getModel(useModel)?.provider === "mistral" ? byokKey : undefined,
      });
      const code = extractCodeFromResponse(content);
      const validation = validateJsx(code);
      if (!validation.ok) {
        // still apply but flag
        toast({
          title: "JSX validation warning",
          description: validation.error.slice(0, 200),
        });
      }
      applyGeneration(code, promptText, usage!, fallbackFrom ? { fallbackFrom } : {});
      // Cache write
      try {
        const key = await makeKey({ model: useModel, prompt: promptText, preset, customSystemPrompt });
        cachePut({
          key,
          code,
          model: useModel,
          promptTokens: usage!.promptTokens,
          completionTokens: usage!.completionTokens,
          latencyMs: usage!.latencyMs,
          timestamp: Date.now(),
        });
      } catch {}
    };

    try {
      await tryStream(model);
    } catch (e: unknown) {
      if ((e as Error).name === "AbortError") {
        setMessages((prev) => prev.filter((m) => m.id !== "streaming"));
        setIsStreaming(false);
        abortRef.current = null;
        return;
      }
      const err = e as Error & { status?: number; fallback?: string | null };
      console.error("Stream error:", err);

      // Auto-fallback Mistral → Gemini
      const shouldFallback =
        fallbackEnabled &&
        isMistral &&
        (err.status === 429 || err.status === 401 || err.status === 402 || err.status === 502) &&
        err.fallback;

      if (shouldFallback) {
        toast({
          title: "Prepínam na Gemini",
          description: `Mistral vrátil ${err.status}. Pokračujem na ${err.fallback}.`,
        });
        try {
          setMessages((prev) => prev.filter((m) => m.id !== "streaming"));
          await tryStream(err.fallback!, model);
        } catch (e2: unknown) {
          const err2 = e2 as Error;
          toast({
            title: "Fallback zlyhal",
            description: err2.message || "Neznáma chyba",
            variant: "destructive",
          });
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== "streaming"),
            { id: Date.now().toString(), role: "assistant", content: `❌ ${err2.message}` },
          ]);
        }
      } else {
        let msg = err.message;
        if (err.status === 401 && isMistral)
          msg = "Mistral kľúč chýba alebo je nesprávny. Pridaj BYOK v Settings, alebo MISTRAL_API_KEY do projektových secrets.";
        if (err.status === 429) msg = "Rate limit. Skús o chvíľu znova.";
        if (err.status === 402) msg = "Credits exhausted. Doplň kredity v Lovable Cloud.";
        toast({ title: "Chyba", description: msg, variant: "destructive" });
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== "streaming"),
          { id: Date.now().toString(), role: "assistant", content: `❌ ${msg}` },
        ]);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleFixWithAi = async () => {
    if (isStreaming) return;
    const err = previewError || consoleEntries.filter((c) => c.level === "error").slice(-1)[0]?.args.join(" ");
    if (!err) return;

    setIsStreaming(true);
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: `Fix this React error: ${err}` },
      { id: "streaming", role: "assistant", content: "🔧 Opravujem..." },
    ]);

    try {
      const fixModel = isMistral && byokKey ? "codestral-latest" : "google/gemini-2.5-flash";
      const { content, usage } = await streamChat(
        [
          {
            id: "fix-user",
            role: "user",
            content: `Error: ${err}\n\nBroken code:\n\`\`\`jsx\n${currentCode}\n\`\`\`\n\nReturn the fixed component named App.`,
          },
        ],
        {
          useModel: fixModel,
          useByok: getModel(fixModel)?.provider === "mistral" ? byokKey : undefined,
          presetOverride: "fix",
        }
      );
      const fixed = extractCodeFromResponse(content);
      applyGeneration(fixed, `[Fix] ${err.slice(0, 80)}`, usage!);
      toast({ title: "Kód opravený", description: "Preview obnovený." });
    } catch (e: unknown) {
      const err2 = e as Error;
      toast({ title: "Auto-fix zlyhal", description: err2.message, variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "App.tsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadHistory = (item: GenerationHistoryItem) => {
    setCurrentCode(item.code);
    setPreset(item.preset);
    setPreviewError(null);
    setConsoleEntries([]);
    setPreviewKey((k) => k + 1);
  };

  const previewHtml = buildPreviewHtml(currentCode, darkPreview);
  const hasMistralKey = MODELS.some((m) => m.provider === "mistral"); // server might still have it; UI hint only

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-[128px]"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 h-14 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">AI Builder</span>
            </div>
            <span className="hidden sm:inline-block text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50">
              {currentPreset?.icon} {currentPreset?.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isStreaming && (
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span>{tokenCount} tok</span>
              </div>
            )}
            {latencyMs !== null && !isStreaming && (
              <span className="hidden md:inline text-xs text-muted-foreground">
                {(latencyMs / 1000).toFixed(2)}s
              </span>
            )}
            <BuilderModelPicker
              model={model}
              onChange={setModel}
              hasMistralKey={hasMistralKey}
              byokActive={!!byokKey}
            />
            <BuilderSettings
              preset={preset}
              onPresetChange={setPreset}
              customSystemPrompt={customSystemPrompt}
              onCustomSystemPromptChange={setCustomSystemPrompt}
              darkPreview={darkPreview}
              onDarkPreviewChange={setDarkPreview}
              onLoadHistory={handleLoadHistory}
              fallbackEnabled={fallbackEnabled}
              onFallbackEnabledChange={setFallbackEnabled}
              byokKey={byokKey}
              onByokKeyChange={setByokKey}
            />
          </div>
        </div>
      </header>

      <div className="relative z-10 flex h-[calc(100vh-3.5rem)]">
        {/* Chat */}
        <motion.div
          className={cn(
            "flex flex-col border-r border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-300",
            sidebarCollapsed ? "w-0 overflow-hidden" : "w-80 lg:w-96"
          )}
        >
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="font-medium">Chat</span>
            </div>
          </div>

          {messages.length <= 1 && currentPreset && (
            <div className="p-3 border-b border-border/50">
              <p className="text-xs text-muted-foreground mb-2">Try these:</p>
              <div className="space-y-1">
                {currentPreset.examplePrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(p)}
                    className="w-full text-left text-xs p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm space-y-1",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted/50 border border-border/50 rounded-bl-md"
                    )}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.usage && (
                      <div className="text-[10px] opacity-70 flex flex-wrap gap-x-2 pt-1 border-t border-current/10">
                        <span>⚡ {(message.usage.latencyMs / 1000).toFixed(2)}s</span>
                        <span>
                          {message.usage.promptTokens + message.usage.completionTokens} tok
                        </span>
                        <span>{formatCost(calcCostUsd(message.usage))}</span>
                        <span>· {getModel(message.usage.model)?.label}</span>
                        {message.fromCache && <span>· ♻️ cache</span>}
                        {message.fallbackFrom && (
                          <span>· ↩ from {getModel(message.fallbackFrom)?.label}</span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-border/50">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border/50 focus-within:border-primary/50 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Describe what to build..."
                className="flex-1 bg-transparent text-sm outline-none placeholder-muted-foreground px-2"
                disabled={isStreaming}
              />
              {isStreaming ? (
                <Button size="sm" variant="destructive" onClick={handleStop} className="rounded-lg">
                  <Square className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="rounded-lg"
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-r-lg bg-muted/50 border border-l-0 border-border/50 hover:bg-muted transition-colors"
          style={{ left: sidebarCollapsed ? 0 : "calc(24rem - 1px)" }}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Code */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between p-3 border-b border-border/50 bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Code</span>
              <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted/50">
                App.tsx
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleDownload} className="text-muted-foreground hover:text-foreground">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopy} className="text-muted-foreground hover:text-foreground">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-[#282c34]">
            <BuilderCodeView code={currentCode} />
          </div>
        </div>

        {/* Preview */}
        <div className="w-1/3 min-w-[360px] flex flex-col border-l border-border/50 bg-background/50 backdrop-blur-sm">
          <div className="flex items-center justify-between p-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Preview</span>
              {previewError && <AlertTriangle className="w-4 h-4 text-destructive" />}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewKey((k) => k + 1)}
                className="text-muted-foreground hover:text-foreground"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/30">
                {(["mobile", "tablet", "desktop"] as const).map((d) => {
                  const Icon = d === "mobile" ? Smartphone : d === "tablet" ? Tablet : Monitor;
                  return (
                    <button
                      key={d}
                      onClick={() => setDevice(d)}
                      className={cn(
                        "p-1.5 rounded transition-colors",
                        device === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {(previewError || consoleEntries.some((c) => c.level === "error")) && (
            <div className="px-3 py-2 bg-destructive/10 border-b border-destructive/30 flex items-center justify-between gap-2">
              <div className="text-xs text-destructive truncate">
                {previewError || "Runtime error v console"}
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleFixWithAi}
                disabled={isStreaming}
                className="shrink-0 h-7"
              >
                <Wand2 className="w-3 h-3 mr-1" />
                Fix with AI
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-hidden p-3">
            <div className="w-full h-full flex items-center justify-center">
              <div
                className={cn(
                  "overflow-hidden bg-slate-950 shadow-2xl",
                  device === "mobile" && "w-[375px] h-[667px] rounded-[2rem] border-4 border-slate-700",
                  device === "tablet" && "w-[768px] h-[500px] rounded-[1.5rem] border-4 border-slate-700",
                  device === "desktop" && "w-full h-full rounded-lg border border-border/50"
                )}
              >
                {device === "mobile" && (
                  <div className="relative z-10 h-6 flex justify-center items-center bg-slate-800">
                    <div className="w-20 h-4 bg-slate-900 rounded-full" />
                  </div>
                )}
                <iframe
                  key={previewKey}
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                  title="Live Preview"
                  onLoad={() => setPreviewError(null)}
                />
              </div>
            </div>
          </div>

          <BuilderConsole entries={consoleEntries} onClear={() => setConsoleEntries([])} />
        </div>
      </div>
    </div>
  );
}
