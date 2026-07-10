import { Parser } from "acorn";
import jsx from "acorn-jsx";

const JsxParser = Parser.extend(jsx());

export function validateJsx(code: string): { ok: true } | { ok: false; error: string } {
  try {
    JsxParser.parse(code, { ecmaVersion: 2020, sourceType: "module" });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface PreviewOpts {
  darkMode?: boolean;
  inspectorMode?: boolean;
  textEditMode?: boolean;
}

export function buildPreviewHtml(code: string, darkMode: boolean = true, opts: PreviewOpts = {}): string {
  const bg = darkMode ? "bg-slate-950 text-white" : "bg-white text-slate-900";
  const inspector = opts.inspectorMode ? INSPECTOR_SCRIPT : "";
  const textEdit = opts.textEditMode ? TEXT_EDIT_SCRIPT : "";

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
    #error-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); color: #ff6b6b; padding: 2rem; font-family: monospace; font-size: 14px; white-space: pre-wrap; overflow: auto; z-index: 9999; }
    .__builder-hover { outline: 2px dashed #00e5ff !important; outline-offset: 2px; cursor: crosshair !important; }
    .__builder-selected { outline: 2px solid #00e5ff !important; outline-offset: 2px; box-shadow: 0 0 0 4px rgba(0,229,255,0.2) !important; }
  </style>
  <script>
    (function(){
      ['log','warn','error','info'].forEach(function(level){
        var orig = console[level];
        console[level] = function(){
          try {
            var args = Array.prototype.slice.call(arguments).map(function(a){
              if (a === null) return 'null';
              if (a === undefined) return 'undefined';
              if (typeof a === 'object') { try { return JSON.stringify(a); } catch(_) { return String(a); } }
              return String(a);
            });
            parent.postMessage({ type: 'builder-console', level: level, args: args }, '*');
          } catch(_) {}
          orig.apply(console, arguments);
        };
      });
      window.addEventListener('error', function(e){
        parent.postMessage({ type: 'builder-console', level: 'error', args: [e.message] }, '*');
      });
      window.addEventListener('unhandledrejection', function(e){
        parent.postMessage({ type: 'builder-console', level: 'error', args: ['Unhandled: ' + (e.reason && e.reason.message || e.reason)] }, '*');
      });
    })();
  <\/script>
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
  ${inspector}
  ${textEdit}
</body>
</html>`;
}

const INSPECTOR_SCRIPT = `<script>
  (function(){
    let hovered = null;
    let selected = null;
    function describe(el){
      return {
        tag: el.tagName.toLowerCase(),
        classes: (el.className && typeof el.className === 'string') ? el.className : '',
        text: (el.innerText || '').slice(0, 120),
        id: el.id || '',
      };
    }
    document.addEventListener('mouseover', function(e){
      if (hovered) hovered.classList.remove('__builder-hover');
      hovered = e.target;
      if (hovered && hovered.id !== 'root') hovered.classList.add('__builder-hover');
    }, true);
    document.addEventListener('mouseout', function(){
      if (hovered) hovered.classList.remove('__builder-hover');
    }, true);
    document.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      if (selected) selected.classList.remove('__builder-selected');
      selected = e.target;
      selected.classList.add('__builder-selected');
      parent.postMessage({ type: 'builder-select', el: describe(selected) }, '*');
    }, true);
  })();
<\/script>`;

const TEXT_EDIT_SCRIPT = `<script>
  (function(){
    function isTextNode(el){
      if (!el || !el.childNodes) return false;
      if (el.childNodes.length === 0) return false;
      for (var i=0;i<el.childNodes.length;i++){
        if (el.childNodes[i].nodeType !== 3) return false;
      }
      return (el.innerText || '').trim().length > 0;
    }
    document.addEventListener('mouseover', function(e){
      if (isTextNode(e.target)) e.target.style.outline = '1px dashed #00e5ff';
    }, true);
    document.addEventListener('mouseout', function(e){
      if (e.target && e.target.style) e.target.style.outline = '';
    }, true);
    document.addEventListener('dblclick', function(e){
      if (!isTextNode(e.target)) return;
      e.preventDefault();
      var el = e.target;
      var original = el.innerText;
      el.setAttribute('contenteditable','true');
      el.focus();
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
      function commit(){
        el.removeAttribute('contenteditable');
        el.removeEventListener('blur', commit);
        var next = el.innerText;
        if (next !== original) {
          parent.postMessage({ type: 'builder-text-edit', from: original, to: next }, '*');
        }
      }
      el.addEventListener('blur', commit);
    }, true);
  })();
<\/script>`;


export function extractCodeFromResponse(response: string): string {
  const codeBlockRegex = /```(?:jsx|tsx|javascript|js|react)?\s*\n([\s\S]*?)```/;
  const match = response.match(codeBlockRegex);
  if (match && match[1]) return match[1].trim();
  if (
    response.includes("function App") ||
    response.includes("export default") ||
    response.includes("const App")
  )
    return response.trim();
  return response.trim();
}
