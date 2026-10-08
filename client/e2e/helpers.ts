import { expect, type Page } from "@playwright/test";

/**
 * Falla el test si la página tira errores de JavaScript, respuestas 5xx o errores de consola
 * (React y React Router reportan ahí los errores que atrapan sus boundaries, sin pageerror).
 */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    // Los 4xx esperables (ej. /auth/refresh sin sesión) se loguean como "Failed to load resource".
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) errors.push(`console: ${m.text().slice(0, 300)}`);
  });
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
