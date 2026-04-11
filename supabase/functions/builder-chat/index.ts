import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRESETS: Record<string, string> = {
  component: `You are an expert React component builder. Generate a single, self-contained React component using Tailwind CSS for styling.
Rules:
- Export a default function component named "App"
- Use only React hooks (useState, useEffect, useRef, useMemo, useCallback) — no external imports
- Use Tailwind CSS classes for all styling
- Make components interactive with proper state management
- Include hover effects, transitions, and animations where appropriate
- Return ONLY the code inside a single \`\`\`jsx code fence — no explanations before or after
- The component must render correctly standalone`,

  landing: `You are an expert landing page builder. Generate a complete, modern landing page using React and Tailwind CSS.
Rules:
- Export a default function component named "App"
- Include: hero section with CTA, features grid, testimonials or social proof, and footer
- Use only React hooks — no external imports
- Use Tailwind CSS for all styling with gradients, shadows, and modern design patterns
- Make it responsive (mobile-first)
- Include smooth scroll behavior and hover animations
- Return ONLY the code inside a single \`\`\`jsx code fence — no explanations`,

  app: `You are an expert React app builder. Generate a complete, interactive single-page application using React and Tailwind CSS.
Rules:
- Export a default function component named "App"
- Include state management, user interactions, forms, or data display
- Use only React hooks — no external imports
- Use Tailwind CSS for all styling
- Include loading states, error handling, and empty states where relevant
- Make it fully functional and interactive
- Return ONLY the code inside a single \`\`\`jsx code fence — no explanations`,

  custom: `You are an expert React developer. Generate clean, production-ready React code with Tailwind CSS.
Rules:
- Export a default function component named "App"
- Use only React hooks — no external imports
- Use Tailwind CSS for all styling
- Return ONLY the code inside a single \`\`\`jsx code fence — no explanations`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, preset = "component", customSystemPrompt } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = customSystemPrompt || PRESETS[preset] || PRESETS.component;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("builder-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
