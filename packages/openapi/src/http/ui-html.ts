export interface ViewerHtmlOptions {
  /** URL the viewer fetches the document from. */
  documentUrl: string;
  title: string;
}

/**
 * A single self-contained HTML viewer — no CDN, no external assets, no network
 * beyond fetching our own OpenAPI JSON. Renders operations grouped by tag with
 * expandable parameter/body/response detail. Mirrors the devtools dashboard
 * pattern (one inline-HTML string).
 */
export const renderViewerHtml = (options: ViewerHtmlOptions): string => {
  const documentUrl = JSON.stringify(options.documentUrl);
  const title = escapeHtml(options.title);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #0b0f14; --panel: #131a22; --border: #24303c; --text: #e6edf3;
    --muted: #8b98a5; --accent: #4c9ffe;
    --get: #16a34a; --post: #2563eb; --put: #d97706; --patch: #7c3aed;
    --delete: #dc2626; --other: #64748b;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg); color: var(--text); }
  header { padding: 24px 32px; border-bottom: 1px solid var(--border); }
  header h1 { margin: 0; font-size: 20px; }
  header p { margin: 4px 0 0; color: var(--muted); }
  main { max-width: 980px; margin: 0 auto; padding: 24px 32px 80px; }
  .tag-group { margin-bottom: 28px; }
  .tag-group > h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .05em;
    color: var(--muted); border-bottom: 1px solid var(--border); padding-bottom: 6px; }
  .op { border: 1px solid var(--border); border-radius: 8px; margin: 10px 0; overflow: hidden;
    background: var(--panel); }
  .op summary { display: flex; align-items: center; gap: 12px; padding: 10px 14px; cursor: pointer;
    list-style: none; }
  .op summary::-webkit-details-marker { display: none; }
  .method { font-weight: 700; font-size: 12px; text-transform: uppercase; padding: 3px 8px;
    border-radius: 4px; color: #fff; min-width: 58px; text-align: center; }
  .m-get { background: var(--get); } .m-post { background: var(--post); }
  .m-put { background: var(--put); } .m-patch { background: var(--patch); }
  .m-delete { background: var(--delete); } .m-other { background: var(--other); }
  .path { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 600; }
  .op .summary-text { color: var(--muted); margin-left: auto; font-size: 13px; }
  .op .body { padding: 4px 16px 16px; border-top: 1px solid var(--border); }
  .op .body h4 { margin: 14px 0 6px; font-size: 12px; text-transform: uppercase; color: var(--muted); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border); vertical-align: top; }
  th { color: var(--muted); font-weight: 600; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: rgba(127,127,127,.15);
    padding: 1px 5px; border-radius: 4px; }
  pre { background: #0b1119; border: 1px solid var(--border); border-radius: 6px; padding: 12px;
    overflow: auto; font-size: 12px; }
  .badge { font-size: 11px; color: var(--muted); border: 1px solid var(--border); border-radius: 10px;
    padding: 0 7px; }
  .deprecated .path { text-decoration: line-through; opacity: .7; }
  .error { color: var(--delete); }
  @media (prefers-color-scheme: light) {
    :root { --bg: #f6f8fa; --panel: #fff; --border: #d0d7de; --text: #1f2328; --muted: #656d76; }
    pre { background: #f6f8fa; }
  }
</style>
</head>
<body>
<header>
  <h1 id="doc-title">${title}</h1>
  <p id="doc-sub">Loading…</p>
</header>
<main id="root"></main>
<script>
const DOCUMENT_URL = ${documentUrl};

function methodClass(m) {
  return ['get','post','put','patch','delete'].includes(m) ? 'm-' + m : 'm-other';
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
function schemaLabel(schema) {
  if (!schema) return '';
  if (schema.$ref) return schema.$ref.split('/').pop();
  if (schema.type === 'array') return (schemaLabel(schema.items) || 'any') + '[]';
  if (schema.enum) return 'enum(' + schema.enum.map(v => JSON.stringify(v)).join(', ') + ')';
  return [schema.type, schema.format ? '(' + schema.format + ')' : ''].filter(Boolean).join(' ') || 'object';
}
function renderParams(params) {
  if (!params || !params.length) return '';
  const rows = params.map(p =>
    '<tr><td><code>' + esc(p.name) + '</code></td><td>' + esc(p.in) + '</td>' +
    '<td>' + (p.required ? 'yes' : 'no') + '</td>' +
    '<td>' + esc(schemaLabel(p.schema)) + '</td></tr>').join('');
  return '<h4>Parameters</h4><table><tr><th>Name</th><th>In</th><th>Required</th><th>Type</th></tr>' + rows + '</table>';
}
function renderBody(body, doc) {
  if (!body) return '';
  const schema = body.content && body.content['application/json'] && body.content['application/json'].schema;
  return '<h4>Request body' + (body.required ? ' <span class="badge">required</span>' : '') + '</h4>' +
    '<pre>' + esc(resolveExample(schema, doc)) + '</pre>';
}
function renderResponses(responses, doc) {
  if (!responses) return '';
  const rows = Object.keys(responses).sort().map(code => {
    const r = responses[code];
    const schema = r.content && r.content['application/json'] && r.content['application/json'].schema;
    return '<tr><td><code>' + esc(code) + '</code></td><td>' + esc(r.description || '') + '</td>' +
      '<td>' + esc(schema ? schemaLabel(schema) : '') + '</td></tr>';
  }).join('');
  return '<h4>Responses</h4><table><tr><th>Code</th><th>Description</th><th>Type</th></tr>' + rows + '</table>';
}
function resolveExample(schema, doc) {
  return JSON.stringify(sample(schema, doc, new Set()), null, 2);
}
function sample(schema, doc, seen) {
  if (!schema) return {};
  if (schema.$ref) {
    const name = schema.$ref.split('/').pop();
    if (seen.has(name)) return {};
    seen.add(name);
    const target = doc.components && doc.components.schemas && doc.components.schemas[name];
    return sample(target, doc, seen);
  }
  if (schema.enum) return schema.enum[0];
  if (schema.type === 'array') return [sample(schema.items, doc, seen)];
  if (schema.type === 'object' || schema.properties) {
    const out = {};
    for (const key of Object.keys(schema.properties || {})) out[key] = sample(schema.properties[key], doc, seen);
    return out;
  }
  if (schema.type === 'string') return schema.format || 'string';
  if (schema.type === 'integer' || schema.type === 'number') return 0;
  if (schema.type === 'boolean') return false;
  return null;
}

fetch(DOCUMENT_URL).then(r => r.json()).then(doc => {
  document.getElementById('doc-title').textContent = doc.info.title + ' ' + doc.info.version;
  document.getElementById('doc-sub').textContent = doc.info.description || (Object.keys(doc.paths).length + ' paths');
  const groups = {};
  for (const path of Object.keys(doc.paths)) {
    const item = doc.paths[path];
    for (const method of Object.keys(item)) {
      const op = item[method];
      const tag = (op.tags && op.tags[0]) || 'default';
      (groups[tag] = groups[tag] || []).push({ path, method, op });
    }
  }
  const root = document.getElementById('root');
  for (const tag of Object.keys(groups).sort()) {
    const group = document.createElement('section');
    group.className = 'tag-group';
    group.innerHTML = '<h2>' + esc(tag) + '</h2>';
    for (const { path, method, op } of groups[tag].sort((a,b) => a.path.localeCompare(b.path))) {
      const det = document.createElement('details');
      det.className = 'op' + (op.deprecated ? ' deprecated' : '');
      det.innerHTML =
        '<summary><span class="method ' + methodClass(method) + '">' + esc(method) + '</span>' +
        '<span class="path">' + esc(path) + '</span>' +
        '<span class="summary-text">' + esc(op.summary || op.operationId || '') + '</span></summary>' +
        '<div class="body">' +
        (op.description ? '<p>' + esc(op.description) + '</p>' : '') +
        renderParams(op.parameters) + renderBody(op.requestBody, doc) + renderResponses(op.responses, doc) +
        '</div>';
      group.appendChild(det);
    }
    root.appendChild(group);
  }
}).catch(err => {
  document.getElementById('doc-sub').innerHTML = '<span class="error">Failed to load document: ' + esc(err.message) + '</span>';
});
</script>
</body>
</html>`;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}
