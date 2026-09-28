import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

// PNG real de 1×1 como comprobante
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

test("reserva completa: sede → servicio → barbero → horario → datos → comprobante → WhatsApp", async ({ page, context }) => {
  const w = watchErrors(page);
  // No salimos a internet: se intercepta wa.me y se verifica la URL que se generó.
  await context.route("https://wa.me/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<h1>WhatsApp</h1>" }));
  await page.goto("/reservar");
  await page.getByRole("button", { name: /Palermo/ }).click();
  await page.getByRole("button", { name: /Corte clásico/ }).click();
  await page.getByRole("button", { name: /Cualquier barbero/ }).click();

  // primer día con horarios disponibles
  const days = page.locator("button[aria-pressed]:not([disabled])").filter({ hasText: /\d/ });
  for (let i = 1; i < 10; i++) {
    await days.nth(i).click();
    await page.waitForLoadState("networkidle");
    const slot = page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first();
    if (await slot.isVisible().catch(() => false)) {
      await slot.click();
      break;
    }
  }
  await page.getByRole("button", { name: "Continuar" }).click();

  const main = page.getByRole("main");
  await main.getByLabel("Nombre y apellido").fill("Cliente E2E");
  await main.getByLabel("Celular (WhatsApp)").fill("11 4000 1234");
  await page.getByRole("button", { name: "Reservar y pasar a la seña" }).click();

  await expect(page.getByRole("heading", { name: "¡Horario reservado!" })).toBeVisible();
  await expect(page.getByText("JACK.PALERMO.MP")).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({ name: "comprobante.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Subir comprobante" }).click();
  await expect(page.getByText("¡Listo! Lo revisamos y te confirmamos.")).toBeVisible();

  const popup = context.waitForEvent("page");
  await page.getByRole("button", { name: /Enviar reserva por WhatsApp/ }).click();
  const wa = await popup;
  const url = decodeURIComponent(wa.url());
  expect(url).toContain("5491160000001"); // WhatsApp de la sede Palermo
  expect(url).toContain("NUEVA RESERVA");
  expect(url).toContain("Cliente E2E");
  expect(url).toContain("Corte clásico");
  expect(url).toContain("Comprobante:");
  await page.screenshot({ path: "test-results/shots/booking-done.png", fullPage: true });
  w.assertClean();
});
