"use strict";
/* Duel engine: split screen, rounds, shared mini-game helpers, judging and the real-life challenge screen. */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const rand = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const now = () => performance.now();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const big = (t, c = "") => `<div class="big ${c}">${t}</div>`;
const choices = (opts, cls = "") => `<div class="choices ${cls}">${opts.map((o, i) => `<button class="ch" data-c="${i}">${o}</button>`).join("")}</div>`;
function mc(right, wrongs) { const opts = shuffle([right, ...wrongs.slice(0, 3)]); return { opts, ans: opts.indexOf(right) }; }

/* ---------- Sound, buzz, screen wake ---------- */
const SOUND = { on: true };
let AC = null;
function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
function beep(f = 660, d = 0.08, type = "square", vol = 0.05) {
  if (!SOUND.on || !AC) return;
  try {
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  } catch (e) {}
}
const fanfare = () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.12), i * 110));
const bad = () => beep(150, 0.16, "sawtooth", 0.04);
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
let wake = null;
async function keepAwake() { try { wake = await navigator.wakeLock.request("screen"); } catch (e) { wake = null; } }
function releaseAwake() { try { wake && wake.release(); } catch (e) {} wake = null; }

/* ---------- Duel state ---------- */
// Player 0 sits at the bottom (red). Player 1 sits at the top (blue); their half is rotated to face them.
const D = { cfg: null, score: [0, 0], round: 0, phase: "idle", ready: [false, false], R: null, game: null, timer: null, lockUntil: 0, chal: null };
const name = p => esc(D.cfg ? D.cfg.names[p] : (p ? "Blue" : "Red"));

const halves = [$(".half.p1"), $(".half.p2")];
const stage = halves.map(h => h.querySelector(".stage"));
const statusEl = halves.map(h => h.querySelector(".status"));
const miniEl = halves.map(h => h.querySelector(".mini"));
const ov = $("#ov");
const active = [new Set(), new Set()];
const owner = new Map();

function setSplit(pos) { halves[0].style.flexGrow = 1 + pos; halves[1].style.flexGrow = 1 - pos; }
function shake(p) { const s = stage[p]; s.classList.remove("shake"); void s.offsetWidth; s.classList.add("shake"); }
// Pointer position inside an element, in the player's own (possibly rotated) frame.
function local(p, el, e) {
  const r = el.getBoundingClientRect();
  let x = e.clientX - r.left, y = e.clientY - r.top;
  if (p === 1) { x = r.width - x; y = r.height - y; }
  return { x, y, w: r.width, h: r.height };
}

halves.forEach((h, p) => {
  h.addEventListener("pointerdown", e => {
    e.preventDefault();
    owner.set(e.pointerId, p); active[p].add(e.pointerId);
    try { h.setPointerCapture(e.pointerId); } catch (err) {}
    onDown(p, e);
  });
  h.addEventListener("pointermove", e => {
    if (owner.get(e.pointerId) !== p) return;
    if (D.phase === "play" && D.R && D.R.move) D.R.move(p, e);
  });
});
function onPointerUp(e) {
  const p = owner.get(e.pointerId);
  if (p == null) return;
  owner.delete(e.pointerId); active[p].delete(e.pointerId);
  if (D.phase === "play" && D.R && D.R.up) D.R.up(p, e);
}
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerUp);
document.addEventListener("contextmenu", e => { if (!$("#game").hidden) e.preventDefault(); });

function onDown(p, e) {
  if (now() < D.lockUntil) return;
  if (D.phase === "intro") {
    if (D.ready[p]) return;
    D.ready[p] = true; beep(520, 0.06); renderIntro(p);
    if (D.ready[0] && D.ready[1]) getSet();
  } else if (D.phase === "play") {
    D.R && D.R.down && D.R.down(p, e);
  } else if (D.phase === "over") {
    const a = e.target.closest("[data-act]");
    if (a) D.cfg.onAction(a.dataset.act, D.winner);
  }
}

