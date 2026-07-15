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
