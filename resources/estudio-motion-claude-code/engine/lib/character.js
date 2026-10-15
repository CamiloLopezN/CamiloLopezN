// Characters rigged from their own SVG, animated like a game mascot (squash and stretch, anticipation, overshoot,
// blinking, a mouth that talks). Pure function of time: the pose at t comes from a list of timed actions.
//
//   const lior = await rig(S, {default: svgText, happy: svgText, …});        // the SVGs of one character
//   lior.draw(t, {x, y, h, acts: [{at: 0.2, type: 'enter'}, {at: 3, type: 'jump'}], talk: [[0.5, 2.4]], seed: 3});
//
// x, y: the point between the feet on the ground; h: height of the drawing in px.
// Actions: enter · exit · hop · jump (celebration, arms up) · cheer (dur) · wave (dur) · think (dur) · surprise ·
// sad (dur) · point (dur, side: 1 right / -1 left) · look (dur, dir) · nod. Each one may set the face (an emotion of
// the SVG set); with no action the face is the default one, which blinks and talks.
//
// The rig reads the SVG once: legs (the parts that reach the ground), arms (the parts at the sides), the face (what
// changes between emotions; in the default face, the eyes blink and the biggest piece is the mouth) and the body.
import { spring, clamp, rng } from './motion.js';

const VB = [612, 792];
const area = (b) => b.width * b.height;

