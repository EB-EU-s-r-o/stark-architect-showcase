export interface Version {
  id: string;
  code: string;
  prompt: string;
  route: string;
  model?: string;
  timestamp: number;
}

const KEY = "builder-versions-v1";
const MAX = 40;

export function getVersions(): Version[] {
  try { return JSON.parse(sessionStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function pushVersion(v: Omit<Version, "id" | "timestamp">): Version {
  const entry: Version = { ...v, id: crypto.randomUUID(), timestamp: Date.now() };
  const all = [entry, ...getVersions()].slice(0, MAX);
  try { sessionStorage.setItem(KEY, JSON.stringify(all)); } catch {}
  return entry;
}

export function clearVersions() { sessionStorage.removeItem(KEY); }
