import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { PRELOADER_KEY, SHOW_PRELOADER } from "./intro";
import styles from "./Preloader.module.css";

/** La primera vez que se abre el sitio en la sesión: logo, línea dorada y telón que sube. */
export function Preloader() {
  const [visible, setVisible] = useState(SHOW_PRELOADER);

  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = "hidden";
    const id = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem(PRELOADER_KEY, "1");
      } catch {
        /* sin storage: se vuelve a mostrar la próxima vez, no pasa nada */
      }
    }, 1900);
    return () => {
      clearTimeout(id);
      document.body.style.overflow = "";
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className={styles.loader} exit={{ y: "-100%" }} transition={{ duration: 0.9, ease: [0.77, 0, 0.18, 1] }} aria-hidden="true">
          <motion.img
            src="/logo.svg"
            alt=""
            className={styles.logo}
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
          <div className={styles.bar}>
            <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.5, ease: [0.65, 0, 0.35, 1] }} />
          </div>
          <motion.p className={styles.tag} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }}>
            Barbería clásica · Buenos Aires
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
