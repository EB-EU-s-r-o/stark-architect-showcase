import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Braces, Check, Copy, Loader2, PanelLeft, Wand2, AlertTriangle,
  History, Code2, Eye, Terminal, GitCompare, ZoomIn, ZoomOut, Zap,
} from "lucide-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
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
import BuilderConsole, { type ConsoleEntry } from "@/components/BuilderConsole";
import BuilderCodeView from "@/components/BuilderCodeView";
import BuilderRouteBar from "@/components/builder/BuilderRouteBar";
import BuilderFloatingToolbar, { type BuilderTool } from "@/components/builder/BuilderFloatingToolbar";
import BuilderVersions from "@/components/builder/BuilderVersions";
import BuilderDiffView from "@/components/builder/BuilderDiffView";
import BuilderOverlay, { type Pin } from "@/components/builder/BuilderOverlay";
import BuilderPublishSheet from "@/components/builder/BuilderPublishSheet";
import BuilderStage from "@/components/builder/BuilderStage";
import BuilderChatPanel, { type BuilderMessage } from "@/components/builder/BuilderChatPanel";
import BuilderWorkspaceNav, { type WorkspaceView } from "@/components/builder/BuilderWorkspaceNav";
import { BuilderExportDialog, BuilderRouteDialog } from "@/components/builder/BuilderActionDialogs";
import { useToast } from "@/hooks/use-toast";