/* ---------- Round object handed to each mini-game ---------- */
function newRound(g) {
  const R = { g, dead: false, timers: [], down: null, up: null, move: null };
  R.after = (ms, fn) => { R.timers.push(setTimeout(() => { if (!R.dead) fn(); }, ms)); };
  R.frame = fn => { const loop = () => { if (R.dead) return; fn(); if (!R.dead) requestAnimationFrame(loop); }; requestAnimationFrame(loop); };
  R.set = (p, html) => { stage[p].innerHTML = html; };
  R.both = html => { R.set(0, html); R.set(1, html); };
  R.q = (p, sel) => stage[p].querySelector(sel);
  R.qa = (p, sel) => [...stage[p].querySelectorAll(sel)];
  R.mini = fn => { for (const p of [0, 1]) miniEl[p].innerHTML = fn ? fn(p) : ""; };
  R.ov = html => { ov.innerHTML = html; };
  R.onDown = f => { R.down = f; };
  R.onUp = f => { R.up = f; };
  R.onMove = f => { R.move = f; };
  R.held = p => active[p].size;
  R.win = (p, m) => finish(R, p, m);
  R.foul = (p, m) => finish(R, 1 - p, m);
  R.draw = m => finish(R, null, m);
  R.judge = (q, opts, cb) => judge(q, opts, i => { if (!R.dead) cb(i); });
  R.kill = () => {
    if (R.dead) return;
    R.dead = true; R.timers.forEach(clearTimeout);
    ov.innerHTML = ""; hideJudge(); setSplit(0);
    try { g.cleanup && g.cleanup(R); } catch (e) {}
  };
  return R;
}

/* ---------- Duel flow ---------- */
function later(ms, fn) { clearTimeout(D.timer); D.timer = setTimeout(fn, ms); }

// cfg: { names:[bottom, top], need, next() -> game, endActions:[{label, act, primary}], onAction(act, winner), onQuit() }
function startDuel(cfg) {
  stopAll();
  D.cfg = cfg; D.score = [0, 0]; D.round = 0; D.winner = null;
  $$(".screen").forEach(s => { s.hidden = true; });
  $("#pause").hidden = true; $("#game").hidden = false;
  keepAwake(); nextGame();
}
function nextGame() { D.game = D.cfg.next(); D.round++; intro(); }

function renderStatus() {
  const goal = D.cfg.need === 1 ? "one game" : `first to ${D.cfg.need}`;
  for (const p of [0, 1]) statusEl[p].innerHTML = `<span class="me">${name(p)}<b>${D.score[p]}</b></span><span class="goal">${goal}</span><span class="them"><b>${D.score[1 - p]}</b>${name(1 - p)}</span>`;
}

function intro() {
  stopAll();
  halves.forEach(h => h.classList.remove("flash"));
  stage.forEach(s => s.classList.remove("shake"));
  miniEl.forEach(m => { m.innerHTML = ""; });
  renderStatus();
  if (D.game.irl) return showChallenge();
  D.phase = "intro"; D.ready = [false, false]; D.lockUntil = now() + 650;
  renderIntro(0); renderIntro(1);
}
function renderIntro(p) {
  const g = D.game, r = D.ready[p];
  stage[p].innerHTML = `<p class="eyebrow">Game ${D.round} · ${CATS[g.cat]}</p><h2 class="gname">${g.name}</h2><p class="rule">${g.rule}</p><div class="ready ${r ? "done" : ""}">${r ? `Waiting for ${name(1 - p)}…` : "Tap when ready"}</div>`;
}
function getSet() {
  D.phase = "getset";
  for (const p of [0, 1]) stage[p].innerHTML = big("Get set…", "muted");
  later(800, () => {
    D.phase = "play"; D.R = newRound(D.game);
    try { D.game.start(D.R); } catch (err) { console.error(err); D.R.draw({ draw: "That game hit a snag. Skipping it." }); }
  });
}

