import { getModel } from "./builder-models";

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  model: string;
  latencyMs: number;
}

export function calcCostUsd(usage: Usage): number {
  const m = getModel(usage.model);
  if (!m) return 0;
  return (
    (usage.promptTokens * m.inputPrice + usage.completionTokens * m.outputPrice) /
    1_000_000
  );
}

export function formatCost(usd: number): string {
  if (usd < 0.0001) return "<$0.0001";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

export function approxTokens(text: string): number {
  // ~4 chars per token heuristic
  return Math.ceil(text.length / 4);
}

const SESSION_KEY = "builder-session-cost";

export interface SessionCost {
  total: number;
  byModel: Record<string, { cost: number; tokens: number; calls: number }>;
}

export function addToSession(usage: Usage) {
  const s = getSession();
  const cost = calcCostUsd(usage);
  s.total += cost;
  const m = s.byModel[usage.model] ?? { cost: 0, tokens: 0, calls: 0 };
  m.cost += cost;
  m.tokens += usage.promptTokens + usage.completionTokens;
  m.calls += 1;
  s.byModel[usage.model] = m;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function getSession(): SessionCost {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "");
  } catch {
    return { total: 0, byModel: {} };
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
