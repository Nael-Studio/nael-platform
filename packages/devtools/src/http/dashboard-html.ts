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
  .dim { opacity:.08; }
  .edge.focusedge { stroke-width:1.6; }
  .node.match circle { stroke:var(--warn); stroke-width:2.5; }
  .gtoolbar { display:flex; flex-wrap:wrap; gap:10px 14px; align-items:center; margin-bottom:10px; font-size:12px; }
  .gtoolbar input[type=search] { background:var(--panel2); border:1px solid var(--border); border-radius:7px; color:var(--text); padding:5px 9px; min-width:180px; }
  .gtoolbar label { color:var(--muted); display:inline-flex; align-items:center; gap:5px; cursor:pointer; }
  .gtoolbar .hint { color:var(--muted); margin-left:auto; }
  .ghull { opacity:.09; stroke-width:1; }
  .gbadge { fill:var(--warn); font-size:9px; }
  .gtip { position:absolute; pointer-events:none; background:rgba(15,17,23,.95); border:1px solid var(--border); border-radius:6px; padding:3px 8px; font-size:11px; color:var(--text); z-index:5; display:none; white-space:nowrap; }
  .relbadge { font-size:11px; }
  .tree { font-variant-numeric:tabular-nums; }
  .tree .node { padding:2px 0; }
  .tree .children { margin-left:16px; border-left:1px solid var(--border); padding-left:10px; }
  .tree .k { color:var(--muted); }
  .tree .t { color:var(--muted); font-size:11px; margin-left:6px; }
  .redacted { color:var(--warn); }
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
  <button data-tab="requests">Requests</button>
  <button data-tab="orm">ORM queries</button>
  <button data-tab="errors">Errors</button>
  <button data-tab="logs">Logs</button>
  <button data-tab="graph">Dependency graph</button>
  <button data-tab="models">Data models</button>
  <button data-tab="routes">Routes</button>
  <button data-tab="cache">Cache</button>
  <button data-tab="scheduler">Scheduler</button>
  <button data-tab="boot">Boot</button>
  <button data-tab="config">Config</button>
</nav>
<main>
  <section id="tab-perf"></section>
  <section id="tab-requests" hidden></section>
  <section id="tab-orm" hidden></section>
  <section id="tab-errors" hidden></section>
  <section id="tab-logs" hidden></section>
  <section id="tab-graph" hidden></section>
  <section id="tab-models" hidden></section>
  <section id="tab-routes" hidden></section>
  <section id="tab-cache" hidden></section>
  <section id="tab-scheduler" hidden></section>
  <section id="tab-boot" hidden></section>
  <section id="tab-config" hidden></section>
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

