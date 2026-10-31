"use strict";
/* Party side: menus, tournament bracket, betting, payouts, quick duel and the game library. */

const START_POINTS = 100, WIN_BONUS = 25, MIN_STAKE = 10;
const STORE = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const CFG = Object.assign({ off: [], sound: true, quickNames: ["Red", "Blue"], quickNeed: 3, players: [], bestOf: 3, cats: Object.keys(CATS) }, STORE.get("pg.cfg", {}));
let T = STORE.get("pg.tour", null);
const saveCfg = () => STORE.set("pg.cfg", CFG);
const saveT = () => T ? STORE.set("pg.tour", T) : STORE.del("pg.tour");
SOUND.on = CFG.sound;

const gameById = id => GAMES.find(g => g.id === id);
const cleanName = v => (v || "").replace(/\s+/g, " ").trim().slice(0, 14);

function show(id) {
  exitGame();
  $$(".screen").forEach(s => { s.hidden = s.id !== id; });
  window.scrollTo(0, 0);
}
function bind(id, fn) { $(`#${id}`).addEventListener("click", e => { const b = e.target.closest("[data-a]"); if (b && !b.disabled) fn(b.dataset.a, b); }); }
const header = (title, back = "home", label = "Menu") => `<header class="topbar"><button class="back" data-a="${back}">← ${label}</button><h2>${title}</h2></header>`;

/* ================= HOME ================= */
function renderHome() {
  const live = T && !T.done;
  const enabled = GAMES.filter(g => !CFG.off.includes(g.id)).length;
  $("#home .menu").innerHTML = `
    ${live ? `<button class="start" data-a="continue">Continue tournament<small>${T.players.length} players · ${roundName(currentMatch() ? currentMatch().r : T.rounds.length - 1)}</small></button>` : ""}
    <button class="${live ? "btn big" : "start"}" data-a="new">New tournament<small>Bracket + betting for the whole party</small></button>
    <button class="btn big" data-a="quick">Quick duel<small>Just two players, no bets</small></button>
    <button class="btn big" data-a="library">Game library<small>${enabled} of ${GAMES.length} games switched on</small></button>
    <button class="toggle" data-a="sound" aria-pressed="${SOUND.on}">Sound: ${SOUND.on ? "on" : "off"}</button>`;
  show("home");
}
bind("home", a => {
  audio();
  if (a === "continue") renderBracket();
  else if (a === "new") renderSetup();
  else if (a === "quick") renderQuick();
  else if (a === "library") renderLibrary();
  else if (a === "sound") { SOUND.on = CFG.sound = !SOUND.on; saveCfg(); renderHome(); beep(660, 0.06); }
});

/* ================= TOURNAMENT SETUP ================= */
const SP = { players: [], bestOf: 3, cats: [] };
function renderSetup(keep) {
  if (!keep) { SP.players = CFG.players.slice(); SP.bestOf = CFG.bestOf; SP.cats = CFG.cats.filter(c => CATS[c]); if (!SP.cats.length) SP.cats = Object.keys(CATS); }
  const n = SP.players.length;
  const pool = GAMES.filter(g => SP.cats.includes(g.cat) && !CFG.off.includes(g.id)).length;
  $("#setup").innerHTML = `${header("New tournament")}
    <section>
      <h3 class="label">Who's playing? <small>${n} of 16</small></h3>
      <form class="addrow" id="addForm"><input id="pname" placeholder="Add a name" maxlength="14" autocomplete="off" enterkeyhint="done"><button class="btn" type="submit">Add</button></form>
      ${n ? `<ul class="plist">${SP.players.map((p, i) => `<li><span>${esc(p)}</span><button data-a="rm" data-i="${i}" aria-label="Remove ${esc(p)}">✕</button></li>`).join("")}</ul>` : `<p class="note">Add everyone at the party. Two people duel at a time; everyone else bets on them.</p>`}
    </section>
    <section>
      <h3 class="label">Mini-games per duel</h3>
      <div class="seg">${[1, 3, 5].map(b => `<button data-a="bo" data-v="${b}" aria-checked="${SP.bestOf === b}" role="radio">Best of ${b}</button>`).join("")}</div>
    </section>
    <section>
      <h3 class="label">Game types <small>${pool} games in the mix</small></h3>
      <div class="chips">${Object.entries(CATS).map(([k, v]) => `<button class="chip" data-a="cat" data-v="${k}" aria-pressed="${SP.cats.includes(k)}">${v} <small>${GAMES.filter(g => g.cat === k).length}</small></button>`).join("")}</div>
    </section>
    <p class="note">Everyone starts with ${START_POINTS} points. Before each duel, the watchers bet on who'll win. Winning a duel earns ${WIN_BONUS} points.</p>
    <button class="start" data-a="go" ${n < 2 || !pool ? "disabled" : ""}>${n < 2 ? "Add at least 2 players" : !pool ? "Pick a game type" : `Start with ${n} players`}</button>`;
  show("setup");
  $("#addForm").addEventListener("submit", e => {
    e.preventDefault();
    const v = cleanName($("#pname").value);
    if (v && SP.players.length < 16 && !SP.players.some(p => p.toLowerCase() === v.toLowerCase())) { SP.players.push(v); CFG.players = SP.players.slice(); saveCfg(); }
    renderSetup(true); $("#pname").focus();
  });
}
bind("setup", (a, b) => {
  if (a === "home") return renderHome();
  if (a === "rm") { SP.players.splice(+b.dataset.i, 1); CFG.players = SP.players.slice(); saveCfg(); }
  if (a === "bo") { SP.bestOf = +b.dataset.v; CFG.bestOf = SP.bestOf; saveCfg(); }
  if (a === "cat") { const k = b.dataset.v; SP.cats = SP.cats.includes(k) ? SP.cats.filter(c => c !== k) : [...SP.cats, k]; CFG.cats = SP.cats.slice(); saveCfg(); }
  if (a === "go") return newTournament(SP.players, SP.bestOf, SP.cats);
  renderSetup(true);
});

