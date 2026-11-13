/*
 * City Through Time: skyline renderer
 * One riverside town drawn on a full-screen canvas (#city) and blended between five eras by scroll position.
 *
 * Map of this file
 *   ERA, HP ............ per-era sky, ground, water, camera zoom; heritage palette per era
 *   heritage() ......... castle hill, cathedral, gate tower: drawn live every frame with the blended palette;
 *                        in 432 BC they become the Acropolis, a Doric temple and a propylon
 *   bridgeGeo/drawBridge  bridge from the gate to the near bank, one BRIDGE style per era
 *   build<Era>() ....... static layers built once per era (bg, mid, fg offscreen canvases)
 *   dyn<Era>/dynW<Era>.. per-frame animation above the skyline / on the water
 *   skyStatic/skyLive .. cacheable sky vs drifting clouds
 *   measure/weights/hud  scroll position -> era weights -> nav bar
 *   render() ........... draw passes; static passes are flattened into 3 cached images once scrolling stops
 *
 * Svelte port: call initCity(canvas, { main, onHud }) from onMount. It expects <section data-era="..."> per era in the
 * document, reports nav-bar state through onHud({ year, index, era, name, pop }) and returns a teardown function.
 */
// @ts-nocheck -- the renderer body is untyped canvas code (about 2,400 lines of geometry); only its public surface is typed.
import type { HudState } from "#lib/era.svelte.ts";

export interface CityOptions {
  /** Element whose size changes trigger a re-measure of the section centres. Defaults to <main>. */
  main?: HTMLElement | null;
  /** Called whenever the year counter or the current era changes. */
  onHud?: (s: HudState) => void;
}

