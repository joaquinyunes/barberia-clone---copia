import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { IoBagHandleOutline, IoChevronDown, IoMenu, IoPersonOutline } from "react-icons/io5";
import { paths } from "@/app/router/paths";
import { Button } from "@/components/ui";
import { cartCount, useCartStore } from "@/features/cart/cartStore";
import { useAuthStore } from "@/features/auth/authStore";
import { useLocations } from "@/features/catalog/useCatalog";
import { useScrolled } from "@/hooks/useScrolled";
import { cx } from "@/utils/format";
import { MobileMenu } from "../MobileMenu/MobileMenu";
import { NAV } from "./nav";
import styles from "./Header.module.css";

export function Header() {
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const { items, setOpen } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const { data: locations } = useLocations();
  const count = cartCount(items);

  return (
    <>
      <header className={cx(styles.header, scrolled && styles.scrolled)}>
        <div className={styles.inner}>
          <button className={styles.burger} onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
            <IoMenu size={26} />
          </button>
          <Link to={paths.home} className={styles.logo} aria-label="Jack el Barbero — inicio">
            <img src="/logo.svg" alt="Jack el Barbero" width={200} height={50} />
          </Link>
          <nav className={styles.nav} aria-label="Principal">
            {NAV.map((item) =>
              item.dropdown ? (
                <div key={item.to} className={styles.dropdown}>
                  <NavLink to={item.to} className={({ isActive }) => cx(styles.link, isActive && styles.active)}>
                    {item.label} <IoChevronDown size={12} />
                  </NavLink>
                  <div className={styles.menu}>
                    {locations?.map((l) => (
                      <Link key={l._id} to={paths.location(l.slug)} className={styles.menuItem}>
                        <strong>{l.name}</strong>
                        <span>{l.address}</span>
                      </Link>
                    ))}
                    <Link to={paths.locations} className={styles.menuAll}>Ver todas las sedes →</Link>
                  </div>
                </div>
              ) : (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => cx(styles.link, isActive && styles.active)}>
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>
          <div className={styles.actions}>
            <Link to={user ? (user.role === "customer" ? paths.account : paths.admin) : paths.login} className={styles.icon} aria-label={user ? "Mi cuenta" : "Ingresar"}>
              <IoPersonOutline size={21} />
            </Link>
            <button className={styles.icon} onClick={() => setOpen(true)} aria-label={`Carrito (${count})`}>
              <IoBagHandleOutline size={22} />
              {count > 0 && <span className={styles.count}>{count}</span>}
            </button>
            <Button to={paths.booking} size="sm" className={styles.cta}>Reservar</Button>
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
