const state = { markets: [], source: "demo", query: "", category: "", phase: "", demoBundle: null };
const $ = (id) => document.getElementById(id);

function number(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function yesPrice(m) { return number(m.yesPrice ?? m.secondaryYesPrice ?? m.primaryYesPrice); }
function noPrice(m) { const n = number(m.noPrice ?? m.secondaryNoPrice ?? m.primaryNoPrice); return n || Math.max(0, 1 - yesPrice(m)); }
function volume(m) { return number(m.totalVolumeUsdc ?? m.volumeUsdc); }
function money(value) { return new Intl.NumberFormat("en", { style:"currency", currency:"USD", notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: value >= 1000 ? 1 : 0 }).format(value); }
function pct(value) { return `${Math.round(value * 100)}%`; }
function score(m) {
  const conviction = Math.min(100, Math.abs(yesPrice(m) - .5) * 200);
  const liquidity = Math.min(100, Math.log10(1 + volume(m)) * 22);
  const phase = m.phase === "secondary" ? 100 : m.phase === "primary" ? 72 : 40;
  return Math.round(conviction * .45 + liquidity * .35 + phase * .2);
}
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
function clip(value, n=74) { const text = String(value || "Untitled market"); return text.length > n ? `${text.slice(0,n-1)}…` : text; }

async function getJson(url) {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `Request failed: ${response.status}`);
  return body;
}

async function load() {
  $("refresh").disabled = true;
  $("resultMeta").textContent = "Analyzing Panta markets…";
  try {
    const health = await getJson("/api/health");
    state.source = health.mode;
    const suffix = state.source === "live" ? "" : "?demo=1";
    const [catalog, categories] = await Promise.all([getJson(`/api/markets${suffix}`), getJson(`/api/categories${suffix}`)]);
    state.markets = catalog.items || [];
    $("category").innerHTML = `<option value="">All categories</option>${(categories.categories || []).map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")}`;
    updateSource();
    render();
  } catch (error) {
    try {
      const demo = await getJson("./demo-markets.json");
      state.source = "demo";
      state.demoBundle = demo;
      state.markets = demo.items || [];
      $("category").innerHTML = `<option value="">All categories</option>${(demo.categories || []).map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")}`;
      updateSource();
      render();
    } catch {
      $("marketGrid").innerHTML = `<div class="empty"><strong>Could not load signals</strong><p>${escapeHtml(error.message)}</p></div>`;
      $("resultMeta").textContent = "Data unavailable";
    }
  } finally { $("refresh").disabled = false; }
}

function updateSource() {
  const pill = $("sourcePill");
  pill.classList.toggle("live", state.source === "live");
  pill.lastChild.textContent = state.source === "live" ? " Live Panta API" : " Demo data · API ready";
}

function filtered() {
  return state.markets.filter(m => {
    const haystack = `${m.title} ${m.description || ""} ${m.category || ""}`.toLowerCase();
    return (!state.query || haystack.includes(state.query)) && (!state.category || m.category === state.category) && (!state.phase || m.phase === state.phase);
  }).sort((a,b) => score(b) - score(a));
}

function renderSummary(items) {
  $("marketCount").textContent = items.length;
  const conviction = [...items].sort((a,b) => Math.abs(yesPrice(b)-.5) - Math.abs(yesPrice(a)-.5))[0];
  const liquid = [...items].sort((a,b) => volume(b)-volume(a))[0];
  const close = [...items].sort((a,b) => Math.abs(yesPrice(a)-.5) - Math.abs(yesPrice(b)-.5))[0];
  $("topConviction").textContent = conviction ? pct(Math.max(yesPrice(conviction), noPrice(conviction))) : "—";
  $("topConvictionLabel").textContent = conviction ? clip(conviction.title, 38) : "No matching markets";
  $("topLiquidity").textContent = liquid ? money(volume(liquid)) : "—";
  $("topLiquidityLabel").textContent = liquid ? clip(liquid.title, 38) : "No matching markets";
  $("closestCall").textContent = close ? `${pct(yesPrice(close))} / ${pct(noPrice(close))}` : "—";
  $("closestCallLabel").textContent = close ? clip(close.title, 38) : "No matching markets";
  $("totalVolume").textContent = money(items.reduce((sum,m)=>sum+volume(m),0));
}

