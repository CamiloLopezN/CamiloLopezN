// lib/kit.js — the components every Studio film is made of (course of Movez §07–§09, built on lib/motion.js).
// Each one is a pure function of time drawn on a 2D canvas: seek(t) can paint frame 812 without frames 0–811.
// They were taken from films that passed the critique at 8+ (the first one: Lumia AI, 15 s), so a new film starts at
// that level and spends its effort on the idea, not on re-writing a masked word or a phone.
//
//   const S = stage({ fonts: { display: '"DIN Round Pro"' }, colors: { bg: '#1A1D22', text: '#F5F7FA' },
//                     gradient: ['#4285F4', '#9B72CB', '#D96570'] });
//   await S.load({ chat: 'assets/ui/chat.png' }, [500, 900]);
//   window.seek = (t) => S.frame(t, draw);
//
// Layout: never fixed pixels. S.u is one pixel at 1080 wide; S.pick({v, s, h}) picks the layout of 9:16, 1:1 or 16:9.
// Every word drawn with word()/line() registers its box on screen, so check.mjs can verify safe zones, overlaps and
// size at phone scale without looking at pixels.
import { spring, track, clamp, rng } from './motion.js';
export { spring, track, clamp, rng, indicator, swapAlpha, loopT } from './motion.js';

export const lerp = (a, b, x) => a + (b - a) * x;
export const track2 = (t, keys, k, d) => [track(t, keys.map(([tt, p]) => [tt, p[0]]), k, d), track(t, keys.map(([tt, p]) => [tt, p[1]]), k, d)];

// Spring presets of the course (§08)
export const SNAPPY = [320, 30], DEFAULT = [170, 26], HEAVY = [120, 24], PLAYFUL = [180, 12];

