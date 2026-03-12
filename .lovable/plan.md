

# Plan: Vercel Projects Integration

## Overview
Add a feature to the Projects page where users can enter their Vercel API token, fetch real projects from Vercel API, see screenshot previews, and select up to 8 top projects to display in the portfolio.

## How it works

1. **Token Input** -- A settings panel on the Projects page with a token input field. Token is stored in `localStorage` for persistence.

2. **Fetch Vercel Projects** -- Vercel API (`https://api.vercel.com/v9/projects`) is called directly from the frontend (public API, token is user's own). Returns project name, framework, URLs, latest deployments.

3. **Project Thumbnails** -- Use Vercel's deployment screenshot API or OG image. For each project with a production domain, generate a thumbnail via `https://api.microlink.io/?url={domain}&screenshot=true` (free, no key needed) as a fallback since Vercel doesn't provide screenshots directly.

4. **Selection UI** -- Grid of fetched projects with checkboxes. User selects up to 8. Selected projects replace the hardcoded list and are saved to `localStorage`.

5. **Display** -- Selected projects show with real thumbnails, names, frameworks, and links to live deployments.

## Technical Details

### Files to create/modify

- **`src/lib/vercel.ts`** -- API helper: fetch projects list, fetch deployments, build screenshot URLs
- **`src/components/VercelTokenDialog.tsx`** -- Dialog with token input + project selection grid (checkboxes, thumbnails, max 8)
- **`src/pages/Projects.tsx`** -- Add "Connect Vercel" button; if projects are saved in localStorage, display real Vercel projects instead of hardcoded ones; show thumbnails via iframe or screenshot service

### Vercel API calls (client-side, user's own token)
- `GET https://api.vercel.com/v9/projects` with `Authorization: Bearer {token}`
- Response includes: `name`, `framework`, `link` (production domain), `latestDeployments`, `updatedAt`

### Data flow
```text
Token Input → localStorage
     ↓
Fetch /v9/projects → Show grid with thumbnails
     ↓
User selects ≤8 → Save selection to localStorage
     ↓
Projects page renders real data with live links + screenshots
```

### Screenshot approach
For each project with a production URL, use the open `https://v1.screenshot.11ty.dev/{url}/opengraph/` service (free, no API key) or simple iframe embed with pointer-events disabled.

### Security note
Token stays in `localStorage` only -- never sent to any backend. User can disconnect/clear token anytime.