/* ================= BRACKET ================= */
function makeBracket(ids) {
  const n = ids.length, size = 2 ** Math.ceil(Math.log2(n)), M = size / 2, byes = size - n;
  const pool = shuffle(ids), rounds = [[]];
  // Spread the byes out so the second round isn't lopsided.
  const byeSlots = new Set(shuffle([...Array(M).keys()]).slice(0, byes));
  for (let i = 0; i < M; i++) {
    if (byeSlots.has(i)) { const a = pool.pop(); rounds[0].push({ a, b: null, w: a }); }
    else rounds[0].push({ a: pool.pop(), b: pool.pop(), w: null });
  }
  for (let m = M / 2; m >= 1; m /= 2) rounds.push([...Array(m)].map(() => ({ a: null, b: null, w: null })));
  advance(rounds);
  return rounds;
}
function advance(rounds) {
  for (let r = 0; r < rounds.length - 1; r++) rounds[r].forEach((m, i) => { if (m.w != null) rounds[r + 1][i >> 1][i % 2 ? "b" : "a"] = m.w; });
}
function newTournament(names, bestOf, cats) {
  const players = names.map((n, i) => ({ id: i, name: n, pts: START_POINTS }));
  T = { players, rounds: makeBracket(players.map(p => p.id)), bestOf, cats: cats.slice(), bag: [], pending: null, history: [], done: false, champ: null };
  saveT(); renderBracket();
}
const P = id => T.players.find(p => p.id === id);
function currentMatch() {
  for (let r = 0; r < T.rounds.length; r++) for (let i = 0; i < T.rounds[r].length; i++) {
    const m = T.rounds[r][i]; if (m.a != null && m.b != null && m.w == null) return { r, i, m };
  }
  return null;
}
function roundName(r) {
  const left = T.rounds.length - 1 - r;
  return left === 0 ? "Final" : left === 1 ? "Semifinals" : left === 2 ? "Quarterfinals" : `Round ${r + 1}`;
}
function leaderboard(highlight) {
  const list = T.players.slice().sort((a, b) => b.pts - a.pts);
  return `<ol class="board">${list.map((p, k) => `<li class="${p.id === highlight ? "hl" : ""}"><span class="rk">${k + 1}</span><span class="nm">${esc(p.name)}${T.champ === p.id ? ' <em class="crown">Champion</em>' : ""}</span><span class="pt">${p.pts}</span></li>`).join("")}</ol>`;
}
function renderBracket() {
  const cur = currentMatch();
  let next = "";
  if (T.done) next = `<section class="nextup done"><p class="eyebrow">Tournament over</p><h3>${esc(P(T.champ).name)} is the champion</h3><button class="start" data-a="final">See final results</button></section>`;
  else if (cur) {
    const A = P(cur.m.a), B = P(cur.m.b), watchers = T.players.length - 2;
    const resume = T.pending && T.pending.r === cur.r && T.pending.i === cur.i;
    next = `<section class="nextup"><p class="eyebrow">Up next · ${roundName(cur.r)}</p>
      <div class="vs"><span class="red-t">${esc(A.name)}</span><span class="v">vs</span><span class="blue-t">${esc(B.name)}</span></div>
      <button class="start" data-a="${resume ? "resume" : watchers ? "bets" : "duel"}">${resume ? "Resume duel" : watchers ? "Take bets" : "Start duel"}</button></section>`;
  }
  const cols = T.rounds.map((round, r) => `<div class="rcol"><p class="rname">${roundName(r)}</p>${round.map((m, i) => {
    const isCur = cur && cur.r === r && cur.i === i;
    const nm = id => id == null ? `<span class="tbd">${r === 0 ? "bye" : "—"}</span>` : esc(P(id).name);
    const cls = id => id != null && m.w === id ? "w" : (m.w != null && id != null ? "l" : "");
    return `<div class="m ${isCur ? "cur" : ""}"><div class="${cls(m.a)}">${nm(m.a)}</div><div class="${cls(m.b)}">${nm(m.b)}</div></div>`;
  }).join("")}</div>`).join("");
  $("#bracket").innerHTML = `${header("Tournament")}${next}
    <section><h3 class="label">Bracket</h3><div class="bscroll"><div class="bracket">${cols}</div></div></section>
    <section><h3 class="label">Points</h3>${leaderboard()}</section>
    <button class="linkbtn" data-a="end">${T.endArm ? "Tap again to end the tournament" : "End tournament"}</button>`;
  show("bracket");
}
bind("bracket", a => {
  if (a === "home") { T.endArm = false; return renderHome(); }
  if (a === "bets") return renderBets(true);
  if (a === "duel") { lockBets([]); return runTournamentDuel(); }
  if (a === "resume") return runTournamentDuel();
  if (a === "final") return renderFinal();
  if (a === "end") {
    if (T.endArm) { T = null; saveT(); return renderHome(); }
    T.endArm = true; renderBracket(); setTimeout(() => { if (T && T.endArm) { T.endArm = false; if (!$("#bracket").hidden) renderBracket(); } }, 3000);
  }
});