/* ---------------- Dependency graph (force-directed, zoom/pan/focus) ---------------- */
var graphRaf;
function kindColor(kind){ return kind==='module'?'#f0a35e':kind==='controller'?'#7ee0a8':kind==='resolver'?'#c99bf5':'#6ea8fe'; }
function isInternal(label){ return /^Symbol\\(@nl-framework\\//.test(label)||/^Symbol\\(nl[:-]/.test(label); }
function moduleHash(name){ var h=0; for(var i=0;i<(name||'').length;i++){ h=(h*31+name.charCodeAt(i))>>>0; } return 'hsl('+(h%360)+',55%,60%)'; }
function renderGraph(g){
  var root=document.getElementById('tab-graph'); root.replaceChildren();
  if(graphRaf){ cancelAnimationFrame(graphRaf); graphRaf=null; }
  var stats=el('div','stats');
  Object.keys(g.stats).forEach(function(k){ var s=el('div','stat'); s.append(el('b',null,String(g.stats[k])), el('span',null,k)); stats.append(s); });
  root.append(stats);

  /* toolbar */
  var bar=el('div','gtoolbar');
  var search=document.createElement('input'); search.type='search'; search.placeholder='Search nodes… (Enter to focus)';
  bar.append(search);
  var kinds={module:true,provider:true,controller:true,resolver:true};
  ['module','provider','controller','resolver'].forEach(function(k){ var lb=el('label'); var cb=document.createElement('input'); cb.type='checkbox'; cb.checked=true; cb.addEventListener('change',function(){ kinds[k]=cb.checked; applyVisibility(); }); lb.append(cb, document.createTextNode(k+'s')); bar.append(lb); });
  var hideInt=document.createElement('input'); hideInt.type='checkbox'; hideInt.checked=true; var hl=el('label'); hl.append(hideInt, document.createTextNode('hide framework internals')); hideInt.addEventListener('change',applyVisibility); bar.append(hl);
  var grp=document.createElement('input'); grp.type='checkbox'; var gl=el('label'); gl.append(grp, document.createTextNode('group by module')); grp.addEventListener('change',function(){ layoutAnchors(); kick(); }); bar.append(gl);
  bar.append(el('span','hint','wheel = zoom · drag = pan · drag node = pin · click = focus · Esc = reset'));
  root.append(bar);

  var wrap=el('div','graphwrap');
  var legend=el('div','legend');
  [['module','modules'],['provider','providers'],['controller','controllers'],['resolver','resolvers']].forEach(function(p){ var span=el('span',null,''); var i=document.createElement('i'); i.style.background=kindColor(p[0]); span.append(i, document.createTextNode(p[1])); legend.append(span); });
  var li=el('span',null,''); var lii=document.createElement('i'); lii.style.background='#5a4632'; li.append(lii, document.createTextNode('imports')); legend.append(li);
  var lj=el('span',null,''); var lji=document.createElement('i'); lji.style.background='#33465f'; lj.append(lji, document.createTextNode('injects')); legend.append(lj);
  wrap.append(legend);
  var tip=el('div','gtip'); wrap.append(tip);
  var svg=sel('svg'); wrap.append(svg); root.append(wrap);
  var defs=sel('defs'); ['imports','injects','provides'].forEach(function(k){ var m=sel('marker'); m.setAttribute('id','arw-'+k); m.setAttribute('viewBox','0 0 10 10'); m.setAttribute('refX','18'); m.setAttribute('refY','5'); m.setAttribute('markerWidth','6'); m.setAttribute('markerHeight','6'); m.setAttribute('orient','auto-start-reverse'); var pth=sel('path'); pth.setAttribute('d','M0,0 L10,5 L0,10 z'); pth.setAttribute('fill', k==='imports'?'#5a4632':k==='injects'?'#33465f':'#262b38'); m.append(pth); defs.append(m); }); svg.append(defs);
  var hullLayer=sel('g'); svg.append(hullLayer);

  var W=wrap.clientWidth||900, H=540;
  var vb={x:0,y:0,w:W,h:H};
  function applyVB(){ svg.setAttribute('viewBox',vb.x+' '+vb.y+' '+vb.w+' '+vb.h); updateLabelScale(); }
  applyVB();

  var nodes=g.nodes.map(function(n,i){ var a=2*Math.PI*i/Math.max(1,g.nodes.length); var R=Math.min(W,H)/2-60; return {id:n.id,label:n.label,kind:n.kind,module:n.module,internal:isInternal(n.label),x:W/2+R*Math.cos(a),y:H/2+R*Math.sin(a),vx:0,vy:0,pin:false,hidden:false}; });
  var byId={}; nodes.forEach(function(n){ byId[n.id]=n; });
  var links=g.edges.filter(function(e){ return byId[e.from]&&byId[e.to]; });
  var adj={}; nodes.forEach(function(n){ adj[n.id]=[]; }); links.forEach(function(e){ adj[e.from].push(e.to); adj[e.to].push(e.from); });

  /* hidden-internal badge counts per consumer node */
  function computeHiddenBadges(){ nodeEls.forEach(function(ne){ ne.badgeN=0; }); if(!hideInt.checked) return; links.forEach(function(e){ var to=byId[e.to]; if(to&&to.internal){ var from=byId[e.from]; if(from&&!from.internal){ var ne=elById[from.id]; if(ne) ne.badgeN++; } } }); }

  var edgeEls=links.map(function(e){ var ln=sel('line'); ln.setAttribute('class','edge '+e.kind); ln.setAttribute('marker-end','url(#arw-'+e.kind+')'); svg.append(ln); return {e:e,ln:ln}; });
  var elById={};
  var nodeEls=nodes.map(function(n){
    var gEl=sel('g'); gEl.setAttribute('class','node');
    var c=sel('circle'); c.setAttribute('r', n.kind==='module'?9:6); c.setAttribute('fill',kindColor(n.kind));
    var tx=sel('text'); tx.setAttribute('x',11); tx.setAttribute('y',4); tx.textContent=n.label;
    var badge=sel('text'); badge.setAttribute('class','gbadge'); badge.setAttribute('x',9); badge.setAttribute('y',-8);
    gEl.append(c,tx,badge); svg.append(gEl);
    var rec={n:n,g:gEl,c:c,tx:tx,badge:badge,badgeN:0};
    gEl.addEventListener('mouseenter',function(){ if(!focusId) highlight(neighborsOf(n.id,1)); showTip(n); });
    gEl.addEventListener('mouseleave',function(){ if(!focusId) highlight(null); tip.style.display='none'; });
    gEl.addEventListener('pointerdown',function(ev){ startNodeDrag(ev,rec); });
    gEl.addEventListener('click',function(ev){ ev.stopPropagation(); if(!rec.dragMoved) toggleFocus(n.id); });
    elById[n.id]=rec;
    return rec;
  });

  function neighborsOf(id,hops){ var set={}; set[id]=1; var frontier=[id]; for(var h=0;h<hops;h++){ var nxt=[]; frontier.forEach(function(f){ (adj[f]||[]).forEach(function(o){ if(!set[o]){ set[o]=1; nxt.push(o); } }); }); frontier=nxt; } return set; }
  function highlight(set){ nodeEls.forEach(function(ne){ ne.g.classList.toggle('dim', set&&!set[ne.n.id]&&!ne.n.hidden); }); edgeEls.forEach(function(ee){ ee.ln.classList.toggle('dim', set&&!(set[ee.e.from]&&set[ee.e.to])); }); }
  function showTip(n){ tip.textContent=n.label+(n.module?' · '+n.module:'')+' · '+n.kind; }

  /* ---- focus mode (≤2 hops) ---- */
  var focusId=null;
  function toggleFocus(id){ focusId=(focusId===id?null:id); applyFocus(); }
  function applyFocus(){ if(!focusId){ highlight(null); nodeEls.forEach(function(ne){ ne.g.classList.remove('match'); }); return; } var set=neighborsOf(focusId,2); highlight(set); nodeEls.forEach(function(ne){ ne.g.classList.toggle('match', ne.n.id===focusId); }); var f=byId[focusId]; if(f) centerOn(f); }
  document.addEventListener('keydown',function(ev){ if(ev.key==='Escape'&&active()==='graph'){ focusId=null; search.value=''; applyFocus(); applyVisibility(); } });

  /* ---- search ---- */
  search.addEventListener('input',function(){ var q=search.value.trim().toLowerCase(); nodeEls.forEach(function(ne){ ne.g.classList.toggle('match', q&&ne.n.label.toLowerCase().indexOf(q)>=0); }); });
  search.addEventListener('keydown',function(ev){ if(ev.key!=='Enter') return; var q=search.value.trim().toLowerCase(); if(!q) return; var hit=nodes.find(function(n){ return !n.hidden&&n.label.toLowerCase().indexOf(q)>=0; }); if(hit){ focusId=hit.id; applyFocus(); } });

  /* ---- visibility (kind filters + hide internals) ---- */
  function applyVisibility(){ nodes.forEach(function(n){ n.hidden=(!kinds[n.kind])||(hideInt.checked&&n.internal); }); nodeEls.forEach(function(ne){ ne.g.style.display=ne.n.hidden?'none':''; }); edgeEls.forEach(function(ee){ var hid=byId[ee.e.from].hidden||byId[ee.e.to].hidden; ee.ln.style.display=hid?'none':''; }); computeHiddenBadges(); nodeEls.forEach(function(ne){ ne.badge.textContent=ne.badgeN?('+'+ne.badgeN):''; }); if(focusId&&byId[focusId].hidden) focusId=null; applyFocus(); }

  /* ---- zoom (cursor-anchored) + pan ---- */
  function svgPt(clientX,clientY){ var r=svg.getBoundingClientRect(); return {x:vb.x+(clientX-r.left)/r.width*vb.w, y:vb.y+(clientY-r.top)/r.height*vb.h}; }
  wrap.addEventListener('wheel',function(ev){ ev.preventDefault(); var p=svgPt(ev.clientX,ev.clientY); var f=ev.deltaY<0?0.86:1.16; var nw=Math.max(W*0.15,Math.min(W*6,vb.w*f)); var k=nw/vb.w; vb.x=p.x-(p.x-vb.x)*k; vb.y=p.y-(p.y-vb.y)*k; vb.w=nw; vb.h=vb.h*k; applyVB(); },{passive:false});
  var panning=null;
  svg.addEventListener('pointerdown',function(ev){ if(ev.target.closest('.node')) return; panning={x:ev.clientX,y:ev.clientY,vx:vb.x,vy:vb.y}; svg.setPointerCapture(ev.pointerId); });
  svg.addEventListener('pointermove',function(ev){ if(!panning) return; var r=svg.getBoundingClientRect(); vb.x=panning.vx-(ev.clientX-panning.x)/r.width*vb.w; vb.y=panning.vy-(ev.clientY-panning.y)/r.height*vb.h; applyVB(); });
  svg.addEventListener('pointerup',function(ev){ panning=null; });
  svg.addEventListener('click',function(){ if(focusId){ focusId=null; applyFocus(); } });
  function centerOn(n){ vb.x=n.x-vb.w/2; vb.y=n.y-vb.h/2; applyVB(); }
  function zoomLevel(){ return W/vb.w; }
  function updateLabelScale(){ var z=zoomLevel(); nodeEls.forEach(function(ne){ var show=ne.n.kind==='module'||z>1.5; ne.tx.style.display=show?'':'none'; }); }

  /* ---- node drag (pins) ---- */
  var nodeDrag=null;
  function startNodeDrag(ev,rec){ ev.stopPropagation(); rec.dragMoved=false; nodeDrag=rec; rec.n.pin=true; svg.setPointerCapture(ev.pointerId); }
  svg.addEventListener('pointermove',function(ev){ if(!nodeDrag) return; nodeDrag.dragMoved=true; var p=svgPt(ev.clientX,ev.clientY); nodeDrag.n.x=p.x; nodeDrag.n.y=p.y; kick(); });
  svg.addEventListener('pointerup',function(){ if(nodeDrag){ var r=nodeDrag; setTimeout(function(){ r.dragMoved=false; },0); } nodeDrag=null; });

  /* ---- module anchors (group-by-module grid) ---- */
  var anchors={};
  function layoutAnchors(){ anchors={}; if(!grp.checked) return; var mods=nodes.filter(function(n){ return n.kind==='module'; }); var cols=Math.ceil(Math.sqrt(mods.length))||1; mods.forEach(function(m,i){ anchors[m.module||m.label]={x:(i%cols+0.5)/cols*W, y:(Math.floor(i/cols)+0.5)/Math.ceil(mods.length/cols)*H}; }); }

  /* ---- convex hulls per module ---- */
  function hull(points){ if(points.length<3) return points; var pts=points.slice().sort(function(a,b){ return a.x-b.x||a.y-b.y; }); var cross=function(o,a,b){ return (a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x); }; var lo=[],up=[],i; for(i=0;i<pts.length;i++){ while(lo.length>=2&&cross(lo[lo.length-2],lo[lo.length-1],pts[i])<=0) lo.pop(); lo.push(pts[i]); } for(i=pts.length-1;i>=0;i--){ while(up.length>=2&&cross(up[up.length-2],up[up.length-1],pts[i])<=0) up.pop(); up.push(pts[i]); } lo.pop(); up.pop(); return lo.concat(up); }
  function drawHulls(){ hullLayer.replaceChildren(); var groups={}; nodes.forEach(function(n){ if(n.hidden||!n.module) return; (groups[n.module]=groups[n.module]||[]).push(n); }); Object.keys(groups).forEach(function(mod){ var h=hull(groups[mod].map(function(n){ return {x:n.x,y:n.y}; })); if(h.length<3) return; var poly=sel('polygon'); poly.setAttribute('class','ghull'); poly.setAttribute('points',h.map(function(p){ return p.x+','+p.y; }).join(' ')); poly.setAttribute('fill',moduleHash(mod)); poly.setAttribute('stroke',moduleHash(mod)); hullLayer.append(poly); }); }

  var alpha=1, REST=78, kSpring=0.02, kRepel=2600, kGrav=0.015, damp=0.86;
  function kick(){ alpha=Math.max(alpha,0.5); if(!graphRaf) graphRaf=requestAnimationFrame(tick); }
  function tick(){
    var active=nodes.filter(function(n){ return !n.hidden; });
    for(var i=0;i<active.length;i++){ for(var j=i+1;j<active.length;j++){
      var a=active[i],b=active[j]; var dx=a.x-b.x, dy=a.y-b.y; var d2=dx*dx+dy*dy+0.01; var d=Math.sqrt(d2);
      var f=kRepel/d2; var fx=f*dx/d, fy=f*dy/d; a.vx+=fx; a.vy+=fy; b.vx-=fx; b.vy-=fy;
    }}
    links.forEach(function(e){ var a=byId[e.from],b=byId[e.to]; if(a.hidden||b.hidden) return; var dx=b.x-a.x,dy=b.y-a.y; var d=Math.sqrt(dx*dx+dy*dy)+0.01; var f=(d-REST)*kSpring; var fx=f*dx/d, fy=f*dy/d; a.vx+=fx; a.vy+=fy; b.vx-=fx; b.vy-=fy; });
    active.forEach(function(n){ var ax=W/2, ay=H/2; if(grp.checked){ var an=anchors[n.module||n.label]; if(an){ ax=an.x; ay=an.y; } } n.vx+=(ax-n.x)*kGrav; n.vy+=(ay-n.y)*kGrav; if(n.pin||n===(nodeDrag&&nodeDrag.n)) { n.vx=0; n.vy=0; return; } n.vx*=damp; n.vy*=damp; n.x+=n.vx*alpha; n.y+=n.vy*alpha; });
    edgeEls.forEach(function(ee){ var a=byId[ee.e.from],b=byId[ee.e.to]; ee.ln.setAttribute('x1',a.x); ee.ln.setAttribute('y1',a.y); ee.ln.setAttribute('x2',b.x); ee.ln.setAttribute('y2',b.y); });
    nodeEls.forEach(function(ne){ ne.g.setAttribute('transform','translate('+ne.n.x+','+ne.n.y+')'); });
    if(grp.checked) drawHulls();
    alpha*=0.985;
    if(alpha>0.02) graphRaf=requestAnimationFrame(tick); else graphRaf=null;
  }
  applyVisibility();
  if(nodes.length) kick(); else wrap.append(el('div','empty','No graph data.'));
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
  var thr=el('tr'); ['Model','Collection','Timestamps','Soft delete','Indexes','Relations (inferred)','Inspect'].forEach(function(hd){ thr.append(el('th',null,hd)); }); table.append(thr);
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
    var act=el('td'); var btnS=modelBtn('Sample'); var btnT=modelBtn('Stats');
    var detail=el('tr'); var dc=el('td'); dc.colSpan=7; dc.style.background='var(--panel2)'; detail.append(dc); detail.hidden=true;
    btnS.addEventListener('click',function(){ inspectModel(m.name,'sample',dc,detail); });
    btnT.addEventListener('click',function(){ inspectModel(m.name,'stats',dc,detail); });
    act.append(btnS,btnT); tr.append(act);
    table.append(tr); table.append(detail);
  });
  panel.append(table); root.append(panel);
}
function modelBtn(label){ var b=el('button',null,label); b.style.cssText='font-size:12px;color:var(--muted);background:transparent;border:1px solid var(--border);border-radius:7px;padding:3px 9px;cursor:pointer;margin-right:5px;'; return b; }
function inspectModel(name,kind,dc,detailRow){
  detailRow.hidden=false; dc.replaceChildren(el('span','muted','loading '+kind+'…'));
  load('/api/models/'+encodeURIComponent(name)+'/'+kind).then(function(d){
    dc.replaceChildren();
    if(d.enabled===false){ dc.append(el('div','empty','Document sampling is off. Enable sampleDocuments in the devtools options to read a sample document / live stats.')); return; }
    if(kind==='sample'){
      var head=el('div','row'); head.append(el('b',null,'Sampled schema'), chip('sampled','resolver')); if(!d.sampled) head.append(el('span','muted','(collection empty — no fields)')); dc.append(head);
      if(d.fields&&d.fields.length){ var fl=el('div','row'); fl.style.marginTop='6px'; d.fields.forEach(function(f){ var s=el('span','chip'); s.append(document.createTextNode(f.name+' ')); s.append(el('span','muted',f.type)); fl.append(s); }); dc.append(fl); }
    } else {
      var lh=el('div','row'); lh.append(el('b',null,'Live stats')); dc.append(lh);
      var st=el('div','row'); st.append(el('span','muted','estimated count:'), el('b',null,String(d.estimatedCount))); dc.append(st);
      if(d.indexes&&d.indexes.length){ var it=el('table'); it.style.marginTop='6px'; var ih=el('tr'); ['Index','Size'].forEach(function(hd,i){ ih.append(el('th',i===1?'num':null,hd)); }); it.append(ih);
        d.indexes.forEach(function(ix){ var tr=el('tr'); var kc=el('td'); kc.append(el('code',null,ix.name)); tr.append(kc); tr.append(el('td','num',ix.sizeBytes!=null?(Math.round(ix.sizeBytes/1024*10)/10)+' KB':'—')); it.append(tr); }); dc.append(it); }
    }
  }).catch(function(e){ dc.replaceChildren(el('div','empty',String(e))); });
}