function render() {
  const items = filtered();
  renderSummary(items);
  $("resultMeta").textContent = `${items.length} of ${state.markets.length} markets · ranked by signal score`;
  $("marketGrid").innerHTML = items.length ? items.map(m => `
    <article class="market-card" tabindex="0" data-id="${escapeHtml(m.marketId)}">
      <div class="card-top"><span class="category">${escapeHtml(m.category || "other")}</span><span class="score" title="Signal score">${score(m)}</span></div>
      <h3>${escapeHtml(m.title)}</h3>
      <div class="prices"><div><span>Yes</span><strong>${pct(yesPrice(m))}</strong></div><div><span>No</span><strong>${pct(noPrice(m))}</strong></div></div>
      <div class="card-foot"><span>${money(volume(m))} volume</span><span class="phase">${escapeHtml(m.phase || "unknown")}</span></div>
    </article>`).join("") : `<div class="empty"><strong>No matching markets</strong><p>Clear a filter to widen the signal feed.</p></div>`;
  document.querySelectorAll(".market-card").forEach(card => {
    const open = () => openDetail(card.dataset.id);
    card.addEventListener("click", open);
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") open(); });
  });
}

async function openDetail(id) {
  const dialog = $("detailDialog");
  $("detailContent").innerHTML = `<div class="detail"><p class="eyebrow">Panta market detail</p><h2>Loading evidence…</h2></div>`;
  dialog.showModal();
  if (state.demoBundle) {
    const market = state.markets.find(item => item.marketId === id);
    const rows = state.demoBundle.trades?.[id] || [];
    return renderDetail(market, rows);
  }
  const suffix = state.source === "live" ? "" : "?demo=1";
  try {
    const [market, trades] = await Promise.all([getJson(`/api/markets/${encodeURIComponent(id)}${suffix}`), getJson(`/api/markets/${encodeURIComponent(id)}/trades${suffix}`)]);
    renderDetail(market, trades.items || []);
  } catch (error) { $("detailContent").innerHTML = `<div class="detail"><h2>Detail unavailable</h2><p>${escapeHtml(error.message)}</p></div>`; }
}

function renderDetail(market, rows) {
    const yesFlow = rows.filter(t => String(t.side || "").toLowerCase() === "yes").reduce((s,t)=>s+number(t.amountUsdc),0);
    const noFlow = rows.filter(t => String(t.side || "").toLowerCase() === "no").reduce((s,t)=>s+number(t.amountUsdc),0);
    const flow = yesFlow + noFlow ? `${Math.round(yesFlow/(yesFlow+noFlow)*100)}% YES flow` : "No recent flow";
    $("detailContent").innerHTML = `<div class="detail">
      <p class="eyebrow">${escapeHtml(market.category || "market")} · Signal ${score(market)}/100</p>
      <h2>${escapeHtml(market.title)}</h2><p class="description">${escapeHtml(market.description || "Panta market intelligence detail.")}</p>
      <div class="detail-metrics"><div><span>Probability</span><strong>${pct(yesPrice(market))} YES</strong></div><div><span>Volume</span><strong>${money(volume(market))}</strong></div><div><span>Recent flow</span><strong>${flow}</strong></div></div>
      <p class="eyebrow">Recent trades from Panta</p>
      <ul class="trade-list">${rows.length ? rows.slice(0,8).map(t=>`<li><span class="trade-side ${escapeHtml(String(t.side||"").toLowerCase())}">${escapeHtml(String(t.side||"—").toUpperCase())}</span><code>${escapeHtml(clip(t.signature||"trade",18))}</code><strong>${money(number(t.amountUsdc))}</strong></li>`).join("") : "<li>No recent trades returned.</li>"}</ul>
    </div>`;
}

$("search").addEventListener("input", e => { state.query = e.target.value.trim().toLowerCase(); render(); });
$("category").addEventListener("change", e => { state.category = e.target.value; render(); });
$("phase").addEventListener("change", e => { state.phase = e.target.value; render(); });
$("refresh").addEventListener("click", load);
$("dialogClose").addEventListener("click", () => $("detailDialog").close());
$("detailDialog").addEventListener("click", e => { if (e.target === $("detailDialog")) $("detailDialog").close(); });
load();