function finish(R, w, m = {}) {
  if (R.dead) return;
  R.kill(); D.R = null; D.phase = "result";
  if (w != null) D.score[w]++;
  renderStatus();
  const win = m.win || "Point to you.", lose = m.lose || (w != null ? `${name(w)} takes it.` : "");
  for (const p of [0, 1]) {
    if (w == null) stage[p].innerHTML = `<p class="eyebrow">${R.g.name}</p>${big("Tie")}<p class="rule">${m.draw || "Nobody scores."}</p>`;
    else if (p === w) stage[p].innerHTML = `<p class="eyebrow">${R.g.name}</p>${big("Point!", "go")}<p class="rule">${win}</p>`;
    else stage[p].innerHTML = `<p class="eyebrow">${R.g.name}</p>${big("Nope", "muted")}<p class="rule">${lose}</p>`;
  }
  if (w != null) { halves[w].classList.remove("flash"); void halves[w].offsetWidth; halves[w].classList.add("flash"); beep(784, 0.1); setTimeout(() => beep(1046, 0.14), 100); buzz(50); }
  else beep(440, 0.12, "triangle");
  later(2300, () => (w != null && D.score[w] >= D.cfg.need) ? duelOver(w) : nextGame());
}

function duelOver(w) {
  D.phase = "over"; D.winner = w; D.lockUntil = now() + 900; fanfare(); buzz([60, 40, 60]);
  miniEl.forEach(m => { m.innerHTML = ""; });
  const l = 1 - w, line = `${D.score[w]} – ${D.score[l]}`;
  const acts = `<div class="acts">${D.cfg.endActions.map(a => `<button class="${a.primary ? "primary" : "ghost"}" data-act="${a.act}">${a.label}</button>`).join("")}</div>`;
  stage[w].innerHTML = `<p class="eyebrow">Duel over · ${line}</p>${big("You win!", "go")}<p class="rule">${name(w)} takes the duel.</p>${acts}`;
  stage[l].innerHTML = `<p class="eyebrow">Duel over · ${line}</p>${big("So close", "muted")}<p class="rule">${name(w)} takes this one.</p>${acts}`;
  halves[w].classList.add("flash");
}

function stopAll() {
  clearTimeout(D.timer);
  if (D.R) { D.R.kill(); D.R = null; }
  setSplit(0); ov.innerHTML = ""; hideJudge();
  stopChalTimer(); $("#chal").hidden = true;
}
function exitGame() {
  stopAll(); D.phase = "idle"; releaseAwake();
  active.forEach(a => a.clear()); owner.clear();
  $("#pause").hidden = true; $("#game").hidden = true;
}

$("#pauseBtn").addEventListener("click", () => {
  if (D.phase === "over" || D.phase === "idle") return;
  stopAll(); D.phase = "paused"; $("#pause").hidden = false;
});
$("#resume").addEventListener("click", () => { $("#pause").hidden = true; intro(); });
$("#skip").addEventListener("click", () => { $("#pause").hidden = true; nextGame(); });
$("#quit").addEventListener("click", () => { const cb = D.cfg && D.cfg.onQuit; exitGame(); cb && cb(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && !$("#game").hidden) keepAwake(); });

/* ---------- Judge panel (upright, for the host or crowd) ---------- */
let judgeCb = null;
function judge(q, opts, cb) {
  judgeCb = cb;
  $("#judge").innerHTML = `<div class="box"><p class="eyebrow">Crowd decides</p><h3>${q}</h3>${opts.map((o, i) => typeof o === "string" ? `<button class="jb ${i ? "ghost" : "solid"}" data-j="${i}">${o}</button>` : `<button class="jb ${o.c}" data-j="${i}">${o.t}</button>`).join("")}</div>`;
  $("#judge").hidden = false;
}
function hideJudge() { $("#judge").hidden = true; judgeCb = null; }
$("#judge").addEventListener("click", e => {
  const b = e.target.closest("[data-j]"); if (!b || !judgeCb) return;
  const cb = judgeCb; hideJudge(); cb(+b.dataset.j);
});

