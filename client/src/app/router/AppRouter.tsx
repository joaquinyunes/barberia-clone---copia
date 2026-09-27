import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import { PageLoader } from "@/components/ui";
import { MainLayout } from "@/components/layout/MainLayout/MainLayout";
import { ScrollToTop } from "@/components/layout/ScrollToTop/ScrollToTop";
import { AdminLayout } from "@/features/admin/components/AdminLayout/AdminLayout";
import { ProtectedRoute } from "./ProtectedRoute";

const page = (loader: () => Promise<{ default: React.ComponentType }>) => {
  const C = lazy(loader);
  return <C />;
};
const guard = (perms: string[], loader: () => Promise<{ default: React.ComponentType }>) => <ProtectedRoute staff perms={perms}>{page(loader)}</ProtectedRoute>;

function Root() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: page(() => import("@/pages/home/HomePage")) },
          { path: "historia", element: page(() => import("@/pages/story/StoryPage")) },
          { path: "por-que-nosotros", element: page(() => import("@/pages/whyus/WhyUsPage")) },
          { path: "sedes", element: page(() => import("@/pages/locations/LocationsPage")) },
          { path: "sedes/:slug", element: page(() => import("@/pages/locations/LocationDetailPage")) },
          { path: "servicios", element: page(() => import("@/pages/services/ServicesPage")) },
          { path: "la-cava", element: page(() => import("@/pages/vip/VipPage")) },
          { path: "tienda", element: page(() => import("@/pages/shop/ShopPage")) },
          { path: "tienda/:slug", element: page(() => import("@/pages/shop/ProductPage")) },
          { path: "carrito", element: page(() => import("@/pages/shop/CartPage")) },
          { path: "checkout", element: page(() => import("@/pages/shop/CheckoutPage")) },
          { path: "club-jack", element: page(() => import("@/pages/club/ClubPage")) },
          { path: "reservar", element: page(() => import("@/pages/booking/BookingPage")) },
          { path: "mi-reserva/:code", element: page(() => import("@/pages/booking/BookingManagePage")) },
          { path: "pago/resultado", element: page(() => import("@/pages/booking/PaymentResultPage")) },
          { path: "contacto", element: page(() => import("@/pages/contact/ContactPage")) },
          { path: "ingresar", element: page(() => import("@/pages/auth/LoginPage")) },
          { path: "registrarme", element: page(() => import("@/pages/auth/RegisterPage")) },
          { path: "mi-cuenta", element: <ProtectedRoute>{page(() => import("@/pages/account/AccountPage"))}</ProtectedRoute> },
          { path: "legal/:slug", element: page(() => import("@/pages/legal/LegalPage")) },
          { path: "*", element: page(() => import("@/pages/notfound/NotFoundPage")) },
        ],
      },
      {
        path: "admin",
        element: <ProtectedRoute staff><AdminLayout /></ProtectedRoute>,
        children: [
          { index: true, element: guard(["dashboard.view", "appointments.own"], () => import("@/pages/admin/DashboardPage")) },
          { path: "saldos", element: guard(["reports.view"], () => import("@/pages/admin/BalancesPage")) },
          { path: "mi-panel", element: guard(["appointments.own"], () => import("@/pages/admin/MyBarberPage")) },
          { path: "turnos", element: guard(["appointments.manage", "appointments.own"], () => import("@/pages/admin/AppointmentsPage")) },
          { path: "cancelaciones", element: guard(["appointments.manage"], () => import("@/pages/admin/CancellationsPage")) },
          { path: "clientes", element: guard(["clients.manage"], () => import("@/pages/admin/ClientsPage")) },
          { path: "clientes/:id", element: guard(["clients.manage"], () => import("@/pages/admin/ClientDetailPage")) },
          { path: "barberos", element: guard(["barbers.manage"], () => import("@/pages/admin/BarbersPage")) },
          { path: "barberos/:id", element: guard(["barbers.manage", "finance.manage"], () => import("@/pages/admin/BarberDetailPage")) },
          { path: "liquidaciones", element: guard(["finance.manage"], () => import("@/pages/admin/SettlementsPage")) },
          { path: "deudas", element: guard(["finance.manage"], () => import("@/pages/admin/DebtsPage")) },
          { path: "objetivos", element: guard(["finance.manage"], () => import("@/pages/admin/GoalsPage")) },
          { path: "asistencia", element: guard(["barbers.manage"], () => import("@/pages/admin/AttendancePage")) },
          { path: "puestos", element: guard(["inventory.manage"], () => import("@/pages/admin/StationsPage")) },
          { path: "caja", element: guard(["cash.manage"], () => import("@/pages/admin/CashPage")) },
          { path: "movimientos", element: guard(["finance.manage"], () => import("@/pages/admin/MovementsPage")) },
          { path: "gastos", element: guard(["expenses.manage"], () => import("@/pages/admin/ExpensesPage")) },
          { path: "pedidos", element: guard(["cash.manage", "commercial.manage"], () => import("@/pages/admin/OrdersPage")) },
          { path: "productos", element: guard(["inventory.manage"], () => import("@/pages/admin/ProductsPage")) },
          { path: "compras", element: guard(["suppliers.manage"], () => import("@/pages/admin/PurchasesPage")) },
          { path: "proveedores", element: guard(["suppliers.manage"], () => import("@/pages/admin/SuppliersPage")) },
          { path: "herramientas", element: guard(["inventory.manage"], () => import("@/pages/admin/ToolsPage")) },
          { path: "servicios", element: guard(["catalog.manage"], () => import("@/pages/admin/ServicesAdminPage")) },
          { path: "membresias", element: guard(["commercial.manage"], () => import("@/pages/admin/MembershipsPage")) },
          { path: "packs", element: guard(["commercial.manage"], () => import("@/pages/admin/PacksPage")) },
          { path: "gift-cards", element: guard(["commercial.manage", "cash.manage"], () => import("@/pages/admin/GiftCardsPage")) },
          { path: "promociones", element: guard(["commercial.manage"], () => import("@/pages/admin/PromotionsPage")) },
          { path: "mensajes", element: guard(["clients.manage"], () => import("@/pages/admin/MessagesPage")) },
          { path: "reportes", element: guard(["reports.view"], () => import("@/pages/admin/ReportsPage")) },
          { path: "usuarios", element: guard(["users.manage"], () => import("@/pages/admin/UsersPage")) },
          { path: "auditoria", element: guard(["audit.view"], () => import("@/pages/admin/AuditPage")) },
          { path: "configuracion", element: guard(["settings.manage"], () => import("@/pages/admin/SettingsPage")) },
        ],
      },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
