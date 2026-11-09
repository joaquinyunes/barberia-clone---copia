import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

/** Ejecuta public/sw.js en un entorno simulado (self, caches, fetch) y expone sus manejadores. */
function loadWorker(opts: { online: boolean }) {
  const handlers: Record<string, (e: unknown) => void> = {};
  const store = new Map<string, Map<string, unknown>>();
  const fetched: string[] = [];
  const cache = (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name)!;
    return { add: async (u: string) => void m.set(u, "shell"), put: async (r: { url: string }, v: unknown) => void m.set(new URL(r.url).pathname, v), match: async (r: string | { url: string }) => m.get(typeof r === "string" ? r : new URL(r.url).pathname) };
  };
  const self = { location: { origin: "https://sitio.test" }, addEventListener: (t: string, h: (e: unknown) => void) => (handlers[t] = h), skipWaiting: async () => undefined, clients: { claim: async () => undefined } };
  const caches = { open: async (n: string) => cache(n), keys: async () => [...store.keys()], delete: async (n: string) => store.delete(n), match: async (r: string | { url: string }) => (await cache("jack-v1")).match(r) };
  const fetchFn = async (req: { url: string }) => {
    fetched.push(new URL(req.url).pathname);
    if (!opts.online) throw new Error("sin conexión");
    return { clone: () => ({}), body: "red" };
  };
  vm.runInNewContext(readFileSync(path.resolve(__dirname, "../../public/sw.js"), "utf8"), { self, caches, fetch: fetchFn, URL, Promise });
  const request = (url: string, init: { method?: string; mode?: string } = {}) => ({ url, method: init.method ?? "GET", mode: init.mode ?? "no-cors" });
  /** Devuelve lo que respondió el worker, o "pasa" si no intervino (el navegador sigue normal). */
  const fire = async (req: ReturnType<typeof request>) => {
    let out: Promise<unknown> | undefined;
    handlers.fetch({ request: req, respondWith: (p: Promise<unknown>) => (out = p) });
    return out ? await out : "pasa";
  };
  return { handlers, store, fetched, request, fire };
}

describe("service worker de la PWA (simulado)", () => {
  it("al instalar guarda el cascarón; las páginas van por red primero y, sin conexión, usan el cascarón", async () => {
    const w = loadWorker({ online: false });
    await new Promise<void>((resolve) => w.handlers.install({ waitUntil: (p: Promise<unknown>) => void p.then(() => resolve()) }));
    expect(w.store.get("jack-v1")?.has("/")).toBe(true);
    expect(await w.fire(w.request("https://sitio.test/reservar", { mode: "navigate" }))).toBe("shell");
    const on = loadWorker({ online: true });
    expect(await on.fire(on.request("https://sitio.test/reservar", { mode: "navigate" }))).toMatchObject({ body: "red" });
  });

  it("NUNCA toca la API, otros orígenes ni pedidos que no son GET (no guarda datos personales)", async () => {
    const w = loadWorker({ online: true });
    expect(await w.fire(w.request("https://sitio.test/api/v1/me/client"))).toBe("pasa");
    expect(await w.fire(w.request("https://api.onrender.com/api/v1/public/site"))).toBe("pasa");
    expect(await w.fire(w.request("https://sitio.test/reservar", { method: "POST", mode: "navigate" }))).toBe("pasa");
    expect(w.fetched).toEqual([]);
    expect([...(w.store.get("jack-v1")?.keys() ?? [])].some((k) => k.startsWith("/api"))).toBe(false);
  });

  it("los archivos con hash de /assets se sirven del caché después de la primera vez", async () => {
    const w = loadWorker({ online: true });
    await w.fire(w.request("https://sitio.test/assets/index-abc123.js"));
    await new Promise((r) => setTimeout(r, 0));
    expect(w.store.get("jack-v1")?.has("/assets/index-abc123.js")).toBe(true);
    const off = w.fetched.length;
    await w.fire(w.request("https://sitio.test/assets/index-abc123.js"));
    expect(w.fetched.length).toBe(off); // no volvió a ir a la red
  });

  it("el manifest tiene lo que pide el navegador para instalar la app", () => {
    const m = JSON.parse(readFileSync(path.resolve(__dirname, "../../public/manifest.webmanifest"), "utf8"));
    expect(m).toMatchObject({ display: "standalone", start_url: expect.any(String), scope: "/" });
    expect(m.icons.length).toBeGreaterThan(0);
    expect(m.name.length).toBeGreaterThan(0);
  });
});
