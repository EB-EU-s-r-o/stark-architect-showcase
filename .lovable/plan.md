# Blueprint v2: /builder → Production-Ready Multi-Model AI Builder

## Cieľ

Plne produkčný `/builder` s:

- **2 providery**: Mistral (Codestral, Large, Small) + Gemini (cez Lovable AI Gateway)

- **Flexibilný API key flow**: Supabase secrets → env vars → UI override (BYOK)

- **Auto-fallback** Mistral → Gemini pri 429/5xx

- **Cost tracking** + token counter v reálnom čase

- **Smart cache** pre identické prompty

- **Console output** zachytávaný z iframe

- **Bezpečná JSX validácia** cez `acorn-jsx` (ľahký, ~10kB) namiesto Babel bundlu

---

## 1. Flexibilný API key resolver (3-tier)

### Edge function priorita načítania kľúča

```text

1. UI override (body.userApiKey)  ← BYOK mode, iba ak user explicitne pošle

2. Supabase secret (Deno.env)     ← default produkčný flow

3. Lovable gateway fallback       ← Gemini funguje vždy bez kľúča

```

### BYOK (Bring Your Own Key) v UI

- Settings panel: "Use my own Mistral key (session only)"

- Kľúč žije iba v `sessionStorage` (nie localStorage), nikdy sa neukladá na server

- Posiela sa v request body cez HTTPS, edge function ho použije iba pre daný request, nikde nezapisuje

- Viditeľný **warning banner**: "⚠️ Kľúč je dočasný. Pre produkciu pridaj do projektových secrets."

- Validačná zod schéma: `userApiKey: z.string().regex(/^sk-[A-Za-z0-9]{20,}$/).optional()`

### Gemini cez LOVABLE_API_KEY

- `LOVABLE_API_KEY` je server-only secret (už existuje), **nikdy** sa neexposuje klientovi

- Žiadny BYOK potrebný pre Gemini — projekt už má credits cez Lovable Cloud

---

## 2. Provider routing v `supabase/functions/builder-chat/index.ts`

```text

POST /builder-chat

body: { messages, preset, model, userApiKey?, customSystemPrompt? }

        ↓

   Zod validate (model whitelist, message shape, sane limits)

        ↓

   Resolve key (UI → env → reject ak Mistral bez kľúča)

        ↓

   Router:

     model.startsWith("mistral") → [https://api.mistral.ai/v1/chat/completions](https://api.mistral.ai/v1/chat/completions)

     model.startsWith("google/") → Lovable AI Gateway (createLovableAiGatewayProvider)

        ↓

   retryWithBackoff(fn, 3) s exp + jitter

        ↓

   Stream SSE → client (rovnaký OpenAI-compatible parser pre oba)

        ↓

   Pri 429/5xx z Mistral → vyhoď `{ error: "fallback_available" }` so signálom pre klienta

```

### Retry helper (jitter)

```ts

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {

  for (let i = 0; i < maxRetries; i++) {

    try { return await fn(); }

    catch (e) {

      if (i === maxRetries - 1) throw e;

      const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;

      await new Promise(r => setTimeout(r, delay));

    }

  }

  throw new Error("unreachable");

}

```

Pre Gemini volania použiť `createLovableAiGatewayProvider` z `_shared/ai-gateway.ts` (best-practice pattern, run-id propagation).

---

## 3. Auto-fallback Mistral → Gemini

Klient logika:

1. User vyberie `codestral-latest`

2. Stream vráti error `429` alebo `fallback_available`

3. Toast: "Mistral je dočasne nedostupný — prepínam na Gemini 2.5 Flash..."

4. Klient automaticky retry-uje request s `model: "google/gemini-2.5-flash"`

5. UI ukáže badge "Fallback active" na vygenerovanom výstupe

Vypínateľné v Settings (default: ON).

---

## 4. Model registry `src/lib/builder-models.ts`)

