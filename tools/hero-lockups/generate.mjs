/**
 * Genera las imágenes de texto del hero (eyebrow + título + bajada) como PNG transparentes,
 * con las tipografías del sitio. Uso (desde client/):  node ../tools/hero-lockups/generate.mjs
 * Hay que re-ejecutarlo si cambia el texto de client/src/features/home/HeroSlider/slides.ts.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve("public/images/hero");
mkdirSync(OUT, { recursive: true });

const SLIDES = [
  {
    id: "ritual",
    eyebrow: "Barbería clásica · Buenos Aires",
    title: ["El ritual de la navaja,", "como se hacía antes"],
    text: ["Toalla caliente, espuma tibia y doble pasada.", "Cortes de precisión en tres sedes porteñas."],
  },
  {
    id: "cava",
    eyebrow: "Solo con turno · Recoleta",
    title: ["La Cava: el salón", "privado de la casa"],
    text: ["Un subsuelo de ladrillo, sillones de cuero y whisky de cortesía.", "La experiencia completa, sin apuro."],
  },
  {
    id: "regalo",
    eyebrow: "Gift cards · Packs · Club Jack",
    title: ["Regalá un corte", "que se recuerde"],
    text: ["Gift cards para cualquier sede, packs con descuento", "y una membresía mensual con cortes incluidos."],
  },
];

const html = (s) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&family=Inter:wght@400;500&family=Oswald:wght@500&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; background: transparent; }
  #card { display: inline-block; padding: 36px 48px 40px 8px; color: #f3ead7; }
  .eyebrow { display: flex; align-items: center; gap: 18px; font: 500 20px Oswald, sans-serif; letter-spacing: .35em; text-transform: uppercase; color: #c9a45c; }
  .eyebrow i { width: 56px; height: 2px; background: #c9a45c; }
  h1 { margin: 26px 0 24px; font: 900 92px/1.04 "Playfair Display", serif; letter-spacing: -.01em;
       background: linear-gradient(180deg, #fff6df 0%, #f3ead7 45%, #d9b46a 100%); -webkit-background-clip: text; background-clip: text; color: transparent;
       filter: drop-shadow(0 4px 18px rgba(0,0,0,.55)); }
  p { margin: 0; font: 400 26px/1.55 Inter, sans-serif; color: #d8cdb5; text-shadow: 0 2px 12px rgba(0,0,0,.7); }
</style></head><body>
<div id="card">
  <div class="eyebrow"><i></i><span>${s.eyebrow}</span></div>
  <h1>${s.title.join("<br>")}</h1>
  <p>${s.text.join("<br>")}</p>
</div></body></html>`;

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1400, height: 900 } });
for (const s of SLIDES) {
  await page.setContent(html(s), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const file = resolve(OUT, `texto-${s.id}.png`);
  await page.locator("#card").screenshot({ path: file, omitBackground: true });
  console.log("ok", file);
}
await browser.close();
