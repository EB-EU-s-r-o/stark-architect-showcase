import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Play, 
  Copy, 
  Check,
  Sparkles,
  Code2,
  Eye,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  code?: string;
}

const FAKE_RESPONSES = [
  {
    content: "Creating a modern landing page with hero section, gradient background, and animated elements...",
    code: `import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-20"
      >
        <h1 className="text-6xl font-bold text-white mb-6">
          Build Faster with AI
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Transform your ideas into production-ready code
        </p>
        <button className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all">
          Get Started
        </button>
      </motion.div>
    </div>
  );
}`
  },
  {
    content: "Building an interactive dashboard component with charts and real-time data visualization...",
    code: `import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

const data = [
  { name: "Jan", value: 400 },
  { name: "Feb", value: 300 },
  { name: "Mar", value: 600 },
  { name: "Apr", value: 800 },
  { name: "May", value: 500 }
];

export default function Dashboard() {
  return (
    <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
      <h2 className="text-2xl font-bold text-white mb-4">Analytics</h2>
      <AreaChart width={400} height={200} data={data}>
        <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
        <XAxis dataKey="name" stroke="#64748b" />
        <YAxis stroke="#64748b" />
        <Tooltip />
      </AreaChart>
    </div>
  );
}`
  },
  {
    content: "Generating a sleek authentication form with validation and smooth animations...",
    code: `import { useState } from "react";
import { motion } from "framer-motion";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-full max-w-md p-8 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10"
    >
      <h2 className="text-3xl font-bold text-white mb-6">Welcome back</h2>
      <input
        type="email"
        placeholder="Email"
        className="w-full p-4 mb-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 outline-none"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-4 mb-6 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 outline-none"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="w-full p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity">
        Sign In
      </button>
    </motion.div>
  );
}`
  }
];

const DeviceFrame = ({ device, children }: { device: string; children: React.ReactNode }) => {
  const dimensions = {
    mobile: "w-[375px] h-[667px]",
    tablet: "w-[768px] h-[500px]",
    desktop: "w-full h-full"
  };

  if (device === "desktop") {
    return <div className="w-full h-full">{children}</div>;
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className={cn(
        "relative rounded-[2rem] border-4 border-slate-700 bg-slate-800 overflow-hidden shadow-2xl",
        dimensions[device as keyof typeof dimensions]
      )}>
        {device === "mobile" && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-900 rounded-full" />
        )}
        <div className="w-full h-full overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function BuilderDemo() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Welcome! I'm your AI coding assistant. Describe what you want to build and I'll generate the code for you.",
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentCode, setCurrentCode] = useState(`// Your generated code will appear here
// Try asking me to build something!

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          ✨ AI Code Builder
        </h1>
        <p className="text-slate-400">
          Describe your idea in the chat
        </p>
      </div>
    </div>
  );
}`);
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [copied, setCopied] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [responseIndex, setResponseIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 1500));

    const response = FAKE_RESPONSES[responseIndex % FAKE_RESPONSES.length];
    setResponseIndex(prev => prev + 1);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: response.content,
      code: response.code
    };

    setMessages(prev => [...prev, assistantMessage]);
    setCurrentCode(response.code);
    setIsTyping(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="grid-pattern opacity-30" />
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[128px]"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
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
            <span className="text-xs text-muted-foreground">Demo Mode</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Play className="w-4 h-4 mr-2" />
              Run
            </Button>
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
          {/* Chat header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="font-medium">Chat</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
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
                    {message.code && (
                      <div className="mt-2 p-2 rounded-lg bg-background/50 border border-border/50 text-xs text-muted-foreground">
                        <Code2 className="w-3 h-3 inline mr-1" />
                        Code generated
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm">AI is thinking...</span>
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
                disabled={!input.trim() || isTyping}
                className="rounded-lg"
              >
                <Send className="w-4 h-4" />
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
              <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted/50">App.tsx</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-4 font-mono text-sm">
            <pre className="text-muted-foreground">
              <code>
                {currentCode.split('\n').map((line, i) => (
                  <div key={i} className="flex">
                    <span className="w-8 text-right pr-4 text-muted-foreground/50 select-none">{i + 1}</span>
                    <span className="flex-1">
                      {line.includes('import') || line.includes('export') || line.includes('const') || line.includes('return') || line.includes('function')
                        ? <span className="text-primary">{line}</span>
                        : line.includes('className') || line.includes('style')
                          ? <span className="text-cyan-400">{line}</span>
                          : line.includes('"') || line.includes("'") || line.includes('`')
                            ? <span className="text-green-400">{line}</span>
                            : line
                      }
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
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/30">
              <button
                onClick={() => setDevice("mobile")}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  device === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Smartphone className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDevice("tablet")}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  device === "tablet" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDevice("desktop")}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  device === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-4">
            <DeviceFrame device={device}>
              <div className="w-full h-full bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center">
                <div className="text-center p-8">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h1 className="text-3xl font-bold text-white mb-4">
                      ✨ AI Code Builder
                    </h1>
                    <p className="text-slate-400 mb-6">
                      Describe your idea in the chat
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm">
                      <Sparkles className="w-4 h-4" />
                      Live Preview
                    </div>
                  </motion.div>
                </div>
              </div>
            </DeviceFrame>
          </div>
        </div>
      </div>
    </div>
  );
}
