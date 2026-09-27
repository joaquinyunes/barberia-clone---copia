# 02 · Stack, lenguajes y justificación

Base: **MERN** (MongoDB · Express · React · Node.js) con **TypeScript de punta a punta**.

## Resumen

| Capa | Elección | Por qué |
|---|---|---|
| Lenguaje | **TypeScript 5** (cliente, servidor y paquete compartido) | El frontend ya está en TS. Tipos compartidos entre API y UI = menos bugs en contratos (un campo renombrado rompe la compilación, no producción). |
| Monorepo | **npm workspaces** (`client`, `server`, `packages/shared`) | Un solo `npm install`, scripts coordinados, sin herramientas extra (Turborepo/Nx serían overkill para 3 paquetes). |
| Runtime | **Node.js 22 LTS** | Ya instalado; soporta `fetch`, `--watch` y ESM nativos. |
| **Frontend** | | |
| Framework | **React 19 + Vite** | Ya presente en el repo. Vite: arranque y HMR instantáneos. |
| Routing | **React Router 7** | Ya presente. Rutas anidadas, `lazy()` por página, loaders. |
| Estilos | **CSS Modules** (`Componente.module.css`) + **design tokens** en variables CSS | Cumple el pedido de separar lógica y estilo en archivos distintos, sin colisiones globales (el problema actual con `.css` planos). Un pixel-perfect de un diseño existente se traduce más fácil a CSS que a clases utilitarias. Se desinstala Tailwind (está instalado pero no se usa). |
| Estado de servidor | **TanStack Query 5** | Cache, reintentos, estados loading/error, invalidación al crear/cancelar turnos. Evita reinventar eso con `useEffect`. |
| Estado de cliente | **Zustand** | Carrito, sesión y UI (menú mobile). Mínimo boilerplate vs Redux; persistencia del carrito con su middleware. |
| Formularios | **React Hook Form + Zod** | Validación declarativa y **los mismos esquemas Zod que usa el backend** (desde `packages/shared`). |
| HTTP | **Axios** | Interceptores para token JWT y refresh automático en 401. |
| Animaciones | **Framer Motion** | Ya presente. Se elimina GSAP para no tener dos librerías que hacen lo mismo. |
| Íconos | **react-icons** | Ya presente. Se eliminan `lucide-react` y Font Awesome duplicados. |
| Fechas | **date-fns** | Calendario de reservas y cálculo de slots; liviano y tree-shakeable. |
| Mapas | **@react-google-maps/api** | Ya presente; key vía variable de entorno. |
| SEO | **react-helmet-async** | Title/meta por página. |
| **Backend** | | |
| Framework | **Express 5** | Estándar MERN; v5 captura errores de handlers `async` sin wrappers. |
| ODM | **Mongoose 8** | Esquemas, validaciones, índices, `populate` para relaciones (turno → sede/servicio/barbero). |
| Validación | **Zod** (esquemas compartidos) | Una sola fuente de verdad para request bodies. |
| Auth | **JWT** (access 15 min en memoria + refresh 7 días en cookie `httpOnly`) + **bcrypt** | Seguro contra XSS (el refresh no es accesible por JS) y stateless. Roles: `customer`, `barber`, `admin`. |
| Seguridad | **helmet**, **cors**, **express-rate-limit**, **express-mongo-sanitize** | Headers seguros, CORS restringido al dominio del front, límite en login/contacto, anti-inyección NoSQL. |
| Pagos (etapa 1) | **Transferencia / alias + subida de comprobante** | Funciona desde el día 1 sin cuentas externas; el admin valida el comprobante. |
| Pagos (etapa 2) | **Mercado Pago Checkout Pro** (SDK oficial `mercadopago` para Node) | Estándar en Argentina. Preferencia de pago → redirección → webhook con validación de firma `x-signature` → se confirma el turno solo. Suscripciones (`preapproval`) para la membresía. |
| Subida de archivos | **Multer** + **Cloudinary** (disco local en dev) | Comprobantes (JPG/PNG/PDF, máx. 5 MB, validando el tipo real del archivo) y fotos del admin. |
| WhatsApp (etapa 1) | **Link `wa.me` con mensaje pre-armado** + **Web Share API** en celulares | Gratis y sin aprobación de Meta. En el celular permite adjuntar la imagen del comprobante; en PC va un link seguro al comprobante. |
| WhatsApp (etapa 2) | **WhatsApp Cloud API** (Meta) | Envío automático de confirmaciones y recordatorios con el comprobante adjunto. Aprox. US$ 0,012 por mensaje "utility" en Argentina. |
| Emails | **Nodemailer** (Ethereal en dev / SMTP en prod) | Copia de la confirmación, voucher, recuperar contraseña. |
| Logs | **pino** + **pino-http** | Logs JSON rápidos. |
| Config | **dotenv** + validación con Zod al arrancar | Si falta una variable, el server no levanta (falla rápido). |
| **Calidad** | | |
| Lint/formato | **ESLint 9 + Prettier** | |
| Tests unitarios | **Vitest** (+ React Testing Library en el cliente) | Mismo runner en ambos lados. |
| Tests API | **Supertest + mongodb-memory-server** | Tests de integración sin tocar una base real. |
| Tests E2E / visuales | **Playwright** | Recorre el flujo de reserva y compara screenshots contra la referencia. |
| Tareas programadas | **node-cron** | Liberar turnos con seña vencida, recordatorios 24 h antes, "ya te toca el corte". |
| **Infra** | | |
| Base de datos | **MongoDB Atlas** (free tier) / Mongo local con Docker en dev | |
| Deploy API | **Render** (web service) | Necesita URL pública para los webhooks de Mercado Pago. |
| Deploy cliente | **Vercel** (static) | |
| Dev local | **docker-compose** (mongo + mongo-express) | Nadie necesita instalar Mongo a mano. |

