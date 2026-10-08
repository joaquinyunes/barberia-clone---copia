import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

const PAGES = [
  { path: "/", heading: /navaja|La Cava|Regalá/ },
  { path: "/sedes", heading: "Tres barberías, un mismo oficio" },
  { path: "/sedes/palermo", heading: "Palermo" },
  { path: "/servicios", heading: "Cortes, barba y rituales" },
  { path: "/la-cava", heading: "La Cava" },
  { path: "/tienda", heading: "Regalos y cuidado en casa" },
  { path: "/tienda/pomada-mate", heading: "Pomada mate Jack" },
  { path: "/club-jack", heading: "Club Jack" },
  { path: "/historia", heading: "De un sillón prestado a tres sedes" },
  { path: "/por-que-nosotros", heading: "Seis razones para volver" },
  { path: "/contacto", heading: "Hablemos" },
  { path: "/legal/cancelaciones", heading: "Política de cancelación" },
  { path: "/no-existe", heading: "Esta página se fue sin pagar" },
];

for (const p of PAGES) {
  test(`página ${p.path}`, async ({ page }, info) => {
    const w = watchErrors(page);
    await page.goto(p.path);
    await expect(page.getByRole("heading", { level: 1, name: p.heading }).first()).toBeVisible();
    await page.screenshot({ path: `test-results/shots/${info.project.name}${p.path.replace(/\//g, "_") || "_home"}.png`, fullPage: true });
    // Nada debe salirse del ancho de pantalla (en celular se nota como scroll horizontal).
    const overflow = await page.evaluate<number>("document.documentElement.scrollWidth - document.documentElement.clientWidth");
    expect(overflow, "scroll horizontal").toBeLessThanOrEqual(0);
    w.assertClean();
  });
}

test("carrito: agregar gift card y llegar al checkout", async ({ page }) => {
  const w = watchErrors(page);
  await page.goto("/tienda/gift-card-20000");
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expect(page.getByRole("dialog", { name: "Tu carrito" })).toBeVisible();
  await page.getByRole("link", { name: "Finalizar compra" }).click();
  await expect(page.getByRole("heading", { name: "Finalizar compra" })).toBeVisible();
  await expect(page.getByText("¿Es un regalo?")).toBeVisible();
  w.assertClean();
});

test("hero: cambia con los puntos y con el teclado, sin desplazar el contenido", async ({ page }) => {
  const w = watchErrors(page);
  await page.goto("/");
  const hero = page.getByRole("region", { name: "Destacados" }).or(page.locator("section[aria-roledescription=carrusel]")).first();
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toContainText("navaja");

  const dots = hero.getByRole("button", { name: /^Ir a / });
  await dots.nth(1).click();
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "true");
  await expect(title).toContainText("La Cava");

  await dots.nth(1).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(dots.nth(0)).toHaveAttribute("aria-current", "true");
  await expect(title).toContainText("navaja");

  // Regresión: el hero es overflow:clip; con hidden el navegador lo desplazaba al hacer foco/clic.
  expect(await hero.evaluate((e) => e.scrollLeft)).toBe(0);
  w.assertClean();
});

test("reseñas: avanzan y retroceden con las flechas", async ({ page }) => {
  const w = watchErrors(page);
  await page.goto("/");
  const reviews = page.locator("[aria-label='Reseñas de clientes']");
  await reviews.scrollIntoViewIfNeeded();
  const quote = reviews.locator("blockquote");
  const first = (await quote.textContent()) ?? "";

  await reviews.getByRole("button", { name: "Reseña siguiente" }).click();
  await expect(quote).not.toHaveText(first);
  const second = (await quote.textContent()) ?? "";

  await reviews.getByRole("button", { name: "Reseña anterior" }).click();
  await expect(quote).toHaveText(first);
  expect(second).not.toBe(first);
  w.assertClean();
});

test("servicios destacados: carrusel con snap que se desplaza con las flechas (celular) o muestra todo (escritorio)", async ({ page, isMobile }) => {
  const w = watchErrors(page);
  await page.goto("/");
  const track = page.getByRole("group", { name: "Servicios destacados" });
  await track.scrollIntoViewIfNeeded();
  await expect(track.locator("article")).toHaveCount(4);
  const next = page.getByRole("button", { name: "Ver siguientes" }).first();

  if (isMobile) {
    await expect(next).toBeVisible();
    await next.click();
    await expect.poll(() => track.evaluate((e) => e.scrollLeft)).toBeGreaterThan(100);
    await expect(page.getByRole("button", { name: "Ver anteriores" }).first()).toBeEnabled();
  } else {
    await expect(next).toHaveCount(0); // las 4 tarjetas entran: no hacen falta controles
  }
  w.assertClean();
});

test("carrito: el panel se cierra con Escape (animación de salida) y vuelve a abrirse", async ({ page }) => {
  const w = watchErrors(page);
  await page.goto("/tienda/gift-card-20000");
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  const drawer = page.getByRole("dialog", { name: "Tu carrito" });
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  expect(await page.evaluate("document.body.style.overflow")).toBe("");
  w.assertClean();
});
