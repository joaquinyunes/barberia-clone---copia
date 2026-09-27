# 03 · Estructura de carpetas y modelo de datos

## Raíz (monorepo)

```
barberia-clone/
├── client/                    # React + Vite (reemplaza a /frontend)
├── server/                    # Express + Mongoose (reemplaza a /backend)
├── packages/
│   └── shared/                # Tipos y esquemas Zod compartidos
│       └── src/
│           ├── schemas/       # appointment.schema.ts, auth.schema.ts, contact.schema.ts, …
│           ├── types/         # DTOs inferidos de los schemas
│           └── constants/     # roles, estados de turno, etc.
├── tools/
│   └── site-audit/            # Script Playwright para auditar el sitio de referencia
├── docs/                      # Estos documentos
├── docker-compose.yml         # mongo + mongo-express para desarrollo
├── .gitignore
├── package.json               # workspaces + scripts globales (dev, build, test, lint)
└── README.md
```

## Backend `/server`

```
server/
├── src/
│   ├── app.ts                       # crea la app Express (sin listen → testeable)
│   ├── server.ts                    # conecta DB y hace listen
│   ├── config/
│   │   ├── env.ts                   # lee y valida process.env con Zod
│   │   ├── db.ts                    # conexión Mongoose
│   │   └── cors.ts
│   ├── middlewares/
│   │   ├── authenticate.ts          # verifica JWT → req.user
│   │   ├── authorize.ts             # authorize('admin', 'barber')
│   │   ├── validate.ts              # validate({ body, params, query })
│   │   ├── rateLimiters.ts
│   │   ├── notFound.ts
│   │   └── errorHandler.ts
│   ├── utils/
│   │   ├── AppError.ts
│   │   ├── asyncPaginate.ts
│   │   ├── slugify.ts
│   │   └── tokens.ts                # sign/verify access & refresh
│   ├── lib/
│   │   ├── logger.ts                # pino
│   │   ├── mailer.ts                # nodemailer + plantillas
│   │   └── stripe.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.test.ts
│   │   ├── users/          { user.model, user.repository, user.service, user.controller, user.routes }
│   │   ├── locations/      { location.model, …repository, …service, …controller, …routes }
│   │   ├── services/       # catálogo de servicios (corte, afeitado, VIP…)
│   │   ├── barbers/
│   │   ├── appointments/
│   │   │   ├── appointment.model.ts
│   │   │   ├── appointment.repository.ts
│   │   │   ├── appointment.service.ts
│   │   │   ├── availability.service.ts   # cálculo de slots libres
│   │   │   ├── appointment.controller.ts
│   │   │   ├── appointment.routes.ts
│   │   │   └── availability.test.ts
│   │   ├── products/       # vouchers y packs
│   │   ├── orders/         # carrito → pedido → pago (Stripe webhook)
│   │   ├── vouchers/       # códigos emitidos y canje
│   │   ├── contact/
│   │   ├── newsletter/
│   │   └── content/        # slides del hero, testimonios, páginas legales
│   ├── routes/
│   │   └── index.ts        # monta /api/v1/<modulo>
│   └── seed/
│       ├── data/*.json
│       └── seed.ts         # npm run seed → carga sedes, servicios, barberos, productos
├── tests/setup.ts          # mongodb-memory-server
├── .env.example
├── tsconfig.json
└── package.json
```

### Endpoints principales (`/api/v1`)

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/auth/register` · `/auth/login` · `/auth/refresh` · `/auth/logout` · `/auth/forgot` · `/auth/reset` | público |
| GET | `/auth/me` | autenticado |
| GET | `/locations` · `/locations/:slug` | público |
| GET | `/services?location=&category=` · `/services/:slug` | público |
| GET | `/barbers?location=` | público |
| GET | `/appointments/availability?location=&service=&barber=&date=` | público |
| POST | `/appointments` | autenticado (o invitado con email) |
| GET | `/appointments/me` · PATCH `/appointments/:id/cancel` | dueño |
| GET | `/products?category=&sort=` · `/products/:slug` · `/products/categories` | público |
| POST | `/orders/checkout` → sesión Stripe · POST `/orders/webhook` | autenticado / Stripe |
| GET | `/orders/me` | autenticado |
| POST | `/vouchers/validate` | público |
| POST | `/contact` · `/newsletter` | público (rate-limited) |
| GET | `/content/hero-slides` · `/content/testimonials` · `/content/pages/:slug` | público |
| * | `/admin/...` CRUD de todo lo anterior | admin |

### Modelo de datos (MongoDB)

```
User          { name, email*, passwordHash, phone, role: customer|barber|admin, refreshTokenVersion }
Location      { slug*, name, address, geo{lat,lng}, phone, email, description, images[],
                openingHours[{ day 0-6, open "09:00", close "20:00" }], isVip, active }