/* ================= BETTING ================= */
let BETS = {}; // id -> { side: 0|1|null, amt }
const bailed = new Set();
function renderBets(fresh) {
  const cur = currentMatch(), A = P(cur.m.a), B = P(cur.m.b);
  const watchers = T.players.filter(p => p.id !== A.id && p.id !== B.id);
  if (fresh) {
    BETS = {}; bailed.clear();
    for (const w of watchers) { if (w.pts < MIN_STAKE) { w.pts = MIN_STAKE; bailed.add(w.id); } BETS[w.id] = { side: null, amt: MIN_STAKE }; }
    saveT();
  }
  const pool = [0, 0];
  for (const id in BETS) { const b = BETS[id]; if (b.side != null) pool[b.side] += b.amt; }
  const total = pool[0] + pool[1];
  const odds = s => pool[s] ? `×${(total / pool[s]).toFixed(2)}` : "—";
  const amts = p => [10, 25, 50].filter(v => v < p.pts).concat([p.pts]);
  $("#bets").innerHTML = `${header("Place your bets", "bracket", "Bracket")}
    <section class="vsbig">
      <div class="side red"><small>Bottom of phone</small><b>${esc(A.name)}</b><span>${pool[0]} pts · ${odds(0)}</span></div>
      <div class="side blue"><small>Top of phone</small><b>${esc(B.name)}</b><span>${pool[1]} pts · ${odds(1)}</span></div>
    </section>
    <p class="note">Pass the phone around. Pick a side and a stake. Winners split the whole pot by stake, so backing the underdog pays more.</p>
    <ul class="betlist">${watchers.map(w => { const b = BETS[w.id]; return `<li class="bet">
      <div class="who"><b>${esc(w.name)}</b><span>${w.pts} pts${bailed.has(w.id) ? " · topped up" : ""}</span></div>
      <div class="sides"><button class="sd red" data-a="side" data-id="${w.id}" data-s="0" aria-pressed="${b.side === 0}">${esc(A.name)}</button><button class="sd blue" data-a="side" data-id="${w.id}" data-s="1" aria-pressed="${b.side === 1}">${esc(B.name)}</button></div>
      <div class="amts">${amts(w).map(v => `<button class="amt" data-a="amt" data-id="${w.id}" data-v="${v}" aria-pressed="${b.amt === v}" ${b.side == null ? "disabled" : ""}>${v === w.pts ? `All in ${v}` : v}</button>`).join("")}</div>
    </li>`; }).join("")}</ul>
    <button class="start" data-a="lock">${total ? `Lock ${total} pts in bets &amp; duel` : "Duel with no bets"}</button>`;
  show("bets");
}
bind("bets", (a, b) => {
  if (a === "bracket") return renderBracket();
  if (a === "side") { const x = BETS[b.dataset.id], s = +b.dataset.s; x.side = x.side === s ? null : s; beep(520, 0.03); }
  if (a === "amt") { BETS[b.dataset.id].amt = +b.dataset.v; beep(600, 0.03); }
  if (a === "lock") {
    lockBets(Object.entries(BETS).filter(([, x]) => x.side != null).map(([id, x]) => ({ id: +id, side: x.side, amt: Math.min(x.amt, P(+id).pts) })));
    return runTournamentDuel();
  }
  renderBets(false);
});
function lockBets(bets) {
  const cur = currentMatch();
  for (const b of bets) P(b.id).pts -= b.amt; // stakes leave the wallet when locked
  T.pending = { r: cur.r, i: cur.i, bets };
  saveT();
}

