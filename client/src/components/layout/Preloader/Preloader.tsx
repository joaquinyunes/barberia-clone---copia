import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { EASE_IN_OUT, EASE_OUT } from "@/components/ui/Motion/easing";
import { PRELOADER_HOLD, PRELOADER_KEY, SHOW_PRELOADER } from "./intro";
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
    }, PRELOADER_HOLD * 1000);
    return () => {
      clearTimeout(id);
      document.body.style.overflow = "";
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className={styles.loader} exit={{ y: "-100%" }} transition={{ duration: 1.2, delay: 0.25, ease: EASE_IN_OUT }} aria-hidden="true">
          <motion.div
            className={styles.inner}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24, transition: { duration: 0.6, ease: EASE_IN_OUT } }}
            transition={{ duration: 1.4, ease: EASE_OUT }}
          >
            <img src="/logo.svg" alt="" className={styles.logo} />
            <div className={styles.bar}>
              <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: PRELOADER_HOLD - 0.2, ease: EASE_IN_OUT }} />
            </div>
            <motion.p className={styles.tag} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 1 }}>
              Barbería clásica · Buenos Aires
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
