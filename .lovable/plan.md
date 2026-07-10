# Diagnostika `/builder` — stav k dnešku

## ✅ Hotové a funkčné

**Engine & backend**
- Edge function `builder-chat` — streaming (SSE), Mistral + Gemini routing, retry s backoff, CORS, error kódy (401/402/429), fallback signál (`x-builder-fallback`)
- Multi-turn iterácie (posiela `currentCode` do system promptu → patch namiesto regenerácie)
- Multimodal image support pre Gemini (`imageDataUrl` → `image_url` blok)
- BYOK Mistral kľúč (session-only, cez `userApiKey` v body)
- Auto-fallback Mistral → Gemini pri 401/429

**Frontend UI**
- Split layout: chat vľavo (collapsible), preview vpravo
- Route bar s device switcherom (mobile 390 / tablet 820 / desktop 100%)
- Floating toolbar (Select / Text / Annotate / Comment — ikony sú tam)
- Tabs: Preview / Code (Shiki `one-dark-pro`) / Diff / Console / History
- Model picker chip + preset chip v composeri
- Sticky composer, Enter=send, Shift+Enter=newline, token counter, Stop button
- Cyberpunk theme: cyan glow, mriežka, terminal header (`● ● ●`)

**Data & cost**
- Session cost tracking (`builder-cost.ts`), per-message stats (⚡ čas · tokens · $)
- LRU cache (SHA-256, 50 entries, localStorage)
- Version history (`builder-versions.ts`, session, 40 verzií)
- Diff viewer (unified `+`/`−`)
- ZIP export (`jszip` — `index.html` + `App.jsx` + `README.md`)
- Route map (`{"/": code, "/pricing": code}`) v sessionStorage

**Bezpečnosť & robustnosť**
- Acorn+JSX validácia pred renderom (odchytí syntax errors)
- Iframe console proxy → parent postMessage
- Error overlay v iframe pri runtime crash
- "Fix with AI" — pošle broken code + error späť do AI

---

## ⚠️ Čo NEFUNGUJE / je len napoly

| # | Feature | Stav | Prečo |
|---|---------|------|-------|
| 1 | **Element inspector (◉ Select)** | ⚠️ Iba injektor v iframe posiela `postMessage`, ale v `BuilderDemo.tsx` **nie je listener** na `builder-select` → klik na element nič neurobí | Chýba handler + sidebar panel `BuilderInspector.tsx` (v pláne ale nevytvorený) |
| 2 | **Inline text edit (T)** | ❌ Ikona v toolbare existuje, ale nie je napojená | `contentEditable` mode + string-replace patcher chýbajú |
| 3 | **Annotate (✎)** | ❌ Iba ikona, žiadny canvas overlay | `BuilderAnnotate.tsx` nebol vytvorený |
| 4 | **Comment pins (💬)** | ❌ Iba ikona | `BuilderComments.tsx` nebol vytvorený |
| 5 | **Publish button** | ⚠️ Mock (žiadny sheet, žiadny deploy flow) | Chýba `PublishSheet` komponent |
| 6 | **Route auto-add z promptu** | ⚠️ Helper `detectRouteFromPrompt` existuje, ale nie je zapojený v send flow | Prompt "pridaj /about" nespôsobí nový route |
| 7 | **Version timeline screenshoty** | ⚠️ Timeline je textová (prompt + timestamp), bez thumbnailov | `html2canvas` snapshot pri každej verzii chýba |
| 8 | **Keyboard shortcuts (⌘K/⌘R/⌘/)** | ❌ Iba Enter/Shift+Enter funguje | `builder-shortcuts.ts` nebol vytvorený |
| 9 | **Zoom controls preview (50/75/100/125%)** | ❌ Neexistujú | — |
| 10 | **Mobile responsive builder (<900px)** | ⚠️ Panely sa neprepínajú do tabov | Chýba media query switch |

---

## 🐛 Potenciálne bugy / hraničné prípady

- **Cache invalidation**: pri BYOK zmene sa cache key nemení (kľúč berie iba prompt + model + preset) → ak user vloží iný Mistral kľúč, môže dostať staré cached výsledky
- **Fallback UX**: keď Mistral padne na 429, fallback prebehne, ale user nevidí toast — iba badge `fallbackFrom` v správe
- **Multi-page preview**: iframe stále rendruje iba `App` z aktívnej route, žiadny reálny router injection → linky medzi routami nefungujú
- **Console tab**: chyta logy, ale nefiltruje duplikáty pri rýchlom rerender → môže byť spam
- **Vision (image upload)**: preposiela sa iba Gemini; ak user zvolí Mistral s obrázkom, obrázok sa **ticho zahodí** (žiadny warning)
- **Diff viewer**: pri prvej generácii (žiadny predchádzajúci kód) zobrazí len `+` blok — OK, ale bez hlavičky "initial version"
- **Version restore**: klik na verziu prepíše `currentCode`, ale **neaktualizuje `previousCode`** → ďalší diff je voči preskočenej verzii, mätúce

---

## 🧭 Odporúčaný ďalší krok

Vyber si jeden z troch smerov (poviem ti, ktorý má najväčší ROI, ale rozhodni ty):

**A) Dokončiť 4 floating-toolbar funkcie** (Select/Text/Annotate/Comment) — vizuálne najviditeľnejší lift, zosúladí realitu s tým čo tlačidlá sľubujú. ~4 nové súbory.

**B) Opraviť „tichých zabijakov"** (fallback toast, image-on-Mistral warning, version-restore diff, cache key vs BYOK, multi-route linky) — menej flashy, ale zlepší dôveru v produkte. ~1 deň bugfixov.

**C) Publish + zoom + shortcuts + mobile responsive** — dokončí sľúbený "production-ready" pocit. Publish sheet s inštrukciami (Vercel/Netlify CLI copy-paste).

Klikni ktorý smer chceš (A / B / C alebo mix), a spravím detailný implementačný plán s presnými súbormi.
