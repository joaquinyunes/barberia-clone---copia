import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { IoClose, IoLogoInstagram, IoLogoWhatsapp } from "react-icons/io5";
import { paths } from "@/app/router/paths";
import { Button } from "@/components/ui";
import { useSite } from "@/features/catalog/useCatalog";
import { waHref } from "@/utils/format";
import { NAV } from "../Header/nav";
import styles from "./MobileMenu.module.css";

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation();
  const { data: site } = useSite();
  useEffect(() => onClose(), [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Menú">
      <button className={styles.close} onClick={onClose} aria-label="Cerrar menú"><IoClose size={30} /></button>
      <nav className={styles.nav}>
        <NavLink to={paths.home} end>Inicio</NavLink>
        {NAV.map((i) => (
          <NavLink key={i.to} to={i.to}>{i.label}</NavLink>
        ))}
        <NavLink to={paths.whyUs}>Por qué nosotros</NavLink>
        <NavLink to={paths.contact}>Contacto</NavLink>
      </nav>
      <div className={styles.bottom}>
        <Button to={paths.booking} size="lg" block>Reservar turno</Button>
        <div className={styles.social}>
          {site && <a href={waHref(site.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><IoLogoWhatsapp size={26} /></a>}
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IoLogoInstagram size={26} /></a>
        </div>
      </div>
    </div>
  );
}
