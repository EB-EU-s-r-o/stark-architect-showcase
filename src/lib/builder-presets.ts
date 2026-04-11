export interface BuilderPreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  examplePrompts: string[];
}

export const BUILDER_PRESETS: BuilderPreset[] = [
  {
    id: "component",
    label: "Component",
    description: "Single reusable UI component",
    icon: "🧩",
    examplePrompts: [
      "Create a pricing card with monthly/yearly toggle",
      "Build an animated notification bell with badge counter",
      "Design a user avatar group with overflow indicator",
    ],
  },
  {
    id: "landing",
    label: "Landing Page",
    description: "Full marketing landing page",
    icon: "🚀",
    examplePrompts: [
      "SaaS landing page for an AI writing tool",
      "Creative agency portfolio with dark theme",
      "Startup launch page with waitlist signup",
    ],
  },
  {
    id: "app",
    label: "One-Page App",
    description: "Interactive app with state",
    icon: "⚡",
    examplePrompts: [
      "Todo app with categories and drag-to-reorder",
      "Pomodoro timer with session tracking",
      "Expense tracker with chart visualization",
    ],
  },
  {
    id: "custom",
    label: "Custom",
    description: "Your own system prompt",
    icon: "✏️",
    examplePrompts: [
      "Build whatever you describe...",
    ],
  },
];

export interface GenerationHistoryItem {
  id: string;
  prompt: string;
  code: string;
  preset: string;
  timestamp: number;
}

const HISTORY_KEY = "builder-history";
const MAX_HISTORY = 10;

export function saveToHistory(item: Omit<GenerationHistoryItem, "id" | "timestamp">) {
  const history = getHistory();
  const newItem: GenerationHistoryItem = {
    ...item,
    id: Date.now().toString(),
    timestamp: Date.now(),
  };
  history.unshift(newItem);
  if (history.length > MAX_HISTORY) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getHistory(): GenerationHistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