export async function rig(S, svgs) {
  const { g } = S;
  const parse = (txt) => new DOMParser().parseFromString(txt, 'image/svg+xml').documentElement;
  const base = parse(svgs.default);
  const vb = (base.getAttribute('viewBox') || `0 0 ${VB[0]} ${VB[1]}`).split(/[\s,]+/).map(Number);
  const [VW, VH] = [vb[2], vb[3]];
  const rootFill = base.getAttribute('fill') || '#22262b';
  // bboxes need the elements in the document
  const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  host.setAttribute('viewBox', vb.join(' ')); host.setAttribute('width', VW); host.setAttribute('height', VH);
  host.style.cssText = 'position:absolute;left:-99999px;top:0;visibility:hidden';
  document.body.appendChild(host);
  const measure = (el) => { const c = el.cloneNode(true); host.appendChild(c); const b = c.getBBox(); host.removeChild(c); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
  const image = (els) => new Promise((ok, ko) => {
    const body = els.map((e) => e.outerHTML).join('');
    const src = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${VW * 2}" height="${VH * 2}" fill="${rootFill}">${body}</svg>`;
    const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('svg part')); i.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;
  });

  // ---- what belongs to the face: absent from another emotion of the same character ----
  const other = Object.entries(svgs).find(([k]) => k !== 'default');
  const otherSet = new Set(other ? [...parse(other[1]).children].map((e) => e.outerHTML) : []);
  const kids = [...base.children];
  const info = kids.map((el) => ({ el, b: measure(el), fill: el.getAttribute('fill'), face: other ? !otherSet.has(el.outerHTML) : false }));
  const body = info.filter((p) => !p.face && p.fill).sort((a, b) => area(b.b) - area(a.b))[0];
  const ground = Math.max(...info.filter((p) => !p.face).map((p) => p.b.y + p.b.height));
  const cx0 = VW / 2;

  // ---- classify ----
  for (const p of info) {
    const { x, y, width: w, height: h } = p.b, cx = x + w / 2;
    if (p.face) { p.role = 'face'; continue; }
    if (p === body) { p.role = 'body'; continue; }
    if (y + h >= ground - 30 && y > VH * 0.45 && (h > 1.5 * w || w > VW * 0.33)) { p.role = w > VW * 0.33 ? 'legs' : cx < cx0 ? 'legL' : 'legR'; continue; }
    if (w > VW * 0.85 && h < VH * 0.35) { p.role = 'arms'; continue; }
    if (w < VW * 0.42 && w > VW * 0.2 && Math.abs(cx - cx0) > VW * 0.18 && w / h > 0.7 && w / h < 1.4 && y > VH * 0.12) { p.role = cx < cx0 ? 'armL' : 'armR'; continue; }
    p.role = 'body';
  }
  // the default face: the mouth is its biggest piece (with whatever sits inside it, teeth); above it, a dark piece
  // with another dark piece under it is a brow, the rest are eyes (with their white highlights)
  const face = info.filter((p) => p.role === 'face');
  const dark = (p) => !p.fill || p.fill === rootFill || /^#2[0-9a-f]2[0-9a-f]2[0-9a-f]$/i.test(p.fill);
  const ctr = (b) => [b.x + b.width / 2, b.y + b.height / 2];
  const mouth = face.slice().sort((a, b) => area(b.b) - area(a.b))[0];
  const inMouth = (p) => { const [x, y] = ctr(p.b), m = mouth.b; return x >= m.x - 4 && x <= m.x + m.width + 4 && y >= m.y - 4 && y <= m.y + m.height + 4; };
  const above = face.filter((p) => p !== mouth && !inMouth(p) && ctr(p.b)[1] < mouth.b.y + 4);
  const overX = (a, b) => a.b.x < b.b.x + b.b.width && b.b.x < a.b.x + a.b.width;
  for (const p of face) {
    if (p === mouth || inMouth(p)) { p.role = 'mouth'; continue; }
    if (!above.includes(p)) { p.role = 'brow'; continue; }
    if (dark(p) && above.some((q) => q !== p && dark(q) && overX(p, q) && ctr(q.b)[1] > ctr(p.b)[1] + p.b.height)) { p.role = 'brow'; continue; }
    p.role = 'eye';
  }
  const faceBox = (() => { const fs = face.map((p) => p.b); const x0 = Math.min(...fs.map((b) => b.x)), y0 = Math.min(...fs.map((b) => b.y)); return { cx: (x0 + Math.max(...fs.map((b) => b.x + b.width))) / 2, cy: (y0 + Math.max(...fs.map((b) => b.y + b.height))) / 2 }; })();

  // pivots in SVG units
  for (const p of info) {
    const { x, y, width: w, height: h } = p.b;
    p.pivot = p.role === 'armL' ? [x + w * 0.9, y + h * 0.9] : p.role === 'armR' ? [x + w * 0.1, y + h * 0.9]
      : p.role.startsWith('leg') ? [x + w / 2, y + 6] : p.role === 'mouth' ? [mouth.b.x + mouth.b.width / 2, mouth.b.y] : p.role === 'eye' ? [x + w / 2, y + h / 2] : [cx0, ground];
    p.img = await image([p.el]);
  }
  // emotion faces: whatever each emotion adds to the body
  const baseSet = new Set(kids.filter((e) => !face.some((p) => p.el === e)).map((e) => e.outerHTML));
  const faces = {};
  for (const [k, txt] of Object.entries(svgs)) {
    if (k === 'default') continue;
    const add = [...parse(txt).children].filter((e) => !baseSet.has(e.outerHTML));
    if (add.length) faces[k] = await image(add);
  }
  host.remove();

  // ---------- the pose at t ----------
  const ACT_LEN = { enter: 0.9, exit: 0.6, hop: 0.55, jump: 0.85, surprise: 0.8, nod: 0.5 };
  function pose(t, { acts = [], talk = [], seed = 1 }) {
    const P = { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, armL: 0, armR: 0, legL: 0, legR: 0, face: 'default', look: 0, mouth: 0, blink: 0, alpha: 1, scale: 1, brow: 0 };
    // idle: breathing, a little sway, the arms float
    const br = Math.sin(2 * Math.PI * t / 1.7 + seed);
    P.sy += 0.018 * br; P.sx -= 0.012 * br; P.rot += 0.025 * Math.sin(2 * Math.PI * t / 2.9 + seed * 2);
    P.armL += 0.07 * Math.sin(2 * Math.PI * t / 1.9 + seed); P.armR -= 0.07 * Math.sin(2 * Math.PI * t / 2.1 + seed * 3);
    // blinking: every 2–4.5 s, seeded
    const r = rng(seed * 977 + 13); let bt = r() * 2;
    while (bt < t + 0.2) { const e = t - bt; if (e >= 0 && e < 0.16) P.blink = Math.sin(Math.PI * e / 0.16); bt += 2 + r() * 2.5; }
    // talking: the mouth opens and closes at a syllable rate, irregular
    for (const [a, b] of talk) if (t >= a && t <= b) {
      P.talking = true;
      const k = Math.floor(t * 9), rr = rng(seed * 31 + k)(), f = (t * 9) % 1;
      P.mouth = clamp(0.35 + 0.65 * rr) * Math.sin(Math.PI * f) * clamp((t - a) / 0.05) * clamp((b - t) / 0.05);
    }
    let visible = acts.some((a) => a.type === 'enter') ? 0 : 1;
    for (const a of acts) {
      const e = t - a.at; if (e < 0) continue;
      const dur = a.dur ?? ACT_LEN[a.type] ?? 1, on = e <= dur, out = clamp((e - dur) / 0.25), held = on ? 1 : 1 - out;
      switch (a.type) {
        case 'enter': {                                    // pops up from below, overshoots, squashes on landing
          const s = spring(e, 200, 13); visible = 1;
          P.dy += (1 - clamp(s)) * 1.1; P.scale *= 0.4 + 0.6 * clamp(s * 1.2);
          const land = e > 0.25 ? Math.exp(-(e - 0.25) * 9) * Math.sin((e - 0.25) * 30) : 0;
          P.sy *= 1 - 0.12 * land; P.sx *= 1 + 0.1 * land; P.armL += 0.5 * (1 - s); P.armR -= 0.5 * (1 - s);
          if (e < 1.2) P.face = a.face ?? 'happy';
          break;
        }
        case 'exit': { const s = spring(e, 260, 22); P.dy += 1.3 * s; P.scale *= 1 - 0.3 * s; if (s > 0.98) visible = 0; break; }
        case 'hop': case 'jump': {
          const big = a.type === 'jump', air = big ? 0.5 : 0.32, H = big ? 0.32 : 0.14, pre = 0.12;
          if (e < pre) { const k = Math.sin(Math.PI / 2 * e / pre); P.sy *= 1 - 0.12 * k; P.sx *= 1 + 0.1 * k; }
          else if (e < pre + air) { const u = (e - pre) / air; P.dy -= H * 4 * u * (1 - u); P.sy *= 1 + 0.12 * (1 - u * 1.4); P.sx *= 1 - 0.08 * (1 - u * 1.4);
            if (big) { P.armL += 0.9 * Math.sin(Math.PI * u); P.armR -= 0.9 * Math.sin(Math.PI * u); P.legL -= 0.25 * Math.sin(Math.PI * u); P.legR += 0.25 * Math.sin(Math.PI * u); } }
          else { const l = e - pre - air; const k = Math.exp(-l * 10) * Math.cos(l * 26); P.sy *= 1 - 0.14 * k; P.sx *= 1 + 0.11 * k; }
          if (big && e < dur + 0.6) P.face = a.face ?? 'celebrating';
          break;
        }
        case 'cheer': if (held > 0) {                     // arms pumping, little hops
          const ph = Math.sin(2 * Math.PI * 4 * e);
          P.armL += held * (0.6 + 0.35 * ph); P.armR -= held * (0.6 - 0.35 * ph);
          P.dy -= held * 0.035 * Math.abs(Math.sin(2 * Math.PI * 2 * e)); P.face = on ? (a.face ?? 'celebrating') : P.face;
        } break;
        case 'wave': if (held > 0) {
          const side = a.side ?? 1, w = Math.sin(2 * Math.PI * 3 * e) * 0.4 + 0.5;
          if (side > 0) P.armR -= held * w; else P.armL += held * w;
          P.rot += held * 0.04 * side; if (on) P.face = a.face ?? 'happy';
        } break;
        case 'think': if (held > 0) {
          const s = spring(e, 170, 20) * held;
          P.rot -= 0.09 * s; P.armR += 0.55 * s; P.look += -0.6 * s; P.dy += 0.01 * s * Math.sin(2 * Math.PI * 1.5 * e);
          if (on) P.face = a.face ?? 'thinking';
        } break;
        case 'surprise': { const s = Math.exp(-e * 5) * Math.sin(e * 18); P.sy *= 1 + 0.12 * s; P.sx *= 1 - 0.08 * s; P.armL += 0.6 * Math.exp(-e * 3); P.armR -= 0.6 * Math.exp(-e * 3); P.brow -= 1;
          if (e < dur) P.face = a.face ?? 'surprised'; break; }
        case 'sad': if (held > 0) {
          const s = spring(e, 120, 18) * held;
          P.sy *= 1 - 0.06 * s; P.sx *= 1 + 0.04 * s; P.rot += 0.07 * s; P.armL -= 0.7 * s; P.armR += 0.7 * s; P.dy += 0.015 * s;
          if (on) P.face = a.face ?? 'disappointed';
        } break;
        case 'point': if (held > 0) {                     // reaches towards a side (an answer)
          const side = a.side ?? 1, s = spring(e, 260, 18) * held;
          if (side > 0) P.armR -= 0.6 * s; else P.armL += 0.6 * s; P.rot += 0.08 * side * s; P.look += 0.8 * side * s;
          if (on) P.face = a.face ?? 'focused';
        } break;
        case 'look': if (held > 0) P.look += (a.dir ?? 1) * spring(e, 200, 20) * held; break;
        case 'nod': { const s = Math.sin(Math.PI * clamp(e / 0.5)) * (e < 0.5 ? 1 : 0); P.sy *= 1 - 0.05 * s; P.rot += 0.03 * s; break; }
        default: break;
      }
    }
    P.alpha = visible;
    return P;
  }

  // ---------- drawing ----------
  function draw(t, { x, y, h, acts, talk, seed = 1, flip = false, emotion = null }) {
    const P = pose(t, { acts, talk, seed });
    if (!P.alpha) return P;
    if (emotion) P.face = emotion;
    const k = (h / (ground - Math.min(...info.map((p) => p.b.y)))) * P.scale;
    g.save();
    g.translate(x, y + P.dy * h); g.scale(flip ? -1 : 1, 1);
    g.rotate(P.rot); g.scale(P.sx * k, P.sy * k); g.translate(-cx0, -ground);
    const useFace = P.face === 'default' || !faces[P.face];
    const look = P.look * 14;
    const at = (p, fn) => { const [px, py] = p.pivot; g.save(); g.translate(px, py); fn(); g.translate(-px, -py); g.drawImage(p.img, vb[0], vb[1], VW, VH); g.restore(); };
    for (const p of info) {
      switch (p.role) {
        case 'armL': at(p, () => g.rotate(P.armL)); break;
        case 'armR': at(p, () => g.rotate(P.armR)); break;
        case 'legL': at(p, () => g.rotate(P.legL)); break;
        case 'legR': at(p, () => g.rotate(P.legR)); break;
        case 'eye': if (useFace) at(p, () => { g.translate(look, 0); g.scale(1, 1 - 0.9 * P.blink); }); break;
        case 'mouth': if (useFace) at(p, () => { g.translate(look, 0); g.scale(1, P.talking ? 0.35 + 0.9 * P.mouth : 1); }); break;
        case 'brow': if (useFace) at(p, () => g.translate(look, P.brow * 10)); break;
        default: g.drawImage(p.img, vb[0], vb[1], VW, VH);
      }
    }
    if (!useFace) {                                          // an emotion face, a bit bigger: it reads at phone size
      g.save(); g.translate(faceBox.cx + look, faceBox.cy); g.scale(1.3, 1.3); g.translate(-faceBox.cx, -faceBox.cy);
      g.drawImage(faces[P.face], vb[0], vb[1], VW, VH); g.restore();
    }
    g.restore();
    return P;
  }
  return { draw, pose, roles: info.map((p) => p.role), emotions: Object.keys(faces) };
}