/* ---------- Real-life challenge screen ---------- */
function stopChalTimer() { if (D.chal && D.chal.iv) { clearInterval(D.chal.iv); D.chal.iv = null; } }
function fmtTime(s) { return s >= 60 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : s.toFixed(1); }
function showChallenge() {
  const g = D.game;
  D.phase = "irl"; D.R = newRound(g);
  const prompt = g.prompts ? pick(g.prompts) : null;
  let secrets = null;
  if (g.secrets) { const s = shuffle(g.secrets); secrets = [s[0], s[1]]; }
  D.chal = { t: g.timer && g.timer.down ? g.timer.down : 0, run: false, iv: null, last: 0, secrets };
  const timer = g.timer ? `<div class="ctimer"><div class="tval" id="tval">${fmtTime(D.chal.t)}</div><div class="trow"><button class="btn" data-c="go">Start</button><button class="btn ghost" data-c="reset">Reset</button></div></div>` : "";
  const sec = secrets ? `<div class="peeks">${[0, 1].map(p => `<button class="peek ${p ? "blue" : "red"}" data-peek="${p}"><span class="pk-label">${name(p)}: hold to see your secret</span><span class="pk-secret" hidden>${esc(secrets[p])}</span></button>`).join("")}</div><p class="hint">Everyone else, look away while they peek.</p>` : "";
  $("#chal").innerHTML = `<div class="cwrap">
    <div class="ctop"><p class="eyebrow">Game ${D.round} · Real-life challenge</p><button class="btn ghost small" data-c="pause">Pause</button></div>
    <h2 class="cname">${g.name}</h2>
    <p class="cvs"><span class="red-t">${name(0)}</span> vs <span class="blue-t">${name(1)}</span></p>
    <p class="crule">${g.rule}</p>
    ${prompt ? `<div class="cprompt">${esc(prompt)}</div>` : ""}
    ${sec}${timer}
    <h3 class="label">Who won?</h3>
    <div class="who"><button class="jb red" data-c="w0">${name(0)}</button><button class="jb blue" data-c="w1">${name(1)}</button></div>
    <button class="btn ghost" data-c="tie">Call it a tie</button>
  </div>`;
  $("#chal").hidden = false; $("#chal").scrollTop = 0;
}
function chalTick() {
  const c = D.chal, t = now(), dt = (t - c.last) / 1000; c.last = t;
  const g = D.game;
  if (g.timer.down) { c.t = Math.max(0, c.t - dt); if (c.t === 0) { stopChalTimer(); c.run = false; beep(880, 0.4, "square", 0.06); buzz(300); const b = $('#chal [data-c="go"]'); if (b) b.textContent = "Start"; } }
  else c.t += dt;
  const el = $("#tval"); if (el) el.textContent = fmtTime(c.t);
}
$("#chal").addEventListener("click", e => {
  const b = e.target.closest("[data-c]"); if (!b || D.phase !== "irl") return;
  const a = b.dataset.c, c = D.chal;
  if (a === "go") {
    if (c.run) { stopChalTimer(); c.run = false; b.textContent = "Start"; }
    else { c.run = true; c.last = now(); c.iv = setInterval(chalTick, 100); b.textContent = "Stop"; beep(660, 0.08); }
  } else if (a === "reset") {
    stopChalTimer(); c.run = false; c.t = D.game.timer.down || 0; $("#tval").textContent = fmtTime(c.t);
    const go = $('#chal [data-c="go"]'); if (go) go.textContent = "Start";
  } else if (a === "pause") {
    stopAll(); D.phase = "paused"; $("#pause").hidden = false;
  } else if (a === "w0" || a === "w1" || a === "tie") {
    stopChalTimer(); $("#chal").hidden = true; D.phase = "play";
    const R = D.R;
    if (a === "tie") finish(R, null, { draw: "Called a tie." });
    else { const w = +a[1]; finish(R, w, { win: "The crowd gave it to you.", lose: `The crowd gave it to ${name(w)}.` }); }
  }
});
const peekShow = (e, on) => {
  const b = e.target.closest("[data-peek]"); if (!b) return;
  b.querySelector(".pk-secret").hidden = !on; b.querySelector(".pk-label").hidden = on;
};
$("#chal").addEventListener("pointerdown", e => peekShow(e, true));
["pointerup", "pointercancel", "pointerleave"].forEach(t => $("#chal").addEventListener(t, e => {
  $$("#chal [data-peek]").forEach(b => { b.querySelector(".pk-secret").hidden = true; b.querySelector(".pk-label").hidden = false; });
}, true));

/* ---------- Shared mini-game helpers ---------- */