export function stage({ canvas = '#c', fonts = {}, colors = {}, gradient = [], grain = 0.045, base = 1080 } = {}) {
  const q = new URLSearchParams(location.search);
  const W = +q.get('w') || 1080, H = +q.get('h') || 1920;
  const cv = typeof canvas === 'string' ? document.querySelector(canvas) : canvas;
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const ar = W / H, mode = ar < 0.8 ? 'v' : ar > 1.3 ? 'h' : 's', u = Math.min(W, H) / base;
  const FONTS = { display: fonts.display ?? 'sans-serif', ui: fonts.ui ?? fonts.display ?? 'sans-serif' };
  const C = { bg: '#111', text: '#fff', muted: '#999', ...colors };
  const img = {};
  let boxes = [];

  const S = {
    W, H, u, mode, g, C, img, FONTS,
    pick: (layouts) => layouts[mode] ?? layouts.v,

    // ---------- type ----------
    font(weight, size, family = 'display') { g.font = `${weight} ${size}px ${FONTS[family] ?? family}`; g.letterSpacing = `${-0.02 * size}px`; },
    measure(txt, weight, size, family = 'display') { S.font(weight, size, family); return g.measureText(txt).width; },
    gradient(x0, x1, stops = gradient) {
      const gr = g.createLinearGradient(x0, 0, x1, 0);
      stops.forEach((c, i) => gr.addColorStop(stops.length > 1 ? i / (stops.length - 1) : 0, c));
      return gr;
    },
    // fill spec: a color, 'grad' (the brand gradient across the shape) or a CanvasGradient
    paint(fill, x0, x1) { return fill === 'grad' || fill === 'deg' ? S.gradient(x0, x1) : fill ?? C.text; },
    rrect(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); },

    // Word behind a line mask: comes up from below (heavy spring, no overshoot) and leaves upwards. Returns its width.
    word(txt, x, y, { size, weight = 900, fill, tIn = 0, tOut = null, align = 'left', family = 'display', role = 'text', markAs = txt } = {}, t) {
      const a = spring(t - tIn, 150, 25), b = tOut == null ? 0 : spring(t - tOut, 260, 30);
      if (a <= 0.001 || b >= 0.999) return 0;
      S.font(weight, size, family);
      const w = g.measureText(txt).width, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      g.save();
      g.beginPath(); g.rect(x0 - size * 0.2, y - size * 1.0, w + size * 0.4, size * 1.24); g.clip();
      g.fillStyle = S.paint(fill, x0, x0 + w);
      g.fillText(txt, x0, y + size * 1.35 * (1 - a) - size * 1.7 * b);
      g.restore();
      if (a > 0.6 && b < 0.4) S.mark(markAs, x0, y - size * 0.78, w, size * 0.98, size, role);   // markAs: one name for a text that changes (a count)
      return w;
    },
    // Words on lines that wrap at maxw. words: [[text, fill, time?]] or strings (a time overrides the stagger). Stagger: each word enters `step` later.
    // Returns {w, h, lines}.
    // rowStep: with a number, word c of row r enters at tIn + step·(c + r·rowStep) instead of one global count.
    line(words, x, y, { size, weight = 900, gap = 0.26, lh = 1.12, align = 'left', maxw = Infinity, tIn = 0, tOut = null, step = 0.06, rowStep = null, family = 'display', valign = 'top' } = {}, t) {
      S.font(weight, size, family);
      const esp = size * gap, rows = [[]];
      let ancho = 0;
      for (const it of words) {
        const [w, fill, at] = Array.isArray(it) ? it : [it, undefined, undefined];
        const ww = g.measureText(w).width;
        if (ancho + ww > maxw && rows.at(-1).length) { rows.push([]); ancho = 0; }
        rows.at(-1).push([w, fill, ww, at]); ancho += ww + esp;
      }
      const lineH = size * lh, alto = rows.length * lineH;
      let i = 0, maxW = 0;
      rows.forEach((row, ri) => {
        const total = row.reduce((a, [, , ww]) => a + ww + esp, -esp);
        maxW = Math.max(maxW, total);
        let xx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
        const yy = y + ri * lineH - (valign === 'middle' ? (alto - lineH) / 2 : 0);   // middle: y is the baseline of a centred single line
        row.forEach(([w, fill, ww, at], ci) => {
          const n = rowStep == null ? i++ : ci + ri * rowStep;
          S.word(w, xx, yy, { size, weight, fill, tIn: at ?? tIn + step * n, tOut, family }, t); xx += ww + esp;
        });
      });
      return { w: maxW, h: alto, lines: rows.length };
    },
    // Scale of a word that lands on a beat: a quick punch at t0
    punch(t, t0, amount = 0.08) { return 1 + amount * (spring(t - t0, 500, 26) - spring(t - t0 - 0.06, 400, 30)); },

    // A word whose letters fall apart and leave (something forgotten, lost, broken). Enters like word() at tIn.
    scatter(txt, x, y, size, t, { tIn = 0, tBreak, fill = 'grad', seed = 23, spread = 300, fall = 520, fallRange = 420, weight = 900 } = {}) {
      S.font(weight, size);
      const total = g.measureText(txt).width, a = spring(t - tIn, 150, 25), r = rng(seed);
      let cx = x;
      for (const [i, ch] of [...txt].entries()) {
        const cw = g.measureText(ch).width, vx = (r() - 0.2) * spread * u, vy = (fall + r() * fallRange) * u, rot = (r() - 0.5) * 2.2;
        const s = clamp((t - tBreak - i * 0.05) / 0.45), e = s * s;
        g.save();
        g.beginPath(); if (s <= 0) g.rect(x - size * 0.2, y - size, total + size * 0.4, size * 1.3); else g.rect(0, 0, W, H); g.clip();
        g.translate(cx + cw / 2 + vx * e, y - size * 0.35 + vy * e + size * 1.1 * (1 - a)); g.rotate(rot * e);
        g.globalAlpha = 1 - e;
        g.fillStyle = fill === 'grad' ? S.gradient(-cw / 2 - (cx - x), total - (cx - x) - cw / 2) : fill;
        g.fillText(ch, -cw / 2, size * 0.35);
        g.restore();
        cx += cw + parseFloat(g.letterSpacing);
      }
      if (a > 0.6 && t < tBreak) S.mark(txt, x, y - size * 0.78, total, size * 0.98, size);
      return total + size * 0.24;
    },

    // Big number that counts and punches each time it changes
    counter(t, n, x, y, size, { tIn = 0, tChange = tIn, fill = 'grad', weight = 900 } = {}) {
      const entra = spring(t - tIn, 150, 22), golpe = 1 + 0.1 * (spring(t - tChange - 0.2, 500, 24) - spring(t - tChange - 0.28, 400, 30));
      S.font(weight, size); const txt = String(n), nw = g.measureText(txt).width;
      g.save(); g.translate(x + nw / 2, y); g.scale(golpe * (0.6 + 0.4 * entra), golpe * (0.6 + 0.4 * entra));
      g.beginPath(); g.rect(-nw, -size, nw * 2, size * 1.25); g.clip();
      g.fillStyle = S.paint(fill, -nw / 2, nw / 2); g.fillText(txt, -nw / 2, size * (1 - entra));
      g.restore();
      if (entra > 0.6) S.mark(txt, x, y - size * 0.78, nw, size * 0.98, size, 'number');
      return nw;
    },

    // Largest size (≤ size, ≥ min) at which the words fit in maxw on at most maxLines lines.
    fit(words, { size, min = size * 0.5, maxw, maxLines = 3, weight = 900, gap = 0.26, family = 'display' }) {
      const list = words.map((w) => (Array.isArray(w) ? w[0] : w));
      for (let sz = size; sz >= min; sz *= 0.95) {
        S.font(weight, sz, family);
        let rows = 1, ancho = 0;
        for (const w of list) { const ww = g.measureText(w).width; if (ancho + ww > maxw && ancho > 0) { rows++; ancho = 0; } ancho += ww + sz * gap; }
        if (rows <= maxLines && list.every((w) => g.measureText(w).width <= maxw)) return sz;
      }
      return min;
    },
    // Rounded card that rises into place (snappy) and can be pressed/dimmed. Returns the visible rect.
    card(x, y, w, h, t, { tIn = 0, fill = C.card ?? '#22262B', stroke = null, radius = 28 * u, rise = 60 * u, scale = 1, alpha = 1, shadow = true } = {}) {
      const a = spring(t - tIn, 320, 30);
      if (a <= 0.001) return null;
      const cy = y + h / 2 + rise * (1 - a), cx = x + w / 2, k = scale * (0.92 + 0.08 * a);
      g.save(); g.globalAlpha = alpha * clamp(a * 1.4); g.translate(cx, cy); g.scale(k, k);
      if (shadow) { g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 30 * u; g.shadowOffsetY = 14 * u; }
      S.rrect(-w / 2, -h / 2, w, h, radius); g.fillStyle = fill; g.fill(); g.shadowColor = 'transparent';
      if (stroke) { g.lineWidth = 3 * u; g.strokeStyle = stroke; g.stroke(); }
      g.restore();
      return { x: cx - (w * k) / 2, y: cy - (h * k) / 2, w: w * k, h: h * k, cx, cy, k, a };
    },
    // Countdown ring: progress 1 → 0, with the number in the middle (punches on each second)
    ring(x, y, r, t, { t0, seconds, color = C.accent ?? '#fff', track = 'rgba(255,255,255,0.12)', width = 14 * u, size = 64 * u } = {}) {
      const e = t - t0; if (e < -0.3 || e > seconds + 0.35) return;
      const a = spring(e + 0.3, 320, 30), out = spring(e - seconds, 300, 30), k = a * (1 - out);
      if (k <= 0.001) return;
      const left = clamp(1 - e / seconds), n = Math.max(1, Math.ceil(seconds - Math.max(0, e)));
      g.save(); g.translate(x, y); g.scale(k, k);
      g.lineWidth = width; g.strokeStyle = track; g.beginPath(); g.arc(0, 0, r, 0, 6.2832); g.stroke();
      g.strokeStyle = e > seconds - 1 ? (Math.floor(e * 8) % 2 ? color : '#FFFFFF') : color; g.lineCap = 'round';
      g.beginPath(); g.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + 6.2832 * left); g.stroke();
      const tick = Math.max(0, e) % 1, punch = e >= 0 ? 1 + 0.18 * Math.exp(-tick * 9) : 1;
      g.scale(punch, punch); S.font(900, size); g.fillStyle = C.text; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(n), 0, size * 0.04); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.restore();
      if (k > 0.9) S.mark(String(n), x - size * 0.3, y - size * 0.5, size * 0.6, size, size * k, 'number');
    },
    // Check mark drawn as a stroke (progress 0 → 1)
    check(x, y, size, p, color = '#fff', width = 10 * u) {
      if (p <= 0) return;
      const pts = [[-0.42, 0.02], [-0.12, 0.32], [0.45, -0.3]].map(([a, b]) => [x + a * size, y + b * size]);
      const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
      const d = p * (l1 + l2);
      g.save(); g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = color;
      g.beginPath(); g.moveTo(...pts[0]);
      if (d <= l1) g.lineTo(pts[0][0] + (pts[1][0] - pts[0][0]) * d / l1, pts[0][1] + (pts[1][1] - pts[0][1]) * d / l1);
      else { g.lineTo(...pts[1]); const e = (d - l1) / l2; g.lineTo(pts[1][0] + (pts[2][0] - pts[1][0]) * e, pts[1][1] + (pts[2][1] - pts[1][1]) * e); }
      g.stroke(); g.restore();
    },
    // A word slammed on like a rubber stamp (playful spring, tilted), for surprises and verdicts
    stamp(txt, x, y, size, t, t0, { color = C.accent ?? '#fff', rot = -0.12, fill = null, ink = null } = {}) {
      const e = t - t0; if (e < 0) return;
      const s = spring(e, 180, 12), k = 1.9 - 0.9 * s;
      S.font(900, size); const w = g.measureText(txt).width, pad = size * 0.32;
      g.save(); g.translate(x, y); g.rotate(rot * s); g.scale(k, k); g.globalAlpha = clamp(e * 8);
      S.rrect(-w / 2 - pad, -size * 0.62 - pad * 0.6, w + 2 * pad, size * 1.24 + pad * 1.2, size * 0.22);
      if (fill) { g.fillStyle = fill; g.fill(); }
      g.lineWidth = size * 0.09; g.strokeStyle = color; g.stroke();
      g.fillStyle = ink ?? (fill ? C.text : color); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, size * 0.04);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.restore();
      // the box is the whole stamp (frame included, tilted): nothing may sit under it
      const bw = w + 2 * pad, bh = size * 1.24 + pad * 1.2, c = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot));
      const ew = bw * c + bh * sn, eh = bw * sn + bh * c;
      if (s > 0.6) S.mark(txt, x - ew / 2, y - eh / 2, ew, eh, size, 'stamp');
      return { w: ew, h: eh };
    },

    // ---------- background, grain ----------
    background(t, { color = C.bg, dots = '#262A30', spacing = 46, speed = [14, 22], shift = 0, radius = 2.2 } = {}) {
      g.fillStyle = color; g.fillRect(0, 0, W, H);
      if (!dots) return;
      const p = spacing * u, ox = (-t * speed[0] * u - shift * 0.25) % p, oy = (-t * speed[1] * u) % p;
      g.fillStyle = dots;
      for (let y = oy; y < H + p; y += p) for (let x = ox; x < W + p; x += p) { g.beginPath(); g.arc(x, y, radius * u, 0, 6.2832); g.fill(); }
    },
    grain(t, alpha = grain) {
      if (!alpha) return;
      if (!S._grain) {
        S._grain = [];
        for (let k = 0; k < 3; k++) {
          const c = new OffscreenCanvas(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256), r = rng(11 + k);
          for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
          x.putImageData(d, 0, 0); S._grain.push(g.createPattern(c, 'repeat'));
        }
      }
      g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = 'overlay'; g.fillStyle = S._grain[Math.floor(t * 24) % 3]; g.fillRect(0, 0, W, H); g.restore();
    },

    // ---------- device with real screenshots, camera, cursor ----------
    // A phone that shows real screenshots (srcW×srcH px) at height h, centred on the camera. Coordinates of the
    // screenshot are used everywhere (bands, chips, cursor), so nothing in the app is redrawn: it is cut and animated.
    device({ srcW = 1170, srcH = 2532, h, cx, cy }) {
      const K = h / srcH, PW = srcW * K;
      const loc = (sx, sy) => [(sx - srcW / 2) * K, (sy - srcH / 2) * K];
      const toCanvas = (cam, [lx, ly]) => [cam.cx + (lx - cam.fx) * cam.z, cam.cy + (ly - cam.fy) * cam.z];
      const D = {
        K, PW, h, srcW, srcH, cx, cy, loc, toCanvas,
        // draw(t, cam, screens | fn): screens = [[image, offset in screen widths]], or fn() that paints inside the screen
        draw(cam, screens, { frame = '#0E0F12', edge = '#33373C', zoomClip = null } = {}) {
          g.save();
          if (zoomClip) zoomClip(cam);
          g.translate(cam.cx, cam.cy); g.scale(cam.z, cam.z); g.translate(-cam.fx, -cam.fy);
          const bz = 0.035 * PW, rx = -PW / 2 - bz, ry = -h / 2 - bz, rw = PW + 2 * bz, rh = h + 2 * bz;
          g.save(); g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 80 * u; g.shadowOffsetY = 40 * u;
          S.rrect(rx, ry, rw, rh, 0.15 * PW); g.fillStyle = frame; g.fill(); g.restore();
          g.lineWidth = 3 * u; g.strokeStyle = edge; S.rrect(rx, ry, rw, rh, 0.15 * PW); g.stroke();
          g.save(); S.rrect(-PW / 2, -h / 2, PW, h, 0.11 * PW); g.clip();
          g.fillStyle = '#FFFFFF'; g.fillRect(-PW / 2, -h / 2, PW, h);
          if (typeof screens === 'function') screens();
          else for (const [im, off] of screens) g.drawImage(im, -PW / 2 + off * PW, -h / 2, PW, h);
          g.restore();
          g.restore();
        },
        // The screen builds itself from horizontal bands of a screenshot, one per step, alternating sides.
        assemble(t, im, bands, { t0, step = 0.2, k = 240, d = 22, tilt = 0.12 }) {
          bands.forEach(([y0, y1], i) => {
            const s = spring(t - (t0 + i * step), k, d), side = i % 2 ? 1 : -1;
            if (s <= 0.001) return;
            const dy = (y1 - y0) * K, oy = -h / 2 + y0 * K;
            g.save();
            g.translate(side * PW * 1.05 * (1 - s), 0);
            g.translate(0, oy + dy / 2); g.rotate(side * tilt * (1 - s)); g.translate(0, -(oy + dy / 2));
            g.drawImage(im, 0, y0, srcW, y1 - y0, -PW / 2, oy, PW, dy);
            g.restore();
          });
        },
        // A piece of the screen (rect in screenshot px) lifts off it on a click, leaving its gap, then settles back.
        lift(t, cam, im, [sx, sy, sw, sh], { t0, t1, scale = 1.25, circle = false, gap = '#E6E8EC', radius = 26 }) {
          const s = t - t0; if (s < 0 || t > t1) return;
          const up = spring(s, 320, 20), beat = circle ? 0.05 * Math.sin(2 * Math.PI * 2 * s) * Math.exp(-s * 2.5) : 0;
          const [x, y] = toCanvas(cam, loc(sx + sw / 2, sy + sh / 2)), f = K * cam.z * (1 + (scale - 1) * up + beat);
          g.save(); g.translate(x, y); g.scale(K * cam.z, K * cam.z); g.globalAlpha = clamp(up * 1.5);
          if (circle) { g.beginPath(); g.arc(0, 0, sw / 2 - 6, 0, 6.2832); } else S.rrect(-sw / 2 + 4, -sh / 2 + 4, sw - 8, sh - 8, radius - 2);
          g.fillStyle = gap; g.fill(); g.restore();
          g.save(); g.translate(x, y - 46 * u * up); g.scale(f, f);
          g.shadowColor = 'rgba(10,12,16,0.45)'; g.shadowBlur = 50 * u * up / f; g.shadowOffsetY = 26 * u * up / f;
          if (circle) { g.beginPath(); g.arc(0, 0, sw / 2, 0, 6.2832); g.closePath(); } else S.rrect(-sw / 2, -sh / 2, sw, sh, radius);
          g.fillStyle = '#fff'; g.fill(); g.shadowColor = 'transparent'; g.clip();
          g.drawImage(im, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
          g.restore();
        },
      };
      return D;
    },
    // Camera: zoom and focus keyframes driven by springs (track), plus a slow continuous push.
    camera(t, { cx, cy, zoom, focus, push = 0, pushFrom = 0, pushDur = 8 }) {
      const z = track(t, zoom, 170, 26) * (1 + push * clamp((t - pushFrom) / pushDur));
      const [fx, fy] = focus ? track2(t, focus, 170, 26) : [0, 0];
      return { cx, cy, z, fx, fy };
    },
    // Navigation push between screens, like the app: returns [[key, offset]] for device.draw.
    // steps: [[time, key, {back, lead}]], the first at 0. back = the new screen comes from the left (going back).
    screens(t, steps, { k = 260, d = 27, lead = 0.15 } = {}) {
      const L = (s) => s[2]?.lead ?? lead;
      let i = 0; while (i + 1 < steps.length && t >= steps[i + 1][0] - L(steps[i + 1])) i++;
      if (i === 0) return [[steps[0][1], 0]];
      const p = spring(t - (steps[i][0] - L(steps[i])), k, d);
      if (p >= 0.999) return [[steps[i][1], 0]];
      return steps[i][2]?.back ? [[steps[i - 1][1], p], [steps[i][1], -(1 - p)]] : [[steps[i - 1][1], -p], [steps[i][1], 1 - p]];
    },
    // Arrow cursor with press-in and a ring in the brand gradient on each click
    cursor(t, x, y, clicks = [], { scale = 1.25 } = {}) {
      for (const c of clicks) {
        const s = t - c; if (s < 0 || s > 0.55) continue;
        g.save(); g.lineWidth = 7 * u * (1 - s / 0.55); g.strokeStyle = S.gradient(x - 90 * u, x + 90 * u);
        g.beginPath(); g.arc(x, y, (14 + 110 * spring(s, 170, 26)) * u, 0, 6.2832); g.stroke(); g.restore();
      }
      const s = Math.min(...clicks.map((c) => (t >= c && t < c + 0.2 ? t - c : 9)), 9);
      const press = s < 0.2 ? 1 - 0.14 * Math.sin(Math.PI * s / 0.2) : 1, k = scale * u * press;
      g.save(); g.translate(x, y); g.scale(k, k); g.rotate(-0.08);
      g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 62); g.lineTo(15, 48); g.lineTo(26, 72); g.lineTo(37, 67); g.lineTo(26, 44); g.lineTo(45, 44); g.closePath();
      g.fillStyle = '#FFFFFF'; g.fill(); g.shadowColor = 'transparent'; g.lineWidth = 3.5; g.strokeStyle = '#111317'; g.stroke();
      g.restore();
    },

    // ---------- logo ----------
    // The symbol rises big from below, travels to its place inside the horizontal logo and the name is revealed
    // behind it. symbolBox: where the symbol sits inside the horizontal logo (px of that image); nameFrom: x where
    // the name starts in it.
    logoReveal(t, { symbol, wordmark, cx, cy, w, t0, symbolBox, nameFrom, bigH }) {
      if (t < t0 - 0.05) return;
      const up = spring(t - (t0 + 0.05), 150, 21), travel = spring(t - (t0 + 0.7), 150, 24), reveal = spring(t - (t0 + 0.85), 120, 24);
      const sc = w / wordmark.width, lx = cx - w / 2, ly = cy - (wordmark.height * sc) / 2;
      const small = { x: lx + symbolBox[0] * sc, y: ly + symbolBox[1] * sc, w: symbolBox[2] * sc, h: symbolBox[3] * sc };
      const gh = bigH ?? Math.min(H * 0.5, 860 * u), big = { w: gh * symbol.width / symbol.height, h: gh };
      big.x = cx - big.w / 2; big.y = cy - gh * 0.62 + H * 0.8 * (1 - up);
      g.drawImage(symbol, lerp(big.x, small.x, travel), lerp(big.y, small.y, travel), lerp(big.w, small.w, travel), lerp(big.h, small.h, travel));
      if (reveal > 0.001) {
        const ww = (wordmark.width - nameFrom) * reveal;
        g.drawImage(wordmark, nameFrom, 0, ww, wordmark.height, lx + nameFrom * sc, ly, ww * sc, wordmark.height * sc);
      }
    },

    // ---------- transitions ----------
    // Horizontal whip off-screen: translate everything drawn in fn by the spring of t0.
    whip(t, t0, fn, { dir = -1, k = 300, d = 30, dist = 1.15 } = {}) {
      const s = spring(t - t0, k, d); if (s > 0.999) return;
      const was = S.moving; S.moving = was || s > 0.01;
      g.save(); g.translate(dir * W * dist * s, 0); fn(s); g.restore();
      S.moving = was;
    },
    // A beat of the film that is not a new text (a highlight, a fill, a punch): check.mjs counts it for the rhythm.
    beat(t, t0, name = 'beat') { if (t >= t0 && t < t0 + 0.25) boxes.push({ txt: `·${name}@${t0}`, role: 'beat', x: 0, y: 0, w: 0, h: 0, size: 0 }); },
    // Everything marked inside fn counts as «moving» (a transition): check.mjs leaves it out of safe zone and contrast.
    inMotion(moving, fn) { const was = S.moving; S.moving = was || moving; try { return fn(); } finally { S.moving = was; } },

    // ---------- assets and the frame ----------
    async load(images = {}, weights = [500, 700, 900]) {
      await Promise.all(Object.entries(images).map(([k, src]) => new Promise((ok, ko) => {
        const i = new Image(); i.onload = () => { img[k] = i; ok(); }; i.onerror = () => ko(new Error(`no image ${src}`)); i.src = src;
      })));
      const fams = [...new Set(Object.values(FONTS))];
      await Promise.all(fams.flatMap((f) => weights.map((p) => document.fonts.load(`${p} 100px ${f}`))));
    },
    // Box of something readable on screen, in canvas pixels (the current transform is applied)
    mark(txt, x, y, w, h, size, role = 'text') {
      const m = g.getTransform(), pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([a, b]) => [m.a * a + m.c * b + m.e, m.b * a + m.d * b + m.f]);
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), sc = Math.hypot(m.a, m.b);
      boxes.push({ txt, role, x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), size: size * sc, ...(S.moving ? { moving: true } : {}) });
    },
    frame(t, draw) { boxes = []; S.moving = false; draw(t); S.grain(t); return true; },
  };
  // what check.mjs reads after each seek
  window.__studio = { boxes: () => boxes, W, H, mode };
  return S;
}

// Live preview in a normal browser (off during headless render): call once after window.seek is set.
export function preview(dur) {
  if (navigator.webdriver) return;
  const t0 = performance.now();
  (function loop() { window.seek(((performance.now() - t0) / 1000) % dur); requestAnimationFrame(loop); })();
}
