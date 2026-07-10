export interface DashboardHtmlOptions {
  basePath: string;
  title: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Self-contained dashboard (no external assets). Three tabs: live Performance
 * (SSE), a force-directed dependency Graph, and Models with inferred relations.
 * The embedded script deliberately uses string concatenation (no template
 * literals) so it survives being nested in this TS template literal.
 */
export const renderDashboardHtml = (options: DashboardHtmlOptions): string => {
  const title = escapeHtml(options.title);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  :root { color-scheme: dark; --bg:#0f1117; --panel:#171a23; --panel2:#0b0d13; --border:#262b38; --text:#e6e9f0; --muted:#8b93a7; --accent:#6ea8fe; --mod:#f0a35e; --prov:#6ea8fe; --ctrl:#7ee0a8; --res:#c99bf5; --ok:#7ee0a8; --warn:#f0c35e; --bad:#f07a7a; }
  * { box-sizing: border-box; }
  body { margin:0; font:14px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background:var(--bg); color:var(--text); }
  header { padding:14px 22px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:12px; }
  header h1 { font-size:16px; margin:0; font-weight:600; }
  header .badge { font-size:11px; color:var(--muted); border:1px solid var(--border); border-radius:999px; padding:2px 10px; }
  header .live { color:var(--ok); }
  nav { display:flex; gap:4px; padding:12px 22px 0; border-bottom:1px solid var(--border); }
  nav button { background:transparent; color:var(--muted); border:0; border-bottom:2px solid transparent; padding:8px 14px; cursor:pointer; font-size:13px; }
  nav button.active { color:var(--text); border-bottom-color:var(--accent); }
  main { padding:18px 22px 40px; }
  .stats { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:18px; }
  .stat { background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:10px 14px; min-width:104px; }
  .stat b { display:block; font-size:20px; }
  .stat span { color:var(--muted); font-size:12px; }
  .panel { background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:14px 16px; margin-bottom:14px; }
  .panel h2 { font-size:13px; margin:0 0 10px; font-weight:600; display:flex; justify-content:space-between; align-items:center; }
  .panel h2 button { font-size:12px; color:var(--muted); background:transparent; border:1px solid var(--border); border-radius:7px; padding:3px 9px; cursor:pointer; }
  .row { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
  .chip { border:1px solid var(--border); border-radius:999px; padding:2px 10px; font-size:12px; white-space:nowrap; }
  .chip.module { color:var(--mod); } .chip.provider { color:var(--prov); } .chip.controller { color:var(--ctrl); } .chip.resolver { color:var(--res); } .chip.http { color:var(--prov);} .chip.graphql { color:var(--res);}
  .muted { color:var(--muted); }
  .arrow { color:var(--muted); margin:0 2px; }
  table { width:100%; border-collapse:collapse; }
  th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:top; font-variant-numeric:tabular-nums; }
  th { color:var(--muted); font-weight:500; font-size:12px; cursor:default; }
  td.num, th.num { text-align:right; }
  code { background:var(--panel2); border:1px solid var(--border); border-radius:5px; padding:1px 6px; font-size:12px; }
  .empty { color:var(--muted); padding:20px 0; }
  .deplist > div { padding:6px 0; border-bottom:1px solid var(--border); }
  .deplist > div:last-child { border-bottom:0; }
  .yes { color:var(--ok); } .no { color:var(--muted); }
  .sev-ok { color:var(--ok); } .sev-warn { color:var(--warn); } .sev-bad { color:var(--bad); }
  .graphwrap { position:relative; width:100%; height:540px; background:var(--panel2); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
  .graphwrap svg { width:100%; height:100%; display:block; }
  .legend { position:absolute; top:10px; right:12px; display:flex; gap:12px; font-size:12px; color:var(--muted); background:rgba(15,17,23,.7); padding:6px 10px; border-radius:8px; }
  .legend i { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:5px; vertical-align:middle; }
  .node text { font-size:11px; fill:var(--muted); pointer-events:none; }
  .node circle { cursor:pointer; stroke:#0b0d13; stroke-width:1.5; }
  .edge { stroke:var(--border); stroke-width:1; }
  .edge.imports { stroke:#5a4632; } .edge.injects { stroke:#33465f; }
  .dim { opacity:.12; }
  .relbadge { font-size:11px; }
</style>
</head>
<body>
<header>
  <h1>${title}</h1>
  <span class="badge">non-production</span>
  <span class="badge live" id="live">connecting…</span>
  <span class="badge" id="conn"></span>
</header>
<nav>
  <button data-tab="perf" class="active">Performance</button>
  <button data-tab="graph">Dependency graph</button>
  <button data-tab="models">Data models</button>
</nav>
<main>
  <section id="tab-perf"></section>
  <section id="tab-graph" hidden></section>
  <section id="tab-models" hidden></section>
</main>
<script>
var BASE = ${JSON.stringify(options.basePath)};
var SVGNS = 'http://www.w3.org/2000/svg';
function el(t,c,txt){ var n=document.createElement(t); if(c) n.className=c; if(txt!=null) n.textContent=txt; return n; }
function sel(t){ return document.createElementNS(SVGNS,t); }
function chip(label,kind){ return el('span','chip '+kind,label); }
function fmtMs(v){ return (v==null?'-':(Math.round(v*100)/100)+' ms'); }
function sev(p95){ return p95>=500?'sev-bad':(p95>=200?'sev-warn':'sev-ok'); }
function ago(ts){ var s=Math.max(0,Math.round((Date.now()-ts)/1000)); if(s<60) return s+'s ago'; var m=Math.round(s/60); return m+'m ago'; }
function load(path){ return fetch(BASE+path,{headers:{accept:'application/json'}}).then(function(r){ if(!r.ok) throw new Error(path+' -> '+r.status); return r.json(); }); }

/* ---------------- Performance ---------------- */
function renderMetrics(m){
  var root=document.getElementById('tab-perf'); root.replaceChildren();
  var stats=el('div','stats');
  function stat(v,label){ var s=el('div','stat'); s.append(el('b',null,String(v)), el('span',null,label)); return s; }
  stats.append(
    stat(m.total,'total ops'),
    stat(m.throughputPerMin,'ops / min'),
    stat((Math.round(m.errorRate*1000)/10)+'%','error rate'),
    stat(fmtMs(m.http.p95),'HTTP p95'),
    stat(fmtMs(m.graphql.p95),'GraphQL p95'),
    stat(m.sampleCount+' / '+m.capacity,'samples')
  );
  root.append(stats);

  var opPanel=el('div','panel'); var h=el('h2',null,'Operations (slowest first)'); opPanel.append(h);
  if(!m.operations.length){ opPanel.append(el('div','empty','No traffic recorded yet. Hit some routes or run a GraphQL query.')); }
  else {
    var table=el('table');
    var thr=el('tr'); ['Operation','Kind','Count','p50','p95','p99','Avg','Max','Err'].forEach(function(hd,i){ var th=el('th',i>=2?'num':null,hd); thr.append(th); }); table.append(thr);
    m.operations.forEach(function(o){
      var tr=el('tr');
      tr.append(el('td',null,o.name));
      var kc=el('td'); kc.append(chip(o.kind,o.kind)); tr.append(kc);
      tr.append(el('td','num',String(o.count)));
      tr.append(el('td','num',fmtMs(o.p50)));
      var p95=el('td','num '+sev(o.p95),fmtMs(o.p95)); tr.append(p95);
      tr.append(el('td','num',fmtMs(o.p99)));
      tr.append(el('td','num',fmtMs(o.avg)));
      tr.append(el('td','num',fmtMs(o.max)));
      tr.append(el('td','num'+(o.errorCount?' sev-bad':' muted'),(Math.round(o.errorRate*1000)/10)+'%'));
      table.append(tr);
    });
    opPanel.append(table);
  }
  root.append(opPanel);

  var recPanel=el('div','panel'); recPanel.append(el('h2',null,'Recent operations')); var dl=el('div','deplist');
  if(!m.recent.length){ recPanel.append(el('div','empty','—')); }
  else { m.recent.slice(0,40).forEach(function(r){
    var line=el('div','row');
    line.append(chip(r.kind,r.kind));
    line.append(el('span',null,r.name));
    var d=el('span',sev(r.durationMs),fmtMs(r.durationMs)); line.append(d);
    if(!r.ok) line.append(el('span','sev-bad','error'));
    line.append(el('span','muted',ago(r.at)));
    dl.append(line);
  }); recPanel.append(dl); }
  root.append(recPanel);
}

var es;
function startStream(){
  if(!window.EventSource){ document.getElementById('live').textContent='no SSE'; return; }
  es=new EventSource(BASE+'/api/metrics/stream');
  es.addEventListener('metrics',function(e){ try{ var m=JSON.parse(e.data); renderMetrics(m); document.getElementById('live').textContent='live'; document.getElementById('conn').textContent=m.throughputPerMin+' ops/min'; }catch(_){}} );
  es.onerror=function(){ document.getElementById('live').textContent='reconnecting…'; };
}

/* ---------------- Dependency graph (force-directed) ---------------- */
var graphRaf;
function kindColor(kind){ return kind==='module'?'#f0a35e':kind==='controller'?'#7ee0a8':kind==='resolver'?'#c99bf5':'#6ea8fe'; }
function renderGraph(g){
  var root=document.getElementById('tab-graph'); root.replaceChildren();
  if(graphRaf){ cancelAnimationFrame(graphRaf); graphRaf=null; }
  var stats=el('div','stats');
  Object.keys(g.stats).forEach(function(k){ var s=el('div','stat'); s.append(el('b',null,String(g.stats[k])), el('span',null,k)); stats.append(s); });
  root.append(stats);

  var wrap=el('div','graphwrap');
  var legend=el('div','legend');
  [['module','modules'],['provider','providers'],['controller','controllers'],['resolver','resolvers']].forEach(function(p){ var span=el('span',null,''); var i=document.createElement('i'); i.style.background=kindColor(p[0]); span.append(i, document.createTextNode(p[1])); legend.append(span); });
  wrap.append(legend);
  var svg=sel('svg'); wrap.append(svg); root.append(wrap);

  var W=wrap.clientWidth||900, H=540;
  svg.setAttribute('viewBox','0 0 '+W+' '+H);
  var nodes=g.nodes.map(function(n,i){ var a=2*Math.PI*i/Math.max(1,g.nodes.length); var R=Math.min(W,H)/2-60; return {id:n.id,label:n.label,kind:n.kind,x:W/2+R*Math.cos(a),y:H/2+R*Math.sin(a),vx:0,vy:0,pin:false}; });
  var byId={}; nodes.forEach(function(n){ byId[n.id]=n; });
  var links=g.edges.filter(function(e){ return byId[e.from]&&byId[e.to]; });

  var edgeEls=links.map(function(e){ var ln=sel('line'); ln.setAttribute('class','edge '+e.kind); svg.append(ln); return {e:e,ln:ln}; });
  var nodeEls=nodes.map(function(n){
    var gEl=sel('g'); gEl.setAttribute('class','node');
    var c=sel('circle'); c.setAttribute('r', n.kind==='module'?9:6); c.setAttribute('fill',kindColor(n.kind));
    var tx=sel('text'); tx.setAttribute('x',10); tx.setAttribute('y',4); tx.textContent=n.label;
    gEl.append(c,tx); svg.append(gEl);
    var neighbors={}; neighbors[n.id]=1; links.forEach(function(e){ if(e.from===n.id) neighbors[e.to]=1; if(e.to===n.id) neighbors[e.from]=1; });
    gEl.addEventListener('mouseenter',function(){ highlight(neighbors); });
    gEl.addEventListener('mouseleave',function(){ highlight(null); });
    return {n:n,g:gEl,c:c};
  });
  function highlight(set){
    nodeEls.forEach(function(ne){ ne.g.classList.toggle('dim', set&&!set[ne.n.id]); });
    edgeEls.forEach(function(ee){ ee.ln.classList.toggle('dim', set&&!(set[ee.e.from]&&set[ee.e.to])); });
  }

  var alpha=1, REST=78, kSpring=0.02, kRepel=2600, kGrav=0.015, damp=0.86;
  function tick(){
    for(var i=0;i<nodes.length;i++){ for(var j=i+1;j<nodes.length;j++){
      var a=nodes[i],b=nodes[j]; var dx=a.x-b.x, dy=a.y-b.y; var d2=dx*dx+dy*dy+0.01; var d=Math.sqrt(d2);
      var f=kRepel/d2; var fx=f*dx/d, fy=f*dy/d; a.vx+=fx; a.vy+=fy; b.vx-=fx; b.vy-=fy;
    }}
    links.forEach(function(e){ var a=byId[e.from],b=byId[e.to]; var dx=b.x-a.x,dy=b.y-a.y; var d=Math.sqrt(dx*dx+dy*dy)+0.01; var f=(d-REST)*kSpring; var fx=f*dx/d, fy=f*dy/d; a.vx+=fx; a.vy+=fy; b.vx-=fx; b.vy-=fy; });
    nodes.forEach(function(n){ n.vx+=(W/2-n.x)*kGrav; n.vy+=(H/2-n.y)*kGrav; if(n.pin) return; n.vx*=damp; n.vy*=damp; n.x+=n.vx*alpha; n.y+=n.vy*alpha; n.x=Math.max(16,Math.min(W-16,n.x)); n.y=Math.max(16,Math.min(H-16,n.y)); });
    edgeEls.forEach(function(ee){ var a=byId[ee.e.from],b=byId[ee.e.to]; ee.ln.setAttribute('x1',a.x); ee.ln.setAttribute('y1',a.y); ee.ln.setAttribute('x2',b.x); ee.ln.setAttribute('y2',b.y); });
    nodeEls.forEach(function(ne){ ne.g.setAttribute('transform','translate('+ne.n.x+','+ne.n.y+')'); });
    alpha*=0.985;
    if(alpha>0.02) graphRaf=requestAnimationFrame(tick);
  }
  if(nodes.length) tick(); else wrap.append(el('div','empty','No graph data.'));
}

/* ---------------- Models ---------------- */
function renderModels(cat){
  var root=document.getElementById('tab-models'); root.replaceChildren();
  var stats=el('div','stats');
  Object.keys(cat.stats).forEach(function(k){ var s=el('div','stat'); s.append(el('b',null,String(cat.stats[k])), el('span',null,k)); stats.append(s); });
  root.append(stats);
  var panel=el('div','panel');
  if(!cat.models.length){ panel.append(el('div','empty','No @Document models registered.')); root.append(panel); return; }
  var table=el('table');
  var thr=el('tr'); ['Model','Collection','Timestamps','Soft delete','Indexes','Relations (inferred)'].forEach(function(hd){ thr.append(el('th',null,hd)); }); table.append(thr);
  cat.models.forEach(function(m){
    var tr=el('tr');
    tr.append(el('td',null,m.name));
    var c=el('td'); c.append(el('code',null,m.collection)); tr.append(c);
    tr.append(el('td',m.timestamps?'yes':'no',m.timestamps?'yes':'no'));
    tr.append(el('td',m.softDelete?'yes':'no',m.softDelete?'yes':'no'));
    var idx=el('td');
    if(!m.indexes.length){ idx.append(el('span','muted','—')); }
    else m.indexes.forEach(function(i){ var code=el('code',null,JSON.stringify(i.keys)+((i.options&&Object.keys(i.options).length)?' '+JSON.stringify(i.options):'')); code.style.display='block'; code.style.marginBottom='3px'; idx.append(code); });
    tr.append(idx);
    var rel=el('td');
    if(!m.relations.length){ rel.append(el('span','muted','—')); }
    else m.relations.forEach(function(r){ var line=el('div','row relbadge'); line.append(el('code',null,r.field), el('span','arrow',r.cardinality==='many'?'→ many':'→'), chip(r.target,'provider')); rel.append(line); });
    tr.append(rel);
    table.append(tr);
  });
  panel.append(table); root.append(panel);
}

/* ---------------- tabs + boot ---------------- */
var loaded={graph:false,models:false};
function ensureGraph(){ if(loaded.graph) return; loaded.graph=true; load('/api/graph').then(renderGraph).catch(function(e){ document.getElementById('tab-graph').append(el('div','empty',String(e))); }); }
function ensureModels(){ if(loaded.models) return; loaded.models=true; load('/api/models').then(renderModels).catch(function(e){ document.getElementById('tab-models').append(el('div','empty',String(e))); }); }

document.querySelectorAll('nav button').forEach(function(btn){ btn.addEventListener('click',function(){
  document.querySelectorAll('nav button').forEach(function(b){ b.classList.toggle('active', b===btn); });
  var tab=btn.dataset.tab;
  document.getElementById('tab-perf').hidden=tab!=='perf';
  document.getElementById('tab-graph').hidden=tab!=='graph';
  document.getElementById('tab-models').hidden=tab!=='models';
  if(tab==='graph') ensureGraph();
  if(tab==='models') ensureModels();
}); });

load('/api/metrics').then(renderMetrics).catch(function(){});
startStream();
</script>
</body>
</html>`;
};