/** Starts the skyline renderer on a canvas and returns a teardown function. */
export function initCity(cv: HTMLCanvasElement, { main, onHud = () => {} }: CityOptions = {}): () => void {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  main = main || document.querySelector("main");
  let ctx = cv.getContext("2d");
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function rng(a) {
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const ss = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const pick = (r, a) => a[(r() * a.length) | 0];

  /* One town, five eras. zoom = metres that fit in the skyline height S, so the camera pulls back as the town grows. */
  const ERA = {
    modern: {
      year: 2026,
      pop: "8.4 million",
      name: "Midtown · present day",
      sky: ["#1c2654", "#e89a74"],
      ground: "#0e1430",
      water: "#1b2550",
      refl: 0.5,
      zoom: 300,
    },
    industrial: {
      year: 1888,
      pop: "420,000",
      name: "The Works · Victorian era",
      sky: ["#6a5b4e", "#dcc296"],
      ground: "#3b3228",
      water: "#6c6454",
      refl: 0.34,
      zoom: 160,
    },
    medieval: {
      year: 1347,
      pop: "12,000",
      name: "Old Town · Middle Ages",
      sky: ["#3f86cf", "#dbe9f1"],
      ground: "#4d6c74",
      water: "#86a6ae",
      refl: 0.32,
      zoom: 90,
    },
    classical: {
      year: -431,
      pop: "250,000",
      name: "The Agora · Classical Athens",
      sky: ["#a3b4b8", "#e2dab9"],
      ground: "#36707c",
      water: "#779a98",
      refl: 0.36,
      zoom: 80,
    },
    future: {
      year: 2150,
      pop: "31 million",
      name: "Skyport · AD 2150",
      sky: ["#02031a", "#33155c"],
      ground: "#05041a",
      water: "#0b0a2e",
      refl: 0.55,
      zoom: 480,
    },
  };
  for (const k in ERA) {
    const e = ERA[k];
    e.skyC = e.sky.map(hex);
    e.groundC = hex(e.ground);
    e.waterC = hex(e.water);
  }
  /* Heritage that survives every era, re-lit by each one */
  const HP = {
    medieval: {
      stone: "#d2c3a3",
      shade: "#b4a283",
      roof: "#8a4a2e",
      slate: "#5d6573",
      win: "#2c2826",
      clock: "#d2c3a3",
      hill: "#8ea27a",
      hill2: "#7d936b",
    },
    classical: {
      stone: "#efe4cc",
      shade: "#c9b28a",
      roof: "#b5643c",
      slate: "#3d6d9c",
      win: "#5c4836",
      clock: "#d6a53a",
      hill: "#ad9a70",
      hill2: "#9a8862", // shaded flank: same tan as the hill, one step darker
    },
    industrial: {
      stone: "#8c7c68",
      shade: "#6c5e4e",
      roof: "#4b3c33",
      slate: "#3f3b3d",
      win: "#e7a654",
      clock: "#efe2bf",
      hill: "#6f6b52",
      hill2: "#615d47",
    },
    modern: {
      stone: "#e3c28e",
      shade: "#a8845a",
      roof: "#5c4537",
      slate: "#5c5662",
      win: "#ffd27a",
      clock: "#fff3d0",
      hill: "#1f2a40",
      hill2: "#18213a",
    },
    future: {
      stone: "#2a2f66",
      shade: "#1e2252",
      roof: "#1a1c48",
      slate: "#22275a",
      win: "#7ae9ff",
      clock: "#7ae9ff",
      hill: "#10153a",
      hill2: "#0c1030",
    },
  };
  for (const k in HP) for (const p in HP[k]) HP[k][p] = hex(HP[k][p]);
  const QH = 5,
    HX = 0.8,
    CX = 0.26,
    GX = 0.5,
    BN = 0.38; // castle hill, cathedral, gate tower (bridge far end), bridge near end

  let W = 0,
    H = 0,
    S,
    base,
    TOP,
    G,
    NB,
    dpr,
    cache = {},
    shimmer = [],
    stars = [],
    clouds = {},
    hatchCv;
  const OD = Math.min(devicePixelRatio || 1, 1.5);

  /* ---------- helpers ---------- */
  function layer(y0, h) {
    const cn = document.createElement("canvas");
    cn.width = Math.max(1, Math.ceil(W * OD));
    cn.height = Math.max(1, Math.ceil(h * OD));
    const c = cn.getContext("2d");
    c.setTransform(OD, 0, 0, OD, 0, -y0 * OD);
    return { cn, c, y0, h };
  }
  const R = (c, x, y, w, h, f) => {
    c.fillStyle = f;
    c.fillRect(x, y, w, h);
  };
  function path(c, p) {
    c.beginPath();
    c.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
    c.closePath();
  }
  const P = (c, f, ...p) => {
    path(c, p);
    c.fillStyle = f;
    c.fill();
  };
  function L(c, col, w, ...p) {
    c.strokeStyle = col;
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
    c.stroke();
  }
  const haze = (c, rgb, a) => {
    c.save();
    c.globalCompositeOperation = "source-atop";
    c.fillStyle = `rgba(${rgb},${a})`;
    c.fillRect(-5, base - TOP, W + 10, TOP + 3);
    c.restore();
  };
  const wy = (k, f) => base + QH * k + (G - QH * k - NB - 4) * f;
  const dot = (c, x, y, r, f) => {
    c.fillStyle = f;
    c.beginPath();
    c.arc(x, y, r, 0, 6.2832);
    c.fill();
  };
  const hillSg = (k) => Math.min(75 * k, W * 0.2);
  const plat = (k) => Math.min(44 * k, hillSg(k) * 1.2) / 2 + 6 * k;
  function hillY(x, k) {
    const sg = hillSg(k),
      dx = x - W * HX,
      d = (Math.sign(dx) * Math.max(0, Math.abs(dx) - plat(k))) / sg;
    return base - 46 * k * Math.exp(-d * d) * (1 + 0.04 * Math.sin(d * 3));
  }
  function zones(k) {
    const Ln = Math.min(62 * k, W * 0.24);
    return {
      c0: W * CX - Ln / 2 - 3 * k,
      c1: W * CX + Ln / 2 + 3 * k,
      cn: 19 * k,
      g0: W * GX - 6.5 * k,
      g1: W * GX + 6.5 * k,
      hx: W * HX,
      sg: hillSg(k),
    };
  }
  function blocked(z, x, w, h) {
    return (x + w > z.g0 && x < z.g1) || (x + w > z.c0 && x < z.c1 && h > z.cn * 0.55);
  }
  function hatchOver(c) {
    c.save();
    c.globalCompositeOperation = "source-atop";
    c.globalAlpha = 0.38;
    c.fillStyle = c.createPattern(hatchCv, "repeat");
    c.fillRect(0, base - TOP, W, TOP + G + 4);
    c.restore();
  }

  /* ---------- particles ---------- */
  function emit(list, x, y, o) {
    if (list.length < 520)
      list.push({
        x,
        y,
        r: o.r0,
        l: 1,
        vx: o.vx * (0.7 + Math.random() * 0.6),
        vy: o.vy * (0.7 + Math.random() * 0.6),
        g: o.g,
        d: o.d,
        c: o.c,
        a: o.a,
      });
  }
  function stepParts(list, dt) {
    for (const p of list) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.g * dt;
      p.l -= p.d * dt;
      p.vy *= 1 - dt * 0.12;
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i].l <= 0) list.splice(i, 1);
  }
  function drawParts(list) {
    for (const p of list) {
      ctx.fillStyle = `rgba(${p.c},${(p.l * p.a).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fill();
    }
  }

  /* =====================================================================
   HERITAGE: castle hill, cathedral, gate tower (drawn live, every era)
   ===================================================================== */
  let HE = 0;
  const HEC = "62,242,255";
  function hr(x, y, w, h, f) {
    ctx.fillStyle = f;
    ctx.fillRect(x, y, w, h);
    if (HE > 0.01) {
      ctx.strokeStyle = `rgba(${HEC},${HE.toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
  }
  function hf(f, ...p) {
    path(ctx, p);
    ctx.fillStyle = f;
    ctx.fill();
    if (HE > 0.01) {
      ctx.strokeStyle = `rgba(${HEC},${HE.toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  function crenels(x, y, w, s, f) {
    ctx.fillStyle = f;
    for (let i = x; i < x + w - s * 0.5; i += s * 2) ctx.fillRect(i, y - s, s, s);
  }
  function castle(x, gy, k, p, sg) {
    const cw = Math.min(44 * k, sg * 1.2),
      wh = 9 * k,
      tw = Math.max(3, 7 * k),
      th = 15 * k,
      cs = Math.max(1, 1.4 * k),
      pw = plat(k);
    hf(
      p.shade,
      x - pw,
      gy + 3 * k,
      x - pw + 2 * k,
      gy - 1 * k,
      x + pw - 2 * k,
      gy - 1 * k,
      x + pw,
      gy + 3 * k,
    );
    hr(x - cw / 2, gy - wh, cw, wh + 4 * k, p.stone);
    crenels(x - cw / 2, gy - wh, cw, cs, p.stone);
    for (const tx of [x - cw / 2, x + cw / 2]) {
      hr(tx - tw / 2, gy - th, tw, th + 4 * k, p.stone);
      ctx.fillStyle = p.shade;
      ctx.fillRect(tx + tw * 0.2, gy - th, tw * 0.3, th);
      hf(p.slate, tx - tw / 2 - 0.6 * k, gy - th, tx, gy - th - tw * 1.5, tx + tw / 2 + 0.6 * k, gy - th);
    }
    const kw = Math.max(5, 13 * k),
      kh = 25 * k,
      kx = x - cw * 0.08;
    hr(kx - kw / 2, gy - kh, kw, kh, p.stone);
    ctx.fillStyle = p.shade;
    ctx.fillRect(kx + kw * 0.18, gy - kh, kw * 0.32, kh);
    crenels(kx - kw / 2, gy - kh, kw, cs, p.stone);
    ctx.fillStyle = p.win;
    for (let i = 0; i < 3; i++)
      ctx.fillRect(kx - kw * 0.25, gy - kh + 5 * k + i * 6 * k, Math.max(1, 1.2 * k), Math.max(1.5, 2 * k));
    ctx.fillRect(kx + kw * 0.1, gy - kh + 8 * k, Math.max(1, 1.2 * k), Math.max(1.5, 2 * k));
    ctx.fillRect(x + cw * 0.25, gy - wh * 0.6, Math.max(1, 1.2 * k), Math.max(1.5, 2 * k));
    L(ctx, p.slate, Math.max(1, 0.3 * k), kx, gy - kh - cs, kx, gy - kh - cs - 7 * k);
  }
  function cathedral(cx, k, p) {
    const Ln = Math.min(62 * k, W * 0.24),
      tx = cx - Ln / 2,
      tw = Math.max(5, Math.min(12 * k, Ln * 0.22)),
      nh = 19 * k,
      rh = Math.min(10 * k, Ln * 0.2),
      th = 44 * k;
    hr(tx + tw, base - nh, Ln - tw, nh, p.stone);
    hf(
      p.roof,
      tx + tw,
      base - nh,
      tx + tw,
      base - nh - rh,
      tx + Ln - rh * 0.7,
      base - nh - rh,
      tx + Ln,
      base - nh,
    );
    const bays = Math.max(3, Math.round((Ln - tw) / (6 * k))),
      bw = (Ln - tw) / bays;
    for (let i = 0; i < bays; i++) {
      const bx = tx + tw + i * bw;
      ctx.fillStyle = p.shade;
      ctx.fillRect(bx, base - nh * 0.9, Math.max(1, 1.2 * k), nh * 0.9);
      ctx.beginPath();
      ctx.moveTo(bx - 0.4 * k, base - nh * 0.9);
      ctx.lineTo(bx + 0.6 * k, base - nh - 2.5 * k);
      ctx.lineTo(bx + 1.6 * k, base - nh * 0.9);
      ctx.fill();
      const ww = Math.min(2.4 * k, bw * 0.4),
        wx = bx + bw / 2 - ww / 2,
        wy = base - nh * 0.78;
      ctx.fillStyle = p.win;
      ctx.beginPath();
      ctx.moveTo(wx, wy + 8 * k);
      ctx.lineTo(wx, wy + ww * 0.5);
      ctx.lineTo(wx + ww / 2, wy - ww * 0.3);
      ctx.lineTo(wx + ww, wy + ww * 0.5);
      ctx.lineTo(wx + ww, wy + 8 * k);
      ctx.fill();
    }
    ctx.fillStyle = p.stone;
    ctx.beginPath();
    ctx.ellipse(tx + Ln, base - nh * 0.5, Math.min(4 * k, Ln * 0.06), nh * 0.5, 0, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    hr(tx, base - th, tw, th, p.stone);
    ctx.fillStyle = p.shade;
    ctx.fillRect(tx + tw * 0.62, base - th, tw * 0.38, th);
    ctx.fillStyle = p.win;
    for (const o of [0.22, 0.58]) ctx.fillRect(tx + tw * o, base - th + 3 * k, Math.max(1, tw * 0.18), 8 * k);
    dot(ctx, tx + tw / 2, base - th * 0.55, Math.max(1.5, tw * 0.22), p.win);
    crenels(tx, base - th, tw, Math.max(1, 1.2 * k), p.stone);
    hf(p.slate, tx + tw * 0.08, base - th, tx + tw / 2, base - 82 * k, tx + tw * 0.92, base - th);
    L(ctx, p.slate, Math.max(1, 0.25 * k), tx + tw / 2, base - 82 * k, tx + tw / 2, base - 86 * k);
    L(
      ctx,
      p.slate,
      Math.max(1, 0.25 * k),
      tx + tw / 2 - 1.2 * k,
      base - 84.5 * k,
      tx + tw / 2 + 1.2 * k,
      base - 84.5 * k,
    );
  }
  function gateTower(gx, k, p) {
    const w = Math.max(4, 9 * k),
      h = 20 * k;
    hr(gx - w / 2, base - h, w, h, p.stone);
    ctx.fillStyle = p.shade;
    ctx.fillRect(gx + w * 0.2, base - h, w * 0.3, h);
    const aw = 4 * k,
      ah = 6.4 * k;
    ctx.fillStyle = "rgba(20,14,10,.78)";
    ctx.beginPath();
    ctx.moveTo(gx - aw / 2, base);
    ctx.lineTo(gx - aw / 2, base - ah + aw / 2);
    ctx.arc(gx, base - ah + aw / 2, aw / 2, Math.PI, 0);
    ctx.lineTo(gx + aw / 2, base);
    ctx.fill();
    hr(gx - w / 2 - 0.5 * k, base - h - 6 * k, w + k, 6 * k, p.stone);
    ctx.fillStyle = p.shade;
    ctx.fillRect(gx - w / 2 - 0.5 * k, base - h - 0.8 * k, w + k, Math.max(1, 0.8 * k));
    dot(ctx, gx, base - h - 3 * k, Math.max(1.2, 1.6 * k), p.clock);
    ctx.fillStyle = p.win;
    ctx.fillRect(gx - 0.6 * k, base - h + 4 * k, Math.max(1, 1.2 * k), Math.max(1.5, 2 * k));
    hf(
      p.slate,
      gx - w / 2 - 1 * k,
      base - h - 6 * k,
      gx,
      base - h - 17 * k,
      gx + w / 2 + 1 * k,
      base - h - 6 * k,
    );
    L(ctx, p.slate, Math.max(1, 0.25 * k), gx, base - h - 17 * k, gx, base - h - 20 * k);
  }
  /* 432 BC: the castle hill is the Acropolis, the cathedral site a Doric temple, the gate tower a propylon.
     CW is the classical era's weight; heritage() crossfades the two sets of landmarks by it. */
  let CW = 0;
  function temple(cx, gy, w, k, p, n, colH) {
    const st = Math.max(1, 0.5 * k),
      cw = Math.max(1.5, w / (n * 2)),
      gap = (w - cw) / (n - 1),
      x0 = cx - w / 2,
      u = (f) => Math.max(1, f * k);
    for (let i = 0; i < 3; i++) {
      const o = (2 - i) * 0.6 * k;
      hr(x0 - o, gy - (i + 1) * st, w + 2 * o, st + (i ? 0 : 2 * k), i % 2 ? p.shade : p.stone);
    }
    const ct = gy - 3 * st - colH;
    hr(x0 + cw * 0.5, ct, w - cw, colH, p.win);
    for (let j = 0; j < n; j++) {
      const x = x0 + j * gap;
      hr(x, ct, cw, colH, p.stone);
      ctx.fillStyle = p.shade;
      ctx.fillRect(x + cw * 0.6, ct, cw * 0.4, colH);
      ctx.fillRect(x - cw * 0.18, ct - u(0.45), cw * 1.36, u(0.45));
    }
    const ov = 0.4 * k,
      ey = ct - u(0.45),
      ah = u(0.8),
      fh = u(0.9);
    hr(x0 - ov, ey - ah, w + 2 * ov, ah, p.stone);
    hr(x0 - ov, ey - ah - fh, w + 2 * ov, fh, p.stone);
    ctx.fillStyle = p.slate;
    const tg = Math.max(1, cw * 0.5);
    for (let j = 0; j < n * 2 - 1; j++) ctx.fillRect(x0 + (j * gap) / 2 + cw / 2 - tg / 2, ey - ah - fh, tg, fh);
    const cy = ey - ah - fh;
    ctx.fillStyle = p.shade;
    ctx.fillRect(x0 - ov * 1.5, cy - u(0.35), w + 3 * ov, u(0.35));
    const py = cy - u(0.35),
      ph = Math.max(3, w * 0.11);
    hf(p.stone, x0 - ov * 1.5, py, cx, py - ph, x0 + w + ov * 1.5, py);
    if (ph > 5) {
      hf(p.slate, x0 + ov * 2, py - 0.25 * k, cx, py - ph + 0.7 * k, x0 + w - ov * 2, py - 0.25 * k);
      ctx.fillStyle = p.stone;
      for (let i = 1; i < 10; i++) {
        const fx = x0 + (w * i) / 10,
          hh = (ph - 1.2 * k) * (1 - Math.abs(fx - cx) / (w / 2)) * 0.7;
        if (hh > 1.5) ctx.fillRect(fx - 0.3 * k, py - 0.25 * k - hh, u(0.6), hh);
      }
    }
    for (const ax of [x0 - ov * 1.5, cx, x0 + w + ov * 1.5]) dot(ctx, ax, ax === cx ? py - ph : py, u(0.5), p.clock);
  }
  function acropolis(hx, k, p) {
    const pw = plat(k),
      gy = hillY(hx, k) + 1.5 * k;
    // the Cimonian wall: a cut-stone face where the castle platform sat
    hf(p.shade, hx - pw - 2 * k, gy + 7 * k, hx - pw, gy - 1 * k, hx + pw, gy - 1 * k, hx + pw + 2 * k, gy + 7 * k);
    ctx.fillStyle = p.hill2;
    for (let y = gy + 0.8 * k; y < gy + 6.5 * k; y += 1.6 * k)
      ctx.fillRect(hx - pw - (y - gy) * 0.25, y, 2 * pw + (y - gy) * 0.5, Math.max(1, 0.18 * k));
    const w = Math.min(40 * k, pw * 1.35),
      px = hx - pw * 0.3,
      ex = hx + pw * 0.74,
      ew = Math.min(11 * k, pw * 0.36);
    temple(px, gy, w, k, p, 8, 8.5 * k); // Parthenon
    temple(ex, gy, ew, k, p, 4, 5 * k); // Erechtheion
    // Athena Promachos: gilt bronze, spear raised
    const ax = hx + pw * 0.47;
    hr(ax - 0.7 * k, gy - 3 * k, 1.4 * k, 3 * k, p.stone);
    ctx.fillStyle = p.clock;
    ctx.fillRect(ax - 0.35 * k, gy - 7 * k, Math.max(1, 0.7 * k), 4 * k);
    dot(ctx, ax, gy - 7.4 * k, Math.max(1, 0.45 * k), p.clock);
    dot(ctx, ax - 0.6 * k, gy - 5 * k, Math.max(1, 0.75 * k), p.clock);
    L(ctx, p.clock, Math.max(1, 0.2 * k), ax + 0.5 * k, gy - 3.6 * k, ax + 0.5 * k, gy - 10.5 * k);
  }
  function heritage(k, p, glow) {
    const hx = W * HX,
      sg = hillSg(k);
    if (glow > 0.01) {
      for (const [x, y, rr] of [
        [W * CX, base - 30 * k, 70 * k],
        [W * GX, base - 14 * k, 30 * k],
        [hx, hillY(hx, k) - 12 * k, 50 * k],
      ]) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
        g.addColorStop(0, `rgba(255,196,120,${(glow * 0.35).toFixed(3)})`);
        g.addColorStop(1, "rgba(255,196,120,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
    }
    ctx.fillStyle = p.hill;
    ctx.beginPath();
    ctx.moveTo(hx - sg * 2.8, base + 1);
    for (let x = hx - sg * 2.8; x <= hx + sg * 2.8; x += 5) ctx.lineTo(x, hillY(x, k));
    ctx.lineTo(hx + sg * 2.8, base + 1);
    ctx.fill();
    if (HE > 0.01) {
      ctx.strokeStyle = `rgba(${HEC},${(HE * 0.6).toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = p.hill2;
    ctx.beginPath();
    ctx.moveTo(hx + sg * 0.1, base + 1);
    for (let x = hx + sg * 0.1; x <= hx + sg * 2.8; x += 5)
      ctx.lineTo(x, Math.min(base, hillY(x, k) + (x - hx) * 0.12 + 2 * k));
    ctx.lineTo(hx + sg * 2.8, base + 1);
    ctx.fill();
    const a0 = ctx.globalAlpha;
    if (CW < 0.998) {
      ctx.globalAlpha = a0 * (1 - CW);
      castle(hx, hillY(hx, k) + 1.5 * k, k, p, sg);
      cathedral(W * CX, k, p);
      gateTower(W * GX, k, p);
    }
    if (CW > 0.002) {
      ctx.globalAlpha = a0 * CW;
      acropolis(hx, k, p);
      temple(W * CX, base, Math.min(62 * k, W * 0.24) * 0.62, k, p, 6, 6.5 * k);
      temple(W * GX, base, 11 * k, k, p, 4, 6 * k);
    }
    ctx.globalAlpha = a0;
  }

  /* =====================================================================
   BRIDGE: always leaves the gate tower and crosses the river toward us
   ===================================================================== */
  const SN = 1.7,
    BH = 10,
    VP = 0.6;
  function horizon(k) {
    const q = QH * k,
      yq = base + q,
      yN = H - NB + q * SN;
    return { q, yq, yN, yh: (SN * yq - yN) / (SN - 1) };
  }
  const persp = (y, k) => {
    const h = horizon(k);
    return Math.max(0.6, (y - h.yh) / (h.yq - h.yh));
  };
  function bridgeGeo(k) {
    const { yq, yN, yh } = horizon(k),
      fx = W * GX,
      vp = W * VP,
      fw = Math.max(2.5, 3.2 * k),
      N = 30,
      pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N,
        yW = yq + (yN - yq) * t,
        s = (yW - yh) / (yq - yh),
        x = vp + (fx - vp) * s,
        hm = QH + (BH - QH) * Math.sin(Math.PI * t),
        d = hm * k * s;
      pts.push({ x, yW, s, hw: fw * s, d, yd: yW - d, h: hm });
    }
    return pts;
  }
  const NEAR = {
    medieval: ["#a8987a", "#c9b998"],
    classical: ["#bfa47a", "#e4d5b2"],
    industrial: ["#b3a080", "#d1c1a2"],
    modern: ["#0a0d20", "#3a4470"],
    future: ["#0b0f33", "#3ef2ff"],
  };
  function nearBank(k, era) {
    const [c1, c2] = NEAR[era],
      y = H - NB;
    ctx.fillStyle = c1;
    ctx.fillRect(0, y, W, NB + 2);
    ctx.fillStyle = c2;
    ctx.fillRect(0, y, W, Math.max(1.5, NB * 0.1));
    if (era === "future") return;
    ctx.fillStyle = "rgba(0,0,0,.18)";
    for (let x = 0; x < W; x += Math.max(12, 6 * k * SN)) ctx.fillRect(x, y + NB * 0.25, 1, NB);
  }
  function bat(pts, t) {
    const f = Math.min(0.9999, Math.max(0, t)) * (pts.length - 1),
      i = f | 0,
      u = f - i,
      a = pts[i],
      b = pts[i + 1],
      m = (q) => a[q] + (b[q] - a[q]) * u;
    return { x: m("x"), yW: m("yW"), s: m("s"), hw: m("hw"), d: m("d"), yd: m("yd"), h: m("h") };
  }
  function drawBridge(k, st, T) {
    const pts = bridgeGeo(k);
    const arch = (j) => {
      const ta = 0.06 + (0.88 * j) / st.arches + 0.01,
        tb = 0.06 + (0.88 * (j + 1)) / st.arches - 0.01;
      let first = true;
      for (let u = 0; u <= 1.001; u += 0.08) {
        const q = bat(pts, ta + (tb - ta) * u),
          x = q.x + q.hw,
          y = q.yW - Math.max(0, q.d - 2.2 * k * q.s) * Math.pow(Math.sin(Math.PI * u), 0.8);
        first ? (ctx.moveTo(x, y), (first = false)) : ctx.lineTo(x, y);
      }
      for (let u = 1; u >= -0.001; u -= 0.08) {
        const q = bat(pts, ta + (tb - ta) * u);
        ctx.lineTo(q.x + q.hw, q.yW - 0.01);
      }
      ctx.closePath();
    };
    // side face with the arch openings cut through it, so boats show beneath the bridge
    ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(q.x + q.hw, q.yd) : ctx.moveTo(q.x + q.hw, q.yd)));
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x + pts[i].hw, pts[i].yW);
    ctx.closePath();
    for (let j = 0; j < (st.arches || 0); j++) arch(j);
    ctx.fillStyle = st.side;
    ctx.fill("evenodd");
    if (st.arches) {
      ctx.beginPath();
      for (let j = 0; j < st.arches; j++) arch(j);
      ctx.fillStyle = st.arch;
      ctx.fill();
      ctx.strokeStyle = st.par;
      ctx.globalAlpha *= 0.6;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha /= 0.6;
    }
    ctx.fillStyle = st.deck;
    ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(q.x - q.hw, q.yd) : ctx.moveTo(q.x - q.hw, q.yd)));
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x + pts[i].hw, pts[i].yd);
    ctx.fill();
    ctx.strokeStyle = st.par;
    ctx.lineWidth = 1.2 + pts[13].s * 0.4;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      pts.forEach((q, i) =>
        i ? ctx.lineTo(q.x + sd * q.hw, q.yd - q.s * 0.6) : ctx.moveTo(q.x + sd * q.hw, q.yd - q.s * 0.6),
      );
      ctx.stroke();
    }
    if (st.extra) st.extra(pts, k, T);
  }
  const BRIDGE = {
    medieval: {
      side: "#b9a888",
      deck: "#a39274",
      arch: "rgba(20,30,36,.26)",
      par: "#d6c7a8",
      arches: 5,
      ah: 0.62,
    },
    classical: {
      side: "#dccdaa",
      deck: "#c4b28c",
      arch: "rgba(20,44,52,.26)",
      par: "#f1e6cc",
      arches: 3,
      ah: 0.6,
    },
    industrial: {
      side: "#7f725f",
      deck: "#51483e",
      arch: "rgba(16,12,10,.3)",
      par: "#9d907a",
      arches: 4,
      ah: 0.7,
      extra(pts, k) {
        for (let t = 0.08; t < 0.98; t += 0.15) {
          const q = bat(pts, t);
          for (const sd of [-1, 1]) {
            const x = q.x + sd * q.hw,
              h = 4.6 * k * q.s;
            L(ctx, "#2a2420", Math.max(1, 0.3 * q.s), x, q.yd, x, q.yd - h);
            dot(ctx, x, q.yd - h, Math.max(1.2, 0.5 * k * q.s), "#ffcf7a");
          }
        }
      },
    },
    modern: {
      side: "#2a3050",
      deck: "#1b2038",
      par: "#5a6690",
      arches: 0,
      extra(pts, k, T) {
        ctx.strokeStyle = "#9fb0d6";
        for (const sd of [-1, 1]) {
          ctx.beginPath();
          for (let u = 0; u <= 1.001; u += 0.04) {
            const q = bat(pts, 0.04 + 0.5 * u);
            ctx.lineTo(q.x + sd * q.hw, q.yd - Math.sin(Math.PI * u) * 22 * k * q.s);
          }
          ctx.lineWidth = 1.6;
          ctx.stroke();
          for (let u = 0.1; u < 0.95; u += 0.1) {
            const q = bat(pts, 0.04 + 0.5 * u);
            L(
              ctx,
              "rgba(159,176,214,.55)",
              1,
              q.x + sd * q.hw,
              q.yd,
              q.x + sd * q.hw,
              q.yd - Math.sin(Math.PI * u) * 22 * k * q.s,
            );
          }
        }
        for (let t = 0.02; t < 1; t += 0.05) {
          const q = bat(pts, t);
          dot(ctx, q.x - q.hw, q.yd - q.s, 0.6 + q.s * 0.35, "#ffd27a");
          dot(ctx, q.x + q.hw, q.yd - q.s, 0.6 + q.s * 0.35, "#ffd27a");
        }
        for (let i = 0; i < 10; i++) {
          const up = i % 2,
            t = (((T * 0.05 * (up ? 1 : -1) + i / 10) % 1) + 1) % 1,
            q = bat(pts, t);
          dot(
            ctx,
            q.x + (up ? -1 : 1) * q.hw * 0.4,
            q.yd - q.s * 0.6,
            0.7 + q.s * 0.45,
            up ? "#ff5a4a" : "#fff4d8",
          );
        }
      },
    },
    future: {
      side: "#10164a",
      deck: "#0b1036",
      par: "#3ef2ff",
      arches: 0,
      extra(pts, k, T) {
        const g = ctx.createLinearGradient(0, base, 0, H);
        g.addColorStop(0, "rgba(62,242,255,0)");
        g.addColorStop(1, "rgba(62,242,255,.18)");
        ctx.fillStyle = g;
        ctx.beginPath();
        pts.forEach((q, i) =>
          i ? ctx.lineTo(q.x - q.hw, q.yd - q.d * 1.4) : ctx.moveTo(q.x - q.hw, q.yd - q.d * 1.4),
        );
        for (let i = pts.length - 1; i >= 0; i--)
          ctx.lineTo(pts[i].x + pts[i].hw, pts[i].yd - pts[i].d * 1.4);
        ctx.fill();
        for (let i = 0; i < 14; i++) {
          const t = (T * 0.18 + i / 14) % 1,
            q = bat(pts, t);
          dot(
            ctx,
            q.x + (i % 2 ? -1 : 1) * q.hw * 0.35,
            q.yd - q.s * 0.5,
            0.8 + q.s * 0.5,
            i % 2 ? "#ff3ea5" : "#3ef2ff",
          );
        }
      },
    },
  };

  /* =====================================================================
   1347 · OLD TOWN — timber houses on the quay and up the castle hill
   ===================================================================== */
  const PL = ["#a9bf8e", "#d9876a", "#dba090", "#e6c26e", "#efe3c8", "#cf9a7c", "#c2d4a6", "#ebd88c"],
    TIM = "#4b2f1e",
    TILE = ["#9b4a2c", "#7d3b24", "#a85a36"];
  function mwin(c, r, bx, top, bw, fl, k) {
    const ww = Math.min(bw * 0.48, 1 * k),
      wh = 1.25 * k,
      wx = bx + (bw - ww) / 2,
      wy = top + fl * 0.24,
      sh = pick(r, ["#3f6b4a", "#7a3b2a", "#40607a", "#5a4a2a"]);
    R(c, wx - ww * 0.5, wy, ww * 0.5, wh, sh);
    R(c, wx + ww, wy, ww * 0.5, wh, sh);
    R(c, wx, wy, ww, wh, "#2f2a2b");
    if (r() < 0.4) {
      R(c, wx - 0.1 * k, wy + wh, ww + 0.2 * k, 0.3 * k, "#6b4a2e");
      for (let i = 0; i < 4; i++)
        dot(c, wx + (ww * (i + 0.4)) / 4, wy + wh, 0.25 * k, pick(r, ["#d8343a", "#e85a6a", "#4f7a3a"]));
    }
  }
  function house(c, r, x, wm, k, col, src, gy, maxN, sign) {
    const w = wm * k,
      stone = 3.2 * k,
      fl = 2.8 * k,
      n = Math.min(maxN, 2 + (r() < 0.55 ? 1 : 0)),
      jet = 0.35 * k,
      eaves = r() < 0.4,
      tb = Math.max(1, 0.22 * k);
    R(c, x, gy - stone, w, stone + 8 * k, "#cdb796");
    R(c, x, gy - stone, w, Math.max(1, 0.25 * k), "#b39d7e");
    const dw = 1.6 * k,
      dh = 2.5 * k,
      dx = x + w * (r() < 0.5 ? 0.16 : 0.56);
    const arch = (o, f) => {
      c.fillStyle = f;
      c.beginPath();
      c.moveTo(dx - o, gy);
      c.lineTo(dx - o, gy - dh + dw * 0.5);
      c.arc(dx + dw / 2, gy - dh + dw * 0.5, dw / 2 + o, Math.PI, 0);
      c.lineTo(dx + dw + o, gy);
      c.fill();
    };
    arch(0.3 * k, "#e6d7ba");
    arch(0, "#5a3b24");
    R(c, dx < x + w * 0.5 ? x + w * 0.62 : x + w * 0.12, gy - 2.2 * k, w * 0.26, 1.4 * k, "#2f2a2b");
    let y = gy - stone,
      xl = x,
      xr = x + w;
    for (let i = 0; i < n; i++) {
      xl -= jet;
      xr += jet;
      const top = y - fl;
      R(c, xl, top, xr - xl, fl, col);
      R(c, xl, y - tb, xr - xl, tb, TIM);
      R(c, xl, top, xr - xl, tb, TIM);
      const bays = Math.max(3, Math.round((xr - xl) / (1.3 * k))),
        bw = (xr - xl) / bays,
        wb = bays >= 5 ? [1, bays - 2] : [1];
      for (let j = 0; j <= bays; j++) R(c, xl + j * bw - tb / 2, top, tb, fl, TIM);
      for (let j = 0; j < bays; j++) {
        const bx = xl + j * bw;
        if (wb.includes(j)) mwin(c, r, bx, top, bw, fl, k);
        else if (r() < 0.65) {
          L(c, TIM, tb, bx, y, bx + bw, top);
          if (r() < 0.5) L(c, TIM, tb, bx + bw, y, bx, top);
        }
      }
      y = top;
    }
    const tile = pick(r, TILE);
    if (eaves) {
      const rh = 5.4 * k;
      R(c, xl - 0.5 * k, y - rh, xr - xl + k, rh, tile);
      for (let ty = y - rh + 2; ty < y; ty += Math.max(2.2, 0.5 * k))
        L(c, "rgba(50,20,10,.28)", 1, xl - 0.5 * k, ty, xr + 0.5 * k, ty);
      const m = (xl + xr) / 2;
      R(c, m - 1.2 * k, y - 3 * k, 2.4 * k, 2 * k, col);
      P(c, tile, m - 1.6 * k, y - 2.8 * k, m, y - 4.4 * k, m + 1.6 * k, y - 2.8 * k);
      R(c, m - 0.5 * k, y - 2.6 * k, k, 1.2 * k, "#2d2a2a");
      if (r() < 0.55) {
        const cx = xl + (xr - xl) * (0.15 + r() * 0.7);
        R(c, cx, y - rh - 1.6 * k, 0.9 * k, 2.6 * k, "#8a7a68");
        src.push({
          x: cx + 0.45 * k,
          y: y - rh - 1.6 * k,
          rate: 1.1,
          o: { r0: (1.4 * k) / 10, vx: 6, vy: -9, g: (3.4 * k) / 10, d: 0.3, c: "238,238,232", a: 0.38 },
        });
      }
    } else {
      const gw = xr - xl,
        gh = gw * 0.95,
        m = (xl + xr) / 2;
      P(c, tile, xl - 0.6 * k, y + 0.2 * k, m, y - gh - 0.8 * k, xr + 0.6 * k, y + 0.2 * k);
      P(c, col, xl + 0.2 * k, y, m, y - gh + 0.3 * k, xr - 0.2 * k, y);
      L(c, TIM, tb, m, y, m, y - gh + 0.5 * k);
      const cy = y - gh * 0.45,
        hw = gw * 0.5 * 0.55;
      L(c, TIM, tb, m - hw, cy, m + hw, cy);
      L(c, TIM, tb, xl + gw * 0.14, y, m - gw * 0.18, cy);
      L(c, TIM, tb, xr - gw * 0.14, y, m + gw * 0.18, cy);
      R(c, m - 1.6 * k, y - gh * 0.32, 1 * k, 1.1 * k, "#2f2a2b");
      R(c, m + 0.6 * k, y - gh * 0.32, 1 * k, 1.1 * k, "#2f2a2b");
    }
    if (sign && r() < 0.3) {
      const sy = gy - stone - 0.5 * k;
      L(c, "#222", Math.max(1, 0.15 * k), x + w, sy, x + w + 1.6 * k, sy);
      dot(c, x + w + 1.4 * k, sy + 1.1 * k, 0.6 * k, pick(r, ["#c9a24a", "#3f6b8a", "#a3271b"]));
    }
    return w;
  }
  function hillTrees(c, r, k, z, cols, n, minY) {
    for (let i = 0; i < n; i++) {
      const x = z.g1 + 4 * k + r() * (z.hx + 2.2 * z.sg - z.g1 - 4 * k),
        top = hillY(x, k);
      if (base - top < 5 * k) continue;
      const y = top + 3 * k + r() * (base - top - 3 * k) * (minY || 1);
      if (Math.abs(x - z.hx) < plat(k) && y < top + 12 * k) continue;
      const rr = (2 + r() * 1.6) * k;
      R(c, x - 0.25 * k, y, Math.max(1, 0.5 * k), rr * 1.2, "#4b3423");
      dot(c, x, y, rr, pick(r, cols));
      dot(c, x - rr * 0.35, y - rr * 0.3, rr * 0.45, "rgba(255,255,230,.12)");
    }
  }
  function townWall(c, k, z, col, top) {
    const x0 = W * GX + 4 * k,
      x1 = z.hx - Math.min(44 * k, z.sg * 1.2) / 2,
      wh = 7 * k,
      cs = Math.max(1, 1.3 * k);
    if (x1 <= x0) return;
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x0, base);
    for (let x = x0; x <= x1; x += 3) c.lineTo(x, hillY(x, k) - wh);
    c.lineTo(x1, base);
    c.fill();
    for (let x = x0; x < x1; x += cs * 2) R(c, x, hillY(x, k) - wh - cs, cs, cs, col);
    c.fillStyle = top;
    c.beginPath();
    for (let x = x0; x <= x1; x += 3) c.lineTo(x, hillY(x, k) - wh);
    c.lineTo(x1, hillY(x1, k) - wh + Math.max(1, 0.6 * k));
    for (let x = x1; x >= x0; x -= 3) c.lineTo(x, hillY(x, k) - wh + Math.max(1, 0.6 * k));
    c.fill();
    for (const f of [0.35, 0.7]) {
      const tx = x0 + (x1 - x0) * f,
        ty = hillY(tx, k);
      R(c, tx - 3 * k, ty - 12 * k, 6 * k, 12 * k + 8 * k, col);
      for (let i = 0; i < 3; i++) R(c, tx - 3 * k + i * 2.4 * k, ty - 12 * k - cs, cs, cs, col);
      P(c, "#5d6573", tx - 3.6 * k, ty - 12 * k - cs, tx, ty - 19 * k, tx + 3.6 * k, ty - 12 * k - cs);
    }
  }
  function slopeRows(z, fn) {
    for (const frac of [0.86, 0.72, 0.58, 0.44, 0.3, 0.16])
      for (let x = Math.max(z.hx - 2.2 * z.sg, z.g1 + 2); x < z.hx + 2 * z.sg; ) x += fn(x, frac);
  }
  const castleClear = (z, k) => plat(k) + 3 * k;
  function buildMedieval() {
    const k = S / ERA.medieval.zoom,
      Lr = layer(base - TOP, TOP + 2),
      c = Lr.c,
      r = rng(301),
      src = [],
      z = zones(k);
    const far = (x) => base - S * (0.3 + 0.05 * Math.sin((x / W) * 5 + 1) + 0.03 * Math.sin((x / W) * 11));
    c.fillStyle = "#a3bac8";
    c.beginPath();
    c.moveTo(0, base);
    for (let x = 0; x <= W + 16; x += 12) c.lineTo(x, far(x));
    c.lineTo(W, base);
    c.fill();
    const ridge = (x) => far(x) + S * 0.08 + Math.sin((x / W) * 7) * S * 0.02;
    c.fillStyle = "#93ab8e";
    c.beginPath();
    c.moveTo(0, base);
    for (let x = 0; x <= W + 16; x += 12) c.lineTo(x, ridge(x));
    c.lineTo(W, base);
    c.fill();
    for (let x = 0; x < W; x += 6 + r() * 14)
      dot(c, x, ridge(x) + S * 0.012 + r() * S * 0.035, (1.2 + r() * 1.4) * k * 0.5, "#6f8c68");
    {
      const mx = W * 0.08,
        my = ridge(mx) + 1.2 * k;
      c.fillStyle = "#93ab8e";
      c.beginPath();
      c.ellipse(mx, my + 0.6 * k, 4 * k, 1.6 * k, 0, Math.PI, 0);
      c.fill();
      P(c, "#8a7a64", mx - 2 * k, my, mx - 1.2 * k, my - 7 * k, mx + 1.2 * k, my - 7 * k, mx + 2 * k, my);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + 0.4;
        L(
          c,
          "#5b4a38",
          Math.max(1, 0.3 * k),
          mx,
          my - 7 * k,
          mx + Math.cos(a) * 5 * k,
          my - 7 * k + Math.sin(a) * 5 * k,
        );
      }
    }
    for (let x = -10; x < W; ) {
      const wm = 6 + r() * 3;
      house(c, r, x, wm, k * 0.8, pick(r, PL), src, base - 4 * k, 2, false);
      x += wm * k * 0.8;
    }
    haze(c, "219,233,241", 0.22);
    townWall(c, k, z, "#c4b493", "#ddd0b2");
    const Mr = layer(base - TOP, TOP + 2),
      m = Mr.c;
    hillTrees(m, r, k, z, ["#6f8c58", "#5f7d4c", "#7f9a62"], 70, 0.9);
    slopeRows(z, (x, frac) => {
      const wm = 6 + r() * 3,
        w = wm * k,
        xm = x + w / 2,
        hh = base - hillY(xm, k);
      if (hh * frac > 9 * k && (Math.abs(xm - z.hx) > castleClear(z, k) || frac < 0.62) && r() < 0.85)
        house(m, r, x, wm, k, pick(r, PL), src, base - hh * frac + 2 * k, frac > 0.5 ? 1 : 2, false);
      return w * (0.8 + r() * 0.5);
    });
    for (let x = -8 * k; x < W + 8 * k; ) {
      const wm = 6.5 + r() * 2.8,
        w = wm * k;
      if (!blocked(z, x, w, 20 * k)) house(m, r, x, wm, k, pick(r, PL), src, base, 3, true);
      else if (x + w > z.c0 && x < z.c1 && !(x + w > z.g0 && x < z.g1))
        house(m, r, x, wm, k, pick(r, PL), src, base, 1, false);
      x += w;
    }
    const F = layer(base - S * 0.3, S * 0.3 + G + 2),
      f = F.c,
      q = QH * k;
    R(f, 0, base, W, q, "#a8987a");
    R(f, 0, base, W, Math.max(1, 0.5 * k), "#c9b998");
    for (let y = base + 1.2 * k; y < base + q; y += 1.2 * k)
      for (let x = (((y / (1.2 * k)) | 0) % 2) * 1.5 * k; x < W; x += 3 * k)
        R(f, x, y, 1, 1.2 * k, "rgba(80,66,50,.3)");
    R(f, 0, base + q - 1, W, 2, "rgba(30,40,46,.35)");
    for (const bx of [W * 0.12, W * 0.7]) {
      const bl = 14 * k,
        y = wy(k, 0.14);
      P(f, "#4b3423", bx, y, bx + bl, y, bx + bl * 0.9, y + 2 * k, bx + bl * 0.12, y + 2 * k);
      L(f, "#4b3423", Math.max(1, 0.3 * k), bx + bl * 0.5, y, bx + bl * 0.5, y - 11 * k);
      R(f, bx + bl * 0.2, y - 9 * k, bl * 0.6, Math.max(1, 0.8 * k), "#d8cdb4");
    }
    return { bg: Lr, mid: Mr, fg: F, src, k, smoke: [] };
  }
  function dynMedieval(d, T) {
    drawParts(d.smoke);
    ctx.strokeStyle = "#2e2017";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const bx = ((T * (16 + i * 4) + i * 170) % (W + 80)) - 40,
        by = base - S * (0.95 + i * 0.06) + Math.sin(T + i) * 6,
        fl = Math.sin(T * 6 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(bx - 6, by - fl);
      ctx.quadraticCurveTo(bx - 2, by - 3, bx, by);
      ctx.quadraticCurveTo(bx + 2, by - 3, bx + 6, by - fl);
      ctx.stroke();
    }
  }
  function dynWMedieval(d, T) {
    const y0 = wy(d.k, 0.5),
      k = d.k * persp(y0, d.k) * 0.85,
      bl = 16 * k,
      span = W + bl * 3,
      x = ((T * 9) % span) - bl * 1.5,
      y = y0;
    P(ctx, "#4b3423", x, y, x + bl, y, x + bl * 0.88, y + 2.4 * k, x + bl * 0.1, y + 2.4 * k);
    L(ctx, "#3a2a1c", Math.max(1, 0.35 * k), x + bl * 0.5, y, x + bl * 0.5, y - 8 * k);
    const sw = Math.sin(T * 1.2) * 0.5 * k;
    P(
      ctx,
      "#eadfc6",
      x + bl * 0.22,
      y - 7.4 * k,
      x + bl * 0.78 + sw,
      y - 7.4 * k,
      x + bl * 0.76 + sw * 1.5,
      y - 2.4 * k,
      x + bl * 0.24,
      y - 2.4 * k,
    );
    R(ctx, x + bl * 0.22, y - 5.2 * k, bl * 0.56, Math.max(1, 0.8 * k), "#a3271b");
    ctx.strokeStyle = "rgba(235,240,240,.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 2 * k);
    ctx.lineTo(x - bl * 0.8, y + 3 * k);
    ctx.stroke();
  }

  /* =====================================================================
   1888 · THE WORKS — brick, soot and steam, all engraved in one hatch
   ===================================================================== */
  function chimney(c, x, h, w, col) {
    P(
      c,
      col,
      x - w / 2 - w * 0.15,
      base,
      x - w / 2,
      base - h,
      x + w / 2,
      base - h,
      x + w / 2 + w * 0.15,
      base,
    );
    R(c, x - w / 2 - w * 0.14, base - h, w * 1.28, Math.max(2, w * 0.4), col);
  }
  function sawtooth(c, x, w, h, col) {
    const y = base - h,
      n = Math.max(2, Math.round(w / 16)),
      st = w / n;
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x, base);
    c.lineTo(x, y);
    for (let i = 0; i < n; i++) {
      c.lineTo(x + i * st + st, y - st * 0.55);
      c.lineTo(x + i * st + st, y);
    }
    c.lineTo(x + w, base);
    c.fill();
  }
  function mill(c, r, x, w, h, k) {
    R(c, x, base - h, w, h, "#5c3c2e");
    P(c, "#3e2a22", x - 2, base - h, x + w / 2, base - h - w * 0.1, x + w + 2, base - h);
    const fh = 3.6 * k;
    for (let y = base - h + fh * 0.6; y < base - fh * 0.6; y += fh)
      for (let xx = x + 2.2 * k; xx < x + w - 2 * k; xx += 3 * k) {
        c.fillStyle = r() < 0.3 ? "#f0b060" : "#2c1e18";
        c.fillRect(xx, y, Math.max(1, 1.3 * k), fh * 0.5);
      }
  }
  function gasholder(c, cx, k) {
    const rr = 24 * k,
      h = 30 * k,
      lw = Math.max(1, 0.5 * k);
    R(c, cx - rr, base - h * 0.62, rr * 2, h * 0.62, "#4b3a30");
    c.fillStyle = "#55433a";
    c.beginPath();
    c.ellipse(cx, base - h * 0.62, rr, 3 * k, 0, Math.PI, 0);
    c.fill();
    for (let i = 0; i <= 8; i++) {
      const x = cx - rr + (i * rr) / 4;
      L(c, "#2c211b", lw * 1.6, x, base, x, base - h);
    }
    for (let j = 1; j <= 3; j++)
      L(c, "#2c211b", lw * 1.4, cx - rr, base - (h * j) / 3, cx + rr, base - (h * j) / 3);
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 3; j++) {
        const x = cx - rr + (i * rr) / 4,
          y = base - (h * j) / 3;
        L(c, "#2c211b", lw, x, y, x + rr / 4, y - h / 3);
        L(c, "#2c211b", lw, x + rr / 4, y, x, y - h / 3);
      }
  }
  function terrace(c, r, x, w, gy, k) {
    const h = 8 * k;
    R(c, x, gy - h, w, h + 8 * k, "#6a3b2b");
    P(
      c,
      "#3c3536",
      x - 1,
      gy - h,
      x + 1.6 * k,
      gy - h - 3 * k,
      x + w - 1.6 * k,
      gy - h - 3 * k,
      x + w + 1,
      gy - h,
    );
    for (let xx = x + 2 * k; xx < x + w - 1 * k; xx += 4.5 * k) {
      R(c, xx + 1.8 * k, gy - h - 4.4 * k, Math.max(1.5, 1.1 * k), 1.6 * k, "#4a2c22");
      for (const fy of [gy - h + 1 * k, gy - h + 4.4 * k])
        R(c, xx, fy, Math.max(1, k), Math.max(1.5, 1.6 * k), r() < 0.25 ? "#f0b060" : "#2a1d18");
      R(c, xx + 2.2 * k, gy - 2.2 * k, Math.max(1, k), 2.2 * k, "#2a1d18");
    }
  }
  function warehouse(c, r, x, w, h, k) {
    R(c, x, base - h, w, h, "#6e3f2e");
    P(c, "#3b2c26", x - 1, base - h, x + w / 2, base - h - w * 0.16, x + w + 1, base - h);
    const fh = 3.6 * k;
    for (let y = base - h + fh * 0.5; y < base - fh * 0.4; y += fh) {
      for (let xx = x + 1.6 * k; xx < x + w - 1.4 * k; xx += 3 * k) {
        if (Math.abs(xx - (x + w / 2)) < 1.6 * k) continue;
        c.fillStyle = r() < 0.25 ? "#f0b060" : "#2c1e18";
        c.fillRect(xx, y, Math.max(1, 1.2 * k), fh * 0.5);
      }
      R(c, x + w / 2 - 1 * k, y - 0.2 * k, 2 * k, fh * 0.7, "#2a1d18");
    }
    L(c, "#2a1d18", Math.max(1, 0.4 * k), x + w / 2, base - h - w * 0.1, x + w / 2, base - h + 2 * k);
  }
  function townHall(c, r, x, w, k) {
    const h = 24 * k,
      face = "#9a5a40",
      band = "#d8c6a6";
    R(c, x, base - h, w, h, face);
    for (let y = base - h + 3.6 * k; y < base; y += 3.6 * k) {
      R(c, x, y, w, Math.max(1, 0.4 * k), band);
      for (let xx = x + 1.6 * k; xx < x + w - 1.4 * k; xx += 3 * k)
        R(c, xx, y - 2.8 * k, Math.max(1, 1.1 * k), 1.8 * k, r() < 0.3 ? "#f4c470" : "#3a2622");
    }
    P(
      c,
      "#46474f",
      x - k,
      base - h,
      x + w + k,
      base - h,
      x + w - 3 * k,
      base - h - 6 * k,
      x + 3 * k,
      base - h - 6 * k,
    );
    const m = x + w / 2;
    R(c, m - 3 * k, base - h - 12 * k, 6 * k, 8 * k, face);
    P(c, "#46474f", m - 3.6 * k, base - h - 12 * k, m, base - h - 17 * k, m + 3.6 * k, base - h - 12 * k);
    L(c, "#2a2a2a", Math.max(1, 0.3 * k), m, base - h - 17 * k, m, base - h - 23 * k);
    return [m, base - h - 23 * k];
  }
  function buildIndustrial() {
    const k = S / ERA.industrial.zoom,
      Lr = layer(base - TOP, TOP + 2),
      c = Lr.c,
      r = rng(201),
      src = [],
      flags = [],
      kf = k * 0.55,
      z = zones(k);
    for (let row = 0; row < 3; row++)
      for (let x = -20; x < W; ) {
        const w = (7 + r() * 12) * kf,
          h = (7 + r() * 10) * kf + (2 - row) * 16 * kf,
          col = ["#a69582", "#9a8877", "#8f7d6c"][row];
        R(c, x, base - h, w, h, col);
        P(c, col, x - 1, base - h, x + w / 2, base - h - w * 0.4, x + w + 1, base - h);
        x += w;
      }
    for (let i = 0; i < 26; i++) {
      const x = r() * W,
        h = (28 + r() * 40) * kf * 1.6,
        w = Math.max(1.5, 2.6 * kf * 1.5);
      for (let j = 0; j < 16; j++)
        dot(
          c,
          x + j * j * 0.3 * kf * 1.5 + j * 2.2,
          base - h - j * 3 * kf * 1.5,
          (2 + j * 1.5) * kf * 1.4,
          `rgba(62,52,46,${(0.2 * (1 - j / 16)).toFixed(3)})`,
        );
      chimney(c, x, h, w, "#7a6858");
    }
    haze(c, "220,194,150", 0.32);
    for (let x = -20; x < W; ) {
      const w = (40 + r() * 60) * k * 0.7,
        h = (10 + r() * 10) * k * 0.7;
      sawtooth(c, x, w, h, "#6a4a3a");
      x += w + r() * 10;
    }
    for (const fx of [0.07, 0.42, 0.62])
      mill(c, r, W * fx - 20 * k, (40 + r() * 20) * k, (20 + r() * 8) * k, k);
    gasholder(c, W * 0.98, k * 0.8);
    const vy = base - 17 * k,
      vx0 = W * 0.3,
      vx1 = z.hx - z.sg * 0.9; // railway viaduct, ending in a tunnel under the castle hill
    R(c, vx0, vy, vx1 - vx0, 3 * k, "#5a3d30");
    c.save();
    c.beginPath();
    c.rect(vx0, vy, vx1 - vx0, 17 * k);
    c.clip();
    for (let x = vx0; x < vx1; x += 11 * k) {
      R(c, x, vy, 2.4 * k, 17 * k, "#5a3d30");
      c.fillStyle = "#5a3d30";
      c.fillRect(x, vy + 3 * k, 11 * k, 3 * k);
      c.beginPath();
      c.moveTo(x + 2.4 * k, vy + 6 * k);
      c.lineTo(x + 11 * k, vy + 6 * k);
      c.lineTo(x + 11 * k, vy + 9 * k);
      c.quadraticCurveTo(x + 6.7 * k, vy + 6.2 * k, x + 2.4 * k, vy + 9 * k);
      c.fill();
    }
    c.restore();
    const sm = { r0: (2.5 * k) / 4, vx: 14, vy: -15, g: (6 * k) / 4, d: 0.13, c: "50,42,38", a: 0.42 };
    for (const fx of [0.05, 0.17, 0.38, 0.6, 0.68, 0.9]) {
      const x = W * fx + (r() - 0.5) * 16,
        h = (62 + r() * 24) * k,
        w = Math.max(4, 4.6 * k);
      chimney(c, x, h, w, "#4a352b");
      src.push({ x, y: base - h, rate: 3.2, o: sm });
    }
    townWall(c, k, z, "#7c6e5c", "#948670");
    hatchOver(c);
    const Mr = layer(base - TOP, TOP + 2),
      m = Mr.c;
    hillTrees(m, r, k, z, ["#4d4f36", "#585a3d", "#43452f"], 80, 0.9);
    slopeRows(z, (x, frac) => {
      const w = (14 + r() * 8) * k,
        xm = x + w / 2,
        hh = base - hillY(xm, k);
      if (hh * frac > 8 * k && (Math.abs(xm - z.hx) > castleClear(z, k) || frac < 0.62))
        terrace(m, r, x, w, base - hh * frac + 2 * k, k);
      return w + 2 * k;
    });
    const th = Math.min(48 * k, W * 0.16),
      tx = W * 0.02;
    flags.push(townHall(m, r, tx, th, k));
    for (let x = tx + th + 3 * k; x < W; ) {
      const w = (18 + r() * 16) * k,
        h = (13 + r() * 7) * k;
      if (!blocked(z, x, w, h) && !(x + w > z.hx - z.sg * 1.2 && x < z.hx + z.sg * 1.2))
        warehouse(m, r, x, w, h, k);
      else if (x + w > z.c0 && x < z.c1 && !(x + w > z.g0 && x < z.g1)) terrace(m, r, x, w, base, k);
      x += w + (1 + r() * 3) * k;
    }
    hatchOver(m);
    const F = layer(base - S * 0.3, S * 0.3 + G + 2),
      f = F.c,
      q = QH * k;
    R(f, 0, base - 1.4 * k, W, q + 1.4 * k, "#b3a080");
    R(f, 0, base - 1.8 * k, W, 0.8 * k, "#d1c1a2");
    for (let y = base; y < base + q; y += Math.max(3, 1.1 * k))
      for (let x = (((y / 3) | 0) % 2) * 8; x < W; x += 16)
        R(f, x, y, 1, Math.max(3, 1.1 * k), "rgba(80,66,50,.35)");
    for (let x = 10; x < W; x += 15 * k) {
      if (Math.abs(x - W * GX) < 10 * k) continue;
      R(f, x - 0.15 * k, base - 6 * k, Math.max(1, 0.3 * k), 4.6 * k, "#222");
      dot(f, x, base - 6 * k, Math.max(1, 0.35 * k), "#ffcf7a");
    }
    hatchOver(f);
    return {
      bg: Lr,
      mid: Mr,
      fg: F,
      src,
      flags,
      k,
      viaduct: { x0: vx0, x1: vx1, y: vy },
      smoke: [],
      smokeW: [],
    };
  }
  function dynIndustrial(d, T, dt) {
    drawParts(d.smoke);
    const k = d.k,
      v = d.viaduct,
      len = v.x1 - v.x0,
      tl = Math.min(60 * k, len * 0.4),
      x = v.x0 + ((T * 20) % (len + tl)) - tl;
    ctx.save();
    ctx.beginPath();
    ctx.rect(v.x0, v.y - 20 * k, len, 20 * k);
    ctx.clip();
    R(ctx, x + tl * 0.72, v.y - 4 * k, tl * 0.28, 4 * k, "#221a16");
    R(ctx, x + tl * 0.94, v.y - 7 * k, 1.6 * k, 3 * k, "#221a16");
    for (let i = 0; i < 3; i++) R(ctx, x + i * tl * 0.24, v.y - 3.4 * k, tl * 0.22, 3.4 * k, "#3b2a22");
    ctx.restore();
    if (!reduce && x > v.x0 && x + tl < v.x1 && Math.random() < dt * 6)
      emit(d.smoke, x + tl * 0.95, v.y - 7 * k, {
        r0: (1.5 * k) / 3,
        vx: -8,
        vy: -12,
        g: (4 * k) / 3,
        d: 0.35,
        c: "232,226,214",
        a: 0.55,
      });
    for (const [fx, fy] of d.flags) {
      ctx.fillStyle = "#b8322a";
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      for (let i = 0; i <= 6; i++) ctx.lineTo(fx + i * 1.6, fy + Math.sin(T * 4 + i * 0.9) * 1.2);
      for (let i = 6; i >= 0; i--) ctx.lineTo(fx + i * 1.6, fy + 5 + Math.sin(T * 4 + i * 0.9) * 1.2);
      ctx.fill();
    }
  }
  function dynWIndustrial(d, T, dt) {
    const y = wy(d.k, 0.5),
      k = d.k * persp(y, d.k) * 0.7,
      Ls = Math.min(40 * k, W * 0.2),
      span = W + Ls * 3,
      x = W - (((T * 14) % span) - Ls * 1.5);
    P(
      ctx,
      "#1c1714",
      x,
      y - 3 * k,
      x + Ls,
      y - 3 * k,
      x + Ls * 0.94,
      y + 1.4 * k,
      x + Ls * 0.05,
      y + 1.4 * k,
    );
    R(ctx, x + Ls * 0.05, y, Ls * 0.89, 0.9 * k, "#7a2a1e");
    R(ctx, x + Ls * 0.14, y - 6 * k, Ls * 0.64, 3 * k, "#e6dccb");
    ctx.fillStyle = "#e9dfca";
    ctx.beginPath();
    ctx.arc(x + Ls * 0.5, y - 3 * k, 4.4 * k, Math.PI, 0);
    ctx.fill();
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i * Math.PI) / 6;
      L(
        ctx,
        "#6d5f4e",
        1,
        x + Ls * 0.5,
        y - 3 * k,
        x + Ls * 0.5 + Math.cos(a) * 4.2 * k,
        y - 3 * k + Math.sin(a) * 4.2 * k,
      );
    }
    R(ctx, x + Ls * 0.6, y - 10 * k, 2.2 * k, 4 * k, "#2a221e");
    R(ctx, x + Ls * 0.6, y - 10 * k, 2.2 * k, 1 * k, "#c9a24a");
    ctx.strokeStyle = "rgba(235,228,212,.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + Ls, y + 1);
    ctx.lineTo(x + Ls * 1.6, y + 3);
    ctx.stroke();
    if (!reduce && Math.random() < dt * 5)
      emit(d.smokeW, x + Ls * 0.6 + 1.1 * k, y - 10 * k, {
        r0: (2 * k) / 4,
        vx: 10,
        vy: -12,
        g: (5 * k) / 4,
        d: 0.25,
        c: "45,38,34",
        a: 0.5,
      });
    drawParts(d.smokeW);
  }

  /* =====================================================================
   2026 · MIDTOWN — dusk, glass and Deco setbacks around the old core
   ===================================================================== */
  function nycFloors(c, r, x, y, w, h, k, p, warm) {
    const fh = Math.max(2.3, 3.9 * k),
      ww = Math.max(1, 1.5 * k),
      g = Math.max(1.1, 1.4 * k);
    for (let yy = y + fh * 0.5; yy < y + h - fh * 0.7; yy += fh) {
      if (r() < 0.1) continue;
      for (let xx = x + g; xx < x + w - ww - 0.5; xx += ww + g)
        if (r() < p) {
          const q = r();
          c.fillStyle = warm
            ? q < 0.6
              ? "#ffd27a"
              : q < 0.88
                ? "#ffe9b8"
                : "#f2ad55"
            : q < 0.6
              ? "#d6e6ff"
              : q < 0.88
                ? "#aec9ff"
                : "#ffffff";
          c.fillRect(xx, yy, ww, fh * 0.5);
        }
    }
  }
  function tower(c, r, x, w, h, k, bl) {
    const body = pick(r, ["#1b2040", "#212848", "#252c4e", "#191d38"]),
      warm = r() < 0.72,
      p = 0.18 + r() * 0.5,
      t = r();
    let top = base - h,
      tx = x + w / 2;
    if (t < 0.3) {
      const h1 = h * 0.78,
        w2 = w * 0.7,
        x2 = x + (w - w2) / 2;
      R(c, x, base - h1, w, h1, body);
      R(c, x2, top, w2, h - h1, body);
      nycFloors(c, r, x, base - h1, w, h1, k, p, warm);
      nycFloors(c, r, x2, top, w2, h - h1, k, p, warm);
    } else {
      R(c, x, top, w, h, body);
      nycFloors(c, r, x, top, w, h, k, p, warm);
      if (t < 0.42) {
        P(c, body, x, top, x + w, top, x + w, top - w * 0.45);
        top -= w * 0.45;
        tx = x + w - 1;
      } else if (t < 0.54)
        R(c, x, top, w, Math.max(2, 3 * k), warm ? "rgba(255,224,160,.45)" : "rgba(210,226,255,.4)");
    }
    if (t >= 0.42 && r() < 0.3) {
      R(c, tx - 0.6, top - h * 0.1, 1.2, h * 0.1, "#5a6288");
      top -= h * 0.1;
    }
    if (r() < 0.55) bl.push([tx, top - 1.5, r() * 6, "#ff3b30"]);
  }
  function floodTiers(c, cx, k, tiers, body, h0, h1, rgb, a) {
    c.save();
    c.beginPath();
    for (const [w, b0, b1] of tiers) c.rect(cx - (w * k) / 2, base - b1 * k, w * k, (b1 - b0) * k);
    c.clip();
    const g = c.createLinearGradient(0, base - h0 * k, 0, base - h1 * k);
    g.addColorStop(0, `rgba(${rgb},0)`);
    g.addColorStop(1, `rgba(${rgb},${a})`);
    c.fillStyle = g;
    c.fillRect(cx - 60 * k, base - h1 * k, 120 * k, (h1 - h0) * k);
    c.restore();
  }
  function decoTower(c, cx, k) {
    const b = "#262b49",
      r = rng(9),
      T = (w, h0, h1) => R(c, cx - (w * k) / 2, base - h1 * k, w * k, (h1 - h0) * k, b);
    const tiers = [
      [110, 0, 24],
      [84, 24, 82],
      [56, 82, 300],
      [52, 300, 314],
      [46, 314, 328],
      [38, 328, 344],
      [28, 344, 360],
      [18, 360, 374],
    ];
    for (const t of tiers) T(...t);
    for (const [w, h0, h1] of tiers)
      nycFloors(c, r, cx - (w * k) / 2, base - h1 * k, w * k, (h1 - h0) * k, k, h0 >= 300 ? 0.62 : 0.5, true);
    floodTiers(c, cx, k, tiers, b, 250, 374, "255,214,140", 0.55);
    P(c, "#3a4060", cx - 5 * k, base - 374 * k, cx, base - 396 * k, cx + 5 * k, base - 374 * k);
    P(c, "rgba(255,224,160,.5)", cx - 5 * k, base - 374 * k, cx, base - 396 * k, cx, base - 374 * k);
    R(c, cx - 0.6 * k, base - 425 * k, 1.2 * k, 30 * k, "#8a93b5");
  }
  function crownTower(c, cx, k) {
    const b = "#252b48";
    R(c, cx - 28 * k, base - 200 * k, 56 * k, 200 * k, b);
    nycFloors(c, rng(3), cx - 28 * k, base - 200 * k, 56 * k, 200 * k, k, 0.45, true);
    const g = c.createLinearGradient(cx - 28 * k, 0, cx + 28 * k, 0);
    g.addColorStop(0, "#2c3354");
    g.addColorStop(0.45, "#6f7898");
    g.addColorStop(0.55, "#7c85a4");
    g.addColorStop(1, "#2a3150");
    // The crown's steel bleeds down over the top floors, so the body fades into the crown instead of meeting it at a seam
    const f0 = base - 150 * k,
      f1 = base - 200 * k,
      step = Math.max(1, k * 0.8);
    c.save();
    c.fillStyle = g;
    for (let y = f0; y > f1; y -= step) {
      const t = (f0 - y) / (f0 - f1);
      c.globalAlpha = t * t * 0.92;
      c.fillRect(cx - 28 * k, y - step, 56 * k, step + 0.5);
    }
    c.restore();
    for (let i = 0; i < 6; i++) {
      const w = (56 - i * 7.5) * k,
        y = base - (200 + i * 9) * k,
        ah = Math.min(w * 0.5, 14 * k);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(cx - w / 2, y);
      c.lineTo(cx - w / 2, y - ah * 0.45);
      c.quadraticCurveTo(cx - w / 2, y - ah, cx, y - ah);
      c.quadraticCurveTo(cx + w / 2, y - ah, cx + w / 2, y - ah * 0.45);
      c.lineTo(cx + w / 2, y);
      c.fill();
      const n = Math.max(3, Math.round(w / (9 * k)));
      c.fillStyle = "rgba(255,226,160,.85)";
      for (let j = 0; j < n; j++) {
        const tx = cx - w / 2 + (w * (j + 0.5)) / n,
          ty = y - ah * 0.3 - Math.sin((Math.PI * (j + 0.5)) / n) * ah * 0.4;
        c.beginPath();
        c.moveTo(tx - 1.2 * k, ty + 2 * k);
        c.lineTo(tx, ty - 1.6 * k);
        c.lineTo(tx + 1.2 * k, ty + 2 * k);
        c.fill();
      }
    }
    P(c, "#6f7898", cx - 3 * k, base - 252 * k, cx, base - 285 * k, cx + 3 * k, base - 252 * k);
  }
  function glassSpire(c, cx, k) {
    const p = [
      cx - 32 * k,
      base,
      cx - 20 * k,
      base - 392 * k,
      cx + 16 * k,
      base - 396 * k,
      cx + 30 * k,
      base,
    ];
    P(c, "#1f2547", ...p);
    c.save();
    path(c, p);
    c.clip();
    nycFloors(c, rng(5), cx - 32 * k, base - 396 * k, 62 * k, 396 * k, k, 0.3, false);
    P(
      c,
      "rgba(150,170,230,.18)",
      cx - 2 * k,
      base,
      cx - 4 * k,
      base - 394 * k,
      cx + 16 * k,
      base - 396 * k,
      cx + 30 * k,
      base,
    );
    c.restore();
    R(c, cx - 19 * k, base - 396 * k, 35 * k, 2 * k, "rgba(170,190,240,.55)");
    R(c, cx + 3 * k, base - 430 * k, 1.2 * k, 34 * k, "#8a93b5");
  }
  function slantTower(c, cx, k) {
    const p = [
      cx - 30 * k,
      base,
      cx - 30 * k,
      base - 350 * k,
      cx + 30 * k,
      base - 378 * k,
      cx + 30 * k,
      base,
    ];
    P(c, "#1d2344", ...p);
    c.save();
    path(c, p);
    c.clip();
    nycFloors(c, rng(14), cx - 30 * k, base - 378 * k, 60 * k, 378 * k, k, 0.35, false);
    c.restore();
  }
  function buildModern() {
    const k = S / ERA.modern.zoom,
      Lr = layer(base - TOP, TOP + 2),
      c = Lr.c,
      r = rng(101),
      bl = [],
      z = zones(k);
    for (let x = -10; x < W; ) {
      const w = (10 + r() * 26) * k * 1.6,
        h = (18 + r() * 60) * k;
      R(c, x, base - h, w, h, "#353e6a");
      nycFloors(c, r, x, base - h, w, h, k * 0.7, 0.12, r() < 0.7);
      x += w + r() * 4;
    }
    haze(c, "232,154,116", 0.2);
    for (let x = -20; x < W; ) {
      const w = (22 + r() * 32) * k,
        h = (80 + r() * 130) * k;
      tower(c, r, x, w, h, k, bl);
      x += w + (8 + r() * 22) * k;
    }
    haze(c, "50,60,110", 0.14);
    glassSpire(c, W * 0.15, k);
    crownTower(c, W * 0.09, k);
    slantTower(c, W * 0.93, k);
    for (let x = -20; x < W; ) {
      const w = (18 + r() * 30) * k,
        h = (50 + r() * 95) * k;
      if (Math.abs(x + w / 2 - W * 0.64) > 65 * k) tower(c, r, x, w, h, k, bl);
      x += w + (6 + r() * 24) * k;
    }
    decoTower(c, W * 0.64, k);
    const Mr = layer(base - TOP, TOP + 2),
      m = Mr.c;
    for (let x = -10; x < W; ) {
      const w = (16 + r() * 40) * k,
        h = (10 + r() * 38) * k;
      if (!blocked(z, x, w, h) && !(x + w > z.hx - z.sg * 1.6 && x < z.hx + z.sg * 1.6)) {
        R(m, x, base - h, w, h, pick(r, ["#141831", "#1a1e3a", "#221c2e"]));
        nycFloors(m, r, x, base - h, w, h, k, 0.55, true);
      }
      x += w + r() * 3;
    }
    for (let i = 0; i < 70; i++) {
      const x = z.hx + (r() * 2 - 1) * z.sg * 1.8,
        top = hillY(x, k);
      if (base - top < 4 * k) continue;
      const y = top + r() * (base - top) * 0.85 + 2 * k;
      if (Math.abs(x - z.hx) < castleClear(z, k) - 6 * k && y < top + 14 * k) continue;
      dot(m, x, y, (3 + r() * 3) * k, pick(r, ["#121a30", "#16203a", "#0f1628"]));
      if (r() < 0.25) dot(m, x + 2 * k, y + 2 * k, Math.max(0.8, 0.6 * k), "#ffd27a");
    }
    const F = layer(base - S * 0.3, S * 0.3 + G + 2),
      f = F.c,
      q = QH * k;
    R(f, 0, base - 1, W, q + 1, "#0a0d20");
    R(f, 0, base - 1, W, 1, "#2a3256");
    for (let x = 4; x < W; x += 9 + r() * 7) R(f, x, base - 1.5, 1.6, 1.6, "#ffcf7a");
    for (let i = 0; i < 5; i++) {
      const x = W * (0.06 + i * 0.2) + r() * 20,
        w = (34 + r() * 30) * k;
      if (Math.abs(x + w / 2 - W * GX) < 60) continue;
      R(f, x, base, w, q + G * 0.08, "#0d1126");
      R(f, x + 2, base - 6 * k, w - 4, 6 * k, "#181d3a");
      for (let xx = x + 4; xx < x + w - 4; xx += 5) R(f, xx, base - 4 * k, 2, 1.5, "#ffe0a0");
    }
    return {
      bg: Lr,
      mid: Mr,
      fg: F,
      bl,
      k,
      ferries: [
        { v: 20, o: 0.15, y: 0.42 },
        { v: -14, o: 0.65, y: 0.75 },
      ],
    };
  }
  /* Airliner crossing the dusk sky above Midtown, left to right, with a contrail and blinking lights.
     Side profile, nose to the right; s = fuselage length in px, part coordinates are fractions of s. */
  function airplane(T) {
    const s = Math.max(44, S * 0.2),
      span = W + s * 6,
      px = reduce ? W * 0.62 : ((T * 46) % span) - s * 3,
      py = Math.max(76, base - S * 1.56) + Math.sin(T * 0.7) * S * 0.012,
      body = "#161b36",
      lit = "#f3b58c",
      glass = "#ffe6c2";
    // contrail fading out behind the engine
    const g = ctx.createLinearGradient(px - s * 4.2, 0, px - s * 0.3, 0);
    g.addColorStop(0, "rgba(255,232,214,0)");
    g.addColorStop(1, "rgba(255,232,214,0.55)");
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(1.5, s * 0.03);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(px - s * 4.2, py + s * 0.182);
    ctx.lineTo(px - s * 0.3, py + s * 0.182);
    ctx.stroke();

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(s, s);
    ctx.lineJoin = "round";
    const poly = (f, ...p) => {
      ctx.fillStyle = f;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
      ctx.closePath();
      ctx.fill();
    };
    const litEdge = (x0, y0, x1, y1) => {
      ctx.strokeStyle = "rgba(243,181,140,0.6)";
      ctx.lineWidth = 0.006;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    };
    const hull = () => {
      ctx.beginPath();
      ctx.moveTo(0.44, -0.061);
      ctx.arc(0.44, 0, 0.061, -Math.PI / 2, Math.PI / 2); // rounded nose
      ctx.lineTo(-0.24, 0.061); // belly
      ctx.lineTo(-0.3, 0.04); // belly rises toward the tail
      ctx.lineTo(-0.486, 0);
      ctx.lineTo(-0.5, 0);
      ctx.lineTo(-0.5, -0.027);
      ctx.lineTo(-0.486, -0.027); // tail stub
      ctx.lineTo(-0.486, -0.183); // fin trailing edge
      ctx.lineTo(-0.422, -0.183); // flat fin top
      ctx.lineTo(-0.297, -0.061); // fin leading edge down to the roof
      ctx.closePath();
    };
    hull();
    ctx.fillStyle = body;
    ctx.fill();
    // sunset on the belly, clipped to the hull
    ctx.save();
    hull();
    ctx.clip();
    const bg = ctx.createLinearGradient(0, -0.015, 0, 0.061);
    bg.addColorStop(0, "rgba(243,181,140,0)");
    bg.addColorStop(0.55, "rgba(243,181,140,0.3)");
    bg.addColorStop(1, lit);
    ctx.fillStyle = bg;
    ctx.fillRect(-0.5, -0.02, 1, 0.1);
    ctx.restore();
    // cockpit glazing, cabin windows with gaps for two doors, door outlines
    poly(glass, 0.455, -0.046, 0.415, -0.046, 0.42, -0.022, 0.47, -0.022);
    poly(glass, 0.405, -0.046, 0.375, -0.046, 0.378, -0.022, 0.41, -0.022);
    ctx.fillStyle = glass;
    for (let x = 0.34; x > -0.27; x -= 0.021) {
      if ((x < 0.335 && x > 0.31) || (x < -0.2 && x > -0.225)) continue;
      ctx.beginPath();
      ctx.roundRect(x - 0.005, -0.028, 0.01, 0.013, 0.003);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,230,194,0.45)";
    ctx.lineWidth = 0.0035;
    for (const dx of [0.322, -0.213]) {
      ctx.beginPath();
      ctx.roundRect(dx - 0.011, -0.044, 0.022, 0.058, 0.004);
      ctx.stroke();
    }
    // near tailplane and wing, with sunlit edges facing the horizon
    poly(body, -0.459, -0.01, -0.294, -0.01, -0.517, 0.064);
    litEdge(-0.294, -0.008, -0.512, 0.062);
    poly(body, -0.135, 0.054, 0.111, 0.054, -0.24, 0.165);
    litEdge(0.108, 0.056, -0.236, 0.163);
    // engine on a short pylon: nacelle belly lit, dark intake ring
    poly(body, -0.076, 0.108, -0.052, 0.108, -0.052, 0.137, -0.076, 0.137);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(-0.101, 0.165, 0.074, 0.03, 0, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = lit;
    ctx.beginPath();
    ctx.ellipse(-0.101, 0.174, 0.066, 0.016, 0, 0, 3.1416);
    ctx.fill();
    ctx.fillStyle = "#0b0e22";
    ctx.beginPath();
    ctx.ellipse(-0.034, 0.165, 0.016, 0.03, 0, 0, 6.2832);
    ctx.fill();
    ctx.strokeStyle = "rgba(243,181,140,0.6)";
    ctx.lineWidth = 0.004;
    ctx.stroke();
    ctx.restore();
    // red beacon on the spine, white strobe on the tail stub
    if (Math.sin(T * 2.2) > -0.2) dot(ctx, px - s * 0.238, py + s * 0.163, Math.max(1.2, s * 0.009), "#ff4a4a");
    if (Math.sin(T * 7) > 0.75) dot(ctx, px - s * 0.503, py - s * 0.013, Math.max(1.4, s * 0.01), "#ffffff");
  }
  function dynModern(d, T) {
    for (const [x, y, ph, col] of d.bl) if (Math.sin(T * 2.4 + ph) > 0.35) dot(ctx, x, y, 1.4, col);
    airplane(T);
  }
  function dynWModern(d, T) {
    const k0 = d.k;
    for (const f of d.ferries) {
      const span = W + 200,
        x = ((((f.o * W + T * f.v) % span) + span) % span) - 100,
        y = wy(k0, f.y),
        ps = persp(y, k0),
        Lf = Math.max(20, 40 * k0 * ps),
        dir = Math.sign(f.v);
      ctx.strokeStyle = "rgba(255,255,255,.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - dir * Lf * 0.5, y + 3);
      ctx.lineTo(x - dir * Lf * 2, y + 5);
      ctx.stroke();
      const hh = Lf * 0.09;
      P(
        ctx,
        "#e8eaf2",
        x - Lf / 2,
        y,
        x + Lf / 2,
        y,
        x + Lf * 0.42,
        y + hh * 0.8,
        x - Lf * 0.42,
        y + hh * 0.8,
      );
      R(ctx, x - Lf * 0.35, y - hh, Lf * 0.7, hh, "#f1e9c8");
      for (let i = 0; i < 7; i++)
        R(
          ctx,
          x - Lf * 0.3 + i * Lf * 0.09,
          y - hh * 0.7,
          Math.max(1, Lf * 0.03),
          Math.max(1, hh * 0.32),
          "#ffcf6a",
        );
    }
  }

  /* =====================================================================
   2150 · SKYPORT — every surface edged in light; the old core under glass
   ===================================================================== */
  const NEON = [
    ["#3ef2ff", "#7b5cff"],
    ["#ff3ea5", "#ffb03e"],
    ["#45ffb0", "#3e8bff"],
    ["#ff3ea5", "#7b5cff"],
    ["#ff4b3e", "#ffc247"], // lantern red and gold
  ];
  // Upturned pagoda eaves (feiyan) capping a block, drawn in neon
  function feiyan(c, x, w, y, k, col) {
    const ov = 3 * k,
      rh = Math.min(7 * k, w * 0.16),
      tip = 1.8 * k;
    c.beginPath();
    c.moveTo(x - ov, y - tip);
    c.quadraticCurveTo(x + w * 0.1, y + 0.3 * k, x + w * 0.18, y);
    c.lineTo(x + w * 0.82, y);
    c.quadraticCurveTo(x + w * 0.9, y + 0.3 * k, x + w + ov, y - tip);
    c.quadraticCurveTo(x + w * 0.84, y - rh * 0.25, x + w * 0.72, y - rh);
    c.lineTo(x + w * 0.28, y - rh);
    c.quadraticCurveTo(x + w * 0.16, y - rh * 0.25, x - ov, y - tip);
    c.fillStyle = "#0b0a26";
    c.fill();
    c.strokeStyle = col;
    c.lineWidth = Math.max(1, 0.45 * k);
    c.stroke();
    dot(c, x + w * 0.28, y - rh, Math.max(1, 0.6 * k), col);
    dot(c, x + w * 0.72, y - rh, Math.max(1, 0.6 * k), col);
  }
  function futWin(c, r, x, y, w, h, k, p) {
    const fh = Math.max(2.2, 3.8 * k * 1.4),
      ww = Math.max(1, 1.2 * k * 1.4),
      g = Math.max(1.2, 1.6 * k);
    for (let yy = y + fh; yy < y + h - fh; yy += fh)
      for (let xx = x + g; xx < x + w - ww - 0.5; xx += ww + g)
        if (r() < p) {
          c.fillStyle = pick(r, ["#7ae9ff", "#b8c7ff", "#ffffff", "#7ae9ff"]);
          c.fillRect(xx, yy, ww, fh * 0.4);
        }
  }
  function futTower(c, r, x, w, h, k, bl) {
    const body = pick(r, ["#10153a", "#141a44", "#0e1230", "#18164a"]),
      n = pick(r, NEON);
    R(c, x, base - h, w, h, body);
    futWin(c, r, x, base - h, w, h, k, 0.28);
    c.globalAlpha = 0.75;
    R(c, x + w - 1.4, base - h, 1.4, h, n[0]);
    R(c, x, base - h, w, 1.4, n[0]);
    c.globalAlpha = 1;
    if (r() < 0.3) {
      const g = c.createLinearGradient(0, base - h, 0, base);
      g.addColorStop(0, n[0]);
      g.addColorStop(1, n[1]);
      c.globalAlpha = 0.4;
      R(c, x + w * 0.12, base - h * 0.9, w * 0.76, h * 0.45, g);
      c.globalAlpha = 1;
    }
    let top = base - h;
    const t = r();
    if (t < 0.25) {
      P(c, body, x, top, x + w / 2, top - w * 0.8, x + w, top);
      L(c, n[0], 1, x, top, x + w / 2, top - w * 0.8, x + w, top);
      top -= w * 0.8;
    } else if (t < 0.4) {
      R(c, x + w / 2 - 0.6, top - h * 0.12, 1.2, h * 0.12, "#6070b0");
      top -= h * 0.12;
    }
    if (r() < 0.5) bl.push([x + w / 2, top - 1.5, r() * 6, r() < 0.5 ? "#ff3ea5" : "#3ef2ff"]);
  }
  function sphere(c, x, y, r) {
    c.save();
    c.shadowColor = "#ff3ea5";
    c.shadowBlur = r * 0.9;
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, "#ffc2e6");
    g.addColorStop(0.6, "#e2419b");
    g.addColorStop(1, "#8a1f6e");
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, 6.2832);
    c.fill();
    c.restore();
    c.fillStyle = "rgba(255,235,250,.85)";
    const ds = Math.max(0.7, r * 0.045);
    for (let la = -60; la <= 60; la += 20) {
      const a = (la * Math.PI) / 180,
        yy = y + r * Math.sin(a),
        rr = r * Math.cos(a);
      for (let lo = -75; lo <= 75; lo += 15)
        c.fillRect(x + rr * Math.sin((lo * Math.PI) / 180) - ds / 2, yy - ds / 2, ds, ds);
    }
  }
  function pearlTower(c, cx, k) {
    const dk = "#7a1f62",
      lw = Math.max(2, 6 * k);
    for (const d of [-1, 1]) L(c, dk, lw, cx + d * 44 * k, base, cx + d * 9 * k, base - 96 * k);
    R(c, cx - 10 * k, base - 350 * k, 4.5 * k, 350 * k, dk);
    R(c, cx + 5.5 * k, base - 350 * k, 4.5 * k, 350 * k, dk);
    R(c, cx - 2.2 * k, base - 350 * k, 4.4 * k, 350 * k, "#a42a80");
    for (let i = 0; i < 5; i++) sphere(c, cx, base - (135 + i * 22) * k, 5.5 * k);
    sphere(c, cx, base - 93 * k, 25 * k);
    sphere(c, cx, base - 263 * k, 22.5 * k);
    sphere(c, cx, base - 350 * k, 7.5 * k);
    P(
      c,
      "#e04a9c",
      cx - 4 * k,
      base - 358 * k,
      cx - 1.2 * k,
      base - 468 * k,
      cx + 1.2 * k,
      base - 468 * k,
      cx + 4 * k,
      base - 358 * k,
    );
  }
  function pagoda(c, cx, k) {
    const b = "#1d234c",
      gold = "#ffcf6a",
      lw = Math.max(1, 0.8 * k);
    let y = 0,
      w = 54,
      h = 40;
    for (let i = 0; i < 16; i++) {
      const x = cx - (w * k) / 2,
        yy = base - (y + h) * k;
      R(c, x, yy, w * k, h * k, b);
      R(c, x - 1 * k, yy, w * k + 2 * k, Math.max(1, 1.4 * k), gold);
      R(c, x, yy, lw, h * k, "rgba(255,207,106,.55)");
      R(c, x + w * k - lw, yy, lw, h * k, "rgba(255,207,106,.55)");
      y += h;
      h *= 0.9;
      w *= 0.955;
    }
    for (const [ww, hh] of [
      [w * 0.9, 10],
      [w * 0.72, 10],
      [w * 0.52, 12],
    ]) {
      const x = cx - (ww * k) / 2,
        yy = base - (y + hh) * k;
      R(c, x, yy, ww * k, hh * k, b);
      R(c, x - 0.6 * k, yy, ww * k + 1.2 * k, Math.max(1, 1.2 * k), gold);
      R(c, x, yy, lw, hh * k, "rgba(255,207,106,.55)");
      R(c, x + ww * k - lw, yy, lw, hh * k, "rgba(255,207,106,.55)");
      y += hh;
    }
    P(c, b, cx - w * 0.26 * k, base - y * k, cx, base - 420 * k, cx + w * 0.26 * k, base - y * k);
    L(
      c,
      "rgba(255,207,106,.8)",
      Math.max(1, 0.8 * k),
      cx - w * 0.26 * k,
      base - y * k,
      cx,
      base - 420 * k,
      cx + w * 0.26 * k,
      base - y * k,
    );
  }
  function openerTower(c, cx, k) {
    const p = [
        cx - 29 * k,
        base,
        cx - 17 * k,
        base - 492 * k,
        cx + 17 * k,
        base - 492 * k,
        cx + 29 * k,
        base,
      ],
      g = c.createLinearGradient(cx - 29 * k, 0, cx + 29 * k, 0);
    g.addColorStop(0, "#1a2a58");
    g.addColorStop(0.5, "#34539a");
    g.addColorStop(1, "#16224a");
    P(c, g, ...p);
    c.save();
    path(c, p);
    c.clip();
    for (let y = base - 8 * k; y > base - 492 * k; y -= 8 * k)
      R(c, cx - 30 * k, y, 60 * k, Math.max(0.6, 0.4 * k), "rgba(150,190,255,.18)");
    c.restore();
    const hole = [
      cx - 12 * k,
      base - 452 * k,
      cx + 12 * k,
      base - 452 * k,
      cx + 14.5 * k,
      base - 484 * k,
      cx - 14.5 * k,
      base - 484 * k,
    ];
    c.save();
    c.globalCompositeOperation = "destination-out";
    P(c, "#000", ...hole);
    c.restore();
    c.strokeStyle = "rgba(62,242,255,.85)";
    c.lineWidth = Math.max(1, 0.8 * k);
    path(c, p);
    c.stroke();
    path(c, hole);
    c.stroke();
  }
  function twistTower(c, cx, k, bl) {
    c.beginPath();
    c.moveTo(cx - 42 * k, base);
    c.bezierCurveTo(cx - 41 * k, base - 280 * k, cx - 30 * k, base - 480 * k, cx - 19 * k, base - 600 * k);
    c.lineTo(cx + 22 * k, base - 632 * k);
    c.bezierCurveTo(cx + 30 * k, base - 430 * k, cx + 42 * k, base - 250 * k, cx + 42 * k, base);
    c.closePath();
    const g = c.createLinearGradient(0, base, 0, base - 632 * k);
    g.addColorStop(0, "#1c3566");
    g.addColorStop(0.7, "#4f86c8");
    g.addColorStop(1, "#a8e6ff");
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = "rgba(62,242,255,.7)";
    c.lineWidth = 1;
    c.stroke();
    c.save();
    c.clip();
    for (let zz = 1; zz < 9; zz++)
      R(c, cx - 45 * k, base - zz * 68 * k, 90 * k, Math.max(1, k), "rgba(200,240,255,.35)");
    c.strokeStyle = "rgba(230,250,255,.55)";
    c.lineWidth = Math.max(1, 1.2 * k);
    c.beginPath();
    c.moveTo(cx + 40 * k, base);
    c.bezierCurveTo(cx - 60 * k, base - 200 * k, cx + 50 * k, base - 420 * k, cx - 20 * k, base - 610 * k);
    c.stroke();
    futWin(c, rng(88), cx - 45 * k, base - 632 * k, 90 * k, 632 * k, k, 0.18);
    c.restore();
    bl.push([cx + 21 * k, base - 635 * k, 0, "#ff3ea5"]);
  }
  function haloSpire(c, cx, k, bl) {
    const Hh = Math.min(860, (1.38 * S) / k);
    P(
      c,
      "#151b4a",
      cx - 34 * k,
      base,
      cx - 3 * k,
      base - Hh * k,
      cx + 3 * k,
      base - Hh * k,
      cx + 34 * k,
      base,
    );
    L(c, "rgba(62,242,255,.85)", Math.max(1, 0.8 * k), cx - 34 * k, base, cx - 3 * k, base - Hh * k);
    L(c, "rgba(255,62,165,.85)", Math.max(1, 0.8 * k), cx + 34 * k, base, cx + 3 * k, base - Hh * k);
    const rings = [];
    for (const h of [Hh * 0.35, Hh * 0.6, Hh * 0.8]) {
      const w = (34 - (31 * h) / Hh) * k;
      R(c, cx - w - 10 * k, base - h * k - 7 * k, 2 * (w + 10 * k), 7 * k, "#1d2560");
      R(c, cx - w - 10 * k, base - h * k - 4 * k, 2 * (w + 10 * k), Math.max(1, 1.2 * k), "#7ae9ff");
      rings.push([cx, base - h * k - 3 * k, w + 30 * k]);
    }
    bl.push([cx, base - Hh * k - 2, 0, "#3ef2ff"]);
    return rings;
  }
  function buildFuture() {
    const k = S / ERA.future.zoom,
      Lr = layer(base - TOP, TOP + 2),
      c = Lr.c,
      r = rng(401),
      bl = [],
      z = zones(k);
    for (let x = -10; x < W; ) {
      const w = (22 + r() * 30) * k * 1.3,
        h = (50 + r() * 200) * k;
      R(c, x, base - h, w, h, "#0e1236");
      futWin(c, r, x, base - h, w, h, k, 0.15);
      R(c, x, base - h, w, 1, "rgba(62,242,255,.35)");
      x += w + r() * 3;
    }
    haze(c, "51,21,92", 0.28);
    for (let x = -20; x < W; ) {
      const w = (26 + r() * 36) * k,
        h = (140 + r() * 200) * k;
      if (Math.abs(x + w / 2 - W * 0.2) > 55 * k) futTower(c, r, x, w, h, k, bl);
      x += w + (4 + r() * 16) * k;
    }
    const rings = haloSpire(c, W * 0.9, k, bl);
    pearlTower(c, W * 0.2, k);
    pagoda(c, W * 0.42, k);
    openerTower(c, W * 0.58, k);
    twistTower(c, W * 0.68, k, bl);
    const Mr = layer(base - TOP, TOP + 2),
      m = Mr.c;
    for (let x = -10; x < W; ) {
      const w = (24 + r() * 50) * k,
        h = (15 + r() * 70) * k;
      if (
        Math.abs(x + w / 2 - W * 0.2) < 60 * k ||
        blocked(z, x, w, h) ||
        (x + w > z.hx - z.sg * 1.7 && x < z.hx + z.sg * 1.7)
      ) {
        x += w;
        continue;
      }
      const n = pick(r, NEON);
      R(m, x, base - h, w, h, "#0b0a26");
      futWin(m, r, x, base - h, w, h, k, 0.4);
      R(m, x, base - h, w, Math.max(1, 1.4 * k), n[0]);
      if (w > 28 * k && r() < 0.42) feiyan(m, x, w, base - h, k, r() < 0.5 ? "#ffc247" : "#ff4b3e");
      if (r() < 0.4) {
        const g = m.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, n[0]);
        g.addColorStop(1, n[1]);
        m.globalAlpha = 0.5;
        R(m, x + 2, base - h * 0.8, w - 4, h * 0.35, g);
        m.globalAlpha = 1;
      }
      x += w + (2 + r() * 8) * k;
    }
    {
      const top = hillY(z.hx, k),
        rw = Math.min(44 * k, z.sg * 1.2) * 0.9 + 14 * k,
        rh = base - top + 34 * k;
      m.fillStyle = "rgba(62,242,255,.07)";
      m.beginPath();
      m.ellipse(z.hx, base, rw * 1.6, rh, 0, Math.PI, 0);
      m.fill();
      m.strokeStyle = "rgba(62,242,255,.55)";
      m.lineWidth = 1.2;
      m.stroke();
      m.strokeStyle = "rgba(62,242,255,.18)";
      for (let i = 1; i < 4; i++) {
        m.beginPath();
        m.ellipse(z.hx, base, (rw * 1.6 * i) / 4, rh, 0, Math.PI, 0);
        m.stroke();
      }
    }
    const F = layer(base - S * 0.3, S * 0.3 + G + 2),
      f = F.c,
      q = QH * k;
    R(f, 0, base, W, q, "#0b0f33");
    R(f, 0, base - 1, W, 2, "rgba(62,242,255,.75)");
    R(f, 0, base + q - 1, W, 1, "rgba(255,62,165,.6)");
    const lanes = [];
    for (let i = 0; i < 14; i++)
      lanes.push({
        y: S * (0.3 + r() * 0.8),
        v: (30 + r() * 110) * (r() < 0.5 ? -1 : 1),
        o: r() * W,
        c: r() < 0.5 ? "62,242,255" : "255,62,165",
      });
    // a handful of red sky lanterns drifting over the towers
    const lanterns = [];
    for (let i = 0; i < 7; i++)
      lanterns.push({
        x: r() * W,
        y: S * (0.55 + r() * 0.5),
        s: S * 0.019 * (0.7 + r() * 0.6),
        v: 3 + r() * 5,
        ph: r() * 6.28,
      });
    return {
      bg: Lr,
      mid: Mr,
      fg: F,
      bl,
      rings,
      lanes,
      lanterns,
      k,
      boats: [
        { v: 30, o: 0.2, y: 0.45, c: "62,242,255" },
        { v: -22, o: 0.75, y: 0.72, c: "255,62,165" },
      ],
    };
  }
  function dynFuture(d, T) {
    for (const [x, y, ph, col] of d.bl) if (Math.sin(T * 2 + ph) > 0.2) dot(ctx, x, y, 1.5, col);
    for (const l of d.lanterns) {
      const span = W + 60,
        x = ((((l.x + T * l.v) % span) + span) % span) - 30,
        y = base - l.y + Math.sin(T * 0.8 + l.ph) * l.s * 0.8,
        s = l.s,
        glow = ctx.createRadialGradient(x, y, 0, x, y, s * 3.2);
      glow.addColorStop(0, `rgba(255,120,60,${(0.32 + 0.08 * Math.sin(T * 2.3 + l.ph)).toFixed(3)})`);
      glow.addColorStop(1, "rgba(255,120,60,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - s * 3.2, y - s * 3.2, s * 6.4, s * 6.4);
      ctx.fillStyle = "#ff4b3e";
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.85, s, 0, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = "rgba(255,214,120,.55)";
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.35, s * 0.9, 0, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = "#ffc247";
      ctx.fillRect(x - s * 0.45, y - s * 1.12, s * 0.9, s * 0.22);
      ctx.fillRect(x - s * 0.45, y + s * 0.9, s * 0.9, s * 0.22);
      ctx.fillRect(x - 0.5, y + s * 1.1, 1, s * 0.7);
    }
    ctx.lineWidth = 1.2;
    for (let i = 0; i < d.rings.length; i++) {
      const [x, y, w] = d.rings[i];
      ctx.strokeStyle = `rgba(62,242,255,${(0.35 + 0.3 * Math.sin(T * 2 + i)).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(x, y, w * (1 + 0.05 * Math.sin(T * 1.4 + i)), w * 0.16, 0, 0, 6.2832);
      ctx.stroke();
    }
    for (const l of d.lanes) {
      const span = W + 160,
        x = ((((l.o + T * l.v) % span) + span) % span) - 80,
        y = base - l.y,
        dir = Math.sign(l.v);
      const g = ctx.createLinearGradient(x, 0, x - dir * 50, 0);
      g.addColorStop(0, `rgba(${l.c},.7)`);
      g.addColorStop(1, `rgba(${l.c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(Math.min(x, x - dir * 50), y - 0.6, 50, 1.2);
      ctx.fillStyle = `rgb(${l.c})`;
      ctx.fillRect(x - 3, y - 1.5, 6, 3);
    }
  }
  function dynWFuture(d, T) {
    for (const b of d.boats) {
      const sp = W + 200,
        x = ((((b.o * W + T * b.v) % sp) + sp) % sp) - 100,
        y = wy(d.k, b.y),
        Lb = 30 * d.k * persp(y, d.k) + 10;
      R(ctx, x - Lb / 2, y - Lb * 0.08, Lb, Lb * 0.08, "#10123a");
      R(ctx, x - Lb / 2, y - Lb * 0.04, Lb, 1.5, `rgb(${b.c})`);
      const rg = ctx.createLinearGradient(0, y, 0, y + G * 0.4);
      rg.addColorStop(0, `rgba(${b.c},.5)`);
      rg.addColorStop(1, `rgba(${b.c},0)`);
      ctx.fillStyle = rg;
      ctx.fillRect(x - Lb / 2, y, Lb, G * 0.4);
    }
  }

  /* =====================================================================
   432 BC · THE AGORA — limewashed houses, stoa and tholos below the Acropolis
   ===================================================================== */
  const LIME = ["#f1e9d6", "#e9dcc0", "#f5efe1", "#e3d3b1", "#ecd9b6"],
    TERRA = ["#b5643c", "#a85a34", "#c27248"],
    OLIVE = ["#8d9466", "#7b8458", "#9aa070", "#6f7a50"],
    CYP = "#3c5634";
  const gHouseH = (r, k) => (3.2 + r() * 2.6) * k;
  // Highest point a limewashed house reaches above its ground line (wall + roof or roof-garden olive)
  const G_ROOF = 2.2;
  // foot: how far the wall runs below the ground line (deep on the quay, where the stones cover it; short on the hill)
  function gHouse(c, r, x, wm, k, gy, h = gHouseH(r, k), foot = 8 * k) {
    const w = wm * k,
      col = pick(r, LIME);
    R(c, x, gy - h, w, h + foot, col);
    R(c, x + w * 0.8, gy - h, w * 0.2, h + foot, "rgba(120,90,60,.16)");
    if (r() < 0.65) {
      const rh = Math.min(1.8 * k, w * 0.2);
      P(c, pick(r, TERRA), x - 0.4 * k, gy - h + 0.2 * k, x + w * 0.5, gy - h - rh, x + w + 0.4 * k, gy - h + 0.2 * k);
    } else {
      R(c, x, gy - h - 0.5 * k, w, 0.5 * k, col);
      R(c, x, gy - h, w, Math.max(1, 0.2 * k), "rgba(120,90,60,.25)");
      if (r() < 0.5) dot(c, x + w * (0.25 + r() * 0.5), gy - h - 1.2 * k, 0.9 * k, pick(r, OLIVE));
    }
    R(c, x + w * (r() < 0.5 ? 0.18 : 0.6), gy - 2.3 * k, 1.2 * k, 2.3 * k, "#5a4030");
    if (h > 4 * k) R(c, x + w * (0.25 + r() * 0.4), gy - h + 1.2 * k, 0.8 * k, 0.8 * k, "#4a3a2c");
    return w;
  }
  function stoa(c, x, w, k, gy) {
    const ch = 4.2 * k,
      cw = Math.max(1, 0.7 * k),
      n = Math.max(4, Math.round(w / (2.2 * k)));
    R(c, x - 0.6 * k, gy - 0.6 * k, w + 1.2 * k, 8.6 * k, "#d9c9a6");
    let y = gy - 0.6 * k;
    for (let s = 0; s < 2; s++) {
      R(c, x + 0.6 * k, y - ch, w - 1.2 * k, ch, "#6e5a44");
      for (let j = 0; j < n; j++) {
        const cx = x + 0.6 * k + (j * (w - 1.2 * k - cw)) / (n - 1);
        R(c, cx, y - ch, cw, ch, "#f3eadb");
        R(c, cx + cw * 0.6, y - ch, cw * 0.4, ch, "#d8c7a6");
        R(c, cx - 0.2 * k, y - ch, cw + 0.4 * k, Math.max(1, 0.35 * k), "#f3eadb");
      }
      y -= ch;
      R(c, x, y - 0.8 * k, w, 0.8 * k, "#ebdfc4");
      R(c, x, y - 0.8 * k, w, Math.max(1, 0.2 * k), "#c9b28a");
      y -= 0.8 * k;
    }
    P(c, "#b5643c", x - 0.6 * k, y, x + 2 * k, y - 1.8 * k, x + w - 2 * k, y - 1.8 * k, x + w + 0.6 * k, y);
  }
  function tholos(c, cx, k, gy) {
    const rw = 7 * k,
      ch = 4 * k;
    R(c, cx - rw / 2 - 0.6 * k, gy - 0.6 * k, rw + 1.2 * k, 8.6 * k, "#d9c9a6");
    R(c, cx - rw / 2 + 0.4 * k, gy - 0.6 * k - ch, rw - 0.8 * k, ch, "#6e5a44");
    for (let j = 0; j < 6; j++) {
      const f = j / 5,
        x = cx + (f - 0.5) * (rw - 0.7 * k) * Math.sin(0.4 + f * 2.34) * 1.2;
      R(c, x - 0.35 * k, gy - 0.6 * k - ch, 0.7 * k, ch, "#f3eadb");
    }
    const ty = gy - 0.6 * k - ch;
    R(c, cx - rw / 2, ty - 0.8 * k, rw, 0.8 * k, "#ebdfc4");
    c.fillStyle = "#b5643c";
    c.beginPath();
    c.ellipse(cx, ty - 0.8 * k, rw / 2 + 0.3 * k, 2.8 * k, 0, Math.PI, 0);
    c.fill();
    dot(c, cx, ty - 3.8 * k, 0.4 * k, "#d6a53a");
  }
  function statue(c, x, k, gy) {
    R(c, x - 0.8 * k, gy - 2.2 * k, 1.6 * k, 2.2 * k, "#e6d8b8");
    R(c, x - 0.35 * k, gy - 5 * k, 0.7 * k, 2.8 * k, "#d6a53a");
    dot(c, x, gy - 5.35 * k, 0.4 * k, "#d6a53a");
  }
  function cypress(c, x, gy, h, col) {
    c.fillStyle = col;
    c.beginPath();
    c.ellipse(x, gy - h / 2, Math.max(1, h * 0.12), h / 2, 0, 0, 6.2832);
    c.fill();
  }
  const oliveR = (r, k) => (1.6 + r() * 1.3) * k;
  function olive(c, r, x, y, k, rr = oliveR(r, k)) {
    R(c, x - 0.25 * k, y, Math.max(1, 0.5 * k), rr * 1.1, "#5a4632");
    for (let i = 0; i < 3; i++)
      dot(c, x + (r() - 0.5) * rr, y - r() * rr * 0.5, rr * (0.55 + r() * 0.3), pick(r, OLIVE));
  }
  // The Theatre of Dionysus: an open fan of seating tiers cut into the slope, the round orchestra with its
  // altar (thymele) at the foot, and a low colonnaded stage building (skene) in front. cy is the line the
  // seating rises from; gy is the foot of the skene.
  const THEATRE_RISE = 3.5;
  function theatre(c, cx, gy, rx, ry, k) {
    const tiers = 7,
      inner = 0.3,
      cy = gy - THEATRE_RISE * k;
    for (let i = tiers; i >= 1; i--) {
      const t = inner + ((1 - inner) * i) / tiers;
      c.fillStyle = i % 2 ? "#eadcbd" : "#d9c8a2";
      c.beginPath();
      c.ellipse(cx, cy, rx * t, ry * t, 0, Math.PI, 0);
      c.fill();
    }
    // stair aisles fanning up through the seats
    c.strokeStyle = "rgba(150,122,82,.55)";
    c.lineWidth = Math.max(1, 0.3 * k);
    for (const a of [0.2, 0.36, 0.5, 0.64, 0.8]) {
      const th = Math.PI * (1 + a);
      c.beginPath();
      c.moveTo(cx + Math.cos(th) * rx * inner, cy + Math.sin(th) * ry * inner);
      c.lineTo(cx + Math.cos(th) * rx, cy + Math.sin(th) * ry);
      c.stroke();
    }
    c.strokeStyle = "#bfa679";
    c.lineWidth = Math.max(1, 0.6 * k);
    c.beginPath();
    c.ellipse(cx, cy, rx, ry, 0, Math.PI, 0);
    c.stroke();
    // the round orchestra, seen flattened, with the altar at its centre
    const orx = rx * inner,
      ory = Math.max(1.2 * k, ry * 0.12);
    c.fillStyle = "#efe4cc";
    c.beginPath();
    c.ellipse(cx, cy, orx, ory, 0, 0, 6.2832);
    c.fill();
    c.strokeStyle = "#c9b28a";
    c.lineWidth = Math.max(1, 0.35 * k);
    c.stroke();
    R(c, cx - 0.6 * k, cy - 1 * k, 1.2 * k, 1 * k, "#d8c7a6");
    dot(c, cx, cy - 1.2 * k, Math.max(1, 0.35 * k), "#d6a53a");
    // low skene: a plain colonnade between two slightly taller wings, under a terracotta roof line
    const sw = rx * 0.95,
      sx = cx - sw / 2,
      top = gy - 2.6 * k,
      wing = Math.min(3 * k, sw * 0.14);
    R(c, sx, top, sw, gy - top + 2 * k, "#6e5a44");
    const n = Math.max(4, Math.round((sw - 2 * wing) / (1.7 * k)));
    for (let j = 0; j <= n; j++) {
      const x = sx + wing + ((sw - 2 * wing) * j) / n - 0.3 * k;
      R(c, x, top, Math.max(1, 0.6 * k), gy - top, "#f3eadb");
    }
    R(c, sx, top - 0.7 * k, sw, 0.7 * k, "#ebdfc4");
    R(c, sx - 0.3 * k, top - 1.2 * k, sw + 0.6 * k, 0.5 * k, "#b5643c");
    for (const wx of [sx, sx + sw - wing]) {
      R(c, wx, top - 1.6 * k, wing, gy - top + 3.6 * k, "#e6d8b8");
      R(c, wx, top - 1.6 * k, wing, Math.max(1, 0.4 * k), "#c9b28a");
      R(c, wx + wing * 0.75, top - 1.6 * k, wing * 0.25, gy - top + 3.6 * k, "rgba(120,90,60,.16)");
    }
    R(c, cx - 0.7 * k, gy - 1.9 * k, 1.4 * k, 1.9 * k, "#4a3a2c"); // central doorway
  }
  function buildClassical() {
    const k = S / ERA.classical.zoom,
      Lr = layer(base - TOP, TOP + 2),
      c = Lr.c,
      r = rng(432),
      src = [],
      z = zones(k);
    // Mount Hymettus, then an olive ridge with farmhouses and cypresses
    const far = (x) => base - S * (0.27 + 0.06 * Math.sin((x / W) * 3 + 0.6) + 0.02 * Math.sin((x / W) * 9));
    c.fillStyle = "#a9b2bd";
    c.beginPath();
    c.moveTo(0, base);
    for (let x = 0; x <= W + 16; x += 12) c.lineTo(x, far(x));
    c.lineTo(W, base);
    c.fill();
    // Lycabettus: a steep, pine-dark hill with a white chapel on its summit
    {
      const lx = W * 0.5,
        lw = Math.min(S * 0.34, W * 0.22),
        peak = base - S * 0.4,
        ly = (x) => {
          const d = (x - lx) / lw;
          return Math.abs(d) >= 1 ? base : peak + (base - peak) * (1 - Math.pow(1 - d * d, 1.6));
        };
      c.fillStyle = "#8e9373";
      c.beginPath();
      c.moveTo(lx - lw, base);
      for (let x = lx - lw; x <= lx + lw; x += 4) c.lineTo(x, ly(x));
      c.lineTo(lx + lw, base);
      c.fill();
      for (let i = 0; i < 40; i++) {
        const x = lx + (r() * 2 - 1) * lw * 0.75,
          y = ly(x) + S * 0.012 + r() * S * 0.08;
        dot(c, x, y, (0.8 + r() * 0.9) * k * 0.6, r() < 0.5 ? "#6f7a56" : "#7e8862");
      }
      R(c, lx - 1.6 * k, peak - 1.6 * k, 3.2 * k, 1.8 * k, "#f2ece0");
      dot(c, lx, peak - 1.8 * k, 0.9 * k, "#f2ece0");
    }
    const ridge = (x) => far(x) + S * 0.1 + Math.sin((x / W) * 6 + 2) * S * 0.02;
    c.fillStyle = "#a2a27a";
    c.beginPath();
    c.moveTo(0, base);
    for (let x = 0; x <= W + 16; x += 12) c.lineTo(x, ridge(x));
    c.lineTo(W, base);
    c.fill();
    for (let x = 0; x < W; x += 5 + r() * 12) {
      const y = ridge(x) + S * 0.01 + r() * S * 0.04;
      if (r() < 0.12) cypress(c, x, y + 1.5 * k, (3 + r() * 3) * k * 0.6, CYP);
      else if (r() < 0.2) R(c, x, y - 0.8 * k, 1.6 * k, 1 * k, pick(r, LIME));
      else dot(c, x, y, (1 + r() * 1.2) * k * 0.5, pick(r, OLIVE));
    }
    for (let x = -10; x < W; ) x += gHouse(c, r, x, 5 + r() * 3, k * 0.8, base - 4 * k);
    haze(c, "233,228,210", 0.24);
    // The quay and the hillside are planned before anything is drawn. Each house, tree and civic building
    // claims the box its visible part covers, and a new piece is only placed where its box is free, so
    // nothing hides part of anything else. Pieces are then drawn back to front (by their ground line).
    const Mr = layer(base - TOP, TOP + 2),
      m = Mr.c,
      boxes = [],
      items = [];
    const free = (x0, y0, x1, y1, pad) =>
      boxes.every((b) => x1 + pad <= b[0] || x0 - pad >= b[2] || y1 + pad <= b[1] || y0 - pad >= b[3]);
    const claim = (x0, y0, x1, y1, gy, draw) => {
      boxes.push([x0, y0, x1, y1]);
      items.push({ gy, draw });
    };
    // civic quarter on the quay: stoa, tholos, two statues and the smoking altar
    const sx = z.g1 + 3 * k,
      sw = Math.min(70 * k, W * 0.22),
      tx = sx + sw + 6 * k;
    claim(sx - 2.6 * k, base - 13 * k, tx + 11 * k, base, base, () => {
      stoa(m, sx, sw, k, base);
      tholos(m, tx, k, base);
      statue(m, sx - 1.6 * k, k, base);
      statue(m, tx + 5.5 * k, k, base);
      R(m, tx + 8 * k, base - 1.4 * k, 2 * k, 1.4 * k, "#e6d8b8"); // altar
    });
    src.push({
      x: tx + 9 * k,
      y: base - 1.4 * k,
      rate: 1.2,
      o: { r0: (1.2 * k) / 10, vx: 4, vy: -8, g: (3 * k) / 10, d: 0.28, c: "240,236,226", a: 0.42 },
    });
    // cypresses flanking the temple and gate sites
    for (const cx of [z.c0 - 1.5 * k, z.c1 + 1.5 * k, z.g0 - 2 * k])
      claim(cx - 1.2 * k, base - 9 * k, cx + 1.2 * k, base, base, () => cypress(m, cx, base, 9 * k, CYP));
    // bare limestone breaking through the hillside, painted straight onto the slope
    for (let i = 0; i < 26; i++) {
      const x = z.hx + (r() * 2 - 1) * z.sg * 2.2,
        top = hillY(x, k),
        hh = base - top;
      if (hh < 12 * k || Math.abs(x - z.hx) < plat(k)) continue;
      const y = top + 3 * k + r() * hh * 0.55,
        w = (4 + r() * 7) * k,
        h = (1.4 + r() * 2.2) * k;
      if (y - h < hillY(x - w / 2, k) + 1.5 * k || y - h < hillY(x + w / 2, k) + 1.5 * k) continue;
      m.fillStyle = "rgba(226,212,178,.55)";
      m.beginPath();
      m.moveTo(x - w / 2, y);
      m.lineTo(x - w * 0.3, y - h);
      m.lineTo(x + w * 0.15, y - h * 0.8);
      m.lineTo(x + w / 2, y - h * 0.2);
      m.lineTo(x + w * 0.4, y);
      m.fill();
      R(m, x - w / 2, y, w * 0.9, Math.max(1, 0.35 * k), "rgba(120,98,64,.35)");
    }
    // the theatre, cut into the west flank of the Acropolis, claimed before houses and trees
    // Tries a few sizes and spots, largest first, and uses the first whose seating sits wholly inside the slope.
    for (const [off, size] of [
      [0.45, 16],
      [0.42, 13],
      [0.38, 10],
      [0.34, 8],
    ]) {
      const rx = Math.min(size * k, z.sg * 0.45),
        ry = rx * 0.62,
        cx = z.hx - plat(k) - z.sg * off;
      // lowest foot that keeps every point of the seating's rim 1.5 units under the hill line
      let gy = 0;
      for (let i = 0; i <= 12; i++) {
        const a = (Math.PI * i) / 12,
          x = cx + Math.cos(a) * rx;
        gy = Math.max(gy, hillY(x, k) + 1.5 * k + Math.sin(a) * ry + THEATRE_RISE * k);
      }
      const box = [cx - rx - 1 * k, gy - THEATRE_RISE * k - ry - 1 * k, cx + rx + 1 * k, gy + 2 * k];
      if (gy < base - 9 * k && free(box[0], box[1], box[2], box[3], 0)) {
        claim(box[0], box[1], box[2], box[3], gy, () => theatre(m, cx, gy, rx, ry, k));
        break;
      }
    }
    // a continuous row of houses along the quay, leaving the temple, gate and civic sites clear
    for (let x = -8 * k; x < W + 8 * k; ) {
      const wm = 5.5 + r() * 2.6,
        w = wm * k,
        h = gHouseH(r, k),
        hx0 = x;
      const clear = (x + w > z.c0 && x < z.c1) || (x + w > z.g0 && x < z.g1) || (x + w > sx - 3 * k && x < tx + 11 * k);
      if (!clear && free(x, base - h - G_ROOF * k, x + w, base, 0)) {
        claim(x, base - h - G_ROOF * k, x + w, base, base, () => gHouse(m, r, hx0, wm, k, base, h));
      }
      x += w;
    }
    // hillside houses in rows from the crest down, never cutting into a house already placed
    slopeRows(z, (x, frac) => {
      const wm = 5 + r() * 3,
        w = wm * k,
        xm = x + w / 2,
        hh = base - hillY(xm, k),
        gy = base - hh * frac + 2 * k,
        h = gHouseH(r, k);
      if (
        hh * frac > 9 * k &&
        (Math.abs(xm - z.hx) > castleClear(z, k) || frac < 0.62) &&
        r() < 0.55 &&
        free(x, gy - h - G_ROOF * k, x + w, gy + 1.5 * k, 0.8 * k)
      )
        claim(x, gy - h - G_ROOF * k, x + w, gy + 1.5 * k, gy, () => gHouse(m, r, x, wm, k, gy, h, 1.5 * k));
      return w * (0.9 + r() * 0.8);
    });
    // olive groves and cypresses fill the gaps that are left
    for (let i = 0; i < 260; i++) {
      const x = z.g1 + 4 * k + r() * (z.hx + 2.2 * z.sg - z.g1 - 4 * k),
        top = hillY(x, k);
      if (base - top < 5 * k) continue;
      const y = top + 3 * k + r() * (base - top - 3 * k) * 0.9;
      if (Math.abs(x - z.hx) < plat(k) + 2 * k && y < top + 10 * k) continue;
      if (r() < 0.14) {
        const hc = (5 + r() * 4) * k,
          gy = y + 2 * k,
          hw = Math.max(1, hc * 0.12);
        if (free(x - hw, gy - hc, x + hw, gy, 0.5 * k)) claim(x - hw, gy - hc, x + hw, gy, gy, () => cypress(m, x, gy, hc, CYP));
      } else {
        const rr = oliveR(r, k),
          ext = rr * 1.35;
        if (free(x - ext, y - ext, x + ext, y + rr * 1.1, 0.5 * k))
          claim(x - ext, y - ext, x + ext, y + rr * 1.1, y + rr * 1.1, () => olive(m, r, x, y, k, rr));
      }
    }
    items.sort((p, q) => p.gy - q.gy);
    for (const it of items) it.draw();
    // stone quay and two moored boats
    const F = layer(base - S * 0.3, S * 0.3 + G + 2),
      f = F.c,
      q = QH * k;
    R(f, 0, base, W, q, "#cdb991");
    R(f, 0, base, W, Math.max(1, 0.5 * k), "#e6d8b6");
    for (let y = base + 1.4 * k; y < base + q; y += 1.4 * k)
      for (let x = (((y / (1.4 * k)) | 0) % 2) * 2 * k; x < W; x += 4 * k) R(f, x, y, 1, 1.4 * k, "rgba(90,70,50,.25)");
    R(f, 0, base + q - 1, W, 2, "rgba(20,44,52,.35)");
    // Each boat slides along until its mast no longer lines up with a quayside cypress, which otherwise
    // reads as a tree growing out of the deck.
    const trees = [z.c0 - 1.5 * k, z.c1 + 1.5 * k, z.g0 - 2 * k];
    for (let bx of [W * 0.1, W * 0.68]) {
      const bl = 13 * k,
        y = wy(k, 0.14);
      for (let tries = 0; tries < 4; tries++) {
        const near = trees.find((tx) => Math.abs(bx + bl * 0.5 - tx) < 4 * k);
        if (near === undefined) break;
        bx = near + (bx + bl * 0.5 >= near ? 4 * k : -4 * k) - bl * 0.5;
      }
      P(f, "#3b2a1e", bx, y, bx + bl, y, bx + bl + 1 * k, y - 1.6 * k, bx + bl * 0.9, y + 2 * k, bx + bl * 0.12, y + 2 * k);
      R(f, bx + 0.6 * k, y, bl * 0.9, Math.max(1, 0.4 * k), "#a3271b");
      dot(f, bx + 1.4 * k, y + 0.9 * k, Math.max(1, 0.35 * k), "#f4efe4");
      L(f, "#3b2a1e", Math.max(1, 0.3 * k), bx + bl * 0.5, y, bx + bl * 0.5, y - 9 * k);
    }
    return { bg: Lr, mid: Mr, fg: F, src, k, smoke: [] };
  }
  function dynClassical(d, T) {
    drawParts(d.smoke);
    ctx.strokeStyle = "rgba(255,255,255,.92)";
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) {
      const bx = W + 40 - ((T * (14 + i * 3) + i * 230) % (W + 80)),
        by = base - S * (0.9 + i * 0.07) + Math.sin(T * 0.7 + i) * 8,
        fl = Math.sin(T * 4 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(bx - 7, by - fl);
      ctx.quadraticCurveTo(bx - 2, by - 4, bx, by);
      ctx.quadraticCurveTo(bx + 2, by - 4, bx + 7, by - fl);
      ctx.stroke();
    }
  }
  // A trireme rowing west across the harbour
  function dynWClassical(d, T) {
    const y = wy(d.k, 0.58),
      k = d.k * persp(y, d.k) * 0.8,
      bl = 30 * k,
      span = W + bl * 3,
      x = W + bl * 1.5 - ((T * 8) % span);
    ctx.strokeStyle = "rgba(240,246,248,.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + bl, y + 1.6 * k);
    ctx.lineTo(x + bl * 1.9, y + 2.6 * k);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const ox = x + bl * (0.16 + i * 0.062),
        a = Math.sin(T * 3.2 - i * 0.12) * 1.1 * k;
      L(ctx, "#5a4632", Math.max(1, 0.2 * k), ox, y + 0.6 * k, ox + a + 1.4 * k, y + 2.9 * k);
    }
    P(ctx, "#2b211b", x, y + 0.6 * k, x + 2 * k, y - 0.6 * k, x + bl * 0.92, y - 0.6 * k, x + bl + 0.6 * k, y - 3.2 * k, x + bl * 0.97, y + 0.4 * k, x + bl * 0.9, y + 1.4 * k, x + 2.5 * k, y + 1.4 * k);
    R(ctx, x + 2 * k, y - 0.6 * k, bl * 0.9 - 2 * k, Math.max(1, 0.45 * k), "#a3271b");
    dot(ctx, x + 2.6 * k, y - 0.05 * k, Math.max(1, 0.35 * k), "#f4efe4");
    P(ctx, "#b08a3e", x - 1.3 * k, y + 1 * k, x + 0.4 * k, y + 0.5 * k, x + 0.4 * k, y + 1.4 * k);
    L(ctx, "#3a2a1c", Math.max(1, 0.3 * k), x + bl * 0.5, y - 0.6 * k, x + bl * 0.5, y - 12 * k);
    const sw = Math.sin(T * 1.1) * 0.5 * k;
    P(ctx, "#efe6d2", x + bl * 0.37, y - 11.5 * k, x + bl * 0.63, y - 11.5 * k, x + bl * 0.62 + sw, y - 4.6 * k, x + bl * 0.38 + sw, y - 4.6 * k);
    R(ctx, x + bl * 0.37, y - 11.5 * k, bl * 0.26, Math.max(1, 0.6 * k), "#a3271b");
  }

  const BUILD = {
    modern: buildModern,
    industrial: buildIndustrial,
    medieval: buildMedieval,
    classical: buildClassical,
    future: buildFuture,
  };
  const DYN = {
    modern: dynModern,
    industrial: dynIndustrial,
    medieval: dynMedieval,
    classical: dynClassical,
    future: dynFuture,
  };
  const DYNW = {
    modern: dynWModern,
    industrial: dynWIndustrial,
    medieval: dynWMedieval,
    classical: dynWClassical,
    future: dynWFuture,
  };

  /* ---------- sky ---------- */
  function cloudSprite(r, w, h, rgb, a, shade) {
    const cn = document.createElement("canvas");
    cn.width = w;
    cn.height = h;
    const c = cn.getContext("2d");
    const blob = (x, y, rr, col, al) => {
      const g = c.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, `rgba(${col},${al})`);
      g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    };
    for (let i = 0; i < 12; i++)
      blob(w * (0.2 + r() * 0.6), h * (0.42 + r() * 0.14), h * 0.3 * (0.6 + r() * 0.5), rgb, a);
    if (shade) for (let i = 0; i < 5; i++) blob(w * (0.25 + r() * 0.5), h * 0.6, h * 0.2, shade, 0.3);
    return cn;
  }
  function makeShared() {
    const r = rng(999);
    shimmer = [];
    for (let i = 0; i < 260; i++)
      shimmer.push({
        x: r() * W - 40,
        y: Math.pow(r(), 1.4),
        w: 20 + r() * 110,
        h: 1 + r() * 1.6,
        p: r() * 6,
      });
    stars = [];
    for (let i = 0; i < 170; i++)
      stars.push({ x: r() * W, y: r() * (base - S * 0.6), s: r() * 1.3 + 0.3, p: r() * 6 });
    const mk = (n, wMin, wMax, yMin, yMax, rgb, a, sh, sp, flat) => {
      const a2 = [];
      for (let i = 0; i < n; i++) {
        const w = wMin + r() * (wMax - wMin),
          h = w * (flat ? 0.22 : 0.42);
        a2.push({
          cn: cloudSprite(r, w | 0, h | 0, rgb, a, sh),
          x: r() * (W + w),
          y: H * (yMin + r() * (yMax - yMin)),
          w,
          sp: sp * (0.6 + r() * 0.8),
        });
      }
      return a2;
    };
    clouds = {
      modern: mk(5, 160, 320, 0.06, 0.32, "214,140,160", 0.42, null, 3, true),
      industrial: mk(8, 260, 520, 0.02, 0.4, "96,82,70", 0.5, null, 6, true),
      medieval: mk(6, 180, 340, 0.04, 0.26, "255,255,255", 0.95, "170,185,205", 5, false),
      classical: mk(3, 200, 380, 0.05, 0.22, "255,255,255", 0.95, "190,205,222", 3, false),
      future: [],
    };
    hatchCv = document.createElement("canvas");
    hatchCv.width = hatchCv.height = 6;
    const h = hatchCv.getContext("2d");
    h.strokeStyle = "rgba(40,30,25,.55)";
    h.lineWidth = 0.8;
    h.beginPath();
    h.moveTo(0, 6);
    h.lineTo(6, 0);
    h.stroke();
  }
  function skyStatic(w) {
    const sg = ctx.createLinearGradient(0, 0, 0, base);
    sg.addColorStop(
      0,
      mix((e) => e.skyC[0], w),
    );
    sg.addColorStop(
      1,
      mix((e) => e.skyC[1], w),
    );
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H);
    const wm = wOf(w, "modern"),
      wi = wOf(w, "industrial"),
      wd = wOf(w, "medieval"),
      wc = wOf(w, "classical"),
      wf = wOf(w, "future");
    const glow = (x, y, rr, col, a) => {
      if (a < 0.003) return;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, `rgba(${col},${a})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    };
    glow(W * 0.55, base, W * 0.6, "255,168,110", 0.5 * wm);
    glow(W * 0.62, base - S * 0.95, 90, "250,222,165", 0.95 * wi);
    if (wi) dot(ctx, W * 0.62, base - S * 0.95, 30, `rgba(252,232,190,${(0.6 * wi).toFixed(3)})`);
    glow(W * 0.12, H * 0.12, 140, "255,248,220", 0.7 * wd);
    if (wd) dot(ctx, W * 0.12, H * 0.12, 26, `rgba(255,252,236,${wd.toFixed(3)})`);
    glow(W * 0.86, H * 0.1, 170, "255,250,226", 0.85 * wc);
    if (wc) dot(ctx, W * 0.86, H * 0.1, 24, `rgba(255,253,240,${wc.toFixed(3)})`);
    if (wf) {
      for (const s of stars) {
        ctx.fillStyle = `rgba(220,240,255,${(wf * (0.4 + 0.5 * ((s.p * 7) % 1))).toFixed(3)})`;
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }
      glow(W * 0.6, base, W * 0.5, "255,62,165", 0.35 * wf);
      dot(ctx, W * 0.84, H * 0.14, 18, `rgba(232,244,255,${wf.toFixed(3)})`);
      dot(
        ctx,
        W * 0.84 + 7,
        H * 0.14 - 4,
        16,
        mix((e) => e.skyC[0], w),
      );
    }
    if (wi > 0.003 && hatchCv) {
      ctx.globalAlpha = wi * 0.22;
      ctx.fillStyle = ctx.createPattern(hatchCv, "repeat");
      ctx.fillRect(0, 0, W, base);
      ctx.globalAlpha = 1;
    }
  }
  function skyLive(T, w) {
    keys.forEach((k, j) => {
      if (w[j] < 0.003 || !clouds[k].length) return;
      ctx.globalAlpha = w[j];
      for (const cl of clouds[k]) {
        const span = W + cl.w,
          x = ((((cl.x + T * cl.sp) % span) + span) % span) - cl.w;
        ctx.drawImage(cl.cn, x, cl.y, cl.w, cl.cn.height);
      }
      ctx.globalAlpha = 1;
    });
  }

  /* ---------- scroll → time ---------- */
  const secs = [...document.querySelectorAll("section[data-era]")],
    keys = secs.map((s) => s.dataset.era);
  let centers = [];
  function measure() {
    const docH = document.documentElement.scrollHeight,
      maxRef = docH - innerHeight * 0.5 - 1;
    centers = secs.map((s) => {
      const r = s.getBoundingClientRect();
      return Math.min(r.top + scrollY + r.height * 0.5, maxRef);
    });
    centers[0] = Math.max(centers[0], innerHeight * 0.5);
  }
  function weights() {
    const ref = scrollY + innerHeight * 0.5,
      n = centers.length,
      w = keys.map(() => 0);
    let i = 0,
      t = 0;
    if (ref >= centers[n - 1]) i = n - 1;
    else if (ref > centers[0]) {
      while (i < n - 2 && ref > centers[i + 1]) i++;
      t = ss(0.28, 0.72, (ref - centers[i]) / (centers[i + 1] - centers[i]));
    }
    w[i] = 1 - t;
    if (t > 0) w[i + 1] = t;
    return { w, i, t };
  }
  let lastEra = -1;
  let lastYr = -1;
  function hud(st) {
    const a = ERA[keys[st.i]],
      b = ERA[keys[Math.min(st.i + 1, keys.length - 1)]],
      yr = Math.round(a.year + (b.year - a.year) * st.t),
      cur = st.t < 0.5 ? st.i : st.i + 1;
    if (yr === lastYr && cur === lastEra) return;
    lastYr = yr;
    lastEra = cur;
    const e = ERA[keys[cur]];
    onHud({ year: yr, index: cur, era: keys[cur], name: e.name, pop: e.pop });
  }
  function mix(get, w) {
    let r = 0,
      g = 0,
      b = 0;
    keys.forEach((k, j) => {
      if (!w[j]) return;
      const c = get(ERA[k]);
      r += c[0] * w[j];
      g += c[1] * w[j];
      b += c[2] * w[j];
    });
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  function pal(w) {
    const o = {};
    for (const p in HP.medieval) {
      let r = 0,
        g = 0,
        b = 0;
      keys.forEach((k, j) => {
        if (!w[j]) return;
        const c = HP[k][p];
        r += c[0] * w[j];
        g += c[1] * w[j];
        b += c[2] * w[j];
      });
      o[p] = `rgb(${r | 0},${g | 0},${b | 0})`;
    }
    return o;
  }
  function wOf(w, k) {
    const j = keys.indexOf(k);
    return j < 0 ? 0 : w[j];
  }
  const get = (k) => cache[k] || ((cKey = ""), (cache[k] = BUILD[k]()));
  const img = (Ly, off) => ctx.drawImage(Ly.cn, 0, Ly.y0 + off, W, Ly.h);

  const A = (e) => Math.min(1, e * 1.4);
  function frameState() {
    const st = weights(),
      w = st.w;
    hud(st);
    const order = keys
      .map((k, j) => [k, w[j]])
      .filter((x) => x[1] > 0.002)
      .sort((a, b) => a[1] - b[1]);
    return {
      w,
      order,
      kz: Math.exp(keys.reduce((s, k, j) => s + w[j] * Math.log(S / ERA[k].zoom), 0)),
      p: pal(w),
      wm: wOf(w, "modern"),
      wf: wOf(w, "future"),
      wc: wOf(w, "classical"),
      OFF: (e) => (1 - e) * S * 1.15,
      key: w.map((v) => v.toFixed(4)).join() + "|" + W + "x" + H,
    };
  }
  function passBG(F) {
    for (const [k, e] of F.order) {
      const d = get(k);
      ctx.globalAlpha = A(e);
      img(d.bg, F.OFF(e));
    }
    ctx.globalAlpha = 1;
  }
  function passDyn(F, T, dt) {
    for (const [k, e] of F.order) {
      const d = get(k);
      ctx.save();
      ctx.globalAlpha = A(e);
      ctx.translate(0, F.OFF(e));
      DYN[k](d, T, dt);
      ctx.restore();
    }
  }
  function passFront(F) {
    const { order, kz, p, w } = F;
    HE = F.wf * 0.8;
    CW = F.wc;
    heritage(kz, p, F.wm);
    for (const [k, e] of order) {
      ctx.globalAlpha = A(e);
      img(cache[k].mid, F.OFF(e));
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = mix((e) => e.groundC, w);
    ctx.fillRect(0, base, W, H - base + 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, base, W, H - base);
    ctx.clip();
    for (const [k, e] of order) {
      const d = cache[k];
      ctx.save();
      ctx.globalAlpha = e * ERA[k].refl;
      ctx.translate(0, 2 * base - F.OFF(e));
      ctx.scale(1, -1);
      img(d.bg, 0);
      img(d.mid, 0);
      ctx.restore();
    }
    const wet = keys.reduce((s, k, j) => s + ERA[k].refl * w[j], 0);
    ctx.save();
    ctx.globalAlpha = wet * 0.9;
    ctx.translate(0, 2 * base);
    ctx.scale(1, -1);
    heritage(kz, p, 0);
    ctx.restore();
    ctx.restore();
    HE = 0;
    for (const [k, e] of order) {
      ctx.globalAlpha = A(e);
      img(cache[k].fg, 0);
    }
    ctx.globalAlpha = 1;
  }
  function passLive(F, T, dt) {
    const { order, kz, w } = F,
      y0 = base + QH * kz + 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y0, W, H - NB - y0);
    ctx.clip();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = mix((e) => e.waterC, w);
    for (const s of shimmer)
      ctx.fillRect(s.x + Math.sin(T * 0.8 + s.p) * 8, base + s.y * (H - base), s.w, s.h);
    ctx.restore();
    ctx.globalAlpha = 1;
    for (const [k, e] of order) {
      ctx.save();
      ctx.globalAlpha = A(e);
      DYNW[k](cache[k], T, dt);
      ctx.restore();
    }
    for (const [k, e] of order) {
      ctx.save();
      ctx.globalAlpha = A(e);
      drawBridge(kz, BRIDGE[k], T);
      nearBank(kz, k);
      ctx.restore();
    }
  }
  /* When the scroll position holds still, the static passes are composited once into three images and reused every frame. */
  let CS = null,
    CB = null,
    CF = null,
    cKey = "",
    pKey = "";
  function mkC() {
    const c = document.createElement("canvas");
    c.width = cv.width;
    c.height = cv.height;
    const x = c.getContext("2d");
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, x };
  }
  function into(C, fn) {
    C.x.clearRect(0, 0, W, H);
    const s = ctx;
    ctx = C.x;
    try {
      fn();
    } finally {
      ctx = s;
    }
  }
  function blit(C, y0) {
    y0 = Math.max(0, Math.floor(y0));
    ctx.drawImage(C.c, 0, y0 * dpr, C.c.width, C.c.height - y0 * dpr, 0, y0, W, H - y0);
  }
  function render(T, dt) {
    const F = frameState();
    if (F.key !== cKey && F.key === pKey) {
      CS = CS || mkC();
      CB = CB || mkC();
      CF = CF || mkC();
      into(CS, () => skyStatic(F.w));
      into(CB, () => passBG(F));
      into(CF, () => passFront(F));
      cKey = F.key;
    }
    if (F.key === cKey) {
      blit(CS, 0);
      skyLive(T, F.w);
      blit(CB, base - TOP);
      passDyn(F, T, dt);
      blit(CF, base - S * 1.2);
    } else {
      pKey = F.key;
      skyStatic(F.w);
      skyLive(T, F.w);
      passBG(F);
      passDyn(F, T, dt);
      passFront(F);
    }
    passLive(F, T, dt);
    return F.w;
  }
  function step(dt, w) {
    keys.forEach((k, j) => {
      const d = cache[k];
      if (!d || !d.smoke) return;
      if (d.src && w[j] > 0.05)
        for (const s of d.src) if (Math.random() < s.rate * dt) emit(d.smoke, s.x, s.y, s.o);
      stepParts(d.smoke, dt);
      if (d.smokeW) stepParts(d.smokeW, dt);
    });
  }

  function prebuild() {
    keys.forEach((k, i) => setTimeout(() => get(k), 250 + i * 220));
  }
  function resize(force) {
    const nw = innerWidth,
      nh = innerHeight;
    if (!force && nw === W && Math.abs(nh - H) < 140) {
      measure();
      return;
    }
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = nw;
    H = nh;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    CS = CB = CF = null;
    cKey = pKey = "";
    G = Math.max(56, H * 0.13);
    NB = Math.max(16, G * 0.18);
    base = H - G;
    S = Math.min(H * 0.5, 500) * (W < 600 ? 0.88 : 1);
    TOP = S * 1.45;
    cache = {};
    makeShared();
    measure();
    prebuild();
    if (reduce) render(0, 0);
  }
  let rz,
    raf = 0,
    dead = false;
  const onResize = () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      if (!dead) resize(false);
    }, 150);
  };
  const onLoad = () => measure();
  const onScroll = () => render(0, 0);
  addEventListener("resize", onResize);
  addEventListener("load", onLoad);
  if (document.fonts)
    document.fonts.ready.then(() => {
      if (!dead) measure();
    });
  const ro = new ResizeObserver(() => {
    if (!dead) measure();
  });
  ro.observe(main);
  resize(true);
  let prev = performance.now();
  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    if (now - prev < 32) return;
    const dt = Math.min(0.08, (now - prev) / 1000);
    prev = now;
    const w = render(now / 1000, dt);
    step(dt, w);
  }
  if (reduce) {
    render(0, 0);
    addEventListener("scroll", onScroll, { passive: true });
  } else raf = requestAnimationFrame(frame);

  return () => {
    dead = true;
    cancelAnimationFrame(raf);
    clearTimeout(rz);
    removeEventListener("resize", onResize);
    removeEventListener("load", onLoad);
    removeEventListener("scroll", onScroll);
    ro.disconnect();
  };
}