type Message = BuilderMessage;

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
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [navExpanded, setNavExpanded] = useState(true);
  const [historySearch, setHistorySearch] = useState("");
  const [settingsRequest, setSettingsRequest] = useState(0);
  const [mobileView, setMobileView] = useState<"chat" | "preview">("preview");
  useEffect(() => { try { sessionStorage.setItem("builder-pins", JSON.stringify(pins)); } catch {} }, [pins]);

  const abortRef = useRef<AbortController | null>(null);
  const consoleIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPreset = BUILDER_PRESETS.find((p) => p.id === preset);
  const currentModel = getModel(model);
  const isMistral = currentModel?.provider === "mistral";

  useEffect(() => { sessionStorage.setItem(BYOK_KEY, byokKey); }, [byokKey]);
  const [serverMistral, setServerMistral] = useState(false);
  useEffect(() => {
    fetch(CHAT_URL, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } })
      .then((r) => r.json()).then((d) => setServerMistral(!!d?.mistral)).catch(() => {});
  }, []);

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

  const handleAddRoute = () => setRouteDialogOpen(true);
  const handleCreateRoute = (name: string) => {
    setRouteDialogOpen(false);
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
  const handleExport = () => setExportDialogOpen(true);
  const runExport = (staged: boolean) => {
    setExportDialogOpen(false);
    exportBundle(currentCode, `builder${activeRoute === "/" ? "-root" : activeRoute.replace(/\//g, "-")}`, { staged });
    toast({ title: staged ? "Export: staged" : "Export: full-page" });
  };
  const handleNewChat = () => {
    abortRef.current?.abort();
    setMessages((m) => m.slice(0, 1));
    setInput(""); setAttachedImage(null); setSelectedEl(null);
  };
  const handleRetryMessage = (id: string) => {
    const idx = messages.findIndex((m) => m.id === id);
    const prevUser = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
    if (prevUser) setInput(prevUser.content);
  };
  const handleViewChange = (v: WorkspaceView) => {
    if (v === "chat") { setNavExpanded(true); setMobileView("chat"); return; }
    setBottomTab(v); setMobileView("preview");
  };
  const handlePublish = () => setPublishOpen(true);

  const handleRetryPreview = () => {
    setPreviewError(null);
    setConsoleEntries((prev) => prev.filter((c) => c.level !== "error"));
    setPreviewKey((k) => k + 1);
  };

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
  const hasMistralKey = serverMistral || byokKey.trim().length > 0;

  const deviceFrame = {
    mobile: "w-[390px] h-[680px] max-h-[72vh]",
    tablet: "w-[820px] h-[560px] max-h-[72vh]",
    desktop: "w-full max-w-[960px] h-[640px] max-h-[72vh]",
  }[device];

  const tabBtn = "h-7 gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-xs font-mono";
  const errorCount = consoleEntries.filter((c) => c.level === "error").length;

  const chat = (
    <BuilderChatPanel
      messages={messages} input={input} onInputChange={setInput} isStreaming={isStreaming}
      attachedImage={attachedImage} onAttachClick={() => fileInputRef.current?.click()}
      onRemoveAttachment={() => setAttachedImage(null)} onSubmit={handleSend} onStop={handleStop}
      model={model} onModelChange={setModel} preset={preset} onPresetChange={setPreset}
      currentPreset={currentPreset} selectedEl={selectedEl} onAskSelection={handleAskAboutSelection}
      onClearSelection={() => setSelectedEl(null)} onRetryMessage={handleRetryMessage}
      mistralStatus={byokKey.trim() ? "byok" : serverMistral ? "secret" : "missing"}
    />
  );

  const canvas = (
    <main className="flex h-full min-w-0 flex-col bg-background">
      <BuilderRouteBar
        routes={routeList} route={activeRoute} onRouteChange={setActiveRoute} onAddRoute={handleAddRoute}
        device={device} onDeviceChange={setDevice} onRefresh={() => setPreviewKey((k) => k + 1)}
        onOpenNew={handleOpenNew} onExport={handleExport} onPublish={handlePublish}
      />
      {(previewError || errorCount > 0) && (
        <div className="flex items-center justify-between gap-2 border-b border-destructive/30 bg-destructive/10 px-3 py-1.5 animate-fade-in">
          <div className="flex items-center gap-1.5 truncate text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{previewError || "Runtime error in console"}
          </div>
          <Button size="sm" variant="destructive" onClick={handleFixWithAi} disabled={isStreaming} className="h-6 shrink-0 gap-1">
            <Wand2 className="h-3 w-3" /> Fix with AI
          </Button>
        </div>
      )}
      <Tabs value={bottomTab} onValueChange={setBottomTab} className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border/50 bg-background/50 px-3">
          <TabsList className="h-9 gap-0.5 overflow-x-auto bg-transparent">
            <TabsTrigger value="preview" className={tabBtn}><Eye className="h-3 w-3" /> PREVIEW</TabsTrigger>
            <TabsTrigger value="code" className={tabBtn}><Code2 className="h-3 w-3" /> CODE</TabsTrigger>
            <TabsTrigger value="diff" className={tabBtn}><GitCompare className="h-3 w-3" /> DIFF</TabsTrigger>
            <TabsTrigger value="console" className={tabBtn}>
              <Terminal className="h-3 w-3" /> CONSOLE
              {errorCount > 0 && <span className="ml-1 rounded bg-destructive/20 px-1 text-destructive">{errorCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="versions" className={tabBtn}><History className="h-3 w-3" /> VERSIONS</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            {isStreaming && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin text-primary" />{tokenCount} tok</span>}
            {latencyMs !== null && !isStreaming && <span className="hidden lg:inline"><Zap className="mr-0.5 inline h-3 w-3 text-primary" />{(latencyMs / 1000).toFixed(2)}s</span>}
            {bottomTab === "code" && (
              <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1 text-xs">
                {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}{copied ? "Copied" : "Copy"}
              </Button>
            )}
          </div>
        </div>
        <TabsContent value="preview" className="relative m-0 min-h-0 flex-1">
          <BuilderStage html={previewHtml} previewKey={previewKey} isStreaming={isStreaming} zoom={zoom}
            deviceFrame={deviceFrame} route={activeRoute} onIframeLoad={() => setPreviewError(null)}
            error={previewError} onRetry={handleRetryPreview} onFixWithAi={handleFixWithAi} />
          <div className="absolute right-2 top-2 z-40 flex items-center gap-1 rounded-lg border border-border/50 bg-background/80 p-1 backdrop-blur">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setZoom((z) => Math.max(25, z - 25))} title="Zoom out"><ZoomOut className="h-3 w-3" /></Button>
            <button className="w-9 text-center font-mono text-[10px]" onClick={() => setZoom(100)} title="Reset zoom">{zoom}%</button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setZoom((z) => Math.min(200, z + 25))} title="Zoom in"><ZoomIn className="h-3 w-3" /></Button>
          </div>
          <BuilderFloatingToolbar tool={tool} onChange={(t) => { setTool(t); if (t !== "select") setSelectedEl(null); }} />
          <BuilderOverlay mode={tool === "annotate" ? "annotate" : tool === "comment" ? "comment" : "none"}
            pins={pins} onPinsChange={setPins} onSendComments={handleSendComments} />
          {tool === "text" && (
            <div className="pointer-events-none absolute bottom-20 left-1/2 z-10 -translate-x-1/2 rounded-full border border-primary/40 bg-primary/20 px-3 py-1 font-mono text-[10px] text-primary">
              DOUBLE-CLICK any text to edit inline
            </div>
          )}
        </TabsContent>
        <TabsContent value="code" className="m-0 min-h-0 flex-1 overflow-auto bg-card"><BuilderCodeView code={currentCode} /></TabsContent>
        <TabsContent value="diff" className="m-0 min-h-0 flex-1"><BuilderDiffView previous={previousCode} current={currentCode} /></TabsContent>
        <TabsContent value="console" className="m-0 min-h-0 flex-1 overflow-hidden"><BuilderConsole entries={consoleEntries} onClear={() => setConsoleEntries([])} /></TabsContent>
        <TabsContent value="versions" className="m-0 min-h-0 flex-1 overflow-hidden"><BuilderVersions versions={versions} onRestore={handleRestoreVersion} /></TabsContent>
      </Tabs>
    </main>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handleAttachImage(e.target.files[0]); e.target.value = ""; }} />
      <BuilderWorkspaceNav
        activeView={bottomTab as WorkspaceView} onViewChange={handleViewChange}
        expanded={navExpanded} onExpandedChange={setNavExpanded}
        versions={versions} search={historySearch} onSearchChange={setHistorySearch}
        onNewChat={handleNewChat} onOpenSettings={() => setSettingsRequest((n) => n + 1)}
        onRestoreVersion={handleRestoreVersion}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 items-center justify-between gap-2 border-b border-border/50 bg-background/80 px-3 backdrop-blur-xl">
          <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1">
            <Braces className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-xs font-semibold text-primary">&gt;_ BUILDER</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="mr-1 flex items-center rounded-md bg-muted/40 p-0.5 md:hidden">
              {(["chat", "preview"] as const).map((v) => (
                <button key={v} onClick={() => setMobileView(v)}
                  className={cn("rounded px-2 py-1 font-mono text-[10px] uppercase", mobileView === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{v}</button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="hidden h-8 w-8 p-0 md:inline-flex" onClick={() => setSidebarCollapsed((v) => !v)} title="Toggle chat (⌘/)">
              <PanelLeft className="h-4 w-4" />
            </Button>
            <BuilderSettings
              openRequest={settingsRequest}
              preset={preset} onPresetChange={setPreset}
              customSystemPrompt={customSystemPrompt} onCustomSystemPromptChange={setCustomSystemPrompt}
              darkPreview={darkPreview} onDarkPreviewChange={setDarkPreview}
              onLoadHistory={(h: GenerationHistoryItem) => { setCodeForRoute(activeRoute, h.code); setPreset(h.preset); setPreviewKey((k) => k + 1); }}
              fallbackEnabled={fallbackEnabled} onFallbackEnabledChange={setFallbackEnabled}
              byokKey={byokKey} onByokKeyChange={setByokKey} serverMistral={serverMistral}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <div className="h-full md:hidden">{mobileView === "chat" ? chat : canvas}</div>
          <div className="hidden h-full md:block">
            <PanelGroup direction="horizontal" autoSaveId="builder-layout">
              {!sidebarCollapsed && (
                <>
                  <Panel id="chat" order={1} defaultSize={32} minSize={22} maxSize={50}>{chat}</Panel>
                  <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-primary data-[resize-handle-state=drag]:bg-primary" />
                </>
              )}
              <Panel id="canvas" order={2} minSize={40}>{canvas}</Panel>
            </PanelGroup>
          </div>
        </div>
      </div>
      <BuilderRouteDialog open={routeDialogOpen} onOpenChange={setRouteDialogOpen} onCreate={handleCreateRoute} />
      <BuilderExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} onExport={runExport} />
      <BuilderPublishSheet open={publishOpen} onOpenChange={setPublishOpen} onExport={handleExport} />
    </div>
  );
}
