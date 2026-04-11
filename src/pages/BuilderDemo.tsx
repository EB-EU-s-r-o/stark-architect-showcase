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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildPreviewHtml, extractCodeFromResponse } from "@/lib/builder-preview";
import { BUILDER_PRESETS, saveToHistory, type GenerationHistoryItem } from "@/lib/builder-presets";
import BuilderSettings from "@/components/BuilderSettings";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-chat`;

const DEFAULT_CODE = `function App() {
  const [count, setCount] = React.useState(0);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">✨ AI Code Builder</h1>
        <p className="text-slate-400 mb-8">Describe your idea in the chat to generate real code</p>
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
      content: "👋 Welcome! I'm your AI code builder. Tell me what you want to create and I'll generate real, working React code with a live preview.\n\nTry: *\"Create a pricing card with monthly/yearly toggle\"*",
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for preview errors from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "preview-error") {
        setPreviewError(e.data.error);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const streamChat = useCallback(
    async (allMessages: Message[]) => {
      const controller = new AbortController();
      abortRef.current = controller;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          preset,
          customSystemPrompt: preset === "custom" ? customSystemPrompt : undefined,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && last.id === "streaming") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: fullContent } : m
                  );
                }
                return [
                  ...prev,
                  { id: "streaming", role: "assistant", content: fullContent },
                ];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Finalize streaming message with stable ID
      setMessages((prev) =>
        prev.map((m) =>
          m.id === "streaming" ? { ...m, id: Date.now().toString() } : m
        )
      );

      return fullContent;
    },
    [preset, customSystemPrompt]
  );

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const promptText = input;
    setInput("");
    setIsStreaming(true);
    setPreviewError(null);

    try {
      const fullResponse = await streamChat(newMessages);
      const code = extractCodeFromResponse(fullResponse);
      setCurrentCode(code);
      saveToHistory({ prompt: promptText, code, preset });
    } catch (e: any) {
      if (e.name === "AbortError") return;
      console.error("Stream error:", e);
      toast({
        title: "Error",
        description: e.message || "Failed to generate code",
        variant: "destructive",
      });
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "streaming"),
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `❌ Error: ${e.message}`,
        },
      ]);
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
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
  };

  const previewHtml = buildPreviewHtml(currentCode, darkPreview);
  const currentPreset = BUILDER_PRESETS.find((p) => p.id === preset);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-[128px]"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">AI Builder</span>
            </div>
            <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50">
              {currentPreset?.icon} {currentPreset?.label}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <BuilderSettings
              preset={preset}
              onPresetChange={setPreset}
              customSystemPrompt={customSystemPrompt}
              onCustomSystemPromptChange={setCustomSystemPrompt}
              darkPreview={darkPreview}
              onDarkPreviewChange={setDarkPreview}
              onLoadHistory={handleLoadHistory}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex h-[calc(100vh-3.5rem)]">
        {/* Chat panel */}
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

          {/* Example prompts */}
          {messages.length <= 1 && currentPreset && (
            <div className="p-3 border-b border-border/50">
              <p className="text-xs text-muted-foreground mb-2">Try these:</p>
              <div className="space-y-1">
                {currentPreset.examplePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(prompt)}
                    className="w-full text-left text-xs p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted/50 border border-border/50 rounded-bl-md"
                    )}
                  >
                    {message.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isStreaming && messages[messages.length - 1]?.id !== "streaming" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm">Generating code...</span>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border/50">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border/50 focus-within:border-primary/50 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Describe what to build..."
                className="flex-1 bg-transparent text-sm outline-none placeholder-muted-foreground px-2"
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="rounded-lg"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Collapse toggle */}
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

        {/* Code editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              <span className="font-medium">Code</span>
              <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted/50">
                App.tsx
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-muted-foreground hover:text-foreground"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 font-mono text-sm">
            <pre className="text-muted-foreground">
              <code>
                {currentCode.split("\n").map((line, i) => (
                  <div key={i} className="flex hover:bg-muted/20">
                    <span className="w-8 text-right pr-4 text-muted-foreground/40 select-none">
                      {i + 1}
                    </span>
                    <span className="flex-1">
                      {line.includes("import") ||
                      line.includes("export") ||
                      line.includes("const") ||
                      line.includes("return") ||
                      line.includes("function") ? (
                        <span className="text-primary">{line}</span>
                      ) : line.includes("className") || line.includes("style") ? (
                        <span className="text-cyan-400">{line}</span>
                      ) : line.includes('"') || line.includes("'") || line.includes("`") ? (
                        <span className="text-green-400">{line}</span>
                      ) : (
                        line
                      )}
                    </span>
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </div>

        {/* Preview panel */}
        <div className="w-1/3 min-w-[400px] flex flex-col border-l border-border/50 bg-background/50 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="font-medium">Preview</span>
              {previewError && (
                <AlertTriangle className="w-4 h-4 text-destructive" />
              )}
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/30">
              {(["mobile", "tablet", "desktop"] as const).map((d) => {
                const Icon = d === "mobile" ? Smartphone : d === "tablet" ? Tablet : Monitor;
                return (
                  <button
                    key={d}
                    onClick={() => setDevice(d)}
                    className={cn(
                      "p-1.5 rounded transition-colors",
                      device === d
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-4">
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
                  key={previewHtml.length}
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                  title="Live Preview"
                  onLoad={() => setPreviewError(null)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
