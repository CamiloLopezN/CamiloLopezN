// Builds the profile README artwork as animated SVGs (assets/*-light.svg and *-dark.svg)
// and rewrites the latest-episode block in README.md.
// Usage: node design/build.mjs [--only=banner,episode,…]
//
// Text is converted to outlines with opentype.js (no fonts travel with the image) and images are
// embedded as base64: GitHub serves repo SVGs as <img>, with no JavaScript and no external files.
// Entrances use CSS animations; loops that must stay in sync (the file travelling along the thread
// and each robot's hop) use SMIL, which shares a single clock.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(DIR, '..');
const data = JSON.parse(readFileSync(join(DIR, 'data.json'), 'utf8'));
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');

const font = (pkg, file) => opentype.loadSync(join(DIR, 'node_modules/@fontsource', pkg, 'files', file));
const F = {
  serif: font('noto-serif-display', 'noto-serif-display-latin-500-normal.woff'),
  inter4: font('inter', 'inter-latin-400-normal.woff'),
  inter5: font('inter', 'inter-latin-500-normal.woff'),
  inter6: font('inter', 'inter-latin-600-normal.woff'),
};

const THEMES = {
  light: {
    bg: '#F4F1EA', card: '#FFFDF9', ink: '#13110F', grey: '#42403D', grey2: '#6B665E',
    accent: '#A8452C', thread: '#D7755A', border: '#13110F1A', grid: '#E6DFD2', tile: '#A8452C1A',
    shadow: ['#3C2814', 0.09], button: '#13110F', buttonText: '#F4F1EA', edge: false,
  },
  dark: {
    bg: '#1A1714', card: '#221E1A', ink: '#F4F1EA', grey: '#CFC8BC', grey2: '#9A9287',
    accent: '#E08A6D', thread: '#D7755A', border: '#F4F1EA1F', grid: '#27231F', tile: '#E08A6D24',
    shadow: ['#000000', 0.35], button: '#F4F1EA', buttonText: '#13110F', edge: true,
  },
};

// ---------- text as outlines ----------

const r1 = (n) => Math.round(n * 10) / 10;
const width = (f, s, size, spacing = 0) => f.getAdvanceWidth(s, size, { kerning: true, letterSpacing: spacing }) - spacing * size;
const outline = (f, s, x, y, size, spacing = 0) => f.getPath(s, x, y, size, { kerning: true, letterSpacing: spacing }).toPathData(1);
// A single-path text. `end` right-aligns and `center` centers on x.
const text = (f, s, x, y, size, color, { spacing = 0, end = false, center = false, cls = '', style = '' } = {}) => {
  const w = width(f, s, size, spacing);
  const x0 = end ? x - w : center ? x - w / 2 : x;
  return { svg: `<path${cls ? ` class="${cls}"` : ''}${style ? ` style="${style}"` : ''} fill="${color}" d="${outline(f, s, x0, y, size, spacing)}"/>`, w };
};
// Splits a text into lines that fit in `max`.
const wrap = (f, s, size, max) => {
  const out = [];
  let line = '';
  for (const word of s.split(' ')) {
    const attempt = line ? `${line} ${word}` : word;
    if (line && width(f, attempt, size) > max) { out.push(line); line = word; } else line = attempt;
  }
  if (line) out.push(line);
  return out;
};
// One path per word so they can animate in one after another.
const words = (f, s, x, y, size, color, delay, step, spacing = -0.01) => {
  const space = width(f, ' ', size);
  let svg = '';
  s.split(' ').forEach((word, i) => {
    svg += `<path class="rise" style="animation-delay:${(delay + i * step).toFixed(2)}s" fill="${color}" d="${outline(f, word, x, y, size, spacing)}"/>`;
    x += width(f, word, size, spacing) + space;
  });
  return svg;
};

// ---------- images and icons ----------

const b64 = (file) => `data:image/webp;base64,${readFileSync(join(DIR, file)).toString('base64')}`;
const ROBOT = [1, 2, 3, 4, 5, 6, 7].map((n) => b64(`img/robot-${n}.webp`));
const ROBOT_RATIO = 285 / 360;

