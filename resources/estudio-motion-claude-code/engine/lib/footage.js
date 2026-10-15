// Footage in a film: the frames cut by engine/motion/footage.mjs, loaded on demand and painted with a camera
// (focus, zoom, slow push) — still a pure function of time: frame = round(clip time × fps).
//
//   import { footage } from '../…/engine/motion/lib/footage.js';
//   const F = await footage();                                   // reads out/frames/manifest.json
//   window.seek = async (t) => { await F.load(needs(t)); S.frame(t, draw); };
//     needs(t) → [[clipId, clipTime], …]  every frame the drawing at t will paint (several during a transition)
//   F.draw(g, clipId, clipTime, {x, y, w, h, focus: [0.5, 0.5], zoom: 1, alpha: 1})   cover-crops the frame into the box
//   F.dur(clipId)   length of the cut in seconds
//
// Only what is needed stays decoded (a small LRU), so a 60 s film with a dozen clips fits in memory.
export async function footage(base = 'out/frames') {
  const res = await fetch(`${base}/manifest.json`).catch(() => null);
  const manifest = res?.ok ? await res.json() : await new Promise((ok) => {      // file:// pages cannot fetch: use a script tag
    const s = document.createElement('script'); s.src = `${base}/manifest.js`; s.onload = () => ok(window.__footage); s.onerror = () => ok({ fps: 30, clips: {} }); document.head.appendChild(s);
  });
  const FPS = manifest.fps ?? 30, cache = new Map(), MAX = 48;
  const index = (id, ct) => { const c = manifest.clips[id]; if (!c) return null; return Math.min(c.frames, Math.max(1, Math.round(ct * FPS) + 1)); };
  const key = (id, n) => `${id}/${String(n).padStart(6, '0')}`;
  const get = (id, ct) => { const n = index(id, ct); return n ? cache.get(key(id, n)) : null; };
  async function load(list) {
    const want = [...new Set(list.map(([id, ct]) => { const n = index(id, ct); return n ? key(id, n) : null; }).filter(Boolean))];
    await Promise.all(want.filter((k) => !cache.has(k)).map((k) => new Promise((ok) => {
      const i = new Image(); i.onload = async () => { cache.set(k, await createImageBitmap(i)); ok(); }; i.onerror = () => { cache.set(k, null); ok(); }; i.src = `${base}/${k}.jpg`;
    })));
    for (const k of want) { const v = cache.get(k); cache.delete(k); cache.set(k, v); }   // most recent last
    while (cache.size > MAX) { const [k, v] = cache.entries().next().value; v?.close?.(); cache.delete(k); }
  }
  function draw(g, id, ct, { x = 0, y = 0, w = g.canvas.width, h = g.canvas.height, focus = [0.5, 0.5], zoom = 1, alpha = 1 } = {}) {
    const img = get(id, ct); if (!img) return false;
    const s = Math.max(w / img.width, h / img.height) * zoom, dw = img.width * s, dh = img.height * s;
    // keep the focus point as centred as the crop allows
    const ox = Math.min(0, Math.max(w - dw, w / 2 - focus[0] * dw)), oy = Math.min(0, Math.max(h - dh, h / 2 - focus[1] * dh));
    g.save(); g.globalAlpha *= alpha; g.beginPath(); g.rect(x, y, w, h); g.clip(); g.drawImage(img, x + ox, y + oy, dw, dh); g.restore();
    return true;
  }
  return { load, draw, get, dur: (id) => manifest.clips[id]?.dur ?? 0, clips: manifest.clips, fps: FPS };
}