/* ---------------- Route & handler explorer ---------------- */
function pipeline(items){ var row=el('div','row'); if(!items||!items.length){ row.append(el('span','muted','—')); return row; } items.forEach(function(t){ row.append(el('code',null,t)); }); return row; }
function tryRoute(method,path,out){
  out.replaceChildren(el('span','muted','…'));
  var started=Date.now();
  fetch(path,{method:method,headers:{accept:'application/json'}}).then(function(r){
    var cls=r.ok?'sev-ok':(r.status>=500?'sev-bad':'sev-warn');
    out.replaceChildren(el('span',cls,String(r.status)+' '+r.statusText),el('span','muted',(Date.now()-started)+' ms'));
  }).catch(function(e){ out.replaceChildren(el('span','sev-bad',String(e))); });
}
function renderRoutes(cat){
  var root=document.getElementById('tab-routes'); root.replaceChildren();
  var stats=el('div','stats');
  Object.keys(cat.stats).forEach(function(k){ var s=el('div','stat'); s.append(el('b',null,String(cat.stats[k])), el('span',null,k)); stats.append(s); });
  root.append(stats);
  var panel=el('div','panel'); panel.append(el('h2',null,'Endpoints & their guard / interceptor / pipe / filter chain'));
  var eps=(cat&&cat.endpoints)||[];
  if(!eps.length){ panel.append(el('div','empty','No routes or GraphQL operations registered.')); root.append(panel); return; }
  var table=el('table');
  var thr=el('tr'); ['Endpoint','Handler','Guards','Interceptors','Pipes','Filters','Try'].forEach(function(hd){ thr.append(el('th',null,hd)); }); table.append(thr);
  eps.forEach(function(e){
    var tr=el('tr');
    var epc=el('td');
    if(e.kind==='http'){ epc.append(chip(e.method,'http')); epc.append(el('code',null,e.path)); }
    else { epc.append(chip(e.operation,'graphql')); epc.append(el('code',null,e.field)); }
    tr.append(epc);
    tr.append(el('td','muted',e.controller+'.'+e.handler));
    tr.append((function(){ var td=el('td'); td.append(pipeline(e.guards)); return td; })());
    tr.append((function(){ var td=el('td'); td.append(pipeline(e.interceptors)); return td; })());
    tr.append((function(){ var td=el('td'); td.append(pipeline(e.pipes)); return td; })());
    tr.append((function(){ var td=el('td'); td.append(pipeline(e.filters)); return td; })());
    var tc=el('td');
    if(e.kind==='http'&&e.method==='GET'&&e.path.indexOf(':')===-1){
      var out=el('span','row'); var btn=el('button',null,'GET'); btn.style.cssText='font-size:12px;color:var(--muted);background:transparent;border:1px solid var(--border);border-radius:7px;padding:3px 9px;cursor:pointer;';
      btn.addEventListener('click',function(){ tryRoute('GET',e.path,out); });
      tc.append(btn,out);
    } else { tc.append(el('span','muted','—')); }
    tr.append(tc);
    table.append(tr);
  });
  panel.append(table); root.append(panel);
}