// Line icons on a 24×24 grid with round strokes (in the spirit of SF Symbols).
const ICONS = {
  play: `<circle cx="12" cy="12" r="9"/><path d="M10 8.6v6.8l5.6-3.4z" fill="currentColor"/>`,
  layers: `<path d="M12 3.8 3.6 8.2 12 12.6l8.4-4.4z"/><path d="m3.6 12.2 8.4 4.4 8.4-4.4"/><path d="m3.6 16 8.4 4.4 8.4-4.4"/>`,
  briefcase: `<rect x="3" y="7.2" width="18" height="12.8" rx="2.6"/><path d="M8.8 7.2V5.6c0-.9.7-1.6 1.6-1.6h3.2c.9 0 1.6.7 1.6 1.6v1.6M3 12.4h18"/>`,
  book: `<path d="M12 7C10 5.5 7.6 5 4 5.3v12.9c3.6-.3 6 .2 8 1.7 2-1.5 4.4-2 8-1.7V5.3C16.4 5 14 5.5 12 7z"/><path d="M12 7v12.9"/>`
    + `<path class="twinkle" d="M19.6 .6l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" fill="currentColor" stroke="none"/>`,
  bars: `<path d="M3.5 20.5h17"/>`
    + [[6, 13, 0], [10.5, 9, 0.25], [15, 5, 0.5]].map(([x, y, d]) =>
      `<rect class="grow" style="animation-delay:${d}s" x="${x}" y="${y}" width="3" height="${20.5 - y - 1.5}" rx="1.2" fill="currentColor" stroke="none"/>`).join(''),
  robot: `<path d="M12 7.2V4.4"/><circle cx="12" cy="3.4" r="1.3" fill="currentColor" stroke="none"/><rect x="3.5" y="7.2" width="17" height="13" rx="4.2"/>`
    + `<g class="blink"><path d="M8.3 14.2q1.3-1.8 2.6 0M13.1 14.2q1.3-1.8 2.6 0"/></g>`,
  web: `<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.8 3.9 6 3.9 9.5s-1.3 6.7-3.9 9.5c-2.6-2.8-3.9-6-3.9-9.5s1.3-6.7 3.9-9.5z"/>`,
};
const brandPath = (file) => readFileSync(join(DIR, 'img', file), 'utf8').match(/<path d="([^"]+)"/)[1];
const SOCIAL_ICONS = {
  youtube: `<path fill="currentColor" stroke="none" d="${brandPath('youtube.svg')}"/>`,
  tiktok: `<path fill="currentColor" stroke="none" d="${brandPath('tiktok.svg')}"/>`,
  instagram: `<path fill="currentColor" stroke="none" d="${brandPath('instagram.svg')}"/>`,
  linkedin: `<rect x="1.5" y="1.5" width="21" height="21" rx="4.5" fill="currentColor" stroke="none"/><g fill="var(--card)" stroke="none"><rect x="5.6" y="9.4" width="3.1" height="9" rx=".4"/><circle cx="7.15" cy="6.4" r="1.8"/><path d="M10.6 9.4h3v1.3c.5-.9 1.6-1.6 3.1-1.6 2.5 0 3.3 1.6 3.3 4.1v5.2h-3.1v-4.6c0-1.2-.3-2-1.4-2-1.2 0-1.8.9-1.8 2.2v4.4h-3.1z"/></g>`,
  web: ICONS.web,
};
const icon = (drawing, x, y, size, color, stroke = 1.8) =>
  `<g transform="translate(${x} ${y}) scale(${size / 24})" color="${color}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${drawing}</g>`;
// Rounded tile with a terracotta icon.
const tile = (t, name, x, y, size, cls = '') =>
  `<g${cls ? ` class="${cls}"` : ''}><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.27}" fill="${t.tile}"/>${icon(ICONS[name], x + size * 0.22, y + size * 0.22, size * 0.56, t.accent)}</g>`;
const ARROW = `<path d="M3 8h10M9 4l4 4-4 4"/>`;
const arrow = (x, y, color, cls = 'nudge') =>
  `<g class="${cls}"><g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ARROW}</g></g>`;

