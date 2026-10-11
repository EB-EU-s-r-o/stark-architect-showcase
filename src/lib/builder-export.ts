import JSZip from "jszip";
import { buildPreviewHtml } from "./builder-preview";

export interface ExportOpts {
  /** Include staged preview wrapper + AnimatePresence-style reveal CSS in exported index.html. Default false (full-page). */
  staged?: boolean;
}

export async function exportBundle(code: string, name = "builder-app", opts: ExportOpts = {}) {
  const staged = opts.staged === true;
  const zip = new JSZip();
  zip.file("index.html", buildPreviewHtml(code, true, { staged }));
  zip.file("App.jsx", code);
  zip.file(
    "README.md",
    `# ${name}\n\nGenerated with AI Builder.\n\nMode: **${staged ? "staged preview" : "full-page"}**\n\n## Run\nOpen \`index.html\` directly, or serve the folder with any static server.\n`
  );
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}${staged ? "-staged" : ""}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

const dl = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const HOOKS = "import { useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext, createContext } from \"react\";\n";

const compName = (route: string) =>
  route === "/" ? "Home" : route.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join("") || "Page";

/** Full standalone React + Vite + Tailwind project, ready for `npm install && npm run dev`. */
export async function exportViteProject(routes: Record<string, string>, name = "builder-app") {
  const zip = new JSZip();
  const entries = Object.entries(routes);
  const multi = entries.length > 1;
  zip.file("package.json", JSON.stringify({
    name, private: true, version: "0.1.0", type: "module",
    scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
    dependencies: { react: "^18.3.1", "react-dom": "^18.3.1", ...(multi ? { "react-router-dom": "^6.26.2" } : {}) },
    devDependencies: { "@vitejs/plugin-react": "^4.3.1", vite: "^5.4.1", tailwindcss: "^3.4.11", postcss: "^8.4.47", autoprefixer: "^10.4.20" },
  }, null, 2));
  zip.file("vite.config.ts", `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({ plugins: [react()] });\n`);
  zip.file("tailwind.config.js", `/** @type {import('tailwindcss').Config} */\nexport default {\n  content: ["./index.html", "./src/**/*.{js,jsx}"],\n  theme: { extend: {} },\n  plugins: [],\n};\n`);
  zip.file("postcss.config.js", `export default { plugins: { tailwindcss: {}, autoprefixer: {} } };\n`);
  zip.file("index.html", `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${name}</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>\n`);
  zip.file("src/index.css", "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n");
  zip.file(".gitignore", "node_modules\ndist\n");
  const imports: string[] = [];
  const routeEls: string[] = [];
  for (const [route, code] of entries) {
    const c = compName(route);
    zip.file(`src/pages/${c}.jsx`, `${HOOKS}\n${code}\n\nexport default App;\n`);
    imports.push(`import ${c} from "./pages/${c}.jsx";`);
    routeEls.push(`        <Route path="${route}" element={<${c} />} />`);
  }
  const app = multi
    ? `import { BrowserRouter, Routes, Route } from "react-router-dom";\n${imports.join("\n")}\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <Routes>\n${routeEls.join("\n")}\n      </Routes>\n    </BrowserRouter>\n  );\n}\n`
    : `${imports[0]}\n\nexport default function App() {\n  return <${compName(entries[0]?.[0] ?? "/")} />;\n}\n`;
  zip.file("src/App.jsx", app);
  zip.file("src/main.jsx", `import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App.jsx";\nimport "./index.css";\n\nReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);\n`);
  zip.file("README.md", `# ${name}\n\nGenerated with AI Builder.\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\nPages: ${entries.map(([r]) => r).join(", ")}\n`);
  dl(await zip.generateAsync({ type: "blob" }), `${name}-vite.zip`);
}
