# Prenositeľný balík „Builder“ (React + Tailwind)

## Čo dostaneš
Jeden ZIP na stiahnutie z chatu plus textový návod, aby sa dal builder vložiť do akéhokoľvek React projektu (Vite, Next, Remix) za pár minút, bez naviazania na tento portfólio web.

Súbory pripravím do `/mnt/documents/builder-kit.zip` a k tomu `builder-kit-README.md` (návod v texte, aby sa dal čítať aj bez rozbalenia).

## Obsah ZIPu

```text
builder-kit/
  README.md                 inštalácia, kroky, časté chyby
  INTEGRATION.md            Vite / Next / Remix varianty + server funkcia
  package.deps.json         presný zoznam potrebných knižníc
  tailwind.snippet.md       farby, tokeny, doplnky do Tailwind konfigurácie
  theme.css                 čierno-cyan tokeny (dá sa prepísať vlastnými)
  src/
    builder/
      BuilderApp.tsx        jedna komponenta = celý builder
      panels/               chat, náhľad, kód, diff, konzola, verzie, dialógy
      ai-elements/          chat primitívy
      lib/                  preview engine, kontrola kódu, cache, ceny,
                            verzie, routovanie, export ZIP
      config.ts             jediné miesto na nastavenie: endpoint, modely,
                            texty, predvolený vzhľad
  server/
    supabase-edge/index.ts  serverová funkcia pre Supabase
    node-express.ts         to isté pre Node/Express
    next-route.ts           to isté pre Next.js App Router
```

## Ako sa balík použije (bude aj v README)
1. Skopírovať `src/builder/` do projektu.
2. Doinštalovať knižnice zo `package.deps.json`.
3. Pridať `theme.css` a úpravy z `tailwind.snippet.md`.
4. Vložiť jednu zo serverových funkcií a nastaviť kľúč modelu na serveri.
5. V `config.ts` nastaviť adresu tejto funkcie a zoznam modelov.
6. Vykresliť `<BuilderApp />` na vlastnej stránke.

## Univerzálnosť
- Builder nebude záležať na routeri ani na konkrétnom backende — komunikuje len s jednou adresou, ktorú si nastavíš.
- Žiadne odkazy na tento projekt: preberiem naviazanie na Supabase klienta, PWA, portfólio štýly a nahradím ich nastavením v `config.ts`.
- Vzhľad je oddelený do `theme.css`, takže sa dá zmeniť na svetlý či iný firemný štýl bez zásahu do kódu.
- Kľúč k modelu zostáva na serveri; voliteľné zadanie kľúča v rozhraní ostane vypnuté a zapína sa jedným prepínačom v nastaveniach.

## Čo zostane funkčné
Chat s postupným písaním odpovede, generovanie kódu, živý náhľad v izolovanom rámci, kontrola chýb s opravou pomocou AI, viac stránok, náhľad pre mobil/tablet/desktop, verzie a porovnanie zmien, konzola, počítanie tokenov a ceny, cache a export hotového výsledku do ZIPu.

## Technické poznámky
- Zdroj: existujúce `src/pages/BuilderDemo.tsx`, `src/components/builder/*`, `src/components/ai-elements/*`, `src/lib/builder-*.ts`, `supabase/functions/builder-chat/index.ts`.
- `BuilderDemo.tsx` rozdelím na `BuilderApp.tsx` + panely; kontrakty (SSE parser so sentinelom `streaming`, `postMessage` protokol náhľadu, cache kľúče, fallback medzi modelmi) nechám bez zmeny.
- Závislosti: `react`, `react-dom`, `tailwindcss`, `framer-motion`/`motion`, `lucide-react`, `react-resizable-panels`, `jszip`, `acorn` + `acorn-jsx`, `shiki`, `clsx`, `tailwind-merge`, plus použité Radix primitívy (`dialog`, `select`, `tooltip`, `tabs`, `scroll-area`).
- Potrebné shadcn UI súbory priložím priamo do `src/builder/ui/`, aby balík nevyžadoval shadcn inštaláciu.
- Serverové varianty budú mať rovnaký SSE formát, aby bol frontend nezmenený.
- Tento web sa nemení — balík je samostatný výstup do `/mnt/documents`.

## Kontrola pred odovzdaním
- Rozbalím ZIP do dočasného priečinka, spustím typovú kontrolu skopírovaných súborov a overím, že v balíku nie sú žiadne importy mimo `src/builder/`.
- Prejdem README aj INTEGRATION na presnosť krokov.
