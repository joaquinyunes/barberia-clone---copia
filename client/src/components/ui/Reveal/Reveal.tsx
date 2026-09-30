import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { DURATION, EASE_OUT } from "../Motion/easing";

/** Aparición suave al entrar en pantalla: sube poco, despacio, y se asienta sin rebote. */
export const Reveal = ({ children, delay = 0, y = 40, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "0px 0px -12% 0px" }}
    transition={{ duration: DURATION, delay, ease: EASE_OUT }}
  >
    {children}
  </motion.div>
);
