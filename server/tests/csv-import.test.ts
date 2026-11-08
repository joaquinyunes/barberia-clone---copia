import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { Client } from "../src/modules/clients/client.model.js";
import { parseCsv } from "../src/modules/clients/csvImport.js";
import { app, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
beforeAll(async () => {
  ctx = await seedBase();
});

describe("importar clientes por CSV", () => {
  it("lee comillas, comas dentro de un campo, punto y coma y CRLF", () => {
    expect(parseCsv('nombre;teléfono\r\n"Pérez; Juan";11 5000-1111\r\n')).toEqual([["nombre", "teléfono"], ["Pérez; Juan", "11 5000-1111"]]);
    expect(parseCsv('a,b\n"x, y","dijo ""hola"""\n')).toEqual([["a", "b"], ["x, y", 'dijo "hola"']]);
  });

  it("crea los nuevos, salta los repetidos por teléfono, informa las filas inválidas y no da consentimiento de campañas", async () => {
    await Client.create({ name: "Ya Existía", phone: "5491150002222" });
    const csv = ["Nombre,Celular,Mail", "Ana Gómez,11 5000-1111,ana@mail.com", "Ya Existía,11 5000-2222,", "X,11 5000-3333,", "Luis Paz,123,", "Eva Roca,11 5000-4444,no-es-mail"].join("\n");
    const r = await request(app).post("/api/v1/admin/clients/import").set(ctx.auth).send({ csv });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ created: 1, skipped: 1 });
    expect(r.body.invalid.map((i: { line: number }) => i.line)).toEqual([4, 5, 6]);
    const ana = await Client.findOne({ email: "ana@mail.com" });
    expect(ana).toMatchObject({ name: "Ana Gómez", source: "importado" });
    expect(ana!.marketing?.whatsapp).toBeFalsy();
    const again = await request(app).post("/api/v1/admin/clients/import").set(ctx.auth).send({ csv });
    expect(again.body.created).toBe(0);
  });

  it("sin las columnas obligatorias no importa nada", async () => {
    const r = await request(app).post("/api/v1/admin/clients/import").set(ctx.auth).send({ csv: "color,talle\nrojo,M" });
    expect(r.body.created).toBe(0);
    expect(r.body.invalid[0].reason).toMatch(/columnas/);
  });
});
