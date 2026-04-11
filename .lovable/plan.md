

# Plan: Production-Ready AI Builder with Live Code Generation & Preview

## Current State
The `/builder` page is a **fake demo** -- it cycles through 3 hardcoded responses. No real AI, no live preview rendering. No Supabase/Cloud connected.

## What We'll Build
A fully functional AI-powered code builder that:
- Takes user prompts and generates real React/Tailwind code via Lovable AI
- Renders the generated code as a **live preview** in a sandboxed iframe
- Supports multiple output types: components, landing pages, one-page apps
- Has a configurable settings panel (model, theme, system prompt)
- Streams AI responses token-by-token with typing effect

## Prerequisites
1. **Enable Lovable Cloud** -- needed for edge functions + `LOVABLE_API_KEY`
2. **Create Supabase edge function** for AI calls (secrets stay server-side)

## Architecture

```text
User prompt → Edge Function (chat) → Lovable AI Gateway
                                          ↓
                              Streamed code response
                                          ↓
               Frontend parses code → Injects into srcdoc iframe
                                          ↓
                              Live preview renders instantly
```

## Implementation Steps

### 1. Enable Lovable Cloud & Create Edge Function
- `supabase/functions/builder-chat/index.ts`
- System prompt instructs the AI to return **only valid JSX/React code** wrapped in a specific format
- Supports streaming SSE responses
- Handles 429/402 errors gracefully

### 2. Live Preview Engine (srcdoc iframe)
- Take generated code and wrap it in a full HTML document with:
  - Tailwind CDN (`<script src="https://cdn.tailwindcss.com">`)
  - React CDN (UMD builds)
  - Babel standalone for JSX transpilation
- Render inside a sandboxed `<iframe srcdoc="...">` 
- Updates on every new code generation
- Device frame switching (mobile/tablet/desktop) resizes the iframe

### 3. Rewrite BuilderDemo.tsx (~600 lines)
Major changes:
- **Real AI chat**: Replace `FAKE_RESPONSES` with `streamChat()` calling the edge function
- **Code extraction**: Parse AI response to extract code blocks (```jsx ... ```)
- **Live preview**: `<iframe srcdoc={buildPreviewHtml(code)}>` instead of static placeholder
- **Settings panel**: Collapsible drawer with:
  - Preset selector (Component / Landing Page / One-Page App / Custom)
  - Theme toggle (dark/light preview)
  - Custom system prompt textarea
  - Model selector dropdown
- **Code editor improvements**: Syntax highlighting with line numbers, copy button, download button
- **History**: Save last 10 generations to localStorage for quick reload
- **Export**: Download generated code as `.tsx` file

### 4. Preset System Prompts
Each preset tailors the AI output:
- **Component**: Single reusable React component with props
- **Landing Page**: Full hero + features + CTA + footer sections
- **One-Page App**: Interactive app with state management
- **Custom**: User-defined system prompt

### 5. UI/UX Upgrades
- Streaming code appears character-by-character in the editor
- Preview auto-refreshes after code generation completes
- Error boundary in preview catches render errors and shows friendly message
- Resizable panels (chat | code | preview) with drag handles
- Keyboard shortcuts: Enter to send, Cmd+K for settings
- Loading skeleton in preview while generating
- Toast notifications for errors/success

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/builder-chat/index.ts` | Create -- edge function for AI |
| `src/pages/BuilderDemo.tsx` | Rewrite -- full functional builder |
| `src/lib/builder-preview.ts` | Create -- iframe HTML builder utility |
| `src/lib/builder-presets.ts` | Create -- system prompt presets |
| `src/components/BuilderSettings.tsx` | Create -- settings drawer component |

## Technical Details

**Preview HTML template** wraps generated code:
```html
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${generatedCode}
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>
```

**Code extraction** from AI response uses regex to find fenced code blocks and falls back to treating the entire response as code if no fences found.

**Error handling in preview**: The iframe includes a try-catch wrapper and `window.onerror` handler that posts error messages back to the parent via `postMessage`.