// Score race inside one mini-game. add() returns true when someone has won.
function race(R, n) {
  const pts = [0, 0];
  const show = () => R.mini(p => `You <b>${pts[p]}</b> · ${name(1 - p)} <b>${pts[1 - p]}</b> · first to ${n}`);
  const check = () => { for (const p of [0, 1]) if (pts[p] >= n && pts[p] > pts[1 - p]) { R.win(p); return true; } return false; };
  show();
  return {
    pts,
    add(p, k = 1) { pts[p] = Math.max(0, pts[p] + k); show(); return check(); },
    addMany(d) { d.forEach((k, p) => { pts[p] = Math.max(0, pts[p] + k); }); show(); return check(); }
  };
}

// "Tap only when it's a match" stream of flashing items.
function stream(R, o) {
  let cur = null, prev = null, changed = 0, ms = o.startMs, since = 0;
  const step = () => {
    prev = cur; changed = now();
    const want = since >= 6 || (since >= 2 && Math.random() < 0.33);
    cur = o.gen(want, prev);
    since = cur.match ? 0 : since + 1;
    R.both(o.render(cur));
    ms = Math.max(o.minMs, ms - 40);
    R.after(ms, step);
  };
  R.both(big("Watch…", "muted"));
  R.after(600, step);
  R.onDown(p => {
    if (!cur) return;
    if (cur.match || (prev && prev.match && now() - changed < 220)) R.win(p, o.win(p));
    else R.foul(p, o.foul(p));
  });
}

// Multiple-choice race: first correct tap scores; a wrong tap locks you out of that question.
function quiz(R, o) {
  const sc = race(R, o.n || 3);
  let q, locked, settled;
  const ask = () => { q = o.next(); locked = [false, false]; settled = false; R.both(`${q.prompt}${choices(q.opts, q.cls || "")}`); };
  R.onDown((p, e) => {
    const b = e.target.closest("[data-c]");
    if (!b || locked[p] || settled) return;
    const i = +b.dataset.c;
    if (i === q.ans) {
      settled = true;
      for (const s of [0, 1]) { const el = R.q(s, `[data-c="${i}"]`); el && el.classList.add("right"); }
      beep(880, 0.06);
      if (!sc.add(p)) R.after(850, ask);
    } else {
      locked[p] = true; b.classList.add("bad"); bad(); buzz(40);
      if (o.penalty) sc.add(p, -1);
      if (locked[0] && locked[1]) {
        settled = true;
        for (const s of [0, 1]) { const el = R.q(s, `[data-c="${q.ans}"]`); el && el.classList.add("right"); }
        R.after(1200, ask);
      }
    }
  });
  ask();
}

// Number keypad drawn into one player's half.
function keypad(R, p, o) {
  let v = "";
  R.set(p, `${o.top || ""}<p class="hint q">${o.prompt}</p><div class="kp"><div class="kp-show">–</div><div class="kp-grid">${"123456789".split("").map(d => `<button data-k="${d}">${d}</button>`).join("")}<button data-k="del" aria-label="Delete">⌫</button><button data-k="0">0</button><button data-k="ok" class="ok">OK</button></div></div>`);
  const show = R.q(p, ".kp-show");
  return {
    down(e) {
      const b = e.target.closest("[data-k]"); if (!b) return;
      const k = b.dataset.k;
      if (k === "del") v = v.slice(0, -1);
      else if (k === "ok") { if (v !== "") o.onSubmit(v); return; }
      else if (v.length < (o.max || 6)) v = (v === "0" ? "" : v) + k;
      show.textContent = v === "" ? "–" : v; beep(420, 0.02, "sine", 0.03);
    }
  };
}

