/**
 * Permisos granulares. Cada rol trae un set por defecto y el admin puede sumar
 * permisos extra a un usuario puntual (ej. un encargado que también ve reportes).
 */
export const PERMISSIONS = {
  "dashboard.view": "Ver dashboard",
  "appointments.manage": "Gestionar todos los turnos",
  "appointments.own": "Ver y finalizar sus propios turnos",
  "clients.manage": "Gestionar clientes",
  "clients.notes": "Ver notas internas de clientes",
  "barbers.manage": "Gestionar barberos, horarios y asistencia",
  "cash.manage": "Operar la caja (cobros, apertura y cierre)",
  "finance.manage": "Adelantos, deudas, liquidaciones y movimientos",
  "expenses.manage": "Gastos",
  "suppliers.manage": "Proveedores y compras",
  "inventory.manage": "Productos, stock, herramientas y puestos",
  "catalog.manage": "Servicios, precios y comisiones",
  "commercial.manage": "Membresías, packs, gift cards y promociones",
  "reports.view": "Reportes y centro de saldos",
  "users.manage": "Usuarios y permisos",
  "audit.view": "Auditoría",
  "settings.manage": "Configuración",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const ROLES = ["admin", "manager", "reception", "barber", "customer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  manager: "Encargado",
  reception: "Recepción",
  barber: "Barbero",
  customer: "Cliente",
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ALL_PERMISSIONS,
  manager: [
    "dashboard.view",
    "appointments.manage",
    "clients.manage",
    "clients.notes",
    "cash.manage",
    "inventory.manage",
    "barbers.manage",
  ],
  reception: ["dashboard.view", "appointments.manage", "clients.manage", "cash.manage"],
  barber: ["appointments.own"],
  customer: [],
};

export const permissionsFor = (role: Role, extra: string[] = []) =>
  Array.from(new Set([...(ROLE_PERMISSIONS[role] ?? []), ...extra])) as Permission[];
