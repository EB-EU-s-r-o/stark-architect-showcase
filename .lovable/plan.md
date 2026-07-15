## Cieľ

Náhľad v `/builder` momentálne roztiahne vygenerovaný komponent na celú výšku panelu (`min-h-screen` v sandboxe + iframe cez celý pravý stĺpec). Chceš ho zamknúť do menších "card" kontajnerov, ktoré sa objavujú postupne (staggered reveal) a majú jemné UI/UX mikroanimácie, aby preview pôsobilo živo a prezentačne — nie ako plná stránka.

## Čo zmením

### 1. Preview "stage" namiesto full-bleed iframe
V `BuilderDemo.tsx` (pravý panel) obalím iframe do centrovanej **device-frame karty**:
- max šírka ~960px, max výška ~72vh, `rounded-2xl`, jemný border + `shadow-glow` (cyan token)
- okolo grid pattern pozadie (už máme `.grid-pattern-subtle` v `index.css`) → preview vyzerá "položené" na plátne, nie roztiahnuté
- traffic-light bodky + route label hore na karte (mac-style chrome)
- zoom controls a floating toolbar zostanú, len sa prepočítajú voči karte

### 2. Sandbox: preč s `min-h-screen`
V `src/lib/builder-preview.ts`:
- odstrániť `min-height: 100vh` z `body` a `#root`
- pridať wrapper `.builder-stage` s `padding`, `max-width`, `margin: 0 auto`, aby generovaný App žil v kompaktnom rámci a neťahal sa donekonečna
- pridať globálne CSS: `.builder-stage > * { animation: builder-pop 420ms cubic-bezier(.16,1,.3,1) both; }` s `nth-child` stagger delayom (60ms krokom) → sekcie generovaného UI sa objavia postupne
- jemný `backdrop` gradient + `scanline` overlay (voliteľne, veľmi decentné, opacity ~0.04)

### 3. Streaming reveal počas generovania
Aktuálne sa iframe refreshne až po dokončení streamu. Pridám:
- počas `isLoading` prekryjem preview kartu **skeleton mriežkou** (3–4 shimmer bloky rôznej výšky, `animate-pulse` + `bg-gradient-to-r`)
- keď dorazí prvý kompletný JSX blok, karta sa "flipne" cez `motion.div` (opacity + scale 0.98→1, 300ms)
- pri každom novom builde: iframe fade-out (150ms) → nový obsah fade-in + subtle scale-in (framer-motion, `AnimatePresence`, key = hash kódu)

### 4. Mikroanimácie chrome-u
- route bar chip: hover glow (`transition-shadow`)
- floating toolbar tlačidlá: `whileTap={{ scale: 0.92 }}`, aktívny stav má cyan glow ring
- zoom controls: numerická hodnota animovane (`AnimatePresence` na percentách)
- keď sa objaví toast / warning (napr. Mistral+image fallback), pridám `slide-in-right` (už máme v tailwind config)

### 5. Nový komponent `BuilderStage.tsx`
Aby `BuilderDemo.tsx` nenarástol, vytiahnem preview-kartu + skeleton + zoom + toolbar mount do jedného komponentu:
```
src/components/builder/BuilderStage.tsx
```
Props: `html`, `isLoading`, `zoom`, `route`, `tool`, `onToolChange`, overlay props.

## Technické poznámky

- `builder-preview.ts` `buildPreviewHtml` dostane nový param `staged?: boolean` (default true). Keď `false`, správa sa ako dnes (pre export cez `builder-export.ts` — publikovaná appka NECHCE stage rámik).
- `exportBundle` musí volať `buildPreviewHtml(code, dark, { staged: false })` aby export bol full-page.
- Stagger CSS pridám do inline `<style>` v sandboxe (nie do `index.css`) — inak by ovplyvnil hlavnú aplikáciu.
- Animácie robím cez Tailwind keyframes + framer-motion (obe už v projekte).
- Žiadne zmeny business logiky: chat stream, cache, versions, BYOK, routing zostávajú.

## Súbory

- upraviť `src/lib/builder-preview.ts` — staged wrapper, stagger CSS, no `min-h-screen`
- upraviť `src/pages/BuilderDemo.tsx` — použiť `BuilderStage`, pridať `AnimatePresence` na iframe key
- upraviť `src/lib/builder-export.ts` — volať `buildPreviewHtml` so `staged: false`
- vytvoriť `src/components/builder/BuilderStage.tsx` — device-frame karta + skeleton + motion wrapper

## Nemením

- streaming pipeline v `supabase/functions/builder-chat`
- versions, cache, router, publish sheet
- vizuálnu identitu appky (JetBrains Mono, cyan glow, black-on-black)