## Arquitectura elegida

### Backend: Clean Architecture por módulos (feature-based)

```
petición HTTP
   └─> routes        (define endpoint + middlewares)
        └─> middlewares (auth, validate(zodSchema), rateLimit)
             └─> controller  (traduce HTTP ⇄ dominio; sin lógica de negocio)
                  └─> service     (reglas de negocio: disponibilidad, precios, vouchers)
                       └─> repository (única capa que habla con Mongoose)
                            └─> model  (esquema Mongoose)
```

Reglas:
- Un **controller nunca** importa un modelo; un **service nunca** conoce `req`/`res`.
- Los errores de negocio se lanzan como `AppError(status, code, message)` y un único `errorHandler` responde.
- Cada módulo (`auth`, `locations`, `appointments`, …) es una carpeta autocontenida.

### Frontend: Feature-Sliced (simplificado) + Atomic Design para la UI

```
pages  ──usa──>  features  ──usa──>  components/ui (átomos/moléculas)
                    │
                    ├─ api/    (llamadas Axios, sin JSX)
                    ├─ hooks/  (TanStack Query / lógica, sin JSX)
                    └─ components/ (JSX + .module.css, sin fetch)
```

Reglas:
- Un componente visual **no hace fetch**: recibe datos por props o usa un hook.
- Un hook **no devuelve JSX**.
- Cada componente vive en su carpeta: `Button/Button.tsx`, `Button/Button.module.css`, `Button/index.ts`.
- Las páginas sólo componen secciones; casi no tienen lógica.

## Convenciones

- Carpetas de componentes en `PascalCase`, hooks `useAlgo.ts`, servicios `algo.api.ts`.
- Rutas de URL en minúscula y español (`/ubicaciones`, `/reservar`), definidas una sola vez en `routes/paths.ts`.
- Commits con **Conventional Commits** (`feat:`, `fix:`, `refactor:` …).
- Variables de entorno: `server/.env.example` y `client/.env.example` versionados; los `.env` reales, nunca.
