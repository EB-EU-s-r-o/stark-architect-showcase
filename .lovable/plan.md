
# /builder → Lovable-style workspace + 300% funkčné vylepšenia

## Cieľ

Preklopiť `/builder` do vizuálu ako na screenshote (Lovable workspace):

- **Ľavý panel = chat** (scrollovateľná história, sticky composer dole, model/preset chips)
- **Pravý panel = preview canvas** so zaobleným rámom, s hornou **URL/route lištou**, device prepínačom (mobile/tablet/desktop), refresh, otvoriť v novom tabe, „publish" akciou
- **Spodná floating toolbar** nad preview (select / text / edit / comment ikony ako v Lovable)
- Cyberpunk štýl (mriežka, cyan glow) — dodrží existujúcu tému

A pridať **10 nových funkcií** navrch existujúceho engine (streaming, cache, fallback, cost už fungujú).

---

## 1. Nový layout `BuilderDemo.tsx`

```text
┌─────────────────────────────────────────────────────────────┐
│  header: [logo] [project-name ▾]  [history] [settings] [☀]  │
├────────────────┬────────────────────────────────────────────┤
│  CHAT PANEL    │  ┌─ Route: / ▾  [🖥 📱 📱] [⟳] [↗] [⚡] [⇪] │
│  (fixed 400px, │  │                                          │
│   collapsible) │  │        ┌──────────────────────┐          │
│                │  │        │                      │          │
│  messages…     │  │        │   LIVE PREVIEW       │          │
│                │  │        │   (device frame)     │          │
│  ┌──────────┐  │  │        │                      │          │
│  │ composer │  │  │        └──────────────────────┘          │
│  │ ⌘K model │  │  │                                          │
│  │ preset   │  │  │   [◉] [T] [✎] [💬]  ← floating toolbar   │
│  │ [Send]   │  │  │                                          │
│  └──────────┘  │  │  Console / Code tabs (collapsible)       │
└────────────────┴────────────────────────────────────────────┘
```

### Chat panel (ľavý)
- Bubbles s user/assistant avatarmi
- Pod každou AI odpoveďou: `⚡ 1.2s · 847 tok · $0.0008` + akcie (Copy code, Retry, Fork, Fix)
- Composer je **sticky bottom card** s:
  - Textarea (auto-grow, Enter=send, Shift+Enter=newline)
  - Row 1: model picker chip · preset chip · attach image button · BYOK indicator
  - Row 2: [Send ▶] / [■ Stop] počas streamu + token counter
- Collapse button úplne na okraji

### Preview panel (pravý)
- **Top bar** (matches screenshot):
  - Vľavo: route selector `/` (zatiaľ len jedna route, pripravené na multi-page)
  - Stred: device group `Monitor | Tablet | Smartphone` (highlight aktívny)
  - Vpravo: `Refresh preview` · `Open in new tab` · `Copy preview URL` · `⚡ Publish` (mock/nav) · `⇪ Export`
- **Canvas**: gradient pozadie + device frame (rounded 16, shadow, border), preview iframe vo vnútri, mobile=390px, tablet=768px, desktop=100%
- **Floating toolbar** dole (glass card, 4 ikony):
  - `◉ Select` — inspector mode (pridaný v bode 6)
  - `T Text edit` — inline text edit (bod 7)
  - `✎ Annotate` — kresli poznámky (bod 8)
  - `💬 Comment` — pin comment na element (bod 9)
- Pod canvasom **tabs**: `Preview | Code | Console | History | Diff` (collapsible)

---

## 2. Nové funkcie (10× = 300% funkčný lift)

