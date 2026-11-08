import { env } from "../../config/env.js";
import { describe, expect, it } from "vitest";
import { facturacion, registrarProveedor, sinProveedor } from "./facturacion.js";

const venta = { referencia: "JEB-ABC123", fecha: new Date(), total: 15000, concepto: "Corte", comprador: { nombre: "Ana" } };

describe("facturación (interfaz)", () => {
  it("sin proveedor emite un comprobante interno NO fiscal, repetible con el mismo número", async () => {
    const a = await facturacion().emitir(venta);
    expect(a).toMatchObject({ estado: "no_fiscal", numero: "INT-JEB-ABC123" });
    expect((await sinProveedor.emitir(venta)).numero).toBe(a.numero);
  });
  it("un proveedor certificado se enchufa por configuración sin tocar el cobro, y uno desconocido falla fuerte", async () => {
    registrarProveedor({ nombre: "falso", emitir: async (v) => ({ estado: "emitido", tipo: "Factura C", numero: `0001-${v.referencia}`, cae: "70123456789012" }) });
    env.FACTURACION_PROVIDER = "falso";
    expect(await facturacion().emitir(venta)).toMatchObject({ estado: "emitido", cae: "70123456789012" });
    env.FACTURACION_PROVIDER = "inexistente";
    expect(() => facturacion()).toThrow(/no está registrado/);
    env.FACTURACION_PROVIDER = "none";
  });
});
