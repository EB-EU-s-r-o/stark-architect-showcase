import { useEffect, useState } from "react";

interface Props {
  code: string;
}

let highlighterPromise: Promise<any> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then((s) =>
      s.createHighlighter({
        themes: ["one-dark-pro"],
        langs: ["tsx", "jsx"],
      })
    );
  }
  return highlighterPromise;
}

export default function BuilderCodeView({ code }: Props) {
  const [html, setHtml] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHighlighter()
      .then((hl) => {
        if (cancelled) return;
        const out = hl.codeToHtml(code || "", {
          lang: "tsx",
          theme: "one-dark-pro",
        });
        setHtml(out);
        setReady(true);
      })
      .catch(() => setReady(true));
    return () => {
      cancelled = true;
    };
  }, [code]);

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