/* ---------------- Cache inspector ---------------- */
function pct(v){ return (v==null?'-':Math.round(v*1000)/10+'%'); }
function rateCls(r){ return r>=0.8?'sev-ok':(r>=0.5?'sev-warn':'sev-bad'); }
function renderCache(data){
  var root=document.getElementById('tab-cache'); root.replaceChildren();
  var stats=el('div','stats');
  function stat(v,label){ var s=el('div','stat'); s.append(el('b',null,String(v)), el('span',null,label)); return s; }
  stats.append(stat(data.total||0,'events'), stat(data.gets||0,'gets'), stat(data.hits||0,'hits'), stat(pct(data.hitRate),'hit rate'));
  root.append(stats);
  var storeP=el('div','panel'); storeP.append(el('h2',null,'Per store'));
  if(!data.byStore||!data.byStore.length){ storeP.append(el('div','empty','No cache activity captured. Wire a cache store and read some keys.')); }
  else { var st=el('table'); var sh=el('tr'); ['Store','Gets','Hits','Hit rate'].forEach(function(hd,i){ sh.append(el('th',i>=1?'num':null,hd)); }); st.append(sh);
    data.byStore.forEach(function(s){ var tr=el('tr'); tr.append(el('td',null,s.store)); tr.append(el('td','num',String(s.gets))); tr.append(el('td','num',String(s.hits))); tr.append(el('td','num '+rateCls(s.hitRate),pct(s.hitRate))); st.append(tr); }); storeP.append(st); }
  root.append(storeP);
  var preP=el('div','panel'); preP.append(el('h2',null,'By key prefix'));
  if(!data.byPrefix||!data.byPrefix.length){ preP.append(el('div','empty','—')); }
  else { var pt=el('table'); var ph=el('tr'); ['Store','Prefix','Gets','Hits','Misses','Hit rate','Sets','Dels'].forEach(function(hd,i){ ph.append(el('th',i>=2?'num':null,hd)); }); pt.append(ph);
    data.byPrefix.forEach(function(p){ var tr=el('tr'); tr.append(el('td','muted',p.store)); var kc=el('td'); kc.append(el('code',null,p.prefix)); tr.append(kc); tr.append(el('td','num',String(p.gets))); tr.append(el('td','num',String(p.hits))); tr.append(el('td','num',String(p.misses))); tr.append(el('td','num '+rateCls(p.hitRate),pct(p.hitRate))); tr.append(el('td','num',String(p.sets))); tr.append(el('td','num',String(p.deletes))); pt.append(tr); }); preP.append(pt); }
  root.append(preP);
  var recP=el('div','panel'); recP.append(el('h2',null,'Recent accesses (click a key to invalidate)'));
  var recent=(data.recent)||[];
  if(!recent.length){ recP.append(el('div','empty','—')); root.append(recP); return; }
  var dl=el('div','deplist');
  recent.forEach(function(e){ var line=el('div','row'); line.append(el('span','muted',e.store)); line.append(chip(e.op,e.op==='get'?(e.hit?'controller':'resolver'):'module'));
    if(e.key!=null){ var k=el('code',null,e.key); k.style.cursor='pointer'; k.title='Invalidate this key'; k.addEventListener('click',function(){ invalidateCache(e.key,e.store,line); }); line.append(k); }
    if(e.op==='get') line.append(el('span',e.hit?'yes':'no',e.hit?'hit':'miss'));
    line.append(el('span','muted',ago(e.at))); dl.append(line); });
  recP.append(dl); root.append(recP);
}
function invalidateCache(key,store,line){
  fetch(BASE+'/api/cache/'+encodeURIComponent(key)+(store?'?store='+encodeURIComponent(store):''),{method:'DELETE',headers:{accept:'application/json'}})
    .then(function(r){ return r.json(); }).then(function(){ if(line) line.append(el('span','sev-ok','invalidated')); })
    .catch(function(e){ if(line) line.append(el('span','sev-bad',String(e))); });
}

