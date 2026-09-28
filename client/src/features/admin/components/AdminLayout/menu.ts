import type { IconType } from "react-icons";
import {
  IoAnalyticsOutline, IoBagHandleOutline, IoBarChartOutline, IoBusinessOutline, IoCalendarOutline, IoCardOutline, IoCashOutline,
  IoConstructOutline, IoCubeOutline, IoDocumentTextOutline, IoFlagOutline, IoGiftOutline, IoGridOutline, IoHomeOutline, IoPeopleOutline,
  IoPersonOutline, IoPricetagOutline, IoReceiptOutline, IoRibbonOutline, IoSettingsOutline, IoShieldCheckmarkOutline, IoSwapHorizontalOutline,
  IoTimeOutline, IoTrendingUpOutline, IoWalletOutline, IoCutOutline, IoChatbubbleOutline, IoCloseCircleOutline, IoStorefrontOutline,
} from "react-icons/io5";

export interface MenuItem {
  to: string;
  label: string;
  icon: IconType;
  perms: string[]; // alcanza con uno
  roles?: string[];
}

/** Menú del panel agrupado por núcleo. Cada usuario ve solo lo que sus permisos habilitan. */
export const ADMIN_MENU: { group: string; items: MenuItem[] }[] = [
  {
    group: "General",
    items: [
      { to: "/admin", label: "Dashboard", icon: IoHomeOutline, perms: ["dashboard.view"] },
      { to: "/admin/saldos", label: "Centro de saldos", icon: IoWalletOutline, perms: ["reports.view"] },
      { to: "/admin/mi-panel", label: "Mi panel", icon: IoPersonOutline, perms: ["appointments.own"], roles: ["barber"] },
    ],
  },
  {
    group: "Operación",
    items: [
      { to: "/admin/turnos", label: "Turnos", icon: IoCalendarOutline, perms: ["appointments.manage", "appointments.own"] },
      { to: "/admin/cancelaciones", label: "Cancelaciones", icon: IoCloseCircleOutline, perms: ["appointments.manage"] },
      { to: "/admin/clientes", label: "Clientes", icon: IoPeopleOutline, perms: ["clients.manage"] },
      { to: "/admin/asistencia", label: "Asistencia", icon: IoTimeOutline, perms: ["barbers.manage"] },
      { to: "/admin/puestos", label: "Puestos", icon: IoGridOutline, perms: ["inventory.manage"] },
    ],
  },
  {
    group: "Equipo",
    items: [
      { to: "/admin/barberos", label: "Barberos", icon: IoCutOutline, perms: ["barbers.manage"] },
      { to: "/admin/liquidaciones", label: "Liquidaciones", icon: IoReceiptOutline, perms: ["finance.manage"] },
      { to: "/admin/deudas", label: "Adelantos y deudas", icon: IoSwapHorizontalOutline, perms: ["finance.manage"] },
      { to: "/admin/objetivos", label: "Objetivos", icon: IoFlagOutline, perms: ["finance.manage"] },
    ],
  },
  {
    group: "Dinero",
    items: [
      { to: "/admin/caja", label: "Caja", icon: IoCashOutline, perms: ["cash.manage"] },
      { to: "/admin/movimientos", label: "Movimientos", icon: IoTrendingUpOutline, perms: ["finance.manage"] },
      { to: "/admin/gastos", label: "Gastos", icon: IoDocumentTextOutline, perms: ["expenses.manage"] },
      { to: "/admin/pedidos", label: "Pedidos tienda", icon: IoStorefrontOutline, perms: ["cash.manage", "commercial.manage"] },
    ],
  },
  {
    group: "Inventario",
    items: [
      { to: "/admin/productos", label: "Productos y stock", icon: IoCubeOutline, perms: ["inventory.manage"] },
      { to: "/admin/compras", label: "Compras", icon: IoBagHandleOutline, perms: ["suppliers.manage"] },
      { to: "/admin/proveedores", label: "Proveedores", icon: IoBusinessOutline, perms: ["suppliers.manage"] },
      { to: "/admin/herramientas", label: "Herramientas", icon: IoConstructOutline, perms: ["inventory.manage"] },
    ],
  },
  {
    group: "Comercial",
    items: [
      { to: "/admin/servicios", label: "Servicios y precios", icon: IoPricetagOutline, perms: ["catalog.manage"] },
      { to: "/admin/membresias", label: "Membresías", icon: IoRibbonOutline, perms: ["commercial.manage"] },
      { to: "/admin/packs", label: "Packs y bonos", icon: IoCardOutline, perms: ["commercial.manage"] },
      { to: "/admin/gift-cards", label: "Gift cards", icon: IoGiftOutline, perms: ["commercial.manage", "cash.manage"] },
      { to: "/admin/promociones", label: "Promociones", icon: IoPricetagOutline, perms: ["commercial.manage"] },
      { to: "/admin/mensajes", label: "Mensajes", icon: IoChatbubbleOutline, perms: ["clients.manage"] },
    ],
  },
  {
    group: "Control",
    items: [
      { to: "/admin/reportes", label: "Reportes", icon: IoBarChartOutline, perms: ["reports.view"] },
      { to: "/admin/usuarios", label: "Usuarios y permisos", icon: IoShieldCheckmarkOutline, perms: ["users.manage"] },
      { to: "/admin/auditoria", label: "Auditoría", icon: IoAnalyticsOutline, perms: ["audit.view"] },
      { to: "/admin/configuracion", label: "Configuración", icon: IoSettingsOutline, perms: ["settings.manage"] },
    ],
  },
];
