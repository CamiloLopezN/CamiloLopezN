// Opens a film (index.html with window.seek) in headless Chromium and captures frames through the DevTools protocol:
// faster than element screenshots and pixel-identical. Used by render.mjs, sheet.mjs and check.mjs.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export const GPU = process.env.STUDIO_RENDER_GPU === '1';
const ARGS = ['--allow-file-access-from-files', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'];
const GPU_ARGS = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-zero-copy', '--use-angle=vulkan', '--enable-features=Vulkan'];

// unsafe: the canvas can be read back (check.mjs measures pixels; local images would otherwise taint it). Never for render.
export async function openFilm({ dir = process.cwd(), w = 1080, h = 1920, onError, unsafe = false } = {}) {
  const browser = await chromium.launch({
    env: { ...process.env, DBUS_SESSION_BUS_ADDRESS: 'disabled:' },
    args: [...ARGS, ...(GPU ? GPU_ARGS : []), ...(unsafe ? ['--disable-web-security'] : [])],
  });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => { console.error(e.message); onError?.(e); process.exitCode = 1; });
  await page.goto(pathToFileURL(path.join(dir, 'index.html')).href + `?w=${w}&h=${h}`);
  await page.waitForFunction(() => typeof window.seek === 'function');
  await page.evaluate(() => document.fonts.ready);       // canvas text needs the fonts loaded
  await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))));
  const box = await page.locator('#c').boundingBox();
  const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
  const cdp = await page.context().newCDPSession(page);
  const seek = (t) => page.evaluate((x) => window.seek(x), t);
  // PNG of #c at the given scale (1 = full size), lossless
  const shot = async (scale = 1) => Buffer.from((await cdp.send('Page.captureScreenshot',
    { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false, clip: { ...clip, scale } })).data, 'base64');
  return { browser, page, seek, shot, close: () => browser.close() };
}