// Dark pill button (cream in dark mode) with an arrow that nudges.
const button = (t, label, x, y) => {
  const w = width(F.inter6, label, 15) + 20 + 10 + 16 + 20;
  return {
    w,
    svg: `<rect x="${x}" y="${y}" width="${r1(w)}" height="44" rx="22" fill="${t.button}"/>`
      + text(F.inter6, label, x + 20, y + 27.5, 15, t.buttonText).svg
      + arrow(x + w - 20 - 16, y + 14, t.buttonText),
  };
};

// ---------- shared styles and animations ----------

const EASE = 'cubic-bezier(.22,1,.36,1)';
const CSS = `
*{transform-box:fill-box}
.rise{animation:rise .9s ${EASE} both}
.fade{animation:fade .8s ease both}
.pop{transform-origin:50% 100%;animation:pop 1s ${EASE} both}
.draw{stroke-dasharray:1;animation:draw 1.6s ${EASE} .45s both}
.nudge{animation:nudge 2.8s ease-in-out 2s infinite}
.pulse{transform-origin:50% 50%;animation:pulse 2.2s ease-out infinite}
.twinkle{transform-origin:50% 50%;animation:twinkle 2.6s ease-in-out infinite}
.grow{transform-origin:50% 100%;animation:grow 2.6s ${EASE} infinite}
.blink{transform-origin:50% 50%;animation:blink 4.5s ease-in-out 1s infinite}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes pop{0%{opacity:0;transform:translateY(16px) scale(.86)}55%{opacity:1;transform:translateY(-4px) scale(1.03)}80%{transform:translateY(1px) scale(.995)}100%{opacity:1;transform:none}}
@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes nudge{0%,55%,100%{transform:none}70%{transform:translateX(4px)}}
@keyframes pulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.8);opacity:0}}
@keyframes twinkle{0%,100%{opacity:.2;transform:scale(.6)}50%{opacity:1;transform:scale(1)}}
@keyframes grow{0%,100%{transform:scaleY(.55)}50%{transform:scaleY(1)}}
@keyframes blink{0%,90%,100%{transform:scaleY(1)}94%{transform:scaleY(.15)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`;

const defs = (t) => `<defs>
<filter id="shadow" x="-10%" y="-15%" width="120%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="11" flood-color="${t.shadow[0]}" flood-opacity="${t.shadow[1]}"/></filter>
<filter id="edge" x="-8%" y="-8%" width="116%" height="116%"><feDropShadow dx="0" dy="0" stdDeviation=".7" flood-color="#F4F1EA" flood-opacity=".85"/></filter>
</defs>`;