/* ---------------- Scheduler ---------------- */
function when(ts){ if(ts==null) return '—'; var d=ts-Date.now(); if(d>0){ var s=Math.round(d/1000); return 'in '+(s<60?s+'s':Math.round(s/60)+'m'); } return ago(ts); }
function renderScheduler(rep){
  var root=document.getElementById('tab-scheduler'); root.replaceChildren();
  var stats=el('div','stats');
  Object.keys(rep.stats).forEach(function(k){ var s=el('div','stat'); s.append(el('b',null,String(rep.stats[k])), el('span',null,k)); stats.append(s); });
  root.append(stats);
  var panel=el('div','panel'); panel.append(el('h2',null,'Scheduled jobs'));
  if(!rep.available){ panel.append(el('div','empty','SchedulerModule not registered. Add @nl-framework/scheduler to inspect jobs.')); root.append(panel); return; }
  var jobs=rep.jobs||[];
  if(!jobs.length){ panel.append(el('div','empty','No scheduled jobs registered.')); root.append(panel); return; }
  var t=el('table');
  var thr=el('tr'); ['Job','Type','Schedule','Runs','Last run','Last dur','Next','Status','Run'].forEach(function(hd,i){ thr.append(el('th',(i===3||i===5)?'num':null,hd)); }); t.append(thr);
  jobs.forEach(function(j){
    var tr=el('tr');
    tr.append(el('td',null,j.id));
    var kc=el('td'); kc.append(chip(j.type,j.type==='cron'?'controller':(j.type==='interval'?'provider':'resolver'))); tr.append(kc);
    var sc=el('td'); sc.append(el('code',null,j.schedule)); tr.append(sc);
    tr.append(el('td','num',String(j.runCount||0)));
    tr.append(el('td','muted',j.lastRunAt?ago(j.lastRunAt):'—'));
    tr.append(el('td','num',j.lastDurationMs!=null?fmtMs(j.lastDurationMs):'—'));
    tr.append(el('td','muted',when(j.nextRunAt)));
    var st=el('td'); if(j.running) st.append(el('span','sev-warn','running')); else if(j.lastError) st.append(el('span','sev-bad',j.lastError)); else st.append(el('span','sev-ok', j.runCount?'ok':'idle')); tr.append(st);
    var rc=el('td'); var out=el('span','row'); var btn=el('button',null,'Run now'); btn.style.cssText='font-size:12px;color:var(--muted);background:transparent;border:1px solid var(--border);border-radius:7px;padding:3px 9px;cursor:pointer;';
    btn.addEventListener('click',function(){ runJob(j.id,out); }); rc.append(btn,out); tr.append(rc);
    t.append(tr);
  });
  panel.append(t); root.append(panel);
}
function runJob(id,out){
  out.replaceChildren(el('span','muted','…'));
  fetch(BASE+'/api/scheduler/'+encodeURIComponent(id)+'/run',{method:'POST',headers:{accept:'application/json'}})
    .then(function(r){ return r.json().then(function(b){ return {ok:r.ok,b:b}; }); })
    .then(function(res){ out.replaceChildren(el('span',res.ok?'sev-ok':'sev-bad',res.ok?'triggered':(res.b&&res.b.message||'failed'))); setTimeout(refreshScheduler,400); })
    .catch(function(e){ out.replaceChildren(el('span','sev-bad',String(e))); });
}