Service       { slug*, name, category: cut|shave|package|vip, description, includes[],
                durationMin, price, locations[→Location], active }
Barber        { name, bio, photo, location→Location, services[→Service], user→User?, active }
Appointment   { customer→User | guest{name,email,phone}, location, service, barber,
                startsAt, endsAt, status: booked|cancelled|completed|no_show, voucher→Voucher?, notes }
                índice único parcial: { barber, startsAt } donde status = booked  ← evita doble reserva
Product       { slug*, name, category, description, images[], price, validAt[→Location],
                service→Service?, stock?, active }
Order         { user→User, items[{ product, qty, unitPrice }], total, status: pending|paid|failed,
                stripeSessionId, recipientEmail }
Voucher       { code*, product→Product, order→Order, balance, expiresAt, redeemedAt?, redeemedIn→Appointment? }
ContactMessage{ name, email, location?, message, handled }
Subscriber    { email*, confirmedAt }
Content       { type: heroSlide|testimonial|page, slug, title, body, image, order, active }
```

`*` = índice único.

## Frontend `/client`

```
client/
├── public/
│   ├── images/                    # imágenes propias optimizadas (webp)
│   └── favicon.svg
├── src/
│   ├── main.tsx                   # monta <AppProviders><AppRouter/></AppProviders>
│   ├── app/
│   │   ├── providers/
│   │   │   ├── AppProviders.tsx   # QueryClient, Helmet, Router
│   │   │   └── queryClient.ts
│   │   └── router/
│   │       ├── AppRouter.tsx      # createBrowserRouter + lazy pages
│   │       ├── paths.ts           # ÚNICA fuente de URLs
│   │       ├── ProtectedRoute.tsx
│   │       └── AdminRoute.tsx
│   ├── styles/
│   │   ├── tokens.css             # colores, tipografías, espaciados, sombras, breakpoints
│   │   ├── reset.css
│   │   └── global.css             # sólo body, tipografía base, utilidades mínimas
│   ├── components/
│   │   ├── ui/                    # ÁTOMOS / MOLÉCULAS reutilizables
│   │   │   ├── Button/            { Button.tsx, Button.module.css, index.ts }
│   │   │   ├── Input/  Select/  Textarea/  Checkbox/
│   │   │   ├── Card/  Badge/  Modal/  Drawer/  Spinner/  Skeleton/
│   │   │   ├── SectionTitle/  Container/  Price/  Rating/
│   │   │   ├── Carousel/          # usado por HeroSlider y Testimonials
│   │   │   ├── MapEmbed/
│   │   │   └── Reveal/            # wrapper de animación on-scroll (Framer Motion)
│   │   └── layout/                # ORGANISMOS globales
│   │       ├── MainLayout/        # Header + <Outlet/> + Footer + CookieBanner
│   │       ├── Header/            { Header.tsx, Header.module.css, NavMenu.tsx, NavDropdown.tsx }
│   │       ├── MobileMenu/
│   │       ├── Footer/
│   │       ├── CookieBanner/
│   │       ├── CustomCursor/
│   │       └── AdminLayout/
│   ├── features/                  # LÓGICA + UI por dominio
│   │   ├── auth/
│   │   │   ├── api/auth.api.ts
│   │   │   ├── hooks/useLogin.ts · useRegister.ts · useCurrentUser.ts
│   │   │   ├── store/authStore.ts           # Zustand (access token en memoria)
│   │   │   └── components/LoginForm/ · RegisterForm/
│   │   ├── locations/
│   │   │   ├── api/locations.api.ts
│   │   │   ├── hooks/useLocations.ts · useLocation.ts
│   │   │   └── components/LocationCard/ · LocationsGrid/ · OpeningHours/ · LocationsMap/
│   │   ├── services/              # catálogo (ServiceCard, ServiceList, VipTreatmentCard)
│   │   ├── booking/
│   │   │   ├── api/booking.api.ts
│   │   │   ├── hooks/useAvailability.ts · useCreateAppointment.ts · useBookingWizard.ts
│   │   │   ├── utils/slots.ts                # helpers puros (testeables)
│   │   │   └── components/BookingWizard/ · StepLocation/ · StepService/ · StepBarber/
│   │   │                 · DatePicker/ · TimeSlots/ · StepDetails/ · BookingSummary/
│   │   ├── shop/
│   │   │   ├── api/products.api.ts · orders.api.ts
│   │   │   ├── hooks/useProducts.ts · useProduct.ts · useCheckout.ts
│   │   │   ├── store/cartStore.ts            # Zustand + persist
│   │   │   └── components/ProductCard/ · ProductGrid/ · ProductFilters/ · ProductGallery/
│   │   │                 · CartDrawer/ · CartItem/ · CartSummary/ · CheckoutForm/
│   │   ├── account/               # MyAppointments, MyOrders, ProfileForm
│   │   ├── contact/               # ContactForm + useContact
│   │   ├── newsletter/            # NewsletterForm + useSubscribe
│   │   ├── home/                  # HeroSlider, IntroBlock, QuickLinks (ServiceCards),
│   │   │                          # FeaturedServices, VipTeaser, Testimonials, CtaBanner
│   │   └── admin/                 # tablas y formularios CRUD
│   ├── pages/                     # sólo COMPONEN secciones
│   │   ├── HomePage/  StoryPage/  WhyUsPage/
│   │   ├── LocationsPage/  LocationDetailPage/
│   │   ├── VipPage/  VipTreatmentsPage/  ServicesPage/
│   │   ├── ShopPage/  CategoryPage/  ProductPage/  CartPage/  CheckoutPage/  OrderSuccessPage/
│   │   ├── BookingPage/  BookingSuccessPage/
│   │   ├── ContactPage/  LegalPage/
│   │   ├── AccountPage/  LoginPage/  RegisterPage/  ForgotPasswordPage/
│   │   ├── admin/ (DashboardPage, LocationsAdminPage, ServicesAdminPage, …)
│   │   └── NotFoundPage/
│   ├── services/
│   │   └── http.ts                # instancia Axios + interceptores (token, refresh, errores)
│   ├── hooks/                     # hooks genéricos
│   │   ├── useScrollPosition.ts   # para el header "scrolled"
│   │   ├── useLockBodyScroll.ts
│   │   ├── useMediaQuery.ts
│   │   ├── useInView.ts
│   │   └── useCustomCursor.ts
│   ├── utils/
│   │   ├── formatPrice.ts · formatDate.ts · cn.ts
│   │   └── seo.ts
│   └── types/                     # re-exporta los tipos de packages/shared
├── tests/                         # Playwright E2E + visual
├── .env.example                   # VITE_API_URL, VITE_GOOGLE_MAPS_KEY, VITE_STRIPE_PK
├── index.html
├── vite.config.ts
└── package.json
```

## Flujo de datos de ejemplo: reservar un turno

1. `BookingPage` renderiza `BookingWizard`; el estado del wizard vive en `useBookingWizard` (paso actual + selección).
2. `StepLocation` usa `useLocations()` → `locations.api.ts` → `GET /locations`.
3. Al elegir fecha, `TimeSlots` usa `useAvailability({location, service, barber, date})` → `GET /appointments/availability`.
4. En el server, `availability.service` toma el horario de la sede, la duración del servicio y los turnos existentes del barbero, y devuelve los slots libres.
5. `StepDetails` (React Hook Form + `appointmentSchema` de `shared`) → `useCreateAppointment` → `POST /appointments`.
6. El server valida con el mismo schema, revalida disponibilidad (el índice único evita la carrera), guarda en MongoDB y envía email.
7. En `onSuccess`, TanStack Query invalida `['availability']` y `['appointments','me']` → la UI se actualiza sola y navega a `BookingSuccessPage`.