/* ================= TOURNAMENT DUEL + PAYOUT ================= */
function tourPool() {
  let ids = GAMES.filter(g => T.cats.includes(g.cat) && !CFG.off.includes(g.id)).map(g => g.id);
  if (!ids.length) ids = GAMES.map(g => g.id);
  return ids;
}
function bagNext(holder, poolIds) {
  if (!holder.bag || !holder.bag.length) {
    holder.bag = shuffle(poolIds);
    if (holder.bag.length > 1 && holder.bag[holder.bag.length - 1] === holder.last) holder.bag.unshift(holder.bag.pop());
  }
  const id = holder.bag.pop(); holder.last = id;
  return gameById(id);
}
function runTournamentDuel() {
  const cur = currentMatch(), A = P(cur.m.a), B = P(cur.m.b);
  startDuel({
    names: [A.name, B.name], need: Math.ceil(T.bestOf / 2),
    next: () => { const g = bagNext(T, tourPool()); saveT(); return g; },
    endActions: [{ label: "See payouts", act: "pay", primary: true }],
    onAction: (act, w) => settle(w),
    onQuit: () => renderBracket()
  });
}
function settle(w) {
  const cur = currentMatch(); if (!cur) return renderBracket();
  const m = cur.m, winId = w === 0 ? m.a : m.b, loseId = w === 0 ? m.b : m.a;
  const bets = (T.pending && T.pending.bets) || [];
  const total = bets.reduce((s, b) => s + b.amt, 0), winPool = bets.filter(b => b.side === w).reduce((s, b) => s + b.amt, 0);
  const results = bets.map(b => {
    const back = b.side === w ? Math.floor(b.amt * total / winPool) : 0;
    P(b.id).pts += back;
    return { id: b.id, side: b.side, amt: b.amt, net: back - b.amt };
  });
  P(winId).pts += WIN_BONUS;
  m.w = winId; advance(T.rounds);
  T.history.push({ r: cur.r, a: m.a, b: m.b, w: winId, score: D.score.slice(), results });
  T.pending = null;
  if (T.rounds[T.rounds.length - 1][0].w != null) { T.done = true; T.champ = T.rounds[T.rounds.length - 1][0].w; }
  saveT();
  renderPayout(winId, loseId, D.score[w], D.score[1 - w], results);
}
function renderPayout(winId, loseId, ws, ls, results) {
  const sideName = s => esc(P(s === 0 ? T.history[T.history.length - 1].a : T.history[T.history.length - 1].b).name);
  $("#payout").innerHTML = `<section class="hero"><p class="eyebrow">Duel result</p><h2 class="huge">${esc(P(winId).name)} wins</h2>
      <p class="sub">${ws}–${ls} over ${esc(P(loseId).name)} · +${WIN_BONUS} points for the win</p></section>
    <section><h3 class="label">Bets</h3>${results.length ? `<ul class="paylist">${results.sort((a, b) => b.net - a.net).map(r => `<li><span class="nm">${esc(P(r.id).name)}<small>${r.amt} on ${sideName(r.side)}</small></span><span class="delta ${r.net >= 0 ? "up" : "down"}">${r.net >= 0 ? "+" : "−"}${Math.abs(r.net)}</span><span class="pt">${P(r.id).pts}</span></li>`).join("")}</ul>` : `<p class="note">No bets on this one.</p>`}</section>
    <section><h3 class="label">Points</h3>${leaderboard(winId)}</section>
    <button class="start" data-a="next">${T.done ? "Crown the champion" : "Back to bracket"}</button>`;
  show("payout");
}
bind("payout", () => T.done ? renderFinal() : renderBracket());