/* ---------------- Boot report ---------------- */
function renderBoot(rep){
  var root=document.getElementById('tab-boot'); root.replaceChildren();
  var stats=el('div','stats');
  function stat(v,label){ var s=el('div','stat'); s.append(el('b',null,String(v)), el('span',null,label)); return s; }
  stats.append(stat(fmtMs(rep.totalMs),'total'), stat(rep.stats.modules,'modules'), stat(rep.stats.providers,'providers'), stat(fmtMs(rep.stats.slowestProviderMs),'slowest'));
  root.append(stats);
  if(!rep.enabled){ var p=el('div','panel'); p.append(el('div','empty','Boot recording was not enabled before bootstrap. Register NaelDevtoolsModule.forRoot before app.bootstrap().')); root.append(p); return; }
  var modP=el('div','panel'); modP.append(el('h2',null,'Module init order'));
  if(!rep.modules.length){ modP.append(el('div','empty','—')); }
  else { var mt=el('table'); var mh=el('tr'); ['#','Module','Controllers','Resolvers','Duration'].forEach(function(hd,i){ mh.append(el('th',(i===0||i>=2)?'num':null,hd)); }); mt.append(mh);
    rep.modules.forEach(function(m){ var tr=el('tr'); tr.append(el('td','num muted',String(m.order))); tr.append(el('td',null,m.module)); tr.append(el('td','num',String(m.controllers))); tr.append(el('td','num',String(m.resolvers))); tr.append(el('td','num '+sev(m.durationMs),fmtMs(m.durationMs))); mt.append(tr); }); modP.append(mt); }
  root.append(modP);
  var provP=el('div','panel'); provP.append(el('h2',null,'Provider construction (slowest first)'));
  if(!rep.providers.length){ provP.append(el('div','empty','—')); }
  else { var pt=el('table'); var ph=el('tr'); ['Provider','Module','Type','Duration'].forEach(function(hd,i){ ph.append(el('th',i===3?'num':null,hd)); }); pt.append(ph);
    rep.providers.slice(0,100).forEach(function(p){ var tr=el('tr'); tr.append(el('td',null,p.token)); tr.append(el('td','muted',p.module||'—')); var tc=el('td'); tc.append(chip(p.type,p.type==='factory'?'resolver':'provider')); tr.append(tc); tr.append(el('td','num '+sev(p.durationMs),fmtMs(p.durationMs))); pt.append(tr); }); provP.append(pt); }
  root.append(provP);
}

/* ---------------- Config explorer ---------------- */
function configNode(n){
  var wrap=el('div','node');
  if(n.kind==='branch'){
    var head=el('div','row'); head.append(el('span','k',n.key), el('span','t','{'+n.children.length+'}')); wrap.append(head);
    var kids=el('div','children'); n.children.forEach(function(c){ kids.append(configNode(c)); }); wrap.append(kids);
  } else {
    var line=el('div','row'); line.append(el('span','k',n.key+':'));
    line.append(el('span',n.redacted?'redacted':null,n.value));
    line.append(el('span','t',n.type)); wrap.append(line);
  }
  return wrap;
}
function renderConfig(tree){
  var root=document.getElementById('tab-config'); root.replaceChildren();
  var stats=el('div','stats');
  Object.keys(tree.stats).forEach(function(k){ var s=el('div','stat'); s.append(el('b',null,String(tree.stats[k])), el('span',null,k)); stats.append(s); });
  root.append(stats);
  var panel=el('div','panel'); panel.append(el('h2',null,'Resolved configuration (secrets redacted)'));
  if(!tree.available){ panel.append(el('div','empty','No ConfigService registered. Install ConfigModule to inspect resolved configuration.')); root.append(panel); return; }
  if(!tree.nodes.length){ panel.append(el('div','empty','Configuration is empty.')); root.append(panel); return; }
  var t=el('div','tree'); tree.nodes.forEach(function(n){ t.append(configNode(n)); }); panel.append(t); root.append(panel);
}

