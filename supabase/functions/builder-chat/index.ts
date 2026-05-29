import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-builder-fallback, x-builder-model",
};

const PRESETS: Record<string, string> = {
  component: `You are an expert React component builder. Generate a single, self-contained React component using Tailwind CSS for styling.
Rules:
- Define a function component named exactly "App" (no imports, no exports)
- Use only React hooks via destructured globals (useState, useEffect, useRef, useMemo, useCallback)
- Use Tailwind CSS classes for all styling
- Include hover effects, transitions, animations
- Return ONLY the code inside a single \`\`\`jsx code fence — no explanations`,

  landing: `You are an expert landing page builder. Generate a complete landing page using React and Tailwind CSS.
Rules:
- Define a function component named exactly "App" (no imports, no exports)
- Include hero with CTA, features grid, social proof, footer
- Use only React hooks via globals (no imports)
- Tailwind CSS with gradients, shadows, modern patterns; mobile-first responsive
- Return ONLY the code inside a single \`\`\`jsx code fence`,

  app: `You are an expert React app builder. Generate a complete interactive single-page app using React and Tailwind CSS.
Rules:
- Define a function component named exactly "App" (no imports, no exports)
- Include state, interactions, forms or data display
- Use only React hooks via globals (no imports)
- Include loading/error/empty states
- Return ONLY the code inside a single \`\`\`jsx code fence`,

  custom: `You are an expert React developer. Generate clean React + Tailwind code.
Rules:
- Define a function component named exactly "App" (no imports, no exports)
- Use React hooks via globals
- Return ONLY the code inside a single \`\`\`jsx code fence`,

  fix: `You are a React code fixer. The user will give you broken code and an error message.
Return ONLY the fixed code inside a single \`\`\`jsx code fence. Keep the same component named "App", no imports, no exports.
Do not explain anything. Fix the root cause cleanly.`,
};

const MISTRAL_MODELS = new Set([
  "codestral-latest",
  "mistral-large-latest",
  "mistral-small-latest",
]);

function isMistral(model: string) {
  return MISTRAL_MODELS.has(model) || model.startsWith("mistral");
}

function jsonError(status: number, error: string, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ error, ...extra }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i === maxRetries) throw e;
      const delay = Math.pow(2, i) * 600 + Math.random() * 400;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      messages,
      preset = "component",
      model = "google/gemini-2.5-flash",
      customSystemPrompt,
      userApiKey,
    } = body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonError(400, "messages must be a non-empty array");
    }
    if (typeof model !== "string" || model.length > 80) {
      return jsonError(400, "invalid model");
    }
    if (userApiKey !== undefined && (typeof userApiKey !== "string" || userApiKey.length > 256)) {
      return jsonError(400, "invalid userApiKey");
    }

    const systemPrompt =
      (preset === "custom" && customSystemPrompt) ||
      PRESETS[preset as string] ||
      PRESETS.component;

    // Resolve provider + key
    let endpoint: string;
    let authHeader: Record<string, string>;
    let providerName: "mistral" | "gemini";

    if (isMistral(model)) {
      providerName = "mistral";
      const key =
        (typeof userApiKey === "string" && userApiKey.trim()) ||
        Deno.env.get("MISTRAL_API_KEY");
      if (!key) {
        return jsonError(401, "missing_mistral_key", { fallback: "google/gemini-2.5-flash" });
      }
      endpoint = "https://api.mistral.ai/v1/chat/completions";
      authHeader = { Authorization: `Bearer ${key}` };
    } else {
      providerName = "gemini";
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) {
        return jsonError(500, "LOVABLE_API_KEY not configured");
      }
      endpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
      authHeader = { Authorization: `Bearer ${key}`, "Lovable-API-Key": key };
    }

    const upstreamBody = JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
      // Mistral supports usage in stream via stream_options
      ...(providerName === "mistral"
        ? { stream_options: { include_usage: true } }
        : { stream_options: { include_usage: true } }),
    });

    const response = await retryWithBackoff(() =>
      fetch(endpoint, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: upstreamBody,
      })
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(`[${providerName}] upstream ${response.status}: ${text.slice(0, 500)}`);

      if (response.status === 429) {
        return jsonError(429, "rate_limited", {
          provider: providerName,
          fallback: providerName === "mistral" ? "google/gemini-2.5-flash" : null,
        });
      }
      if (response.status === 402) {
        return jsonError(402, "credits_exhausted", { provider: providerName });
      }
      if (response.status === 401) {
        return jsonError(401, "unauthorized", {
          provider: providerName,
          fallback: providerName === "mistral" ? "google/gemini-2.5-flash" : null,
        });
      }
      return jsonError(502, "upstream_error", { provider: providerName, status: response.status });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Builder-Model": model,
      },
    });
  } catch (e) {
    console.error("builder-chat error:", e);
    return jsonError(500, e instanceof Error ? e.message : "Unknown error");
  }
});