function renderFinal() {
  const champ = P(T.champ), top = T.players.slice().sort((a, b) => b.pts - a.pts)[0];
  fanfare();
  $("#final").innerHTML = `${header("Final results")}
    <section class="hero"><p class="eyebrow">Tournament champion</p><h2 class="huge">${esc(champ.name)}</h2>
      <p class="eyebrow">Top of the points board</p><h3 class="mid">${esc(top.name)} · ${top.pts} pts</h3></section>
    <section><h3 class="label">Final points</h3>${leaderboard(top.id)}</section>
    <button class="start" data-a="again">Rematch with the same players</button>
    <button class="btn big" data-a="home">Back to menu</button>`;
  show("final");
}
bind("final", a => {
  if (a === "again") return newTournament(T.players.map(p => p.name), T.bestOf, T.cats);
  renderHome();
});

/* ================= QUICK DUEL ================= */
function renderQuick() {
  $("#quick").innerHTML = `${header("Quick duel")}
    <section><h3 class="label">Players</h3><div class="teams">
      <label class="team blue"><span class="where">Top side</span><input id="qn2" maxlength="14" autocomplete="off" value="${esc(CFG.quickNames[1])}"></label>
      <label class="team red"><span class="where">Bottom side</span><input id="qn1" maxlength="14" autocomplete="off" value="${esc(CFG.quickNames[0])}"></label>
    </div></section>
    <section><h3 class="label">First to</h3><div class="seg">${[3, 5, 7].map(n => `<button data-a="need" data-v="${n}" role="radio" aria-checked="${CFG.quickNeed === n}">${n}</button>`).join("")}</div></section>
    <p class="note">Uses every game switched on in the library.</p>
    <button class="start" data-a="go">Start duel</button>`;
  show("quick");
  $("#qn1").addEventListener("input", e => { CFG.quickNames[0] = cleanName(e.target.value) || "Red"; saveCfg(); });
  $("#qn2").addEventListener("input", e => { CFG.quickNames[1] = cleanName(e.target.value) || "Blue"; saveCfg(); });
}
const QB = { bag: [], last: null };
function runQuick() {
  const ids = GAMES.filter(g => !CFG.off.includes(g.id)).map(g => g.id);
  QB.bag = [];
  startDuel({
    names: CFG.quickNames.slice(), need: CFG.quickNeed,
    next: () => bagNext(QB, ids.length ? ids : GAMES.map(g => g.id)),
    endActions: [{ label: "Rematch", act: "again", primary: true }, { label: "Menu", act: "menu" }],
    onAction: act => act === "again" ? runQuick() : renderHome(),
    onQuit: () => renderHome()
  });
}
bind("quick", (a, b) => {
  if (a === "home") return renderHome();
  if (a === "need") { CFG.quickNeed = +b.dataset.v; saveCfg(); return renderQuick(); }
  if (a === "go") { audio(); runQuick(); }
});

/* ================= GAME LIBRARY ================= */
function renderLibrary() {
  const on = GAMES.length - CFG.off.length;
  $("#library").innerHTML = `${header("Game library")}
    <p class="note">${on} of ${GAMES.length} games are on. Switched-off games never come up. Tap Try to play one right now.</p>
    ${Object.entries(CATS).map(([k, v]) => `<section><h3 class="label">${v}</h3><ul class="glist">${GAMES.filter(g => g.cat === k).map(g => `<li>
      <div class="gtxt"><b>${g.name}</b><span>${g.rule}</span></div>
      <div class="gact"><button class="sw" data-a="toggle" data-id="${g.id}" aria-pressed="${!CFG.off.includes(g.id)}" aria-label="${g.name} on or off"><i></i></button><button class="btn small" data-a="try" data-id="${g.id}">Try</button></div>
    </li>`).join("")}</ul></section>`).join("")}`;
  show("library");
}
function tryGame(g) {
  startDuel({
    names: ["Red", "Blue"], need: 1, next: () => g,
    endActions: [{ label: "Play again", act: "again", primary: true }, { label: "Library", act: "lib" }],
    onAction: act => act === "again" ? tryGame(g) : renderLibrary(),
    onQuit: () => renderLibrary()
  });
}
bind("library", (a, b) => {
  if (a === "home") return renderHome();
  const id = b.dataset.id;
  if (a === "toggle") {
    CFG.off = CFG.off.includes(id) ? CFG.off.filter(x => x !== id) : [...CFG.off, id]; saveCfg();
    b.setAttribute("aria-pressed", String(!CFG.off.includes(id)));
    $("#library .note").textContent = `${GAMES.length - CFG.off.length} of ${GAMES.length} games are on. Switched-off games never come up. Tap Try to play one right now.`;
  }
  if (a === "try") { audio(); tryGame(gameById(id)); }
});

renderHome();
