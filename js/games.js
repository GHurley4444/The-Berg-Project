"use strict";
/* All mini-games. Phone games get start(R). Real-life challenges (irl:true) are shown on an upright card and judged by the crowd. */

const CATS = { reflex: "Reflex", speed: "Speed", memory: "Memory", guess: "Guessing", bluff: "Bluff & mind games", brain: "Brain", word: "Words & drawing", irl: "Real-life challenge" };
const ARROWS = { up: "↑", down: "↓", left: "←", right: "→" };
const CARD = v => ({ 1: "A", 11: "J", 12: "Q", 13: "K" }[v] || String(v));

const GAMES = [
/* ================= REFLEX ================= */
{ id: "draw", cat: "reflex", name: "Quick Draw", rule: "Wait for GO, then tap first. Tap early, or on a fake word, and you lose.",
  start(R) {
    let armed = false;
    R.both(big("Wait…", "muted"));
    const go = () => { armed = true; R.both(big("GO!", "go")); beep(880, 0.12); };
    const next = () => {
      if (Math.random() < 0.4) {
        R.both(big(pick(["NO!", "GOLD", "WAIT", "SLOW", "GOAT"]), "fake")); beep(330, 0.06);
        R.after(750, () => { R.both(big("Wait…", "muted")); R.after(rand(700, 2400), next); });
      } else go();
    };
    R.after(rand(1500, 4200), next);
    R.onDown(p => armed
      ? R.win(p, { win: "Fastest finger.", lose: `${name(p)} was quicker.` })
      : R.foul(p, { win: `${name(p)} jumped the gun.`, lose: "Too early!" }));
  } },

{ id: "letgo", cat: "reflex", name: "Let Go", rule: "Both press and hold. When LET GO appears, lift your finger first. Let go early and you lose.",
  start(R) {
    let phase = "wait";
    const render = () => {
      for (const p of [0, 1]) {
        const holding = R.held(p) > 0;
        const t = phase === "go" ? big("LET GO!", "go") : holding ? big("Hold…") : big("Press &amp; hold", "muted");
        const h = phase === "go" ? "Lift your finger!" : phase === "hold" ? "Keep holding…" : holding ? "Waiting for both players" : "Put a finger down and keep it there";
        R.set(p, `${t}<p class="hint">${h}</p>`);
      }
    };
    const arm = () => { if (phase === "wait" && R.held(0) && R.held(1)) { phase = "hold"; R.after(rand(2000, 6000), () => { phase = "go"; render(); beep(880, 0.15); buzz(40); }); } };
    render(); arm();
    R.onDown(() => { arm(); if (phase !== "go") render(); });
    R.onUp(p => {
      if (R.held(p)) return;
      if (phase === "go") R.win(p, { win: "Quickest release.", lose: `${name(p)} let go first.` });
      else if (phase === "hold") R.foul(p, { win: `${name(p)} let go too early.`, lose: "You let go too early!" });
      else render();
    });
  } },

{ id: "color", cat: "reflex", name: "Color Clash", rule: "Words flash up in colored ink. Tap only when the ink matches the word.",
  start(R) {
    stream(R, { startMs: 1150, minMs: 720,
      gen(want) { const w = pick(COLORS); const ink = want ? w : pick(COLORS.filter(c => c !== w)); return { match: want, w: w[0], ink: ink[1] }; },
      render: c => `<div class="card" style="color:${c.ink}">${c.w}</div><p class="hint">Tap when the ink matches the word</p>`,
      win: p => ({ win: "Sharp eyes.", lose: `${name(p)} saw it first.` }),
      foul: p => ({ win: `${name(p)} tapped a mismatch.`, lose: "Wrong! The ink didn't match." }) });
  } },

{ id: "snap", cat: "reflex", name: "Snap", rule: "Pictures flash one after another. Tap when the same picture shows twice in a row.",
  start(R) {
    stream(R, { startMs: 950, minMs: 620,
      gen(want, prev) { if (want && prev) return { match: true, e: prev.e }; return { match: false, e: pick(EMOJI.filter(e => !prev || e !== prev.e)) }; },
      render: c => `<div class="card emoji">${c.e}</div><p class="hint">Tap on a double</p>`,
      win: p => ({ win: "Snap!", lose: `${name(p)} snapped first.` }),
      foul: p => ({ win: `${name(p)} snapped too soon.`, lose: "Not a double!" }) });
  } },

{ id: "traffic", cat: "reflex", name: "Green Light", rule: "The light keeps changing. Tap the moment it turns green. Tapping on red or yellow loses.",
  start(R) {
    stream(R, { startMs: 1000, minMs: 600,
      gen(want, prev) { if (want) return { match: true, c: "g" }; return { match: false, c: pick(["r", "y"].filter(x => !prev || x !== prev.c)) }; },
      render: c => `<div class="light">${["r", "y", "g"].map(k => `<i class="${k} ${c.c === k ? "on" : ""}"></i>`).join("")}</div><p class="hint">Tap on green</p>`,
      win: p => ({ win: "Off the line first.", lose: `${name(p)} went first.` }),
      foul: p => ({ win: `${name(p)} ran the light.`, lose: "That wasn't green!" }) });
  } },

{ id: "pong", cat: "reflex", name: "Ping Pong", rule: "Tap to hit the ball back when it's inside your zone. Miss it and you lose. It speeds up every hit.",
  start(R) {
    const ZONE = 0.18;
    let y = 0.5, dir = Math.random() < 0.5 ? -1 : 1, speed = 0.42, x = 0.5, dx = rand(-0.3, 0.3), last = now();
    const lock = [0, 0];
    R.both(`<p class="hint">Tap when the ball is in your striped zone</p>`);
    R.ov(`<div class="zone z0"></div><div class="zone z1"></div><div class="ball"></div>`);
    const ball = ov.querySelector(".ball");
    R.frame(() => {
      const t = now(), dt = Math.min(0.05, (t - last) / 1000); last = t;
      y += dir * speed * dt; x += dx * dt;
      if (x < 0.06 || x > 0.94) { dx = -dx; x = clamp(x, 0.06, 0.94); }
      ball.style.top = `${(1 - y) * 100}%`; ball.style.left = `${x * 100}%`;
      if (y <= 0) R.win(1, { win: `${name(0)} missed it.`, lose: "Missed it!" });
      else if (y >= 1) R.win(0, { win: `${name(1)} missed it.`, lose: "Missed it!" });
    });
    R.onDown(p => {
      if (now() < lock[p]) return;
      const inZone = p === 0 ? (y < ZONE && dir < 0) : (y > 1 - ZONE && dir > 0);
      if (inZone) { dir = -dir; speed *= 1.1; dx = rand(-0.5, 0.5); beep(400 + speed * 300, 0.04); }
      else lock[p] = now() + 350;
    });
  } },

{ id: "bullseye", cat: "reflex", name: "Bullseye", rule: "A marker slides back and forth. Tap to stop it as close to the middle as you can. Three shots each, best total wins.",
  start(R) {
    const N = 3, shots = [[], []], ph = [0, 0], pos = [0.5, 0.5], w = [2.6, 2.6];
    let last = now();
    R.both(`<p class="hint">Stop it in the middle</p><div class="bar"><i class="mid"></i><b class="mk"></b></div><p class="shots">Shots left: ${N}</p>`);
    const mk = [0, 1].map(p => R.q(p, ".mk")), bar = [0, 1].map(p => R.q(p, ".bar")), txt = [0, 1].map(p => R.q(p, ".shots"));
    const score = d => Math.round(100 - d * 200);
    const total = p => shots[p].reduce((a, d) => a + score(d), 0);
    const done = () => {
      const t = [total(0), total(1)];
      if (t[0] === t[1]) return R.draw({ draw: `Both scored ${t[0]}.` });
      const win = t[0] > t[1] ? 0 : 1;
      R.win(win, { win: `${t[win]} to ${t[1 - win]}.`, lose: `${t[1 - win]} to ${t[win]}.` });
    };
    R.frame(() => {
      const t = now(), dt = Math.min(0.05, (t - last) / 1000); last = t;
      for (const p of [0, 1]) if (shots[p].length < N) { ph[p] += dt * w[p]; pos[p] = (Math.sin(ph[p]) + 1) / 2; mk[p].style.left = `${pos[p] * 100}%`; }
    });
    R.onDown(p => {
      if (shots[p].length >= N) return;
      const d = Math.abs(pos[p] - 0.5); shots[p].push(d); w[p] += 0.7;
      const tick = document.createElement("s"); tick.style.left = `${pos[p] * 100}%`; bar[p].appendChild(tick);
      txt[p].textContent = `${shots[p].map(score).join(" + ")} = ${total(p)}${shots[p].length < N ? ` · ${N - shots[p].length} left` : ""}`;
      beep(500 + (1 - d * 2) * 600, 0.06);
      if (shots[0].length >= N && shots[1].length >= N) R.after(700, done);
    });
  } },

{ id: "odd", cat: "reflex", name: "Odd One Out", rule: "One picture in the grid is different. Tap it first. A wrong tap freezes you for a second.",
  start(R) {
    let [a, b] = pick(ODD_PAIRS); if (Math.random() < 0.5) [a, b] = [b, a];
    const n = 15, odd = ri(0, n - 1), frozen = [0, 0];
    R.both(`<div class="grid5">${Array.from({ length: n }, (_, i) => `<div class="cell" data-i="${i}">${i === odd ? b : a}</div>`).join("")}</div><p class="hint">Find the odd one out</p>`);
    R.onDown((p, e) => {
      const c = e.target.closest(".cell");
      if (!c || now() < frozen[p]) return;
      if (+c.dataset.i === odd) return R.win(p, { win: "Eagle eyes.", lose: `${name(p)} spotted it first.` });
      frozen[p] = now() + 1000; c.classList.add("wrong"); shake(p); bad(); buzz(60);
    });
  } },

/* ================= SPEED ================= */
{ id: "tug", cat: "speed", name: "Tug of War", rule: "Mash your side to push the yellow line. Shove it all the way across to win.",
  start(R) {
    let pos = 0;
    R.both(`<div class="mash">TAP TAP TAP</div>`);
    R.onDown(p => {
      pos += p === 0 ? 0.045 : -0.045;
      setSplit(pos);
      if (pos >= 0.8) R.win(0, { win: "Pushed them off the table.", lose: "Pushed off the table." });
      else if (pos <= -0.8) R.win(1, { win: "Pushed them off the table.", lose: "Pushed off the table." });
    });
  } },

{ id: "targets", cat: "speed", name: "Target Rush", rule: "Targets pop up on your side. Hit 8 of them before your opponent does.",
  start(R) {
    const N = 8, spots = Array.from({ length: N }, () => ({ x: rand(12, 88), y: rand(14, 80) }));
    const hits = [0, 0];
    const place = p => { const s = spots[hits[p]]; R.set(p, `<div class="field"><button class="target" tabindex="-1" aria-label="Target" style="left:${s.x}%;top:${s.y}%"></button></div><div class="count">${hits[p]} / ${N}</div>`); };
    place(0); place(1);
    R.onDown((p, e) => {
      if (!e.target.closest(".target")) return;
      hits[p]++; beep(600 + hits[p] * 60, 0.05);
      if (hits[p] >= N) R.win(p, { win: "Dead-eye.", lose: `${name(p)} cleared their targets first.` });
      else place(p);
    });
  } },

{ id: "balloon", cat: "speed", name: "Balloon Pump", rule: "Tap as fast as you can to pump up your balloon. First to pop it wins.",
  start(R) {
    const N = 32, c = [0, 0];
    R.both(`<div class="balloon"><i></i></div><p class="hint">Pump! Pump! Pump!</p>`);
    const bl = [0, 1].map(p => R.q(p, ".balloon i"));
    R.onDown(p => {
      c[p]++; bl[p].style.transform = `scale(${0.35 + 0.9 * c[p] / N})`;
      if (c[p] % 4 === 0) beep(300 + c[p] * 15, 0.03, "sine");
      if (c[p] >= N) { bl[p].classList.add("popped"); R.win(p, { win: "POP!", lose: `${name(p)} popped theirs first.` }); }
    });
  } },

{ id: "hunt", cat: "speed", name: "Number Hunt", rule: "Numbers 1 to 12 are scattered on your side. Tap them in order. First to 12 wins.",
  start(R) {
    const N = 12, cells = shuffle([...Array(N)].map((_, i) => i + 1));
    R.both(`<div class="hunt">${cells.map(n => `<button class="hn" data-n="${n}" tabindex="-1" style="transform:translate(${ri(-6, 6)}px,${ri(-6, 6)}px) rotate(${ri(-18, 18)}deg)">${n}</button>`).join("")}</div>`);
    const next = [1, 1], frozen = [0, 0];
    R.mini(p => `Next: <b>${next[p]}</b>`);
    R.onDown((p, e) => {
      const b = e.target.closest(".hn"); if (!b || now() < frozen[p]) return;
      if (+b.dataset.n === next[p]) {
        b.classList.add("done"); next[p]++; beep(500 + next[p] * 40, 0.04);
        R.mini(q => `Next: <b>${next[q] > N ? "done" : next[q]}</b>`);
        if (next[p] > N) R.win(p, { win: "Found them all.", lose: `${name(p)} finished first.` });
      } else if (!b.classList.contains("done")) { frozen[p] = now() + 600; shake(p); bad(); }
    });
  } },

{ id: "swipe", cat: "speed", name: "Swipe Race", rule: "An arrow appears. Swipe that way. Eight correct swipes wins. A wrong swipe freezes you briefly.",
  start(R) {
    const N = 8, seq = [...Array(N)].map(() => pick(Object.keys(ARROWS)));
    const i = [0, 0], st = [null, null], frozen = [0, 0];
    const show = p => R.set(p, `<div class="card arrow">${ARROWS[seq[i[p]]]}</div><p class="hint">Swipe that way · ${i[p]} / ${N}</p>`);
    show(0); show(1);
    R.onDown((p, e) => { st[p] = { x: e.clientX, y: e.clientY }; });
    R.onUp((p, e) => {
      const s = st[p]; if (!s) return; st[p] = null;
      if (now() < frozen[p]) return;
      let dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (p === 1) { dx = -dx; dy = -dy; }
      if (Math.hypot(dx, dy) < 30) return;
      const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      if (d === seq[i[p]]) { i[p]++; beep(500 + i[p] * 50, 0.04); if (i[p] >= N) R.win(p, { win: "Swipe master.", lose: `${name(p)} swiped faster.` }); else show(p); }
      else { frozen[p] = now() + 500; shake(p); bad(); buzz(40); }
    });
  } },

{ id: "mole", cat: "speed", name: "Whack-a-Mole", rule: "Moles pop out of the holes. Whack them for a point. Hit a bomb and lose two. First to 6.",
  start(R) {
    const sc = race(R, 6);
    R.both(`<div class="holes">${[...Array(9)].map((_, i) => `<button class="hole" tabindex="-1" data-h="${i}"></button>`).join("")}</div>`);
    let ms = 800;
    const spawn = () => {
      const free = [...Array(9).keys()].filter(i => !R.q(0, `[data-h="${i}"]`).dataset.t && !R.q(1, `[data-h="${i}"]`).dataset.t);
      if (free.length) {
        const h = pick(free), t = Math.random() < 0.22 ? "bomb" : "mole";
        for (const p of [0, 1]) { const el = R.q(p, `[data-h="${h}"]`); el.dataset.t = t; el.textContent = t === "bomb" ? "💣" : "🐹"; }
        R.after(1000, () => { for (const p of [0, 1]) { const el = R.q(p, `[data-h="${h}"]`); if (el && el.dataset.t === t) { delete el.dataset.t; el.textContent = ""; } } });
      }
      ms = Math.max(420, ms - 15); R.after(ms, spawn);
    };
    R.after(500, spawn);
    R.onDown((p, e) => {
      const b = e.target.closest(".hole"); if (!b || !b.dataset.t) return;
      const t = b.dataset.t; delete b.dataset.t; b.textContent = t === "bomb" ? "💥" : "✨";
      setTimeout(() => { if (!b.dataset.t) b.textContent = ""; }, 250);
      if (t === "bomb") { bad(); buzz(80); sc.add(p, -2); } else { beep(700, 0.04); sc.add(p, 1); }
    });
  } },

{ id: "mathrace", cat: "speed", name: "Math Race", rule: "Solve the sum and tap the right answer first. Wrong answers cost a point. First to 3.",
  start(R) {
    quiz(R, { n: 3, penalty: true, next() {
      const op = pick(["+", "−", "×"]);
      let a = ri(4, 25), b = ri(2, 19);
      if (op === "×") { a = ri(2, 12); b = ri(2, 9); }
      if (op === "−" && b > a) [a, b] = [b, a];
      const r = op === "+" ? a + b : op === "−" ? a - b : a * b;
      const wrong = new Set(); while (wrong.size < 3) { const w = r + pick([-10, -2, -1, 1, 2, 10, op === "×" ? a : 3]); if (w !== r && w >= 0) wrong.add(w); }
      const m = mc(r, [...wrong]);
      return { prompt: `<div class="card sum">${a} ${op} ${b}</div>`, opts: m.opts, ans: m.ans };
    } });
  } },

/* ================= MEMORY ================= */
{ id: "simon", cat: "memory", name: "Copy the Pattern", rule: "Watch the pads light up, then repeat the pattern on your side. It gets longer fast until someone slips.",
  start(R) {
    const TONES = [330, 415, 494, 587];
    let len = 4, seq = [], phase = "show", pos = [0, 0], out = [false, false], done = [false, false];
    const pads = `<div class="pads">${[0, 1, 2, 3].map(i => `<button class="pad c${i}" tabindex="-1" data-pad="${i}"></button>`).join("")}</div>`;
    const light = (i, ps) => {
      for (const q of ps) { const el = R.q(q, `[data-pad="${i}"]`); if (el) { el.classList.add("lit"); setTimeout(() => el.classList.remove("lit"), 300); } }
      beep(TONES[i], 0.18, "sine", 0.06);
    };
    const hint = (p, t) => { const h = R.q(p, ".hint"); if (h) h.textContent = t; };
    const round = () => {
      seq = [...Array(len)].map(() => ri(0, 3)); pos = [0, 0]; out = [false, false]; done = [false, false]; phase = "show";
      R.both(`<p class="hint">Watch · ${len} steps</p>${pads}`);
      let k = 0;
      const flash = () => {
        if (k >= seq.length) { phase = "input"; hint(0, "Your turn. Repeat it."); hint(1, "Your turn. Repeat it."); return; }
        light(seq[k++], [0, 1]); R.after(560, flash);
      };
      R.after(700, flash);
    };
    const check = () => {
      if (!((out[0] || done[0]) && (out[1] || done[1]))) return;
      if (done[0] && !done[1]) return R.win(0, { win: `You lasted longer.`, lose: "You slipped up." });
      if (done[1] && !done[0]) return R.win(1, { win: `You lasted longer.`, lose: "You slipped up." });
      if (done[0] && done[1]) len += 2;
      R.after(900, round);
    };
    R.onDown((p, e) => {
      if (phase !== "input" || out[p] || done[p]) return;
      const b = e.target.closest("[data-pad]"); if (!b) return;
      const i = +b.dataset.pad; light(i, [p]);
      if (i === seq[pos[p]]) { pos[p]++; if (pos[p] >= len) { done[p] = true; hint(p, "Got it! Waiting…"); check(); } }
      else { out[p] = true; hint(p, "Wrong pad!"); shake(p); bad(); check(); }
    });
    round();
  } },

{ id: "mgrid", cat: "memory", name: "Memory Grid", rule: "Some squares light up for a moment. Tap all of them from memory. One wrong square and you're out of that board.",
  start(R) {
    let k = 5, cells, phase, got, out;
    const board = () => {
      cells = new Set(shuffle([...Array(16).keys()]).slice(0, k)); got = [new Set(), new Set()]; out = [false, false]; phase = "show";
      R.both(`<p class="hint">Remember the lit squares</p><div class="mgrid">${[...Array(16).keys()].map(i => `<button class="mg ${cells.has(i) ? "lit" : ""}" tabindex="-1" data-i="${i}"></button>`).join("")}</div>`);
      R.after(1800, () => { phase = "input"; for (const p of [0, 1]) { R.qa(p, ".mg").forEach(el => el.classList.remove("lit")); R.q(p, ".hint").textContent = `Tap all ${k}`; } });
    };
    R.onDown((p, e) => {
      if (phase !== "input" || out[p]) return;
      const b = e.target.closest(".mg"); if (!b) return;
      const i = +b.dataset.i; if (got[p].has(i)) return;
      if (cells.has(i)) { got[p].add(i); b.classList.add("hit"); beep(600 + got[p].size * 50, 0.04); if (got[p].size === k) R.win(p, { win: "Perfect recall.", lose: `${name(p)} remembered them all first.` }); }
      else { b.classList.add("miss"); out[p] = true; R.q(p, ".hint").textContent = "Wrong square. You're out of this board."; bad(); if (out[0] && out[1]) { k++; R.after(1000, board); } }
    });
    board();
  } },

{ id: "changed", cat: "memory", name: "What Changed?", rule: "Memorize six pictures. They hide, then come back with one swapped. Tap the one that changed first.",
  start(R) {
    const pool = shuffle(EMOJI).slice(0, 7), shown = pool.slice(0, 6), idx = ri(0, 5), changed = shown.slice();
    changed[idx] = pool[6];
    const grid = a => `<div class="grid3">${a.map((e, i) => `<div class="cell" data-i="${i}">${e}</div>`).join("")}</div>`;
    let phase = "show"; const frozen = [0, 0];
    R.both(`<p class="hint">Memorize these</p>${grid(shown)}`);
    R.after(3200, () => { R.both(big("…", "muted")); R.after(900, () => { phase = "go"; R.both(`<p class="hint">Which one changed?</p>${grid(changed)}`); }); });
    R.onDown((p, e) => {
      if (phase !== "go" || now() < frozen[p]) return;
      const c = e.target.closest(".cell"); if (!c) return;
      if (+c.dataset.i === idx) R.win(p, { win: "Nothing gets past you.", lose: `${name(p)} spotted the swap.` });
      else { frozen[p] = now() + 1200; c.classList.add("wrong"); shake(p); bad(); }
    });
  } },

{ id: "recall", cat: "memory", name: "Number Recall", rule: "A number flashes up. Type it from memory. First correct answer wins.",
  start(R) {
    let len = 5, num, phase, out = [false, false], kp = [null, null];
    const round = () => {
      num = String(ri(1, 9)) + [...Array(len - 1)].map(() => ri(0, 9)).join(""); phase = "show"; out = [false, false]; kp = [null, null];
      R.both(`<p class="hint">Remember this number</p><div class="card sum">${num}</div>`);
      R.after(2200, () => {
        phase = "input";
        for (const p of [0, 1]) kp[p] = keypad(R, p, { prompt: "Type the number", max: len + 2, onSubmit(v) {
          if (v === num) return R.win(p, { win: `It was ${num}.`, lose: `${name(p)} got ${num} first.` });
          out[p] = true; kp[p] = null; bad(); R.set(p, `${big("Wrong", "muted")}<p class="hint">You're out of this one.</p>`);
          if (out[0] && out[1]) { R.both(`<p class="hint">It was</p><div class="card sum">${num}</div>`); len++; R.after(1600, round); }
        } });
      });
    };
    R.onDown((p, e) => { if (phase === "input" && kp[p]) kp[p].down(e); });
    round();
  } },

{ id: "pairs", cat: "memory", name: "Pairs", rule: "Flip two cards at a time to find matching pairs. Clear all six pairs first.",
  start(R) {
    const faces = shuffle(EMOJI).slice(0, 6), deck = shuffle([...faces, ...faces]);
    const st = [0, 1].map(() => ({ open: [], done: new Set(), busy: false }));
    R.both(`<div class="pgrid">${deck.map((f, i) => `<button class="pc" tabindex="-1" data-i="${i}"><span>${f}</span></button>`).join("")}</div>`);
    R.mini(p => `Pairs: <b>${st[p].done.size / 2}</b> / 6`);
    R.onDown((p, e) => {
      const s = st[p]; if (s.busy) return;
      const b = e.target.closest(".pc"); if (!b) return;
      const i = +b.dataset.i; if (s.done.has(i) || s.open.includes(i)) return;
      b.classList.add("open"); s.open.push(i); beep(500, 0.03);
      if (s.open.length < 2) return;
      const [a, c] = s.open;
      if (deck[a] === deck[c]) {
        s.done.add(a); s.done.add(c); s.open = [];
        R.q(p, `[data-i="${a}"]`).classList.add("matched"); b.classList.add("matched"); beep(880, 0.06);
        R.mini(q => `Pairs: <b>${st[q].done.size / 2}</b> / 6`);
        if (s.done.size === 12) R.win(p, { win: "All pairs found.", lose: `${name(p)} cleared the board first.` });
      } else {
        s.busy = true;
        R.after(650, () => { for (const j of s.open) R.q(p, `[data-i="${j}"]`).classList.remove("open"); s.open = []; s.busy = false; });
      }
    });
  } },

{ id: "countback", cat: "memory", name: "Count Back", rule: "Pictures flash one at a time. Count carefully. Then answer how many of one picture you saw.",
  start(R) {
    const types = shuffle(EMOJI).slice(0, 3), seq = [...Array(ri(8, 12))].map(() => pick(types));
    const target = pick(types), ans = seq.filter(x => x === target).length;
    let k = 0, phase = "show"; const locked = [false, false];
    const wrong = new Set(); while (wrong.size < 3) { const w = ans + pick([-2, -1, 1, 2, 3]); if (w >= 0 && w !== ans) wrong.add(w); }
    const m = mc(ans, [...wrong]);
    const step = () => {
      if (k >= seq.length) { phase = "ask"; R.both(`<p class="hint">How many</p><div class="card emoji">${target}</div><p class="hint">did you see?</p>${choices(m.opts)}`); return; }
      R.both(`<div class="card emoji">${seq[k++]}</div>`); beep(500, 0.03, "sine");
      R.after(650, () => { R.both(""); R.after(140, step); });
    };
    R.both(big("Count!", "muted")); R.after(800, step);
    R.onDown((p, e) => {
      if (phase !== "ask" || locked[p]) return;
      const b = e.target.closest("[data-c]"); if (!b) return;
      if (+b.dataset.c === m.ans) R.win(p, { win: `There were ${ans}.`, lose: `It was ${ans}. ${name(p)} got it.` });
      else { locked[p] = true; b.classList.add("bad"); bad(); if (locked[0] && locked[1]) R.draw({ draw: `Both wrong. It was ${ans}.` }); }
    });
  } },

/* ================= GUESSING ================= */
{ id: "closest", cat: "guess", name: "Closest Guess", rule: "Answer a number question. Closest guess wins.",
  start(R) {
    const qs = shuffle(NUM_QUESTIONS); let i = 0;
    guessGame(R, { n: 1, next: () => { const q = qs[i++ % qs.length]; return { q: q.q, a: q.a }; } });
  } },

{ id: "dots", cat: "guess", name: "Dot Count", rule: "A cloud of dots flashes for a moment. Guess how many there were. Closest guess wins.",
  start(R) {
    guessGame(R, { n: 1, next: () => {
      const n = ri(14, 45);
      const dots = [...Array(n)].map(() => `<i style="left:${rand(3, 95)}%;top:${rand(4, 92)}%"></i>`).join("");
      return { q: "How many dots?", a: n, max: 3, intro: go => { R.both(`<div class="dots">${dots}</div>`); R.after(1400, go); } };
    } });
  } },

{ id: "fill", cat: "guess", name: "How Full?", rule: "A glass flashes up partly full. Guess how full it was, from 0 to 100%. Closest guess wins.",
  start(R) {
    guessGame(R, { n: 1, next: () => {
      const v = ri(4, 96);
      return { q: "How full was it? (0–100%)", a: v, unit: "%", max: 3, intro: go => { R.both(`<div class="glass"><i style="height:${v}%"></i></div>`); R.after(1500, go); } };
    } });
  } },

{ id: "clock", cat: "guess", name: "Stop the Clock", rule: "A timer starts, then disappears. Tap once to stop yours as close to the target as you can.",
  start(R) {
    const target = pick([3, 4, 5, 6, 7]);
    const t0 = now(), stopped = [null, null];
    R.both(`<p class="eyebrow">Stop at exactly</p><div class="big">${target.toFixed(2)}s</div><div class="card clock">0.00</div><p class="hint">Tap anywhere to stop your clock</p>`);
    const clock = [0, 1].map(p => R.q(p, ".clock")), hint = [0, 1].map(p => R.q(p, ".hint"));
    const fmt = s => s == null ? "no stop" : s.toFixed(2) + "s";
    let ended = false;
    const end = () => {
      if (ended) return; ended = true;
      const d = stopped.map(s => s == null ? Infinity : Math.abs(s - target));
      if (d[0] === Infinity && d[1] === Infinity) return R.draw({ draw: "Nobody stopped their clock." });
      if (Math.abs(d[0] - d[1]) < 0.005) return R.draw({ draw: `Dead heat at ${fmt(stopped[0])}.` });
      const w = d[0] < d[1] ? 0 : 1, l = 1 - w;
      R.win(w, { win: `You ${fmt(stopped[w])} · ${name(l)} ${fmt(stopped[l])}`, lose: `You ${fmt(stopped[l])} · ${name(w)} ${fmt(stopped[w])}` });
    };
    R.frame(() => {
      const t = (now() - t0) / 1000;
      for (const p of [0, 1]) if (stopped[p] == null) clock[p].textContent = t < 1.5 ? t.toFixed(2) : "?.??";
      if (t > target + 2.5) end();
    });
    R.onDown(p => {
      if (stopped[p] != null) return;
      stopped[p] = (now() - t0) / 1000;
      clock[p].textContent = stopped[p].toFixed(2); hint[p].textContent = "Locked in. Waiting for the other clock…";
      beep(700, 0.06);
      if (stopped[0] != null && stopped[1] != null) R.after(500, end);
    });
  } },

{ id: "hilo", cat: "guess", name: "Higher or Lower", rule: "Guess in secret whether the next card is higher or lower. Every right call scores. First to 2.",
  start(R) {
    const sc = race(R, 2);
    let card = ri(3, 11), picks;
    const round = () => {
      picks = [null, null];
      R.both(`<p class="hint">Next card: higher or lower?</p><div class="card playing">${CARD(card)}</div>${choices(["Higher", "Lower"])}`);
    };
    R.onDown((p, e) => {
      if (picks[p] != null) return;
      const b = e.target.closest("[data-c]"); if (!b) return;
      picks[p] = +b.dataset.c; beep(520, 0.05);
      R.set(p, `<div class="card playing">${CARD(card)}</div>${big("Locked", "muted")}<p class="hint">Waiting for ${name(1 - p)}…</p>`);
      if (picks[0] == null || picks[1] == null) return;
      let next = ri(1, 13); while (next === card) next = ri(1, 13);
      const right = next > card ? 0 : 1;
      for (const q of [0, 1]) R.set(q, `<div class="reveal"><div class="card playing">${CARD(card)}</div><span class="arrowto">→</span><div class="card playing">${CARD(next)}</div></div><p class="verdict">${picks[q] === right ? "You called it!" : "Wrong call."}</p><p class="hint">${name(1 - q)} ${picks[1 - q] === right ? "was right" : "was wrong"}.</p>`);
      card = next;
      R.after(2000, () => { if (!sc.addMany(picks.map(x => x === right ? 1 : 0))) round(); });
    });
    round();
  } },

{ id: "emoji", cat: "guess", name: "Emoji Movie", rule: "Name the movie from the emoji. First right answer scores. First to 2.",
  start(R) {
    const bank = shuffle(EMOJI_MOVIES); let i = 0;
    quiz(R, { n: 2, next() {
      const [e, t] = bank[i++ % bank.length];
      const m = mc(t, shuffle(EMOJI_MOVIES.filter(x => x[1] !== t)).slice(0, 3).map(x => x[1]));
      return { prompt: `<div class="card emoji wide">${e}</div>`, opts: m.opts, ans: m.ans, cls: "text" };
    } });
  } },

/* ================= BLUFF & MIND GAMES ================= */
{ id: "rps", cat: "bluff", irl: true, name: "Rock Paper Scissors", rule: "Real hands. Together, say \"rock, paper, scissors, shoot!\" and throw. Tap a player's +1 when they win a throw. First to 2.", tally: { to: 2 } },

{ id: "oddeven", cat: "bluff", irl: true, name: "Odds & Evens", rule: "Decide who's Odds and who's Evens. On three, both throw out 1 or 2 fingers. If the total is odd, Odds scores; even, Evens scores. First to 3.", tally: { to: 3 } },

{ id: "undercut", cat: "bluff", irl: true, name: "Undercut", rule: "On three, both throw out 1 to 5 fingers. Higher number scores, unless the other player threw exactly one less: then they undercut you and score. Same number: throw again. First to 3.", tally: { to: 3 } },

{ id: "bid", cat: "bluff", name: "Sealed Bid", rule: "You each have 10 chips. Secretly bid for 3 prizes. Highest bid takes the prize. Chips you bid are gone. Win 2 prizes.",
  start(R) {
    const chips = [10, 10], wins = [0, 0], bid = [0, 0], locked = [false, false];
    let r = 1;
    const showMini = () => R.mini(p => `Prizes: you <b>${wins[p]}</b> · ${name(1 - p)} <b>${wins[1 - p]}</b>`);
    const panel = p => R.set(p, `<p class="eyebrow">Prize ${r} of 3</p><p class="hint">You have ${chips[p]} chips. Cover your screen.</p><div class="stepper"><button data-s="-1" aria-label="Less">−</button><span class="sv">${bid[p]}</span><button data-s="1" aria-label="More">+</button></div><button class="bigbtn" data-s="lock">Lock bid</button>`);
    const round = () => { bid[0] = bid[1] = 0; locked[0] = locked[1] = false; panel(0); panel(1); showMini(); };
    const finishAll = () => {
      if (wins[0] !== wins[1]) { const w = wins[0] > wins[1] ? 0 : 1; return R.win(w, { win: `${wins[w]} prizes to ${wins[1 - w]}.` }); }
      if (chips[0] !== chips[1]) { const w = chips[0] > chips[1] ? 0 : 1; return R.win(w, { win: "Tied on prizes. You kept more chips.", lose: "Tied on prizes. They kept more chips." }); }
      R.draw({ draw: "Dead even on prizes and chips." });
    };
    R.onDown((p, e) => {
      if (locked[p]) return;
      const b = e.target.closest("[data-s]"); if (!b) return;
      if (b.dataset.s === "lock") {
        locked[p] = true; beep(520, 0.05);
        R.set(p, `${big("Locked", "muted")}<p class="hint">Bid ${bid[p]}. Waiting for ${name(1 - p)}…</p>`);
        if (!(locked[0] && locked[1])) return;
        chips[0] -= bid[0]; chips[1] -= bid[1];
        const w = bid[0] === bid[1] ? null : bid[0] > bid[1] ? 0 : 1;
        if (w != null) wins[w]++;
        showMini();
        for (const q of [0, 1]) R.set(q, `<div class="reveal"><div><p class="eyebrow">You bid</p><div class="card pickc">${bid[q]}</div></div><div><p class="eyebrow">${name(1 - q)}</p><div class="card pickc">${bid[1 - q]}</div></div></div><p class="verdict">${w == null ? "Tie. Nobody gets this prize." : w === q ? "You take the prize!" : "They take the prize."}</p>`);
        R.after(2200, () => {
          if (wins[0] >= 2 || wins[1] >= 2 || r >= 3) return finishAll();
          r++; round();
        });
      } else {
        bid[p] = clamp(bid[p] + +b.dataset.s, 0, chips[p]);
        R.q(p, ".sv").textContent = bid[p]; beep(400, 0.02, "sine");
      }
    });
    round();
  } },

{ id: "bust", cat: "bluff", name: "Bust", rule: "Both hold to start. A multiplier climbs. Let go to bank it. It can crash any moment, and anyone still holding gets nothing. Highest bank wins.",
  start(R) {
    let phase = "wait", t0 = 0, m = 1;
    const bank = [null, null];
    const crash = clamp(1.2 + 0.97 / (1 - Math.random()) - 0.97, 1.2, 15);
    const render = () => {
      for (const p of [0, 1]) {
        if (phase === "wait") R.set(p, `${big(R.held(p) ? "Hold…" : "Press &amp; hold", R.held(p) ? "" : "muted")}<p class="hint">Both hold to start the climb</p>`);
        else R.set(p, `<div class="big mult">${m.toFixed(2)}×</div><p class="hint">${bank[p] != null ? `You banked ${bank[p].toFixed(2)}×` : "Let go to bank it"}</p>`);
      }
    };
    const resolve = crashed => {
      phase = "done";
      const v = bank.map(x => x == null ? 0 : x);
      const msg = crashed ? `Crashed at ${crash.toFixed(2)}×.` : "";
      if (v[0] === 0 && v[1] === 0) return R.draw({ draw: `Both busted. ${msg}` });
      if (v[0] === v[1]) return R.draw({ draw: `Both banked ${v[0].toFixed(2)}×.` });
      const w = v[0] > v[1] ? 0 : 1;
      R.win(w, { win: `${v[w].toFixed(2)}× beats ${v[1 - w] ? v[1 - w].toFixed(2) + "×" : "a bust"}. ${msg}`, lose: `${v[1 - w] ? "You banked " + v[1 - w].toFixed(2) + "×" : "You busted"}. ${msg}` });
    };
    render();
    const startClimb = () => { if (phase === "wait" && R.held(0) && R.held(1)) { phase = "run"; t0 = now(); beep(500, 0.06); } };
    startClimb();
    R.onDown(() => { if (phase === "wait") { startClimb(); render(); } });
    R.frame(() => {
      if (phase !== "run") return;
      m = Math.exp(0.22 * (now() - t0) / 1000);
      if (m >= crash) {
        m = crash;
        for (const p of [0, 1]) R.set(p, `<div class="big mult crashed">${crash.toFixed(2)}×</div><p class="hint">CRASH!</p>`);
        bad(); buzz(150);
        phase = "done"; R.after(1100, () => resolve(true)); return;
      }
      for (const p of [0, 1]) { const el = R.q(p, ".mult"); if (el) el.textContent = m.toFixed(2) + "×"; else render(); }
    });
    R.onUp(p => {
      if (R.held(p)) return;
      if (phase === "wait") return render();
      if (phase !== "run" || bank[p] != null) return;
      bank[p] = m; beep(880, 0.06);
      const h = R.q(p, ".hint"); if (h) h.textContent = `You banked ${m.toFixed(2)}×`;
      if (bank[0] != null && bank[1] != null) { phase = "done"; R.after(600, () => resolve(false)); }
    });
  } },

/* ================= BRAIN ================= */
{ id: "truth", cat: "brain", name: "True or False", rule: "Sums flash up. Tap only when the sum is TRUE. Tap a false one and you lose.",
  start(R) {
    stream(R, { startMs: 2100, minMs: 1400,
      gen(want) {
        const op = pick(["+", "−", "×"]);
        let a = ri(3, 15), b = ri(2, 12);
        if (op === "×") { a = ri(2, 9); b = ri(2, 9); }
        if (op === "−" && b > a) [a, b] = [b, a];
        const r = op === "+" ? a + b : op === "−" ? a - b : a * b;
        let shown = r;
        if (!want) { do { shown = r + pick(op === "×" ? [-a, a, -b, b, -1, 1] : [-2, -1, 1, 2, 10, -10]); } while (shown === r || shown < 0); }
        return { match: want, t: `${a} ${op} ${b} = ${shown}` };
      },
      render: c => `<div class="card sum">${c.t}</div><p class="hint">Tap only if it's true</p>`,
      win: p => ({ win: "Big brain.", lose: `${name(p)} did the math first.` }),
      foul: p => ({ win: `${name(p)} fell for a false one.`, lose: "That sum was false!" }) });
  } },

{ id: "trivia", cat: "brain", name: "Trivia Showdown", rule: "Quick-fire questions. First right answer scores. A wrong answer locks you out of that question. First to 2.",
  start(R) {
    const bank = shuffle(TRIVIA); let i = 0;
    quiz(R, { n: 2, next() {
      const [q, ...o] = bank[i++ % bank.length]; const m = mc(o[0], o.slice(1));
      return { prompt: `<p class="qtext">${q}</p>`, opts: m.opts, ans: m.ans, cls: "text" };
    } });
  } },

{ id: "scramble", cat: "brain", name: "Scramble", rule: "Unscramble the word and tap the right answer first. First to 2.",
  start(R) {
    const bank = shuffle(SCRAMBLE); let i = 0;
    quiz(R, { n: 2, next() {
      const w = bank[i++ % bank.length];
      let s = w; while (s === w) s = shuffle(w.split("")).join("");
      const m = mc(w, shuffle(SCRAMBLE.filter(x => x !== w && x.length === w.length).concat(SCRAMBLE.filter(x => x !== w))).filter((x, k, a) => a.indexOf(x) === k).slice(0, 3));
      return { prompt: `<div class="card word">${s}</div>`, opts: m.opts, ans: m.ans, cls: "text" };
    } });
  } },

{ id: "pattern", cat: "brain", name: "Next in Line", rule: "Spot the pattern and tap the number that comes next. First to 2.",
  start(R) {
    quiz(R, { n: 2, next() {
      const kind = ri(0, 4); let s;
      if (kind === 0) { const a = ri(1, 20), d = ri(2, 9); s = [0, 1, 2, 3, 4].map(k => a + k * d); }
      else if (kind === 1) { const a = ri(1, 4), r = pick([2, 3]); s = [0, 1, 2, 3, 4].map(k => a * r ** k); }
      else if (kind === 2) { const a = ri(1, 6); s = [0, 1, 2, 3, 4].map(k => (a + k) ** 2); }
      else if (kind === 3) { const a = ri(1, 5), b = ri(2, 6); s = [a, b]; while (s.length < 5) s.push(s[s.length - 1] + s[s.length - 2]); }
      else { const a = ri(20, 40), x = ri(4, 9), y = ri(1, 3); s = [a]; for (let k = 1; k < 5; k++) s.push(s[k - 1] + (k % 2 ? x : -y)); }
      const ans = s[4];
      const wrong = new Set(); while (wrong.size < 3) { const w = ans + pick([-3, -2, -1, 1, 2, 4, 5]); if (w !== ans && w >= 0) wrong.add(w); }
      const m = mc(ans, [...wrong]);
      return { prompt: `<div class="card sum">${s.slice(0, 4).join(", ")}, ?</div>`, opts: m.opts, ans: m.ans };
    } });
  } },

{ id: "bigger", cat: "brain", name: "Which Is Bigger?", rule: "Two sums appear. Tap the bigger one. Wrong taps cost a point. First to 3.",
  start(R) {
    const expr = () => { const k = ri(0, 2); if (k === 0) { const a = ri(3, 12), b = ri(3, 12); return { t: `${a} × ${b}`, v: a * b }; } if (k === 1) { const a = ri(10, 80), b = ri(10, 80); return { t: `${a} + ${b}`, v: a + b }; } const a = ri(40, 120); return { t: String(a), v: a }; };
    quiz(R, { n: 3, penalty: true, next() {
      let a = expr(), b = expr(); while (Math.abs(a.v - b.v) < 1 || Math.abs(a.v - b.v) > 25) { a = expr(); b = expr(); }
      return { prompt: `<p class="hint">Tap the bigger one</p>`, opts: [a.t, b.t], ans: a.v > b.v ? 0 : 1, cls: "two" };
    } });
  } },

/* ================= WORDS & DRAWING ================= */
{ id: "categories", cat: "word", name: "Categories", rule: "Take turns naming something in the category. Tap after you say it. Run out of time and you lose. No repeats.",
  start(R) { turns(R, { prompt: `<p class="eyebrow">Category</p><div class="card word sm">${pick(CATEGORIES)}</div>` }); } },

{ id: "rhyme", cat: "word", name: "Rhyme Time", rule: "Take turns saying a word that rhymes. Tap after you say it. Run out of time and you lose. No repeats.",
  start(R) { turns(R, { prompt: `<p class="eyebrow">Rhymes with</p><div class="card word">${pick(RHYMES)}</div>` }); } },

{ id: "chain", cat: "word", name: "Word Chain", rule: "Each word must start with the last letter of the one before. Take turns. Run out of time and you lose.",
  start(R) { turns(R, { prompt: `<p class="eyebrow">Start from</p><div class="card word">${pick(CHAIN_STARTS)}</div><p class="hint small">Next word starts with its last letter</p>` }); } },

{ id: "sketch", cat: "word", name: "Quick Sketch", rule: "You both get 25 seconds to draw the same thing on your side. Then the crowd votes for the best drawing.",
  start(R) {
    const T = 25, t0 = now(), lastPt = new Map();
    let phase = "draw";
    R.both(`<p class="hint">Draw <b>${pick(SKETCHES)}</b></p><canvas class="sketch"></canvas><div class="tbar"><i></i></div>`);
    const cv = [0, 1].map(p => R.q(p, "canvas")), cx = cv.map(c => {
      const r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      c.width = Math.max(1, r.width * dpr); c.height = Math.max(1, r.height * dpr);
      const x = c.getContext("2d"); x.scale(dpr, dpr); x.lineCap = x.lineJoin = "round"; x.lineWidth = 4; x.strokeStyle = "#1B1530"; return x;
    });
    R.onDown((p, e) => {
      if (phase !== "draw" || e.target !== cv[p]) return;
      const pt = local(p, cv[p], e); lastPt.set(e.pointerId, pt);
      cx[p].beginPath(); cx[p].arc(pt.x, pt.y, 2, 0, 7); cx[p].fillStyle = "#1B1530"; cx[p].fill();
    });
    R.onMove((p, e) => {
      const l = lastPt.get(e.pointerId); if (!l || phase !== "draw") return;
      const pt = local(p, cv[p], e);
      cx[p].beginPath(); cx[p].moveTo(l.x, l.y); cx[p].lineTo(pt.x, pt.y); cx[p].stroke(); lastPt.set(e.pointerId, pt);
    });
    R.onUp((p, e) => { lastPt.delete(e.pointerId); });
    R.frame(() => {
      if (phase !== "draw") return;
      const f = clamp(1 - (now() - t0) / (T * 1000), 0, 1);
      for (const p of [0, 1]) { const i = R.q(p, ".tbar i"); if (i) i.style.transform = `scaleX(${f})`; }
      if (f === 0) {
        phase = "judge"; beep(880, 0.3);
        R.judge("Who drew it better?", [{ t: name(0), c: "red" }, { t: name(1), c: "blue" }, "Too close to call"], i =>
          i === 2 ? R.draw({ draw: "The crowd couldn't decide." }) : R.win(i, { win: "The crowd loved it.", lose: "The crowd picked the other one." }));
      }
    });
  } },

/* ================= REAL-LIFE CHALLENGES (crowd judges) ================= */
{ id: "stare", cat: "irl", irl: true, name: "Staring Contest", rule: "Lock eyes. First to blink, look away or laugh loses. The crowd watches closely.", timer: { up: true } },
{ id: "thumb", cat: "irl", irl: true, name: "Thumb War", rule: "Lock fingers, thumbs up. \"One, two, three, four, I declare a thumb war.\" Pin their thumb for a three-count. First to 2 pins.", tally: { to: 2 } },
{ id: "poker", cat: "irl", irl: true, name: "Poker Face", rule: "Take turns: 30 seconds each to make your opponent laugh or smile. No touching. Whoever cracks first loses. If nobody cracks, the crowd decides.", timer: { down: 30 } },
{ id: "twister", cat: "irl", irl: true, name: "Tongue Twister", rule: "Each of you says this three times, fast. Cleanest and quickest wins. The crowd decides.", prompts: TWISTERS },
{ id: "flamingo", cat: "irl", irl: true, name: "Flamingo", rule: "Stand on one leg, arms crossed, eyes closed. First to put a foot down or open their eyes loses.", timer: { up: true } },
{ id: "wallsit", cat: "irl", irl: true, name: "Wall Sit", rule: "Backs flat against a wall, knees bent at 90 degrees. First to stand up or slide down loses.", timer: { up: true } },
{ id: "arm", cat: "irl", irl: true, name: "Arm Wrestle", rule: "Elbows on the table, hands locked. The ref says go. First to pin the other's hand wins." },
{ id: "toss", cat: "irl", irl: true, name: "Paper Toss", rule: "Crumple a napkin or paper. Take turns tossing it into a cup or bin from three big steps away. Five shots each. Tap +1 for every basket. Most baskets wins.", tally: {} },
{ id: "slap", cat: "irl", irl: true, name: "Hand Slap", rule: "One player holds hands palms up; the other rests theirs palms down on top. The bottom player tries to slap; the top player dodges. Swap after a miss. First to 3 slaps.", tally: { to: 3 } },
{ id: "impress", cat: "irl", irl: true, name: "Impressions", rule: "Each of you does this impression for 15 seconds. The crowd picks the best one.", prompts: IMPRESSIONS, timer: { down: 15 } },
{ id: "hum", cat: "irl", irl: true, name: "Hum That Tune", rule: "Each player peeks at a secret song, then hums it. Whoever gets their song guessed by the crowd first wins.", secrets: SONGS },
{ id: "speech", cat: "irl", irl: true, name: "No-Um Speech", rule: "30 seconds each on this topic. Say \"um\" or \"uh\", or pause too long, and you're out. If you both survive, best speech wins.", prompts: TOPICS, timer: { down: 30 } }
];
