/**
 * ticket-editor — a tiny Excalidraw editor that commits edits straight back to the repo.
 *
 *   GET  /?slug=<slug>&branch=<branch>   → the editor page (loads <slug>.excalidraw from the repo)
 *   POST /api/save  { slug, branch, scene, png }   → commits <slug>.excalidraw (+ <slug>.png) to the branch
 *
 * Mobile round-trip with ZERO third-party login: the Worker authenticates as the **Crouton GitHub
 * App** and commits as crouton[bot], so the phone never authorizes anything. On Save, Excalidraw
 * exports the PNG in-browser (exportToBlob, scene embedded) — the committed image is exactly what
 * you edited (WYSIWYG).
 *
 * Auth (epic #519, WS2): no stored PAT. The Worker holds the App's private key and mints a
 * short-lived (~1h) installation token just-in-time per request with @octokit/auth-app — the only
 * durable secret is the private key. Signing runs on WebCrypto (crypto.subtle), so the key MUST be
 * PKCS#8 (-----BEGIN PRIVATE KEY-----); convert GitHub's PKCS#1 key first (see SECRETS.md).
 * Setup (per workers/ticket-editor/SECRETS.md):
 *   wrangler secret put GITHUB_APP_PRIVATE_KEY   (the App's PKCS#8 private key)
 *   wrangler secret put GITHUB_APP_ID            (or set as a var)
 *   wrangler secret put GITHUB_APP_INSTALLATION_ID
 */
import { createAppAuth } from '@octokit/auth-app'

interface Env {
  GITHUB_APP_ID: string // the Crouton GitHub App's id
  GITHUB_APP_PRIVATE_KEY: string // the App's PEM private key (the one durable secret)
  GITHUB_APP_INSTALLATION_ID: string // the installation on pmcp/nuxt-crouton
  REPO: string // "pmcp/nuxt-crouton"
  DIAGRAMS_DIR: string // "writeups/diagrams"
}

// Cache the auth instance across requests in the isolate so @octokit/auth-app can reuse/refresh the
// installation token (GitHub caps it at ~1h; the lib mints a fresh one just-in-time when needed).
let cachedAuth: ReturnType<typeof createAppAuth> | null = null
let cachedKey: string | null = null

async function installationToken(env: Env): Promise<string> {
  if (!cachedAuth || cachedKey !== env.GITHUB_APP_PRIVATE_KEY) {
    cachedAuth = createAppAuth({
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY,
      installationId: env.GITHUB_APP_INSTALLATION_ID,
    })
    cachedKey = env.GITHUB_APP_PRIVATE_KEY
  }
  const { token } = await cachedAuth({ type: 'installation' })
  return token
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (req.method === 'POST' && url.pathname === '/api/save') return save(req, env)
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/edit')) {
      return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    }
    return new Response('Not found', { status: 404 })
  },
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })
}

// UTF-8 safe base64 for text content.
function toB64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

async function putFile(env: Env, token: string, branch: string, path: string, contentB64: string, message: string): Promise<void> {
  const api = 'https://api.github.com/repos/' + env.REPO + '/contents/' + path
  const headers = {
    authorization: 'Bearer ' + token,
    accept: 'application/vnd.github+json',
    'user-agent': 'ticket-editor',
    'content-type': 'application/json',
  }
  let sha: string | undefined
  const getRes = await fetch(api + '?ref=' + encodeURIComponent(branch), { headers })
  if (getRes.ok) sha = ((await getRes.json()) as { sha?: string }).sha
  const putRes = await fetch(api, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ message, content: contentB64, branch, sha }),
  })
  if (!putRes.ok) throw new Error('PUT ' + path + ' → ' + putRes.status + ' ' + (await putRes.text()))
}

async function save(req: Request, env: Env): Promise<Response> {
  try {
    const { slug, branch, scene, png } = (await req.json()) as {
      slug?: string
      branch?: string
      scene?: unknown
      png?: string
    }
    if (!slug || !branch || !scene) return json({ error: 'slug, branch and scene are required' }, 400)
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(slug)) return json({ error: 'bad slug' }, 400)
    const dir = env.DIAGRAMS_DIR || 'writeups/diagrams'
    const msg = 'chore(diagrams): edit ' + slug + ' via ticket-editor'
    // Mint a fresh ~1h installation token just-in-time, reuse it for both commits.
    const token = await installationToken(env)
    await putFile(env, token, branch, dir + '/' + slug + '.excalidraw', toB64(JSON.stringify(scene, null, 2) + '\n'), msg)
    if (png) {
      const b64 = png.includes(',') ? png.split(',')[1] : png
      await putFile(env, token, branch, dir + '/' + slug + '.png', b64, msg + ' (png)')
    }
    return json({ ok: true })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
}

