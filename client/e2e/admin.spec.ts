import { expect, test } from "@playwright/test";
import { loginAsAdmin, watchErrors } from "./helpers";

const ADMIN_PAGES = [
  ["/admin", "Hola, Dueño"],
  ["/admin/saldos", "Centro de saldos"],
  ["/admin/turnos", "Turnos"],
  ["/admin/cancelaciones", "Registro de cancelaciones"],
  ["/admin/clientes", "Clientes"],
  ["/admin/barberos", "Barberos"],
  ["/admin/liquidaciones", "Liquidaciones"],
  ["/admin/deudas", "Adelantos y deudas"],
  ["/admin/objetivos", "Objetivos"],
  ["/admin/asistencia", "Asistencia"],
  ["/admin/puestos", "Puestos"],
  ["/admin/caja", "Caja"],
  ["/admin/movimientos", "Movimientos"],
  ["/admin/gastos", "Gastos"],
  ["/admin/pedidos", "Pedidos de la tienda"],
  ["/admin/productos", "Productos y stock"],
  ["/admin/compras", "Compras"],
  ["/admin/proveedores", "Proveedores"],
  ["/admin/herramientas", "Herramientas"],
  ["/admin/servicios", "Servicios y precios"],
  ["/admin/membresias", "Membresías"],
  ["/admin/packs", "Packs y bonos"],
  ["/admin/gift-cards", "Gift cards"],
  ["/admin/promociones", "Promociones"],
  ["/admin/mensajes", "Mensajes"],
  ["/admin/reportes", "Reportes"],
  ["/admin/usuarios", "Usuarios y permisos"],
  ["/admin/auditoria", "Auditoría"],
  ["/admin/configuracion", "Configuración"],
] as const;

test("todas las secciones del panel cargan sin errores", async ({ page }) => {
  const w = watchErrors(page);
  await loginAsAdmin(page);
  for (const [path, title] of ADMIN_PAGES) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: title }).first(), path).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `test-results/shots/admin${path.replace(/\//g, "_")}.png`, fullPage: true });
  }
  w.assertClean();
});

test("ficha de barbero y ficha de cliente", async ({ page }) => {
  const w = watchErrors(page);
  await loginAsAdmin(page);
  await page.goto("/admin/barberos");
  await page.getByRole("cell", { name: "Lucas Ferreyra" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Lucas Ferreyra" })).toBeVisible();
  for (const tab of ["Adelantos y deudas", "Liquidación", "Objetivo", "Horario y comisiones"]) {
    await page.getByRole("tab", { name: new RegExp(tab) }).click();
  }
  await page.getByRole("tab", { name: "Liquidación" }).click();
  await page.getByRole("button", { name: "Calcular" }).click();
  await expect(page.getByText("TOTAL A PAGAR")).toBeVisible();
  await page.screenshot({ path: "test-results/shots/admin-barber-settlement.png", fullPage: true });

  await page.goto("/admin/clientes");
  await page.getByRole("cell", { name: "Juan Pérez" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Juan Pérez" })).toBeVisible();
  await page.getByRole("tab", { name: /Cuenta corriente/ }).click();
  await page.screenshot({ path: "test-results/shots/admin-client-profile.png", fullPage: true });
  w.assertClean();
});