// Closest-number guessing rounds. next() -> { q, a, unit?, max?, intro?(done) }
function guessGame(R, o) {
  const sc = race(R, o.n || 2);
  let kp = [null, null], g = [null, null], cur;
  const ask = () => {
    cur = o.next(); g = [null, null]; kp = [null, null];
    const go = () => {
      for (const p of [0, 1]) kp[p] = keypad(R, p, { prompt: cur.q, max: cur.max || 6, onSubmit(v) {
        g[p] = +v; kp[p] = null;
        R.set(p, `${big("Locked", "muted")}<p class="hint">You said ${+v}${cur.unit || ""}. Waiting for ${name(1 - p)}…</p>`);
        beep(600, 0.05);
        if (g[0] != null && g[1] != null) reveal();
      } });
    };
    cur.intro ? cur.intro(go) : go();
  };
  const reveal = () => {
    const d = g.map(x => Math.abs(x - cur.a));
    const w = d[0] === d[1] ? null : (d[0] < d[1] ? 0 : 1);
    for (const p of [0, 1]) R.set(p, `<p class="hint">${cur.q}</p><div class="card sum">${cur.a}${cur.unit || ""}</div><p class="rule">You ${g[p]} · ${name(1 - p)} ${g[1 - p]}</p><p class="verdict">${w == null ? "Same distance. No point." : w === p ? "Closer! Point to you." : "They were closer."}</p>`);
    if (w != null) beep(w === 0 ? 700 : 600, 0.08);
    R.after(2900, () => { if (w == null || !sc.add(w)) ask(); });
  };
  R.onDown((p, e) => { kp[p] && kp[p].down(e); });
  ask();
}

// Secret simultaneous picks. Players shield their half with a hand.
function secretPick(R, o) {
  const sc = race(R, o.n || 3);
  let picks;
  const round = () => {
    picks = [null, null];
    for (const p of [0, 1]) R.set(p, `${o.top ? o.top(p) : ""}<p class="hint">${o.ask}</p>${choices(o.labels, o.cls || "")}<p class="hint small">Cover the screen with your hand.</p>`);
  };
  R.onDown((p, e) => {
    if (picks[p] != null) return;
    const b = e.target.closest("[data-c]"); if (!b) return;
    picks[p] = +b.dataset.c; beep(520, 0.05);
    R.set(p, `${big("Locked", "muted")}<p class="hint">Waiting for ${name(1 - p)}…</p>`);
    if (picks[0] != null && picks[1] != null) {
      const w = o.resolve(picks[0], picks[1]);
      for (const q of [0, 1]) R.set(q, `<div class="reveal"><div><p class="eyebrow">You</p><div class="card pickc">${o.show(picks[q])}</div></div><div><p class="eyebrow">${name(1 - q)}</p><div class="card pickc">${o.show(picks[1 - q])}</div></div></div><p class="verdict">${w == null ? "No point." : w === q ? "Your point!" : "Their point."}</p>${o.note ? `<p class="hint">${o.note(picks, q, w)}</p>` : ""}`);
      if (w != null) beep(820, 0.08);
      R.after(2000, () => { if (w == null || !sc.add(w)) round(); });
    }
  });
  round();
}

// Alternating turns with a shrinking timer. The other player can challenge a bad answer.
function turns(R, o) {
  let cur = Math.random() < 0.5 ? 0 : 1, sec = o.sec || 6, deadline = 0, judging = false, left = 0;
  const render = () => {
    for (const p of [0, 1]) R.set(p, `${o.prompt}<div class="tbar"><i></i></div>${p === cur
      ? `<button class="bigbtn" data-a="done">Said it!</button><p class="hint">Say one out loud, then tap</p>`
      : `<p class="hint">${name(cur)} is answering…</p><button class="ghostbtn" data-a="challenge">Bad answer?</button>`}`);
    deadline = now() + sec * 1000;
  };
  render();
  R.frame(() => {
    if (judging) return;
    const l = deadline - now(), f = clamp(l / (sec * 1000), 0, 1);
    for (const p of [0, 1]) { const i = R.q(p, ".tbar i"); if (i) i.style.transform = `scaleX(${f})`; }
    if (l <= 0) R.win(1 - cur, { win: `${name(cur)} ran out of time.`, lose: "Out of time!" });
  });
  R.onDown((p, e) => {
    const a = e.target.closest("[data-a]"); if (!a || judging) return;
    if (a.dataset.a === "done" && p === cur) { cur = 1 - cur; sec = Math.max(3, sec - 0.25); beep(600, 0.04); render(); }
    else if (a.dataset.a === "challenge" && p !== cur) {
      judging = true; left = deadline - now();
      R.judge(`Was ${name(cur)}'s answer bad?`, [`Yes. ${name(p)} wins`, "No. Keep going"], i => {
        if (i === 0) R.win(p, { win: "Challenge upheld.", lose: "The crowd ruled against you." });
        else { judging = false; deadline = now() + left; }
      });
    }
  });
}
