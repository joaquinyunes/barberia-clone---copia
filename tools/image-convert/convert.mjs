/**
 * Convierte imágenes generadas (JPG/PNG de cualquier tamaño) a WebP del tamaño exacto, recortando al centro ("cover"),
 * y las guarda en client/public/images/<ruta>.
 *
 * Uso (desde client/):  node ../tools/image-convert/convert.mjs <manifest.json> <carpetaOrigen>
 * manifest.json: [{ "src": "01-hero-ritual.jpg", "out": "hero/hero-ritual.webp", "w": 2400, "h": 1350 }, ...]
 * Intenta calidad 0.82 y baja hasta que pese menos de 300 KB.
 */
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";

const [manifestPath, srcDir] = process.argv.slice(2);
if (!manifestPath || !srcDir) {
  console.error("Uso: node convert.mjs <manifest.json> <carpetaOrigen>");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
const OUT = resolve("public/images");
const MAX_BYTES = 300 * 1024;

const server = createServer((req, res) => {
  const file = join(srcDir, decodeURIComponent(req.url.slice(1)));
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": "image/jpeg", "Access-Control-Allow-Origin": "*" }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage();

for (const m of manifest) {
  await page.goto(base + "/" + encodeURIComponent(m.src)); // mismo origen que las imágenes: el canvas no se "contamina"
  const result = await page.evaluate(async ({ w, h, max }) => {
    const img = document.querySelector("img");
    await img.decode();
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    let q = 0.82, blob;
    do {
      blob = await new Promise((r) => c.toBlob(r, "image/webp", q));
      q -= 0.06;
    } while (blob.size > max && q > 0.4);
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { b64: btoa(bin), size: blob.size, nw: img.naturalWidth, nh: img.naturalHeight, q: q + 0.06 };
  }, { w: m.w, h: m.h, max: MAX_BYTES });
  const dest = join(OUT, m.out);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.from(result.b64, "base64"));
  console.log(`ok ${m.out}  ${m.w}x${m.h}  ${(result.size / 1024).toFixed(0)} KB  (origen ${result.nw}x${result.nh}, q=${result.q.toFixed(2)})`);
}
await browser.close();
server.close();