// ── Editor page (no build step; Excalidraw via ESM CDN). Client JS uses string concatenation
// (no template literals) so it survives this server-side template literal unescaped. ──
const PAGE = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Ticket diagram editor</title>
<link rel="stylesheet" href="https://esm.sh/@excalidraw/excalidraw@0.17.6/index.css" />
<!-- Import map so excalidraw's bare "react"/"react-dom" specifiers (it's loaded with
     ?external=react,react-dom) resolve to the SAME esm.sh instances we import below. -->
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.3.1",
    "react/jsx-runtime": "https://esm.sh/react@18.3.1/jsx-runtime",
    "react-dom": "https://esm.sh/react-dom@18.3.1",
    "react-dom/client": "https://esm.sh/react-dom@18.3.1/client"
  }
}
</script>
<style>
  html,body,#root{margin:0;height:100%;width:100%;}
  #bar{position:fixed;z-index:10;top:0;left:0;right:0;height:48px;display:flex;align-items:center;gap:10px;
    padding:0 12px;background:#0a0e17;color:#e8edf6;font-family:-apple-system,Segoe UI,Roboto,sans-serif;}
  #bar b{font-size:14px;} #bar .sp{flex:1;}
  #save{background:#34d399;color:#04231a;border:0;border-radius:8px;padding:8px 16px;font-weight:700;font-size:14px;}
  #save:disabled{opacity:.5;}
  #status{font-size:12px;color:#8b97ad;}
  #stage{position:absolute;top:48px;bottom:0;left:0;right:0;}
</style>
</head><body>
<div id="bar"><b>✏️ Diagram editor</b><span id="status">loading…</span><span class="sp"></span>
  <button id="save" disabled>Save</button></div>
<div id="stage"><div id="root"></div></div>
<script type="module">
  var params = new URLSearchParams(location.search);
  var slug = params.get('slug') || '';
  var branch = params.get('branch') || 'main';
  var RAW = 'https://raw.githubusercontent.com/pmcp/nuxt-crouton/' + branch + '/writeups/diagrams/' + slug + '.excalidraw';
  window.EXCALIDRAW_ASSET_PATH = 'https://esm.sh/@excalidraw/excalidraw@0.17.6/dist/';
  var statusEl = document.getElementById('status');
  var saveEl = document.getElementById('save');
  function setStatus(t){ statusEl.textContent = t; }

  Promise.all([
    import('react'),
    import('react-dom/client'),
    import('https://esm.sh/@excalidraw/excalidraw@0.17.6?external=react,react-dom')
  ]).then(function(mods){
    var React = mods[0].default || mods[0];
    var createRoot = mods[1].createRoot;
    var Exc = mods[2];
    var api = null;

    function loadScene(){
      return fetch(RAW).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; });
    }

    loadScene().then(function(scene){
      var initialData = scene ? { elements: scene.elements || [], appState: { viewBackgroundColor: '#ffffff' }, files: scene.files || {} } : null;
      function App(){
        return React.createElement(Exc.Excalidraw, {
          initialData: initialData,
          excalidrawAPI: function(a){ api = a; }
        });
      }
      createRoot(document.getElementById('root')).render(React.createElement(App));
      setStatus(slug ? (scene ? 'editing ' + slug : slug + ' (new)') : 'no slug');
      saveEl.disabled = false;

      saveEl.onclick = function(){
        if (!api) return;
        saveEl.disabled = true; setStatus('saving…');
        var elements = api.getSceneElements();
        var appState = api.getAppState();
        var files = api.getFiles();
        Exc.exportToBlob({ elements: elements, appState: appState, files: files, mimeType: 'image/png', exportEmbedScene: true, exportPadding: 16 })
          .then(function(blob){ return blob.arrayBuffer(); })
          .then(function(buf){
            var bytes = new Uint8Array(buf); var bin = '';
            for (var i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
            var pngB64 = btoa(bin);
            var scene = { type:'excalidraw', version:2, source:location.origin, elements: elements, appState:{ viewBackgroundColor:'#ffffff' }, files: files };
            return fetch('/api/save', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ slug: slug, branch: branch, scene: scene, png: pngB64 }) });
          })
          .then(function(r){ return r.json(); })
          .then(function(res){ setStatus(res.ok ? 'saved ✓ committed to ' + branch : 'error: ' + (res.error||'?')); saveEl.disabled = false; })
          .catch(function(e){ setStatus('error: ' + e); saveEl.disabled = false; });
      };
    });
  }).catch(function(e){ setStatus('failed to load editor: ' + e); });
</script>
</body></html>`