const svg = (t, w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="--card:${t.card}"><style>${CSS}</style>${defs(t)}${body}</svg>`;

const card = (t, x, y, w, h, radius, fill = t.card) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${t.border}" filter="url(#shadow)"/>`;

const robot = (t, n, x, height, feetY, extra = '') => {
  const w = height * ROBOT_RATIO;
  return `<image xlink:href="${ROBOT[n - 1]}" x="${r1(x)}" y="${r1(feetY - height)}" width="${r1(w)}" height="${height}"${t.edge ? ' filter="url(#edge)"' : ''}/>${extra}`;
};

// Hand-drawn-looking thread: soft waves from edge to edge. Returns the path and an x → length-fraction function.
const thread = (x0, x1, y, amp, spans = 6) => {
  const segs = [];
  for (let i = 0; i < spans; i++) {
    const a = x0 + ((x1 - x0) / spans) * i, b = x0 + ((x1 - x0) / spans) * (i + 1);
    const s = i % 2 ? amp : -amp;
    segs.push([[a, y], [a + (b - a) * 0.35, y + s], [a + (b - a) * 0.65, y + s], [b, y]]);
  }
  const d = `M ${x0} ${y} ` + segs.map(([, p, q, r]) => `C ${r1(p[0])} ${r1(p[1])}, ${r1(q[0])} ${r1(q[1])}, ${r1(r[0])} ${r1(r[1])}`).join(' ');
  // Sample the curve to map x to a fraction of its length (the file moves at constant speed along it).
  const pts = [];
  for (const [p0, p1, p2, p3] of segs) for (let k = 0; k <= 60; k++) {
    const u = k / 60, v = 1 - u;
    pts.push([v ** 3 * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u ** 3 * p3[0],
      v ** 3 * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u ** 3 * p3[1]]);
  }
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = acc.at(-1);
  const fraction = (x) => { const i = pts.findIndex((p) => p[0] >= x); return acc[Math.max(0, i)] / total; };
  return { d, fraction };
};

// ---------- pieces ----------

const PIECES = {};

PIECES.banner = (t) => {
  const W = 1280, H = 420, b = data.banner;
  const { d, fraction } = thread(0, W, 350, 9);
  const CYCLE = 8, START = 1.9, HEIGHT = 118;
  const xs = [0, 1, 2, 3, 4, 5, 6].map((i) => 137 + i * 152);
  // Each robot hops when the file passes its center.
  const hop = (x) => {
    const f = fraction(x + (HEIGHT * ROBOT_RATIO) / 2);
    const a = Math.max(0.001, f - 0.035), c = Math.min(0.999, f + 0.045);
    return `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 -11;0 0;0 0" keyTimes="0;${a.toFixed(3)};${f.toFixed(3)};${c.toFixed(3)};1" calcMode="spline" keySplines="0 0 1 1;.2 .7 .3 1;.6 0 .8 .4;0 0 1 1" dur="${CYCLE}s" begin="${START}s" repeatCount="indefinite"/>`;
  };
  const file = `<g opacity="0"><animateMotion dur="${CYCLE}s" begin="${START}s" repeatCount="indefinite"><mpath xlink:href="#thread"/></animateMotion>`
    + `<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.04;.96;1" dur="${CYCLE}s" begin="${START}s" repeatCount="indefinite"/>`
    + `<rect x="-8" y="-11" width="16" height="20" rx="3" fill="${t.card}" stroke="${t.accent}" stroke-width="1.6"/>`
    + `<path d="M-4 -5h8M-4 -1h8M-4 3h5" stroke="${t.accent}" stroke-width="1.4" stroke-linecap="round"/></g>`;
  // Status pill at the top right: a pulsing dot and «7 agentes trabajando».
  const st = text(F.inter5, b.status, 0, 0, 14, t.grey);
  const pw = 14 + 8 + 9 + st.w + 16, px = W - 64 - pw, py = 52;
  const status = `<g class="fade" style="animation-delay:1.3s"><rect x="${r1(px)}" y="${py}" width="${r1(pw)}" height="34" rx="17" fill="${t.card}" stroke="${t.border}"/>`
    + `<circle class="pulse" cx="${r1(px + 18)}" cy="${py + 17}" r="4" fill="${t.thread}"/><circle cx="${r1(px + 18)}" cy="${py + 17}" r="4" fill="${t.thread}"/>`
    + text(F.inter5, b.status, px + 31, py + 22, 14, t.grey).svg + `</g>`;
  return svg(t, W, H, `
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="28" fill="${t.bg}" stroke="${t.border}"/>
${text(F.inter6, b.eyebrow.toUpperCase(), 72, 75, 13, t.accent, { spacing: 0.2, cls: 'fade', style: 'animation-delay:.1s' }).svg}
${words(F.serif, b.line1, 72, 158, 64, t.ink, 0.2, 0.06)}
${words(F.serif, b.line2, 72, 227, 64, t.accent, 0.5, 0.06)}
${status}
<path id="thread" class="draw" pathLength="1" d="${d}" fill="none" stroke="${t.thread}" stroke-width="3" stroke-linecap="round"/>
${file}
${xs.map((x, i) => `<g class="pop" style="animation-delay:${(0.7 + i * 0.09).toFixed(2)}s"><g>${hop(x)}${robot(t, i + 1, x, HEIGHT, 386)}</g></g>`).join('\n')}
`);
};

for (const s of data.socials) {
  PIECES[`social-${s.id}`] = (t) => {
    const label = text(F.inter6, s.name, 0, 0, 15, t.ink);
    const W = Math.ceil(4 + 20 + 17 + 9 + label.w + 20 + 4), H = 52;
    return svg(t, W, H, `
<rect x="4.5" y="4.5" width="${W - 9}" height="${H - 9}" rx="21.5" fill="${t.card}" stroke="${t.border}"/>
${icon(SOCIAL_ICONS[s.id], 24, 17.5, 17, t.ink, s.id === 'web' ? 1.9 : 1.8)}
${text(F.inter6, s.name, 50, 31.5, 15, t.ink).svg}`);
  };
}

for (const [id, s] of Object.entries(data.sections)) {
  // As wide as its content: the README shows it at natural size so it doesn't shrink on phones.
  PIECES[`title-${id}`] = (t) => {
    const title = text(F.serif, s.title, 66, 43, 30, t.ink, { spacing: -0.01, cls: 'rise', style: 'animation-delay:.15s' });
    return svg(t, Math.ceil(66 + title.w + 12), 64, `${tile(t, s.icon, 12, 12, 40, 'pop')}${title.svg}`);
  };
}

PIECES.episode = (t) => {
  const e = data.episode, X = 198;
  const lines = wrap(F.inter4, e.description, 17, 578);
  const btn = button(t, e.button, X, 216);
  return svg(t, 880, 300, `
${card(t, 12, 12, 856, 276, 24)}
<clipPath id="cover"><rect x="34" y="34" width="130" height="232" rx="14"/></clipPath>
<image xlink:href="${b64(e.cover)}" x="34" y="34" width="130" height="232" clip-path="url(#cover)" preserveAspectRatio="xMidYMid slice"/>
<rect x="34.5" y="34.5" width="129" height="231" rx="13.5" fill="none" stroke="#13110F1A"/>
<circle class="pulse" cx="141" cy="243" r="15" fill="#13110FB8"/>
<circle cx="141" cy="243" r="15" fill="#13110FB8"/><path d="M137.5 237.5v11l9-5.5z" fill="#fff"/>
${text(F.inter6, `${e.label.toUpperCase()} ${e.number} · ${e.date.toUpperCase()}`, X, 57, 13, t.accent, { spacing: 0.2, cls: 'fade' }).svg}
${text(F.serif, e.title, X, 116, 44, t.ink, { spacing: -0.01, cls: 'rise', style: 'animation-delay:.1s' }).svg}
${lines.map((l, i) => text(F.inter4, l, X, 152 + i * 25.5, 17, t.grey, { cls: 'rise', style: `animation-delay:${0.2 + i * 0.05}s` }).svg).join('')}
<g class="rise" style="animation-delay:.35s">${btn.svg}${text(F.inter4, e.alsoOn, X + btn.w + 18, 243, 14, t.grey2).svg}</g>`);
};

for (const p of data.projects) {
  PIECES[`project-${p.id}`] = (t) => {
    const lines = wrap(F.inter4, p.text, 17, 222);
    const link = text(F.inter6, p.linkLabel, 36, 200, 16, t.accent);
    return svg(t, 300, 236, `
${card(t, 10, 10, 280, 216, 22)}
${tile(t, p.icon, 220, 30, 44, 'pop')}
${text(F.inter6, p.eyebrow.toUpperCase(), 36, 50, 13, t.accent, { spacing: 0.2 }).svg}
${text(F.serif, p.name, 36, 96, 38, t.ink, { spacing: -0.01 }).svg}
${lines.map((l, i) => text(F.inter4, l, 36, 131 + i * 24.6, 17, t.grey).svg).join('')}
${link.svg}${arrow(36 + link.w + 8, 187, t.accent)}`);
  };
}

PIECES['team-map'] = (t) => {
  const m = data.teamMap, X = 52, H = 280;
  const lines = wrap(F.inter4, m.text, 16.5, 495);
  const badge = m.badge.toUpperCase();
  const badgeW = width(F.inter6, badge, 12, 0.16);
  const btn = button(t, m.button, X, 131 + (lines.length - 1) * 24.75 + 30);
  // The three robots hop one after another, as if passing the map along.
  const hop = (i) => `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 -10;0 0;0 0" keyTimes="0;${(0.1 + i * 0.12).toFixed(2)};${(0.15 + i * 0.12).toFixed(2)};${(0.22 + i * 0.12).toFixed(2)};1" calcMode="spline" keySplines="0 0 1 1;.2 .7 .3 1;.6 0 .8 .4;0 0 1 1" dur="4.5s" begin="1.2s" repeatCount="indefinite"/>`;
  return svg(t, 880, H, `
<pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse" x="12" y="12"><path d="M32 0H0V32" fill="none" stroke="${t.grid}"/></pattern>
${card(t, 12, 12, 856, H - 24, 24, t.bg)}
<rect x="12" y="12" width="856" height="${H - 24}" rx="24" fill="url(#grid)"/>
<g class="fade"><rect x="${X}" y="38" width="${r1(badgeW + 22)}" height="24" rx="12" fill="${t.tile}"/>${text(F.inter6, badge, X + 11, 54.5, 12, t.accent, { spacing: 0.16 }).svg}</g>
${text(F.serif, m.title, X, 104, 32, t.ink, { spacing: -0.01, cls: 'rise', style: 'animation-delay:.1s' }).svg}
${lines.map((l, i) => text(F.inter4, l, X, 136 + i * 24.75, 16.5, t.grey, { cls: 'rise', style: `animation-delay:${0.2 + i * 0.05}s` }).svg).join('')}
<g class="rise" style="animation-delay:.35s">${btn.svg}</g>
${[2, 4, 6].map((n, i) => `<g class="pop" style="animation-delay:${(0.4 + i * 0.1).toFixed(2)}s"><g>${hop(i)}${robot(t, n, 646 + i * 64, 96, H - 12 - 36)}</g></g>`).join('\n')}`);
};

PIECES.career = (t) => {
  const c = data.career, X = 44, MAX = 856 - 64;
  const lines = wrap(F.serif, c.headline, 26, MAX);
  let y = 44 + 26 * 0.78;
  let body = lines.map((l, i) => text(F.serif, l, X, y + i * 33, 26, t.ink, { spacing: -0.005, cls: 'rise', style: `animation-delay:${i * 0.06}s` }).svg).join('');
  y += (lines.length - 1) * 33 + 22;
  // Chips that flow into rows.
  const chips = (list, label, delay) => {
    let s = text(F.inter6, label.toUpperCase(), X, y + 13, 12, t.grey2, { spacing: 0.16, cls: 'fade', style: `animation-delay:${delay}s` }).svg;
    y += 26;
    let x = X;
    list.forEach((name, i) => {
      const w = width(F.inter5, name, 14) + 28;
      if (x + w > X + MAX) { x = X; y += 42; }
      s += `<g class="rise" style="animation-delay:${(delay + 0.05 + i * 0.04).toFixed(2)}s"><rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="32" rx="16" fill="${t.bg}" stroke="${t.border}"/>${text(F.inter5, name, x + 14, y + 20.5, 14, t.ink).svg}</g>`;
      x += w + 8;
    });
    y += 32;
    return s;
  };
  body += chips(c.companies, c.companiesLabel, 0.2);
  y += 24;
  body += chips(c.today, c.todayLabel, 0.5);
  const H = Math.ceil(y + 32 + 12);
  return svg(t, 880, H, `${card(t, 12, 12, 856, H - 24, 24)}${body}`);
};

// ---------- output ----------

mkdirSync(join(ROOT, 'assets'), { recursive: true });
for (const [id, piece] of Object.entries(PIECES)) {
  if (only && !only.some((o) => id.startsWith(o))) continue;
  for (const [theme, t] of Object.entries(THEMES)) {
    writeFileSync(join(ROOT, 'assets', `${id}-${theme}.svg`), piece(t).replace(/\n+/g, '\n'));
  }
  console.log(`ok ${id}`);
}

// Latest-episode block in the README (between markers): edit data.json and run this again.
const readme = join(ROOT, 'README.md');
if (existsSync(readme)) {
  const e = data.episode;
  const block = `<!-- latest-episode -->
<a href="${e.url}">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/episode-dark.svg">
    <img alt="${e.label} ${e.number}: ${e.title}. ${e.description}" src="assets/episode-light.svg" width="100%">
  </picture>
</a>
<!-- /latest-episode -->`;
  const before = readFileSync(readme, 'utf8');
  const after = before.replace(/<!-- latest-episode -->[\s\S]*?<!-- \/latest-episode -->/, block);
  if (after !== before) { writeFileSync(readme, after); console.log('README: latest episode updated'); }
}
