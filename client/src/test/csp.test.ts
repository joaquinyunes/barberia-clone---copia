import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../../..");
const vercel = JSON.parse(readFileSync(path.join(root, "vercel.json"), "utf8")) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
const render = readFileSync(path.join(root, "render.yaml"), "utf8");

const cspVercel = vercel.headers.find((h) => h.source === "/(.*)")!.headers.find((h) => h.key === "Content-Security-Policy")!.value;
const cspRender = /name: Content-Security-Policy\s+value: "([^"]+)"/.exec(render)![1];
const directive = (csp: string, name: string) => (csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? "").split(/\s+/).slice(1);

/** ¿El origen entra en la lista de la directiva? (soporta el comodín de subdominio de CSP: https://*.dominio) */
const allows = (sources: string[], origin: string) => {
  const url = new URL(origin);
  return sources.some((s) => {
    if (s === "'self'") return false;
    const m = /^(https?):\/\/(\*\.)?([^/]+)$/.exec(s);
    if (!m) return false;
    const [, proto, wild, host] = m;
    return url.protocol === `${proto}:` && (wild ? url.hostname.endsWith(`.${host}`) : url.hostname === host);
  });
};

describe("CSP en modo bloqueo: el sitio puede hablar con su API", () => {
  it("vercel.json y render.yaml aplican exactamente la misma política y no hay versión «solo reporte»", () => {
    expect(cspRender).toBe(cspVercel);
    expect(JSON.stringify(vercel)).not.toContain("Report-Only");
    expect(render).not.toContain("Report-Only");
  });

  it("connect-src e img-src cubren el host de la API que declara render.yaml (jack-el-barbero-api.onrender.com)", () => {
    const apiName = /name: (jack-el-barbero-api)/.exec(render)![1];
    const api = `https://${apiName}.onrender.com`;
    expect(allows(directive(cspVercel, "connect-src"), api)).toBe(true);
    expect(allows(directive(cspVercel, "img-src"), api)).toBe(true);
  });

  it("una API en otro dominio NO queda cubierta: hay que agregarla (por eso ENTREGA.md lo pide en el alta)", () => {
    expect(allows(directive(cspVercel, "connect-src"), "https://api.otrocliente.com.ar")).toBe(false);
  });

  it("scripts solo del propio sitio, sin eval ni inline", () => {
    const scripts = directive(cspVercel, "script-src");
    expect(scripts).toContain("'self'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(directive(cspVercel, "object-src")).toEqual(["'none'"]);
    expect(directive(cspVercel, "frame-ancestors")).toEqual(["'none'"]);
  });

  it("el service worker y el manifest entran en worker-src y manifest-src", () => {
    expect(directive(cspVercel, "worker-src")).toContain("'self'");
    expect(directive(cspVercel, "manifest-src")).toContain("'self'");
  });
});
