const CACHE_KEY = "builder-gen-cache-v1";
const MAX = 50;

export interface CacheEntry {
  key: string;
  code: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  timestamp: number;
}

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export async function makeKey(parts: {
  model: string;
  prompt: string;
  preset: string;
  customSystemPrompt?: string;
}): Promise<string> {
  const raw = `${parts.model}|${parts.preset}|${parts.customSystemPrompt ?? ""}|${parts.prompt}`;
  return await sha256(raw);
}

function read(): CacheEntry[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
  } catch {
    return [];
  }
}

function write(entries: CacheEntry[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(entries.slice(0, MAX)));
}

export function cacheGet(key: string): CacheEntry | null {
  return read().find((e) => e.key === key) ?? null;
}

export function cachePut(entry: CacheEntry) {
  const existing = read().filter((e) => e.key !== entry.key);
  existing.unshift(entry);
  write(existing);
}

export function cacheClear() {
  localStorage.removeItem(CACHE_KEY);
}
