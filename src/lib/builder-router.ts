export type RouteMap = Record<string, string>;

const KEY = "builder-routes-v1";

export function saveRoutes(map: RouteMap) {
  try { sessionStorage.setItem(KEY, JSON.stringify(map)); } catch {}
}

export function loadRoutes(): RouteMap | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Detect if the user prompt is asking to add/edit a specific route path */
export function detectRouteFromPrompt(prompt: string): string | null {
  const m = prompt.match(/\/(?:add|create|make|pridaj|vytvor)?\s*(?:route|page|stránk\w*)\s+["'`]?(\/[a-z0-9-_/]+)["'`]?/i);
  if (m) return m[1];
  const m2 = prompt.match(/\b(\/[a-z][a-z0-9-_]*)\b/);
  return m2 ? m2[1] : null;
}
