import { Suspense, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { IoClose, IoLogOutOutline, IoMenu, IoOpenOutline } from "react-icons/io5";
import { PageLoader } from "@/components/ui";
import { can } from "@/features/auth/authStore";
import { useAuth } from "@/features/auth/useAuth";
import { cx } from "@/utils/format";
import { ADMIN_MENU } from "./menu";
import styles from "./AdminLayout.module.css";

const ROLE_LABEL: Record<string, string> = { admin: "Administrador", manager: "Encargado", reception: "Recepción", barber: "Barbero" };

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const menu = ADMIN_MENU.map((g) => ({
    ...g,
    items: g.items.filter((i) => (!i.roles || i.roles.includes(user!.role)) && can(user, ...i.perms)),
  })).filter((g) => g.items.length);

  return (
    <div className={styles.shell}>
      <aside className={cx(styles.sidebar, open && styles.open)}>
        <div className={styles.brand}>
          <Link to="/admin"><img src="/logo.svg" alt="Jack el Barbero" /></Link>
          <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Cerrar menú"><IoClose size={22} /></button>
        </div>
        <nav className={styles.nav} aria-label="Panel">
          {menu.map((g) => (
            <div key={g.group} className={styles.group}>
              <span className={styles.groupLabel}>{g.group}</span>
              {g.items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.to === "/admin"} className={({ isActive }) => cx(styles.link, isActive && styles.active)} onClick={() => setOpen(false)}>
                  <i.icon size={18} />
                  {i.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className={styles.user}>
          <div>
            <strong>{user?.name}</strong>
            <span>{ROLE_LABEL[user?.role ?? ""]}</span>
          </div>
          <button onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"><IoLogOutOutline size={20} /></button>
        </div>
      </aside>
      {open && <div className={styles.scrim} onClick={() => setOpen(false)} />}
      <div className={styles.content}>
        <header className={styles.topbar}>
          <button className={styles.burger} onClick={() => setOpen(true)} aria-label="Abrir menú"><IoMenu size={24} /></button>
          <span className={styles.crumb}>{pathname.replace("/admin", "Panel").split("/").filter(Boolean).join(" / ")}</span>
          <Link to="/" target="_blank" className={styles.site}><IoOpenOutline /> Ver sitio</Link>
        </header>
        <main className={styles.main}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