/* ---------------- Request inspector ---------------- */
function reqSev(s){ return s==='error'?'sev-bad':(s==='pending'?'sev-warn':'sev-ok'); }
function renderRequests(data){
  var root=document.getElementById('tab-requests'); root.replaceChildren();
  var panel=el('div','panel'); panel.append(el('h2',null,'Recent requests (click to inspect the timeline)'));
  var reqs=(data&&data.requests)||[];
  if(!reqs.length){ panel.append(el('div','empty','No requests captured yet. Hit a route.')); root.append(panel); return; }
  var table=el('table');
  var thr=el('tr'); ['Request','Kind','Status','Duration','When'].forEach(function(hd,i){ thr.append(el('th',i===3?'num':null,hd)); }); table.append(thr);
  reqs.forEach(function(r){
    var tr=el('tr'); tr.style.cursor='pointer';
    tr.append(el('td',null,r.name));
    var kc=el('td'); kc.append(chip(r.kind,r.kind)); tr.append(kc);
    tr.append(el('td',reqSev(r.status),(r.httpStatus!=null?String(r.httpStatus)+' ':'')+r.status));
    tr.append(el('td','num',fmtMs(r.durationMs)));
    tr.append(el('td','muted',ago(r.at)));
    tr.addEventListener('click',function(){ openRequest(r.requestId); });
    table.append(tr);
  });
  panel.append(table); root.append(panel);
  var detail=el('div','panel'); detail.id='req-detail'; detail.append(el('div','muted','Select a request above to see its timeline.')); root.append(detail);
}
function openRequest(id){
  load('/api/requests/'+encodeURIComponent(id)).then(function(d){
    var box=document.getElementById('req-detail'); if(!box) return; box.replaceChildren();
    box.append(el('h2',null,'Timeline · '+d.name+' ('+fmtMs(d.durationMs)+')'));
    if(d.nPlusOne&&d.nPlusOne.length){ var warn=el('div','row'); warn.append(el('span','sev-bad','N+1 smell:')); d.nPlusOne.forEach(function(f){ warn.append(el('code',null,f.collection+' ×'+f.occurrences)); }); box.append(warn); }
    var events=[];
    (d.steps||[]).forEach(function(s){ events.push({at:s.at,label:'step:'+s.step+' '+s.token+' ('+s.outcome+')',ms:s.durationMs,cls:s.outcome==='throw'?'sev-bad':'muted'}); });
    (d.queries||[]).forEach(function(q){ events.push({at:q.at,label:'orm '+q.op+' '+q.collection+' '+JSON.stringify(q.filterShape),ms:q.durationMs,cls:'chip graphql'}); });
    (d.logs||[]).forEach(function(l){ events.push({at:l.at,label:'log ['+l.level+'] '+(l.context?l.context+': ':'')+l.message,cls:'muted'}); });
    (d.exceptions||[]).forEach(function(e){ events.push({at:e.at,label:'throw '+e.name+': '+e.message,cls:'sev-bad'}); });
    events.sort(function(a,b){ return a.at-b.at; });
    if(!events.length){ box.append(el('div','empty','No sub-events recorded for this request.')); return; }
    var dl=el('div','deplist');
    events.forEach(function(ev){ var line=el('div','row'); line.append(el('span',ev.cls,ev.label)); if(ev.ms!=null) line.append(el('span','muted',fmtMs(ev.ms))); dl.append(line); });
    box.append(dl);
  }).catch(function(e){ var box=document.getElementById('req-detail'); if(box){ box.replaceChildren(el('div','empty',String(e))); } });
}

/* ---------------- ORM query inspector ---------------- */
function renderOrm(data){
  var root=document.getElementById('tab-orm'); root.replaceChildren();
  var stats=el('div','stats'); var s=el('div','stat'); s.append(el('b',null,String(data.total||0)),el('span',null,'queries')); stats.append(s); root.append(stats);
  var byCol=el('div','panel'); byCol.append(el('h2',null,'Per-collection'));
  if(!data.byCollection||!data.byCollection.length){ byCol.append(el('div','empty','No ORM reads captured. Enable a QueryObserver-backed connection and run a query.')); }
  else { var t=el('table'); var h=el('tr'); ['Collection','Count','Total','Avg','Max'].forEach(function(hd,i){ h.append(el('th',i>=1?'num':null,hd)); }); t.append(h);
    data.byCollection.forEach(function(c){ var tr=el('tr'); tr.append(el('td',null,c.collection)); tr.append(el('td','num',String(c.count))); tr.append(el('td','num',fmtMs(c.totalMs))); tr.append(el('td','num',fmtMs(c.avgMs))); tr.append(el('td','num',fmtMs(c.maxMs))); t.append(tr); }); byCol.append(t); }
  root.append(byCol);
  var slow=el('div','panel'); slow.append(el('h2',null,'Slowest queries'));
  if(!data.slowest||!data.slowest.length){ slow.append(el('div','empty','—')); }
  else { var t2=el('table'); var h2=el('tr'); ['Collection','Op','Filter shape','Rows','Duration'].forEach(function(hd,i){ h2.append(el('th',i>=3?'num':null,hd)); }); t2.append(h2);
    data.slowest.forEach(function(q){ var tr=el('tr'); tr.append(el('td',null,q.collection)); tr.append(el('td',null,q.op)); var fc=el('td'); fc.append(el('code',null,JSON.stringify(q.filterShape))); tr.append(fc); tr.append(el('td','num',q.count!=null?String(q.count):'-')); tr.append(el('td','num '+sev(q.durationMs),fmtMs(q.durationMs))); t2.append(tr); }); slow.append(t2); }
  root.append(slow);
}