```ts

export const MODELS = [

  // Mistral (vyžaduje MISTRAL_API_KEY alebo BYOK)

  { id: "codestral-latest",      provider: "mistral", label: "Codestral",     badge: "Code",   recommended: ["component", "app"], inputPrice: 0.30, outputPrice: 0.90 },

  { id: "mistral-large-latest",  provider: "mistral", label: "Mistral Large", badge: "Pro",    recommended: ["landing"],          inputPrice: 2.00, outputPrice: 6.00 },

  { id: "mistral-small-latest",  provider: "mistral", label: "Mistral Small", badge: "Fast",   recommended: [],                   inputPrice: 0.20, outputPrice: 0.60 },

  // Gemini (vždy ready cez Lovable AI Gateway)

  { id: "google/gemini-2.5-flash",      provider: "gemini", label: "Gemini 2.5 Flash",      badge: "Balanced", recommended: ["component", "landing"], inputPrice: 0.30, outputPrice: 2.50 },

  { id: "google/gemini-2.5-pro",        provider: "gemini", label: "Gemini 2.5 Pro",        badge: "Pro",      recommended: ["app", "landing"],       inputPrice: 1.25, outputPrice: 10.00 },

  { id: "google/gemini-2.5-flash-lite", provider: "gemini", label: "Gemini 2.5 Flash Lite", badge: "Fast",     recommended: [],                       inputPrice: 0.10, outputPrice: 0.40 },

];

```

Ceny v $/M tokenov, použité pre live cost odhad.

---

## 5. JSX validácia (acorn-jsx, žiadny ťažký Babel)

```ts

// src/lib/builder-preview.ts

import { Parser } from "acorn";

import jsx from "acorn-jsx";

const JsxParser = Parser.extend(jsx());

export function validateJsx(code: string): { ok: true } | { ok: false; error: string } {

  try {

    JsxParser.parse(code, { ecmaVersion: 2020, sourceType: "module" });

    return { ok: true };

  } catch (e: any) {

    return { ok: false, error: e.message };

  }

}

```

Validácia beží pred injekciou do iframe → pri chybe ukáže "Fix with AI" tlačidlo namiesto rozbitého renderu.

---

## 6. Console output z iframe

### Injekcia do iframe HTML template

Pridať priamo do `buildPreviewHtml()` v `src/lib/builder-preview.ts`:

```js

['log','warn','error','info'].forEach(level => {

  const original = console[level];

  console[level] = (...args) => {

    parent.postMessage({ type: 'builder-console', level, args: [args.map](http://args.map)(a => typeof a === 'object' ? JSON.stringify(a) : String(a)) }, '*');

    original.apply(console, args);

  };

});

window.addEventListener('error', e => parent.postMessage({ type: 'builder-console', level: 'error', args: [e.message] }, '*'));

```

### `src/components/BuilderConsole.tsx`

- Collapsible panel pod preview

- Farebné levely (log/warn/error)

- Clear button, max 200 záznamov

---

## 7. Syntax highlighting — Shiki (lazy)

- Použiť **shiki** s lazy-loaded highlighter (dynamic import) → bundle nezaťaží initial load

- Theme: `one-dark-pro`, languages: `tsx`, `jsx`

- Fallback: jednoduchý `<pre><code>` kým sa shiki načíta

```tsx

const [html, setHtml] = useState("");

useEffect(() => {

  import("shiki").then(async ({ getHighlighter }) => {

    const hl = await getHighlighter({ themes: ["one-dark-pro"], langs: ["tsx"] });

    setHtml(hl.codeToHtml(code, { lang: "tsx", theme: "one-dark-pro" }));

  });

}, [code]);

```

---

## 8. Generation cache `src/lib/builder-cache.ts`)

```ts

const key = `${model}:${sha256(prompt + preset)}`;

// localStorage Map { key → { code, tokens, latencyMs, model, timestamp } }

// Max 50 záznamov, LRU eviction

```

- Pred volaním AI: lookup → ak hit, instant load + badge "♻️ Cached"

- Tlačidlo "Regenerate" obíde cache

- Cache cleanup tlačidlo v Settings

---

## 9. Cost & token tracking

### Live počas streamu

- Token counter (approx: `chars / 4`) v hlavičke chatu

- Po `[DONE]` edge function pošle final event:

  ```

  data: {"type":"usage","prompt_tokens":N,"completion_tokens":M,"model":"..."}

  ```

- Klient vypočíta cost: `(p * inputPrice + c * outputPrice) / 1_000_000`

