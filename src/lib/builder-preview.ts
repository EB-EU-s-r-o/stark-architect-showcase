export function buildPreviewHtml(code: string, darkMode: boolean = true): string {
  const bg = darkMode ? "bg-slate-950 text-white" : "bg-white text-slate-900";
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; }
    #root { min-height: 100vh; }
    #error-overlay {
      display: none;
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.85);
      color: #ff6b6b;
      padding: 2rem;
      font-family: monospace;
      font-size: 14px;
      white-space: pre-wrap;
      overflow: auto;
      z-index: 9999;
    }
  </style>
</head>
<body class="${bg}">
  <div id="root"></div>
  <div id="error-overlay"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext, createContext } = React;

    try {
      ${code}

      if (typeof App !== 'undefined') {
        ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
      }
    } catch (e) {
      const overlay = document.getElementById('error-overlay');
      overlay.style.display = 'block';
      overlay.textContent = '⚠️ Render Error:\\n\\n' + e.message + '\\n\\n' + (e.stack || '');
      window.parent.postMessage({ type: 'preview-error', error: e.message }, '*');
    }
  <\/script>
  <script>
    window.onerror = function(msg, src, line, col, err) {
      const overlay = document.getElementById('error-overlay');
      overlay.style.display = 'block';
      overlay.textContent = '⚠️ Runtime Error:\\n\\n' + msg + '\\nLine: ' + line;
      window.parent.postMessage({ type: 'preview-error', error: msg }, '*');
    };
  <\/script>
</body>
</html>`;
}

export function extractCodeFromResponse(response: string): string {
  // Try to find ```jsx or ```tsx or ``` code blocks
  const codeBlockRegex = /```(?:jsx|tsx|javascript|js|react)?\s*\n([\s\S]*?)```/;
  const match = response.match(codeBlockRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Fallback: if response looks like code (has function/const/import), use it directly
  if (response.includes('function App') || response.includes('export default') || response.includes('const App')) {
    return response.trim();
  }
  
  return response.trim();
}
