import JSZip from "jszip";
import { buildPreviewHtml } from "./builder-preview";

export async function exportBundle(code: string, name = "builder-app") {
  const zip = new JSZip();
  zip.file("index.html", buildPreviewHtml(code, true, { staged: false }));
  zip.file("App.jsx", code);
  zip.file(
    "README.md",
    `# ${name}\n\nGenerated with AI Builder.\n\n## Run\nOpen \`index.html\` directly, or serve the folder with any static server.\n`
  );
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