| # | Funkcia | Popis | Súbory |
|---|---------|-------|--------|
| 1 | **Multi-turn iterácie** | Každý ďalší prompt patchuje existujúci `currentCode` (system prompt dostane predchádzajúci kód ako context), nie generuje from-scratch | `builder-chat/index.ts` (nový `iterationMode`), `BuilderDemo.tsx` |
| 2 | **Diff viewer** | Po každej iterácii vidno unified diff medzi predchádzajúcou a novou verziou. Použije `diff` package | `BuilderDiffView.tsx` |
| 3 | **Version timeline** | Ľavý strip so screenshotmi/timestamp každej verzie, klik = restore, hover = preview. Nahrádza súčasný history dropdown | `BuilderVersions.tsx` |
| 4 | **Route selector (multi-page)** | User môže povedať „add /pricing route" — engine drží mapu `{ "/": code, "/pricing": code }` a preview switchne route | `builder-preview.ts` (router injection), `BuilderRouteBar.tsx` |
| 5 | **Attach image → AI vision** | Composer upload → base64 → posiela sa ako `image_url` do Gemini (multimodal). Použije napr. „vytvor komponent podľa tejto fotky" | `BuilderDemo.tsx`, `builder-chat/index.ts` |
| 6 | **Element inspector** | Iframe injektuje click handler → posielajú sa `{tag, classes, text}` cez postMessage → sidebar ukáže „Selected: `<button.px-6>...` [Ask AI to change this]" | `builder-preview.ts` |
| 7 | **Inline text edit** | Klik na text v inspector-mode → contentEditable → save → patchne `currentCode` (jednoduchý string replace pre statický text) | `builder-preview.ts` |
| 8 | **Annotate mode** | Overlay canvas nad iframe, ceruzka/šípka; export ako screenshot → priloží sa k next promptu ako reference | `BuilderAnnotate.tsx` |
| 9 | **Element-scoped komenty** | Pin bublinky na konkrétny x/y v preview, uložené v `sessionStorage`. „Send all comments to AI" → generuje batch update | `BuilderComments.tsx` |
| 10 | **Publish / export bundle** | `⇪ Export` → ZIP s `index.html` + `App.jsx` + `README.md` (cez `jszip`). Publish tlačidlo otvorí sheet s inštrukciami (mock deploy) | `builder-export.ts` |

Bonus (zadarmo s layoutom):
- **Keyboard shortcuts**: `⌘K` model picker, `⌘Enter` send, `⌘/` toggle sidebar, `⌘R` refresh preview, `⌘S` download
- **Responsive**: pod 900px sa preview panel skryje a switchuje sa cez tab
- **Zoom controls** pre preview (50/75/100/125%)

---

## 3. Súbory

**Nové:**
- `src/components/builder/BuilderChatPanel.tsx` — ľavý chat + composer
- `src/components/builder/BuilderPreviewPanel.tsx` — pravý canvas + toolbary
- `src/components/builder/BuilderRouteBar.tsx` — top URL/route bar
- `src/components/builder/BuilderFloatingToolbar.tsx` — 4-ikonový dock
- `src/components/builder/BuilderVersions.tsx` — timeline verzií
- `src/components/builder/BuilderDiffView.tsx` — diff panel
- `src/components/builder/BuilderAnnotate.tsx` — kresliaci overlay
- `src/components/builder/BuilderComments.tsx` — pin komenty
- `src/components/builder/BuilderInspector.tsx` — element inspector sidebar
- `src/lib/builder-export.ts` — ZIP bundle export
- `src/lib/builder-router.ts` — multi-route state helper
- `src/lib/builder-shortcuts.ts` — keyboard handler

**Upraviť:**
- `src/pages/BuilderDemo.tsx` — nový layout, zapojí všetky panely (bude tenký container)
- `src/lib/builder-preview.ts` — inspector click injection, route-aware iframe, text-edit postMessage
- `supabase/functions/builder-chat/index.ts` — iteration context (posiela `currentCode` do system promptu), multimodal image support

**Nové deps:** `diff`, `jszip`, `html2canvas` (screenshoty verzií a annotations)

---

## 4. Vizuálna vernosť voči screenshotu

- Terminal header nad preview kruh: `● ● ●` bodky + `~/DEVELOPER/PORTFOLIO`
- Cyan glow (`#00E5FF` — existujúci token) na aktívnych controls
- JetBrains Mono na labels, `INIT_PORTFOLIO.SH` štýl
- Skrolovaná mriežka background v canvas (`bg-[linear-gradient(...)]` + radial fade)
- Rounded-2xl device frame s cyan `ring-1 ring-primary/30`

---

## 5. Akceptačné kritériá

1. Layout 1:1 zodpovedá screenshotu (split, top-bar, floating toolbar)
2. Multi-turn: „Zmeň tlačidlo na červené" upraví existujúci kód, nie regeneruje
3. Diff viewer ukáže + / − riadky medzi verziami
4. Version timeline funguje (click = restore, min 20 verzií)
5. Multi-route: „pridaj /about" vytvorí druhú route, prepínateľná v top bare
6. Image upload → AI vision funguje s Gemini 2.5 Flash
7. Element inspector highlightne hovered element + „Ask AI" akcia
8. Inline text edit uloží zmenu do kódu
9. Annotate overlay sa dá kresliť a exportovať ako reference image
10. Komenty sa dajú pinnúť a poslať batch do AI
11. Export ZIP obsahuje spustiteľný `index.html`
12. Všetky keyboard shortcuts fungujú
13. Existujúce features (streaming, cache, fallback, cost, BYOK, Fix with AI, Shiki, console) fungujú ďalej bez regresie
