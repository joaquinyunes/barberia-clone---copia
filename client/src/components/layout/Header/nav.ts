import { paths } from "@/app/router/paths";

/** Menú principal del sitio (header y menú mobile). */
export const NAV = [
  { to: paths.locations, label: "Sedes", dropdown: "locations" as const },
  { to: paths.services, label: "Servicios" },
  { to: paths.vip, label: "La Cava VIP" },
  { to: paths.shop, label: "Tienda" },
  { to: paths.club, label: "Club Jack" },
  { to: paths.story, label: "Historia" },
];
