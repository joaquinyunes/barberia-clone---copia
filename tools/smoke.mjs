// Prueba de humo de una instalación nueva.  node tools/smoke.mjs <URL_API_con_/api/v1> [URL_SITIO] [ORIGEN_PERMITIDO]
// Sale con código 1 si algo falla. No escribe nada en la base.
const [api, site, origin = site] = process.argv.slice(2);
if (!api) {
  console.error("Uso: node tools/smoke.mjs https://api.ejemplo.com/api/v1 https://www.ejemplo.com");
  process.exit(2);
}
let fallos = 0;
const t0 = Date.now();
const check = async (nombre, fn) => {
  const t = Date.now();
  try {
    const detalle = await fn();
    console.log(`OK    ${nombre}${detalle ? ` — ${detalle}` : ""} (${Date.now() - t} ms)`);
  } catch (e) {
    fallos++;
    console.log(`FALLA ${nombre} — ${e.message}`);
  }
};
const ok = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

await check("API viva", async () => ok((await fetch(`${api}/health`)).ok, "no responde"));
await check("API conectada a la base", async () => {
  const r = await fetch(`${api}/health/ready`);
  ok(r.ok, `HTTP ${r.status}`);
});
await check("Datos del negocio cargados", async () => {
  const s = await (await fetch(`${api}/public/site`)).json();
  ok(s.businessName, "sin nombre de negocio");
  const locs = await (await fetch(`${api}/public/locations`)).json();
  ok(Array.isArray(locs) && locs.length > 0, "sin sedes");
  return `${s.businessName}, ${locs.length} sede(s)`;
});
await check("El panel exige sesión", async () => ok((await fetch(`${api}/admin/clients`)).status === 401, "el panel responde sin login"));
await check("Cabeceras de seguridad de la API", async () => {
  const h = (await fetch(`${api}/health`)).headers;
  for (const k of ["strict-transport-security", "x-content-type-options", "permissions-policy"]) ok(h.get(k), `falta ${k}`);
});
if (origin) {
  await check("CORS cerrado a orígenes ajenos", async () => {
    const h = (await fetch(`${api}/health`, { headers: { Origin: "https://sitio-ajeno.example" } })).headers;
    ok(!h.get("access-control-allow-origin"), "acepta orígenes ajenos");
    const own = (await fetch(`${api}/health`, { headers: { Origin: new URL(origin).origin } })).headers;
    ok(own.get("access-control-allow-origin") === new URL(origin).origin, "no acepta el sitio propio: revisar CLIENT_URL");
  });
}
if (site) {
  await check("Sitio responde con CSP que bloquea", async () => {
    const r = await fetch(site);
    ok(r.ok, `HTTP ${r.status}`);
    ok(r.headers.get("content-security-policy")?.includes("default-src 'self'"), "sin Content-Security-Policy");
    ok(!r.headers.get("content-security-policy-report-only"), "CSP en modo solo reporte");
  });
  await check("security.txt con datos reales", async () => {
    const t = await (await fetch(new URL("/.well-known/security.txt", site))).text();
    ok(!t.includes("CAMBIAR"), "security.txt todavía tiene el texto CAMBIAR-DOMINIO");
  });
}
console.log(fallos ? `\n${fallos} verificación(es) fallaron.` : `\nTodo bien en ${((Date.now() - t0) / 1000).toFixed(1)} s.`);
process.exit(fallos ? 1 : 0);
