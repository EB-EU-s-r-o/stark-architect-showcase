import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Sparkles, Copy, Check, Loader2, Square, Wand2, AlertTriangle,
  ChevronLeft, ChevronRight, ImagePlus, X, History, Code2, Eye, Terminal, GitCompare, ZoomIn, ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { buildPreviewHtml, extractCodeFromResponse, validateJsx } from "@/lib/builder-preview";
import { BUILDER_PRESETS, saveToHistory, type GenerationHistoryItem } from "@/lib/builder-presets";
import { DEFAULT_MODEL_ID, getModel, MODELS } from "@/lib/builder-models";
import { addToSession, approxTokens, calcCostUsd, formatCost, type Usage } from "@/lib/builder-cost";
import { cacheGet, cachePut, makeKey } from "@/lib/builder-cache";
import { getVersions, pushVersion, type Version } from "@/lib/builder-versions";
import { exportBundle } from "@/lib/builder-export";
import { detectRouteFromPrompt, loadRoutes, saveRoutes, type RouteMap } from "@/lib/builder-router";
import BuilderSettings from "@/components/BuilderSettings";
import BuilderModelPicker from "@/components/BuilderModelPicker";
import BuilderConsole, { type ConsoleEntry } from "@/components/BuilderConsole";
import BuilderCodeView from "@/components/BuilderCodeView";
import BuilderRouteBar from "@/components/builder/BuilderRouteBar";
import BuilderFloatingToolbar, { type BuilderTool } from "@/components/builder/BuilderFloatingToolbar";
import BuilderVersions from "@/components/builder/BuilderVersions";
import BuilderDiffView from "@/components/builder/BuilderDiffView";
import BuilderOverlay, { type Pin } from "@/components/builder/BuilderOverlay";
import BuilderPublishSheet from "@/components/builder/BuilderPublishSheet";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  usage?: Usage;
  fromCache?: boolean;
  fallbackFrom?: string;
  imageDataUrl?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-chat`;
const BYOK_KEY = "builder-byok-mistral";

const DEFAULT_CODE = `function App() {
  const [count, setCount] = React.useState(0);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950/20 to-slate-900 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm mb-6 font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> BUILDER.LIVE
        </div>
        <h1 className="text-6xl font-bold text-white mb-4 font-mono">&gt;_ AI BUILDER</h1>
        <p className="text-slate-400 mb-8 font-mono text-sm">// Napíš prompt vľavo · live preview vpravo · edit inline</p>
        <button
          onClick={() => setCount(c => c + 1)}
          className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold font-mono transition-all shadow-[0_0_30px_rgba(0,229,255,0.5)]"
        >
          CLICKS: {count}
        </button>
      </div>
    </div>
  );
}`;

export default function BuilderDemo() {
  const { toast } = useToast();

  // Routes / code
  const [routes, setRoutes] = useState<RouteMap>(() => loadRoutes() ?? { "/": DEFAULT_CODE });
  const [activeRoute, setActiveRoute] = useState<string>("/");
  const currentCode = routes[activeRoute] ?? DEFAULT_CODE;
  const [previousCode, setPreviousCode] = useState<string>(currentCode);

  useEffect(() => { saveRoutes(routes); }, [routes]);

  const setCodeForRoute = (route: string, code: string) => {
    setPreviousCode(routes[route] ?? "");
    setRoutes((r) => ({ ...r, [route]: code }));
  };

  // Chat
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: '👋 Vitaj v AI Builderi. Popíš čo postaviť — alebo klikni "Iterate" na existujúci kód. Prílohy obrázkov idú do Gemini vision. Skús: *„pridaj cyan glow na button"*',
    },
  ]);
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Settings / model
  const [preset, setPreset] = useState("component");
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [darkPreview, setDarkPreview] = useState(true);
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [byokKey, setByokKey] = useState<string>(() => sessionStorage.getItem(BYOK_KEY) ?? "");
  const [fallbackEnabled, setFallbackEnabled] = useState(true);

  // Preview state
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [tool, setTool] = useState<BuilderTool>("none");
  const [selectedEl, setSelectedEl] = useState<{ tag: string; classes: string; text: string } | null>(null);

  // Versions + bottom tab
  const [versions, setVersions] = useState<Version[]>(() => getVersions());
  const [bottomTab, setBottomTab] = useState<string>("preview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  // NEW: comments, zoom, publish, mobile chat tab
  const [pins, setPins] = useState<Pin[]>(() => {
    try { return JSON.parse(sessionStorage.getItem("builder-pins") || "[]"); } catch { return []; }
  });
  const [zoom, setZoom] = useState(100);
  const [publishOpen, setPublishOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"chat" | "preview">("preview");
  useEffect(() => { try { sessionStorage.setItem("builder-pins", JSON.stringify(pins)); } catch {} }, [pins]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const consoleIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPreset = BUILDER_PRESETS.find((p) => p.id === preset);
  const currentModel = getModel(model);
  const isMistral = currentModel?.provider === "mistral";

  useEffect(() => { sessionStorage.setItem(BYOK_KEY, byokKey); }, [byokKey]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // iframe messages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "preview-error") setPreviewError(e.data.error);
      else if (e.data?.type === "builder-console") {
        setConsoleEntries((prev) => {
          const next: ConsoleEntry = { id: ++consoleIdRef.current, level: e.data.level, args: e.data.args, ts: Date.now() };
          const upd = [...prev, next];
          return upd.length > 200 ? upd.slice(-200) : upd;
        });
      } else if (e.data?.type === "builder-select") {
        setSelectedEl(e.data.el);
      } else if (e.data?.type === "builder-text-edit") {
        const { from, to } = e.data as { from: string; to: string };
        if (from && to && from !== to) {
          const patched = (routes[activeRoute] || "").split(from).join(to);
          if (patched !== routes[activeRoute]) {
            setCodeForRoute(activeRoute, patched);
            toast({ title: "Text upravený", description: `"${from.slice(0, 30)}" → "${to.slice(0, 30)}"` });
          } else {
            toast({ title: "Text nenájdený v kóde", description: "Použiť Ask AI namiesto inline edit.", variant: "destructive" });
          }
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [routes, activeRoute, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === "/") { e.preventDefault(); setSidebarCollapsed((v) => !v); }
      else if (e.key.toLowerCase() === "r" && e.shiftKey) { e.preventDefault(); setPreviewKey((k) => k + 1); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const streamChat = useCallback(async (
    allMessages: Message[],
    opts: { useModel: string; useByok?: string; presetOverride?: string; codeCtx?: string; imageDataUrl?: string }
  ): Promise<{ content: string; usage: Usage | null }> => {
    const controller = new AbortController();
    abortRef.current = controller;
    const startedAt = performance.now();
    let usage: Usage | null = null;

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({
        messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        preset: opts.presetOverride ?? preset,
        model: opts.useModel,
        customSystemPrompt: preset === "custom" ? customSystemPrompt : undefined,
        userApiKey: opts.useByok || undefined,
        currentCode: opts.codeCtx,
        imageDataUrl: opts.imageDataUrl,
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
      const err = new Error(data.error || `HTTP ${resp.status}`) as Error & { status?: number; fallback?: string | null; provider?: string };
      err.status = resp.status; err.fallback = data.fallback ?? null; err.provider = data.provider;
      throw err;
    }
    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = ""; let fullContent = "";

    const flush = () => {
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            fullContent += content;
            setTokenCount(approxTokens(fullContent));
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && last.id === "streaming") {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: fullContent } : m);
              }
              return [...prev, { id: "streaming", role: "assistant", content: fullContent }];
            });
          }
          if (parsed.usage) {
            usage = {
              promptTokens: parsed.usage.prompt_tokens ?? 0,
              completionTokens: parsed.usage.completion_tokens ?? 0,
              model: opts.useModel,
              latencyMs: Math.round(performance.now() - startedAt),
            };
          }
        } catch {
          buffer = line + "\n" + buffer; return;
        }
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      flush();
    }
    if (buffer.length) flush();

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
  }, [preset, customSystemPrompt]);

  const applyGeneration = (route: string, code: string, promptText: string, usage: Usage, extra: { fromCache?: boolean; fallbackFrom?: string } = {}) => {
    setCodeForRoute(route, code);
    setPreviewKey((k) => k + 1);
    setConsoleEntries([]); setPreviewError(null);
    addToSession(usage);
    saveToHistory({ prompt: promptText, code, preset });
    pushVersion({ code, prompt: promptText, route, model: usage.model });
    setVersions(getVersions());
    setMessages((prev) => prev.map((m) => m.id === "streaming" ? { ...m, id: Date.now().toString(), usage, ...extra } : m));
  };

  const handleAttachImage = (file: File) => {
    if (file.size > 4 * 1024 * 1024) { toast({ title: "Max 4MB", variant: "destructive" }); return; }
    const r = new FileReader();
    r.onload = () => setAttachedImage(r.result as string);
    r.readAsDataURL(file);
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedImage) || isStreaming) return;
    const promptText = input;
    const image = attachedImage;
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: promptText || "(image)", imageDataUrl: image ?? undefined };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput(""); setAttachedImage(null);
    setIsStreaming(true); setPreviewError(null); setTokenCount(0); setLatencyMs(null);

    if (image && isMistral) {
      toast({ title: "Vision → Gemini", description: "Mistral vision nie je podporovaný, prepínam na Gemini pre tento prompt." });
    }
    const modelForCall = image && isMistral ? "google/gemini-2.5-flash" : model;

    // Detect target route from prompt
    const detected = detectRouteFromPrompt(promptText);
    const targetRoute = detected && detected !== activeRoute && !routes[detected] ? detected : activeRoute;
    if (detected && !routes[detected]) {
      setRoutes((r) => ({ ...r, [detected]: "" }));
      setActiveRoute(detected);
    }

    // Cache lookup (skip when image attached — vision is not deterministic-ish)
    if (!image) {
      try {
        const key = await makeKey({ model: modelForCall, prompt: promptText, preset: `${preset}|${targetRoute}|${(routes[targetRoute] || "").slice(0, 200)}`, customSystemPrompt, byokHint: byokKey });
        const hit = cacheGet(key);
        if (hit) {
          const usage: Usage = { promptTokens: hit.promptTokens, completionTokens: hit.completionTokens, model: hit.model, latencyMs: hit.latencyMs };
          setMessages((p) => [...p, { id: "streaming", role: "assistant", content: "♻️ Cache" }]);
          applyGeneration(targetRoute, hit.code, promptText, usage, { fromCache: true });
          setIsStreaming(false); return;
        }
      } catch {}
    }

    const tryStream = async (useModel: string, fallbackFrom?: string) => {
      const { content, usage } = await streamChat(newMessages, {
        useModel,
        useByok: getModel(useModel)?.provider === "mistral" ? byokKey : undefined,
        codeCtx: routes[targetRoute] || undefined,
        imageDataUrl: image ?? undefined,
      });
      const code = extractCodeFromResponse(content);
      const v = validateJsx(code);
      if (v.ok === false) toast({ title: "JSX warning", description: v.error.slice(0, 200) });
      applyGeneration(targetRoute, code, promptText, usage!, fallbackFrom ? { fallbackFrom } : {});
      if (!image) {
        try {
          const key = await makeKey({ model: useModel, prompt: promptText, preset: `${preset}|${targetRoute}|${(routes[targetRoute] || "").slice(0, 200)}`, customSystemPrompt, byokHint: byokKey });
          cachePut({ key, code, model: useModel, promptTokens: usage!.promptTokens, completionTokens: usage!.completionTokens, latencyMs: usage!.latencyMs, timestamp: Date.now() });
        } catch {}
      }
    };

    try { await tryStream(modelForCall); }
    catch (e: unknown) {
      if ((e as Error).name === "AbortError") {
        setMessages((p) => p.filter((m) => m.id !== "streaming"));
        setIsStreaming(false); abortRef.current = null; return;
      }
      const err = e as Error & { status?: number; fallback?: string | null };
      const shouldFallback = fallbackEnabled && isMistral && (err.status === 429 || err.status === 401 || err.status === 402 || err.status === 502) && err.fallback;
      if (shouldFallback) {
        toast({ title: "Prepínam na Gemini", description: `Mistral ${err.status} → ${err.fallback}` });
        try {
          setMessages((p) => p.filter((m) => m.id !== "streaming"));
          await tryStream(err.fallback!, model);
        } catch (e2: unknown) {
          const err2 = e2 as Error;
          toast({ title: "Fallback zlyhal", description: err2.message, variant: "destructive" });
          setMessages((p) => [...p.filter((m) => m.id !== "streaming"), { id: Date.now().toString(), role: "assistant", content: `❌ ${err2.message}` }]);
        }
      } else {
        let msg = err.message;
        if (err.status === 401 && isMistral) msg = "Mistral kľúč chýba/nesprávny. BYOK v Settings alebo MISTRAL_API_KEY do secrets.";
        if (err.status === 429) msg = "Rate limit. Skús o chvíľu.";
        if (err.status === 402) msg = "Credits exhausted.";
        toast({ title: "Chyba", description: msg, variant: "destructive" });
        setMessages((p) => [...p.filter((m) => m.id !== "streaming"), { id: Date.now().toString(), role: "assistant", content: `❌ ${msg}` }]);
      }
    } finally {
      setIsStreaming(false); abortRef.current = null;
    }
  };

  const handleStop = () => abortRef.current?.abort();

  const handleFixWithAi = async () => {
    if (isStreaming) return;
    const err = previewError || consoleEntries.filter((c) => c.level === "error").slice(-1)[0]?.args.join(" ");
    if (!err) return;
    setIsStreaming(true);
    setMessages((p) => [...p,
      { id: Date.now().toString(), role: "user", content: `Fix: ${err}` },
      { id: "streaming", role: "assistant", content: "🔧 Opravujem..." },
    ]);
    try {
      const fixModel = isMistral && byokKey ? "codestral-latest" : "google/gemini-2.5-flash";
      const { content, usage } = await streamChat(
        [{ id: "fix-user", role: "user", content: `Error: ${err}\n\nBroken code:\n\`\`\`jsx\n${currentCode}\n\`\`\`\n\nReturn fixed component named App.` }],
        { useModel: fixModel, useByok: getModel(fixModel)?.provider === "mistral" ? byokKey : undefined, presetOverride: "fix" }
      );
      applyGeneration(activeRoute, extractCodeFromResponse(content), `[Fix] ${err.slice(0, 80)}`, usage!);
      toast({ title: "Kód opravený" });
    } catch (e: unknown) {
      toast({ title: "Auto-fix zlyhal", description: (e as Error).message, variant: "destructive" });
    } finally { setIsStreaming(false); }
  };

  const handleAskAboutSelection = () => {
    if (!selectedEl) return;
    const desc = `<${selectedEl.tag}${selectedEl.classes ? ` class="${selectedEl.classes.slice(0, 120)}"` : ""}>${selectedEl.text ? ` (text: "${selectedEl.text.slice(0, 60)}")` : ""}`;
    setInput((v) => v ? v : `Zmeň tento element: ${desc}`);
    setTool("none"); setSelectedEl(null);
  };

  const handleAddRoute = () => {
    const name = prompt("Route path (napr. /about)")?.trim();
    if (!name || !name.startsWith("/")) return;
    if (routes[name]) { setActiveRoute(name); return; }
    setRoutes((r) => ({ ...r, [name]: DEFAULT_CODE }));
    setActiveRoute(name);
    toast({ title: `Route ${name} pridaná` });
  };

  const previewHtml = useMemo(
    () => buildPreviewHtml(currentCode, darkPreview, { inspectorMode: tool === "select", textEditMode: tool === "text" }),
    [currentCode, darkPreview, tool]
  );

  const handleOpenNew = () => {
    const w = window.open("", "_blank");
    if (w) { w.document.write(previewHtml); w.document.close(); }
  };

  const handleCopy = () => { navigator.clipboard.writeText(currentCode); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleExport = () => exportBundle(currentCode, `builder${activeRoute === "/" ? "-root" : activeRoute.replace(/\//g, "-")}`);
  const handlePublish = () => setPublishOpen(true);

  const handleRestoreVersion = (v: Version) => {
    setPreviousCode(currentCode);
    setRoutes((r) => ({ ...r, [v.route]: v.code }));
    if (v.route !== activeRoute) setActiveRoute(v.route);
    setPreviewKey((k) => k + 1);
    toast({ title: "Verzia obnovená", description: new Date(v.timestamp).toLocaleTimeString() });
  };

  const handleSendComments = async () => {
    if (!pins.length || isStreaming) return;
    const batch = pins.map((p, i) => `${i + 1}. [${Math.round(p.x)},${Math.round(p.y)}] ${p.text || "(no text)"}`).join("\n");
    setInput(`Aplikuj tieto komentáre na aktuálny komponent:\n${batch}`);
    setPins([]);
    setTool("none");
    toast({ title: "Komentáre v composeri", description: "Skontroluj a stlač Send." });
  };

  const routeList = Object.keys(routes);
  const hasMistralKey = MODELS.some((m) => m.provider === "mistral");

  const deviceFrame = {
    mobile: "w-[390px] h-[680px] rounded-[2.2rem] border-[10px] border-slate-800 shadow-[0_0_40px_rgba(0,229,255,0.15)]",
    tablet: "w-[820px] h-[560px] rounded-[1.5rem] border-[8px] border-slate-800 shadow-[0_0_40px_rgba(0,229,255,0.12)]",
    desktop: "w-full h-full rounded-xl border border-primary/20 shadow-[0_0_50px_rgba(0,229,255,0.08)]",
  }[device];

  return (
    <div className="h-screen w-screen bg-background overflow-hidden flex flex-col">
      {/* Header */}
      <header className="relative z-20 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 h-12 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-primary/10 border border-primary/30">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-mono font-semibold text-primary">&gt;_ BUILDER</span>
            </div>
            <span className="hidden sm:inline text-[11px] text-muted-foreground font-mono">
              {currentPreset?.icon} {currentPreset?.label}
            </span>
            {isStreaming && (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />{tokenCount} tok
              </span>
            )}
            {latencyMs !== null && !isStreaming && (
              <span className="hidden md:inline text-[11px] text-muted-foreground font-mono">{(latencyMs / 1000).toFixed(2)}s</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Mobile chat/preview switcher */}
            <div className="md:hidden flex items-center rounded-md bg-muted/40 p-0.5 mr-1">
              <button onClick={() => setMobileView("chat")} className={cn("text-[10px] px-2 py-1 rounded font-mono", mobileView === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>CHAT</button>
              <button onClick={() => setMobileView("preview")} className={cn("text-[10px] px-2 py-1 rounded font-mono", mobileView === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>PREVIEW</button>
            </div>
            <BuilderModelPicker model={model} onChange={setModel} hasMistralKey={hasMistralKey} byokActive={!!byokKey} />
            <BuilderSettings
              preset={preset} onPresetChange={setPreset}
              customSystemPrompt={customSystemPrompt} onCustomSystemPromptChange={setCustomSystemPrompt}
              darkPreview={darkPreview} onDarkPreviewChange={setDarkPreview}
              onLoadHistory={(h: GenerationHistoryItem) => { setCodeForRoute(activeRoute, h.code); setPreset(h.preset); setPreviewKey((k) => k + 1); }}
              fallbackEnabled={fallbackEnabled} onFallbackEnabledChange={setFallbackEnabled}
              byokKey={byokKey} onByokKeyChange={setByokKey}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 relative">
        {/* CHAT PANEL */}
        <motion.aside
          animate={{ width: sidebarCollapsed ? 0 : 400 }}
          className={cn(
            "border-r border-border/50 bg-background/40 backdrop-blur-sm flex flex-col overflow-hidden shrink-0",
            "md:flex",
            mobileView === "chat" ? "flex absolute inset-0 z-30 md:relative md:z-auto md:!w-[400px]" : "hidden md:flex"
          )}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length <= 1 && currentPreset && (
              <div className="mb-4">
                <p className="text-[10px] font-mono text-muted-foreground mb-2">// TRY THESE</p>
                <div className="space-y-1">
                  {currentPreset.examplePrompts.map((p, i) => (
                    <button key={i} onClick={() => setInput(p)}
                      className="w-full text-left text-xs p-2 rounded-md bg-muted/30 hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/30 transition-all text-muted-foreground font-mono">
                      &gt; {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <AnimatePresence mode="popLayout">
              {messages.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[92%] rounded-xl px-3 py-2 text-sm space-y-1",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 border border-border/40"
                  )}>
                    {m.imageDataUrl && <img src={m.imageDataUrl} alt="attached" className="rounded-md max-h-40 mb-1" />}
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    {m.usage && (
                      <div className="text-[10px] opacity-70 flex flex-wrap gap-x-2 pt-1 border-t border-current/10 font-mono">
                        <span>⚡{(m.usage.latencyMs / 1000).toFixed(2)}s</span>
                        <span>{m.usage.promptTokens + m.usage.completionTokens}tok</span>
                        <span>{formatCost(calcCostUsd(m.usage))}</span>
                        <span>·{getModel(m.usage.model)?.label}</span>
                        {m.fromCache && <span>·♻️</span>}
                        {m.fallbackFrom && <span>·↩{getModel(m.fallbackFrom)?.label}</span>}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Selection banner */}
          {selectedEl && (
            <div className="mx-3 mb-2 p-2 rounded-md bg-primary/10 border border-primary/30 text-[11px] font-mono flex items-center justify-between gap-2">
              <span className="truncate text-primary">&lt;{selectedEl.tag}&gt; {selectedEl.text.slice(0, 40)}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={handleAskAboutSelection}>Ask AI</Button>
                <button onClick={() => setSelectedEl(null)} className="p-1 hover:bg-muted rounded"><X className="w-3 h-3" /></button>
              </div>
            </div>
          )}

          {/* Composer */}
          <div className="border-t border-border/50 p-3 bg-background/60">
            {attachedImage && (
              <div className="mb-2 relative inline-block">
                <img src={attachedImage} alt="preview" className="rounded-md max-h-24 border border-border/50" />
                <button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="rounded-xl bg-muted/30 border border-border/50 focus-within:border-primary/50 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); }
                  else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Popíš čo postaviť alebo zmeniť... (Enter=send, Shift+Enter=newline)"
                rows={2}
                className="w-full bg-transparent text-sm outline-none placeholder-muted-foreground px-3 py-2 resize-none font-mono"
                disabled={isStreaming}
              />
              <div className="flex items-center justify-between px-2 pb-2 gap-2">
                <div className="flex items-center gap-1">
                  <input type="file" accept="image/*" ref={fileInputRef} className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleAttachImage(e.target.files[0])} />
                  <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 w-7 p-0" title="Attach image (vision)">
                    <ImagePlus className="w-4 h-4" />
                  </Button>
                  <span className="text-[10px] text-muted-foreground font-mono">{currentModel?.label}</span>
                </div>
                {isStreaming ? (
                  <Button size="sm" variant="destructive" onClick={handleStop} className="h-7 gap-1">
                    <Square className="w-3 h-3" /> Stop
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleSend} disabled={!input.trim() && !attachedImage} className="h-7 gap-1">
                    <Send className="w-3 h-3" /> Send
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.aside>

        {/* collapse handle */}
        <button
          onClick={() => setSidebarCollapsed((v) => !v)}
          className="absolute top-1/2 -translate-y-1/2 z-30 p-1 rounded-r-md bg-muted/50 border border-l-0 border-border/50 hover:bg-primary/20"
          style={{ left: sidebarCollapsed ? 0 : 400 }}
        >
          {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* MAIN CANVAS */}
        <main className={cn("flex-1 flex flex-col min-w-0 bg-background", mobileView === "chat" ? "hidden md:flex" : "flex")}>
          <BuilderRouteBar
            routes={routeList} route={activeRoute} onRouteChange={setActiveRoute}
            onAddRoute={handleAddRoute}
            device={device} onDeviceChange={setDevice}
            onRefresh={() => setPreviewKey((k) => k + 1)}
            onOpenNew={handleOpenNew} onExport={handleExport} onPublish={handlePublish}
          />

          {(previewError || consoleEntries.some((c) => c.level === "error")) && (
            <div className="px-3 py-1.5 bg-destructive/10 border-b border-destructive/30 flex items-center justify-between gap-2">
              <div className="text-xs text-destructive truncate flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {previewError || "Runtime error in console"}
              </div>
              <Button size="sm" variant="destructive" onClick={handleFixWithAi} disabled={isStreaming} className="h-6 shrink-0 gap-1">
                <Wand2 className="w-3 h-3" /> Fix with AI
              </Button>
            </div>
          )}

          <Tabs value={bottomTab} onValueChange={setBottomTab} className="flex-1 flex flex-col min-h-0">
            <div className="border-b border-border/50 px-3 flex items-center justify-between bg-background/50">
              <TabsList className="h-9 bg-transparent gap-0.5">
                <TabsTrigger value="preview" className="h-7 gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs font-mono">
                  <Eye className="w-3 h-3" /> PREVIEW
                </TabsTrigger>
                <TabsTrigger value="code" className="h-7 gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs font-mono">
                  <Code2 className="w-3 h-3" /> CODE
                </TabsTrigger>
                <TabsTrigger value="diff" className="h-7 gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs font-mono">
                  <GitCompare className="w-3 h-3" /> DIFF
                </TabsTrigger>
                <TabsTrigger value="console" className="h-7 gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs font-mono">
                  <Terminal className="w-3 h-3" /> CONSOLE ({consoleEntries.length})
                </TabsTrigger>
                <TabsTrigger value="versions" className="h-7 gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs font-mono">
                  <History className="w-3 h-3" /> VERSIONS ({versions.length})
                </TabsTrigger>
              </TabsList>
              {bottomTab === "code" && (
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1 text-xs">
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              )}
            </div>

            <TabsContent value="preview" className="flex-1 min-h-0 m-0 relative">
              <div className="w-full h-full p-6 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_rgba(0,229,255,0.06),_transparent_60%)] overflow-auto"
                style={{
                  backgroundImage: `linear-gradient(rgba(0,229,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.04) 1px,transparent 1px)`,
                  backgroundSize: "24px 24px",
                }}>
                <div
                  className={cn("overflow-hidden bg-slate-950 relative transition-transform", deviceFrame)}
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center center" }}
                >
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

              {/* Zoom controls */}
              <div className="absolute top-2 right-2 flex items-center gap-1 p-1 rounded-lg bg-background/80 backdrop-blur border border-border/50 z-10">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setZoom((z) => Math.max(25, z - 25))} title="Zoom out">
                  <ZoomOut className="w-3 h-3" />
                </Button>
                <span className="text-[10px] font-mono w-8 text-center">{zoom}%</span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setZoom((z) => Math.min(200, z + 25))} title="Zoom in">
                  <ZoomIn className="w-3 h-3" />
                </Button>
              </div>

              <BuilderFloatingToolbar tool={tool} onChange={(t) => { setTool(t); if (t !== "select") setSelectedEl(null); }} />
              <BuilderOverlay
                mode={tool === "annotate" ? "annotate" : tool === "comment" ? "comment" : "none"}
                pins={pins}
                onPinsChange={setPins}
                onSendComments={handleSendComments}
              />
              {tool === "text" && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-[10px] font-mono text-primary z-10 pointer-events-none">
                  DOUBLE-CLICK any text to edit inline
                </div>
              )}
            </TabsContent>

            <TabsContent value="code" className="flex-1 min-h-0 m-0 overflow-auto bg-[#282c34]">
              <BuilderCodeView code={currentCode} />
            </TabsContent>

            <TabsContent value="diff" className="flex-1 min-h-0 m-0">
              <BuilderDiffView previous={previousCode} current={currentCode} />
            </TabsContent>

            <TabsContent value="console" className="flex-1 min-h-0 m-0 overflow-hidden">
              <BuilderConsole entries={consoleEntries} onClear={() => setConsoleEntries([])} />
            </TabsContent>

            <TabsContent value="versions" className="flex-1 min-h-0 m-0 overflow-hidden">
              <BuilderVersions versions={versions} onRestore={handleRestoreVersion} />
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <BuilderPublishSheet open={publishOpen} onOpenChange={setPublishOpen} onExport={handleExport} />
    </div>
  );
}

