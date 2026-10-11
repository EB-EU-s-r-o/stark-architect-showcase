import { useEffect, useState } from "react";

interface Props {
  code: string;
  /** Text of the element selected in preview; matching lines get highlighted. */
  highlight?: string;
}

let highlighterPromise: Promise<any> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
      import("shiki/langs/tsx.mjs"),
      import("shiki/themes/one-dark-pro.mjs"),
    ]).then(([core, eng, tsx, theme]) =>
      core.createHighlighterCore({
        themes: [theme.default],
        langs: [tsx.default],
        engine: eng.createJavaScriptRegexEngine(),
      })
    );
  }
  return highlighterPromise;
}

export default function BuilderCodeView({ code, highlight }: Props) {
  const [html, setHtml] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHighlighter()
      .then((hl) => {
        if (cancelled) return;
        const needle = (highlight || "").trim().split("\n")[0].slice(0, 40);
        const lines = (code || "").split("\n");
        const out = hl.codeToHtml(code || "", {
          lang: "tsx",
          theme: "one-dark-pro",
          transformers: needle ? [{
            line(node: any, line: number) {
              if (lines[line - 1]?.includes(needle)) {
                node.properties["data-hl"] = "true";
                node.properties.style = "background:hsl(var(--primary)/0.18);box-shadow:inset 2px 0 0 hsl(var(--primary));display:inline-block;width:100%";
              }
            },
          }] : [],
        });
        setHtml(out);
        setReady(true);
      })
      .catch(() => setReady(true));
    return () => {
      cancelled = true;
    };
  }, [code, highlight]);

  useEffect(() => {
    if (!html || !highlight) return;
    requestAnimationFrame(() => document.querySelector(".shiki-wrapper [data-hl]")?.scrollIntoView({ block: "center" }));
  }, [html, highlight]);

  if (!ready || !html) {
    return (
      <pre className="font-mono text-xs text-muted-foreground whitespace-pre-wrap p-4">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      className="shiki-wrapper text-xs [&_pre]:!bg-transparent [&_pre]:!p-4 [&_pre]:!m-0 [&_pre]:overflow-auto"
      // shiki produces escaped HTML — safe to render
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
