// lib/motion.js — resortes de forma cerrada y ruido con semilla (curso de Movez, §07 y §08).
// Todo es función pura del tiempo: seek(t) puede pintar el cuadro 812 sin simular los cuadros 0 a 811.
//
//   Snappy UI: buttons, toggles, leading edges
//   Default: cards, containers, camera
//   Heavy: big type, 3D objects, logo lockups
//   Playful: mascots, stickers (visible overshoot)
//
// "Replace every easing curve with closed-form springs from lib/motion.js.
//  Tiny overshoot on UI, none on type. Any value with more than one target uses track()."

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// Closed-form damped spring, 0 → 1. Pure function of time.
export function spring(t, k = 170, d = 26) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k), z = d / (2 * w0);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);        // z >= 1 treated as critical
}

// Seeded noise, never Math.random: the render must be identical every time (mulberry32).
export function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// keys: [[time, value], ...] sorted by time. Returns the value at t.
export function track(t, keys, k = 170, d = 26) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++)
    v += (keys[i][1] - keys[i - 1][1]) * spring(t - keys[i][0], k, d);
  return v;
}

// A tab indicator that stretches: leading edge is stiffer than trailing edge.
export function indicator(t, stops, w = 0) {                 // stops: [[time, x], ...]
  const lead = track(t, stops, 320, 30);
  const trail = track(t, stops, 140, 22);
  return { left: Math.min(lead, trail), right: Math.max(lead, trail) + w };
}

// Text inside a morphing box: in after the morph starts, out before the next one.
export function swapAlpha(t, tIn, tOut) {
  return Math.min(clamp((t - tIn - 0.08) / 0.12), clamp((tOut - 0.1 - t) / 0.1));
}

// Seamless loop: pin the last frame to the first
export const loopT = (t, dur) => ((t % dur) + dur) % dur;