/* ---------------- Error explorer ---------------- */
function renderErrors(data){
  var root=document.getElementById('tab-errors'); root.replaceChildren();
  var panel=el('div','panel'); panel.append(el('h2',null,'Exceptions (grouped)'));
  var groups=(data&&data.groups)||[];
  if(!groups.length){ panel.append(el('div','empty','No exceptions recorded.')); root.append(panel); return; }
  var t=el('table'); var h=el('tr'); ['Type','Count','Sample message','Last seen'].forEach(function(hd,i){ h.append(el('th',i===1?'num':null,hd)); }); t.append(h);
  groups.forEach(function(g){ var tr=el('tr'); tr.append(el('td','sev-bad',g.name)); tr.append(el('td','num',String(g.count))); tr.append(el('td',null,g.sample)); tr.append(el('td','muted',ago(g.lastSeen))); t.append(tr); });
  panel.append(t); root.append(panel);
}

/* ---------------- Log tail ---------------- */
function levelCls(l){ l=(l||'').toUpperCase(); return (l==='ERROR'||l==='FATAL')?'sev-bad':(l==='WARN'?'sev-warn':'muted'); }
function renderLogs(data){
  var root=document.getElementById('tab-logs'); root.replaceChildren();
  var panel=el('div','panel'); panel.append(el('h2',null,'Log tail'));
  var logs=(data&&data.logs)||[];
  if(!logs.length){ panel.append(el('div','empty','No logs captured yet.')); root.append(panel); return; }
  var dl=el('div','deplist');
  logs.forEach(function(l){ var line=el('div','row'); line.append(el('span',levelCls(l.level),l.level)); if(l.context) line.append(el('span','muted',l.context)); line.append(el('span',null,l.message)); if(l.requestId) line.append(el('code',null,String(l.requestId).slice(0,8))); line.append(el('span','muted',ago(l.at))); dl.append(line); });
  panel.append(dl); root.append(panel);
}

/* ---------------- tabs + boot ---------------- */
var loaded={graph:false,models:false,routes:false,config:false,boot:false};
function ensureGraph(){ if(loaded.graph) return; loaded.graph=true; load('/api/graph').then(renderGraph).catch(function(e){ document.getElementById('tab-graph').append(el('div','empty',String(e))); }); }
function ensureModels(){ if(loaded.models) return; loaded.models=true; load('/api/models').then(renderModels).catch(function(e){ document.getElementById('tab-models').append(el('div','empty',String(e))); }); }
function ensureRoutes(){ if(loaded.routes) return; loaded.routes=true; load('/api/routes').then(renderRoutes).catch(function(e){ document.getElementById('tab-routes').append(el('div','empty',String(e))); }); }
function ensureConfig(){ if(loaded.config) return; loaded.config=true; load('/api/config').then(renderConfig).catch(function(e){ document.getElementById('tab-config').append(el('div','empty',String(e))); }); }
function ensureBoot(){ if(loaded.boot) return; loaded.boot=true; load('/api/boot').then(renderBoot).catch(function(e){ document.getElementById('tab-boot').append(el('div','empty',String(e))); }); }
function refreshRequests(){ load('/api/requests?limit=100').then(renderRequests).catch(function(e){ document.getElementById('tab-requests').replaceChildren(el('div','empty',String(e))); }); }
function refreshOrm(){ load('/api/queries').then(renderOrm).catch(function(e){ document.getElementById('tab-orm').replaceChildren(el('div','empty',String(e))); }); }
function refreshErrors(){ load('/api/exceptions').then(renderErrors).catch(function(e){ document.getElementById('tab-errors').replaceChildren(el('div','empty',String(e))); }); }
function refreshLogs(){ load('/api/logs').then(renderLogs).catch(function(e){ document.getElementById('tab-logs').replaceChildren(el('div','empty',String(e))); }); }
function refreshCache(){ load('/api/cache').then(renderCache).catch(function(e){ document.getElementById('tab-cache').replaceChildren(el('div','empty',String(e))); }); }
function refreshScheduler(){ load('/api/scheduler').then(renderScheduler).catch(function(e){ document.getElementById('tab-scheduler').replaceChildren(el('div','empty',String(e))); }); }

var TABS=['perf','requests','orm','errors','logs','graph','models','routes','cache','scheduler','boot','config'];
document.querySelectorAll('nav button').forEach(function(btn){ btn.addEventListener('click',function(){
  document.querySelectorAll('nav button').forEach(function(b){ b.classList.toggle('active', b===btn); });
  var tab=btn.dataset.tab;
  TABS.forEach(function(t){ document.getElementById('tab-'+t).hidden=tab!==t; });
  if(tab==='graph') ensureGraph();
  if(tab==='models') ensureModels();
  if(tab==='routes') ensureRoutes();
  if(tab==='config') ensureConfig();
  if(tab==='boot') ensureBoot();
  if(tab==='requests') refreshRequests();
  if(tab==='orm') refreshOrm();
  if(tab==='errors') refreshErrors();
  if(tab==='logs') refreshLogs();
  if(tab==='cache') refreshCache();
  if(tab==='scheduler') refreshScheduler();
}); });

load('/api/metrics').then(renderMetrics).catch(function(){});
startStream();
/* Live: refresh the active debugger tab as fresh events arrive. */
(function(){ if(!window.EventSource) return; var ev=new EventSource(BASE+'/api/events/stream');
  var active=function(){ var b=document.querySelector('nav button.active'); return b?b.dataset.tab:'perf'; };
  var pending=false; function schedule(fn){ if(pending) return; pending=true; setTimeout(function(){ pending=false; fn(); },600); }
  ev.addEventListener('request:end',function(){ if(active()==='requests') schedule(refreshRequests); });
  ev.addEventListener('orm:query',function(){ if(active()==='orm') schedule(refreshOrm); });
  ev.addEventListener('exception',function(){ if(active()==='errors') schedule(refreshErrors); });
  ev.addEventListener('log',function(){ if(active()==='logs') schedule(refreshLogs); });
  ev.addEventListener('cache',function(){ if(active()==='cache') schedule(refreshCache); });
})();
</script>
</body>
</html>`;
};
