// Auditoría del sitio de referencia con Playwright.
// Genera, por cada página: screenshots (desktop y mobile) y un structure.json con
// navegación, encabezados, secciones, botones/links, formularios y estilos base.
// La salida (output/) es sólo material de referencia local: no se commitea.
//
// Uso: npx playwright install chromium   (una sola vez)
//      node audit.mjs [urlBase]            (por defecto https://jacktheclipper.co.uk)
// Opcional: CHROMIUM_PATH=/ruta/a/chromium node audit.mjs  para usar un Chromium ya instalado.

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = (process.argv[2] ?? "https://jacktheclipper.co.uk").replace(/\/$/, "");
const OUT = path.resolve("output");
const MAX_PAGES = 60;

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const SEED_PATHS = [
  "/",
  "/jacks-story/",
  "/why-us/",
  "/locations/",
  "/locations/bow-lane/",
  "/locations/mayfair-2/",
  "/locations/spitalfields/",
  "/chamber-88/",
  "/chamber-88/chamber-88-treatments/",
  "/shop/",
  "/book-an-appointment/",
  "/contact-us/",
];

const slugFor = (url) =>
  new URL(url).pathname.replace(/^\/|\/$/g, "").replace(/[^\w-]+/g, "_") || "home";

async function extractStructure(page) {
  return page.evaluate(() => {
    const text = (el) => el?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const style = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        color: s.color,
        backgroundColor: s.backgroundColor,
        letterSpacing: s.letterSpacing,
        textTransform: s.textTransform,
      };
    };

    return {
      title: document.title,
      metaDescription: document.querySelector('meta[name="description"]')?.content ?? null,
      nav: [...document.querySelectorAll("header a, nav a")].map((a) => ({
        text: text(a),
        href: a.href,
        inSubmenu: !!a.closest("ul ul, .sub-menu, .dropdown-menu"),
      })),
      headings: [...document.querySelectorAll("h1, h2, h3")].map((h) => ({
        level: h.tagName,
        text: text(h).slice(0, 120),
      })),
      sections: [...document.querySelectorAll("main section, body > section, [class*='section']")]
        .slice(0, 40)
        .map((s) => ({
          tag: s.tagName,
          id: s.id || null,
          className: String(s.className).slice(0, 120),
          heading: text(s.querySelector("h1, h2, h3")).slice(0, 120),
          height: Math.round(s.getBoundingClientRect().height),
        })),
      ctas: [...document.querySelectorAll("a.button, a.btn, button, [class*='btn'], [class*='button']")]
        .map((b) => ({ text: text(b).slice(0, 60), href: b.href ?? null }))
        .filter((b) => b.text),
      forms: [...document.querySelectorAll("form")].map((f) => ({
        action: f.action,
        fields: [...f.querySelectorAll("input, select, textarea")].map((i) => ({
          type: i.type,
          name: i.name,
          required: i.required,
        })),
      })),
      iframes: [...document.querySelectorAll("iframe")].map((f) => f.src),
      footerLinks: [...document.querySelectorAll("footer a")].map((a) => ({
        text: text(a),
        href: a.href,
      })),
      baseStyles: {
        body: style(document.body),
        h1: style(document.querySelector("h1")),
        h2: style(document.querySelector("h2")),
        link: style(document.querySelector("header a")),
        button: style(document.querySelector("a.button, .btn, button")),
      },
      fontsLoaded: [...document.fonts].map((f) => `${f.family} ${f.weight}`),
      internalLinks: [...document.querySelectorAll("a[href]")].map((a) => a.href),
    };
  });
}

async function autoScroll(page) {
  // Fuerza lazy-load y animaciones on-scroll antes del screenshot.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const queue = SEED_PATHS.map((p) => BASE + p);
  const seen = new Set();
  const sitemap = [];

  while (queue.length && seen.size < MAX_PAGES) {
    const url = queue.shift().split("#")[0];
    if (seen.has(url)) continue;
    seen.add(url);

    const slug = slugFor(url);
    const dir = path.join(OUT, slug);
    await mkdir(dir, { recursive: true });
    console.log(`→ ${url}`);

    let structure = null;
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
        await autoScroll(page);
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
        if (name === "desktop") structure = await extractStructure(page);
      } catch (err) {
        console.warn(`  ✗ ${name}: ${err.message}`);
      } finally {
        await context.close();
      }
    }

    if (!structure) continue;
    await writeFile(path.join(dir, "structure.json"), JSON.stringify(structure, null, 2));
    sitemap.push({ url, slug, title: structure.title });

    for (const link of structure.internalLinks) {
      if (link.startsWith(BASE) && !/\.(jpg|jpeg|png|webp|pdf|svg)$/i.test(link)) {
        queue.push(link);
      }
    }
  }

  await writeFile(path.join(OUT, "sitemap.json"), JSON.stringify(sitemap, null, 2));
  await browser.close();
  console.log(`\nListo: ${sitemap.length} páginas en ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
