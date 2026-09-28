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