- Zobrazí pod message: "⚡ 1.2s · 847 tokens · $0.0008"

### Session total v Settings paneli

- Sumár nákladov za session (cleared na refresh)

- Per-model breakdown

---

## 10. Smart "Fix with AI"

- Pri JSX validation fail ALEBO iframe runtime error (z console capture):

  - Banner: "❌ Chyba: {message}"

  - Tlačidlo "Auto-fix" → pošle do AI: `system: "Fix this React error without explanation, return only corrected code", user: "Error: {err}\n\nCode:\n{code}"`

  - Použije rovnaký model alebo padne na Codestral (najlepší na opravy kódu)

  - Nahradí kód + log do history

---

## 11. Súbory

| Súbor                                      | Akcia                                                                              |

| ------------------------------------------ | ---------------------------------------------------------------------------------- |

| `supabase/functions/builder-chat/index.ts` | **Rewrite** — multi-provider, BYOK, retry+jitter, usage events                     |

| `supabase/functions/_shared/ai-gateway.ts` | **Create** — Lovable gateway helper (best-practice)                                |

| `src/lib/builder-models.ts`                | **Create** — registry s cenami                                                     |

| `src/lib/builder-cache.ts`                 | **Create** — LRU cache                                                             |

| `src/lib/builder-preview.ts`               | **Edit** — `validateJsx` (acorn-jsx) + console injection                           |

| `src/lib/builder-cost.ts`                  | **Create** — cost calc helper                                                      |

| `src/components/BuilderModelPicker.tsx`    | **Create** — provider/model selector + BYOK input                                  |

| `src/components/BuilderConsole.tsx`        | **Create** — console panel                                                         |

| `src/components/BuilderCodeView.tsx`       | **Create** — Shiki-powered code viewer (lazy)                                      |

| `src/components/BuilderSettings.tsx`       | **Edit** — fallback toggle, BYOK warning, cache clear, session cost                |

| `src/pages/BuilderDemo.tsx`                | **Edit** — model state, fallback flow, cost/token UI, Fix with AI, console wire-up |

| `package.json`                             | Pridať `acorn`, `acorn-jsx`, `shiki`                                               |

---

## 12. Secrets

- `MISTRAL_API_KEY` — vyžiadam cez `add_secret` tool **iba ak user potvrdí**, že chce použiť Mistral provider. Návod: [console.mistral.ai](http://console.mistral.ai) → API Keys → Create.

- Gemini funguje out-of-the-box (existujúci `LOVABLE_API_KEY`).

- BYOK mode umožňuje fungovať aj bez secret-u (kľúč ide cez request body, session-only).

---

## 13. Bezpečnosť (checklist)

- ✅ Zod validácia každého request bodu (model whitelist, message limits)

- ✅ BYOK kľúč nikdy nelogovať, nikdy neuložiť (iba forward)

- ✅ `LOVABLE_API_KEY` zostáva server-only

- ✅ Iframe sandbox: `allow-scripts` (no `allow-same-origin`) — XSS izolovaný

- ✅ Žiadny `dangerouslySetInnerHTML` s user contentom v hlavnej apke (iba shiki output, ktorý je escaped)

- ✅ CORS headers na edge function správne nastavené

---

## 14. Akceptačné kritériá

1. ✅ User prepne medzi Mistral/Gemini modelmi v jednom kliknutí

2. ✅ Mistral funguje cez secret aj cez BYOK (session-only)

3. ✅ Pri 429 z Mistral sa auto-fallback prepne na Gemini (vypínateľné)

4. ✅ Generovaný kód sa validuje cez acorn-jsx pred renderom

5. ✅ Console output z iframe sa zobrazuje v dedikovanom paneli

6. ✅ Cost a token counter sú viditeľné per-generation aj per-session

7. ✅ Identický prompt v rovnakom modeli sa načíta z cache (instant)

8. ✅ "Fix with AI" opraví broken kód a aktualizuje preview

9. ✅ Syntax highlight cez Shiki (lazy-loaded, nezaťaží initial bundle)

10. ✅ Všetky chyby (429/402/401/5xx) majú jasné slovenské toast hlášky