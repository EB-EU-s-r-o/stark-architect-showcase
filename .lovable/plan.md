# Redesign `/builder` podľa Chatbot UI

## Cieľ
Prestavím celú sekciu `/builder` do prehľadného pracovného prostredia inšpirovaného `mckaywrigley/chatbot-ui`, ale zachovám čierno-čiernu, cyan a terminálovú identitu portfólia. Nepreberiem Next.js ani jeho databázovú vrstvu; prenesiem iba overené rozloženie, navigáciu a interakčné vzory vhodné pre existujúcu React/Vite aplikáciu.

## Nové rozloženie

```text
┌──────┬──────────────────┬────────────────────────────────────────────┐
│ Rail │ Projekty/chaty   │ AI Builder workspace                       │
│      │ + nový chat      │ hlavička + chat/preview/code workspace     │
│      │ hľadanie         │                                            │
│      │ história         │ composer pevne pri spodnom okraji          │
└──────┴──────────────────┴────────────────────────────────────────────┘
```

- **Ikonový rail:** Chat, Preview, Code, Diff, Console, Versions a Settings; aktívna položka bude jasne zvýraznená.
- **Bočný panel:** nový chat, filtrovanie konverzácií, posledné generácie, typ výstupu a zbalenie panelu.
- **Pracovná plocha:** kompaktná hlavička s názvom, modelom, stavom generovania a publikovaním; chat a výstup budú resizable panely.
- **Mobil:** jedno plátno naraz s jednoduchým prepínačom Chat/Preview/Code; panely sa nebudú prekrývať.

## Chat postavený na AI Elements
- Nainštalujem oficiálne zdrojové komponenty `conversation`, `message`, `prompt-input` a `shimmer` z AI Elements.
- Konverzácia dostane stabilné automatické rolovanie a návrat na koniec.
- Správy používateľa ostanú kontrastné; odpovede AI budú bez farebnej bubliny, podobne ako Chatbot UI.
- Streaming bude zobrazovať decentné „Thinking…“ a priebežnú odpoveď bez skákania rozloženia.
- Composer bude obsahovať obrázkovú prílohu, model, Send/Stop a zachová Enter/Shift+Enter správanie.
- Zachovám údaje pri odpovedi: model, tokeny, čas, cena, cache a fallback.
- `tool` komponent nepridám, pretože aktuálna AI funkcia neposiela tool calls.

## Zachované a presunuté funkcie
- Live React/Tailwind preview, staged generovanie a animácie.
- Mistral/Gemini, BYOK, automatický fallback a vision cez Gemini.
- Multi-route projekty, pridanie stránky a prepínanie trás.
- Desktop/tablet/mobile náhľad, refresh, zoom a otvorenie v novej karte.
- Preview, Code, Diff, Console a Versions bez straty ich dát alebo správania.
- Element select, inline text edit, anotácie a komentáre pre AI.
- JSX kontrola, runtime chyby, Retry a Fix with AI.
- Cache, náklady, história, ZIP export a publish dialóg.
- Klávesové skratky a uložené session nastavenia.

## UX úpravy
- Nahradím systémové `prompt()` a `confirm()` vlastnými dialógmi pre novú route a režim exportu.
- Presuniem model a hlavné nastavenia do kompaktnej hlavičky/composeru podľa Chatbot UI.
- Pridám akcie Copy a Retry k AI správam bez rušivých permanentných tlačidiel.
- Zjednotím výšky ovládacích prvkov, stavy aktívnych panelov, tooltipy a focus stavy.
- Zjemním cyan glow; hierarchiu budú tvoriť hlavne čierne povrchy, deliace čiary a typografia.
- Zachovám JetBrains Mono a existujúce farebné tokeny namiesto kopírovania cudzej vizuálnej témy.

## Technické riešenie
- Rozdelím monolitickú stránku na menšie časti: workspace shell, rail/sidebar, chat surface, header a export/route dialógy.
- Existujúcu streaming a builder logiku ponechám bez zmeny kontraktov, vrátane sentinel správy `streaming`, iframe `postMessage`, cache kľúčov a virtual routes.
- Chatbot UI použijem ako MIT dizajnovú referenciu; nebudem prenášať jeho Next.js routing, server actions, databázu, i18n ani veľký globálny context.
- AI Elements prispôsobím existujúcim shadcn komponentom a semantickým tokenom projektu.

## Overenie
- Produkčný build a lint.
- Desktop kontrola pri 1280 px: skladanie panelov, resize, streaming, náhľad a všetky nástroje.
- Mobilná kontrola pri 390–420 px: Chat/Preview/Code, composer, príloha a žiadne prekrývanie.
- Funkčný test: prompt → streaming → kód → preview; potom route, diff, console, version restore, retry, export a publish.
- Vizuálne porovnanie screenshotov pred/po so zachovaním čitateľnosti a čierno-cyan identity.
