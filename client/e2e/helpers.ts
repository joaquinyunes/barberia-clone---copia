import { expect, type Page } from "@playwright/test";

/** Falla el test si la página tira errores de JavaScript o respuestas 5xx. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("response", (r) => r.status() >= 500 && errors.push(`${r.status()} ${r.url()}`));
  return {
    errors,
    assertClean: () => expect(errors, errors.join("\n")).toEqual([]),
  };
}

export async function loginAsAdmin(page: Page) {
  await page.goto("/ingresar");
  const main = page.getByRole("main");
  await main.getByLabel("Email", { exact: true }).fill("admin@jackelbarbero.com");
  await main.getByLabel("Contraseña").fill("jack1234");
  await main.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin/);
}
