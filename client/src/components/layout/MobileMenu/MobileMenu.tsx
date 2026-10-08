import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import { IoClose, IoLogoInstagram, IoLogoWhatsapp } from "react-icons/io5";
import { paths } from "@/app/router/paths";
import { Button } from "@/components/ui";
import { useSite } from "@/features/catalog/useCatalog";
import { waHref } from "@/utils/format";
import { NAV } from "../Header/nav";
import styles from "./MobileMenu.module.css";

const EASE = [0.76, 0, 0.24, 1] as const;
const OUT = [0.16, 1, 0.3, 1] as const;

/** Cada link sube desde abajo, uno después del otro, cuando la cortina ya cubrió la pantalla. */
const item = {
  hidden: { opacity: 0, y: 36 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.25 + i * 0.06, ease: OUT } }),
};

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation();
  const { data: site } = useSite();
  useEffect(() => {
    onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const links = [
    { to: paths.home, label: "Inicio", end: true },
    ...NAV.map((i) => ({ to: i.to, label: i.label, end: false })),
    { to: paths.whyUs, label: "Por qué nosotros", end: false },
    { to: paths.contact, label: "Contacto", end: false },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="menu"
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="Menú"
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <button className={styles.close} onClick={onClose} aria-label="Cerrar menú"><IoClose size={30} /></button>
          <nav className={styles.nav}>
            {links.map((l, i) => (
              <motion.div key={l.to} custom={i} variants={item} initial="hidden" animate="show">
                <NavLink to={l.to} end={l.end}>{l.label}</NavLink>
              </motion.div>
            ))}
          </nav>
          <motion.div className={styles.bottom} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.7, ease: OUT } }}>
            <Button to={paths.booking} size="lg" block>Reservar turno</Button>
            <div className={styles.social}>
              {site && <a href={waHref(site.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><IoLogoWhatsapp size={26} /></a>}
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IoLogoInstagram size={26} /></a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
